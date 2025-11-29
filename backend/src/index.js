import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';

dotenv.config();

// Vars de entorno
const {
  PORT = 4000,
  MONGO_URI = 'mongodb://127.0.0.1:27017/arbol_local',
} = process.env;

// __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App & Middlewares
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Servir /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper async
const asyncH = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Fallback en memoria
let personasMem = [];
const oid = () =>
  Math.random().toString(16).slice(2) + Date.now().toString(16);

// ✅ Helper de validación de fechas de matrimonio
function validateMarriageDates({ nacimiento, fallecimiento, matrimonioFecha }) {
  if (!matrimonioFecha) return null; // no hay nada que validar

  const m = new Date(matrimonioFecha);
  if (Number.isNaN(m.getTime())) return 'Fecha de matrimonio inválida';

  if (nacimiento) {
    const n = new Date(nacimiento);
    if (!Number.isNaN(n.getTime()) && m < n) {
      return 'La fecha de matrimonio no puede ser anterior a la fecha de nacimiento';
    }
  }

  if (fallecimiento) {
    const f = new Date(fallecimiento);
    if (!Number.isNaN(f.getTime()) && m > f) {
      return 'La fecha de matrimonio no puede ser posterior a la fecha de defunción';
    }
  }

  return null;
}

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

// Multer
const uploadsDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^\w\-]+/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

// =============================
// CONFIG BACKUP / HELPERS FS
// =============================
const backupRootDir = path.join(__dirname, 'backups');
const BACKUP_ENABLED = process.env.BACKUP_ENABLED === '1';
const BACKUP_EVERY_MINUTES = Number(process.env.BACKUP_EVERY_MINUTES || '60');
const BACKUP_ON_START = process.env.BACKUP_ON_START === '1';

const EXTERNAL_BACKUP_DIR = process.env.EXTERNAL_BACKUP_DIR || 'D:\\backup';
const EXTERNAL_BACKUP_ENABLED = process.env.EXTERNAL_BACKUP_ENABLED === '1';

// Helper timestamp para nombre de carpeta
const backupTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-');

async function ensureDir(dir) {
  try {
    await fsp.mkdir(dir, { recursive: true });
  } catch (err) {
    // ignoramos si ya existe
  }
}

// Copia recursiva de una carpeta
async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await fsp.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

// Backup completo: JSON de personas + copia de /uploads
async function runFullBackup(reason = 'manual') {
  if (!mongoOk) {
    console.warn('⚠️ No se puede hacer backup: Mongo no está OK');
    return { ok: false, error: 'Mongo no disponible' };
  }

  const ts = backupTimestamp();
  const backupDir = path.join(backupRootDir, ts);

  await ensureDir(backupDir);

  // 1) Dump de personas (incluye info de medios)
  const personas = await Persona.find({}).lean();
  const payload = {
    ok: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    count: personas.length,
    personas,
  };

  const jsonPath = path.join(backupDir, 'personas.json');
  await fsp.writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  // 2) Copiar carpeta uploads (archivos físicos)
  try {
    await fsp.access(uploadsDir);
    const uploadsBackupDir = path.join(backupDir, 'uploads');
    await copyDir(uploadsDir, uploadsBackupDir);
  } catch (err) {
    console.warn(
      '⚠️ No se pudo copiar uploads (quizás aún no existe):',
      err.message
    );
  }

  console.log(`🧩 Backup completo creado en ${backupDir} (reason: ${reason})`);

  // ✨ 3) NUEVO: Backup externo en D:\backup
  let externalBackupInfo = null;
  if (EXTERNAL_BACKUP_ENABLED) {
    try {
      const externalDir = path.join(EXTERNAL_BACKUP_DIR, ts);
      await ensureDir(externalDir);

      // Copiar JSON
      const externalJsonPath = path.join(externalDir, 'personas.json');
      await fsp.writeFile(
        externalJsonPath,
        JSON.stringify(payload, null, 2),
        'utf8'
      );

      // Copiar uploads
      try {
        await fsp.access(uploadsDir);
        const externalUploadsDir = path.join(externalDir, 'uploads');
        await copyDir(uploadsDir, externalUploadsDir);
      } catch (err) {
        console.warn('⚠️ No se pudo copiar uploads al backup externo');
      }

      console.log(
        `💾 Backup externo creado en ${externalDir} (reason: ${reason})`
      );
      externalBackupInfo = { dir: externalDir, ok: true };
    } catch (err) {
      console.error('❌ Error al crear backup externo:', err.message);
      externalBackupInfo = { ok: false, error: err.message };
    }
  }

  return {
    ok: true,
    dir: backupDir,
    jsonPath,
    count: personas.length,
    reason,
    externalBackup: externalBackupInfo,
  };
}

