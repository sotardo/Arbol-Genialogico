// src/components/ui/button.jsx
import React from "react";

export function Button({ 
  children, 
  disabled = false, 
  size = "default",
  className = "",
  ...props 
}) {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    default: "px-5 py-2.5 text-base",
    lg: "px-7 py-3.5 text-lg"
  };

  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-md font-medium
        transition-colors
        ${sizeClasses[size]}
        ${disabled 
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
          : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}