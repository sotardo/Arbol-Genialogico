// src/personasApi.js
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const personasApi = {
  // Listar personas - CORREGIDO: solo usa 'q'
  listar: async (search = '', page = 1, limit = 50, sort = 'nombre', order = 'asc') => {
    const qs = new URLSearchParams({
      q: search || '',  // Solo 'q', no 'search'
      page: String(page),
      limit: String(limit),
      sort,
      order
    });
    const res = await fetch(`${API}/api/personas?${qs.toString()}`);
    if (!res.ok) throw new Error('Error al listar personas');
    return res.json();
  },

  crear: async (payload) => {
    const res = await fetch(`${API}/api/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al crear persona');
    return res.json();
  },

  editar: async (id, payload) => {
    const res = await fetch(`${API}/api/personas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al editar persona');
    return res.json();
  },

  borrar: async (id) => {
    const res = await fetch(`${API}/api/personas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al borrar persona');
    return res.json();
  },

  detalle: async (id) => {
    const res = await fetch(`${API}/api/personas/${id}`);
    if (!res.ok) throw new Error('Error al obtener persona');
    const data = await res.json();

    // 🔒 Blindaje: asegurar arrays para evitar renderizar objetos crudos
    if (!Array.isArray(data.fuentes)) {
      data.fuentes = data.fuentes ? [data.fuentes] : [];
    }
    if (!Array.isArray(data.recuerdos)) {
      data.recuerdos = data.recuerdos ? [data.recuerdos] : [];
    }
    return data;
  },

  bulk: async (ids) => {
    const res = await fetch(`${API}/api/personas/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Error al obtener personas (bulk)');
    return res.json();
  },

  // === 🟦 MEDIOS / FUENTES ===

  // Subir avatar
  subirAvatar: async (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/api/personas/${id}/avatar`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Error subiendo avatar');
    return res.json();
  },

  // Subir documento (fuente PDF u otro)
  subirMedia: async (id, file, metadata = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (metadata.tipo) fd.append('tipo', metadata.tipo);
    if (metadata.titulo) fd.append('titulo', metadata.titulo);
    if (metadata.descripcion) fd.append('descripcion', metadata.descripcion);
    if (metadata.fecha) fd.append('fecha', metadata.fecha);

    const res = await fetch(`${API}/api/personas/${id}/media`, {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error subiendo media: ${txt}`);
    }

    return res.json();
  },

  // Eliminar documento (fuente PDF u otro)
  eliminarMedia: async (id, mediaId) => {
    const res = await fetch(`${API}/api/personas/${id}/media/${mediaId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error eliminando media: ${txt}`);
    }
    return res.json();
  },

  // ✅ NUEVO: Marcar cónyuge preferido
  marcarConyugePreferido: async (personaId, conyugeId) => {
    const res = await fetch(`${API}/api/personas/${personaId}/conyuge-preferido`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conyugeId }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error marcando cónyuge preferido: ${txt}`);
    }
    return res.json();
  },

  // BACKUP / RESTORE opcionales
  backup: async () => (await fetch(`${API}/api/backup`)).json(),

  restore: async (data, mode = 'merge') => {
    const res = await fetch(`${API}/api/restore?mode=${encodeURIComponent(mode)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

// === Relaciones ===
export const relacionesApi = {
  vincularPadreHijo: async (padreId, hijoId) => {
    const res = await fetch(`${API}/api/relaciones/padre-hijo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ padreId, hijoId }),
    });
    if (!res.ok) throw new Error('Error vinculando padre-hijo');
    return res.json();
  },

  desvincularPadreHijo: async (padreId, hijoId) => {
    const qs = new URLSearchParams({ padreId, hijoId });
    const res = await fetch(`${API}/api/relaciones/padre-hijo?${qs}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error desvinculando padre-hijo');
    return res.json();
  },

  vincularConyuges: async (aId, bId) => {
    const res = await fetch(`${API}/api/relaciones/conyuges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aId, bId }),
    });
    if (!res.ok) throw new Error('Error vinculando cónyuges');
    return res.json();
  },

  desvincularConyuges: async (aId, bId) => {
    const qs = new URLSearchParams({ aId, bId });
    const res = await fetch(`${API}/api/relaciones/conyuges?${qs}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error desvinculando cónyuges');
    return res.json();
  },

  // ✅ NUEVO: Otros cónyuges
  vincularOtroConyuge: async (aId, bId) => {
    const res = await fetch(`${API}/api/relaciones/otros-conyuges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aId, bId }),
    });
    if (!res.ok) throw new Error('Error vinculando otro cónyuge');
    return res.json();
  },

  desvincularOtroConyuge: async (aId, bId) => {
    const qs = new URLSearchParams({ aId, bId });
    const res = await fetch(`${API}/api/relaciones/otros-conyuges?${qs}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error desvinculando otro cónyuge');
    return res.json();
  },
};