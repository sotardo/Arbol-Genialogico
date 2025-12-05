// src/components/FamilyCard.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PersonCard from "./PersonCard";

// Estilo FamilySearch
const shadow = "0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)";
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API}${url}`;
};

export default function FamilyCard({
  persona,
  conyuge = null,
  hijos = [],
  onPersonClick,
  layout = "horizontal",
  isRoot = false,

  // controles y tamaño
  leftControl = null,
  rightControl = null,
  controlSize = 32,
  
  // grupos vacíos
  isEmpty = false,
  onAgregarPadre = null,
  onAgregarMadre = null,
  onAgregarConyuge = null,
  targetPersonId = null
}) {
  const [showHijosList, setShowHijosList] = useState(false);

  const footerRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  // Dimensiones estilo FamilySearch (más anchas, altura compacta)
  const CARD_W = 300;
  const ROW_H = 64;
  const FOOTER_H = 40;
  const CARD_H = ROW_H * 2 + FOOTER_H + 8;
  const BORDER_RADIUS = 12;

  const ctrlTop = ROW_H - controlSize / 2;
  const ctrlOffset = Math.round(controlSize * 0.56);

  const hijosLabel = useMemo(() => {
    const n = hijos?.length ?? 0;
    return n > 0 ? `Hijos (${n})` : "Hijos";
  }, [hijos]);

  useEffect(() => {
    if (showHijosList && footerRef.current) {
      const rect = footerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left - 8,
        width: rect.width + 16,
      });
    }
  }, [showHijosList]);

  // === Grupo vacío: solo botones agregar padre/madre ===
  if (isEmpty) {
    return (
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          background: "#fafbfc",
          borderRadius: BORDER_RADIUS,
          boxShadow: shadow,
          border: "2px dashed #d1d5db",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* Botón AGREGAR PADRE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAgregarPadre?.(targetPersonId, 'M');
          }}
          style={{
            height: ROW_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
            cursor: "pointer",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "#2563eb",
            transition: "all 0.2s ease",
            width: "100%"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
        >
          <span style={{ 
            fontSize: 16, 
            width: 24, 
            height: 24, 
            borderRadius: "50%", 
            background: "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>+</span>
          Agregar padre
        </button>

        {/* Botón AGREGAR MADRE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAgregarMadre?.(targetPersonId, 'F');
          }}
          style={{
            height: ROW_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
            cursor: "pointer",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "#db2777",
            transition: "all 0.2s ease",
            width: "100%"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#fdf2f8"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
        >
          <span style={{ 
            fontSize: 16, 
            width: 24, 
            height: 24, 
            borderRadius: "50%", 
            background: "#fce7f3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>+</span>
          Agregar madre
        </button>

        {/* Footer vacío */}
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            color: "#9ca3af",
            fontSize: 12,
            fontWeight: 500
          }}
        >
          Sin padres registrados
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          background: "#ffffff",
          borderRadius: BORDER_RADIUS,
          boxShadow: shadow,
          border: "1px solid #e5e7eb",
          overflow: "visible",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* Botón IZQUIERDO (descendencia) */}
        {leftControl && (
          <div
            style={{
              position: "absolute",
              top: ctrlTop,
              left: -ctrlOffset,
              zIndex: 50
            }}
          >
            {React.cloneElement(leftControl, {
              size: controlSize,
              style: {
                position: "static",
                left: "auto",
                right: "auto",
                top: "auto",
                transform: "none"
              }
            })}
          </div>
        )}

        {/* Botón DERECHO (ascendencia) */}
        {rightControl && (
          <div
            style={{
              position: "absolute",
              top: ctrlTop,
              right: -ctrlOffset,
              zIndex: 50
            }}
          >
            {React.cloneElement(rightControl, {
              size: controlSize,
              style: {
                position: "static",
                left: "auto",
                right: "auto",
                top: "auto",
                transform: "none"
              }
            })}
          </div>
        )}

        {/* Persona principal */}
        <PersonCard
          persona={persona}
          isRoot={isRoot}
          onClick={onPersonClick ? () => onPersonClick(persona._id) : undefined}
          layout={layout}
          variant="fs-compact"
          style={{
            height: ROW_H,
            borderRadius: 0,
            borderTopLeftRadius: BORDER_RADIUS,
            borderTopRightRadius: BORDER_RADIUS,
            borderBottom: "1px solid #f1f5f9"
          }}
        />

        {/* Cónyuge o botón agregar cónyuge */}
        {conyuge ? (
          <PersonCard
            persona={conyuge}
            onClick={onPersonClick ? () => onPersonClick(conyuge._id) : undefined}
            layout={layout}
            variant="fs-compact"
            style={{
              height: ROW_H,
              borderRadius: 0,
              borderBottom: "1px solid #f1f5f9"
            }}
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (typeof onAgregarConyuge === 'function') {
                const hijosIds = (hijos || []).map(h => h._id).filter(Boolean);
                onAgregarConyuge(persona._id, persona.nombre, hijosIds);
              }
            }}
            style={{
              height: ROW_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderBottom: "1px solid #f1f5f9",
              background: "#ffffff",
              cursor: "pointer",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "#db2777",
              transition: "all 0.2s ease",
              width: "100%"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#fdf2f8"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
          >
            <span style={{ 
              fontSize: 16, 
              width: 24, 
              height: 24, 
              borderRadius: "50%", 
              background: "#fce7f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>+</span>
            Agregar cónyuge
          </button>
        )}

        {/* FOOTER: botón hijos */}
        <div
          ref={footerRef}
          style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "stretch",
            background: "#ffffff",
            borderBottomLeftRadius: BORDER_RADIUS,
            borderBottomRightRadius: BORDER_RADIUS,
            position: "relative"
          }}
        >
          <button
            disabled={!hijos || hijos.length === 0}
            onClick={() => setShowHijosList(!showHijosList)}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: hijos?.length ? "#f8fafc" : "#fafafa",
              color: hijos?.length ? "#374151" : "#9ca3af",
              padding: "0 12px",
              outline: "none",
              fontSize: 12,
              cursor: hijos?.length ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (hijos?.length) {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }
            }}
            onMouseLeave={(e) => {
              if (hijos?.length) {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }
            }}
          >
            <span>{hijosLabel}</span>
            {hijos?.length > 0 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ 
                transform: showHijosList ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}>
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown GLOBAL usando portal */}
      {showHijosList && hijos?.length > 0 && dropdownPos &&
        createPortal(
          <>
            {/* Overlay pantalla completa */}
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998
              }}
              onClick={() => setShowHijosList(false)}
            />
            
            {/* Caja del dropdown */}
            <div
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                maxHeight: 260,
                overflowY: "auto",
                zIndex: 9999
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#f8fafc",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>Hijos</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHijosList(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    color: "#9ca3af",
                    padding: "2px 6px",
                    borderRadius: 6,
                    lineHeight: 1,
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.color = "#6b7280";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.color = "#9ca3af";
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Lista de hijos */}
              {hijos.map((hijo, index) => {
                const avatar = imgSrc(hijo.avatarUrl);
                const fechas = [];
                if (hijo.nacimiento) {
                  const year = new Date(hijo.nacimiento).getFullYear();
                  fechas.push(year);
                }
                if (hijo.fallecimiento) {
                  const year = new Date(hijo.fallecimiento).getFullYear();
                  fechas.push(year);
                }
                const vidalInfo = fechas.length > 0 ? fechas.join('–') : '';
                const codigoInfo = hijo.codigo || '';
                const isLast = index === hijos.length - 1;

                return (
                  <div
                    key={hijo._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHijosList(false);
                      onPersonClick?.(hijo._id);
                    }}
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      borderBottom: isLast ? "none" : "1px solid #f3f4f6",
                      transition: "background 0.15s ease",
                      background: "#ffffff",
                      borderBottomLeftRadius: isLast ? 12 : 0,
                      borderBottomRightRadius: isLast ? 12 : 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                  >
                    {/* Avatar */}
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={hijo.nombre}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                          border: "2px solid #f1f5f9"
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: hijo.sexo === 'M' ? '#dbeafe' : hijo.sexo === 'F' ? '#fce7f3' : '#f3f4f6',
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 600,
                          color: hijo.sexo === 'M' ? '#2563eb' : hijo.sexo === 'F' ? '#db2777' : '#6b7280',
                          flexShrink: 0,
                          border: "2px solid #f1f5f9"
                        }}
                      >
                        {hijo.sexo === 'M' ? '♂' : hijo.sexo === 'F' ? '♀' : '?'}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1f2937",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.3
                        }}
                      >
                        {hijo.nombre}
                      </div>
                      {(vidalInfo || codigoInfo) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                            marginTop: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                          }}
                        >
                          {vidalInfo && (
                            <span style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: 4 
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              {vidalInfo}
                            </span>
                          )}
                          {vidalInfo && codigoInfo && <span style={{ color: "#d1d5db" }}>•</span>}
                          {codigoInfo && <span style={{ fontFamily: "monospace", fontSize: 11 }}>{codigoInfo}</span>}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                );
              })}
            </div>
          </>,
          document.body
        )
      }
    </>
  );
}