// -------------------------------------------------------------
// Healthcheck
// -------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), mongo: mongoOk });
});

// Desactivar caché en todas las rutas API
app.use((req, res, next) => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// -------------------------------------------------------------
// CRUD Personas (usa Mongo si está ok; si no, memoria)
// -------------------------------------------------------------
app.post(
  '/api/personas',
  asyncH(async (req, res) => {
    const {
      nombre,
      sexo = 'X',
      nacimiento,
      fallecimiento,
      notas,
      acercaDe,
      avatarUrl,
      bautismo,
      matrimonio, // ✅ campo de matrimonio
    } = req.body || {};

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Normalizamos para validar coherencia de fechas
    const nacimientoDate = nacimiento ? new Date(nacimiento) : undefined;
    const fallecimientoDate = fallecimiento ? new Date(fallecimiento) : undefined;
    const matrimonioFechaDate = matrimonio?.fecha
      ? new Date(matrimonio.fecha)
      : undefined;

    const validationError = validateMarriageDates({
      nacimiento: nacimientoDate,
      fallecimiento: fallecimientoDate,
      matrimonioFecha: matrimonioFechaDate,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (mongoOk) {
      const nueva = await Persona.create({
        nombre: String(nombre).trim(),
        sexo,
        nacimiento: nacimientoDate,
        fallecimiento: fallecimientoDate,
        notas,
        acercaDe,
        avatarUrl,
        bautismo: bautismo
          ? {
              fecha: bautismo.fecha ? new Date(bautismo.fecha) : undefined,
              lugar: bautismo.lugar || '',
              parroquia: bautismo.parroquia || '',
              notas: bautismo.notas || '',
            }
          : undefined,
        matrimonio: matrimonio
          ? {
              fecha: matrimonioFechaDate,
              lugar: matrimonio.lugar || '',
            }
          : undefined,
      });
      return res.status(201).json(nueva);
    }

    // 🔁 Fallback en memoria
    const nueva = {
      _id: oid(),
      nombre: String(nombre).trim(),
      sexo,
      nacimiento,
      fallecimiento,
      notas,
      acercaDe,
      avatarUrl,
      bautismo: bautismo
        ? {
            fecha: bautismo.fecha || null,
            lugar: bautismo.lugar || '',
            parroquia: bautismo.parroquia || '',
            notas: bautismo.notas || '',
          }
        : undefined,
      matrimonio: matrimonio
        ? {
            fecha: matrimonio.fecha || null,
            lugar: matrimonio.lugar || '',
          }
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      padres: [],
      hijos: [],
      conyuges: [],
    };
    personasMem.unshift(nueva);
    return res.status(201).json(nueva);
  })
);

app.get(
  '/api/personas',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Requiere MongoDB activo' });
    }

    const {
      q,
      page = 1,
      limit = 50,
      sort = 'nombre',
      order = 'asc',
    } = req.query;

    let query = {};
    if (q && q.trim()) {
      query.nombre = { $regex: q.trim(), $options: 'i' };
    }

    const items = await Persona.find(query)
      .select('_id nombre sexo nacimiento fallecimiento avatarUrl')
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Persona.countDocuments(query);

    res.json({
      items,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  })
);

app.put(
  '/api/personas/:id',
  asyncH(async (req, res) => {
    const { id } = req.params;
    const data = { ...req.body };

    if (mongoOk) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const existing = await Persona.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'No encontrada' });
      }

      // Calculamos valores efectivos para validar
      let nacimientoDate;
      if (Object.prototype.hasOwnProperty.call(data, 'nacimiento')) {
        nacimientoDate = data.nacimiento ? new Date(data.nacimiento) : null;
      } else {
        nacimientoDate = existing.nacimiento || undefined;
      }

      let fallecimientoDate;
      if (Object.prototype.hasOwnProperty.call(data, 'fallecimiento')) {
        fallecimientoDate = data.fallecimiento
          ? new Date(data.fallecimiento)
          : null;
      } else {
        fallecimientoDate = existing.fallecimiento || undefined;
      }

      let matrimonioFechaDate;
      if (data.matrimonio && Object.prototype.hasOwnProperty.call(data.matrimonio, 'fecha')) {
        matrimonioFechaDate = data.matrimonio.fecha
          ? new Date(data.matrimonio.fecha)
          : undefined;
      } else if (existing.matrimonio?.fecha) {
        matrimonioFechaDate = existing.matrimonio.fecha;
      } else {
        matrimonioFechaDate = undefined;
      }

      const validationError = validateMarriageDates({
        nacimiento: nacimientoDate,
        fallecimiento: fallecimientoDate,
        matrimonioFecha: matrimonioFechaDate,
      });

      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // Normalizamos lo que vamos a guardar
      if (Object.prototype.hasOwnProperty.call(data, 'nacimiento')) {
        data.nacimiento = nacimientoDate;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'fallecimiento')) {
        data.fallecimiento = fallecimientoDate;
      }

      if (data.bautismo) {
        data.bautismo = {
          fecha: data.bautismo.fecha ? new Date(data.bautismo.fecha) : undefined,
          lugar: data.bautismo.lugar || '',
          parroquia: data.bautismo.parroquia || '',
          notas: data.bautismo.notas || '',
        };
      }

      if (data.matrimonio) {
        data.matrimonio = {
          fecha: matrimonioFechaDate,
          lugar: data.matrimonio.lugar || existing.matrimonio?.lugar || '',
        };
      }

      const updated = await Persona.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!updated) {
        return res.status(404).json({ error: 'No encontrada' });
      }
      return res.json(updated);
    }

    // 🔁 Fallback en memoria
    const idx = personasMem.findIndex((p) => p._id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    const prev = personasMem[idx];

    const nacimientoDate = Object.prototype.hasOwnProperty.call(data, 'nacimiento')
      ? (data.nacimiento ? new Date(data.nacimiento) : null)
      : prev.nacimiento || undefined;

    const fallecimientoDate = Object.prototype.hasOwnProperty.call(data, 'fallecimiento')
      ? (data.fallecimiento ? new Date(data.fallecimiento) : null)
      : prev.fallecimiento || undefined;

    let matrimonioFechaDate;
    if (data.matrimonio && Object.prototype.hasOwnProperty.call(data.matrimonio, 'fecha')) {
      matrimonioFechaDate = data.matrimonio.fecha
        ? new Date(data.matrimonio.fecha)
        : undefined;
    } else if (prev.matrimonio?.fecha) {
      matrimonioFechaDate = prev.matrimonio.fecha;
    } else {
      matrimonioFechaDate = undefined;
    }

    const validationError = validateMarriageDates({
      nacimiento: nacimientoDate,
      fallecimiento: fallecimientoDate,
      matrimonioFecha: matrimonioFechaDate,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (data.bautismo) {
      const prevB = prev.bautismo || {};
      personasMem[idx].bautismo = {
        fecha: data.bautismo.fecha ?? prevB.fecha ?? null,
        lugar: data.bautismo.lugar ?? prevB.lugar ?? '',
        parroquia: data.bautismo.parroquia ?? prevB.parroquia ?? '',
        notas: data.bautismo.notas ?? prevB.notas ?? '',
      };
      delete data.bautismo;
    }

    if (data.matrimonio) {
      const prevM = prev.matrimonio || {};
      personasMem[idx].matrimonio = {
        fecha: matrimonioFechaDate ?? prevM.fecha ?? null,
        lugar: data.matrimonio.lugar ?? prevM.lugar ?? '',
      };
      delete data.matrimonio;
    }

    personasMem[idx] = {
      ...personasMem[idx],
      ...data,
      updatedAt: new Date(),
    };
    return res.json(personasMem[idx]);
  })
);

