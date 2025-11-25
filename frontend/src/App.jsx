// src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import FamilyCanvas from './components/FamilyCanvas';
import { personasApi } from './personasApi';
import NavBar from './components/NavBar';
import PerfilPage from './components/PerfilPage';
import CRUD from './components/Crud';

function readRootFromURL() {
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('root');
    if (q) return q;
    if (window.location.hash) {
      const [k, v] = window.location.hash.replace(/^#/, '').split('=');
      if (k === 'root' && v) return v;
    }
  } catch {}
  return '';
}

function RootPicker({ onPick }) {
  const [val, setVal] = useState('');
  return (
    <div style={{
      height: '100%', display: 'grid', placeItems: 'center', color: '#475569'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Seleccioná persona raíz</h2>
        <p style={{ marginTop: 0 }}>Pegá un <code>_id</code> o agrega <code>?root=ID</code> en la URL.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="ID de persona (Mongo _id)"
            style={{
              width: 360, height: 36, borderRadius: 8, border: '1px solid #cbd5e1',
              padding: '0 10px', outline: 'none'
            }}
          />
          <button
            onClick={() => val && onPick(val)}
            style={{
              height: 36, borderRadius: 8, border: '1px solid #cbd5e1',
              padding: '0 14px', background: '#fff', cursor: 'pointer'
            }}
          >
            Usar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const headerH = 56;
  const canvasHeight = useMemo(() => `calc(100vh - ${headerH}px)`, [headerH]);

  // ✅ ID CORRECTO de Julia Graciela
  const FIXED_ROOT_ID = '68fd3387986ef0aa5542a352';

  const initialRoot = () => {
    try {
      const navEntry = performance.getEntriesByType('navigation')?.[0];
      const isReload =
        (navEntry && navEntry.type === 'reload') ||
        (performance.navigation && performance.navigation.type === 1);

      if (isReload) {
        const url = new URL(window.location.href);
        url.searchParams.set('root', FIXED_ROOT_ID);
        window.history.replaceState({}, '', url.toString());
        return FIXED_ROOT_ID;
      }

      const fromURL = readRootFromURL();
      if (fromURL) return fromURL;

      const url = new URL(window.location.href);
      url.searchParams.set('root', FIXED_ROOT_ID);
      window.history.replaceState({}, '', url.toString());
      return FIXED_ROOT_ID;
    } catch {
      return FIXED_ROOT_ID;
    }
  };

  const [rootId, setRootId] = useState(initialRoot);
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [errorRoot, setErrorRoot] = useState(null);

  // Determinar vista activa basada en la ruta
  const getActiveView = () => {
    if (location.pathname.startsWith('/perfil')) return 'arbol';
    if (location.pathname === '/personas') return 'personas';
    return 'arbol';
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (rootId) return;
      setLoadingRoot(true);
      setErrorRoot(null);
      try {
        const res = await personasApi.listar('', 1, 1, 'nombre', 'asc');
        const first = res?.items?.[0];
        if (!alive) return;
        if (first?._id) {
          setRootId(first._id);
          const url = new URL(window.location.href);
          url.searchParams.set('root', first._id);
          window.history.replaceState({}, '', url.toString());
        } else {
          setErrorRoot('No hay personas en la base. Crea una persona para iniciar el árbol.');
        }
      } catch (err) {
        if (alive) setErrorRoot(err?.message || 'No se pudo obtener la raíz');
      } finally {
        if (alive) setLoadingRoot(false);
      }
    })();
    return () => { alive = false; };
  }, [rootId]);

  const handleOpenPerfil = (id) => {
    if (!id) return;
    navigate(`/perfil/${id}`);
  };

  const handleNavigate = (view) => {
    if (view === 'arbol') {
      navigate('/');
    } else if (view === 'personas') {
      navigate('/personas');
    }
  };

  const handlePersonaClick = (persona) => {
    if (!persona?._id) return;
    // Ir al perfil de la persona
    navigate(`/perfil/${persona._id}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar 
        activeView={getActiveView()}
        onNavigate={handleNavigate}
      />

      <main style={{ minHeight: canvasHeight, position: 'relative' }}>
        <Routes>
          {/* Ruta del árbol */}
          <Route
            path="/"
            element={
              <>
                {loadingRoot && (
                  <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#475569' }}>
                    <div>
                      <h2 style={{ margin: 0, marginBottom: 8 }}>Cargando persona raíz…</h2>
                      <p style={{ marginTop: 0 }}>Buscando la primera persona disponible.</p>
                    </div>
                  </div>
                )}

                {!loadingRoot && errorRoot && (
                  <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#475569' }}>
                    <div style={{ textAlign: 'center' }}>
                      <h2 style={{ margin: 0, marginBottom: 8 }}>Sin datos</h2>
                      <p style={{ marginTop: 0, maxWidth: 520 }}>{errorRoot}</p>
                      <div style={{ marginTop: 16 }}>
                        <RootPicker onPick={(id) => setRootId(id)} />
                      </div>
                    </div>
                  </div>
                )}

                {!loadingRoot && !errorRoot && !rootId && (
                  <RootPicker onPick={(id) => {
                    setRootId(id);
                    const url = new URL(window.location.href);
                    url.searchParams.set('root', id);
                    window.history.replaceState({}, '', url.toString());
                  }} />
                )}

                {!loadingRoot && !errorRoot && rootId && (
                  <FamilyCanvas
                    rootId={rootId}
                    height={canvasHeight}
                    viewMode="horizontal"
                    spacing={1}
                    onPick={(id) => {
                      setRootId(id);
                      const url = new URL(window.location.href);
                      url.searchParams.set('root', id);
                      window.history.replaceState({}, '', url.toString());
                    }}
                    onOpenPerfil={handleOpenPerfil}
                  />
                )}
              </>
            }
          />

          {/* Ruta del perfil */}
          <Route path="/perfil/:id" element={<PerfilPage />} />

          {/* 🆕 Ruta del CRUD de personas */}
          <Route 
            path="/personas" 
            element={<CRUD onPersonaClick={handlePersonaClick} />} 
          />
        </Routes>
      </main>
    </div>
  );
}