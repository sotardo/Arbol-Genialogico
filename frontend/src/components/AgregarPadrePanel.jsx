import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Calendar, Church, FileText, Save, Heart, Baby } from 'lucide-react';
import { personasApi, relacionesApi } from '../personasApi';
import { useToast } from './ToastProvider';
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DateFieldWithCalendar } from "@/components/ui/DateFieldWithCalendar"; 

function formatDateToDisplay(dateStr) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateFromDisplay(str) {
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
}


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

const pairKey = (aId, bId) => {
  if (!aId && !bId) return null;
  if (aId && bId) {
    const [x, y] = [String(aId), String(bId)].sort();
    return `pair:${x}:${y}`;
  }
  return `single:${String(aId || bId)}`;
};
const DateInput = ({ value, onChange, placeholder = "Seleccionar fecha" }) => {
  const date = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
          {date ? (
            toInputDate(date)
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0" align="start">
        <CalendarPicker
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? toInputDate(d) : "")}
          captionLayout="dropdown"
          className="rounded-md border shadow-sm"
        />
      </PopoverContent>
    </Popover>
  );
};

export default function AgregarPadrePanel({
  open,
  onClose,
  targetPersonId,
  targetPersonName,
  tipo,
  hijosComunes = [],
  padreId = null,
  onSuccess,
  onExpandParents, // ✅ NUEVA PROP: callback para expandir la rama
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
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
  const [tempNacimiento, setTempNacimiento] = useState('');
  const [tempBautismo, setTempBautismo] = useState('');
const [tempMatrimonio, setTempMatrimonio] = useState('');
const [tempFallecimiento, setTempFallecimiento] = useState('');
  const isHijo = tipo === 'hijo';
  const isConyuge = tipo === 'conyuge';
  const sexo = (isConyuge || isHijo) ? formData.sexo : (tipo === 'padre' ? 'M' : 'F');
  const titulo = isHijo
    ? 'Agregar Hijo'
    : isConyuge
      ? 'Agregar Cónyuge'
      : tipo === 'padre'
        ? 'Agregar Padre'
        : 'Agregar Madre';

  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const panelRef = useRef(null);

  const handleClickOutside = useCallback(
    (event) => {
      if (!panelRef.current) return;
      if (event.target.closest('[data-popover-content]')) return;
      
      if (!panelRef.current.contains(event.target)) {
        onClose?.();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

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

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    if ((isConyuge || isHijo) && !formData.sexo) {
      newErrors.sexo = 'El sexo es obligatorio';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isHijo) {
        const payload = {
          nombre: formData.nombre.trim(),
          sexo: formData.sexo,
          nacimiento: formData.nacimiento ? fromInputDate(formData.nacimiento) : null,
          lugarNacimiento: formData.lugarNacimiento || '',
          fallecimiento: formData.fallecimiento ? fromInputDate(formData.fallecimiento) : null,
          lugarFallecimiento: formData.lugarFallecimiento || '',
          causaFallecimiento: formData.causaFallecimiento || '',
          bautismo: {
            fecha: formData.bautismoFecha ? fromInputDate(formData.bautismoFecha) : null,
            lugar: formData.bautismoLugar || '',
            parroquia: formData.bautismoParroquia || '',
            notas: formData.bautismoNotas || '',
          },
          matrimonio: {
            fecha: formData.matrimonioFecha ? fromInputDate(formData.matrimonioFecha) : null,
            lugar: formData.matrimonioLugar || '',
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
        if (!payload.matrimonio.fecha && !payload.matrimonio.lugar) {
          payload.matrimonio = undefined;
        }

        const nuevoHijo = await personasApi.crear(payload);
        await relacionesApi.vincularPadreHijo(targetPersonId, nuevoHijo._id);
        if (padreId) {
          await relacionesApi.vincularPadreHijo(padreId, nuevoHijo._id);
        }
        toast.success('Hijo/a agregado/a exitosamente');
      } else if (isConyuge) {
        const payload = {
          nombre: formData.nombre.trim(),
          sexo: formData.sexo,
          nacimiento: formData.nacimiento ? fromInputDate(formData.nacimiento) : null,
          lugarNacimiento: formData.lugarNacimiento || '',
          fallecimiento: formData.fallecimiento ? fromInputDate(formData.fallecimiento) : null,
          lugarFallecimiento: formData.lugarFallecimiento || '',
          causaFallecimiento: formData.causaFallecimiento || '',
          bautismo: {
            fecha: formData.bautismoFecha ? fromInputDate(formData.bautismoFecha) : null,
            lugar: formData.bautismoLugar || '',
            parroquia: formData.bautismoParroquia || '',
            notas: formData.bautismoNotas || '',
          },
          matrimonio: {
            fecha: formData.matrimonioFecha ? fromInputDate(formData.matrimonioFecha) : null,
            lugar: formData.matrimonioLugar || '',
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
        if (!payload.matrimonio.fecha && !payload.matrimonio.lugar) {
          payload.matrimonio = undefined;
        }

        const nuevoConyuge = await personasApi.crear(payload);
        await relacionesApi.vincularConyuges(targetPersonId, nuevoConyuge._id);

        if (hijosComunes && hijosComunes.length > 0) {
          for (const hijoId of hijosComunes) {
            try {
              await relacionesApi.vincularPadreHijo(nuevoConyuge._id, hijoId);
            } catch (err) {
              console.error(`Error vinculando hijo ${hijoId}:`, err);
            }
          }
        }
        toast.success('Cónyuge agregado/a exitosamente');
      } else {
        // ✅ AGREGAR PADRE O MADRE
        const personaActual = await personasApi.detalle(targetPersonId);
        const padresActuales = personaActual.padres || [];
        if (padresActuales.length > 0) {
          const padresData = await personasApi.bulk(padresActuales);
          const padres = padresData.items || padresData || [];
          const yaExistePadre = padres.some((p) => p.sexo === 'M');
          const yaExisteMadre = padres.some((p) => p.sexo === 'F');

          if (sexo === 'M' && yaExistePadre) {
            toast.warning('Ya existe un padre', 'Esta persona ya tiene un padre asignado');
            setSaving(false);
            return;
          }
          if (sexo === 'F' && yaExisteMadre) {
            toast.warning('Ya existe una madre', 'Esta persona ya tiene una madre asignada');
            setSaving(false);
            return;
          }
        }

        const payload = {
          nombre: formData.nombre.trim(),
          sexo,
          nacimiento: formData.nacimiento ? fromInputDate(formData.nacimiento) : null,
          lugarNacimiento: formData.lugarNacimiento || '',
          fallecimiento: formData.fallecimiento ? fromInputDate(formData.fallecimiento) : null,
          lugarFallecimiento: formData.lugarFallecimiento || '',
          causaFallecimiento: formData.causaFallecimiento || '',
          bautismo: {
            fecha: formData.bautismoFecha ? fromInputDate(formData.bautismoFecha) : null,
            lugar: formData.bautismoLugar || '',
            parroquia: formData.bautismoParroquia || '',
            notas: formData.bautismoNotas || '',
          },
          matrimonio: {
            fecha: formData.matrimonioFecha ? fromInputDate(formData.matrimonioFecha) : null,
            lugar: formData.matrimonioLugar || '',
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
        if (!payload.matrimonio.fecha && !payload.matrimonio.lugar) {
          payload.matrimonio = undefined;
        }

        const nuevaPersona = await personasApi.crear(payload);
        await relacionesApi.vincularPadreHijo(nuevaPersona._id, targetPersonId);
        
        // ✅ AUTO-EXPANDIR la rama donde se agregó el padre
        if (typeof onExpandParents === 'function') {
          // Obtener el cónyuge del padre recién creado (si existe)
          let conyugeId = null;
          if (personaActual.padres && personaActual.padres.length > 0) {
            // Si ya tiene un padre/madre, buscar el cónyuge
            const otroPadreId = personaActual.padres.find(id => id !== nuevaPersona._id);
            if (otroPadreId) {
              conyugeId = otroPadreId;
            }
          }
          
          const groupKey = pairKey(nuevaPersona._id, conyugeId);
          onExpandParents(groupKey);
        }
        
        toast.success(`${tipo === 'padre' ? 'Padre' : 'Madre'} agregado/a exitosamente`);
      }

      setFormData({
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

      onSuccess?.();

      if (typeof window !== 'undefined' && targetPersonId) {
        window.location.href = `/?root=${targetPersonId}`;
      }
    } catch (error) {
      console.error('Error agregando:', error);
      toast.error('Error al guardar', String(error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  if (!shouldRender) return null;

  return (
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
                  onClick={onClose}
                  className="relative rounded-md text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                  disabled={saving}
                >
                  <span className="absolute -inset-2.5" />
                  <span className="sr-only">Cerrar panel</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="flex h-full flex-col bg-white shadow-xl">
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 via-green-50 to-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md">
                      {isHijo ? (
                        <Baby size={20} className="text-white" />
                      ) : isConyuge ? (
                        <Heart size={20} className="text-white" />
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{titulo}</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Para: <span className="font-semibold">{targetPersonName}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <User size={18} className="text-green-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Información básica
                        </h4>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre completo *
                        </label>
                        <input
                          value={formData.nombre}
                          onChange={(e) =>
                            setFormData({ ...formData, nombre: e.target.value })
                          }
                          placeholder="Nombre completo"
                          className={`w-full px-4 py-2.5 border ${
                            errors.nombre ? 'border-red-300' : 'border-gray-300'
                          } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none`}
                          required
                        />
                        {errors.nombre && (
                          <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sexo {(isConyuge || isHijo) && '*'}
                        </label>
                        {isConyuge || isHijo ? (
                          <>
                            <select
                              value={formData.sexo}
                              onChange={(e) =>
                                setFormData({ ...formData, sexo: e.target.value })
                              }
                              className={`w-full px-4 py-2.5 border ${
                                errors.sexo ? 'border-red-300' : 'border-gray-300'
                              } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none bg-white`}
                              required
                            >
                              <option value="">Seleccionar...</option>
                              <option value="M">Masculino</option>
                              <option value="F">Femenino</option>
                              <option value="X">Otro / No especifica</option>
                            </select>
                            {errors.sexo && (
                              <p className="mt-1 text-sm text-red-600">{errors.sexo}</p>
                            )}
                          </>
                        ) : (
                          <input
                            value={sexo === 'M' ? 'Masculino' : 'Femenino'}
                            disabled
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <Calendar size={18} className="text-green-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Nacimiento
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Fecha de nacimiento
  </label>
  <Popover>
    <div className="relative">
      <input
        type="text"
        value={tempNacimiento || (formData.nacimiento ? formatDateToDisplay(formData.nacimiento) : '')}
        onChange={(e) => {
          let val = e.target.value.replace(/[^\d/]/g, '');
          if (val.length === 2 && !val.includes('/')) val = val + '/';
          else if (val.length === 5 && val.split('/').length === 2) val = val + '/';
          
          if (val.length <= 10) {
            setTempNacimiento(val);
            
            if (val.length === 10) {
              const parsed = parseDateFromDisplay(val);
              if (parsed) {
                setFormData({...formData, nacimiento: toInputDate(parsed)});
                setTempNacimiento('');
              }
            }
          }
        }}
        onBlur={() => {
          setTempNacimiento('');
        }}
        placeholder="DD/MM/AAAA"
        className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
        maxLength={10}
      />
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors"
        >
          <Calendar className="h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
    </div>
    
    <PopoverContent 
      className="w-auto p-0 bg-white" 
      align="start"
      data-popover-content="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CalendarPicker
        mode="single"
        selected={formData.nacimiento ? fromInputDate(formData.nacimiento) : undefined}
        onSelect={(d) => setFormData({...formData, nacimiento: d ? toInputDate(d) : ''})}
        fromYear={1900}
        toYear={2100}
        showInput={false}
      />
    </PopoverContent>
  </Popover>
</div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lugar de nacimiento
                          </label>
                          <input
                            value={formData.lugarNacimiento}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                lugarNacimiento: e.target.value,
                              })
                            }
                            placeholder="Ciudad, Provincia, País"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <Church size={18} className="text-green-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Bautismo
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Fecha de bautismo
  </label>
  <Popover>
    <div className="relative">
      <input
        type="text"
        value={tempBautismo || (formData.bautismoFecha ? formatDateToDisplay(formData.bautismoFecha) : '')}
        onChange={(e) => {
          let val = e.target.value.replace(/[^\d/]/g, '');
          if (val.length === 2 && !val.includes('/')) val = val + '/';
          else if (val.length === 5 && val.split('/').length === 2) val = val + '/';
          
          if (val.length <= 10) {
            setTempBautismo(val);
            
            if (val.length === 10) {
              const parsed = parseDateFromDisplay(val);
              if (parsed) {
                setFormData({...formData, bautismoFecha: toInputDate(parsed)});
                setTempBautismo('');
              }
            }
          }
        }}
        onBlur={() => setTempBautismo('')}
        placeholder="DD/MM/AAAA"
        className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
        maxLength={10}
      />
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors"
        >
          <Calendar className="h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
    </div>
    
    <PopoverContent 
      className="w-auto p-0 bg-white" 
      align="start"
      data-popover-content="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CalendarPicker
        mode="single"
        selected={formData.bautismoFecha ? fromInputDate(formData.bautismoFecha) : undefined}
        onSelect={(d) => setFormData({...formData, bautismoFecha: d ? toInputDate(d) : ''})}
        fromYear={1900}
        toYear={2100}
        showInput={false}
      />
    </PopoverContent>
  </Popover>
</div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lugar de bautismo
                          </label>
                          <input
                            value={formData.bautismoLugar}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bautismoLugar: e.target.value,
                              })
                            }
                            placeholder="Ciudad, Provincia, País"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Parroquia
                          </label>
                          <input
                            value={formData.bautismoParroquia}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bautismoParroquia: e.target.value,
                              })
                            }
                            placeholder="Nombre de la parroquia"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notas
                          </label>
                          <input
                            value={formData.bautismoNotas}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bautismoNotas: e.target.value,
                              })
                            }
                            placeholder="Información adicional"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <Heart size={18} className="text-green-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Matrimonio
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Fecha de matrimonio
  </label>
  <Popover>
    <div className="relative">
      <input
        type="text"
        value={tempMatrimonio || (formData.matrimonioFecha ? formatDateToDisplay(formData.matrimonioFecha) : '')}
        onChange={(e) => {
          let val = e.target.value.replace(/[^\d/]/g, '');
          if (val.length === 2 && !val.includes('/')) val = val + '/';
          else if (val.length === 5 && val.split('/').length === 2) val = val + '/';
          
          if (val.length <= 10) {
            setTempMatrimonio(val);
            
            if (val.length === 10) {
              const parsed = parseDateFromDisplay(val);
              if (parsed) {
                setFormData({...formData, matrimonioFecha: toInputDate(parsed)});
                setTempMatrimonio('');
              }
            }
          }
        }}
        onBlur={() => setTempMatrimonio('')}
        placeholder="DD/MM/AAAA"
        className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
        maxLength={10}
      />
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors"
        >
          <Calendar className="h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
    </div>
    
    <PopoverContent 
      className="w-auto p-0 bg-white" 
      align="start"
      data-popover-content="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CalendarPicker
        mode="single"
        selected={formData.matrimonioFecha ? fromInputDate(formData.matrimonioFecha) : undefined}
        onSelect={(d) => setFormData({...formData, matrimonioFecha: d ? toInputDate(d) : ''})}
        fromYear={1900}
        toYear={2100}
        showInput={false}
      />
    </PopoverContent>
  </Popover>
</div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lugar de matrimonio
                          </label>
                          <input
                            value={formData.matrimonioLugar}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                matrimonioLugar: e.target.value,
                              })
                            }
                            placeholder="Parroquia / ciudad / país"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <FileText size={18} className="text-green-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Defunción
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Fecha de defunción
  </label>
  <Popover>
    <div className="relative">
      <input
        type="text"
        value={tempFallecimiento || (formData.fallecimiento ? formatDateToDisplay(formData.fallecimiento) : '')}
        onChange={(e) => {
          let val = e.target.value.replace(/[^\d/]/g, '');
          if (val.length === 2 && !val.includes('/')) val = val + '/';
          else if (val.length === 5 && val.split('/').length === 2) val = val + '/';
          
          if (val.length <= 10) {
            setTempFallecimiento(val);
            
            if (val.length === 10) {
              const parsed = parseDateFromDisplay(val);
              if (parsed) {
                setFormData({...formData, fallecimiento: toInputDate(parsed)});
                setTempFallecimiento('');
              }
            }
          }
        }}
        onBlur={() => setTempFallecimiento('')}
        placeholder="DD/MM/AAAA"
        className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
        maxLength={10}
      />
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors"
        >
          <Calendar className="h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
    </div>
    
    <PopoverContent 
      className="w-auto p-0 bg-white" 
      align="start"
      data-popover-content="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CalendarPicker
        mode="single"
        selected={formData.fallecimiento ? fromInputDate(formData.fallecimiento) : undefined}
        onSelect={(d) => setFormData({...formData, fallecimiento: d ? toInputDate(d) : ''})}
        fromYear={1900}
        toYear={2100}
        showInput={false}
      />
    </PopoverContent>
  </Popover>
</div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lugar de defunción
                          </label>
                          <input
                            value={formData.lugarFallecimiento}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                lugarFallecimiento: e.target.value,
                              })
                            }
                            placeholder="Ciudad, Provincia, País"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Causa de defunción
                          </label>
                          <input
                            value={formData.causaFallecimiento}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                causaFallecimiento: e.target.value,
                              })
                            }
                            placeholder="Opcional"
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
                    onClick={onClose}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all font-medium"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={saving}
                    type="button"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Guardar y vincular
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
  );
}