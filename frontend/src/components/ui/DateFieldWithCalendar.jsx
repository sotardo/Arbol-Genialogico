"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Helpers para manejar el formato YYYY-MM-DD
const toInputDate = (d) => {
  if (!d) return "";
  const dt =
    typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (Number.isNaN(dt?.getTime?.())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromInputDate = (s) => (s ? new Date(`${s}T00:00:00`) : undefined);

/**
 * props:
 *  - value: string (YYYY-MM-DD) o Date
 *  - onChange: (nuevoValor: string) => void  // YYYY-MM-DD
 *  - placeholder?: string
 */
export function DateFieldWithCalendar({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
}) {
  const [date, setDate] = React.useState(
    value ? fromInputDate(value) : undefined
  );

  React.useEffect(() => {
    setDate(value ? fromInputDate(value) : undefined);
  }, [value]);

  const handleSelect = (d) => {
    setDate(d);
    onChange?.(d ? toInputDate(d) : "");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Botón que parece input + icono (lo que querés visualmente) */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-left text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <span className={date ? "text-gray-900" : "text-gray-400"}>
            {date ? toInputDate(date) : placeholder}
          </span>
          <CalendarIcon className="ml-2 h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>

      {/* 👇 z-[300] para que quede POR ENCIMA del drawer (que está en z-[250]) */}
      <PopoverContent className="w-auto p-0 z-[300]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          captionLayout="dropdown"
          className="rounded-md border shadow-sm bg-white"
        />
      </PopoverContent>
    </Popover>
  );
}
