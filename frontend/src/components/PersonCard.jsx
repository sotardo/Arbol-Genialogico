// src/components/PersonCard.jsx
import React from "react";

export default function PersonCard({
  persona,
  isRoot = false,
  onClick,
  layout = "horizontal",
  style = {},
  variant = "default", // <-- NUEVO: "default" | "fs-compact"
}) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // --- Helpers de color y datos ---
  const sexColor = persona.sexo === "M"
    ? "#34A1BC" // azul FamilySearch-like
    : persona.sexo === "F"
    ? "#e91e63" // magenta FamilySearch-like
    : "#9e9e9e";

  const getYears = () => {
    const birth = persona.nacimiento ? new Date(persona.nacimiento).getFullYear() : null;
    const death = persona.fallecimiento ? new Date(persona.fallecimiento).getFullYear() : null;
    if (birth && death) return `${birth}-${death}`;
    if (birth) return `${birth}-`;
    return "";
  };

  const living = !persona.fallecimiento && persona.nacimiento ? "Viva" : undefined; // puedes ajustar a "Vivo/Viva"
  const secondLine = [getYears(), living].filter(Boolean).join(" · ");

  // Avatar (para variant default)
  const avatarUrl = persona.avatarUrl ? `${API_URL}${persona.avatarUrl}` : null;

  // ---------- VARIANTE FAMILYSEARCH (compacta, sin avatar) ----------
  if (variant === "fs-compact") {
    return (
      <div
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          background: "#ffffff",
          cursor: onClick ? "pointer" : "default",
          transition: "background 0.15s ease, box-shadow 0.15s ease",
          ...style,
          // Borde fino y banda vertical de color a la izquierda
          borderLeft: `4px solid ${sexColor}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f8fafc";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#ffffff";
        }}
      >
        {/* Textos */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            title={persona.nombre}
            style={{
              fontSize: 13,
              fontWeight: isRoot ? 700 : 600,
              color: "#0f172a",
              lineHeight: 1.15,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {persona.nombre}
          </div>

          <div
            style={{
              marginTop: 2,
              fontSize: 11,
              color: "#64748b",
              display: "flex",
              gap: 6,
              alignItems: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {/* símbolo sexo + años + estado */}
            <span>{persona.sexo === "M" ? "♂" : persona.sexo === "F" ? "♀" : "⚬"}</span>
            {secondLine && <span>{secondLine}</span>}
            {/* Código opcional si lo tuvieras (ej. persona.codigoFS) */}
            {persona.codigoFS && (
              <>
                <span>·</span>
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {persona.codigoFS}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- VARIANTE ORIGINAL (tu diseño con avatar) ----------
  // Colores según sexo
  const getColors = () => {
    if (persona.sexo === "M") {
      return { backgroundColor: "#e8f4fd", borderColor: "#2196f3" };
    } else if (persona.sexo === "F") {
      return { backgroundColor: "#fce4ec", borderColor: "#e91e63" };
    } else {
      return { backgroundColor: "#f5f5f5", borderColor: "#9e9e9e" };
    }
  };
  const colors = getColors();
  const borderWidth = isRoot ? "3px" : "2px";

  const cardStyle = {
    border: `${borderWidth} solid ${colors.borderColor}`,
    backgroundColor: colors.backgroundColor,
    borderRadius: "8px",
    padding: layout === "vertical" ? "12px 8px" : "8px",
    fontSize: "11px",
    color: "#000000",
    display: "flex",
    flexDirection: layout === "vertical" ? "column" : "row",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: isRoot
      ? "0 4px 12px rgba(0,0,0,0.25)"
      : "0 2px 8px rgba(0,0,0,0.15)",
    cursor: onClick ? "pointer" : "default",
    transition: "transform 0.2s, box-shadow 0.2s",
    gap: layout === "vertical" ? "8px" : "10px",
    ...style,
  };

  const handleMouseEnter = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = "scale(1.05)";
      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)";
    }
  };
  const handleMouseLeave = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow = isRoot
        ? "0 4px 12px rgba(0,0,0,0.25)"
        : "0 2px 8px rgba(0,0,0,0.15)";
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Avatar */}
      <div
        style={{
          width: layout === "vertical" ? "50px" : "40px",
          height: layout === "vertical" ? "50px" : "40px",
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: "#ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={persona.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          style={{
            display: avatarUrl ? "none" : "flex",
            fontSize: layout === "vertical" ? "18px" : "14px",
            fontWeight: "bold",
            color: getColors().borderColor,
          }}
        >
          {persona.nombre?.charAt(0) || "?"}
        </div>
      </div>

      {/* Información */}
      <div style={{ flex: 1, textAlign: layout === "vertical" ? "center" : "left", minWidth: 0 }}>
        <div
          style={{
            fontWeight: isRoot ? "bold" : "normal",
            lineHeight: "1.2",
            marginBottom: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: layout === "vertical" ? "normal" : "nowrap",
          }}
        >
          {persona.nombre}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "#666",
            display: "flex",
            alignItems: "center",
            justifyContent: layout === "vertical" ? "center" : "flex-start",
            gap: "4px",
          }}
        >
          <span>{persona.sexo === "M" ? "♂" : persona.sexo === "F" ? "♀" : "⚬"}</span>
          {getYears() && <span>{getYears()}</span>}
        </div>
      </div>
    </div>
  );
}

// Helper público
export const createCustomCardStyle = (overrides) => ({
  borderRadius: "8px",
  padding: "8px",
  fontSize: "11px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  ...overrides,
});
