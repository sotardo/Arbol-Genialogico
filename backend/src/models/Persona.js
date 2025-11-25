// models/Persona.js - AGREGAR campo otrosConyuges
import mongoose from 'mongoose';

const PersonaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  sexo: { type: String, enum: ['M','F','X'], default: 'X' },
  nacimiento: { type: Date },
  fallecimiento: { type: Date },
  notas: { type: String, trim: true },

  lugarNacimiento: { type: String, trim: true },
  lugarFallecimiento: { type: String, trim: true },
  causaFallecimiento: { type: String, trim: true },

  padres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  conyuges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }], // ✅ NO TOCAR (lienzo)
  hijos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  
  // ✅ NUEVO: Cónyuges adicionales (para el editor)
  otrosConyuges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  conyugePreferido: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
  
  acercaDe: { type: String, trim: true },
  avatarUrl: { type: String },
  
  bautismo: {
    fecha: { type: Date },
    lugar: { type: String, trim: true },
    parroquia: { type: String, trim: true },
    notas: { type: String, trim: true }
  },
  
  entierro: {
    fecha: { type: Date },
    lugar: { type: String, trim: true },
    razon: { type: String, trim: true }
  },
  
  matrimonio: {
    fecha: { type: Date },
    lugar: { type: String, trim: true }
  },

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
PersonaSchema.index({ padres: 1 });
PersonaSchema.index({ hijos: 1 });
PersonaSchema.index({ conyuges: 1 });
PersonaSchema.index({ otrosConyuges: 1 }); // ✅ Índice nuevo
PersonaSchema.index({ conyugePreferido: 1 });

export default mongoose.model('Persona', PersonaSchema);