app.delete(
  '/api/personas/:id',
  asyncH(async (req, res) => {
    const { id } = req.params;

    if (mongoOk) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const ex = await Persona.findById(id);
      if (!ex) {
        return res.status(404).json({ error: 'No encontrada' });
      }

      await Promise.all([
        Persona.updateMany({ padres: id }, { $pull: { padres: id } }),
        Persona.updateMany({ hijos: id }, { $pull: { hijos: id } }),
        Persona.updateMany({ conyuges: id }, { $pull: { conyuges: id } }),
        Persona.updateMany({ otrosConyuges: id }, { $pull: { otrosConyuges: id } }),
        Persona.findByIdAndDelete(id),
      ]);

      return res.json({ ok: true });
    }

    const idx = personasMem.findIndex((p) => p._id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'No encontrada' });
    }
    personasMem.splice(idx, 1);
    return res.json({ ok: true });
  })
);

// -------------------------------------------------------------
// DETALLE — calcula hermanos y expone DTO completo
// -------------------------------------------------------------
app.get(
  '/api/personas/:id',
  asyncH(async (req, res) => {
    const { id } = req.params;
    if (!mongoOk) {
      return res.status(503).json({ error: 'Detalle requiere MongoDB activo' });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const p = await Persona.findById(id)
      .populate(
        'padres',
        '_id nombre sexo nacimiento fallecimiento avatarUrl hijos'
      )
      .populate(
        'hijos',
        '_id nombre sexo nacimiento fallecimiento avatarUrl'
      )
      .populate(
        'conyuges',
        '_id nombre sexo nacimiento fallecimiento avatarUrl'
      )
      .populate(
        'otrosConyuges',
        '_id nombre sexo nacimiento fallecimiento avatarUrl'
      )
      .lean();

    if (!p) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    const siblingIdSet = new Set();
    for (const padre of p.padres || []) {
      for (const hId of padre.hijos || []) {
        const sid = String(hId);
        if (sid !== String(p._id)) siblingIdSet.add(sid);
      }
    }

    let hermanos = [];
    if (siblingIdSet.size) {
      const ids = [...siblingIdSet];
      const hs = await Persona.find(
        { _id: { $in: ids } },
        '_id nombre sexo nacimiento fallecimiento avatarUrl'
      ).lean();
      hermanos = hs;
    }

    const conyuge =
      Array.isArray(p.conyuges) && p.conyuges.length
        ? p.conyuges[0]
        : null;

    const medios = Array.isArray(p.medios) ? p.medios : [];

    const recuerdos = medios
      .filter((m) => (m.tipo || 'imagen') === 'imagen' && m.ruta)
      .map((m) => ({
        _id: String(m._id),
        url: m.ruta,
        titulo: m.titulo || '',
        descripcion: m.descripcion || '',
        fecha: m.fecha || null,
      }));

    const fuentes = medios
      .filter((m) => {
        const tipo = m.tipo || 'imagen';
        return tipo === 'pdf' || tipo === 'otro';
      })
      .map((m) => ({
        _id: String(m._id),
        tipo: m.tipo || 'pdf',
        titulo: m.titulo || m.nombreArchivo || 'Documento',
        descripcion: m.descripcion || '',
        fecha: m.fecha || null,
        ruta: m.ruta || '',
        nombreArchivo: m.nombreArchivo || '',
      }));

    let historiaDestacada = null;
    const ultimaImg = [...recuerdos]
      .reverse()
      .find((m) => m.titulo || m.descripcion);
    if (ultimaImg) {
      historiaDestacada = {
        titulo: ultimaImg.titulo || 'Historia',
        descripcion: ultimaImg.descripcion || '',
        imagenUrl: ultimaImg.url,
      };
    }

    const dto = {
      _id: String(p._id),
      nombre: p.nombre,
      sexo: p.sexo,
      nacimiento: p.nacimiento,
      fallecimiento: p.fallecimiento,
      lugarNacimiento: p.lugarNacimiento || null,
      lugarFallecimiento: p.lugarFallecimiento || null,
      causaFallecimiento: p.causaFallecimiento || null,
      acercaDe: p.acercaDe || null,
      avatarUrl: p.avatarUrl || null,

      bautismo: p.bautismo
        ? {
            fecha: p.bautismo.fecha || null,
            lugar: p.bautismo.lugar || '',
            parroquia: p.bautismo.parroquia || '',
            notas: p.bautismo.notas || '',
          }
        : null,

      // ✅ matrimonio expuesto tal cual
      matrimonio: p.matrimonio
        ? {
            fecha: p.matrimonio.fecha || null,
            lugar: p.matrimonio.lugar || '',
          }
        : null,

      conyuge: conyuge
        ? {
            _id: String(conyuge._id),
            nombre: conyuge.nombre,
            nacimiento: conyuge.nacimiento,
            fallecimiento: conyuge.fallecimiento,
            avatarUrl: conyuge.avatarUrl || null,
          }
        : null,

      otrosConyuges: (p.otrosConyuges || []).map((c) => ({
        _id: String(c._id),
        nombre: c.nombre,
        nacimiento: c.nacimiento,
        fallecimiento: c.fallecimiento,
        avatarUrl: c.avatarUrl || null,
      })),

      padres: (p.padres || []).map((x) => ({
        _id: String(x._id),
        nombre: x.nombre,
        nacimiento: x.nacimiento,
        fallecimiento: x.fallecimiento,
        avatarUrl: x.avatarUrl || null,
      })),
      hijos: (p.hijos || []).map((x) => ({
        _id: String(x._id),
        nombre: x.nombre,
        nacimiento: x.nacimiento,
        fallecimiento: x.fallecimiento,
        avatarUrl: x.avatarUrl || null,
      })),
      hermanos: hermanos.map((x) => ({
        _id: String(x._id),
        nombre: x.nombre,
        nacimiento: x.nacimiento,
        fallecimiento: x.fallecimiento,
        avatarUrl: x.avatarUrl || null,
      })),

      historiaDestacada,
      fuentes,
      recuerdos,
    };

    res.json(dto);
  })
);

// -------------------------------------------------------------
// Bulk (Mongo requerido)
// -------------------------------------------------------------
app.post(
  '/api/personas/bulk',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Requiere MongoDB activo' });
    }
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids[] requerido' });
    }
    const valid = ids.filter((id) => mongoose.isValidObjectId(id));
    const items = await Persona.find({ _id: { $in: valid } }).lean();
    res.json({ items });
  })
);

