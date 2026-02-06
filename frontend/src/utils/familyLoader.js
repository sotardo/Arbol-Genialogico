// src/utils/familyLoader.js - CON SOPORTE MÚLTIPLES MATRIMONIOS
import { personasApi } from '../personasApi';

// ---------- utils ----------
const uniq = (arr = []) => Array.from(new Set(arr.filter(Boolean)));
const putAll = (map, people = []) => people.forEach(p => p?._id && map.set(p._id, p));

function parsePairKey(key) {
  if (!key) return { type: 'none' };
  if (key.startsWith('pair:')) {
    const [, a, b] = key.split(':');
    return { type: 'pair', aId: a, bId: b };
  }
  if (key.startsWith('single:')) {
    const [, id] = key.split(':');
    return { type: 'single', id };
  }
  return { type: 'single', id: key };
}

// Normalizar datos de la API
function normalizePersona(p) {
  if (!p) return null;

  // Normalizar conyuge (singular) -> conyuges (array)
  if (p.conyuge && !p.conyuges) {
    p.conyuges = p.conyuge._id ? [p.conyuge._id] : [];
  }

  // Normalizar padres/hijos/hermanos si vinieran como objetos
  if (Array.isArray(p.padres) && p.padres.length > 0 && typeof p.padres[0] === 'object') {
    p.padres = p.padres.map(padre => padre._id).filter(Boolean);
  }
  if (Array.isArray(p.hijos) && p.hijos.length > 0 && typeof p.hijos[0] === 'object') {
    p.hijos = p.hijos.map(hijo => hijo._id).filter(Boolean);
  }
  if (Array.isArray(p.hermanos) && p.hermanos.length > 0 && typeof p.hermanos[0] === 'object') {
    p.hermanos = p.hermanos.map(h => h._id).filter(Boolean);
  }

  // ✅ NUEVO: Normalizar otrosConyuges si vinieran como objetos
  if (Array.isArray(p.otrosConyuges) && p.otrosConyuges.length > 0 && typeof p.otrosConyuges[0] === 'object') {
    p.otrosConyuges = p.otrosConyuges.map(c => c._id).filter(Boolean);
  }

  // ✅ NUEVO: Normalizar padresUnion si vinieran como objetos
  if (Array.isArray(p.padresUnion) && p.padresUnion.length > 0 && typeof p.padresUnion[0] === 'object') {
    p.padresUnion = p.padresUnion.map(pu => pu._id).filter(Boolean);
  }

  // Asegurar que existan los arrays
  if (!Array.isArray(p.conyuges)) p.conyuges = [];
  if (!Array.isArray(p.otrosConyuges)) p.otrosConyuges = [];
  if (!Array.isArray(p.padresUnion)) p.padresUnion = [];
  if (!Array.isArray(p.padres)) p.padres = [];
  if (!Array.isArray(p.hijos)) p.hijos = [];

  return p;
}

async function fetchByIds(ids = []) {
  const uniqIds = uniq(ids);
  if (uniqIds.length === 0) return [];

  const promises = uniqIds.map(id =>
    personasApi.detalle(id)
      .then(persona => persona)
      .catch(() => null)
  );

  const items = await Promise.all(promises);
  const normalized = items.filter(Boolean).map(normalizePersona).filter(Boolean);
  return normalized;
}

// ---------- loader optimizado (BFS con profundidades) ----------
class FamilyLoader {
  constructor() {
    this.cache = new Map();
  }

  async bulkLoad(ids, byId) {
    const missing = ids.filter(id => id && !this.cache.has(id));
    if (missing.length) {
      const people = await fetchByIds(missing);
      people.forEach(p => this.cache.set(p._id, p));
    }
    const loaded = ids.map(id => this.cache.get(id)).filter(Boolean);
    putAll(byId, loaded);

    // Recargar cónyuges con datos completos (principales + otros)
    const spousesToLoad = [];
    for (const person of loaded) {
      // Cónyuges principales
      if (person?.conyuges?.length) {
        for (const spouseId of person.conyuges) {
          if (!this.cache.has(spouseId)) spousesToLoad.push(spouseId);
        }
      }
      // ✅ NUEVO: Otros cónyuges
      if (person?.otrosConyuges?.length) {
        for (const spouseId of person.otrosConyuges) {
          if (!this.cache.has(spouseId)) spousesToLoad.push(spouseId);
        }
      }
    }

    if (spousesToLoad.length > 0) {
      const spouses = await fetchByIds(uniq(spousesToLoad));
      spouses.forEach(s => this.cache.set(s._id, s));
      putAll(byId, spouses);
    }

    return loaded;
  }

