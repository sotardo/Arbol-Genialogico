// src/components/Fuentes.jsx
import { useState, useRef } from 'react';
import { FileText, X, Upload, Calendar, Trash2, Eye } from 'lucide-react';
import { toAPI } from '../utils';
import { alertError, alertSuccess } from '../utils/alerts';
import * as Alerts from '../utils/alerts';

// Formatea a dd/mm/aaaa (locale español) SIN romper por zona horaria
const formatFechaDMY = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

// Normaliza URLs desde el backend
const fileSrc = (u) => (u ? (u.startsWith?.('http') ? u : toAPI(u)) : '');

// Helpers tipo de archivo
const isPdfFuente = (fuente) => {
  const t = (fuente?.tipo || '').toLowerCase();
  const nombre = (fuente?.nombreArchivo || fuente?.titulo || '').toLowerCase();
  const ruta = (fuente?.ruta || '').toLowerCase();

  return (
    t === 'pdf' ||
    t === 'application/pdf' ||
    nombre.endsWith('.pdf') ||
    ruta.endsWith('.pdf')
  );
};

const isImageFuente = (fuente) => {
  const t = (fuente?.tipo || '').toLowerCase();
  const nombre = (fuente?.nombreArchivo || fuente?.titulo || '').toLowerCase();
  const ruta = (fuente?.ruta || fuente?.url || '').toLowerCase();

  if (t === 'imagen' || t.startsWith('image/')) return true;

  const endsWithImg = (s) =>
    s.endsWith('.jpg') ||
    s.endsWith('.jpeg') ||
    s.endsWith('.png') ||
    s.endsWith('.webp') ||
    s.endsWith('.gif');

  return endsWithImg(nombre) || endsWithImg(ruta);
};

// Detectar tipo de imagen específico
const getImageType = (fuente) => {
  const ruta = (fuente?.ruta || fuente?.url || '').toLowerCase();
  const nombre = (fuente?.nombreArchivo || fuente?.titulo || '').toLowerCase();

  if (ruta.endsWith('.jpg') || nombre.endsWith('.jpg')) return 'JPG';
  if (ruta.endsWith('.jpeg') || nombre.endsWith('.jpeg')) return 'JPEG';
  if (ruta.endsWith('.png') || nombre.endsWith('.png')) return 'PNG';
  if (ruta.endsWith('.webp') || nombre.endsWith('.webp')) return 'WEBP';
  if (ruta.endsWith('.gif') || nombre.endsWith('.gif')) return 'GIF';

  return 'IMAGEN';
};