// ✅ Marcar otro cónyuge como preferido
app.put('/api/personas/:id/conyuge-preferido', async (req, res) => {
  if (!mongoOk) {
    return res.status(503).json({ error: 'Requiere MongoDB activo' });
  }
  const { id } = req.params;
  const { conyugeId } = req.body || {};

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(conyugeId)) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  const persona = await Persona.findById(id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona no encontrada' });
  }

  const esOtroConyuge = (persona.otrosConyuges || []).some(
    (c) => String(c) === String(conyugeId)
  );
  if (!esOtroConyuge) {
    return res.status(400).json({
      error: 'El cónyuge seleccionado no está en otros cónyuges',
    });
  }

  persona.conyugePreferido = conyugeId;

  const otros = (persona.otrosConyuges || []).filter(
    (c) => String(c) !== String(conyugeId)
  );
  persona.otrosConyuges = [conyugeId, ...otros];

  await persona.save();
  res.json({
    ok: true,
    conyugePreferido: conyugeId,
    otrosConyuges: persona.otrosConyuges,
  });
});

// -------------------------------------------------------------
// Relaciones
// -------------------------------------------------------------
const isId = (id) => mongoose.isValidObjectId(id);

app.post(
  '/api/relaciones/padre-hijo',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
    }
    const padreId = req.body?.padreId || req.query?.padreId;
    const hijoId = req.body?.hijoId || req.query?.hijoId;
    if (!isId(padreId) || !isId(hijoId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }
    if (padreId === hijoId) {
      return res
        .status(400)
        .json({ error: 'No puede ser su propio padre/hijo' });
    }

    const [padre, hijo] = await Promise.all([
      Persona.findById(padreId),
      Persona.findById(hijoId),
    ]);
    if (!padre || !hijo) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    await Promise.all([
      Persona.findByIdAndUpdate(padreId, {
        $addToSet: { hijos: hijoId },
      }),
      Persona.findByIdAndUpdate(hijoId, {
        $addToSet: { padres: padreId },
      }),
    ]);

    const [padreNew, hijoNew] = await Promise.all([
      Persona.findById(padreId).lean(),
      Persona.findById(hijoId).lean(),
    ]);
    res.json({ ok: true, padre: padreNew, hijo: hijoNew });
  })
);

