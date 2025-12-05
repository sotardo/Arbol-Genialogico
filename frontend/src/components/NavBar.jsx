import React from "react";
import logo from "../img/logo.png";

export default function NavBar({
  onToggleView,
  viewMode = "horizontal",
  right = null,
  activeView = "arbol",
  onNavigate,
}) {
  return (
    <header className="sticky top-0 z-[100] flex justify-between items-center px-6 py-4 bg-white shadow-sm border-b border-gray-200">
      {/* IZQUIERDA */}
      <div className="flex items-center gap-8">
        {/* Logo + Nombre */}
        <div className="flex items-center gap-2">
          <img
            src={logo}
            alt="Logo"
            className="w-8 h-8 object-contain select-none"
          />
          <span className="text-lg font-bold text-gray-800 tracking-wide">
            Familia Fahler
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex gap-6 text-sm font-medium">
          <button
            onClick={() => onNavigate?.("arbol")}
            className={`cursor-pointer transition-colors ${
              activeView === "arbol"
                ? "text-green-600 font-bold"
                : "text-gray-600 hover:text-green-600"
            }`}
          >
            Árbol
          </button>
          <button
            onClick={() => onNavigate?.("personas")}
            className={`cursor-pointer transition-colors ${
              activeView === "personas"
                ? "text-green-600 font-bold"
                : "text-gray-600 hover:text-green-600"
            }`}
          >
            Personas
          </button>
        </nav>
      </div>

      {/* DERECHA */}
      <div className="flex items-center gap-4">
        <div className="fs-toolbar" />
        {right}
      </div>
    </header>
  );
}