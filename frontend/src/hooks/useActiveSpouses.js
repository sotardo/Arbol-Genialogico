// src/hooks/useActiveSpouses.js
import { useState, useCallback, useMemo } from 'react';
import { personasApi } from '../personasApi';

export function useActiveSpouses(initialMap = {}) {
  const [activeSpouseMap, setActiveSpouseMap] = useState(() => {
    if (initialMap instanceof Map) return initialMap;
    return new Map(Object.entries(initialMap));
  });
  
  const getActiveSpouse = useCallback((personId) => {
    return activeSpouseMap.get(String(personId)) || null;
  }, [activeSpouseMap]);
  
  const setActiveSpouse = useCallback((personId, spouseId) => {
    setActiveSpouseMap(prev => {
      const next = new Map(prev);
      if (spouseId) {
        next.set(String(personId), String(spouseId));
      } else {
        next.delete(String(personId));
      }
      return next;
    });
  }, []);
  
  const cambiarConyuge = useCallback(async (personId, nuevoConyugeId, persistir = false) => {
    setActiveSpouse(personId, nuevoConyugeId);
    
    if (persistir && nuevoConyugeId) {
      try {
        await personasApi.marcarConyugePreferido(personId, nuevoConyugeId);
        console.log(`✅ Cónyuge preferido actualizado: ${personId} -> ${nuevoConyugeId}`);
      } catch (err) {
        console.error('❌ Error guardando cónyuge preferido:', err);
      }
    }
    
    return { personId, nuevoConyugeId };
  }, [setActiveSpouse]);
  
  const resetActiveSpouses = useCallback(() => {
    setActiveSpouseMap(new Map());
  }, []);
  
  const loadPreferredSpouses = useCallback((personas) => {
    const newMap = new Map();
    
    personas.forEach(persona => {
      if (persona?.conyugePreferido) {
        newMap.set(String(persona._id), String(persona.conyugePreferido));
      }
    });
    
    setActiveSpouseMap(prev => {
      const merged = new Map(newMap);
      prev.forEach((value, key) => {
        merged.set(key, value);
      });
      return merged;
    });
  }, []);
  
  const activeSpouseMapObject = useMemo(() => {
    const obj = {};
    activeSpouseMap.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }, [activeSpouseMap]);
  
  return {
    activeSpouseMap,
    activeSpouseMapObject,
    getActiveSpouse,
    setActiveSpouse,
    cambiarConyuge,
    resetActiveSpouses,
    loadPreferredSpouses,
  };
}

export default useActiveSpouses;