app.delete(
  '/api/relaciones/padre-hijo',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
    }
    const padreId = req.body?.padreId || req.query?.padreId;
    const hijoId = req.body?.hijoId || req.query?.hijoId;
    if (!isId(padreId) || !isId(hijoId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    await Promise.all([
      Persona.findByIdAndUpdate(padreId, {
        $pull: { hijos: hijoId },
      }),
      Persona.findByIdAndUpdate(hijoId, {
        $pull: { padres: padreId },
      }),
    ]);

    const [padreNew, hijoNew] = await Promise.all([
      Persona.findById(padreId).lean(),
      Persona.findById(hijoId).lean(),
    ]);
    res.json({ ok: true, padre: padreNew, hijo: hijoNew });
  })
);

app.post(
  '/api/relaciones/conyuges',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
    }
    const aId = req.body?.aId || req.query?.aId;
    const bId = req.body?.bId || req.query?.bId;
    if (!isId(aId) || !isId(bId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }
    if (aId === bId) {
      return res
        .status(400)
        .json({ error: 'No puede ser cónyuge de sí mismo' });
    }

    const [a, b] = await Promise.all([
      Persona.findById(aId),
      Persona.findById(bId),
    ]);
    if (!a || !b) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    await Promise.all([
      Persona.findByIdAndUpdate(aId, {
        $addToSet: { conyuges: bId },
      }),
      Persona.findByIdAndUpdate(bId, {
        $addToSet: { conyuges: aId },
      }),
    ]);

    const [aNew, bNew] = await Promise.all([
      Persona.findById(aId).lean(),
      Persona.findById(bId).lean(),
    ]);
    res.json({ ok: true, a: aNew, b: bNew });
  })
);

