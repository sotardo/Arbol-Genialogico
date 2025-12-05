// src/components/PersonCard.jsx
import React from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
};

const formatYear = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.getFullYear();
};

export default function PersonCard({
  persona,
  onClick,
  isRoot = false,
  variant = "fs-compact",
  style = {},
}) {
  if (!persona) return null;

  const avatar = imgSrc(persona.avatarUrl);
  const nombre = persona.nombre || "Sin nombre";
  const sexo = persona.sexo;
  const codigo = persona.codigo || "";

  // Años de vida
  const birthYear = formatYear(persona.nacimiento);
  const deathYear = formatYear(persona.fallecimiento);
  const isLiving = persona.vpirivr || persona.vivo;

  let lifespan = "";
  if (birthYear) {
    if (deathYear) {
      lifespan = `${birthYear}–${deathYear}`;
    } else if (isLiving) {
      lifespan = `${birthYear}–Viva`;
    } else {
      lifespan = `${birthYear}–`;
    }
  }

  // Colores según sexo (estilo FamilySearch)
  const genderColors = {
    M: {
      bar: "#3b82f6",
      barLight: "#60a5fa",
      bg: "#dbeafe",
      text: "#1d4ed8",
      symbol: "♂",
    },
    F: {
      bar: "#ec4899",
      barLight: "#f472b6",
      bg: "#fce7f3",
      text: "#be185d",
      symbol: "♀",
    },
    default: {
      bar: "#9ca3af",
      barLight: "#d1d5db",
      bg: "#f3f4f6",
      text: "#6b7280",
      symbol: "?",
    },
  };

  const colors = genderColors[sexo] || genderColors.default;

  // Estilo compacto FamilySearch
  if (variant === "fs-compact") {
    return (
      <div
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "#ffffff",
          cursor: onClick ? "pointer" : "default",
          transition: "background 0.15s ease",
          position: "relative",
          overflow: "hidden",
          ...style,
        }}
        onMouseEnter={(e) => {
          if (onClick) e.currentTarget.style.background = "#fafbfc";
        }}
        onMouseLeave={(e) => {
          if (onClick) e.currentTarget.style.background = "#ffffff";
        }}
      >
        {/* Barra de color lateral */}
        <div
          style={{
            width: 4,
            background: `linear-gradient(180deg, ${colors.bar} 0%, ${colors.barLight} 100%)`,
            flexShrink: 0,
          }}
        />

        {/* Contenido */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 14px",
            minWidth: 0,
          }}
        >
          {/* Avatar */}
          {avatar ? (
            <img
              src={avatar}
              alt={nombre}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                border: `2px solid ${colors.bg}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: colors.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 600,
                color: colors.text,
                flexShrink: 0,
                border: `2px solid ${colors.bg}`,
              }}
            >
              {colors.symbol}
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Nombre */}
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#1f2937",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}
            >
              {nombre}
            </div>

            {/* Fechas y código */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 3,
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              {lifespan && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ opacity: 0.6 }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {lifespan}
                </span>
              )}
              {lifespan && codigo && (
                <span style={{ color: "#d1d5db" }}>•</span>
              )}
              {codigo && (
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 10,
                    color: "#9ca3af",
                    background: "#f3f4f6",
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontWeight: 500,
                  }}
                >
                  {codigo}
                </span>
              )}
            </div>
          </div>

          {/* Indicador root */}
          {isRoot && (
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#10b981",
                flexShrink: 0,
                boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)",
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Variante por defecto (tarjeta completa)
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "#ffffff",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        overflow: "hidden",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
          e.currentTarget.style.borderColor = "#d1d5db";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
          e.currentTarget.style.borderColor = "#e5e7eb";
        }
      }}
    >
      {/* Barra de color lateral */}
      <div
        style={{
          width: 6,
          background: `linear-gradient(180deg, ${colors.bar} 0%, ${colors.barLight} 100%)`,
          flexShrink: 0,
        }}
      />

      {/* Contenido */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 18px",
          minWidth: 0,
        }}
      >
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={nombre}
            style={{
              width: 55,
              height: 55,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              border: `3px solid ${colors.bg}`,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 600,
              color: colors.text,
              flexShrink: 0,
              border: `3px solid ${colors.bg}`,
            }}
          >
            {colors.symbol}
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nombre */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#1f2937",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
            }}
          >
            {nombre}
          </div>

          {/* Fechas y código */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 5,
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            {lifespan && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ opacity: 0.7 }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {lifespan}
              </span>
            )}
            {lifespan && codigo && <span style={{ color: "#d1d5db" }}>•</span>}
            {codigo && (
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 12,
                  color: "#9ca3af",
                  background: "#f3f4f6",
                  padding: "3px 8px",
                  borderRadius: 5,
                  fontWeight: 500,
                }}
              >
                {codigo}
              </span>
            )}
          </div>
        </div>

        {/* Indicador root */}
        {isRoot && (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#10b981",
              flexShrink: 0,
              boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.2)",
            }}
          />
        )}
      </div>
    </div>
  );
}