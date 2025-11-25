// src/components/CRUD.jsx
import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  User,
  X,
  Calendar,
  MapPin,
  Baby,
  Church,
  Heart,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { personasApi } from '../personasApi';
import { useToast } from './ToastProvider';
import ConfirmDialog from './ConfirmDialog';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API}${url}`;
};

const formatSexo = (sexo) => {
  const map = {
    M: 'Masculino',
    F: 'Femenino',
    X: 'Otro / No especifica',
  };
  return map[sexo] || '—';
};

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

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const ModernInput = ({ label, icon: Icon, error, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-gray-500" />}
      {label}
    </label>
    <input
      {...props}
      className={`w-full px-4 py-2.5 border ${
        error ? 'border-red-300' : 'border-gray-300'
      } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none bg-white`}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

const ModernSelect = ({
  label,
  icon: Icon,
  children,
  error,
  ...props
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-gray-500" />}
      {label}
    </label>
    <select
      {...props}
      className={`w-full px-4 py-2.5 border ${
        error ? 'border-red-300' : 'border-gray-300'
      } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none bg-white appearance-none cursor-pointer`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1.25rem',
        paddingRight: '2.5rem',
      }}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

const PersonaRow = ({ persona, onEdit, onDelete, onView }) => {
  const avatar = imgSrc(persona.avatarUrl);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={persona.nombre}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
          )}
          <div>
            <div
              className="font-semibold text-gray-900 cursor-pointer hover:text-green-600 transition-colors"
              onClick={() => onView(persona)}
            >
              {persona.nombre}
            </div>
            <div className="text-xs text-gray-500">
              {formatSexo(persona.sexo)}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {persona.nacimiento ? formatDate(persona.nacimiento) : '—'}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {persona.fallecimiento ? formatDate(persona.fallecimiento) : '—'}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(persona)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(persona)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ========= MODAL INTERNO (CRUD) =========
const PersonaModal = ({ persona, onClose, onSave }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
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
    // 🆕 Matrimonio
    matrimonioFecha: '',
    matrimonioLugar: '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (persona) {
      setFormData({
        nombre: persona.nombre || '',
        sexo: persona.sexo || '',
        nacimiento: toInputDate(persona.nacimiento),
        lugarNacimiento: persona.lugarNacimiento || '',
        fallecimiento: toInputDate(persona.fallecimiento),
        lugarFallecimiento: persona.lugarFallecimiento || '',
        causaFallecimiento: persona.causaFallecimiento || '',
        bautismoFecha: toInputDate(persona.bautismo?.fecha || null),
        bautismoLugar: persona.bautismo?.lugar || '',
        bautismoParroquia: persona.bautismo?.parroquia || '',
        bautismoNotas: persona.bautismo?.notas || '',
        // 🆕 Matrimonio desde backend
        matrimonioFecha: toInputDate(persona.matrimonio?.fecha || null),
        matrimonioLugar: persona.matrimonio?.lugar || '',
      });
    }
  }, [persona]);

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        sexo: formData.sexo || 'X',
        nacimiento: formData.nacimiento
          ? fromInputDate(formData.nacimiento)
          : null,
        lugarNacimiento: formData.lugarNacimiento || '',
        fallecimiento: formData.fallecimiento
          ? fromInputDate(formData.fallecimiento)
          : null,
        lugarFallecimiento: formData.lugarFallecimiento || '',
        causaFallecimiento: formData.causaFallecimiento || '',
        bautismo: {
          fecha: formData.bautismoFecha
            ? fromInputDate(formData.bautismoFecha)
            : null,
          lugar: formData.bautismoLugar || '',
          parroquia: formData.bautismoParroquia || '',
          notas: formData.bautismoNotas || '',
        },
        // 🆕 MATRIMONIO
        matrimonio: {
          fecha: formData.matrimonioFecha
            ? fromInputDate(formData.matrimonioFecha)
            : null,
          lugar: formData.matrimonioLugar || '',
        },
      };

      // Limpieza bautismo vacío
      if (
        !payload.bautismo.fecha &&
        !payload.bautismo.lugar &&
        !payload.bautismo.parroquia &&
        !payload.bautismo.notas
      ) {
        payload.bautismo = undefined;
      }

      // Limpieza matrimonio vacío
      if (!payload.matrimonio.fecha && !payload.matrimonio.lugar) {
        payload.matrimonio = undefined;
      }

      await onSave(payload);
      toast.success(
        persona ? 'Cambios guardados' : 'Persona creada',
      );
      onClose();
    } catch (error) {
      console.error('Error guardando persona:', error);
      toast.error(
        'Error al guardar la persona',
        String(error?.message || error),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
              {persona ? (
                <Edit2 size={20} className="text-white" />
              ) : (
                <Plus size={20} className="text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {persona ? 'Editar persona' : 'Nueva persona'}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {persona
                  ? 'Actualiza la información'
                  : 'Completa los datos básicos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            disabled={saving}
            type="button"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-8"
        >
          {/* Información básica */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <User size={18} className="text-green-600" />
              <h4 className="text-base font-semibold text-gray-900">
                Información básica
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <ModernInput
                  label="Nombre completo"
                  icon={User}
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nombre: e.target.value,
                    })
                  }
                  placeholder="Nombre completo"
                  error={errors.nombre}
                  required
                />
              </div>
              <div>
                <ModernSelect
                  label="Sexo"
                  icon={Users}
                  value={formData.sexo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sexo: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="X">Otro / No especifica</option>
                </ModernSelect>
              </div>
            </div>
          </div>

          {/* Nacimiento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Baby size={18} className="text-green-600" />
              <h4 className="text-base font-semibold text-gray-900">
                Nacimiento
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModernInput
                label="Fecha de nacimiento"
                icon={Calendar}
                type="date"
                value={formData.nacimiento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nacimiento: e.target.value,
                  })
                }
              />
              <ModernInput
                label="Lugar de nacimiento"
                icon={MapPin}
                value={formData.lugarNacimiento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lugarNacimiento: e.target.value,
                  })
                }
                placeholder="Ciudad, Provincia/Estado, País"
              />
            </div>
          </div>

          {/* Bautismo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Church size={18} className="text-purple-600" />
              <h4 className="text-base font-semibold text-gray-900">
                Bautismo
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModernInput
                label="Fecha de bautismo"
                icon={Calendar}
                type="date"
                value={formData.bautismoFecha}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bautismoFecha: e.target.value,
                  })
                }
              />
              <ModernInput
                label="Lugar de bautismo"
                icon={MapPin}
                value={formData.bautismoLugar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bautismoLugar: e.target.value,
                  })
                }
                placeholder="Ciudad, Provincia/Estado, País"
              />
              <ModernInput
                label="Parroquia"
                icon={Church}
                value={formData.bautismoParroquia}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bautismoParroquia: e.target.value,
                  })
                }
                placeholder="Nombre de la parroquia"
              />
              <ModernInput
                label="Notas adicionales"
                icon={FileText}
                value={formData.bautismoNotas}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bautismoNotas: e.target.value,
                  })
                }
                placeholder="Información adicional (opcional)"
              />
            </div>
          </div>

          {/* 🆕 Matrimonio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Heart size={18} className="text-pink-600" />
              <h4 className="text-base font-semibold text-gray-900">
                Matrimonio
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModernInput
                label="Fecha de matrimonio"
                icon={Calendar}
                type="date"
                value={formData.matrimonioFecha}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    matrimonioFecha: e.target.value,
                  })
                }
              />
              <ModernInput
                label="Lugar de matrimonio"
                icon={MapPin}
                value={formData.matrimonioLugar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    matrimonioLugar: e.target.value,
                  })
                }
                placeholder="Parroquia / ciudad / país"
              />
            </div>
          </div>

          {/* Defunción */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Heart size={18} className="text-red-600" />
              <h4 className="text-base font-semibold text-gray-900">
                Defunción
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModernInput
                label="Fecha de defunción"
                icon={Calendar}
                type="date"
                value={formData.fallecimiento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fallecimiento: e.target.value,
                  })
                }
              />
              <ModernInput
                label="Lugar de defunción"
                icon={MapPin}
                value={formData.lugarFallecimiento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lugarFallecimiento: e.target.value,
                  })
                }
                placeholder="Ciudad, Provincia/Estado, País"
              />
              <div className="md:col-span-2">
                <ModernInput
                  label="Causa de defunción"
                  icon={FileText}
                  value={formData.causaFallecimiento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      causaFallecimiento: e.target.value,
                    })
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Sparkles size={14} />
            {persona
              ? 'Los cambios se guardarán inmediatamente'
              : 'Podrás agregar más información después'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-medium cursor-pointer"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              disabled={saving}
              type="button"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : persona ? (
                'Guardar cambios'
              ) : (
                'Crear persona'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========= COMPONENTE PRINCIPAL CRUD =========
export default function CRUD({ onPersonaClick }) {
  const toast = useToast();
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);

  // Confirm dialog state
  const [confirm, setConfirm] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    tone: 'danger',
    confirmText: 'Sí, eliminar',
    cancelText: 'Cancelar',
  });

  const askConfirm = (opts) => {
    setConfirm({
      open: true,
      title: opts.title || 'Confirmar',
      message: opts.message || '¿Desea continuar?',
      tone: opts.tone || 'danger',
      confirmText: opts.confirmText || 'Confirmar',
      cancelText: opts.cancelText || 'Cancelar',
      onConfirm: () => {
        setConfirm((c) => ({ ...c, open: false }));
        opts.onConfirm?.();
      },
    });
  };

  const closeConfirm = () => setConfirm((c) => ({ ...c, open: false }));

  const cargarPersonas = async () => {
    setLoading(true);
    try {
      const data = await personasApi.listar(
        searchTerm,
        page,
        limit,
      );
      setPersonas(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error cargando personas:', error);
      toast.error(
        'No se pudieron cargar las personas',
        String(error?.message || error),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPersonas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleCreate = () => {
    setEditingPersona(null);
    setModalOpen(true);
  };

const handleEdit = async (persona) => {
  try {
    // 🔍 Traemos la persona COMPLETA (incluye matrimonio, bautismo, etc.)
    const full = await personasApi.detalle(persona._id);
    setEditingPersona(full);
    setModalOpen(true);
  } catch (error) {
    console.error('Error cargando detalle de persona:', error);
    toast.error(
      'No se pudo cargar el detalle de la persona',
      String(error?.message || error),
    );
  }
};


  const handleSave = async (payload) => {
    if (editingPersona) {
      await personasApi.editar(editingPersona._id, payload);
    } else {
      await personasApi.crear(payload);
    }
    await cargarPersonas();
  };

  const handleDelete = (persona) => {
    askConfirm({
      title: 'Eliminar persona',
      message: `¿Eliminar a "${persona.nombre}"? Esta acción no se puede deshacer.`,
      tone: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await personasApi.borrar(persona._id);
          await cargarPersonas();
          toast.success('Persona eliminada');
        } catch (error) {
          console.error('Error eliminando persona:', error);
          toast.error(
            'Error al eliminar la persona',
            String(error?.message || error),
          );
        }
      },
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Base de datos
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {total}{' '}
                {total === 1
                  ? 'persona registrada'
                  : 'personas registradas'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
          >
            <Plus size={20} />
            Agregar persona
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">
                Cargando personas...
              </p>
            </div>
          </div>
        ) : personas.length === 0 ? (
          <div className="text-center py-16">
            <Users
              size={64}
              className="mx-auto text-gray-300 mb-4"
            />
            <p className="text-gray-500 text-lg font-medium mb-2">
              {searchTerm
                ? 'No se encontraron resultados'
                : 'No hay personas registradas'}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {searchTerm
                ? 'Intenta con otro término de búsqueda'
                : 'Crea tu primera persona para comenzar'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreate}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Nueva persona
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nacimiento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fallecimiento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {personas.map((persona) => (
                  <PersonaRow
                    key={persona._id}
                    persona={persona}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={onPersonaClick}
                  />
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  Mostrando {(page - 1) * limit + 1} -{' '}
                  {Math.min(page * limit, total)} de {total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= page - 1 &&
                          pageNum <= page + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-3 py-1 rounded-lg transition-colors ${
                              page === pageNum
                                ? 'bg-green-600 text-white'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === page - 2 ||
                        pageNum === page + 2
                      ) {
                        return (
                          <span
                            key={pageNum}
                            className="px-2 text-gray-400"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <PersonaModal
          persona={editingPersona}
          onClose={() => {
            setModalOpen(false);
            setEditingPersona(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* ConfirmDialog global para eliminar */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        tone={confirm.tone}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
