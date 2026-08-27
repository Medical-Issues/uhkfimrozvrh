import { BookOpen, Check, Eye, EyeOff } from 'lucide-react';

const SubjectList = ({
  subjects,
  selectedSubject,
  onSubjectSelect,
  darkMode,
  subjectRequirements,
  enabledOptionalSubjects = new Set(),
  onToggleOptional
}) => {
  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'A':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
            A - Povinný
          </span>
        );
      case 'B':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            B - PV
          </span>
        );
      case 'C':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
            C - Volitelný
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <BookOpen size={18}/>
          Předměty
        </h3>
        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Ačka jsou v rozvrhu automaticky · B/C rozsvítíte kliknutím na ikonu oka
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {subjects.map((subject) => {
          const req = subjectRequirements?.[subject];
          const isSelected = selectedSubject === subject;
          const statut = req?.statut || 'C';
          const isOptional = statut === 'B' || statut === 'C';
          const isEnabled = !isOptional || (enabledOptionalSubjects instanceof Set 
            ? enabledOptionalSubjects.has(subject) 
            : Array.isArray(enabledOptionalSubjects) && enabledOptionalSubjects.includes(subject));

          return (
            <div
              key={subject}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all border ${
                isSelected
                  ? darkMode
                    ? 'bg-blue-600/30 border-blue-500 text-white'
                    : 'bg-blue-50 border-blue-400 text-blue-900'
                  : darkMode
                  ? 'bg-gray-700/50 border-gray-700 hover:bg-gray-700 text-gray-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
              }`}
            >
              {/* Kliknutí na text zvýrazní předmět v rozvrhu */}
              <button
                onClick={() => onSubjectSelect(subject)}
                className="flex-1 text-left flex flex-col gap-1 overflow-hidden mr-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{subject}</span>
                  {isSelected && <Check className="text-blue-400 shrink-0" size={14}/>}
                </div>
                <div className="flex items-center gap-1">
                  {getStatusBadge(statut)}
                  {req?.kredity > 0 && (
                    <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {req.kredity} kr.
                    </span>
                  )}
                </div>
              </button>

              {/* Tlačítko pro zobrazení/skrytí volitelných B/C předmětů */}
              {isOptional && (
                <button
                  title={isEnabled ? 'Skrýt z rozvrhu' : 'Zobrazit v rozvrhu'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleOptional) onToggleOptional(subject);
                  }}
                  className={`p-1.5 rounded-md transition-colors ${
                    isEnabled
                      ? 'bg-blue-500 text-white shadow-sm'
                      : darkMode
                      ? 'bg-gray-600 text-gray-400 hover:bg-gray-500'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                >
                  {isEnabled ? <Eye size={14}/> : <EyeOff size={14}/>}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectList;
