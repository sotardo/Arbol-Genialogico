// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

// Vars de entorno (UNA sola vez)
const { PORT = 4000, MONGO_URI = 'mongodb://127.0.0.1:27017/arbol_local' } = process.env;

// __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App & Middlewares
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Servir /uploads después de crear app
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper async
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Fallback en memoria
let personasMem = []; // { _id, nombre, sexo, nacimiento, fallecimiento, notas, acercaDe, avatarUrl, padres, hijos, conyuges }
const oid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

// Conexión Mongo (con fallback)
let mongoOk = false;
try {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB conectado');
  mongoOk = true;
} catch (err) {
  console.error('❌ Error MongoDB:', err.message);
  console.warn('⚠️ Usando almacenamiento en memoria TEMPORAL (no persistente)');
}

let Persona = null;
if (mongoOk) {
  const mod = await import('./models/Persona.js');
  Persona = mod.default;
}

// Multer (para futuros endpoints de avatar/media)
const uploadsDir = path.join(__dirname, 'uploads');
// (la carpeta la creaste con mkdir, si no existe Multer la crea igual)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^\w\-]+/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({ storage });

// -------------------------------------------------------------
// Healthcheck
// -------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), mongo: mongoOk });
});

// -------------------------------------------------------------
// LISTAR avanzado (search + page + limit + sort + order) con fallback
// -------------------------------------------------------------
app.get('/api/personas', asyncH(async (req, res) => {
  const {
    search = '',
    page = '1',
    limit = '20',
    sort = 'nombre',
    order = 'asc',
  } = req.query;

  const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
  const sortObj  = { [sort]: order === 'desc' ? -1 : 1 };

  if (mongoOk) {
    let query = {};
    let projection;
    let sortFinal = sortObj;

    if (search && search.trim()) {
      query = { $text: { $search: search.trim() } };
      projection = { score: { $meta: 'textScore' } };
      sortFinal = { score: { $meta: 'textScore' }, ...sortObj };
    } else if (req.query.q) {
      // compat viejo
      query = { nombre: { $regex: String(req.query.q), $options: 'i' } };
    }

    const [total, items] = await Promise.all([
      Persona.countDocuments(query),
      Persona.find(query, projection)
        .sort(sortFinal)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean()
    ]);

    return res.json({
      items, total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    });
  }

  // Fallback memoria
  const needle = (search || req.query.q || '').toString().toLowerCase();
  const filtered = needle
    ? personasMem.filter(p =>
        (p.nombre   || '').toLowerCase().includes(needle) ||
        (p.notas    || '').toLowerCase().includes(needle) ||
        (p.acercaDe || '').toLowerCase().includes(needle)
      )
    : personasMem;

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sort] ?? '').toString().toLowerCase();
    const bv = (b[sort] ?? '').toString().toLowerCase();
    if (av === bv) return 0;
    return order === 'desc' ? (av < bv ? 1 : -1) : (av > bv ? 1 : -1);
  });

  const total = sorted.length;
  const start = (pageNum - 1) * limitNum;
  const items = sorted.slice(start, start + limitNum);

  return res.json({
    items, total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    hasNext: pageNum * limitNum < total,
    hasPrev: pageNum > 1,
  });
}));

// -------------------------------------------------------------
// CRUD Personas (usa Mongo si está ok; si no, memoria)
// -------------------------------------------------------------
app.post('/api/personas', asyncH(async (req, res) => {
  const { nombre, sexo = 'X', nacimiento, fallecimiento, notas, acercaDe, avatarUrl } = req.body || {};
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  if (mongoOk) {
    const nueva = await Persona.create({
      nombre: String(nombre).trim(),
      sexo,
      nacimiento: nacimiento ? new Date(nacimiento) : undefined,
      fallecimiento: fallecimiento ? new Date(fallecimiento) : undefined,
      notas, acercaDe, avatarUrl
    });
    return res.status(201).json(nueva);
  }

  const nueva = {
    _id: oid(),
    nombre: String(nombre).trim(),
    sexo, nacimiento, fallecimiento, notas, acercaDe, avatarUrl,
    createdAt: new Date(), updatedAt: new Date(),
    padres: [], hijos: [], conyuges: []
  };
  personasMem.unshift(nueva);
  return res.status(201).json(nueva);
}));

app.put('/api/personas/:id', asyncH(async (req, res) => {
  const { id } = req.params;
  const data = { ...req.body };

  if (mongoOk) {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID inválido' });
    if (data.nacimiento) data.nacimiento = new Date(data.nacimiento);
    if (data.fallecimiento) data.fallecimiento = new Date(data.fallecimiento);

    const updated = await Persona.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'No encontrada' });
    return res.json(updated);
  }

  const idx = personasMem.findIndex(p => p._id === id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' });
  personasMem[idx] = { ...personasMem[idx], ...data, updatedAt: new Date() };
  return res.json(personasMem[idx]);
}));

