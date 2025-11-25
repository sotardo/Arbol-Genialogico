// backend/scripts/import_from_json.js
// Uso:
//   node scripts/import_from_json.js "C:\\Users\\benja\\Documents\\arbol-genealogico\\ged\\genealogy.json" --mode replace
//   node scripts/import_from_json.js "C:\\...\\genealogy.json" --mode merge [--ignoreBirthInMerge]
//   node scripts/import_from_json.js "C:\\...\\genealogy.json" --relationsOnly
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// ===== Modelo Persona (igual al de tu app) =====
const Persona = (await import('../src/models/Persona.js')).default;

// ===== CLI =====
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arbol_local';
const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Uso: node scripts/import_from_json.js "RUTA\\genealogy.json" [--mode replace|merge] [--ignoreBirthInMerge] [--relationsOnly]');
  process.exit(1);
}
const filePath = args[0];
const mode = (args.find(a => a.startsWith('--mode='))?.split('=')[1])
  || (args.includes('--mode') ? args[args.indexOf('--mode')+1] : 'merge');
if (!['replace','merge'].includes(mode) && !args.includes('--relationsOnly')) {
  console.error('Modo inválido. Usá --mode replace | merge | --relationsOnly');
  process.exit(1);
}
const ignoreBirthInMerge = args.includes('--ignoreBirthInMerge');
const relationsOnly = args.includes('--relationsOnly');

// ===== Helpers GEDCOM =====
const MONTHS = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };
function parseGedDate(s) {
  if (!s || typeof s !== 'string') return undefined;
  const t = s.trim().toUpperCase();
  // "28 MAY 1952"
  let m = t.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/);
  if (m) {
    const d = Number(m[1]), mon = MONTHS[m[2]], y = Number(m[3]);
    if (!isNaN(d) && mon != null && !isNaN(y)) return new Date(Date.UTC(y, mon, d));
  }
  // "ABT 2011" / "BEF 1900" → solo año
  const y = Number(t.replace(/[^\d]/g,''));
  if (!isNaN(y) && y > 0) return new Date(Date.UTC(y, 0, 1));
  const dflt = new Date(s);
  return isNaN(dflt.getTime()) ? undefined : dflt;
}
const val = (n) => n?.value ?? '';
const childByTag = (node, tag) => (node?.children || []).find(c => c.tag === tag);
const childrenByTag = (node, tag) => (node?.children || []).filter(c => c.tag === tag);

