// src/hooks/useToAPI.js
import { useMemo } from 'react';

export default function useToAPI() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return useMemo(() => (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;  // ya es absoluta
    if (path.startsWith('/')) return `${base}${path}`; // /uploads/...
    return `${base}/${path}`;
  }, [base]);
}
