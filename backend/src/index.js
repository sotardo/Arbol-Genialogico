import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// DB EN MEMORIA (se reinicia al apagar)
let personas = []; // { _id, nombre, sexo, nacimiento, fallecimiento, notas }
const oid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

// Health
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// CRUD Personas (EN MEMORIA)
app.get('/api/personas', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const items = q ? personas.filter(p => (p.nombre||'').toLowerCase().includes(q)) : personas;
  res.json({ items, total: items.length, page: 1, pages: 1 });
});

app.post('/api/personas', (req, res) => {
  const { nombre, sexo = 'X', nacimiento, fallecimiento, notas } = req.body || {};
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const nueva = { _id: oid(), nombre: String(nombre).trim(), sexo, nacimiento, fallecimiento, notas, createdAt: new Date(), updatedAt: new Date() };
  personas.unshift(nueva);
  res.status(201).json(nueva);
});

app.put('/api/personas/:id', (req, res) => {
  const { id } = req.params;
  const idx = personas.findIndex(p => p._id === id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' });
  personas[idx] = { ...personas[idx], ...req.body, updatedAt: new Date() };
  res.json(personas[idx]);
});

app.delete('/api/personas/:id', (req, res) => {
  const { id } = req.params;
  const idx = personas.findIndex(p => p._id === id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' });
  personas.splice(idx, 1);
  res.json({ ok: true });
});

// Arranque en 4000
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Backend mínimo en http://localhost:${PORT}`));
