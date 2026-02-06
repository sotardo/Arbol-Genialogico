import { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Plus, TreePine, Eye, Pencil, Trash2, FileText } from 'lucide-react';
import { useTranslation } from "react-i18next";
// Componente de badge de calidad
const QualityBadge = ({ level }) => {
  const config = {
    Alto: 'bg-green-100 text-green-700 border-green-300',
    Medio: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    Bajo: 'bg-red-100 text-red-700 border-red-300'
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${config[level] || config.Medio}`}>
      {level}
    </span>
  );
};

// Sección colapsable
const CollapsibleSection = ({ title, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <h3 className="text-sm font-semibold text-gray-900">
          {title} {count !== undefined && `(${count})`}
        </h3>
        <span className="text-gray-500 text-lg">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="px-4 py-3 bg-gray-50">{children}</div>}
    </div>
  );
};

// Botón para agregar
const AddButton = ({ onClick, text }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors"
  >
    <Plus size={16} /> {text}
  </button>
);

// Formateo de fecha
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Navega al árbol con la persona como raíz
const gotoCanvas = (id) => {
  if (!id) return;
  const url = new URL(window.location.origin + '/arbol');
  url.searchParams.set('root', id);
  window.location.href = url.toString();
};

// Cuenta segura
const safeCount = (v) => (Array.isArray(v) ? v.length : typeof v === 'number' ? v : 0);

// Helpers para fuentes
const fileSrc = (u, toAPI) => (u ? (u.startsWith?.('http') ? u : toAPI(u)) : '');

const isPdfFuente = (fuente) => {
  const t = (fuente?.tipo || '').toLowerCase();
  const nombre = (fuente?.nombreArchivo || fuente?.titulo || '').toLowerCase();
  const ruta = (fuente?.ruta || '').toLowerCase();
  return t === 'pdf' || t === 'application/pdf' || nombre.endsWith('.pdf') || ruta.endsWith('.pdf');
};

const isImageFuente = (fuente) => {
  const t = (fuente?.tipo || '').toLowerCase();
  const nombre = (fuente?.nombreArchivo || fuente?.titulo || '').toLowerCase();
  const ruta = (fuente?.ruta || fuente?.url || '').toLowerCase();
  if (t === 'imagen' || t.startsWith('image/')) return true;
  const endsWithImg = (s) => /\.(jpg|jpeg|png|webp|gif)$/i.test(s);
  return endsWithImg(nombre) || endsWithImg(ruta);
};

export default function PersonDetailPanel({
  personaId,
  onClose,
  isOpen,
  personasApi,
  toAPI = (path) => path,
  onOpenPerfil,
  onVerArbol
}) {
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('persona');
  const [viewer, setViewer] = useState({ open: false, url: '', title: '', esImagen: false });

  // Estados para manejar la transición
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const panelRef = useRef(null);
const { t } = useTranslation('tree');
  // 👉 CLICK FUERA DEL PANEL → CERRAR
  const handleClickOutside = useCallback(
    (event) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target)) {
        onClose?.();
      }
    },
    [onClose]
  );

  // Manejar apertura/cierre con animación
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cargar datos de la persona
  useEffect(() => {
    if (!personaId || !personasApi) {
      setPersona(null);
      return;
    }
    const loadPersona = async () => {
      setLoading(true);
      try {
        const data = await personasApi.detalle(personaId);
        setPersona(data);
      } catch (err) {
        console.error('Error cargando persona:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPersona();
  }, [personaId, personasApi]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [shouldRender]);

  const handlePersonaTabClick = () => {
    if (onOpenPerfil && personaId) onOpenPerfil(personaId);
    else setActiveTab('persona');
  };

  const handleAgregarDetalle = () => {
    if (onOpenPerfil && personaId)
      onOpenPerfil(personaId, { tab: 'detalles', openModal: false });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('perfil', personaId);
      url.searchParams.set('tab', 'detalles');
      window.history.replaceState({}, '', url);
    } catch {}
    window.dispatchEvent(
      new CustomEvent('perfil:tab', {
        detail: { personaId, tab: 'detalles', openModal: false }
      })
    );
    onClose?.();
  };

  // Funciones para manejar fuentes
  const handleViewFuente = (fuente) => {
    const url = fileSrc(fuente.ruta || fuente.url, toAPI);
    if (!url) return;
    setViewer({
      open: true,
      url,
      title: fuente.titulo || fuente.nombreArchivo || 'Documento',
      esImagen: isImageFuente(fuente)
    });
  };

  const handleEditFuente = (fuente) => {
    if (onOpenPerfil && personaId) {
      onOpenPerfil(personaId, { tab: 'fuentes', editFuenteId: fuente._id });
    }
    onClose?.();
  };

  const handleDeleteFuente = async (fuenteId) => {
    if (!personasApi?.eliminarMedia) return;
    if (!window.confirm('¿Eliminar esta fuente?')) return;
    try {
      await personasApi.eliminarMedia(personaId, fuenteId);
      const data = await personasApi.detalle(personaId);
      setPersona(data);
    } catch (err) {
      console.error('Error eliminando fuente:', err);
    }
  };

  const handleAgregarFuente = () => {
    if (onOpenPerfil && personaId) {
      onOpenPerfil(personaId, { tab: 'fuentes' });
    }
    onClose?.();
  };

  const fuentes = Array.isArray(persona?.fuentes) ? persona.fuentes : [];
  const recuerdos = Array.isArray(persona?.recuerdos) ? persona.recuerdos : [];
  const hechos = Array.isArray(persona?.hechos) ? persona.hechos : [];
  const fotosGaleria = Array.isArray(persona?.galeria)
    ? persona.galeria
    : Array.isArray(persona?.fotosGaleria)
    ? persona.fotosGaleria
    : Array.isArray(persona?.fotos)
    ? persona.fotos
    : [];
    
  if (!shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-[250] overflow-hidden"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleClickOutside}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-500 ease-in-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Panel container */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            {/* Panel */}
            <div
              ref={panelRef}
              className={`pointer-events-auto relative w-screen max-w-md transition-transform duration-500 ease-in-out ${
                isAnimating ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Botón cerrar */}
              <div
                className={`absolute top-0 left-0 -ml-8 flex pt-4 pr-2 sm:-ml-10 sm:pr-4 transition-opacity duration-500 ease-in-out ${
                  isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="relative rounded-md text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <span className="absolute -inset-2.5" />
                  <span className="sr-only">Cerrar panel</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              {/* Contenido */}
              <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                {/* Línea verde superior */}
                <div className="h-1.5 bg-lime-600" />
                
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {persona?.avatarUrl ? (
                        <img
                          src={toAPI(persona.avatarUrl)}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <User size={24} className="text-green-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-gray-900 break-words">
                          {loading ? t('common:buttons.loading') : persona?.nombre || t('common:messages.noResults')}
                        </h2>
                        {persona?.codigo && (
                          <p className="text-base text-gray-500">{persona.codigo}</p>
                        )}
                      </div>
                    </div>

                    {persona?.calidad && (
                      <div className="flex items-center gap-3 mb-3">
<span className="text-sm text-gray-600">
  {t('panel.qualityScore')}:
</span>
                        <QualityBadge level={persona.calidad} />
                      </div>
                    )}

                    <div className="flex gap-4 text-sm text-gray-600">
                      <button className="text-green-600 hover:underline">
                        {t('panel.sources')} ({safeCount(fuentes)})
                      </button>
                      <button className="text-green-600 hover:underline">
                        {t('panel.gallery')} ({safeCount(fotosGaleria)})
                      </button>
                    </div>

                  </div>

                  {persona && (
                    <div className="px-4 pb-4 space-y-2 text-base">
                      {persona.nacimiento && (
                        <div>
<div className="font-semibold text-gray-900">
  {t('panel.birth')}
</div>
                          <div className="text-gray-600">
                            {formatDate(persona.nacimiento)}
                          </div>
                        </div>
                      )}
                      {persona.fallecimiento && (
                        <div>
<div className="font-semibold text-gray-900">
  {t('panel.death')}
</div>
                          <div className="text-gray-600">
                            {formatDate(persona.fallecimiento)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 border-t border-gray-200 px-4 py-3">
                    <button
                      onClick={handlePersonaTabClick}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-base font-medium bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors cursor-pointer"
                    >
                     <User color='green' size={16} /> {t('panel.profile')}
                    </button>
                    <button
                      onClick={() => {
                        if (onVerArbol && personaId) onVerArbol(personaId);
                        else gotoCanvas(personaId);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-base font-medium bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors cursor-pointer"
                    >
                      <TreePine color='green' size={16} /> {t('panel.tree')}
                    </button>
                  </div>
                </div>

                {/* Content sections */}
                <div className="pb-20">
                  {activeTab === 'persona' && persona && (
                    <>
                      <CollapsibleSection
                        title={t('panel.essentialInfo')}
                        defaultOpen
                      >
                        <div className="space-y-3 text-sm">
                          {persona.nacimiento && (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {t('panel.birth')}
                              </div>
                              <div className="text-gray-600">
                                {formatDate(persona.nacimiento)}
                              </div>
                            </div>
                          )}
                          {persona.bautismo ? (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {t('panel.baptism')}
                              </div>
                              <div className="text-gray-600">
                                {formatDate(persona.bautismo.fecha)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {t('panel.baptism')}
                              </div>
                              <AddButton
                                onClick={handleAgregarDetalle}
                               text={t('common:buttons.add')}
                              />
                            </div>
                          )}
                          {persona.matrimonio ? (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {t('panel.marriage')}
                              </div>
                              <div className="text-gray-600">
                                {formatDate(persona.matrimonio.fecha)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {t('panel.marriage')}
                              </div>
                              <AddButton
                                onClick={handleAgregarDetalle}
                                text={t('common:buttons.add')}
                              />
                            </div>
                          )}
                          {persona.entierro ? (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {t('panel.burial')}
                              </div>
                              <div className="text-gray-600">
                                {formatDate(persona.entierro.fecha)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {t('panel.burial')}
                              </div>
                              <AddButton
                                onClick={handleAgregarDetalle}
                                text="AGREGAR"
                              />
                            </div>
                          )}
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection
                        title={t('panel.sources')}
                        count={safeCount(fuentes)}
                      >
                        {safeCount(fuentes) === 0 ? (
                          <AddButton
                            onClick={handleAgregarFuente}
                            text={t('profile:sources.add')}
                          />
                        ) : (
                          <div className="space-y-3">
                            {fuentes.map((f, i) => {
                              const url = fileSrc(f.ruta || f.url, toAPI);
                              const esPdf = isPdfFuente(f);
                              const esImagen = isImageFuente(f);
                              
                              return (
                                <div
                                  key={f._id || i}
                                  className="bg-white rounded-lg p-3 border border-gray-200 flex items-start gap-3"
                                >
                                  {/* Thumbnail */}
                                  <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                                    {esImagen && url ? (
                                      <img
                                        src={url}
                                        alt={f.titulo}
                                        className="w-10 h-10 object-cover cursor-pointer hover:opacity-80"
                                        onClick={() => handleViewFuente(f)}
                                      />
                                    ) : (
                                      <FileText size={20} className={esPdf ? "text-red-500" : "text-gray-400"} />
                                    )}
                                  </div>
                                  
                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                                      {f.titulo || f.nombreArchivo || 'Sin título'}
                                    </h4>
                                    {f.fecha && (
                                      <p className="text-xs text-gray-500">{formatDate(f.fecha)}</p>
                                    )}
                                  </div>
                                  
                                  {/* Acciones */}
                                  <div className="flex items-center gap-1">
                                    {url && (
                                      <button
                                        onClick={() => handleViewFuente(f)}
                                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                        title="Ver"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleEditFuente(f)}
                                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Editar"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFuente(f._id)}
                                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Botón agregar al final */}
                            <AddButton
                              onClick={handleAgregarFuente}
                              text={t('profile:sources.add')}
                            />
                          </div>
                        )}
                      </CollapsibleSection>

                      <CollapsibleSection title={t('panel.lifeStory')}>
                        {persona.acercaDe ? (
                          <p className="text-sm text-gray-700">
                            {persona.acercaDe}
                          </p>
                        ) : (
                          <AddButton
                            onClick={handleAgregarDetalle}
                            text={t('common:buttons.add')}
                          />
                        )}
                      </CollapsibleSection>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visor de archivos */}
      {viewer.open && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setViewer({ open: false, url: '', title: '', esImagen: false })}
        >
          <div
            className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">{viewer.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={viewer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Abrir en pestaña
                </a>
                <button
                  onClick={() => setViewer({ open: false, url: '', title: '', esImagen: false })}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center">
              {viewer.esImagen ? (
                <img src={viewer.url} alt={viewer.title} className="max-w-full max-h-full object-contain" />
              ) : (
                <iframe title={viewer.title} src={viewer.url} className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}