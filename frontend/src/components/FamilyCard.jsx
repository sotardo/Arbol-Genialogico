// src/components/FamilyCard.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CirclePlus } from "lucide-react";
import PersonCard from "./PersonCard";

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

  // Dimensiones
  const CARD_W = 300;
  const ROW_H = 64;
  const FOOTER_H = 40;
  const CARD_H = ROW_H * 2 + FOOTER_H + 8;
  const BORDER_RADIUS = 10;

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
        top: rect.bottom + 4,
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
          height: ROW_H * 2,
          boxSizing: "border-box",
          background: "#ffffff",
          borderRadius: BORDER_RADIUS,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
            justifyContent: "flex-start",
            gap: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
            cursor: "pointer",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            color: "#0891b2",
            transition: "background 0.15s ease",
            width: "100%",
            padding: 0,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#ecfeff"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
        >
          <div style={{
            width: 4,
            height: "100%",
            background: "#0891b2",
            borderTopLeftRadius: BORDER_RADIUS,
            flexShrink: 0
          }} />
          <CirclePlus size={22} strokeWidth={1.5} />
          AGREGAR PADRE
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
            justifyContent: "flex-start",
            gap: 12,
            background: "#ffffff",
            cursor: "pointer",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            color: "#db2777",
            transition: "background 0.15s ease",
            width: "100%",
            padding: 0,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#fdf2f8"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
        >
          <div style={{
            width: 4,
            height: "100%",
            background: "#db2777",
            borderBottomLeftRadius: BORDER_RADIUS,
            flexShrink: 0
          }} />
          <CirclePlus size={22} strokeWidth={1.5} />
          AGREGAR MADRE
        </button>
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
              justifyContent: "flex-start",
              gap: 12,
              borderBottom: "1px solid #f1f5f9",
              background: "#ffffff",
              cursor: "pointer",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              color: "#db2777",
              transition: "background 0.15s ease",
              width: "100%",
              padding: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#fdf2f8"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
          >
            <div style={{
              width: 4,
              height: "100%",
              background: "#db2777",
              flexShrink: 0
            }} />
            <CirclePlus size={22} strokeWidth={1.5} />
            AGREGAR CÓNYUGE
          </button>
        )}

        {/* FOOTER: botón hijos */}
        <div
          ref={footerRef}
          style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            background: "#ffffff",
            borderBottomLeftRadius: BORDER_RADIUS,
            borderBottomRightRadius: BORDER_RADIUS,
          }}
        >
          <button
            disabled={!hijos || hijos.length === 0}
            onClick={() => setShowHijosList(!showHijosList)}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: hijos?.length ? "#fafafa" : "#fafafa",
              color: hijos?.length ? "#374151" : "#9ca3af",
              padding: "0 12px",
              outline: "none",
              fontSize: 12,
              cursor: hijos?.length ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 500,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              if (hijos?.length) {
                e.currentTarget.style.background = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              if (hijos?.length) {
                e.currentTarget.style.background = "#fafafa";
              }
            }}
          >
            <span>{hijosLabel}</span>
            {hijos?.length > 0 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ 
                transform: showHijosList ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}>
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown usando portal */}
      {showHijosList && hijos?.length > 0 && dropdownPos &&
        createPortal(
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998
              }}
              onClick={() => setShowHijosList(false)}
            />
            
            <div
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                maxHeight: 240,
                overflowY: "auto",
                zIndex: 9999
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#fafafa",
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
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
                    fontSize: 14,
                    color: "#9ca3af",
                    padding: "2px 6px",
                    borderRadius: 4,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#6b7280"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}
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

                // Color según sexo
                const sexoColor = hijo.sexo === 'M' ? '#0891b2' : hijo.sexo === 'F' ? '#db2777' : '#6b7280';
                const sexoBg = hijo.sexo === 'M' ? '#cffafe' : hijo.sexo === 'F' ? '#fce7f3' : '#f3f4f6';

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
                      borderBottomLeftRadius: isLast ? 10 : 0,
                      borderBottomRightRadius: isLast ? 10 : 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
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
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: sexoBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 600,
                          color: sexoColor,
                          flexShrink: 0,
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
                          {vidalInfo && <span>{vidalInfo}</span>}
                          {vidalInfo && codigoInfo && <span style={{ color: "#d1d5db" }}>•</span>}
                          {codigoInfo && <span style={{ fontFamily: "monospace", fontSize: 10 }}>{codigoInfo}</span>}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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