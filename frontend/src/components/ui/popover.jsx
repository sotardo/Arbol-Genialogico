import { useState, useRef, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";

// Context para compartir estado entre Popover, Trigger y Content
const PopoverContext = createContext(null);

export const Popover = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const triggerRef = useRef(null);

  const value = {
    open,
    setOpen,
    triggerRect,
    setTriggerRect,
    triggerRef,
  };

  return (
    <PopoverContext.Provider value={value}>
      <div className="relative inline-block w-full">{children}</div>
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger = ({ children, asChild }) => {
  const context = useContext(PopoverContext);
  
  if (!context) {
    throw new Error("PopoverTrigger debe usarse dentro de Popover");
  }

  const { setOpen, open, triggerRef, setTriggerRect } = context;

  const handleClick = () => {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(!open);
  };

  // Si asChild=true, clonamos el children y le agregamos props
  if (asChild && children?.props) {
    return (
      <div ref={triggerRef} onClick={handleClick} className="w-full">
        {children}
      </div>
    );
  }

  return (
    <div ref={triggerRef} onClick={handleClick} className="cursor-pointer w-full">
      {children}
    </div>
  );
};

export const PopoverContent = ({ 
  children, 
  className = "", 
  align = "start",
  side = "bottom",
  sideOffset = 5 
}) => {
  const context = useContext(PopoverContext);
  const contentRef = useRef(null);
  
  if (!context) {
    throw new Error("PopoverContent debe usarse dentro de Popover");
  }

  const { open, setOpen, triggerRect } = context;

  // Cerrar al hacer click afuera
  useEffect(() => {
    const listener = (e) => {
      if (!contentRef.current) return;
      if (!contentRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", listener);
    }
    return () => document.removeEventListener("mousedown", listener);
  }, [open, setOpen]);

  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  if (!open || !triggerRect) return null;

  // Calcular posición
  let top = 0;
  let left = 0;

  if (side === "bottom") {
    top = triggerRect.bottom + sideOffset + window.scrollY;
  } else if (side === "top") {
    top = triggerRect.top - sideOffset + window.scrollY;
  }

  if (align === "start") {
    left = triggerRect.left + window.scrollX;
  } else if (align === "center") {
    left = triggerRect.left + triggerRect.width / 2 + window.scrollX;
  } else if (align === "end") {
    left = triggerRect.right + window.scrollX;
  }

const content = (
  <div
    ref={contentRef}
    data-popover-content="true"
    onMouseDown={(e) => e.stopPropagation()}
    className={`fixed z-[9999] rounded-md border bg-white shadow-lg ${className}`}
    style={{
      top: `${top}px`,
      left: `${left}px`,
      transform: align === "center" ? "translateX(-50%)" : undefined,
    }}
  >
    {children}
  </div>
);

  // 🎯 PORTAL: renderiza fuera del drawer, al final del body
  return createPortal(content, document.body);
};

// Ejemplo de uso
export default function PopoverExample() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-xl font-bold mb-4">Ejemplo de Popover con Portal</h2>
      
      <Popover>
        <PopoverTrigger asChild>
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Abrir Popover
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="start">
          <div className="space-y-2">
            <h3 className="font-semibold">Título del Popover</h3>
            <p className="text-sm text-gray-600">
              Este popover se renderiza usando un Portal, así que funciona
              incluso dentro de contenedores con overflow-hidden o z-index bajo.
            </p>
            <button className="w-full px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600">
              Acción
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="mt-8 p-4 border rounded bg-gray-50 overflow-hidden relative z-10">
        <p className="text-sm mb-2">Contenedor con overflow-hidden y z-10:</p>
        <Popover>
          <PopoverTrigger asChild>
            <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
              Popover aquí también funciona
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <p className="text-sm">
              ✅ Gracias al Portal, este popover se ve correctamente aunque
              esté dentro de un contenedor con overflow-hidden.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}