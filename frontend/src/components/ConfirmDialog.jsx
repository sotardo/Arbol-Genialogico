// src/components/ConfirmDialog.jsx
import { X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title = "Confirmar",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  tone = "danger", // 'danger' | 'primary' | 'neutral'
}) {
  if (!open) return null;

  const tones = {
    danger:  { bg: "#ef4444", hover: "#dc2626" },
    primary: { bg: "#3b82f6", hover: "#2563eb" },
    neutral: { bg: "#111827", hover: "#000000" },
  };
  const t = tones[tone] || tones.danger;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 998,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Backdrop con blur suave (estética glassy como en tu header) */}
      <div
        onClick={onCancel}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(17,24,39,0.35)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "relative",
        zIndex: 999,
        width: "95%",
        maxWidth: 480,
        borderRadius: 16,
        background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
        border: "1px solid #e5e7eb",
        boxShadow: "0 18px 60px rgba(0,0,0,0.15)",
        overflow: "hidden",
        transform: "translateY(0)",
        animation: "dlgIn .18s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px",
          background: "linear-gradient(to right, #f9fafb, #ffffff)",
          borderBottom: "1px solid #e5e7eb",
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{title}</h3>
          <button
            onClick={onCancel}
            title="Cerrar"
            style={{
              border: "none", background: "transparent", color: "#6b7280",
              cursor: "pointer", padding: 6, borderRadius: 8,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#0000000d"; e.currentTarget.style.color = "#111827"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          <p style={{ margin: 0, color: "#374151", fontSize: 14.5, lineHeight: 1.45 }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 8, padding: 16, borderTop: "1px solid #e5e7eb",
          background: "linear-gradient(180deg, #ffffff, #f9fafb)",
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              transition: "all .15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: t.bg,
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
              transition: "background .15s ease, transform .05s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(1px)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dlgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