app.delete(
  '/api/relaciones/conyuges',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
    }
    const aId = req.body?.aId || req.query?.aId;
    const bId = req.body?.bId || req.query?.bId;
    if (!isId(aId) || !isId(bId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    await Promise.all([
      Persona.findByIdAndUpdate(aId, {
        $pull: { conyuges: bId },
      }),
      Persona.findByIdAndUpdate(bId, {
        $pull: { conyuges: aId },
      }),
    ]);

    const [aNew, bNew] = await Promise.all([
      Persona.findById(aId).lean(),
      Persona.findById(bId).lean(),
    ]);
    res.json({ ok: true, a: aNew, b: bNew });
  })
);

// ✅ NUEVO: Otros cónyuges
app.post(
  '/api/relaciones/otros-conyuges',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
    }
    const aId = req.body?.aId || req.query?.aId;
    const bId = req.body?.bId || req.query?.bId;
    if (!isId(aId) || !isId(bId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }
    if (aId === bId) {
      return res
        .status(400)
        .json({ error: 'No puede ser cónyuge de sí mismo' });
    }

    const [a, b] = await Promise.all([
      Persona.findById(aId),
      Persona.findById(bId),
    ]);
    if (!a || !b) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    await Promise.all([
      Persona.findByIdAndUpdate(aId, {
        $addToSet: { otrosConyuges: bId },
      }),
      Persona.findByIdAndUpdate(bId, {
        $addToSet: { otrosConyuges: aId },
      }),
    ]);

    const [aNew, bNew] = await Promise.all([
      Persona.findById(aId).lean(),
      Persona.findById(bId).lean(),
    ]);
    res.json({ ok: true, a: aNew, b: bNew });
  })
);

app.delete(
  '/api/relaciones/otros-conyuges',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
    }
    const aId = req.body?.aId || req.query?.aId;
    const bId = req.body?.bId || req.query?.bId;
    if (!isId(aId) || !isId(bId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    await Promise.all([
      Persona.findByIdAndUpdate(aId, {
        $pull: { otrosConyuges: bId },
      }),
      Persona.findByIdAndUpdate(bId, {
        $pull: { otrosConyuges: aId },
      }),
    ]);

    const [aDoc, bDoc] = await Promise.all([
      Persona.findById(aId),
      Persona.findById(bId),
    ]);
    if (
      aDoc &&
      aDoc.conyugePreferido &&
      String(aDoc.conyugePreferido) === String(bId)
    ) {
      aDoc.conyugePreferido = null;
      await aDoc.save();
    }
    if (
      bDoc &&
      bDoc.conyugePreferido &&
      String(bDoc.conyugePreferido) === String(aId)
    ) {
      bDoc.conyugePreferido = null;
      await bDoc.save();
    }

    const [aNew, bNew] = await Promise.all([
      Persona.findById(aId).lean(),
      Persona.findById(bId).lean(),
    ]);
    res.json({ ok: true, a: aNew, b: bNew });
  })
);