// Modal visor PDF/imagen
const PdfViewerModal = ({ open, onClose, url, title, esImagen }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {title || 'Documento'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Abrir en pestaña
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Cerrar visor"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Visor */}
        <div className="flex-1 bg-gray-50 overflow-auto flex items-center justify-center">
          {esImagen ? (
            <img
              src={url}
              alt={title}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ cursor: 'zoom-in' }}
              onClick={(e) => {
                if (e.target.style.transform === 'scale(2)') {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.cursor = 'zoom-in';
                } else {
                  e.target.style.transform = 'scale(2)';
                  e.target.style.cursor = 'zoom-out';
                }
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

const FuenteCard = ({ fuente, onDelete, onView }) => {
  const url = fileSrc(fuente.ruta || fuente.url);
  const esPdf = isPdfFuente(fuente);
  const esImagen = isImageFuente(fuente);
  const tipoImagen = esImagen ? getImageType(fuente) : null;

  return (
    <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
        {esPdf && !esImagen && <FileText size={28} className="text-blue-600" />}

        {esImagen && url && (
          <img
            src={url}
            alt={fuente.titulo}
            className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onView?.(fuente)}
          />
        )}

        {!esPdf && !esImagen && (
          <FileText size={28} className="text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 mb-1">
          {fuente.titulo || fuente.nombreArchivo || 'Sin título'}
        </h3>

        {fuente.descripcion && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {fuente.descripcion}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          {fuente.fecha && (
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatFechaDMY(fuente.fecha)}</span>
            </div>
          )}

          {esPdf && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-medium">
              PDF
            </span>
          )}

          {esImagen && tipoImagen && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
              {tipoImagen}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {url && (
          <button
            onClick={() => onView?.(fuente)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Ver archivo"
          >
            <Eye size={18} />
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(fuente._id)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default function Fuentes({ personaId, fuentes = [], onFuenteAdded, personasApi }) {
  const fuentesArr = Array.isArray(fuentes) ? fuentes : (fuentes ? [fuentes] : []);
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
      const mimeOk = allowedMimePrefixes.some((pref) => type.startsWith(pref));
      const extOk = allowedExtensions.some((ext) => name.endsWith(ext));
      return mimeOk || extOk;
    });

    if (validFiles.length !== files.length) {
      alertError('Solo se permiten archivos PDF o imágenes (JPG, JPEG, PNG, WEBP, GIF)');
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({ titulo: '', descripcion: '', fecha: '' });
    setSelectedFiles([]);
    setUploadProgress([]);
  };

  const handleCancel = () => {
    resetForm();
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      alertError('Debes seleccionar al menos un archivo');
      return;
    }

    setUploading(true);
    setUploadProgress(new Array(selectedFiles.length).fill(0));

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const lowerName = file.name.toLowerCase();
        const mime = file.type.toLowerCase();

        const esPdf = mime === 'application/pdf' || lowerName.endsWith('.pdf');
        const tipo = esPdf ? 'pdf' : 'imagen';

        setUploadProgress((prev) => {
          const copy = [...prev];
          copy[i] = 40;
          return copy;
        });

        await personasApi.subirMedia?.(personaId, file, {
          tipo,
          titulo: formData.titulo || file.name,
          descripcion: formData.descripcion,
          fecha: formData.fecha || undefined,
        });

        setUploadProgress((prev) => {
          const copy = [...prev];
          copy[i] = 100;
          return copy;
        });
      }

      if (onFuenteAdded) await onFuenteAdded();

      setShowModal(false);
      resetForm();
      alertSuccess(`${selectedFiles.length} fuente(s) agregada(s) correctamente`);
    } catch (err) {
      console.error(err);
      alertError('Error al subir las fuentes.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      if (typeof Alerts.alertConfirm === 'function') {
        return await Alerts.alertConfirm({
          title: 'Eliminar fuente',
          text: '¿Estás seguro?',
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
          icon: 'warning',
          confirmColor: 'red',
        });
      }
    } catch (err) {
      console.warn('Fallo alertConfirm, usando confirm().');
    }

    return window.confirm('¿Eliminar?');
  };

  const handleDelete = async (fuenteId) => {
    const ok = await confirmDelete();
    if (!ok) return;

    try {
      await personasApi.eliminarMedia?.(personaId, fuenteId);

      if (onFuenteAdded) await onFuenteAdded();
      alertSuccess('Fuente eliminada');
    } catch (err) {
      console.error(err);
      alertError('Error eliminando fuente');
    }
  };

  const handleView = (fuente) => {
    const url = fileSrc(fuente.ruta || fuente.url);
    if (!url) return;

    setViewer({
      open: true,
      url,
      title: fuente.titulo || fuente.nombreArchivo || 'Documento',
      esImagen: isImageFuente(fuente),
    });
  };

  return (
    <div className="space-y-4">
      {fuentesArr.length > 0 ? (
        <div className="space-y-3">
          {fuentesArr.map((fuente) => (
            <FuenteCard
              key={fuente._id || fuente.ruta}
              fuente={fuente}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2 font-medium">No hay fuentes registradas</p>
          <p className="text-sm text-gray-500">Agrega documentos o imágenes</p>
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all font-medium flex items-center justify-center gap-2"
      >
        <Upload size={20} />
        AGREGAR FUENTE
      </button>

      {/* Modal agregar */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Agregar fuente</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Sube documentos históricos, certificados o imágenes
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                disabled={uploading}
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData((p) => ({ ...p, titulo: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Certificado de nacimiento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Añade una breve descripción..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  Fecha del documento (opcional)
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData((p) => ({ ...p, fecha: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Upload size={16} className="text-gray-500" />
                  Archivos PDF o imágenes
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf,image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center gap-2"
                  disabled={uploading}
                >
                  <Upload size={32} className="text-gray-400" />
                  <span className="font-medium">Haz clic para seleccionar archivos</span>
                  <span className="text-sm text-gray-500">Puedes cargar múltiples archivos</span>
                </button>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <FileText size={20} className="text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>

                        {uploading ? (
                          <div className="w-24">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${uploadProgress[index]}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
                disabled={uploading}
              >
                Cancelar
              </button>

              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-70 flex items-center gap-2"
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Subir {selectedFiles.length} archivo
                    {selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PdfViewerModal
        open={viewer.open}
        url={viewer.url}
        title={viewer.title}
        esImagen={viewer.esImagen}
        onClose={() => setViewer({ open: false, url: '', title: '', esImagen: false })}
      />

      <style>{`
        .line-clamp-2 { 
          display: -webkit-box; 
          -webkit-line-clamp: 2; 
          -webkit-box-orient: vertical; 
          overflow: hidden; 
        }
      `}</style>
    </div>
  );
}
