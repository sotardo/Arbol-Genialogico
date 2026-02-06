import { useState, useRef, useEffect, createContext, useContext } from "react";

const PopoverContext = createContext(null);

export const Popover = ({ children }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const value = {
    open,
    setOpen,
    triggerRef,
  };

  return (
    <PopoverContext.Provider value={value}>
      <div className="relative">{children}</div>
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger = ({ children, asChild }) => {
  const context = useContext(PopoverContext);
  
  if (!context) {
    throw new Error("PopoverTrigger debe usarse dentro de Popover");
  }

  const { setOpen, open, triggerRef } = context;

  const handleClick = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && children?.props) {
    return (
      <div ref={triggerRef} onClick={handleClick}>
        {children}
      </div>
    );
  }

  return (
    <div ref={triggerRef} onClick={handleClick} className="cursor-pointer">
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

  const { open, setOpen, triggerRef } = context;

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return;
    
    const listener = (e) => {
      if (!contentRef.current) return;
      if (
        !contentRef.current.contains(e.target) && 
        !triggerRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", listener);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", listener);
    };
  }, [open, setOpen, triggerRef]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  if (!open) return null;

  // Alineación horizontal
  const alignmentClass = 
    align === "end" ? "right-0" : 
    align === "center" ? "left-1/2 -translate-x-1/2" : 
    "left-0";

  // Posición vertical
  const sideStyle = side === "top" 
    ? { bottom: `calc(100% + ${sideOffset}px)` }
    : { top: `calc(100% + ${sideOffset}px)` };

  return (
    <div
      ref={contentRef}
      data-popover-content="true"
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute z-[9999] rounded-md border bg-white shadow-lg ${alignmentClass} ${className}`}
      style={sideStyle}
    >
      {children}
    </div>
  );
};