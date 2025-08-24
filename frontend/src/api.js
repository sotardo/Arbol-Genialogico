const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const personasApi = {
  listar: async (q='') => {
    const url = q ? `${API}/api/personas?q=${encodeURIComponent(q)}` : `${API}/api/personas`;
    const res = await fetch(url);
    return res.json(); // { items, total, ... }
  },
  crear: async (payload) => {
    const res = await fetch(`${API}/api/personas`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    return res.json();
  },
  editar: async (id, payload) => {
    const res = await fetch(`${API}/api/personas/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    return res.json();
  },
  borrar: async (id) => {
    const res = await fetch(`${API}/api/personas/${id}`, { method: 'DELETE' });
    return res.json();
  }
};
