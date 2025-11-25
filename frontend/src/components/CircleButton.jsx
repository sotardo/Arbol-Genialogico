// src/components/CircleButton.jsx
import React from "react";

/**
 * Botón circular para expandir/contraer columnas del árbol.
 * - side: "left" | "right"
 * - size: diámetro (px)
 * - active: true => flecha apuntando hacia adentro, false => flecha apuntando hacia afuera
 * - onClick: handler
 */
export default function CircleButton({
  side = "right",
  size = 32,
  title = "",
  active = false,
  onClick,
  style
}) {
  const offset = Math.round(size * 0.56);

  const btnStyle = {
    position: "absolute",
    [side]: -offset,
    top: "50%",
    transform: "translateY(-50%)",
    width: size,
    height: size,
    aspectRatio: "1 / 1",
    lineHeight: 0,
    padding: 0,
    borderRadius: "50%",
    border: `2px solid ${active ? '#1976d2' : '#cbd5e1'}`,
    background: active ? '#1976d2' : '#fff',
    color: active ? '#fff' : '#475569',
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    userSelect: "none",
    boxSizing: "border-box",
    appearance: "none",
    zIndex: 50,
    pointerEvents: "auto",
    // ✅ Transición suave de la flecha y del color
    transition: 'all 0.3s ease',
    ...style
  };

  const sizeIcon = Math.round(size * 0.5);

  // Determinar la dirección de la flecha basado en side y active
  // side="right" (ascendencia): 
  //   - active=false (expandir): flecha hacia la derecha →
  //   - active=true (contraer): flecha hacia la izquierda ←
  // side="left" (descendencia):
  //   - active=false (expandir): flecha hacia la izquierda ←
  //   - active=true (contraer): flecha hacia la derecha →
  
  let arrowPath;
  if (side === "right") {
    // Botón derecho (ascendencia)
    arrowPath = active 
      ? "M15 19l-7-7 7-7" // ← (contraer)
      : "M9 5l7 7-7 7";   // → (expandir)
  } else {
    // Botón izquierdo (descendencia)
    arrowPath = active 
      ? "M9 5l7 7-7 7"    // → (contraer)
      : "M15 19l-7-7 7-7"; // ← (expandir)
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={title || (active ? "Contraer" : "Expandir")}
      title={title}
      style={btnStyle}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(e);
      }}
    >
      <svg 
        width={sizeIcon} 
        height={sizeIcon} 
        viewBox="0 0 24 24" 
        aria-hidden="true"
        style={{ transition: 'transform 0.3s ease' }}
      >
        <path 
          d={arrowPath}
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}