import React from 'react';

const ProgramSelector = ({
  programs = [],
  selectedProgram,
  onSelect,
  darkMode,
  loading,
  onAddCustom,
  programTimestamps = {},
  programLastVisited = {}
}) => {
  // Formátování data pro zobrazení (krátký formát)
  const formatShortDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Formátování data pro tooltip (plný formát s časem)
  const formatFullDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <select
        value={selectedProgram || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={loading}
        className={`h-10 w-full px-3 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border transition-colors cursor-pointer ${
          darkMode
            ? 'bg-gray-700/80 border-gray-600 text-white hover:bg-gray-700'
            : 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-white'
        }`}
      >
        <option value="" disabled>
          Vyberte program...
        </option>
        {programs.map((p) => {
          const timestamp = programTimestamps[p.id];
          const lastVisited = programLastVisited[p.id];
          const dateStr = timestamp ? formatShortDate(timestamp) : '';

          // Tooltip text
          let tooltipText = p.name || p.id;
          if (timestamp) {
            tooltipText += `\nZměněno: ${formatFullDate(timestamp)}`;
          }
          if (lastVisited) {
            tooltipText += `\nNavštíveno: ${formatFullDate(lastVisited)}`;
          }

          return (
            <option key={p.id} value={p.id} title={tooltipText}>
              {p.name || p.id}{dateStr ? ` • Změněno: ${dateStr}` : ''}
            </option>
          );
        })}
      </select>

      {/* Tlačítko + (pokud ho používáš) */}
      {onAddCustom && (
        <button
          type="button"
          onClick={onAddCustom}
          title="Přidat vlastní kód"
          className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border font-bold transition-colors ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white'
              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
          }`}
        >
          +
        </button>
      )}
    </div>
  );
};

export default ProgramSelector;
