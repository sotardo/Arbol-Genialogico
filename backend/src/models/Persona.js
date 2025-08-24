import mongoose from 'mongoose';

const PersonaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  sexo: { type: String, enum: ['M', 'F', 'X'], default: 'X' },
  nacimiento: { type: Date },
  fallecimiento: { type: Date },
  notas: { type: String, trim: true },

  padres:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  conyuges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  hijos:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],

  // Campos de perfil (ya pensados para futuro):
  acercaDe:  { type: String, trim: true },
  avatarUrl: { type: String },
  medios: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    tipo: { type: String, enum: ['imagen','pdf','otro'], default: 'imagen' },
    titulo: { type: String, trim: true },
    fecha: { type: Date },
    ruta: { type: String, required: true },
    nombreArchivo: { type: String },
    descripcion: { type: String, trim: true }
  }]
}, { timestamps: true });

export default mongoose.model('Persona', PersonaSchema);
