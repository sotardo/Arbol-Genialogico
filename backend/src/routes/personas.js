// backend/src/routes/personas.js
import { Router } from 'express';
const r = Router();

// GET mínimo para probar
r.get('/', (_req, res) => {
  res.json({ ok: true, msg: 'GET personas OK' });
});

// POST mínimo para probar
r.post('/', (req, res) => {
  const body = req.body || {};
  if (!body.nombre?.trim()) {
    return res.status(400).json({ error: 'nombre requerido' });
  }
  // solo eco para validar que el POST funciona
  res.status(201).json({ ok: true, recibido: body });
});

export default r;
