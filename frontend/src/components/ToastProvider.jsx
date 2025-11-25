// src/components/ToastProvider.jsx
import { createContext, useContext, useMemo, useCallback, useRef, useState } from "react";
import { CheckCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((opts) => {
    const id = ++idRef.current;
    const toast = {
      id,
      type: opts.type || "info", // 'success' | 'error' | 'info' | 'warning'
      title: opts.title || "",
      description: opts.description || "",
      duration: opts.duration ?? 3500,
    };
    setToasts((t) => [...t, toast]);
    if (toast.duration > 0) {
      setTimeout(() => remove(id), toast.duration);
    }
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    show,
    success: (msg, desc) => show({ type: "success", title: msg, description: desc }),
    error:   (msg, desc) => show({ type: "error",   title: msg, description: desc, duration: 4500 }),
    info:    (msg, desc) => show({ type: "info",    title: msg, description: desc }),
    warning: (msg, desc) => show({ type: "warning", title: msg, description: desc }),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Contenedor de toasts */}
      <div className="fixed z-[999] top-4 right-4 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

function ToastItem({ toast, onClose }) {
  const palette = {
    success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
    error:   { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-800",   icon: <AlertTriangle className="w-5 h-5 text-red-600" /> },
    info:    { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-800",  icon: <Info className="w-5 h-5 text-blue-600" /> },
    warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: <AlertTriangle className="w-5 h-5 text-amber-600" /> },
  }[toast.type || "info"];

  return (
    <div className={`w-80 ${palette.bg} ${palette.border} border rounded-xl shadow-md p-3 animate-in fade-in slide-in-from-right-2`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{palette.icon}</div>
        <div className="flex-1">
          {toast.title ? <div className={`font-semibold ${palette.text}`}>{toast.title}</div> : null}
          {toast.description ? <div className="text-sm text-gray-700 leading-snug">{toast.description}</div> : null}
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
