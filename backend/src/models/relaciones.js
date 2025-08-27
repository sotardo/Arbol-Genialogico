import { Router } from 'express';
import mongoose from 'mongoose';

let Persona;
try {
  ({ default: Persona } = await import('../models/Persona.js')); // si Mongo está activo
} catch (_) {
  Persona = null;
}

const r = Router();
const isId = (id) => mongoose.isValidObjectId(id);

// --- Helpers Mongo ---
async function addToSet(id, field, otherId) {
  return Persona.findByIdAndUpdate(id, { $addToSet: { [field]: otherId } }, { new: true });
}
async function pullFrom(id, field, otherId) {
  return Persona.findByIdAndUpdate(id, { $pull: { [field]: otherId } }, { new: true });
}

// --- Padre ↔ Hijo ---
r.post('/padre-hijo', async (req, res) => {
  if (!Persona) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { padreId, hijoId } = req.body || {};
  if (!isId(padreId) || !isId(hijoId)) return res.status(400).json({ error: 'IDs inválidos' });
  if (padreId === hijoId) return res.status(400).json({ error: 'No puede ser su propio padre/hijo' });
  const [padre, hijo] = await Promise.all([Persona.findById(padreId), Persona.findById(hijoId)]);
  if (!padre || !hijo) return res.status(404).json({ error: 'Persona no encontrada' });

  await Promise.all([
    addToSet(padreId, 'hijos', hijoId),
    addToSet(hijoId, 'padres', padreId),
  ]);
  res.json({ ok: true });
});

r.delete('/padre-hijo', async (req, res) => {
  if (!Persona) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { padreId, hijoId } = req.body || {};
  if (!isId(padreId) || !isId(hijoId)) return res.status(400).json({ error: 'IDs inválidos' });
  await Promise.all([
    pullFrom(padreId, 'hijos', hijoId),
    pullFrom(hijoId, 'padres', padreId),
  ]);
  res.json({ ok: true });
});

// --- Cónyuges (bidireccional) ---
r.post('/conyuges', async (req, res) => {
  if (!Persona) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { aId, bId } = req.body || {};
  if (!isId(aId) || !isId(bId)) return res.status(400).json({ error: 'IDs inválidos' });
  if (aId === bId) return res.status(400).json({ error: 'No puede ser cónyuge de sí mismo' });

  const [a, b] = await Promise.all([Persona.findById(aId), Persona.findById(bId)]);
  if (!a || !b) return res.status(404).json({ error: 'Persona no encontrada' });

  await Promise.all([
    addToSet(aId, 'conyuges', bId),
    addToSet(bId, 'conyuges', aId),
  ]);
  res.json({ ok: true });
});

r.delete('/conyuges', async (req, res) => {
  if (!Persona) return res.status(503).json({ error: 'Relaciones requieren MongoDB activo' });
  const { aId, bId } = req.body || {};
  if (!isId(aId) || !isId(bId)) return res.status(400).json({ error: 'IDs inválidos' });
  await Promise.all([
    pullFrom(aId, 'conyuges', bId),
    pullFrom(bId, 'conyuges', aId),
  ]);
  res.json({ ok: true });
});

export default r;
