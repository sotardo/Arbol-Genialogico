import { useEffect, useState } from 'react';
import { personasApi } from './api';

export default function App() {
  const [status, setStatus] = useState('Cargando...');
  const [lista, setLista] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ nombre: '', sexo: 'X', nacimiento: '', fallecimiento: '', notas: '' });
  const [editId, setEditId] = useState(null);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const cargar = async () => {
    const health = await fetch(`${API}/health`).then(r=>r.json()).catch(()=>({ok:false}));
    setStatus(health.ok ? 'OK' : 'Error');
    const data = await personasApi.listar(q);
    const items = Array.isArray(data) ? data : (data.items || []);
    setLista(items);
  };

  useEffect(() => { cargar(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      sexo: form.sexo,
      nacimiento: form.nacimiento || undefined,
      fallecimiento: form.fallecimiento || undefined,
      notas: form.notas || undefined
    };
    if (editId) await personasApi.editar(editId, payload);
    else await personasApi.crear(payload);
    setForm({ nombre: '', sexo: 'X', nacimiento: '', fallecimiento: '', notas: '' });
    setEditId(null);
    cargar();
  };

  const onEdit = (p) => {
    setEditId(p._id);
    setForm({
      nombre: p.nombre || '',
      sexo: p.sexo || 'X',
      nacimiento: p.nacimiento ? p.nacimiento.substring(0,10) : '',
      fallecimiento: p.fallecimiento ? p.fallecimiento.substring(0,10) : '',
      notas: p.notas || ''
    });
  };

  const onDelete = async (id) => {
    if (!confirm('¿Borrar esta persona?')) return;
    await personasApi.borrar(id);
    if (editId === id) setEditId(null);
    cargar();
  };

  const onBuscar = async () => { await cargar(); };

  return (
    <div style={{ fontFamily:'system-ui', padding:24, maxWidth:900, margin:'0 auto' }}>
      <h1>Árbol Genealógico (Frontend)</h1>
      <p>Backend: {status}</p>

      <h2 style={{marginTop:16}}>Personas</h2>
      <form onSubmit={onSubmit} style={{display:'grid', gridTemplateColumns:'1fr 120px 160px 160px', gap:8, alignItems:'center'}}>
        <input placeholder="Nombre *" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required />
        <select value={form.sexo} onChange={e=>setForm({...form, sexo:e.target.value})}>
          <option value="X">Sexo</option><option value="M">M</option><option value="F">F</option>
        </select>
        <input type="date" value={form.nacimiento} onChange={e=>setForm({...form, nacimiento:e.target.value})} />
        <input type="date" value={form.fallecimiento} onChange={e=>setForm({...form, fallecimiento:e.target.value})} />
        <textarea placeholder="Notas" value={form.notas} onChange={e=>setForm({...form, notas:e.target.value})}
          style={{gridColumn:'1 / -1'}} rows={2} />
        <div style={{gridColumn:'1 / -1', display:'flex', gap:8}}>
          <button type="submit">{editId ? 'Guardar cambios' : 'Crear persona'}</button>
          {editId && <button type="button" onClick={()=>{setEditId(null); setForm({ nombre:'', sexo:'X', nacimiento:'', fallecimiento:'', notas:'' });}}>Cancelar</button>}
        </div>
      </form>

      <div style={{marginTop:16}}>
        <input placeholder="Buscar por nombre..." value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={onBuscar} style={{marginLeft:8}}>Buscar</button>
      </div>

      <table style={{marginTop:12, width:'100%', borderCollapse:'collapse'}}>
        <thead>
          <tr><th style={{textAlign:'left'}}>Nombre</th><th>Sexo</th><th>Nac.</th><th>Fallec.</th><th></th></tr>
        </thead>
        <tbody>
          {lista.map(p => (
            <tr key={p._id} style={{borderTop:'1px solid #ddd'}}>
              <td>{p.nombre}</td>
              <td style={{textAlign:'center'}}>{p.sexo}</td>
              <td style={{textAlign:'center'}}>{p.nacimiento?.substring?.(0,10) || ''}</td>
              <td style={{textAlign:'center'}}>{p.fallecimiento?.substring?.(0,10) || ''}</td>
              <td style={{textAlign:'right'}}>
                <button onClick={()=>onEdit(p)} style={{marginRight:8}}>Editar</button>
                <button onClick={()=>onDelete(p._id)}>Borrar</button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && <tr><td colSpan={5} style={{padding:12, textAlign:'center', opacity:.7}}>Sin resultados</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
