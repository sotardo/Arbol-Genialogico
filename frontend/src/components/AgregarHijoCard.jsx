import React from "react";
import { CirclePlus } from "lucide-react";

const shadow = "0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)";

export default function AgregarHijoCard({ onAgregarHijo, personaId, personaNombre }) {
  const CARD_W = 300;
  const ROW_H = 50;
  const FOOTER_H = 0;
  const CARD_H = ROW_H * 2 + FOOTER_H;
  const BORDER_RADIUS = 12;

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: "border-box",
        background: "#f8fafc",
        borderRadius: BORDER_RADIUS,
        boxShadow: shadow,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "transparent",
          cursor: "pointer",
          border: "none",
          fontSize: 20,
          fontWeight: 600,
          color: "#10b981",
          padding: "12px 20px",
          borderRadius: 8,
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#ecfdf5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <CirclePlus size={28} strokeWidth={1.5} />
        AGREGAR HIJO
      </button>
    </div>
  );
}