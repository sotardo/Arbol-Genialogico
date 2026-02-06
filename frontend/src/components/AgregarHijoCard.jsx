import React from "react";
import { CirclePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AgregarHijoCard({ onAgregarHijo, personaId, personaNombre }) {
  const { t } = useTranslation("tree");

  const CARD_W = 300;
  const ROW_H = 64;
  const BORDER_RADIUS = 10;

  return (
    <div
      style={{
        width: CARD_W,
        height: ROW_H,
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
          if (typeof onAgregarHijo === "function") {
            onAgregarHijo(personaId, personaNombre);
          }
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
          color: "#10b981",
          transition: "background 0.15s ease",
          width: "100%",
          padding: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#ecfdf5")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
      >
        <div
          style={{
            width: 4,
            height: "100%",
            background: "#10b981",
            borderTopLeftRadius: BORDER_RADIUS,
            borderBottomLeftRadius: BORDER_RADIUS,
            flexShrink: 0,
          }}
        />
        <CirclePlus size={22} strokeWidth={1.5} />
        {t("card.addChild")}
      </button>
    </div>
  );
}
