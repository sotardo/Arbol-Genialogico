// src/components/PersonCard.jsx - SIMPLIFICADO (CSS zoom en FamilyCanvas maneja el renderizado)
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

  const genderColors = {
    M: {
      bar: "#0891b2",
      bg: "#cffafe",
      text: "#0e7490",
      symbol: "♂",
    },
    F: {
      bar: "#db2777",
      bg: "#fce7f3",
      text: "#be185d",
      symbol: "♀",
    },
    default: {
      bar: "#9ca3af",
      bg: "#f3f4f6",
      text: "#6b7280",
      symbol: "?",
    },
  };

  const colors = genderColors[sexo] || genderColors.default;

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
        <div
          style={{
            width: 4,
            background: colors.bar,
            flexShrink: 0,
          }}
        />

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
                
              }}
            >
              {colors.symbol}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 2,
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              {lifespan && (
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
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
                  }}
                >
                  {codigo}
                </span>
              )}
            </div>
          </div>

          {isRoot && (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
        overflow: "hidden",
        
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = "#d1d5db";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = "#e5e7eb";
        }
      }}
    >
      <div
        style={{
          width: 5,
          background: colors.bar,
          flexShrink: 0,
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 16px",
          minWidth: 0,
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={nombre}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              border: `2px solid ${colors.bg}`,
              
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 600,
              color: colors.text,
              flexShrink: 0,
              
            }}
          >
            {colors.symbol}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 3,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {lifespan && <span>{lifespan}</span>}
            {lifespan && codigo && <span style={{ color: "#d1d5db" }}>•</span>}
            {codigo && (
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                {codigo}
              </span>
            )}
          </div>
        </div>

        {isRoot && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}