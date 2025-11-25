export const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const toAPI = (path) =>
  (typeof path === 'string' && path.startsWith('/')) ? `${API}${path}` : path;
