import React from 'react';

const ProgramSelector = ({
  programs = [],
  selectedProgram,
  onSelect,
  darkMode,
  loading,
  onAddCustom
}) => {
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
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || p.id}
          </option>
        ))}
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
