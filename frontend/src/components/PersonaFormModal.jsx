// src/components/PersonaFormModal.jsx
import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  X,
  Calendar,
  MapPin,
  Baby,
  Church,
  Heart,
  FileText,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useToast } from './ToastProvider';

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
      } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white`}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

const ModernSelect = ({ label, icon: Icon, children, error, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-gray-500" />}
      {label}
    </label>
    <select
      {...props}
      className={`w-full px-4 py-2.5 border ${
        error ? 'border-red-300' : 'border-gray-300'
      } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white appearance-none cursor-pointer`}
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

const toInputDate = (d) => {
  if (!d) return '';
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (Number.isNaN(dt?.getTime?.())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fromInputDate = (s) => (s ? new Date(`${s}T00:00:00`) : null);

export default function PersonaFormModal({
  persona,
  onClose,
  onSave,
  relacionInicial = null,
}) {
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
        matrimonioFecha: toInputDate(persona.matrimonio?.fecha || null),
        matrimonioLugar: persona.matrimonio?.lugar || '',
      });
    } else if (relacionInicial?.sexoSugerido) {
      setFormData((prev) => ({
        ...prev,
        sexo: relacionInicial.sexoSugerido,
      }));
    }
  }, [persona, relacionInicial]);

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

      // Limpieza: si bautismo viene todo vacío, no lo mandamos
      if (
        !payload.bautismo.fecha &&
        !payload.bautismo.lugar &&
        !payload.bautismo.parroquia &&
        !payload.bautismo.notas
      ) {
        payload.bautismo = undefined;
      }

      // 🆕 Limpieza: si matrimonio viene vacío, tampoco lo mandamos
      if (!payload.matrimonio.fecha && !payload.matrimonio.lugar) {
        payload.matrimonio = undefined;
      }

      await onSave(payload, relacionInicial);

      const msgBase = persona ? 'Cambios guardados' : 'Persona creada';
      const msgRelacion = relacionInicial
        ? ` y vinculada como ${relacionInicial.tipo}`
        : '';

      toast.success(msgBase + msgRelacion);
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

  const getModalTitle = () => {
    if (persona) return 'Editar persona';
    if (!relacionInicial) return 'Nueva persona';

    const tipoLabel =
      {
        padre: 'padre',
        madre: 'madre',
        conyuge: 'cónyuge',
        hijo: 'hijo/a',
      }[relacionInicial.tipo] || 'familiar';

    return `Agregar ${tipoLabel}`;
  };

  const getModalSubtitle = () => {
    if (persona) return 'Actualiza la información';
    if (!relacionInicial) return 'Completa los datos básicos';
    return `Se vinculará automáticamente`;
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
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              {persona ? (
                <Edit2 size={20} className="text-white" />
              ) : (
                <Plus size={20} className="text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {getModalTitle()}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {getModalSubtitle()}
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
              <User size={18} className="text-blue-600" />
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
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Nombre completo"
                  error={errors.nombre}
                  required
                  autoFocus
                />
              </div>
              <div>
                <ModernSelect
                  label="Sexo"
                  icon={Users}
                  value={formData.sexo}
                  onChange={(e) =>
                    setFormData({ ...formData, sexo: e.target.value })
                  }
                  disabled={!!relacionInicial?.sexoSugerido}
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
            {relacionInicial
              ? `Se creará la relación automáticamente`
              : persona
              ? 'Los cambios se guardarán inmediatamente'
              : 'Podrás agregar más información después'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-medium"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={saving}
              type="button"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : relacionInicial ? (
                'Crear y vincular'
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
}