app.post(
  '/api/personas/:id/avatar',
  upload.single('file'),
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Requiere MongoDB activo' });
    }
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    const url = `/uploads/${req.file.filename}`;
    const updated = await Persona.findByIdAndUpdate(
      id,
      { avatarUrl: url },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'No encontrada' });
    }
    res.json({ ok: true, avatarUrl: url, persona: updated });
  })
);

app.post(
  '/api/personas/:id/media',
  upload.single('file'),
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Requiere MongoDB activo' });
    }
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    const { tipo = '', titulo = '', descripcion = '', fecha = '' } =
      req.body || {};
    const ruta = `/uploads/${req.file.filename}`;

    let detected = 'otro';
    if (req.file.mimetype?.startsWith('image/')) detected = 'imagen';
    else if (req.file.mimetype === 'application/pdf') detected = 'pdf';
    const finalTipo = tipo || detected;

    const mediaItem = {
      tipo: finalTipo,
      titulo,
      descripcion,
      ruta,
      nombreArchivo: req.file.originalname,
      fecha: fecha ? new Date(fecha) : undefined,
    };

    const updated = await Persona.findByIdAndUpdate(
      id,
      { $push: { medios: mediaItem } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'No encontrada' });
    }
    res.json({ ok: true, added: mediaItem, persona: updated });
  })
);

