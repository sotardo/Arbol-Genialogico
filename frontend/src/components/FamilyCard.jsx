// src/components/FamilyCard.jsx - SIMPLIFICADO (CSS zoom en FamilyCanvas maneja el renderizado)
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CirclePlus, Users, ChevronDown, Check } from "lucide-react";
import PersonCard from "./PersonCard";
import { useTranslation } from "react-i18next";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
};

export default function FamilyCard({
  persona,
  conyuge = null,
  hijos = [],
  onPersonClick,
  layout = "horizontal",
  isRoot = false,
  leftControl = null,
  rightControl = null,
  controlSize = 32,
  isEmpty = false,
  onAgregarPadre = null,
  onAgregarMadre = null,
  onAgregarConyuge = null,
  targetPersonId = null,
  todosConyuges = [],
  conyugeActivo = null,
  onCambiarConyuge = null,
  hijosFilteredByUnion = null,
}) {
  const [showHijosList, setShowHijosList] = useState(false);
  const [showConyugeSelector, setShowConyugeSelector] = useState(false);
  const { t } = useTranslation('tree');
  const footerRef = useRef(null);
  const conyugeSelectorRef = useRef(null);
  const dropdownRef = useRef(null);

  const [dropdownPos, setDropdownPos] = useState(null);
  const [conyugeDropdownPos, setConyugeDropdownPos] = useState(null);

  const CARD_W = 300;
  const ROW_H = 64;
  const FOOTER_H = 40;
  const CARD_H = ROW_H * 2 + FOOTER_H + 8;
  const BORDER_RADIUS = 10;

  const ctrlTop = ROW_H - controlSize / 2;
  const ctrlOffset = Math.round(controlSize * 0.56);

  const hijosToShow =
    hijosFilteredByUnion !== null ? hijosFilteredByUnion : hijos;
  const tieneMultiplesConyuges = todosConyuges.length > 1;

  const conyugeActivoNorm = conyugeActivo ? String(conyugeActivo) : null;

const hijosLabel = useMemo(() => {
  const n = hijosToShow?.length ?? 0;
  return n > 0 ? `${t('card.children')} (${n})` : t('card.children');
}, [hijosToShow, t]);

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

  useEffect(() => {
    if (showConyugeSelector && conyugeSelectorRef.current) {
      const rect = conyugeSelectorRef.current.getBoundingClientRect();
      setConyugeDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
      });
    }
  }, [showConyugeSelector]);

  useEffect(() => {
    if (!showConyugeSelector) return;

    const handleClickOutside = (e) => {
      const inButton = conyugeSelectorRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);

      if (!inButton && !inDropdown) {
        setShowConyugeSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConyugeSelector]);

  const handleConyugeSelect = (selectedConyuge) => {
    const selectedId = String(selectedConyuge._id);
    const currentId = conyugeActivoNorm;

    setShowConyugeSelector(false);

    if (selectedId !== currentId) {
      if (typeof onCambiarConyuge === "function") {
        onCambiarConyuge(persona._id, selectedId);
      }
    }
  };

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
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAgregarPadre?.(targetPersonId, "M");
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ecfeff")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          <div
            style={{
              width: 4,
              height: "100%",
              background: "#0891b2",
              borderTopLeftRadius: BORDER_RADIUS,
              flexShrink: 0,
            }}
          />
          <CirclePlus size={22} strokeWidth={1.5} />
          {t('card.addFather')}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAgregarMadre?.(targetPersonId, "F");
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf2f8")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          <div
            style={{
              width: 4,
              height: "100%",
              background: "#db2777",
              borderBottomLeftRadius: BORDER_RADIUS,
              flexShrink: 0,
            }}
          />
          <CirclePlus size={22} strokeWidth={1.5} />
          {t('card.addMother')}
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
          position: "relative",
          
        }}
      >
        {leftControl && (
          <div
            style={{
              position: "absolute",
              top: ctrlTop,
              left: -ctrlOffset,
              zIndex: 50,
            }}
          >
            {React.cloneElement(leftControl, {
              size: controlSize,
              style: {
                position: "static",
                left: "auto",
                right: "auto",
                top: "auto",
                transform: "none",
              },
            })}
          </div>
        )}

        {rightControl && (
          <div
            style={{
              position: "absolute",
              top: ctrlTop,
              right: -ctrlOffset,
              zIndex: 50,
            }}
          >
            {React.cloneElement(rightControl, {
              size: controlSize,
              style: {
                position: "static",
                left: "auto",
                right: "auto",
                top: "auto",
                transform: "none",
              },
            })}
          </div>
        )}

        {/* PERSONA PRINCIPAL */}
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
            borderBottom: "1px solid #f1f5f9",
          }}
        />

        {/* CÓNYUGE CON SELECTOR DE MÚLTIPLES MATRIMONIOS */}
        {conyuge ? (
          <div style={{ position: "relative" }}>
            <PersonCard
              persona={conyuge}
              onClick={
                onPersonClick ? () => onPersonClick(conyuge._id) : undefined
              }
              layout={layout}
              variant="fs-compact"
              style={{
                height: ROW_H,
                borderRadius: 0,
                borderBottom: "1px solid #f1f5f9",
                paddingRight: tieneMultiplesConyuges ? 40 : 0,
              }}
            />

            {/* BOTÓN DE MÚLTIPLES CÓNYUGES */}
            {tieneMultiplesConyuges && (
              <div
                ref={conyugeSelectorRef}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 8,
                  transform: "translateY(-50%)",
                  zIndex: 10,
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowConyugeSelector((prev) => !prev);
                  }}
                  title="Cambiar cónyuge visualizado"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: "4px 6px",
                    background: showConyugeSelector ? "#e0f2fe" : "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    
                  }}
                  onMouseEnter={(e) => {
                    if (!showConyugeSelector) {
                      e.currentTarget.style.background = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showConyugeSelector) {
                      e.currentTarget.style.background = "#f8fafc";
                    }
                  }}
                >
                  <Users size={14} strokeWidth={2} color="#64748b" />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#64748b",
                      minWidth: 14,
                      textAlign: "center",
                    }}
                  >
                    {todosConyuges.length}
                  </span>
                  <ChevronDown
                    size={12}
                    strokeWidth={2}
                    color="#94a3b8"
                    style={{
                      transform: showConyugeSelector
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (typeof onAgregarConyuge === "function") {
                const hijosIds = (hijos || []).map((h) => h._id).filter(Boolean);
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
              padding: 0,
              
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf2f8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
          >
            <div
              style={{
                width: 4,
                height: "100%",
                background: "#db2777",
                flexShrink: 0,
              }}
            />
            <CirclePlus size={22} strokeWidth={1.5} />
            {t('card.addSpouse')}
          </button>
        )}

        {/* FOOTER CON BOTÓN DE HIJOS */}
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
            disabled={!hijosToShow || hijosToShow.length === 0}
            onClick={() => setShowHijosList(!showHijosList)}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              color: hijosToShow?.length ? "#374151" : "#9ca3af",
              padding: "0 12px",
              outline: "none",
              fontSize: 12,
              cursor: hijosToShow?.length ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 500,
              transition: "all 0.15s ease",
              
            }}
            onMouseEnter={(e) => {
              if (hijosToShow?.length) {
                e.currentTarget.style.background = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              if (hijosToShow?.length) {
                e.currentTarget.style.background = "#fafafa";
              }
            }}
          >
            <span>{hijosLabel}</span>
            {hijosToShow?.length > 0 && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: showHijosList ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* DROPDOWN DE SELECTOR DE CÓNYUGES */}
      {showConyugeSelector &&
        tieneMultiplesConyuges &&
        conyugeDropdownPos &&
        createPortal(
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setShowConyugeSelector(false);
              }}
            />

            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: conyugeDropdownPos.top,
                left: conyugeDropdownPos.left,
                width: conyugeDropdownPos.width,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                maxHeight: 300,
                overflowY: "auto",
                zIndex: 9999,
              }}
            >
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
                  gap: 6,
                }}
              >
                <Users size={14} />
                <span>{t('card.selectSpouse')}</span>
              </div>

              {todosConyuges.map((c, index) => {
                const cId = String(c._id);
                const isSelected = conyugeActivoNorm
                  ? cId === conyugeActivoNorm
                  : index === 0;

                const avatar = imgSrc(c.avatarUrl);
                const fechas = [];
                if (c.nacimiento) fechas.push(new Date(c.nacimiento).getFullYear());
                if (c.fallecimiento) fechas.push(new Date(c.fallecimiento).getFullYear());
                const vidaInfo = fechas.length > 0 ? fechas.join("–") : "";
                const sexoColor =
                  c.sexo === "M" ? "#0891b2" : c.sexo === "F" ? "#db2777" : "#6b7280";
                const sexoBg =
                  c.sexo === "M" ? "#cffafe" : c.sexo === "F" ? "#fce7f3" : "#f3f4f6";
                const isLast = index === todosConyuges.length - 1;

                return (
                  <div
                    key={c._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConyugeSelect(c);
                    }}
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      borderBottom: isLast ? "none" : "1px solid #f3f4f6",
                      transition: "background 0.15s ease",
                      background: isSelected ? "#eff6ff" : "#ffffff",
                      borderBottomLeftRadius: isLast ? 10 : 0,
                      borderBottomRightRadius: isLast ? 10 : 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#fafafa";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected
                        ? "#eff6ff"
                        : "#ffffff";
                    }}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={c.nombre}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                          border: isSelected
                            ? "2px solid #3b82f6"
                            : "2px solid transparent",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: sexoBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 600,
                          color: sexoColor,
                          flexShrink: 0,
                          border: isSelected
                            ? "2px solid #3b82f6"
                            : "2px solid transparent",
                        }}
                      >
                        {c.sexo === "M" ? "♂" : c.sexo === "F" ? "♀" : "?"}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isSelected ? "#1e40af" : "#1f2937",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.3,
                        }}
                      >
                        {c.nombre}
                      </div>
                      {vidaInfo && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          {vidaInfo}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={16} strokeWidth={2.5} color="#3b82f6" />
                    )}
                  </div>
                );
              })}
            </div>
          </>,
          document.body
        )}

      {/* DROPDOWN DE HIJOS */}
      {showHijosList &&
        hijosToShow?.length > 0 &&
        dropdownPos &&
        createPortal(
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
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
                zIndex: 9999,
              }}
            >
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
                  justifyContent: "space-between",
                }}
              >
