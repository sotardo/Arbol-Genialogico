import { useEffect, useMemo, useState } from 'react';
import { personasApi } from './api';

export default function RelacionesView({ personaId, onPick }) {
  const [p, setP] = useState(null);
  const [mapa, setMapa] = useState({}); // id -> persona

  useEffect(() => {
    if (!personaId) return;
    const load = async () => {
      const det = await personasApi.detalle(personaId);
      setP(det);

      const ids = [
        ...(det.padres || []),
        ...(det.hijos || []),
        ...(det.conyuges || [])
      ];
      const unique = [...new Set(ids)];
      if (unique.length) {
        const bulk = await personasApi.bulk(unique);
        const m = {};
        (bulk.items || []).forEach(x => { m[x._id] = x; });
        setMapa(m);
      } else {
        setMapa({});
      }
    };
    load();
  }, [personaId]);

  const Item = ({ id, etiqueta }) => {
    const px = mapa[id];
    const label = px?.nombre || id;
    return (
      <li style={{display:'flex', justifyContent:'space-between', gap:8, padding:'4px 0'}}>
        <span>{label}</span>
        {onPick && <button onClick={()=>onPick(id)} title={`Ver perfil de ${label}`}>Ver</button>}
      </li>
    );
  };

  if (!p) return <div style={{opacity:.7}}>Cargando relaciones…</div>;

  return (
    <div style={{ display:'grid', gap:16 }}>
      <section>
        <h3 style={{margin:'8px 0'}}>Padres</h3>
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {(p.padres?.length ? p.padres : []).map(id => <Item key={id} id={id} etiqueta="Padre" />)}
          {(!p.padres || p.padres.length===0) && <li style={{opacity:.7}}>—</li>}
        </ul>
      </section>

      <section>
        <h3 style={{margin:'8px 0'}}>Hijos</h3>
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {(p.hijos?.length ? p.hijos : []).map(id => <Item key={id} id={id} etiqueta="Hijo" />)}
          {(!p.hijos || p.hijos.length===0) && <li style={{opacity:.7}}>—</li>}
        </ul>
      </section>

      <section>
        <h3 style={{margin:'8px 0'}}>Cónyuges</h3>
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {(p.conyuges?.length ? p.conyuges : []).map(id => <Item key={id} id={id} etiqueta="Cónyuge" />)}
          {(!p.conyuges || p.conyuges.length===0) && <li style={{opacity:.7}}>—</li>}
        </ul>
      </section>
    </div>
  );
}