app.delete(
  '/api/personas/:id/media/:mediaId',
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Requiere MongoDB activo' });
    }
    const { id, mediaId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(mediaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const updated = await Persona.findByIdAndUpdate(
      id,
      { $pull: { medios: { _id: mediaId } } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    res.json({ ok: true, persona: updated });
  })
);
app.put(
  '/api/personas/:id/media/:mediaId',
  upload.single('file'),
  asyncH(async (req, res) => {
    if (!mongoOk) {
      return res.status(503).json({ error: 'Requiere MongoDB activo' });
    }

    const { id, mediaId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(mediaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const persona = await Persona.findById(id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    // 👀 IMPORTANTE: el array se llama "medios", NO "media"
    const mediaItem = persona.medios?.id?.(mediaId);
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media no encontrada' });
    }

    const { titulo, descripcion, fecha, tipo = '' } = req.body || {};

    if (titulo !== undefined) mediaItem.titulo = titulo;
    if (descripcion !== undefined) mediaItem.descripcion = descripcion;

    if (typeof fecha !== 'undefined') {
      mediaItem.fecha = fecha ? new Date(fecha) : undefined;
    }

    // Si viene archivo nuevo, lo reemplazamos
    if (req.file) {
      const ruta = `/uploads/${req.file.filename}`;

      let detected = 'otro';
      if (req.file.mimetype?.startsWith('image/')) detected = 'imagen';
      else if (req.file.mimetype === 'application/pdf') detected = 'pdf';

      const finalTipo = tipo || detected;

      mediaItem.ruta = ruta;
      mediaItem.nombreArchivo = req.file.originalname;
      mediaItem.tipo = finalTipo;
    } else if (tipo) {
      mediaItem.tipo = tipo;
    }

    await persona.save();

    return res.json({
      ok: true,
      media: mediaItem,
      persona,
    });
  })
);
// =============================
// BACKUP / RESTORE
// =============================

// GET /api/backup -> dump JSON (sin copiar archivos)
app.get(
  '/api/backup',
  asyncH(async (_req, res) => {
    const personas = mongoOk ? await Persona.find({}).lean() : personasMem;

    res.json({
      ok: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      count: personas.length,
      personas,
    });
  })
);

// POST /api/backup/run -> backup completo (JSON + /uploads)
app.post(
  '/api/backup/run',
  asyncH(async (req, res) => {
    const info = await runFullBackup('manual-endpoint');
    if (!info.ok) return res.status(500).json(info);
    res.json(info);
  })
);

app.post(
  '/api/restore',
  asyncH(async (req, res) => {
    const mode = (req.query.mode || 'merge').toLowerCase();
    const { personas } = req.body || {};
    if (!Array.isArray(personas)) {
      return res
        .status(400)
        .json({ error: 'Se espera { personas: [...] }' });
    }

    if (mongoOk) {
      if (mode === 'replace') {
        await Persona.deleteMany({});
        await Persona.insertMany(personas, { ordered: false });
        const total = await Persona.countDocuments();
        return res.json({ ok: true, mode, total });
      }

      let upserts = 0,
        created = 0,
        updated = 0,
        skipped = 0;
      for (const p of personas) {
        const { _id, ...rest } = p || {};
        if (rest.nacimiento) rest.nacimiento = new Date(rest.nacimiento);
        if (rest.fallecimiento)
          rest.fallecimiento = new Date(rest.fallecimiento);
        if (Array.isArray(rest.medios)) {
          rest.medios = rest.medios.map((m) =>
            m?.fecha ? { ...m, fecha: new Date(m.fecha) } : m
          );
        }
        if (rest.bautismo?.fecha) {
          rest.bautismo.fecha = new Date(rest.bautismo.fecha);
        }
        if (rest.matrimonio?.fecha) {
          rest.matrimonio.fecha = new Date(rest.matrimonio.fecha);
        }

        if (_id && mongoose.isValidObjectId(_id)) {
          const doc = await Persona.findByIdAndUpdate(_id, rest, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          });
          upserts++;
          // @ts-ignore
          doc.wasNew ? created++ : updated++;
        } else {
          await Persona.create(p);
          created++;
        }
      }
      const total = await Persona.countDocuments();
      return res.json({
        ok: true,
        mode,
        total,
        upserts,
        created,
        updated,
        skipped,
      });
    }

    // Fallback memoria
    if (mode === 'replace') {
      personasMem = personas.map((p) => ({
        ...p,
        _id: p._id || oid(),
        createdAt: p.createdAt || new Date(),
        updatedAt: p.updatedAt || new Date(),
      }));
      return res.json({
        ok: true,
        mode,
        total: personasMem.length,
      });
    }

    const byId = new Map(personasMem.map((p) => [p._id, p]));
    let created = 0,
      updated = 0;
    for (const p of personas) {
      if (p._id && byId.has(p._id)) {
        const prev = byId.get(p._id);
        const merged = {
          ...prev,
          ...p,
          updatedAt: new Date(),
        };
        if (p.bautismo) {
          merged.bautismo = {
            fecha: p.bautismo.fecha || prev?.bautismo?.fecha || null,
            lugar: p.bautismo.lugar ?? prev?.bautismo?.lugar ?? '',
            parroquia:
              p.bautismo.parroquia ?? prev?.bautismo?.parroquia ?? '',
            notas:
              p.bautismo.notas ?? prev?.bautismo?.notas ?? '',
          };
        }
        if (p.matrimonio) {
          merged.matrimonio = {
            fecha: p.matrimonio.fecha || prev?.matrimonio?.fecha || null,
            lugar: p.matrimonio.lugar ?? prev?.matrimonio?.lugar ?? '',
          };
        }
        byId.set(p._id, merged);
        updated++;
      } else {
        const np = {
          ...p,
          _id: p._id || oid(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        personasMem.push(np);
        created++;
      }
    }
    return res.json({
      ok: true,
      mode,
      total: personasMem.length,
      created,
      updated,
    });
  })
);
// ⭐ EDITAR MEDIA (metadata + cambiar archivo opcional)


app.use((req, res) =>
  res.status(404).json({ error: 'Ruta no encontrada' })
);
app.use((err, req, res, _next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend en http://localhost:${PORT}`);
});

// ===== BACKUP AUTOMÁTICO =====
if (BACKUP_ENABLED && mongoOk) {
  const intervalMs = BACKUP_EVERY_MINUTES * 60 * 1000;
  console.log(
    `⏱️ Backup automático activado cada ${BACKUP_EVERY_MINUTES} minutos`
  );

  setInterval(() => {
    runFullBackup('auto-interval').catch((err) => {
      console.error('💥 Error al ejecutar backup automático:', err);
    });
  }, intervalMs);
} else {
  console.log(
    '⏸️ Backup automático DESACTIVADO (BACKUP_ENABLED != "1" o Mongo no disponible)'
  );
}

// Backup al iniciar
if (BACKUP_ON_START && mongoOk) {
  runFullBackup('on-start').catch((err) => {
    console.error('💥 Error al hacer backup al inicio:', err);
  });
}

const shutdown = async (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('HTTP server cerrado.');
    if (mongoOk)
      mongoose.connection
        .close(false)
        .then(() => {
          console.log('Conexion Mongo cerrada.');
          process.exit(0);
        });
    else process.exit(0);
  });
};
['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, () => shutdown(sig))
);
