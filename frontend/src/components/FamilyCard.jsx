// src/components/FamilyCard.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PersonCard from "./PersonCard";

const shadow = "0 6px 16px rgba(0,0,0,0.15)";
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

  // 👉 NUEVO: ref al footer y posición para el dropdown global
  const footerRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  // Alturas fijas
  const CARD_W = 240;
  const ROW_H = 64;
  const FOOTER_H = 40;
  const CARD_H = ROW_H * 2 + FOOTER_H + 10;

  const ctrlTop = ROW_H - controlSize / 2;
  const ctrlOffset = Math.round(controlSize * 0.56);

  const hijosLabel = useMemo(() => {
    const n = hijos?.length ?? 0;
    return n > 0 ? `Hijos (${n})` : "Hijos";
  }, [hijos]);

  // 👉 Calculamos posición del dropdown cuando se abre
  useEffect(() => {
    if (showHijosList && footerRef.current) {
      const rect = footerRef.current.getBoundingClientRect();
      setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left - 12,      // antes: rect.left + 8
      width: rect.width + 24,    // antes: rect.width - 16
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
          background: "#f8fafc",
          borderRadius: 10,
          boxShadow: shadow,
          border: "2px dashed #cbd5e0",
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
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "#3b82f6",
            transition: "all 0.2s",
            width: "100%"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
        >
          <span style={{ fontSize: 18 }}>+</span>
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
            justifyContent: "center",
            gap: 8,
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "#ec4899",
            transition: "all 0.2s",
            width: "100%"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#fdf2f8"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
        >
          <span style={{ fontSize: 18 }}>+</span>
          AGREGAR MADRE
        </button>

        {/* Footer vacío */}
        <div
          style={{
            padding: 8,
            paddingTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            color: "#94a3b8",
            fontSize: 11
          }}
        >
          Sin relación padre/madre
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
          borderRadius: 10,
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
              color: "#ec4899",
              transition: "all 0.2s",
              width: "100%"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#fdf2f8"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
          >
            <span style={{ fontSize: 18 }}>+</span>
            AGREGAR CÓNYUGE
          </button>
        )}

        {/* FOOTER: botón hijos */}
        <div
          ref={footerRef}
          style={{
            padding: 8,
            paddingTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "stretch",
            background: "#ffffff",
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
              background: "#f8fafc",
              color: "#334155",
              padding: "0 10px",
              outline: "none",
              fontSize: 12,
              cursor: hijos?.length ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 500
            }}
          >
            <span>{hijosLabel}</span>
            {hijos?.length > 0 && (
              <span style={{ fontSize: 10 }}>▼</span>
            )}
          </button>
        </div>
      </div>

      {/* 👉 Dropdown GLOBAL, por encima de TODO usando portal */}
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
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                maxHeight: 240,
                overflowY: "auto",
                zIndex: 9999,
                fontSize: 11 
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#f8fafc",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
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
                    color: "#94a3b8",
                    padding: 0,
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Lista de hijos */}
              {hijos.map((hijo) => {
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
                const vidalInfo = fechas.length > 0 ? fechas.join('-') : '';
                const codigoInfo = hijo.codigo || '';

                return (
                  <div
                    key={hijo._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHijosList(false);
                      onPersonClick?.(hijo._id);
                    }}
                    style={{
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      borderBottom: "1px solid #f8fafc",
                      transition: "background 0.2s",
                      background: "#ffffff"
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
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                          border: "2px solid #f1f5f9"
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: hijo.sexo === 'M' ? '#dbeafe' : hijo.sexo === 'F' ? '#fce7f3' : '#f3f4f6',
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 600,
                          color: hijo.sexo === 'M' ? '#3b82f6' : hijo.sexo === 'F' ? '#ec4899' : '#6b7280',
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
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {hijo.nombre}
                      </div>
                      {(vidalInfo || codigoInfo) && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            marginTop: 2
                          }}
                        >
                          {vidalInfo && <span>{vidalInfo}</span>}
                          {vidalInfo && codigoInfo && <span> • </span>}
                          {codigoInfo && <span>{codigoInfo}</span>}
                        </div>
                      )}
                    </div>
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
