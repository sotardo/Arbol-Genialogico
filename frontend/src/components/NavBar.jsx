import React from "react";
import { useTranslation } from "react-i18next";
import logo from "../img/logo.png";
import LanguageSelector from "./LanguageSelector";

export default function NavBar({
  onToggleView,
  viewMode = "horizontal",
  right = null,
  activeView = "inicio",
  onNavigate,
}) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-[100] flex justify-between items-center px-6 py-4 bg-white shadow-sm border-b border-gray-200">
      {/* IZQUIERDA */}
      <div className="flex items-center gap-8">
        {/* Logo + Nombre */}
        <button 
          onClick={() => onNavigate?.("inicio")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <img
            src={logo}
            alt="Logo"
            className="w-8 h-8 object-contain select-none"
          />
          <span className="text-lg font-bold text-gray-800 tracking-wide">
            {t('appName')}
          </span>
        </button>

        {/* Navegación */}
        <nav className="flex gap-6 text-sm font-medium">
          <button
            onClick={() => onNavigate?.("inicio")}
            className={`cursor-pointer transition-colors ${
              activeView === "inicio"
                ? "text-green-600 font-bold"
                : "text-gray-600 hover:text-green-600"
            }`}
          >
            {t('nav.home')}
          </button>
          <button
            onClick={() => onNavigate?.("arbol")}
            className={`cursor-pointer transition-colors ${
              activeView === "arbol"
                ? "text-green-600 font-bold"
                : "text-gray-600 hover:text-green-600"
            }`}
          >
            {t('nav.tree')}
          </button>
          <button
            onClick={() => onNavigate?.("personas")}
            className={`cursor-pointer transition-colors ${
              activeView === "personas"
                ? "text-green-600 font-bold"
                : "text-gray-600 hover:text-green-600"
            }`}
          >
            {t('nav.persons')}
          </button>
        </nav>
      </div>

      {/* DERECHA */}
      <div className="flex items-center gap-4">
        <LanguageSelector />
        <div className="fs-toolbar" />
        {right}
      </div>
    </header>
  );
}