// ===== Adaptadores para formato real =====
// ACEPTA:
//   a) json.individuals[] / json.families[]
//   b) ARRAY tope con nodos { tag:'INDI'|'FAM', id, children:[...] }  <-- tu caso
function readIndividuals(json) {
  const top = Array.isArray(json) ? json : (json.records || json.individuals || []);
  const list = Array.isArray(top) ? top : [];
  return list
    .filter(n => n && n.tag === 'INDI')
    .map((n) => {
      const extId = n.id || val(n) || '';
      const nameNode = childByTag(n, 'NAME');
      const givn = val(childByTag(nameNode, 'GIVN'));
      const surn = val(childByTag(nameNode, 'SURN'));
      let nameRaw = val(nameNode) || `${givn} ${surn}`.trim() || '(Sin nombre)';
      nameRaw = nameRaw.replace(/\//g, '').replace(/\s+/g, ' ').trim();

      const sx = (val(childByTag(n, 'SEX')) || 'X').toUpperCase();
      const sex = sx.startsWith('M') ? 'M' : sx.startsWith('F') ? 'F' : 'X';

      const birt = childByTag(n, 'BIRT');
      const deat = childByTag(n, 'DEAT');
      const nacimiento = parseGedDate(val(childByTag(birt, 'DATE')));
      const fallecimiento = parseGedDate(val(childByTag(deat, 'DATE')));

      const fams = childrenByTag(n, 'FAMS').map(x => val(x)).filter(Boolean); // familias donde es cónyuge
      const famc = childrenByTag(n, 'FAMC').map(x => val(x)).filter(Boolean); // familias donde es hijx

      return {
        extId: String(extId),
        nombre: nameRaw,
        sexo: sex,
        nacimiento,
        fallecimiento,
        notas: '',
        fams,
        famc,
      };
    });
}

function readFamilies(json, indisForFallback = []) {
  // Si el archivo trae FAM, usalos. Si NO, reconstruí con FAMS/FAMC desde INDI.
  const top = Array.isArray(json) ? json : (json.records || json.families || []);
  const list = Array.isArray(top) ? top : [];
  const famNodes = list.filter(n => n && n.tag === 'FAM');

  if (famNodes.length) {
    return famNodes.map((f) => {
      const id = f.id || val(f) || '';
      const husb = val(childByTag(f, 'HUSB')) || null;
      const wife = val(childByTag(f, 'WIFE')) || null;
      const childs = childrenByTag(f, 'CHIL').map(x => val(x)).filter(Boolean);
      return { id: String(id), husband: husb, wife: wife, children: childs };
    });
  }

  // ---- Fallback: reconstrucción desde INDI ----
  // agrupamos por famId: spouses (de FAMS) y children (de FAMC)
  const byId = new Map(); // famId -> { spouses:Set, children:Set }
  for (const i of indisForFallback) {
    for (const famId of i.fams || []) {
      if (!byId.has(famId)) byId.set(famId, { spouses: new Set(), children: new Set() });
      byId.get(famId).spouses.add(i.extId);
    }
    for (const famId of i.famc || []) {
      if (!byId.has(famId)) byId.set(famId, { spouses: new Set(), children: new Set() });
      byId.get(famId).children.add(i.extId);
    }
  }
  return [...byId.entries()].map(([id, grp]) => ({
    id: String(id),
    // si hay 2+ spouses, los pares salen más abajo; acá guardo todos en _spousesAll
    husband: null,
    wife: null,
    children: [...grp.children],
    _spousesAll: [...grp.spouses],
  }));
}

// ===== Import principal =====
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Mongo conectado:', MONGO_URI);

  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);

  const individuals = readIndividuals(json);
  const families = readFamilies(json, individuals);

  if (!individuals.length) {
    console.error('❌ No se encontraron INDI en el JSON.');
    process.exit(1);
  }
  console.log(`📦 Individuos: ${individuals.length} | Familias: ${families.length}`);

  // ====== Atajo: SOLO RELACIONES (no crear/editar personas) ======
  if (relationsOnly) {
    // 1) Indexar todas las personas existentes
    const todos = await Persona.find({}, '_id nombre nacimiento').lean();
    const normName = (s) => String(s||'').replace(/[\/]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    const dateKey  = (d) => {
      if (!d) return '';
      const x = new Date(d); if (isNaN(x)) return '';
      return x.toISOString().slice(0,10);
    };
    const idxFull = new Map(); // nombre|fecha
    const idxName = new Map(); // nombre|
    for (const p of todos) {
      const kFull = normName(p.nombre)+'|'+dateKey(p.nacimiento);
      const kName = normName(p.nombre)+'|';
      if (!idxFull.has(kFull)) idxFull.set(kFull, p);
      if (!idxName.has(kName)) idxName.set(kName, p);
    }

    // 2) Mapear extId (@I..@) -> _id
    const extIdToMongo = new Map();
    let misses = 0;
    for (const n of individuals) {
      const kFull = normName(n.nombre)+'|'+dateKey(n.nacimiento);
      const kName = normName(n.nombre)+'|';
      const hit = idxFull.get(kFull) || idxName.get(kName);
      if (!hit) { misses++; continue; }
      extIdToMongo.set(n.extId, String(hit._id));
    }
    console.log(`🔎 relationsOnly: mapeados ${extIdToMongo.size} / ${individuals.length} (misses: ${misses})`);

    // 3) Aplicar relaciones
    const acc = {}; // idMongo -> { padres:Set, hijos:Set, conyuges:Set }
    const getAcc = (id) => (acc[id] ||= { padres:new Set(), hijos:new Set(), conyuges:new Set() });

    for (const f of families) {
      // cónyuges
      let spouses = [];
      if (f._spousesAll) {
        const arr = f._spousesAll;
        for (let i=0;i<arr.length;i++) for (let j=i+1;j<arr.length;j++) spouses.push([arr[i], arr[j]]);
      } else {
        if (f.husband && f.wife) spouses.push([f.husband, f.wife]);
      }
      for (const [A,B] of spouses) {
        const a = A ? extIdToMongo.get(A) : null;
        const b = B ? extIdToMongo.get(B) : null;
        if (a && b) { getAcc(a).conyuges.add(b); getAcc(b).conyuges.add(a); }
      }

      // padres → hijxs
      const kids = (f.children || []).map(cid => extIdToMongo.get(cid)).filter(Boolean);
      const parentExts = f._spousesAll || (spouses.flat() ?? []);
      const parentMongo = [...new Set(parentExts.map(x => extIdToMongo.get(x)).filter(Boolean))];
      for (const k of kids) for (const p of parentMongo) { getAcc(p).hijos.add(k); getAcc(k).padres.add(p); }
    }

    let relationUpdates = 0;
    for (const [id, rel] of Object.entries(acc)) {
      const payload = {};
      if (rel.padres.size)  (payload.$addToSet ||= {}).padres   = { $each: [...rel.padres] };
      if (rel.hijos.size)   (payload.$addToSet ||= {}).hijos    = { $each: [...rel.hijos] };
      if (rel.conyuges.size)(payload.$addToSet ||= {}).conyuges = { $each: [...rel.conyuges] };
      if (Object.keys(payload).length) {
        await Persona.findByIdAndUpdate(id, payload, { new:false });
        relationUpdates++;
      }
    }

    console.log('✅ Relaciones aplicadas (relationsOnly)', { relationUpdates });
    await mongoose.connection.close();
    process.exit(0);
  }

  // ====== replace / merge con alta de personas ======
  if (mode === 'replace') {
    await Persona.deleteMany({});
    console.log('🧹 Colección personas vaciada (replace).');
  }

  // índices útiles (best-effort)
  try { await Persona.collection.createIndex({ nombre: 'text' }); } catch {}
  try { await Persona.collection.createIndex({ nombre: 1, nacimiento: 1 }); } catch {}

  // 1) Insert/Upsert personas
  const extIdToMongo = new Map();
  let created = 0, updated = 0;

  for (const p of individuals) {
    if (mode === 'merge') {
      const where = { nombre: p.nombre };
      if (!ignoreBirthInMerge && p.nacimiento) where.nacimiento = p.nacimiento;
      let doc = await Persona.findOne(where);
      if (doc) {
        if (p.sexo && doc.sexo !== p.sexo) doc.sexo = p.sexo;
        if (p.nacimiento && !doc.nacimiento) doc.nacimiento = p.nacimiento;
        if (p.fallecimiento && !doc.fallecimiento) doc.fallecimiento = p.fallecimiento;
        await doc.save();
        extIdToMongo.set(p.extId, doc._id.toString());
        updated++;
        continue;
      }
    }
    const doc = await Persona.create({
      nombre: p.nombre,
      sexo: p.sexo || 'X',
      nacimiento: p.nacimiento,
      fallecimiento: p.fallecimiento,
      notas: p.notas || '',
      padres: [], hijos: [], conyuges: []
    });
    extIdToMongo.set(p.extId, doc._id.toString());
    created++;
  }

  // 2) Relaciones desde families (usa FAM o reconstrucción)
  const acc = {}; // idMongo -> { padres:Set, hijos:Set, conyuges:Set }
  const getAcc = (id) => (acc[id] ||= { padres:new Set(), hijos:new Set(), conyuges:new Set() });

  for (const f of families) {
    // cónyuges
    let spouses = [];
    if (f._spousesAll) {
      const arr = f._spousesAll;
      for (let i=0;i<arr.length;i++) for (let j=i+1;j<arr.length;j++) spouses.push([arr[i], arr[j]]);
    } else {
      if (f.husband && f.wife) spouses.push([f.husband, f.wife]);
    }

    for (const [A, B] of spouses) {
      const a = A ? extIdToMongo.get(A) : null;
      const b = B ? extIdToMongo.get(B) : null;
      if (a && b) { getAcc(a).conyuges.add(b); getAcc(b).conyuges.add(a); }
    }

    // padres → hijxs
    const kids = (f.children || []).map(cid => extIdToMongo.get(cid)).filter(Boolean);
    const parentExts = f._spousesAll || (spouses.flat() ?? []);
    const parentMongo = [...new Set(parentExts.map(x => extIdToMongo.get(x)).filter(Boolean))];

    for (const k of kids) {
      for (const p of parentMongo) { getAcc(p).hijos.add(k); getAcc(k).padres.add(p); }
    }
  }

  let relationUpdates = 0;
  for (const [id, rel] of Object.entries(acc)) {
    const payload = {};
    if (rel.padres.size)  (payload.$addToSet ||= {}).padres   = { $each: [...rel.padres] };
    if (rel.hijos.size)   (payload.$addToSet ||= {}).hijos    = { $each: [...rel.hijos] };
    if (rel.conyuges.size)(payload.$addToSet ||= {}).conyuges = { $each: [...rel.conyuges] };
    if (Object.keys(payload).length) {
      await Persona.findByIdAndUpdate(id, payload, { new:false });
      relationUpdates++;
    }
  }

  console.log('✅ Import OK', { mode, ignoreBirthInMerge, created, updated, families: families.length, relationUpdates, totalPeople: individuals.length });

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('💥 Error import:', err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
