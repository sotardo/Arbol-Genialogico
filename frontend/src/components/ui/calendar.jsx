import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Nombres de meses en español
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const DAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

function Calendar({ 
  mode = "single", 
  selected, 
  onSelect,
  fromYear = 1900,
  toYear = 2100,
  className = "" 
}) {
  const [currentDate, setCurrentDate] = React.useState(selected || null);
  const [viewMonth, setViewMonth] = React.useState(
    selected ? selected.getMonth() : new Date().getMonth()
  );
  const [viewYear, setViewYear] = React.useState(
    selected ? selected.getFullYear() : new Date().getFullYear()
  );

  React.useEffect(() => {
    if (selected) {
      setCurrentDate(selected);
      setViewMonth(selected.getMonth());
      setViewYear(selected.getFullYear());
    } else {
      setCurrentDate(null);
    }
  }, [selected]);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDayClick = (day) => {
    const newDate = new Date(viewYear, viewMonth, day);
    setCurrentDate(newDate);
    onSelect?.(newDate);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const days = [];

    // Días del mes anterior
    const prevMonthDays = getDaysInMonth(
      viewMonth === 0 ? 11 : viewMonth - 1,
      viewMonth === 0 ? viewYear - 1 : viewYear
    );
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <button
          key={`prev-${i}`}
          type="button"
          className="h-9 w-9 text-sm text-black hover:bg-emerald-500 hover:text-white rounded-md transition-colors"
          onClick={() => {
            handlePrevMonth();
            setTimeout(() => handleDayClick(prevMonthDays - i), 0);
          }}
        >
          {prevMonthDays - i}
        </button>
      );
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        selected &&
        day === selected.getDate() &&
        viewMonth === selected.getMonth() &&
        viewYear === selected.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDayClick(day)}
          className={`h-9 w-9 text-sm rounded-md transition-colors ${
            isSelected
              ? "bg-emerald-600 text-white font-medium hover:bg-emerald-700"
              : "text-black hover:bg-emerald-500 hover:text-white"
          }`}
        >
          {day}
        </button>
      );
    }

    // Días del mes siguiente
    const remainingDays = 42 - days.length; // 6 semanas × 7 días
    for (let day = 1; day <= remainingDays; day++) {
      days.push(
        <button
          key={`next-${day}`}
          type="button"
          className="h-9 w-9 text-sm text-black hover:bg-emerald-500 hover:text-white rounded-md transition-colors"
          onClick={() => {
            handleNextMonth();
            setTimeout(() => handleDayClick(day), 0);
          }}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const years = [];
  for (let y = fromYear; y <= toYear; y++) {
    years.push(y);
  }

  return (
    <div className={`bg-white text-black p-4 rounded-lg w-[280px] border border-gray-200 shadow-lg ${className}`}>
      {/* Header con controles */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="h-8 w-8 flex items-center justify-center hover:bg-emerald-100 rounded-md transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(parseInt(e.target.value))}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {MONTHS.map((month, idx) => (
              <option 
                key={idx} 
                value={idx}
              >
                {month}
              </option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => setViewYear(parseInt(e.target.value))}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {years.map((year) => (
              <option 
                key={year} 
                value={year}
              >
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="h-8 w-8 flex items-center justify-center hover:bg-emerald-100 rounded-md transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="h-9 flex items-center justify-center text-xs text-gray-600 font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };

// Demo
export default function CalendarDemo() {
  const [date, setDate] = React.useState(null); // ✅ Inicia sin fecha seleccionada

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="space-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          fromYear={1900}
          toYear={2100}
        />
        {date ? (
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Fecha seleccionada:</p>
            <p className="text-lg font-semibold">
              {date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">No hay fecha seleccionada</p>
          </div>
        )}
      </div>
    </div>
  );
}