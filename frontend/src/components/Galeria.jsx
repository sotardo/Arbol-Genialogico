import { useState, useEffect, useRef } from 'react';
import { Image, X, Upload, Calendar, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toAPI } from '../utils';
import { alertError, alertSuccess } from '../utils/alerts';
import { motion, AnimatePresence } from 'framer-motion';

const imgSrc = (u) => (u ? (u.startsWith?.('http') ? u : toAPI(u)) : '');

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

export default function Galeria({ personaId, fotos = [], onFotoAdded, personasApi }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [[selectedFotoIndex, direction], setPage] = useState([0, 0]);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef(null);

  const [newFoto, setNewFoto] = useState({
    file: null,
    titulo: '',
    descripcion: '',
    fecha: '',
  });

  const [editingFoto, setEditingFoto] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alertError('Por favor selecciona una imagen válida');
        return;
      }
      setNewFoto({ ...newFoto, file });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    setNewFoto({ ...newFoto, file: null });
  };

  const handleUpload = async () => {
    if (!newFoto.file) {
      alertError('Selecciona una imagen');
      return;
    }

    setUploading(true);
    try {
      const metadata = {
        titulo: newFoto.titulo || 'Sin título',
        descripcion: newFoto.descripcion || '',
        fecha: newFoto.fecha || new Date().toISOString(),
      };

      await personasApi.subirFotoGaleria(personaId, newFoto.file, metadata);
      
      alertSuccess('Foto agregada exitosamente');
      setModalOpen(false);
      setNewFoto({ file: null, titulo: '', descripcion: '', fecha: '' });
      
      if (onFotoAdded) onFotoAdded();
    } catch (err) {
      console.error('Error subiendo foto:', err);
      alertError('No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (foto) => {
    setEditingFoto({
      ...foto,
      titulo: foto.titulo || '',
      descripcion: foto.descripcion || '',
      fecha: foto.fecha ? new Date(foto.fecha).toISOString().split('T')[0] : '',
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFoto) return;

    setUploading(true);
    try {
      await personasApi.editarFotoGaleria(personaId, editingFoto._id, {
        titulo: editingFoto.titulo,
        descripcion: editingFoto.descripcion,
        fecha: editingFoto.fecha ? new Date(editingFoto.fecha).toISOString() : null,
      });

      alertSuccess('Foto actualizada');
      setEditMode(false);
      setEditingFoto(null);
      
      if (onFotoAdded) onFotoAdded();
    } catch (err) {
      console.error('Error editando foto:', err);
      alertError('No se pudo actualizar la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fotoId) => {
    if (!confirm('¿Estás seguro de eliminar esta foto?')) return;

    try {
      await personasApi.eliminarFotoGaleria(personaId, fotoId);
      alertSuccess('Foto eliminada');
      
      if (lightboxOpen) setLightboxOpen(false);
      if (onFotoAdded) onFotoAdded();
    } catch (err) {
      console.error('Error eliminando foto:', err);
      alertError('No se pudo eliminar la foto');
    }
  };

  const openLightbox = (index) => {
    setPage([index, 0]);
    setLightboxOpen(true);
  };

  const paginate = (newDirection) => {
    const newIndex = selectedFotoIndex + newDirection;
    if (newIndex >= 0 && newIndex < fotos.length) {
      setPage([newIndex, newDirection]);
    }
  };

  const goToIndex = (index) => {
    const direction = index > selectedFotoIndex ? 1 : -1;
    setPage([index, direction]);
  };

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

  const handleCancel = () => {
    setNewFoto({ file: null, titulo: '', descripcion: '', fecha: '' });
    setModalOpen(false);
  };

  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') paginate(1);
      if (e.key === 'ArrowLeft') paginate(-1);
      if (e.key === 'Escape') setLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, selectedFotoIndex]);

  const currentFoto = fotos[selectedFotoIndex];

  return (
    <div>
      {/* Modal para subir nueva foto - DISEÑO IGUAL A FUENTES */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          onClick={() => !uploading && handleCancel()}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header compacto */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Image size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Agregar foto</h3>
                  <p className="text-[10px] text-gray-500">Fotos para la galería</p>
                </div>
              </div>
              <button onClick={handleCancel} className="p-1 hover:bg-white rounded" disabled={uploading}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Form compacto */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={newFoto.titulo}
                  onChange={(e) => setNewFoto({ ...newFoto, titulo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Ej: Cumpleaños 1985"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <textarea
                  value={newFoto.descripcion}
                  onChange={(e) => setNewFoto({ ...newFoto, descripcion: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none outline-none"
                  rows={2}
                  placeholder="Describe la foto..."
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-gray-400" />
                  Fecha (opcional)
                </label>
                <input
                  type="date"
                  value={newFoto.fecha}
                  onChange={(e) => setNewFoto({ ...newFoto, fecha: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Upload size={12} className="text-gray-400" />
                  Imagen
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 flex flex-col items-center gap-1 transition-colors"
                  disabled={uploading}
                >
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Seleccionar imagen</span>
                </button>

                {newFoto.file && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      {/* Preview de la imagen */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                        <img
                          src={URL.createObjectURL(newFoto.file)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">{newFoto.file.name}</div>
                        <div className="text-[10px] text-gray-500">{(newFoto.file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      {!uploading && (
                        <button
                          type="button"
                          onClick={removeFile}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer compacto */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-white"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
                disabled={uploading || !newFoto.file}
              >
                {uploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    Subir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar foto - MISMO DISEÑO */}
      {editMode && editingFoto && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          onClick={() => !uploading && setEditMode(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header compacto */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Edit2 size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Editar foto</h3>
                  <p className="text-[10px] text-gray-500">Modificar información</p>
                </div>
              </div>
              <button onClick={() => setEditMode(false)} className="p-1 hover:bg-white rounded" disabled={uploading}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Form compacto */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={editingFoto.titulo}
                  onChange={(e) => setEditingFoto({ ...editingFoto, titulo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={editingFoto.descripcion}
                  onChange={(e) => setEditingFoto({ ...editingFoto, descripcion: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none outline-none"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-gray-400" />
                  Fecha
                </label>
                <input
                  type="date"
                  value={editingFoto.fecha}
                  onChange={(e) => setEditingFoto({ ...editingFoto, fecha: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={uploading}
                />
              </div>
            </div>

            {/* Footer compacto */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-white"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX ESTILO MERCADO LIBRE */}
      {lightboxOpen && fotos.length > 0 && currentFoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.92)' }}
        >
          {/* PANEL DE MINIATURAS - Izquierda */}
          {fotos.length > 1 && (
            <div 
              className="hidden md:flex flex-col w-20 bg-white/5 border-r border-white/10 overflow-y-auto py-4 px-2 gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {fotos.map((foto, index) => (
                <button
                  key={foto._id}
                  onClick={() => goToIndex(index)}
                  className={`
                    relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 transition-all
                    ${selectedFotoIndex === index 
                      ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black/50' 
                      : 'opacity-60 hover:opacity-100'
                    }
                  `}
                >
                  <img
                    src={imgSrc(foto.url || foto.ruta)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* CONTENEDOR PRINCIPAL */}
          <div className="flex-1 flex flex-col relative">
            {/* HEADER - Posición absoluta */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              {fotos.length > 1 && (
                <div className="px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full pointer-events-auto">
                  <span className="text-white text-sm font-medium">
                    {selectedFotoIndex + 1} / {fotos.length}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => setLightboxOpen(false)}
                className="ml-auto w-11 h-11 flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-colors pointer-events-auto"
              >
                <X size={22} className="text-white" strokeWidth={2} />
              </button>
            </div>

            {/* ÁREA DE IMAGEN - Centrada */}
            <div 
              className="flex-1 flex items-center justify-center relative"
              onClick={() => setLightboxOpen(false)}
            >
              {fotos.length > 1 && selectedFotoIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    paginate(-1);
                  }}
                  className="absolute left-4 z-20 w-11 h-11 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-105"
                >
                  <ChevronLeft size={26} className="text-gray-700" strokeWidth={2.5} />
                </button>
              )}

              <div 
                className="flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
                style={{ width: 'calc(100% - 160px)', height: '100%' }}
              >
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.img
                    key={selectedFotoIndex}
                    src={imgSrc(currentFoto.url || currentFoto.ruta)}
                    alt={currentFoto.titulo || 'Foto'}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 400, damping: 35 },
                      opacity: { duration: 0.15 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipe = swipePower(offset.x, velocity.x);
                      if (swipe < -swipeConfidenceThreshold) {
                        paginate(1);
                      } else if (swipe > swipeConfidenceThreshold) {
                        paginate(-1);
                      }
                    }}
                    className="max-w-full max-h-[80vh] object-contain cursor-grab active:cursor-grabbing rounded-lg"
                    style={{ userSelect: 'none' }}
                  />
                </AnimatePresence>
              </div>

              {fotos.length > 1 && selectedFotoIndex < fotos.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    paginate(1);
                  }}
                  className="absolute right-4 z-20 w-11 h-11 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-105"
                >
                  <ChevronRight size={26} className="text-gray-700" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* BARRA INFERIOR */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 pb-5 px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-2xl mx-auto text-center">
                {(currentFoto.titulo || currentFoto.descripcion || currentFoto.fecha) && (
                  <div className="mb-4">
                    {currentFoto.titulo && (
                      <h3 className="text-white text-lg font-semibold">
                        {currentFoto.titulo}
                      </h3>
                    )}
                    {currentFoto.descripcion && (
                      <p className="text-white/80 text-sm mt-1">
                        {currentFoto.descripcion}
                      </p>
                    )}
                    {currentFoto.fecha && (
                      <p className="text-white/60 text-xs mt-2 flex items-center justify-center gap-1.5">
                        <Calendar size={12} />
                        {formatDate(currentFoto.fecha)}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setLightboxOpen(false);
                      handleEdit(currentFoto);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-800 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    <Edit2 size={16} />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(currentFoto._id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <Trash2 size={16} />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid de fotos */}
      {fotos.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <Image size={48} className="mx-auto text-gray-300" />
          </div>
          <p className="text-gray-500 mb-4">No hay fotos en la galería</p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            + AGREGAR PRIMERA FOTO
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <Upload size={16} />
              Agregar foto
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {fotos.map((foto, index) => (
              <motion.div
                key={foto._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.03 }}
                className="photo-card"
                onClick={() => openLightbox(index)}
              >
                <div className="photo-frame">
                  <div className="photo-image-wrapper">
                    <img
                      src={imgSrc(foto.url || foto.ruta)}
                      alt={foto.titulo || 'Foto'}
                      className="photo-image"
                    />
                    
                    <div className="photo-overlay">
                      <Image size={28} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .photo-card {
          cursor: pointer;
        }

        .photo-frame {
          background: linear-gradient(to bottom, #ffffff 0%, #fafafa 100%);
          padding: 10px;
          border-radius: 4px;
          box-shadow: 
            0 2px 4px rgba(0, 0, 0, 0.08),
            0 4px 8px rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.2s ease;
        }

        .photo-card:hover .photo-frame {
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.12),
            0 8px 16px rgba(0, 0, 0, 0.08);
        }

        .photo-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          overflow: hidden;
          background: #f3f4f6;
          border-radius: 2px;
        }

        .photo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .photo-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .photo-card:hover .photo-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}