// src/components/Fuentes.jsx
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, Upload, Calendar, Trash2, Eye, Pencil } from 'lucide-react';
import { toAPI } from '../utils';
import { alertError, alertSuccess } from '../utils/alerts';
import * as Alerts from '../utils/alerts';

const formatFechaDMY = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const fileSrc = (u) => (u ? (u.startsWith?.('http') ? u : toAPI(u)) : '');

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
  const endsWithImg = (s) =>
    s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.png') || s.endsWith('.webp') || s.endsWith('.gif');
  return endsWithImg(nombre) || endsWithImg(ruta);
};

const getImageType = (fuente) => {
  const ruta = (fuente?.ruta || fuente?.url || '').toLowerCase();
  const nombre = (fuente?.nombreArchivo || fuente?.titulo || '').toLowerCase();
  if (ruta.endsWith('.jpg') || nombre.endsWith('.jpg')) return 'JPG';
  if (ruta.endsWith('.jpeg') || nombre.endsWith('.jpeg')) return 'JPEG';
  if (ruta.endsWith('.png') || nombre.endsWith('.png')) return 'PNG';
  if (ruta.endsWith('.webp') || nombre.endsWith('.webp')) return 'WEBP';
  if (ruta.endsWith('.gif') || nombre.endsWith('.gif')) return 'GIF';
  return 'IMG';
};

// Variantes para animación escalonada
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

// Modal visor PDF/imagen
const PdfViewerModal = ({ open, onClose, url, title, esImagen }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title || 'Documento'}</h3>
          <div className="flex items-center gap-2">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-white">
                Abrir en pestaña
              </a>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-200">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center">
          {esImagen ? (
            <img
              src={url}
              alt={title}
              className="max-w-full max-h-full object-contain"
              style={{ cursor: 'zoom-in' }}
              onClick={(e) => {
                e.target.style.transform = e.target.style.transform === 'scale(2)' ? 'scale(1)' : 'scale(2)';
                e.target.style.cursor = e.target.style.transform === 'scale(2)' ? 'zoom-out' : 'zoom-in';
              }}
            />
          ) : (
            <iframe title={title || 'PDF'} src={url} className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  );
};

