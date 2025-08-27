import mongoose from 'mongoose';

const PersonaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  sexo: { type: String, enum: ['M','F','X'], default: 'X' },
  nacimiento: { type: Date },
  fallecimiento: { type: Date },
  notas: { type: String, trim: true },

  // Campos pensados para etapas siguientes (pueden quedar vacíos)
  padres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  conyuges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  hijos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  acercaDe: { type: String, trim: true },
  avatarUrl: { type: String },
  medios: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    tipo: { type: String, enum: ['imagen','pdf','otro'], default: 'imagen' },
    titulo: { type: String, trim: true },
    fecha: { type: Date },
    ruta: { type: String },
    nombreArchivo: { type: String },
    descripcion: { type: String, trim: true }
  }]
}, { timestamps: true });
PersonaSchema.index({ nombre: 'text', notas: 'text', acercaDe: 'text' });
PersonaSchema.index({ nombre: 1, createdAt: -1 });
export default mongoose.model('Persona', PersonaSchema);

