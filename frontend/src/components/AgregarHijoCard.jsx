import React from "react";

const shadow = "0 6px 16px rgba(0,0,0,0.15)";

export default function AgregarHijoCard({ onAgregarHijo, personaId, personaNombre }) {
  const CARD_W = 240;
  const CARD_H = 180;

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: "border-box",
        background: "#f8fafc",
        borderRadius: 10,
        boxShadow: shadow,
        border: "2px dashed #cbd5e0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (typeof onAgregarHijo === 'function') {
            onAgregarHijo(personaId, personaNombre);
          }
        }}
        style={{
          width: "80%",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "#ffffff",
          cursor: "pointer",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: "#10b981",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#ecfdf5";
          e.currentTarget.style.borderColor = "#10b981";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.borderColor = "#e2e8f0";
        }}
      >
        <span style={{ fontSize: 24 }}>+</span>
        AGREGAR HIJO
      </button>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: "#94a3b8",
          textAlign: "center"
        }}
      >
        Agregar descendiente
      </div>
    </div>
  );
}