import { useState, useEffect, useRef, useCallback } from 'react';
import { alertError, alertSuccess } from '../utils/alerts';
import {
  User,
  Calendar,
  MapPin,
  Users,
  Camera,
  FileText,
  Edit,
  X,
  Church,
  Heart,
  Baby,
  Sparkles,
  UserPlus,
  Save,
  Image,
  ClipboardList,
  FileSearch,
  TreePine,
} from 'lucide-react';
import { toAPI } from '../utils';
import Fuentes from './Fuentes';
import RelacionesEditor from './RelacionesEditor';
import Galeria from './Galeria';
import { useTranslation } from "react-i18next";

const imgSrc = (u) => (u ? (u.startsWith?.('http') ? u : toAPI(u)) : '');

const toInputDate = (d) => {
  if (!d) return '';
  const dt =
    typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (Number.isNaN(dt?.getTime?.())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fromInputDate = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const TabButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
      active
        ? 'border-emerald-600 text-emerald-600'
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }`}
  >
    {Icon && <Icon size={18} />}
    <span className="font-medium">{children}</span>
  </button>
);

const Section = ({ title, children, defaultOpen = true, count, actions }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="text-sm font-normal text-gray-500">
              ({count})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {actions}
          <span className="text-gray-500 text-xl">
            {isOpen ? '−' : '+'}
          </span>
        </div>
      </div>
      {isOpen && <div className="p-6">{children}</div>}
    </div>
  );
};

const PersonCard = ({ persona, relation, onClick }) => (
  <div
    onClick={() => onClick?.(persona)}
    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
  >
    {persona.avatarUrl ? (
      <img
        src={imgSrc(persona.avatarUrl)}
        alt={persona.nombre}
        className="w-12 h-12 rounded-full object-cover"
      />
    ) : (
      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
        <User size={24} className="text-gray-500" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="font-medium text-gray-900">{persona.nombre}</div>
      <div className="text-sm text-gray-500">
        {persona.nacimiento &&
          new Date(persona.nacimiento).getFullYear()}
        {persona.fallecimiento &&
          `–${new Date(persona.fallecimiento).getFullYear()}`}
      </div>
    </div>
    {relation && (
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
        {relation}
      </span>
    )}
  </div>
);

export default function Perfil({
  personaId,
  personasApi,
  onPersonaClick,
  onVerArbol,
}) {
  const { t } = useTranslation('profile');
  
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('acerca');

  // Función para formatear sexo con traducciones
  const formatSexo = (sexo) => {
    const map = {
      M: t('fields.male'),
      F: t('fields.female'),
      X: t('fields.unknown'),
    };
    return map[sexo] || '—';
  };

  useEffect(() => {
    const applyTabFromURL = () => {
      try {
        const url = new URL(window.location.href);
        const tab = url.searchParams.get('tab');
        const pid = url.searchParams.get('perfil');
        if (tab === 'detalles' && (!pid || pid === personaId)) {
          setActiveTab('detalles');
        }
      } catch {}
    };

    applyTabFromURL();

    const evtHandler = (e) => {
      const { personaId: targetId, tab, openModal } = e?.detail || {};
      if (!tab) return;
      if (!targetId || targetId === personaId) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('perfil:tab', evtHandler);
    window.addEventListener('popstate', applyTabFromURL);
    return () => {
      window.removeEventListener('perfil:tab', evtHandler);
      window.removeEventListener('popstate', applyTabFromURL);
    };
  }, [personaId]);

  const [mostrarRelaciones, setMostrarRelaciones] = useState(false);
  const [editingHistoria, setEditingHistoria] = useState(false);
  const [historiaText, setHistoriaText] = useState('');
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const fileRef = useRef(null);
  const [editNombre, setEditNombre] = useState(false);
  const [nombreDraft, setNombreDraft] = useState('');
  const [editDetallesOpen, setEditDetallesOpen] = useState(false);
  const [det, setDet] = useState({
    nombre: '',
    sexo: '',
    nacimiento: '',
    lugarNacimiento: '',
    fallecimiento: '',
    lugarFallecimiento: '',
    causaFallecimiento: '',
    bautismoFecha: '',
    bautismoLugar: '',
    bautismoParroquia: '',
    bautismoNotas: '',
    matrimonioFecha: '',
    matrimonioLugar: '',
  });
  const [savingDetalles, setSavingDetalles] = useState(false);

  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const panelRef = useRef(null);

  const handleClickOutside = useCallback(
    (event) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target)) {
        setEditDetallesOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    if (editDetallesOpen) {
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
  }, [editDetallesOpen]);

  useEffect(() => {
    if (!editDetallesOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setEditDetallesOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [editDetallesOpen]);

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

  const loadPersona = async () => {
    if (!personaId || !personasApi) return;

    setLoading(true);
    try {
      const data = await personasApi.detalle(personaId);
      setPersona(data);
      setHistoriaText(data.acercaDe || '');
    } catch (err) {
      console.error('Error cargando persona:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersona();
  }, [personaId, personasApi]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleSaveHistoria = async () => {
    try {
      await personasApi.editar(personaId, { acercaDe: historiaText });
      setPersona({ ...persona, acercaDe: historiaText });
      setEditingHistoria(false);
      alertSuccess(t('common:messages.saved'));
    } catch (err) {
      console.error('Error guardando historia:', err);
      alertError(t('common:messages.error'));
    }
  };

  const handleCancelHistoria = () => {
    setHistoriaText(persona.acercaDe || '');
    setEditingHistoria(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !personaId) return;
    setSubiendoAvatar(true);
    try {
      const resp = await personasApi.subirAvatar?.(personaId, file);
      const updated = resp?.persona || resp;
      if (updated?._id) setPersona(updated);
      alertSuccess(t('common:messages.saved'));
    } catch (err) {
      console.error('Error subiendo avatar:', err);
      alertError(t('common:messages.error'));
    } finally {
      setSubiendoAvatar(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const startEditNombre = () => {
    setNombreDraft(persona?.nombre || '');
    setEditNombre(true);
  };
  const cancelEditNombre = () => {
    setEditNombre(false);
    setNombreDraft('');
  };
  const saveNombre = async () => {
    if (!nombreDraft.trim()) return;
    try {
      await personasApi.editar(personaId, { nombre: nombreDraft.trim() });
      setPersona((prev) => ({ ...prev, nombre: nombreDraft.trim() }));
      setEditNombre(false);
    } catch (err) {
      console.error('Error guardando nombre:', err);
      alertError(t('common:messages.error'));
    }
  };

  const openEditDetalles = () => {
    const p = persona || {};
    setDet({
      nombre: p.nombre || '',
      sexo: p.sexo || '',
      nacimiento: toInputDate(p.nacimiento),
      lugarNacimiento: p.lugarNacimiento || '',
      fallecimiento: toInputDate(p.fallecimiento),
      lugarFallecimiento: p.lugarFallecimiento || '',
      causaFallecimiento: p.causaFallecimiento || '',
      bautismoFecha: toInputDate(p.bautismo?.fecha || null),
      bautismoLugar: p.bautismo?.lugar || '',
      bautismoParroquia: p.bautismo?.parroquia || '',
      bautismoNotas: p.bautismo?.notas || '',
      matrimonioFecha: toInputDate(p.matrimonio?.fecha || null),
      matrimonioLugar: p.matrimonio?.lugar || '',
    });
    setEditDetallesOpen(true);
  };

  const saveDetalles = async () => {
    setSavingDetalles(true);
    try {
      const payload = {
        nombre: det.nombre?.trim() || undefined,
        sexo: det.sexo || undefined,
        nacimiento: det.nacimiento ? fromInputDate(det.nacimiento) : null,
        lugarNacimiento: det.lugarNacimiento || '',
        fallecimiento: det.fallecimiento ? fromInputDate(det.fallecimiento) : null,
        lugarFallecimiento: det.lugarFallecimiento || '',
        causaFallecimiento: det.causaFallecimiento || '',
        bautismo: {
          fecha: det.bautismoFecha ? fromInputDate(det.bautismoFecha) : null,
          lugar: det.bautismoLugar || '',
          parroquia: det.bautismoParroquia || '',
          notas: det.bautismoNotas || '',
        },
      };

      if (
        !payload.bautismo.fecha &&
        !payload.bautismo.lugar &&
        !payload.bautismo.parroquia &&
        !payload.bautismo.notas
      ) {
        payload.bautismo = undefined;
      }

      if (det.matrimonioFecha || det.matrimonioLugar) {
        payload.matrimonio = {
          fecha: det.matrimonioFecha ? fromInputDate(det.matrimonioFecha) : null,
          lugar: det.matrimonioLugar || '',
        };
      } else {
        payload.matrimonio = undefined;
      }

      await personasApi.editar(personaId, payload);

      setPersona((prev) => ({
        ...prev,
        nombre: payload.nombre ?? prev.nombre,
        sexo: payload.sexo ?? prev.sexo,
        nacimiento: payload.nacimiento ?? prev.nacimiento,
        lugarNacimiento: payload.lugarNacimiento,
        fallecimiento: payload.fallecimiento ?? prev.fallecimiento,
        lugarFallecimiento: payload.lugarFallecimiento,
        causaFallecimiento: payload.causaFallecimiento,
        bautismo: payload.bautismo ?? prev.bautismo,
        matrimonio: payload.matrimonio ?? prev.matrimonio,
      }));
      setEditDetallesOpen(false);
      alertSuccess(t('common:messages.saved'));
    } catch (e) {
      console.error('Error guardando detalles:', e);
      alertError(t('common:messages.error'));
    } finally {
      setSavingDetalles(false);
    }
  };

  const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  const fuentesList = [
    ...toArray(persona?.fuentes),
    ...toArray(persona?.recuerdos)
  ];

  const fotosList = toArray(persona?.galeria);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common:buttons.loading')}</div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common:messages.noResults')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Modal editar historia */}
      {editingHistoria && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={handleCancelHistoria}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <FileText size={20} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('common:buttons.edit')} {t('tree:panel.lifeStory')}
                </h3>
              </div>
              <button
                onClick={handleCancelHistoria}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <textarea
                value={historiaText}
                onChange={(e) => setHistoriaText(e.target.value)}
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all outline-none"
                placeholder="..."
              />
              <div className="mt-2 text-xs text-gray-500 text-right">
                {historiaText.length} caracteres
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={handleCancelHistoria}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-medium"
              >
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleSaveHistoria}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-medium shadow-sm hover:shadow-md"
              >
                {t('common:buttons.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel deslizante para editar detalles */}
      {shouldRender && (
        <div
          className="fixed inset-0 z-[250] overflow-hidden"
          role="dialog"
          aria-modal="true"
          onMouseDown={handleClickOutside}
        >
          <div
            className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-500 ease-in-out ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
                <div
                  ref={panelRef}
                  className={`pointer-events-auto relative w-screen max-w-2xl transition-transform duration-500 ease-in-out ${
                    isAnimating ? 'translate-x-0' : 'translate-x-full'
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 -ml-8 flex pt-4 pr-2 sm:-ml-10 sm:pr-4 transition-opacity duration-500 ease-in-out ${
                      isAnimating ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEditDetallesOpen(false)}
                      className="relative rounded-md text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                      disabled={savingDetalles}
                    >
                      <span className="absolute -inset-2.5" />
                      <span className="sr-only">{t('common:buttons.close')}</span>
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex h-full flex-col bg-white shadow-xl">
                    <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 via-green-50 to-green-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md">
                          <Edit size={20} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {t('common:buttons.edit')} {t('tabs.info')}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                      <form className="space-y-6">
                        {/* Información básica */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <User size={18} className="text-green-600" />
                            <h4 className="text-base font-semibold text-gray-900">
                              {t('tabs.info')}
                            </h4>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('fields.name')}
                            </label>
                            <input
                              value={det.nombre}
                              onChange={(e) =>
                                setDet((s) => ({ ...s, nombre: e.target.value }))
                              }
                              placeholder={t('fields.name')}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('fields.sex')}
                            </label>
                            <select
                              value={det.sexo}
                              onChange={(e) =>
                                setDet((s) => ({ ...s, sexo: e.target.value }))
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none bg-white"
                            >
                              <option value="">...</option>
                              <option value="M">{t('fields.male')}</option>
                              <option value="F">{t('fields.female')}</option>
                              <option value="X">{t('fields.unknown')}</option>
                            </select>
                          </div>
                        </div>

                        {/* Nacimiento */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <Baby size={18} className="text-green-600" />
                            <h4 className="text-base font-semibold text-gray-900">
                              {t('fields.birth')}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('fields.birth')}
                              </label>
                              <input
                                type="date"
                                value={det.nacimiento}
                                onChange={(e) =>
                                  setDet((s) => ({ ...s, nacimiento: e.target.value }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('fields.birthPlace')}
                              </label>
                              <input
                                value={det.lugarNacimiento}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    lugarNacimiento: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bautismo */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <Church size={18} className="text-purple-600" />
                            <h4 className="text-base font-semibold text-gray-900">
                              {t('tree:panel.baptism')}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('tree:panel.baptism')}
                              </label>
                              <input
                                type="date"
                                value={det.bautismoFecha}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    bautismoFecha: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('fields.birthPlace')}
                              </label>
                              <input
                                value={det.bautismoLugar}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    bautismoLugar: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Parroquia
                              </label>
                              <input
                                value={det.bautismoParroquia}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    bautismoParroquia: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas
                              </label>
                              <input
                                value={det.bautismoNotas}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    bautismoNotas: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Matrimonio */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <Heart size={18} className="text-pink-600" />
                            <h4 className="text-base font-semibold text-gray-900">
                              {t('tree:panel.marriage')}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('tree:panel.marriage')}
                              </label>
                              <input
                                type="date"
                                value={det.matrimonioFecha}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    matrimonioFecha: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('fields.birthPlace')}
                              </label>
                              <input
                                value={det.matrimonioLugar}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    matrimonioLugar: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Defunción */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <FileText size={18} className="text-red-600" />
                            <h4 className="text-base font-semibold text-gray-900">
                              {t('fields.death')}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('fields.death')}
                              </label>
                              <input
                                type="date"
                                value={det.fallecimiento}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    fallecimiento: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('fields.deathPlace')}
                              </label>
                              <input
                                value={det.lugarFallecimiento}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    lugarFallecimiento: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Causa
                              </label>
                              <input
                                value={det.causaFallecimiento}
                                onChange={(e) =>
                                  setDet((s) => ({
                                    ...s,
                                    causaFallecimiento: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setEditDetallesOpen(false)}
                        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-medium"
                        disabled={savingDetalles}
                      >
                        {t('common:buttons.cancel')}
                      </button>
                      <button
                        onClick={saveDetalles}
                        className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        disabled={savingDetalles}
                        type="button"
                      >
                        {savingDetalles ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t('common:buttons.loading')}
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            {t('common:buttons.save')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal relaciones */}
      {mostrarRelaciones && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setMostrarRelaciones(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                  <UserPlus size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t('common:buttons.edit')} {t('relations.parents')}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setMostrarRelaciones(false)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <RelacionesEditor
                personaId={personaId}
                onChanged={() => {
                  loadPersona();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header principal */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="flex items-start gap-6 p-6">
          <div className="relative">
            {persona.avatarUrl ? (
              <img
                src={imgSrc(persona.avatarUrl)}
                alt={persona.nombre}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center border-4 border-white shadow-lg">
                <User size={48} className="text-white" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-2 shadow cursor-pointer hover:bg-gray-50">
              <Camera size={16} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={subiendoAvatar}
              />
            </label>
          </div>

          <div className="flex-1">
            <div className="mb-2">
              {!editNombre ? (
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {persona.nombre}
                  </h1>
                  <button
                    onClick={startEditNombre}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title={t('common:buttons.edit')}
                  >
                    <Edit size={18} className="text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={nombreDraft}
                    onChange={(e) => setNombreDraft(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={t('fields.name')}
                  />
                  <button
                    onClick={saveNombre}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    {t('common:buttons.save')}
                  </button>
                  <button
                    onClick={cancelEditNombre}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('common:buttons.cancel')}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 text-gray-600 mb-4">
              {persona.nacimiento && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{formatDate(persona.nacimiento)}</span>
                  {persona.fallecimiento && (
                    <span className="ml-1">
                      – {formatDate(persona.fallecimiento)}
                    </span>
                  )}
                </div>
              )}

              {persona.lugarNacimiento && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{persona.lugarNacimiento}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (onVerArbol) return onVerArbol(persona._id);
                  const url = new URL(window.location.origin + '/');
                  url.searchParams.set('root', persona._id);
                  window.location.href = url.toString();
                }}
              >
                <TreePine color='green' size={20} />
                {t('actions.viewTree')}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-t border-gray-200">
          <TabButton active={activeTab === 'acerca'} onClick={() => setActiveTab('acerca')} icon={User}>
            {t('tabs.info')}
          </TabButton>
          <TabButton active={activeTab === 'detalles'} onClick={() => setActiveTab('detalles')} icon={ClipboardList}>
            {t('tabs.details')}
          </TabButton>
          <TabButton active={activeTab === 'fuentes'} onClick={() => setActiveTab('fuentes')} icon={FileSearch}>
            {t('sources.title')} ({fuentesList.length})
          </TabButton>
          <TabButton active={activeTab === 'galeria'} onClick={() => setActiveTab('galeria')} icon={Image}>
            {t('gallery.title')} ({fotosList.length})
          </TabButton>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'acerca' && (
            <>
              <Section
                title={`${t('tree:panel.lifeStory')} - ${persona.nombre?.split(' ')[0] || ''}`}
                actions={
                  persona.acercaDe && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingHistoria(true);
                      }}
                      className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                    >
                      {t('common:buttons.edit')}
                    </button>
                  )
                }
              >
                {persona.acercaDe ? (
                  <div>
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {persona.acercaDe}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <FileText size={48} className="mx-auto text-gray-300" />
                    </div>
                    <p className="text-gray-500 mb-4">
                      {t('common:messages.noResults')}
                    </p>
                    <button
                      onClick={() => setEditingHistoria(true)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                      + {t('common:buttons.add')}
                    </button>
                  </div>
                )}
              </Section>

              <Section
                title={`${t('relations.parents')} & ${t('relations.siblings')}`}
                actions={
                  <button className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">
                    {t('common:buttons.view')}
                  </button>
                }
              >
                <div className="space-y-2">
                  {persona.padres?.map((padre, i) => (
                    <PersonCard
                      key={padre._id || i}
                      persona={padre}
                      relation={padre.sexo === 'F' ? t('relations.mother') : t('relations.father')}
                      onClick={onPersonaClick}
                    />
                  ))}

                  {persona.hermanos && persona.hermanos.length > 0 && (
                    <>
                      <div className="text-sm font-semibold text-gray-600 mt-4 mb-2">
                        {t('relations.siblings')} ({persona.hermanos.length})
                      </div>
                      {persona.hermanos.map((hermano, i) => (
                        <PersonCard
                          key={hermano._id || i}
                          persona={hermano}
                          onClick={onPersonaClick}
                        />
                      ))}
                    </>
                  )}
                </div>
              </Section>
            </>
          )}

          {activeTab === 'detalles' && (
            <>
              <Section
                title={t('tree:panel.essentialInfo')}
                actions={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDetalles();
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title={t('common:buttons.edit')}
                  >
                    <Edit size={18} className="text-gray-600" />
                  </button>
                }
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t('fields.name')}
                      </div>
                      <div className="text-gray-700">
                        {persona.nombre || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t('fields.sex')}
                      </div>
                      <div className="text-gray-700">
                        {formatSexo(persona.sexo)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t('fields.birth')}
                      </div>
                      <div className="text-gray-700">
                        {persona.nacimiento ? formatDate(persona.nacimiento) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t('fields.birthPlace')}
                      </div>
                      <div className="text-gray-700">
                        {persona.lugarNacimiento || '—'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {t('tree:panel.baptism')}
                    </div>
                    {persona.bautismo ? (
                      <div className="text-gray-700 space-y-1">
                        <div>
                          {persona.bautismo.fecha ? formatDate(persona.bautismo.fecha) : '—'}
                        </div>
                        {persona.bautismo.lugar && <div>{persona.bautismo.lugar}</div>}
                        {persona.bautismo.parroquia && (
                          <div>Parroquia: {persona.bautismo.parroquia}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500">—</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t('tree:panel.marriage')}
                      </div>
                      <div className="text-gray-700">
                        {persona.matrimonio?.fecha ? formatDate(persona.matrimonio.fecha) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Lugar
                      </div>
                      <div className="text-gray-700">
                        {persona.matrimonio?.lugar || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t('fields.death')}
                      </div>
                      <div className="text-gray-700">
                        {persona.fallecimiento ? formatDate(persona.fallecimiento) : '—'}
                      </div>
                      <div className="text-gray-700">
                        {persona.lugarFallecimiento || ''}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t('tree:panel.burial')}
                      </div>
                      {persona.entierro ? (
                        <>
                          <div className="text-gray-700">
                            {formatDate(persona.entierro.fecha)}
                          </div>
                          <div className="text-gray-700">
                            {persona.entierro.lugar}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-500">—</div>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              <Section
                title={`${t('relations.parents')} & ${t('relations.siblings')}`}
                actions={
                  <button className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">
                    {t('common:buttons.view')}
                  </button>
                }
              >
                <div className="space-y-2">
                  {persona.padres?.map((padre, i) => (
                    <PersonCard
                      key={padre._id || i}
                      persona={padre}
                      relation={padre.sexo === 'F' ? t('relations.mother') : t('relations.father')}
                      onClick={onPersonaClick}
                    />
                  ))}

                  {persona.hermanos && persona.hermanos.length > 0 && (
                    <>
                      <div className="text-sm font-semibold text-gray-600 mt-4 mb-2">
                        {t('relations.siblings')} ({persona.hermanos.length})
                      </div>
                      {persona.hermanos.map((hermano, i) => (
                        <PersonCard
                          key={hermano._id || i}
                          persona={hermano}
                          onClick={onPersonaClick}
                        />
                      ))}
                    </>
                  )}
                </div>
              </Section>
            </>
          )}

          {activeTab === 'fuentes' && (
            <Section title={t('sources.title')} count={fuentesList.length}>
              <Fuentes
                personaId={personaId}
                fuentes={fuentesList}
                onFuenteAdded={loadPersona}
                personasApi={personasApi}
              />
            </Section>
          )}

          {activeTab === 'galeria' && (
            <Section title={t('gallery.title')} count={fotosList.length}>
              <Galeria
                personaId={personaId}
                fotos={fotosList}
                onFotoAdded={loadPersona}
                personasApi={personasApi}
              />
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Section title={`${t('relations.spouse')} & ${t('relations.children')}`}>
            {persona.conyuge && (
              <div className="mb-4">
                <PersonCard
                  persona={persona.conyuge}
                  relation={t('relations.spouse')}
                  onClick={onPersonaClick}
                />
              </div>
            )}

            {persona.otrosConyuges && persona.otrosConyuges.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Heart size={16} className="text-amber-500" />
                  {t('relations.spouses')} ({persona.otrosConyuges.length})
                </div>
                <div className="space-y-2">
                  {persona.otrosConyuges.map((otroConyuge, i) => (
                    <PersonCard
                      key={otroConyuge._id || i}
                      persona={otroConyuge}
                      relation={t('relations.spouse')}
                      onClick={onPersonaClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {persona.hijos && persona.hijos.length > 0 && (
              <>
                <div className="text-sm font-semibold text-gray-600 mb-2">
                  {t('relations.children')} ({persona.hijos.length})
                </div>
                <div className="space-y-2">
                  {persona.hijos.map((hijo, i) => (
                    <PersonCard
                      key={hijo._id || i}
                      persona={hijo}
                      onClick={onPersonaClick}
                    />
                  ))}
                </div>
              </>
            )}

            <button className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-emerald-600 hover:bg-gray-50 transition-colors">
              {t('common:buttons.view')}
            </button>

            <button
              onClick={() => setMostrarRelaciones(true)}
              className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              {t('common:buttons.edit')} {t('relations.parents')}
            </button>
          </Section>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}