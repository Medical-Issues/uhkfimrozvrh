import React from 'react';
import { resolveTeacherName } from '../utils/stagParser';

const ScheduleBlock = ({ 
  item, 
  teachersMap, 
  isSelected, 
  isHovered, 
  selectedSubject, 
  onClick 
}) => {
  const isLecture = item.type === 'PREDN' || item.courseCode?.includes('-P/');
  const isExercise = item.type === 'CVIC' || item.courseCode?.includes('-C/');
  const isPoha = item.subject === 'POHA' || item.katedra === 'KRCH' || item.katedra === 'KTV';

  // Extrakce katedry a čísla paralelky
  const rawCode = item.courseCode || '';
  const katedraMatch = rawCode.match(/^([A-Z0-9]+)\//);
  const katedra = katedraMatch ? katedraMatch[1] : (item.katedra || '');

  const paralelaMatch = rawCode.match(/[-/](\d{2})$/);
  const paralela = paralelaMatch ? paralelaMatch[1] : '';

  // Extrakce čistého příjmení
  const getShortTeacher = (rawTeacher) => {
    if (!rawTeacher) return '—';
    const parts = rawTeacher.split(',').map(t => t.trim());

    return parts.map(p => {
      const full = resolveTeacherName(p, teachersMap) || p;
      const beforeComma = full.split(',')[0].trim();
      const noTitles = beforeComma.replace(/^(doc\.|prof\.|Ing\.|Mgr\.|RNDr\.|Bc\.|MUDr\.|JUDr\.|RSDr\.)\s*/gi, '').trim();
      const words = noTitles.split(/\s+/).filter(Boolean);
      return words.length > 0 ? words[words.length - 1] : full;
    }).join(', ');
  };

  const fullTeacher = resolveTeacherName(item.teacher, teachersMap) || item.teacher || 'Nezadáno';
  const fullActionCode = item.courseCode || `${katedra ? katedra + '/' : ''}${item.subject}-${isLecture ? 'P' : 'C'}/01`;

  // Logika zvýraznění:
  const isSubjectFocused = selectedSubject === item.subject;
  const isAnySubjectFocused = Boolean(selectedSubject);
  const isDimmed = isAnySubjectFocused && !isSubjectFocused;

  const cardStyle = isPoha
    ? 'bg-orange-950/40 border-orange-500/80 text-orange-100 hover:bg-orange-900/50 hover:border-orange-400'
    : isLecture
    ? 'bg-blue-900/30 border-blue-500/80 text-blue-100 hover:bg-blue-900/50 hover:border-blue-400'
    : 'bg-emerald-950/30 border-emerald-500/80 text-emerald-100 hover:bg-emerald-950/50 hover:border-emerald-400';

  const badgeStyle = isPoha
    ? 'bg-orange-500/20 text-orange-300 border-orange-400/40'
    : isLecture
    ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';

  const badgeLabel = isPoha 
    ? (item.sportName || 'Sport') 
    : isLecture ? 'Předn' : 'Cvič';

  const shortTeacher = isPoha ? (item.teacher || 'KRCH') : getShortTeacher(item.teacher);

  const isSelectedBlock = isSelected || isPoha;

  return (
    <div
      onClick={onClick}
      title={`${item.subject} (${item.time || ''})\n${item.sportName ? `Sport: ${item.sportName}\n` : ''}Vyučující: ${item.teacher || 'Nezadáno'}\nMísto: ${item.room || 'Nezadáno'}`}
      className={`absolute inset-0.5 p-2 rounded-lg border flex flex-col justify-between cursor-pointer transition-all duration-200 select-none shadow-sm ${cardStyle} ${
        isSelected
          ? 'ring-2 ring-white shadow-lg brightness-125 z-20 scale-[1.01]'
          : isHovered
          ? 'brightness-110 shadow z-20'
          : 'z-10'
      } ${isSelectedBlock ? 'print-show-block' : 'print-hide-block'}`}
    >
      {/* HORNÍ A STŘEDNÍ ČÁST */}
      <div className="flex flex-col gap-0.5">
        {/* 1. řádek: Předmět + Sport/Typ */}
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="font-extrabold text-xs text-white tracking-wide shrink-0">
            {item.subject}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border uppercase tracking-wider shrink-0 ${badgeStyle}`}>
            {badgeLabel}
          </span>
        </div>

        {/* 2. ŘÁDEK: U POHA (Čas a KRCH vlevo), u STAGu (Katedra · #Paralela) */}
        <div className="text-[10px] font-mono text-gray-400 leading-none truncate pt-0.5">
          {isPoha ? (
            <div className="flex flex-col gap-[1px]">
              <span className="text-orange-300 font-semibold font-mono text-[9px] leading-none">
                {item.time}
              </span>
              <span className="text-[8px] font-mono text-gray-400/80 uppercase tracking-wider leading-none">
                KRCH
              </span>
            </div>
          ) : (
            <span>{katedra ? `${katedra}` : ''}{paralela ? ` · #${paralela}` : ''}</span>
          )}
        </div>
      </div>

      {/* 3. ŘÁDEK: Učitel vlevo + Místnost / Sportoviště vpravo */}
      <div className="flex items-center justify-between gap-1 text-[11px] leading-none pt-1 border-t border-black/5 dark:border-white/5">
        <span className="font-medium text-gray-800 dark:text-gray-200 truncate flex-1 min-w-0">
          {shortTeacher || (isPoha ? '—' : '')}
        </span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-900 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold shrink-0 max-w-[125px] truncate">
          {item.room || item.location || '—'}
        </span>
      </div>
    </div>
  );
};

export default ScheduleBlock;