// FuenteCard compacta
const FuenteCard = ({ fuente, onDelete, onView, onEdit }) => {
  const url = fileSrc(fuente.ruta || fuente.url);
  const esPdf = isPdfFuente(fuente);
  const esImagen = isImageFuente(fuente);
  const tipoImagen = esImagen ? getImageType(fuente) : null;

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
        {esPdf && !esImagen && <FileText size={22} className="text-green-600" />}
        {esImagen && url && (
          <img src={url} alt={fuente.titulo} className="w-10 h-10 object-cover rounded-lg cursor-pointer hover:opacity-80" onClick={() => onView?.(fuente)} />
        )}
        {!esPdf && !esImagen && <FileText size={22} className="text-gray-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{fuente.titulo || fuente.nombreArchivo || 'Sin título'}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          {fuente.fecha && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatFechaDMY(fuente.fecha)}
            </span>
          )}
          {esPdf && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-medium">PDF</span>}
          {esImagen && tipoImagen && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-medium">{tipoImagen}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {url && (
          <button onClick={() => onView?.(fuente)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Ver">
            <Eye size={16} />
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(fuente)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Editar">
            <Pencil size={16} />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(fuente._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// Componente principal
export default function Fuentes({ personaId, fuentes = [], onFuenteAdded, personasApi }) {
  const fuentesArr = Array.isArray(fuentes) ? fuentes : fuentes ? [fuentes] : [];

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewer, setViewer] = useState({ open: false, url: '', title: '', esImagen: false });
  const [formData, setFormData] = useState({ titulo: '', descripcion: '', fecha: '' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const allowedMimePrefixes = ['application/pdf', 'image/'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const validFiles = files.filter((f) => {
      const type = f.type.toLowerCase();
      const name = f.name.toLowerCase();
      return allowedMimePrefixes.some((pref) => type.startsWith(pref)) || allowedExtensions.some((ext) => name.endsWith(ext));
    });
    if (validFiles.length !== files.length) alertError('Solo PDF o imágenes');
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setFormData({ titulo: '', descripcion: '', fecha: '' });
    setSelectedFiles([]);
    setUploadProgress([]);
    setIsEditing(false);
    setEditId(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowModal(false);
  };

  const handleEdit = (fuente) => {
    setIsEditing(true);
    setEditId(fuente._id);
    setFormData({
      titulo: fuente.titulo || '',
      descripcion: fuente.descripcion || '',
      fecha: fuente.fecha ? String(fuente.fecha).split('T')[0] : '',
    });
    setSelectedFiles([]);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (isEditing && editId) {
        const payload = { titulo: formData.titulo, descripcion: formData.descripcion, fecha: formData.fecha };
        if (selectedFiles.length > 0) payload.file = selectedFiles[0];
        await personasApi.editarMedia(personaId, editId, payload);
        if (onFuenteAdded) await onFuenteAdded();
        alertSuccess('Fuente actualizada');
        resetForm();
        setShowModal(false);
        return;
      }

      if (selectedFiles.length === 0) {
        alertError('Selecciona al menos un archivo');
        return;
      }

      setUploadProgress(new Array(selectedFiles.length).fill(0));
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const esPdf = file.type.toLowerCase() === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        setUploadProgress((prev) => { const c = [...prev]; c[i] = 40; return c; });
        await personasApi.subirMedia?.(personaId, file, {
          tipo: esPdf ? 'pdf' : 'imagen',
          titulo: formData.titulo || file.name,
          descripcion: formData.descripcion,
          fecha: formData.fecha || undefined,
        });
        setUploadProgress((prev) => { const c = [...prev]; c[i] = 100; return c; });
      }
      if (onFuenteAdded) await onFuenteAdded();
      setShowModal(false);
      resetForm();
      alertSuccess(`${selectedFiles.length} fuente(s) agregada(s)`);
    } catch (err) {
      console.error(err);
      alertError('Error al guardar');
    } finally {
      setUploading(false);
    }
  };

  const handleView = (fuente) => {
    const url = fileSrc(fuente.ruta || fuente.url);
    if (url) setViewer({ open: true, url, title: fuente.titulo || fuente.nombreArchivo || 'Documento', esImagen: isImageFuente(fuente) });
  };

  const handleDelete = async (fuenteId) => {
    let ok = false;
    try {
      if (typeof Alerts.alertConfirm === 'function') {
        ok = await Alerts.alertConfirm({ title: 'Eliminar fuente', text: '¿Estás seguro?', confirmText: 'Eliminar', cancelText: 'Cancelar', icon: 'warning', confirmColor: 'red' });
      } else {
        ok = window.confirm('¿Eliminar?');
      }
    } catch { ok = window.confirm('¿Eliminar?'); }
    if (!ok) return;
    try {
      await personasApi.eliminarMedia?.(personaId, fuenteId);
      if (onFuenteAdded) await onFuenteAdded();
      alertSuccess('Fuente eliminada');
    } catch (err) {
      console.error(err);
      alertError('Error eliminando');
    }
  };

  return (
    <div className="space-y-3">
      {fuentesArr.length > 0 ? (
        <motion.div 
          className="space-y-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={fuentesArr.length} // Re-animar cuando cambia la cantidad
        >
          {fuentesArr.map((fuente, index) => (
            <motion.div
              key={fuente._id || fuente.ruta || index}
              variants={itemVariants}
              layout
            >
              <FuenteCard 
                fuente={fuente} 
                onDelete={handleDelete} 
                onView={handleView} 
                onEdit={handleEdit} 
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <FileText size={36} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 font-medium">No hay fuentes</p>
          <p className="text-xs text-gray-500">Agrega documentos o imágenes</p>
        </motion.div>
      )}

      <motion.button
        onClick={() => { resetForm(); setShowModal(true); }}
        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-green-600 hover:bg-green-50 hover:border-green-400 transition-all text-sm font-medium flex items-center justify-center gap-2"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Upload size={16} />
        Agregar fuente
      </motion.button>

      {/* MODAL COMPACTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={handleCancel}>
          <motion.div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header compacto */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <FileText size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{isEditing ? 'Editar fuente' : 'Agregar fuente'}</h3>
                  <p className="text-[10px] text-gray-500">Documentos, certificados o imágenes</p>
                </div>
              </div>
              <button onClick={handleCancel} className="p-1 hover:bg-white rounded" disabled={uploading}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Form compacto */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData((p) => ({ ...p, titulo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ej: Certificado de nacimiento"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                  rows={2}
                  placeholder="Breve descripción..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-gray-400" />
                  Fecha (opcional)
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData((p) => ({ ...p, fecha: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Upload size={12} className="text-gray-400" />
                  {isEditing ? 'Reemplazar archivo' : 'Archivos'}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf,image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple={!isEditing}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 flex flex-col items-center gap-1"
                  disabled={uploading}
                >
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Seleccionar archivos</span>
                </button>

                {selectedFiles.length > 0 && (
                  <motion.div 
                    className="mt-2 space-y-1.5"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    {selectedFiles.map((file, index) => (
                      <motion.div 
                        key={index} 
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <FileText size={14} className="text-red-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">{file.name}</div>
                          <div className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                        {uploading ? (
                          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-green-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress[index] || 0}%` }}
                            />
                          </div>
                        ) : (
                          <button type="button" onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                            <X size={12} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </form>

            {/* Footer compacto */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-white" disabled={uploading}>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
                disabled={uploading || (!isEditing && selectedFiles.length === 0)}
              >
                {uploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEditing ? 'Guardando...' : 'Subiendo...'}
                  </>
                ) : isEditing ? (
                  'Guardar'
                ) : (
                  <>
                    <Upload size={12} />
                    Subir {selectedFiles.length || ''}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <PdfViewerModal
        open={viewer.open}
        url={viewer.url}
        title={viewer.title}
        esImagen={viewer.esImagen}
        onClose={() => setViewer({ open: false, url: '', title: '', esImagen: false })}
      />
    </div>
  );
}