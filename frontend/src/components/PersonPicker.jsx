import { useEffect, useState } from 'react';
import { Search, X, User } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function PersonPicker({
  title = 'Elegí una persona',
  excludeIds = [],
  onSelect,
  onCancel
}) {
  const [term, setTerm] = useState('');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const s = (term || '').trim();
    if (s.length < 2) {
      setItems([]);
      setErr('');
      return;
    }

    let alive = true;
    const timeoutId = setTimeout(async () => {
      setBusy(true);
      setErr('');

      try {
        // Llamada directa con solo el parámetro 'q' que es el que funciona
        const url = `${API}/api/personas?q=${encodeURIComponent(s)}&limit=50`;
        console.log('[PersonPicker] Buscando:', url);
        
        const resp = await fetch(url);
        
        if (!resp.ok) {
          throw new Error(`Error ${resp.status}: ${resp.statusText}`);
        }

        const json = await resp.json();
        const raw = Array.isArray(json) ? json : (json.items || json.data || []);
        
        if (!alive) return;

        // Filtrar excluidos
        const excl = new Set(excludeIds || []);
        const filtered = raw.filter((p) => p && p._id && !excl.has(p._id));

        console.log('[PersonPicker] Resultados:', {
          total: raw.length,
          filtrados: filtered.length,
          excluidos: excludeIds.length
        });

        setItems(filtered);
        
        if (filtered.length === 0 && raw.length === 0) {
          setErr('No se encontraron personas con ese nombre');
        }
      } catch (e) {
        console.error('[PersonPicker] Error:', e);
        if (alive) {
          setErr('Error al buscar personas. Verificá la conexión.');
          setItems([]);
        }
      } finally {
        if (alive) setBusy(false);
      }
    }, 300); // Debounce de 300ms

    return () => {
      alive = false;
      clearTimeout(timeoutId);
    };
  }, [term, excludeIds]);

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h4 style={styles.title}>{title}</h4>
          <button onClick={onCancel} style={styles.closeBtn} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Buscador */}
        <div style={styles.searchContainer}>
          <Search size={18} style={{ color: '#9ca3af', position: 'absolute', left: 12, top: 11 }} />
          <input
            autoFocus
            placeholder="Buscar por nombre (mín. 2 letras)…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Estados */}
        {busy && (
          <div style={styles.status}>
            <div style={styles.spinner} />
            Buscando…
          </div>
        )}
        
        {err && (
          <div style={styles.error}>
            ⚠️ {err}
          </div>
        )}
        
        {!busy && !err && term.length >= 2 && (
          <div style={styles.resultsCount}>
            {items.length} {items.length === 1 ? 'resultado' : 'resultados'}
          </div>
        )}

        {/* Lista de resultados */}
        <div style={styles.listContainer}>
          {items.length > 0 ? (
            <ul style={styles.list}>
              {items.map((p) => (
                <li key={p._id} style={styles.row}>
                  <div style={styles.personInfo}>
                    {p.avatarUrl ? (
                      <img 
                        src={p.avatarUrl} 
                        alt={p.nombre}
                        style={styles.avatar}
                      />
                    ) : (
                      <div style={styles.avatarPlaceholder}>
                        <User size={18} style={{ color: '#6b7280' }} />
                      </div>
                    )}
                    <div>
                      <div style={styles.personName}>{p.nombre}</div>
                      {(p.nacimiento || p.sexo) && (
                        <div style={styles.personMeta}>
                          {p.sexo && <span>{p.sexo === 'M' ? '♂' : p.sexo === 'F' ? '♀' : '·'}</span>}
                          {p.nacimiento && (
                            <span>
                              {new Date(p.nacimiento).getFullYear()}
                              {p.fallecimiento && ` – ${new Date(p.fallecimiento).getFullYear()}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => onSelect?.(p)} 
                    style={styles.selectBtn}
                  >
                    Elegir
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !busy && term.length >= 2 && (
              <div style={styles.empty}>
                <User size={48} style={{ color: '#d1d5db', marginBottom: 8 }} />
                <div style={{ color: '#6b7280', marginBottom: 4 }}>
                  {err ? 'No se pudo buscar' : 'No se encontraron personas'}
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>
                  Intentá con otro término de búsqueda
                </div>
              </div>
            )
          )}
          
          {term.length < 2 && !busy && (
            <div style={styles.empty}>
              <Search size={48} style={{ color: '#d1d5db', marginBottom: 8 }} />
              <div style={{ color: '#6b7280' }}>
                Escribí al menos 2 letras para buscar
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 1000,
    padding: 16
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(to right, #eff6ff, #e0e7ff)'
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#1f2937'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  searchContainer: {
    position: 'relative',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb'
  },
  input: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  status: {
    padding: '12px 20px',
    color: '#6b7280',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f9fafb'
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  error: {
    padding: '12px 20px',
    color: '#dc2626',
    fontSize: 14,
    background: '#fef2f2',
    borderLeft: '3px solid #dc2626'
  },
  resultsCount: {
    padding: '8px 20px',
    fontSize: 12,
    color: '#6b7280',
    background: '#f9fafb'
  },
  listContainer: {
    flex: 1,
    overflow: 'auto',
    minHeight: 200
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background 0.2s'
  },
  personInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  personName: {
    fontWeight: 500,
    color: '#1f2937',
    fontSize: 14,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  personMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    display: 'flex',
    gap: 8
  },
  selectBtn: {
    padding: '6px 16px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    textAlign: 'center'
  }
};

// Agregar estilos de animación
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  button:hover {
    opacity: 0.8;
  }
  
  li:hover {
    background: #f9fafb;
  }
`;
document.head.appendChild(styleSheet);