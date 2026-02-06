import { useState, useEffect, useRef } from 'react';
import { User, Search, Check, TreePine, ChevronRight } from 'lucide-react';
import { useTranslation } from "react-i18next";

const STORAGE_KEY = 'familia_fahler_root_id';

export function getRootFromStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveRootToStorage(id) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export default function InicioPage({ 
  personasApi, 
  rootId, 
  onSetRoot, 
  onNavigateToArbol,
  toAPI = (path) => path 
}) {
  const [personaRaiz, setPersonaRaiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useTranslation('home');
  const inputRef = useRef(null);

  // Cargar datos de la persona raíz actual
  useEffect(() => {
    if (!rootId || !personasApi) {
      setPersonaRaiz(null);
      return;
    }
    const loadPersona = async () => {
      setLoading(true);
      try {
        const data = await personasApi.detalle(rootId);
        setPersonaRaiz(data);
      } catch (err) {
        console.error('Error cargando persona raíz:', err);
        setPersonaRaiz(null);
      } finally {
        setLoading(false);
      }
    };
    loadPersona();
  }, [rootId, personasApi]);

  // Buscar personas
  useEffect(() => {
    if (!searchQuery.trim() || !personasApi) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await personasApi.listar(searchQuery, 1, 10, 'nombre', 'asc');
        setSearchResults(res?.items || []);
      } catch (err) {
        console.error('Error buscando:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, personasApi]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPersona = (persona) => {
    if (!persona?._id) return;
    saveRootToStorage(persona._id);
    onSetRoot?.(persona._id);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleGoToArbol = () => {
    if (rootId) {
      onNavigateToArbol?.(rootId);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-green-50 via-white to-lime-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
       <h1 className="text-3xl font-bold text-gray-900 mb-2">
  {t('welcome')}
</h1>
<p className="text-gray-600">
  {t('subtitle')}
</p>
        </div>

        {/* Persona raíz actual */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-lime-600">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TreePine size={20} />
              {t('currentRoot.title')}
            </h2>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            ) : personaRaiz ? (
              <div className="flex items-center gap-4">
                {/* Avatar */}
                {personaRaiz.avatarUrl ? (
                  <img
                    src={toAPI(personaRaiz.avatarUrl)}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border-4 border-green-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-50">
                    <User size={32} className="text-green-600" />
                  </div>
                )}
                
                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {personaRaiz.nombre || 'Sin nombre'}
                  </h3>
                  {personaRaiz.codigo && (
                    <p className="text-sm text-gray-500">{personaRaiz.codigo}</p>
                  )}
                  <div className="flex gap-4 mt-1 text-sm text-gray-600">
                    {personaRaiz.nacimiento && (
                      <span>{t('common:dates.birth')}: {formatDate(personaRaiz.nacimiento)}</span>
                    )}
                    {personaRaiz.fallecimiento && (
                      <span>{t('common:dates.death')}: {formatDate(personaRaiz.fallecimiento)}</span>
                    )}
                  </div>
                </div>

                {/* Botón ir al árbol */}
                <button
                  onClick={handleGoToArbol}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  <TreePine size={20} />
                  {t('currentRoot.viewTree')}
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User size={48} className="mx-auto mb-3 text-gray-300" />
                <p>{t('currentRoot.noSelection')}</p>
                <p className="text-sm">{t('currentRoot.useSearch')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Selector de nueva persona raíz */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-visible mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
<h2 className="text-lg font-semibold text-gray-900">
  {t('changeRoot.title')}
</h2>
<p className="text-sm text-gray-500 mt-1">
  {t('changeRoot.subtitle')}
</p>
          </div>
          
          <div className="p-6 pb-8 overflow-visible min-h-[120px]">
            {/* Buscador */}
            <div className="relative overflow-visible" ref={dropdownRef}>
              <div className="relative">
                <Search 
                  size={20} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={t('changeRoot.searchPlaceholder')}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
                  </div>
                )}
              </div>

              {/* Dropdown de resultados */}
              {showDropdown && searchQuery.trim() && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[400px] overflow-y-auto overflow-x-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">
                     {searching ? t('changeRoot.searching') : t('changeRoot.noResults')}
                    </div>
                  ) : (
                    searchResults.map((persona) => (
                      <button
                        key={persona._id}
                        onClick={() => handleSelectPersona(persona)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors text-left border-b border-gray-100 last:border-0"
                      >
                        {persona.avatarUrl ? (
                          <img
                            src={toAPI(persona.avatarUrl)}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {persona.nombre || 'Sin nombre'}
                          </div>
                          {persona.nacimiento && (
                            <div className="text-xs text-gray-500">
                              {formatDate(persona.nacimiento)}
                            </div>
                          )}
                        </div>
                        {persona._id === rootId && (
                          <Check size={20} className="text-green-600 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info adicional - fuera del card para evitar solapamiento con dropdown */}
        <div className="p-4 bg-green-50 rounded-xl border border-green-100 mb-8">
 <p className="text-sm text-gray-600">
  <strong>{t('tip.title')}:</strong> {t('tip.content')}
</p>
        </div>

        {/* Acceso rápido */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigateToArbol?.(rootId)}
            disabled={!rootId}
            className="flex items-center justify-center gap-3 p-6 bg-white rounded-xl shadow border border-gray-100 hover:border-green-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TreePine size={24} className="text-green-600" />
            <span className="font-medium text-gray-900">{t('currentRoot.viewTree')}</span>
          </button>
          <button
            onClick={() => window.location.href = '/personas'}
            className="flex items-center justify-center gap-3 p-6 bg-white rounded-xl shadow border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
          >
            <User size={24} className="text-green-600" />
            <span className="font-medium text-gray-900">{t('currentRoot.viewPersons')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}