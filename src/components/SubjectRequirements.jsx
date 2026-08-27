import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Layers } from 'lucide-react';

const SubjectRequirements = ({
  requirements,
  darkMode,
  loadingRequirements,
  enabledOptionalSubjects = new Set()
}) => {
  if (!requirements || Object.keys(requirements).length === 0) return null;

  // Filtrujeme předměty: zobrazujeme všechna Ačka + zapnutá/vybraná B a C
  const activeEntries = Object.entries(requirements).filter(([code, req]) => {
    const isA = req.statut === 'A';
    const isEnabled = enabledOptionalSubjects.has(code);
    const hasAnySelection = req.selectedCount > 0;
    return isA || isEnabled || hasAnySelection;
  });

  // Statistiky
  const totalCredits = activeEntries.reduce((sum, [, req]) => sum + (req.isSelected ? (req.kredity || 0) : 0), 0);
  const completeCount = activeEntries.filter(([, req]) => req.isComplete).length;
  const totalCount = activeEntries.length;

  const incompleteItems = activeEntries.filter(([, req]) => !req.isComplete);
  const completeItems = activeEntries.filter(([, req]) => req.isComplete);

  const renderBadge = (statut) => {
    if (statut === 'A') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">A</span>;
    if (statut === 'B') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">B</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">C</span>;
  };

  const renderItemRow = (code, req) => (
    <div
      key={code}
      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
        req.isComplete
          ? darkMode ? 'bg-gray-800/40 border-gray-700/60 opacity-75' : 'bg-gray-50 border-gray-200'
          : darkMode ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50/70 border-red-200'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {renderBadge(req.statut)}
        <span className="font-semibold text-sm tracking-wide">{code}</span>
        <span className={`text-xs truncate max-w-[160px] sm:max-w-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {req.nazev}
        </span>
        {req.kredity > 0 && (
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
            {req.kredity} kr.
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Typy výuky */}
        <div className="flex items-center gap-1">
          {req.needsLecture && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              req.hasLecture
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
            }`}>
              {req.hoursLecture || 2}P
            </span>
          )}
          {req.needsExercise && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              req.hasExercise
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
            }`}>
              {req.hoursExercise || 2}C
            </span>
          )}
          {req.needsSeminar && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              req.hasSeminar
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
            }`}>
              {req.hoursSeminar || 2}S
            </span>
          )}
        </div>

        {/* Status ikona */}
        {req.isComplete ? (
          <CheckCircle2 size={18} className="text-green-500 ml-1" />
        ) : (
          <span className="text-xs font-medium text-amber-500 flex items-center gap-1 ml-1">
            <AlertCircle size={15} />
            <span className="hidden sm:inline">Chybí: {req.missing?.join(', ') || 'výuka'}</span>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-5 border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
      {/* Header se souhrnem */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Layers className={darkMode ? 'text-blue-400' : 'text-uhk-blue'} size={20} />
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Kontrola požadavků rozvrhu
          </h3>
          {loadingRequirements && <RefreshCw size={14} className="animate-spin text-blue-400 ml-2" />}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className={`px-2.5 py-1 rounded-full font-medium ${
            completeCount === totalCount
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            Hotovo {completeCount} / {totalCount} předmětů
          </span>
          <span className={`px-2.5 py-1 rounded-full font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
            Zapsáno: <strong className="text-blue-400">{totalCredits}</strong> kreditů
          </span>
        </div>
      </div>

      {/* Seznam k dořešení */}
      <div className="space-y-2">
        {incompleteItems.length > 0 && (
          <div className="space-y-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              K dokončení ({incompleteItems.length})
            </span>
            {incompleteItems.map(([code, req]) => renderItemRow(code, req))}
          </div>
        )}

        {/* Kompletní předměty */}
        {completeItems.length > 0 && (
          <div className="space-y-2 pt-2">
            {incompleteItems.length > 0 && (
              <span className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Splněno ({completeItems.length})
              </span>
            )}
            {completeItems.map(([code, req]) => renderItemRow(code, req))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectRequirements;