app.delete('/api/personas/:id', asyncH(async (req, res) => {
  const { id } = req.params;

  if (mongoOk) {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID inválido' });
    const ex = await Persona.findById(id);
    if (!ex) return res.status(404).json({ error: 'No encontrada' });

    await Promise.all([
      Persona.updateMany({ padres: id }, { $pull: { padres: id } }),
      Persona.updateMany({ hijos: id }, { $pull: { hijos: id } }),
      Persona.updateMany({ conyuges: id }, { $pull: { conyuges: id } }),
      Persona.findByIdAndDelete(id)
    ]);

    return res.json({ ok: true });
  }

  const idx = personasMem.findIndex(p => p._id === id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' });
  personasMem.splice(idx, 1);
  return res.json({ ok: true });
}));

// Detalle (Mongo requerido)
app.get('/api/personas/:id', asyncH(async (req, res) => {
  const { id } = req.params;
  if (!mongoOk) return res.status(503).json({ error: 'Detalle requiere MongoDB activo' });
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID inválido' });

  const p = await Persona.findById(id).lean();
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  res.json(p);
}));

// Bulk (Mongo requerido)
app.post('/api/personas/bulk', asyncH(async (req, res) => {
  if (!mongoOk) return res.status(503).json({ error: 'Requiere MongoDB activo' });
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids[] requerido' });
  const valid = ids.filter(id => mongoose.isValidObjectId(id));
  const items = await Persona.find({ _id: { $in: valid } }).lean();
  res.json({ items });
}));

// -------------------------------------------------------------
// Relaciones (en este mismo archivo para simplificar)
// -------------------------------------------------------------
const isId = (id) => mongoose.isValidObjectId(id);

// Padre ↔ Hijo (vincular)
app.post('/api/relaciones/padre-hijo', asyncH(async (req, res) => {
  if (!mongoOk) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { padreId, hijoId } = req.body || {};
  if (!isId(padreId) || !isId(hijoId)) return res.status(400).json({ error: 'IDs inválidos' });
  if (padreId === hijoId) return res.status(400).json({ error: 'No puede ser su propio padre/hijo' });

  const [padre, hijo] = await Promise.all([Persona.findById(padreId), Persona.findById(hijoId)]);
  if (!padre || !hijo) return res.status(404).json({ error: 'Persona no encontrada' });

  await Promise.all([
    Persona.findByIdAndUpdate(padreId, { $addToSet: { hijos: hijoId } }),
    Persona.findByIdAndUpdate(hijoId, { $addToSet: { padres: padreId } }),
  ]);
  res.json({ ok: true });
}));

// Padre ↔ Hijo (desvincular)
app.delete('/api/relaciones/padre-hijo', asyncH(async (req, res) => {
  if (!mongoOk) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { padreId, hijoId } = req.body || {};
  if (!isId(padreId) || !isId(hijoId)) return res.status(400).json({ error: 'IDs inválidos' });

  await Promise.all([
    Persona.findByIdAndUpdate(padreId, { $pull: { hijos: hijoId } }),
    Persona.findByIdAndUpdate(hijoId, { $pull: { padres: padreId } }),
  ]);
  res.json({ ok: true });
}));

// Cónyuges (vincular)
app.post('/api/relaciones/conyuges', asyncH(async (req, res) => {
  if (!mongoOk) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { aId, bId } = req.body || {};
  if (!isId(aId) || !isId(bId)) return res.status(400).json({ error: 'IDs inválidos' });
  if (aId === bId) return res.status(400).json({ error: 'No puede ser cónyuge de sí mismo' });

  const [a, b] = await Promise.all([Persona.findById(aId), Persona.findById(bId)]);
  if (!a || !b) return res.status(404).json({ error: 'Persona no encontrada' });

  await Promise.all([
    Persona.findByIdAndUpdate(aId, { $addToSet: { conyuges: bId } }),
    Persona.findByIdAndUpdate(bId, { $addToSet: { conyuges: aId } }),
  ]);
  res.json({ ok: true });
}));

// Cónyuges (desvincular)
app.delete('/api/relaciones/conyuges', asyncH(async (req, res) => {
  if (!mongoOk) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { aId, bId } = req.body || {};
  if (!isId(aId) || !isId(bId)) return res.status(400).json({ error: 'IDs inválidos' });

  await Promise.all([
    Persona.findByIdAndUpdate(aId, { $pull: { conyuges: bId } }),
    Persona.findByIdAndUpdate(bId, { $pull: { conyuges: aId } }),
  ]);
  res.json({ ok: true });
}));

// 404 y errores
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, _next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Arranque y apagado limpio
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend en http://localhost:${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('HTTP server cerrado.');
    if (mongoOk) mongoose.connection.close(false).then(() => {
      console.log('Conexion Mongo cerrada.');
      process.exit(0);
    });
    else process.exit(0);
  });
};
['SIGINT','SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
