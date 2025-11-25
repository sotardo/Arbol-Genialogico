// backend/tools/gedcom_to_backup.mjs
import fs from 'fs';
import parseGedcom from 'parse-gedcom';
import iconv from 'iconv-lite';
import { ObjectId } from 'bson';

// --- Decodificación robusta (UTF-8 / UTF-16LE / Win-1252) ---
function decodeGedBuffer(buf) {
  const head = buf.subarray(0, Math.min(buf.length, 4096));
  const zeros = [...head].filter(b => b === 0).length;
  const zeroRatio = zeros / head.length;
  if (zeroRatio > 0.2) return iconv.decode(buf, 'utf16le'); // típico UNICODE LE
  let txt = iconv.decode(buf, 'utf8');
  if (txt.includes('\uFFFD')) txt = iconv.decode(buf, 'win1252'); // “ANSI” común
  return txt;
}

// Helpers GEDCOM
const children = (node, tag) => (node.children || []).filter(c => c.tag === tag);
const valueOf  = (node, tag) => (children(node, tag)[0]?.data || children(node, tag)[0]?.value || '');
const dateOf   = (node, tag) => {
  const txt = valueOf(node, tag);
  const parsed = Date.parse(txt.replace(/abt\.?|about|circa/ig, '').trim());
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

// Mapear INDI -> tu modelo Persona (sin relaciones aún)
function mapPersonaFromINDI(indiNode) {
  const nameNode = children(indiNode, 'NAME')[0];
  let nombre = (nameNode?.data || nameNode?.value || '').replace(/\//g, ' ').trim();
  if (!nombre) nombre = valueOf(indiNode, 'TITL') || '(Sin nombre)';
  const sexo = valueOf(indiNode, 'SEX') || 'X';
  const nacimiento = (children(indiNode, 'BIRT')[0]) ? dateOf(children(indiNode, 'BIRT')[0], 'DATE') : null;
  const fallecimiento = (children(indiNode, 'DEAT')[0]) ? dateOf(children(indiNode, 'DEAT')[0], 'DATE') : null;
  const notas = children(indiNode, 'NOTE').map(n => n.data || n.value || '').join('\n').trim() || undefined;
  return { nombre, sexo, nacimiento, fallecimiento, notas };
}

function toISOorNull(d) { return d instanceof Date && !isNaN(d) ? d.toISOString() : undefined; }

async function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3] || 'backup-from-gedcom.json';
  if (!inPath) {
    console.error('Uso: node tools/gedcom_to_backup.mjs <archivo.ged> [salida.json]');
    process.exit(1);
  }

  const buf = fs.readFileSync(inPath);
  const raw = decodeGedBuffer(buf);

  if (!/0\s+HEAD/.test(raw)) {
    console.error('No se detectó HEAD en el GEDCOM. Posible codificación ANSEL no soportada. Exportá a UTF-8/UNICODE.');
    process.exit(2);
  }

  let tree;
  try {
    tree = parseGedcom.parse(raw);
  } catch (e) {
    console.error('Error parseando GEDCOM:', e.message);
    process.exit(3);
  }

  const nodes = tree.children || [];
  const indi  = nodes.filter(n => n.tag === 'INDI');
  const fams  = nodes.filter(n => n.tag === 'FAM');

  if (indi.length === 0) {
    console.error('No se encontraron individuos (INDI).');
    process.exit(4);
  }

  // 1) Crear personas con _id fijos (ObjectId) para poder referenciar relaciones en el JSON final
  const ptrToId = new Map();      // @I1@ -> _id (hex)
  const personas = [];            // salida final

  for (const node of indi) {
    const data = mapPersonaFromINDI(node);
    const ptr = node.pointer; // ej. @I123@
    const _id = new ObjectId().toHexString();

    ptrToId.set(ptr, _id);
    personas.push({
      _id,
      nombre: data.nombre,
      sexo: data.sexo,
      nacimiento: toISOorNull(data.nacimiento),
      fallecimiento: toISOorNull(data.fallecimiento),
      notas: data.notas,
      // relaciones se completan después
      padres: [],
      hijos: [],
      conyuges: [],
      // campos opcionales del schema
      acercaDe: undefined,
      avatarUrl: undefined,
      medios: []
    });
  }

  const byId = new Map(personas.map(p => [p._id, p]));

  // 2) Agregar relaciones desde FAM
  let rels = 0;
  for (const fam of fams) {
    const husbPtr = valueOf(fam, 'HUSB');
    const wifePtr = valueOf(fam, 'WIFE');
    const childPtrs = children(fam, 'CHIL').map(c => c.data || c.value).filter(Boolean);

    const aId = husbPtr ? ptrToId.get(husbPtr) : null;
    const bId = wifePtr ? ptrToId.get(wifePtr) : null;
    const cIds = childPtrs.map(ptr => ptrToId.get(ptr)).filter(Boolean);

    // conyuges (bidireccional)
    if (aId && bId) {
      const a = byId.get(aId), b = byId.get(bId);
      if (a && !a.conyuges.includes(bId)) a.conyuges.push(bId);
      if (b && !b.conyuges.includes(aId)) b.conyuges.push(aId);
      rels++;
    }

    // hijos con cada progenitor presente (padres[] en hijo; hijos[] en progenitor)
    for (const hId of cIds) {
      const h = byId.get(hId);
      if (!h) continue;
      if (aId) {
        const a = byId.get(aId);
        if (a && !a.hijos.includes(hId)) a.hijos.push(hId);
        if (!h.padres.includes(aId)) h.padres.push(aId);
        rels++;
      }
      if (bId) {
        const b = byId.get(bId);
        if (b && !b.hijos.includes(hId)) b.hijos.push(hId);
        if (!h.padres.includes(bId)) h.padres.push(bId);
        rels++;
      }
    }
  }

  const out = {
    ok: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    count: personas.length,
    personas
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`✅ Convertido. INDI: ${indi.length}, FAM: ${fams.length}, relaciones: ${rels}`);
  console.log(`📄 Archivo guardado en: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(9);
});