  /**
   * BFS generalizado con límites de profundidad.
   * maxUp:  número de "saltos" hacia padres (2 = padres+abuelos)
   * maxDown: número de "saltos" hacia hijos (1 = hijos)
   */
  async loadFamilyNeighborhood(rootId, opts = {}) {
    if (!rootId) return { error: 'rootId requerido' };

    const {
      maxUp = 2,
      maxDown = 1,
      requestedMaxAncestorGen = 3,
      expandedUpKeys = new Set(),
      expandedChildKey = null,
      expandedGrandchildKey = null,
    } = opts;

    const targetGen = Math.min(Math.max(requestedMaxAncestorGen ?? 3, 1), 12);
    const baseMaxUp = Math.max(maxUp ?? 0, targetGen - 1);

    let extraGenerations = 0;
    if (expandedUpKeys && expandedUpKeys.size > 0) {
      extraGenerations = 11;
    }

    const effectiveMaxUp = Math.min(baseMaxUp + extraGenerations, 11);

    console.log('═══════════════════════════════════════════');
    console.log('🔄 FAMILY LOADER - Configuración');
    console.log(`  📊 Generación objetivo: ${targetGen}`);
    console.log(`  📈 Base maxUp: ${baseMaxUp}`);
    console.log(`  🔗 Anclas expandidas: ${expandedUpKeys?.size || 0}`);
    console.log(`  ➕ Extra por anclas: ${extraGenerations}`);
    console.log(`  ✅ Presupuesto efectivo: ${effectiveMaxUp} generaciones`);
    console.log('═══════════════════════════════════════════');

    const byId = new Map();
    const seen = new Map();
    const q = [];

    const enqueue = (id, upLeft, downLeft) => {
      if (!id) return;
      const prev = seen.get(id);
      if (!prev || upLeft > prev.upLeft || downLeft > prev.downLeft) {
        seen.set(id, { upLeft, downLeft });
        q.push({ id, upLeft, downLeft });
      }
    };

    // 1) Semillas iniciales: raíz
    await this.bulkLoad([rootId], byId);
    const root = byId.get(rootId);
    if (!root) return { error: 'No se encontró la persona raíz' };

    enqueue(rootId, effectiveMaxUp, maxDown);

    // También todos sus cónyuges (principales + otros)
    const rootAllSpouses = uniq([...(root.conyuges || []), ...(root.otrosConyuges || [])]);
    await this.bulkLoad(rootAllSpouses, byId);
    rootAllSpouses.forEach(cid => enqueue(cid, effectiveMaxUp, maxDown));

    // Anclas expandidas
    if (expandedUpKeys && expandedUpKeys.size > 0) {
      console.log('🔗 Procesando anclas expandidas:');
      for (const key of expandedUpKeys) {
        const parsed = parsePairKey(key);
        const ids = parsed.type === 'pair' 
          ? [parsed.aId, parsed.bId] 
          : [parsed.id];
        
        ids.forEach(id => {
          if (id) {
            console.log(`  → Ancla ${id}: presupuesto de 11 generaciones hacia arriba`);
            enqueue(id, 11, 0);
          }
        });
      }
    }

    const downAnchors = [];
    if (expandedChildKey) {
      const p = parsePairKey(expandedChildKey);
      downAnchors.push(p.type === 'pair' ? p.aId : p.id);
    }
    if (expandedGrandchildKey) {
      const p = parsePairKey(expandedGrandchildKey);
      downAnchors.push(p.type === 'pair' ? p.aId : p.id);
    }
    downAnchors.forEach(id => enqueue(id, 0, 1));

    // 3) BFS
    console.log('🔄 Iniciando BFS...');
    let iterations = 0;
    while (q.length) {
      iterations++;
      
      const batchIds = uniq(q.map(n => n.id).filter(id => id && !byId.has(id)));
      if (batchIds.length) {
        console.log(`  📦 Batch ${iterations}: cargando ${batchIds.length} personas`);
        await this.bulkLoad(batchIds, byId);
      }

      const { id, upLeft, downLeft } = q.shift();
      const p = byId.get(id);
      if (!p) continue;

      // ✅ Arrastramos TODOS los cónyuges (principales + otros)
      const allSpouses = uniq([...(p.conyuges || []), ...(p.otrosConyuges || [])]);
      if (allSpouses.length) {
        await this.bulkLoad(allSpouses, byId);
        allSpouses.forEach(cid => enqueue(cid, upLeft, downLeft));
      }

      // Subir (padres)
      if (upLeft > 0 && Array.isArray(p.padres) && p.padres.length) {
        await this.bulkLoad(p.padres, byId);
        p.padres.forEach(pid => {
          console.log(`    ⬆ ${p.nombre} → padre ${pid} (quedan ${upLeft - 1} generaciones)`);
          enqueue(pid, upLeft - 1, 0);
        });
      }

      // Bajar (hijos)
      if (downLeft > 0 && Array.isArray(p.hijos) && p.hijos.length) {
        await this.bulkLoad(p.hijos, byId);
        p.hijos.forEach(cid => enqueue(cid, 0, downLeft - 1));
      }
    }

    console.log(`✅ BFS completado en ${iterations} iteraciones`);

    // 4) Enriquecimiento final
    console.log('🔧 Enriquecimiento final...');
    const everyone = Array.from(byId.values());

    // Cónyuges (principales + otros)
    const allSpouseIds = uniq(everyone.flatMap(p => [...(p?.conyuges || []), ...(p?.otrosConyuges || [])]));
    await this.bulkLoad(allSpouseIds, byId);

    // Padres
    const allParentIds = uniq(everyone.flatMap(p => p?.padres || []));
    await this.bulkLoad(allParentIds, byId);

    // Hijos (de cada persona y de sus cónyuges)
    const everyonePlusSpouses = Array.from(byId.values());
    const allChildrenIds = uniq([
      ...everyonePlusSpouses.flatMap(p => p?.hijos || []),
      ...everyonePlusSpouses
        .flatMap(p => [...(p?.conyuges || []), ...(p?.otrosConyuges || [])])
        .map(id => byId.get(id))
        .filter(Boolean)
        .flatMap(s => s?.hijos || []),
    ]);
    await this.bulkLoad(allChildrenIds, byId);

    // 5) Salida
    console.log('═══════════════════════════════════════════');
    console.log('✅ FAMILY LOADER - Resultado Final');
    console.log(`  📊 Total personas cargadas: ${byId.size}`);
    console.log(`  💑 Cónyuges: ${allSpouseIds.length}`);
    console.log(`  👪 Padres: ${allParentIds.length}`);
    console.log(`  👶 Hijos: ${allChildrenIds.length}`);
    console.log('═══════════════════════════════════════════\n');

    return {
      ok: true,
      rootPerson: byId.get(rootId),
      personas: Array.from(byId.values()),
      meta: {
        counts: {
          total: byId.size,
          spousesLoaded: allSpouseIds.length,
          parentsLoaded: allParentIds.length,
          childrenLoaded: allChildrenIds.length,
        },
        limits: { maxUp: effectiveMaxUp, maxDown },
        requestedMaxAncestorGen: targetGen,
        expandedUpKeys: Array.from(expandedUpKeys),
        expandedChildKey,
        expandedGrandchildKey,
      },
    };
  }

  // ✅ NUEVO: Limpiar caché (útil al cambiar de cónyuge)
  clearCache() {
    this.cache.clear();
  }

  // ✅ NUEVO: Invalidar una persona específica del caché
  invalidatePerson(personId) {
    this.cache.delete(personId);
  }
}

export const familyLoader = new FamilyLoader();