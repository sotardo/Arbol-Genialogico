// src/components/RelacionesEditor.jsx
import { useEffect, useState } from 'react';
import { Users, UserPlus, Heart, Baby, User, Trash2 } from 'lucide-react';
import { personasApi, relacionesApi } from '../personasApi';
import PersonPicker from './PersonPicker';
import { useToast } from './ToastProvider';
import ConfirmDialog from './ConfirmDialog';
import { useTranslation } from 'react-i18next';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API}${url}`;
};

const extractIds = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && item._id) return item._id;
    return null;
  }).filter(Boolean);
};

const extractConyugesIds = (p) => {
  if (!p) return [];
  const out = [];
  if (Array.isArray(p.conyuges)) out.push(...extractIds(p.conyuges));
  if (p.conyuge && (p.conyuge._id || typeof p.conyuge === 'string')) {
    const id = typeof p.conyuge === 'string' ? p.conyuge : p.conyuge._id;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
};

const extractOtrosConyugesIds = (p) => {
  if (!p) return [];
  if (Array.isArray(p.otrosConyuges)) return extractIds(p.otrosConyuges);
  return [];
};

const logRel = {
  start(label, extra) { try { console.group(label); if (extra) console.log('ctx:', extra); } catch {} },
  end() { try { console.groupEnd(); } catch {} },
  line(...args) { try { console.log(...args); } catch {} },
};

const PersonaCard = ({ persona, relation, onRemove, disabled, t }) => {
  const [isHovered, setIsHovered] = useState(false);
  const avatar = imgSrc(persona.avatarUrl);

  return (
    <div
      className="persona-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: isHovered ? '#f9fafb' : '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{
        position: 'relative',
        flexShrink: 0,
        width: '48px',
        height: '48px',
      }}>
        {avatar ? (
          <img
            src={avatar}
            alt={persona.nombre}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <User size={24} style={{ color: '#fff' }} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          color: '#1f2937',
          fontSize: '15px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {persona.nombre}
        </div>
        {relation && (
          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '2px',
          }}>
            {relation}
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        disabled={disabled}
        style={{
          padding: '8px',
          background: isHovered ? '#fee2e2' : 'transparent',
          color: isHovered ? '#dc2626' : '#9ca3af',
          border: 'none',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={t('common:buttons.delete')}
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

const Section = ({ title, icon: Icon, children, count, onAdd, addLabel, disabled, color = '#3b82f6', t }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '16px',
      marginBottom: '16px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.3s ease',
    }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(to right, #f9fafb, #fff)',
          borderBottom: isOpen ? '1px solid #e5e7eb' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${color}15, ${color}25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {Icon && <Icon size={20} style={{ color }} />}
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1f2937',
            }}>
              {title}
            </h3>
            {count !== undefined && (
              <span style={{
                fontSize: '13px',
                color: '#6b7280',
                marginTop: '2px',
              }}>
                {count}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onAdd && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              disabled={disabled}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                background: color,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <UserPlus size={16} />
              {addLabel || t('common:buttons.add')}
            </button>
          )}
          <div style={{
            fontSize: '20px',
            color: '#9ca3af',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            ▼
          </div>
        </div>
      </div>

      <div style={{
        maxHeight: isOpen ? '2000px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default function RelacionesEditor({ personaId, onChanged }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const [persona, setPersona] = useState(null);
  const [relIds, setRelIds] = useState({ padres: [], hijos: [], conyuges: [], otrosConyuges: [] });
  const [mostrarPicker, setMostrarPicker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState({});
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null, tone: "danger" });

  const askConfirm = (opts) => setConfirm({
    open: true,
    title: opts.title || t('common:messages.confirmDelete'),
    message: opts.message || '',
    onConfirm: () => { setConfirm((c) => ({ ...c, open: false })); opts.onConfirm?.(); },
    tone: opts.tone || "danger"
  });

  const closeConfirm = () => setConfirm((c) => ({ ...c, open: false }));

  const cargar = async () => {
    if (!personaId) return;
    logRel.start('🟦 cargar() RelacionesEditor', { personaId });
    try {
      const p = await personasApi.detalle(personaId);

      logRel.line('↩️ detalle(persona):', p);
      logRel.line('   p.conyuges:', p?.conyuges);
      logRel.line('   p.conyuge (singular):', p?.conyuge);
      logRel.line('   p.otrosConyuges:', p?.otrosConyuges);

      const padres   = extractIds(p.padres);
      const hijos    = extractIds(p.hijos);
      const conyuges = extractConyugesIds(p);
      const otrosConyuges = extractOtrosConyugesIds(p);

      logRel.line('✅ IDs normalizados:', { padres, hijos, conyuges, otrosConyuges });

      setPersona(p);
      setRelIds({ padres, hijos, conyuges, otrosConyuges });
    } catch (error) {
      console.error('❌ Error cargando persona:', error);
      toast.error(t('common:messages.error'), String(error?.message || error));
    } finally {
      logRel.end();
    }
  };

  useEffect(() => { 
    cargar(); 
  }, [personaId]);

  useEffect(() => {
    const loadBulk = async () => {
      const ids = [...new Set([...relIds.padres, ...relIds.hijos, ...relIds.conyuges, ...relIds.otrosConyuges])];
      logRel.start('🟩 loadBulk()', { relIds, ids });
      if (ids.length === 0) {
        setCache({});
        logRel.line('⛔ Sin IDs, cache vacío.');
        logRel.end();
        return;
      }
      try {
        const out = await personasApi.bulk(ids);
        const arr = out.items || out || [];
        const map = {};
        for (const p of arr) {
          if (p && p._id) map[p._id] = p;
        }
        const missing = ids.filter(id => !map[id]);
        if (missing.length) {
          logRel.line('⚠️ IDs sin resolver en bulk:', missing);
        }
        setCache(map);
        logRel.line('✅ cache construido (keys):', Object.keys(map));
      } catch (error) {
        console.error('❌ Error cargando relaciones (bulk):', error);
        toast.error(t('common:messages.error'), String(error?.message || error));
      } finally {
        logRel.end();
      }
    };
    loadBulk();
  }, [relIds]);

  const personaOf = (id) => cache[id] || { _id: id, nombre: id };
  const excludeAll = () => Array.from(new Set([personaId, ...relIds.padres, ...relIds.hijos, ...relIds.conyuges, ...relIds.otrosConyuges]));

  const addPadre = async (target) => {
    setLoading(true);
    try {
      await relacionesApi.vincularPadreHijo(target._id, personaId);
      await cargar(); 
      onChanged?.();
      toast.success(t('common:messages.saved'));
    } catch (error) {
      console.error('Error agregando padre:', error);
      toast.error(t('common:messages.error'), String(error?.message || error));
    } finally { 
      setLoading(false); 
      setMostrarPicker(null); 
    }
  };

  const addHijo = async (target) => {
    setLoading(true);
    try {
      await relacionesApi.vincularPadreHijo(personaId, target._id);
      await cargar(); 
      onChanged?.();
      toast.success(t('common:messages.saved'));
    } catch (error) {
      console.error('Error agregando hijo:', error);
      toast.error(t('common:messages.error'), String(error?.message || error));
    } finally { 
      setLoading(false); 
      setMostrarPicker(null); 
    }
  };

  const addConyuge = async (target) => {
    setLoading(true);
    try {
      await relacionesApi.vincularConyuges(personaId, target._id);
      await cargar(); 
      onChanged?.();
      toast.success(t('common:messages.saved'));
    } catch (error) {
      console.error('Error agregando cónyuge:', error);
      toast.error(t('common:messages.error'), String(error?.message || error));
    } finally { 
      setLoading(false); 
      setMostrarPicker(null); 
    }
  };

  const addOtroConyuge = async (target) => {
    setLoading(true);
    try {
      await relacionesApi.vincularOtroConyuge(personaId, target._id);
      await cargar(); 
      onChanged?.();
      toast.success(t('common:messages.saved'));
    } catch (error) {
      console.error('Error agregando otro cónyuge:', error);
      toast.error(t('common:messages.error'), String(error?.message || error));
    } finally { 
      setLoading(false); 
      setMostrarPicker(null); 
    }
  };

  const marcarPreferido = async (conyugeId) => {
    setLoading(true);
    try {
      await personasApi.marcarConyugePreferido(personaId, conyugeId);
      await cargar();
      onChanged?.();
      toast.success(t('common:messages.saved'));
    } catch (error) {
      console.error('Error marcando preferido:', error);
      toast.error(t('common:messages.error'), String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const removePadre = (id) => {
    askConfirm({
      title: t('common:buttons.delete'),
      message: t('common:messages.confirmDelete'),
      onConfirm: async () => {
        setLoading(true);
        try {
          await relacionesApi.desvincularPadreHijo(id, personaId);
          await cargar(); 
          onChanged?.();
          toast.success(t('common:messages.saved'));
        } catch (error) {
          console.error('Error quitando padre:', error);
          toast.error(t('common:messages.error'), String(error?.message || error));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const removeHijo = (id) => {
    askConfirm({
      title: t('common:buttons.delete'),
      message: t('common:messages.confirmDelete'),
      onConfirm: async () => {
        setLoading(true);
        try {
          await relacionesApi.desvincularPadreHijo(personaId, id);
          await cargar(); 
          onChanged?.();
          toast.success(t('common:messages.saved'));
        } catch (error) {
          console.error('Error quitando hijo:', error);
          toast.error(t('common:messages.error'), String(error?.message || error));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const removeConyuge = (id) => {
    askConfirm({
      title: t('common:buttons.delete'),
      message: t('common:messages.confirmDelete'),
      onConfirm: async () => {
        setLoading(true);
        try {
          await relacionesApi.desvincularConyuges(personaId, id);
          await cargar(); 
          onChanged?.();
          toast.success(t('common:messages.saved'));
        } catch (error) {
          console.error('Error quitando cónyuge:', error);
          toast.error(t('common:messages.error'), String(error?.message || error));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const removeOtroConyuge = (id) => {
    askConfirm({
      title: t('common:buttons.delete'),
      message: t('common:messages.confirmDelete'),
      onConfirm: async () => {
        setLoading(true);
        try {
          await relacionesApi.desvincularOtroConyuge(personaId, id);
          await cargar(); 
          onChanged?.();
          toast.success(t('common:messages.saved'));
        } catch (error) {
          console.error('Error quitando otro cónyuge:', error);
          toast.error(t('common:messages.error'), String(error?.message || error));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (!persona) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ color: '#6b7280', fontSize: '14px' }}>{t('common:buttons.loading')}</div>
        </div>
      </div>
    );
  }

  const EmptyState = ({ icon: Icon, title, subtitle }) => (
    <div style={{
      textAlign: 'center',
      padding: '32px 16px',
      background: 'linear-gradient(to bottom, #f9fafb, #fff)',
      borderRadius: '12px',
      border: '2px dashed #e5e7eb',
    }}>
      <Icon size={48} style={{ color: '#d1d5db', marginBottom: '12px' }} />
      <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ color: '#9ca3af', fontSize: '13px' }}>
        {subtitle}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header con avatar */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <Users size={32} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              {t('relations.parents')}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '15px',
              color: 'rgba(255,255,255,0.9)',
            }}>
              <span style={{ fontWeight: 600 }}>{persona.nombre}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Secciones */}
      <Section
        title={t('relations.parents')}
        icon={Users}
        count={relIds.padres.length}
        onAdd={() => setMostrarPicker('padre')}
        addLabel={t('common:buttons.add')}
        disabled={loading}
        color="#8b5cf6"
        t={t}
      >
        {relIds.padres.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relIds.padres.map(id => (
              <PersonaCard
                key={`padre-${id}`}
                persona={personaOf(id)}
                relation={t('relations.father')}
                onRemove={() => removePadre(id)}
                disabled={loading}
                t={t}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={t('common:messages.noResults')}
            subtitle={t('common:buttons.add')}
          />
        )}
      </Section>

      <Section
        title={t('relations.children')}
        icon={Baby}
        count={relIds.hijos.length}
        onAdd={() => setMostrarPicker('hijo')}
        addLabel={t('common:buttons.add')}
        disabled={loading}
        color="#10b981"
        t={t}
      >
        {relIds.hijos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relIds.hijos.map(id => (
              <PersonaCard
                key={`hijo-${id}`}
                persona={personaOf(id)}
                relation={t('relations.children')}
                onRemove={() => removeHijo(id)}
                disabled={loading}
                t={t}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Baby}
            title={t('common:messages.noResults')}
            subtitle={t('common:buttons.add')}
          />
        )}
      </Section>

      <Section
        title={t('relations.spouse')}
        icon={Heart}
        count={relIds.conyuges.length}
        onAdd={() => setMostrarPicker('conyuge')}
        addLabel={t('common:buttons.add')}
        disabled={loading}
        color="#ec4899"
        t={t}
      >
        {relIds.conyuges.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relIds.conyuges.map(id => (
              <PersonaCard
                key={`cony-${id}`}
                persona={personaOf(id)}
                relation={t('relations.spouse')}
                onRemove={() => removeConyuge(id)}
                disabled={loading}
                t={t}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title={t('common:messages.noResults')}
            subtitle={t('common:buttons.add')}
          />
        )}
      </Section>

      <Section
        title={t('relations.spouses')}
        icon={Heart}
        count={relIds.otrosConyuges.length}
        onAdd={() => setMostrarPicker('otro-conyuge')}
        addLabel={t('common:buttons.add')}
        disabled={loading}
        color="#f59e0b"
        t={t}
      >
        {relIds.otrosConyuges.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relIds.otrosConyuges.map(id => (
              <PersonaCard
                key={`otro-cony-${id}`}
                persona={personaOf(id)}
                relation={t('relations.spouse')}
                onRemove={() => removeOtroConyuge(id)}
                disabled={loading}
                t={t}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title={t('common:messages.noResults')}
            subtitle={t('common:buttons.add')}
          />
        )}
      </Section>

      {/* Modal PersonPicker */}
      {mostrarPicker && (
        <PersonPicker
          title={
            mostrarPicker === 'padre' ? `${t('common:buttons.search')} ${t('relations.parents')}` :
            mostrarPicker === 'hijo' ? `${t('common:buttons.search')} ${t('relations.children')}` :
            mostrarPicker === 'conyuge' ? `${t('common:buttons.search')} ${t('relations.spouse')}` :
            `${t('common:buttons.search')} ${t('relations.spouses')}`
          }
          excludeIds={excludeAll()}
          onCancel={() => setMostrarPicker(null)}
          onSelect={(p) => {
            if (mostrarPicker === 'padre') return addPadre(p);
            if (mostrarPicker === 'hijo') return addHijo(p);
            if (mostrarPicker === 'conyuge') return addConyuge(p);
            return addOtroConyuge(p);
          }}
        />
      )}

      {/* ConfirmDialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
        tone={confirm.tone}
        confirmText={t('common:buttons.confirm')}
        cancelText={t('common:buttons.cancel')}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .persona-card:hover { border-color: #cbd5e1; }
        button:not(:disabled):hover { opacity: 0.9; transform: translateY(-1px); }
        button:not(:disabled):active { transform: translateY(0); }
      `}</style>
    </div>
  );
}