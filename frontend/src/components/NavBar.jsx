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
    <header className="sticky top-0 z-[100] flex justify-between items-center px-8 py-4 bg-white shadow-md border-b border-gray-200 backdrop-blur-sm">
      {/* IZQUIERDA */}
      <div className="flex items-center gap-10">
        {/* Logo + Nombre */}
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Logo"
            className="w-12 h-12 object-contain select-none"
          />
          <span className="text-2xl font-bold text-gray-800 tracking-wide">
            Familia Fahler
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex gap-8 text-lg font-medium">
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
      <div className="flex items-center gap-5">
        <div className="fs-toolbar" />
        {right}
      </div>
    </header>
  );
}