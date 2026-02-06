// src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import FamilyCanvas from './components/FamilyCanvas';
import { personasApi } from './personasApi';
import NavBar from './components/NavBar';
import PerfilPage from './components/PerfilPage';
import CRUD from './components/Crud';
import InicioPage, { getRootFromStorage, saveRootToStorage } from './components/InicioPage';

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

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const headerH = 56;
  const canvasHeight = useMemo(() => `calc(100vh - ${headerH}px)`, [headerH]);

  // Fallback si no hay nada guardado
  const FALLBACK_ROOT_ID = '68fd3387986ef0aa5542a352';

  const initialRoot = () => {
    try {
      // 1. Primero intentar desde URL
      const fromURL = readRootFromURL();
      if (fromURL) {
        saveRootToStorage(fromURL);
        return fromURL;
      }
      
      // 2. Luego desde localStorage
      const fromStorage = getRootFromStorage();
      if (fromStorage) return fromStorage;
      
      // 3. Fallback
      saveRootToStorage(FALLBACK_ROOT_ID);
      return FALLBACK_ROOT_ID;
    } catch {
      return FALLBACK_ROOT_ID;
    }
  };

  const [rootId, setRootId] = useState(initialRoot);
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [errorRoot, setErrorRoot] = useState(null);

  // Sincronizar URL cuando cambia rootId
  useEffect(() => {
    if (rootId && location.pathname === '/arbol') {
      const url = new URL(window.location.href);
      url.searchParams.set('root', rootId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [rootId, location.pathname]);

  // Determinar vista activa basada en la ruta
  const getActiveView = () => {
    if (location.pathname === '/') return 'inicio';
    if (location.pathname === '/arbol') return 'arbol';
    if (location.pathname.startsWith('/perfil')) return 'arbol';
    if (location.pathname === '/personas') return 'personas';
    return 'inicio';
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
          saveRootToStorage(first._id);
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

  const handleSetRoot = (id) => {
    if (!id) return;
    setRootId(id);
    saveRootToStorage(id);
  };

  const handleOpenPerfil = (id) => {
    if (!id) return;
    navigate(`/perfil/${id}`);
  };

  const handleNavigate = (view) => {
    if (view === 'inicio') {
      navigate('/');
    } else if (view === 'arbol') {
      navigate('/arbol');
    } else if (view === 'personas') {
      navigate('/personas');
    }
  };

  const handleNavigateToArbol = (id) => {
    if (id) {
      setRootId(id);
      saveRootToStorage(id);
    }
    navigate('/arbol');
  };

  const handlePersonaClick = (persona) => {
    if (!persona?._id) return;
    navigate(`/perfil/${persona._id}`);
  };

  const toAPI = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar 
        activeView={getActiveView()}
        onNavigate={handleNavigate}
      />

      <main style={{ minHeight: canvasHeight, position: 'relative' }}>
        <Routes>
          {/* Ruta de Inicio */}
          <Route
            path="/"
            element={
              <InicioPage
                personasApi={personasApi}
                rootId={rootId}
                onSetRoot={handleSetRoot}
                onNavigateToArbol={handleNavigateToArbol}
                toAPI={toAPI}
              />
            }
          />

          {/* Ruta del árbol */}
          <Route
            path="/arbol"
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
                      <button
                        onClick={() => navigate('/')}
                        style={{
                          marginTop: 16,
                          padding: '8px 16px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer'
                        }}
                      >
                        Ir a Inicio
                      </button>
                    </div>
                  </div>
                )}

                {!loadingRoot && !errorRoot && rootId && (
                  <FamilyCanvas
                    rootId={rootId}
                    height={canvasHeight}
                    viewMode="horizontal"
                    spacing={1}
                    onPick={(id) => {
                      handleSetRoot(id);
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

          {/* Ruta del CRUD de personas */}
          <Route 
            path="/personas" 
            element={<CRUD onPersonaClick={handlePersonaClick} />} 
          />
        </Routes>
      </main>
    </div>
  );
}