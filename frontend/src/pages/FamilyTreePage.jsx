// src/pages/FamilyTreePerson.jsx
import React, { useEffect, useState } from 'react';
import FamilyCanvas from '../components/FamilyCanvas';
import { personasApi } from '../personasApi';

export default function FamilyTreePage() {
  const [rootId, setRootId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem('family_currentRootId');
      if (stored) return stored;
    }
    // fallback por defecto
    return '68fd3387986ef0aa5542a352'; // Graciela Faller
  });

  const [searchTerm, setSearchTerm] = useState('Graciela Faller');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Estado de expansiones (UNA por lado)
  const [expandedAncestors, setExpandedAncestors] = useState({}); // { [grandparentId]: true }
  const [expandedDesc, setExpandedDesc] = useState({});           // { [childId]: true }

  // Opciones de vista
  const [viewMode, setViewMode] = useState('horizontal'); // 'horizontal' | 'vertical'
  const [spacing, setSpacing] = useState(1);              // 0.5 | 1 | 1.5

  // Buscar
  const handleSearch = async () => {
    const term = (searchTerm || '').trim();
    if (!term) return;
    setSearching(true);
    try {
      // tu PersonasApi: listar(search, page, limit, sort, order)
      const data = await personasApi.listar(term, 1, 10, 'nombre', 'asc');
      setSearchResults(data.items || []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // debounce
  useEffect(() => {
    const term = (searchTerm || '').trim();
    if (!term) return;
    const t = setTimeout(handleSearch, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // seleccionar raíz
  const selectPerson = async (persona) => {
    setSelectedPerson(persona);
    setRootId(persona._id);
    setPerson(persona); // cachearla (asumo que la tenés definida arriba)
    setSearchResults([]);
    // resetear expansiones
    setExpandedAncestors({});
    setExpandedDesc({});

    // 💾 guardar la raíz actual para futuros refresh
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('family_currentRootId', persona._id);
    }
  };

  // handlers de expansión (garantizan UNA abierta)
  const toggleAncestor = (grandparentId) => {
    setExpandedAncestors(prev => {
      const already = !!prev[grandparentId];
      return already ? {} : { [grandparentId]: true };
    });
  };

  const toggleDesc = (childId) => {
    setExpandedDesc(prev => {
      const already = !!prev[childId];
      return already ? {} : { [childId]: true };
    });
  };

  // Cargadores bajo demanda (el canvas los llama cuando necesita)
  const loaders = {
    getPerson,
    getParents,
    getChildren,
    getSpouses,
  };

  return (
    // 👇 en vez de padding + div suelto, hacemos un flex column a altura completa
    <div
      style={{
        height: '100%',          // ocupa todo el alto disponible (el de la vista menos navbar)
        display: 'flex',
        flexDirection: 'column',
        background: '#f3f4f6'
      }}
    >
      {/* PANEL SUPERIOR: buscador + controles de vista */}
      <div
        style={{
          padding: 16,
          flexShrink: 0,
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 12, fontSize: 20 }}>Árbol Genealógico</h1>

        {/* Buscador */}
        <div style={{ maxWidth: 520, display: 'grid', gap: 10, marginBottom: 12 }}>
          <label><strong>Buscar persona:</strong></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Ej: Graciela Faller"
              style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
            <button onClick={handleSearch} disabled={searching} style={btnPrimary}>
              {searching ? '...' : 'Buscar'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
              {searchResults.map(p => (
                <div
                  key={p._id}
                  onClick={() => selectPerson(p)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f6f6f6'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  style={{ padding: 10, borderBottom: '1px solid #eee', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, opacity: .75 }}>
                    {p.sexo} · {p.nacimiento?.slice?.(0, 10) || '—'} {p.fallecimiento ? `– ${p.fallecimiento.slice(0, 10)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPerson && (
            <div style={{ padding: 10, background: '#e7f3ff', border: '1px solid #007bff', borderRadius: 6 }}>
              <strong>Persona raíz:</strong> {selectedPerson.nombre}
              <div style={{ fontSize: 12, opacity: .75 }}>ID: {selectedPerson._id} · Sexo: {selectedPerson.sexo}</div>
            </div>
          )}
        </div>

        {/* Controles de vista */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>Vista:</span>
          <button onClick={() => setViewMode('horizontal')} style={toggleBtn(viewMode === 'horizontal')}>Horizontal</button>
          <button onClick={() => setViewMode('vertical')} style={toggleBtn(viewMode === 'vertical')}>Vertical</button>

          <span style={{ marginLeft: 16 }}>Espaciado:</span>
          {[0.5, 1, 1.5].map(v => (
            <button key={v} onClick={() => setSpacing(v)} style={toggleBtn(spacing === v)}>
              {v === 0.5 ? 'Compacto' : v === 1 ? 'Normal' : 'Espaciado'}
            </button>
          ))}
        </div>
      </div>

      {/* ZONA INFERIOR: lienzo ocupa TODO lo que queda */}
      <div
        style={{
          flex: 1,
          minHeight: 0,   // 👈 clave para que el canvas pueda crecer dentro sin forzar scroll
        }}
      >
        <FamilyCanvas
          rootId={rootId}
          viewMode={viewMode}
          spacing={spacing}
          expandedAncestors={expandedAncestors}
          expandedDesc={expandedDesc}
          onToggleAncestor={toggleAncestor}
          onToggleDesc={toggleDesc}
          loaders={loaders}
          height="100%"   // 👈 en vez de 680
        />
      </div>
    </div>
  );
}

const btnPrimary = {
  padding: '8px 14px',
  background: '#0b5ed7',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
};

const toggleBtn = (active) => ({
  padding: '6px 10px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: active ? '#28a745' : '#f8f9fa',
  color: active ? '#fff' : '#333',
  cursor: 'pointer'
});