<span>
  {t('card.children')}
  {tieneMultiplesConyuges && conyuge && (
    <span
      style={{
        fontWeight: 400,
        color: "#6b7280",
        marginLeft: 4,
      }}
    >
      {t('card.withSpouse', { name: conyuge.nombre?.split(" ")[0] })}
    </span>
  )}
</span>
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
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#6b7280")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                >
                  ✕
                </button>
              </div>

              {hijosToShow.map((hijo, index) => {
                const avatar = imgSrc(hijo.avatarUrl);
                const fechas = [];
                if (hijo.nacimiento) fechas.push(new Date(hijo.nacimiento).getFullYear());
                if (hijo.fallecimiento) fechas.push(new Date(hijo.fallecimiento).getFullYear());
                const vidalInfo = fechas.length > 0 ? fechas.join("–") : "";
                const codigoInfo = hijo.codigo || "";
                const isLast = index === hijosToShow.length - 1;
                const sexoColor =
                  hijo.sexo === "M" ? "#0891b2" : hijo.sexo === "F" ? "#db2777" : "#6b7280";
                const sexoBg =
                  hijo.sexo === "M" ? "#cffafe" : hijo.sexo === "F" ? "#fce7f3" : "#f3f4f6";

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
                      borderBottomRightRadius: isLast ? 10 : 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
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
                        {hijo.sexo === "M" ? "♂" : hijo.sexo === "F" ? "♀" : "?"}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1f2937",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.3,
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
                            gap: 6,
                          }}
                        >
                          {vidalInfo && <span>{vidalInfo}</span>}
                          {vidalInfo && codigoInfo && (
                            <span style={{ color: "#d1d5db" }}>•</span>
                          )}
                          {codigoInfo && (
                            <span style={{ fontFamily: "monospace", fontSize: 10 }}>
                              {codigoInfo}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </>
  );
}