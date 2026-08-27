import { useState, useEffect, useRef } from 'react';
import { Calendar, RefreshCw, Filter, Moon, Sun, AlertCircle, Dumbbell, Download, Share2 } from 'lucide-react';
import ProgramSelector from './components/ProgramSelector';
import SubjectList from './components/SubjectList';
import ScheduleGrid from './components/ScheduleGrid';
import SubjectRequirements from './components/SubjectRequirements';
import PohaModal from './components/PohaModal';
import { 
  fetchStagSchedule, 
  fetchProgramList, 
  samplePrograms, 
  checkConflicts, 
  validateRequirements, 
  fetchAllSubjectRequirements, 
  fetchFimStaffList 
} from './utils/stagParser';
import { runStagAutoTest } from './utils/stagTester';

if (typeof window !== 'undefined') {
  window.runStagAutoTest = runStagAutoTest;
}

function App() {
  // 1. Perzistence vybraného programu
  const [selectedProgram, setSelectedProgram] = useState(() => {
    return localStorage.getItem('selectedProgram') || '';
  });

  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');

  // 2. Perzistence dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [programs, setPrograms] = useState(samplePrograms);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // 3. Perzistence vybraných hodin
  const [selectedClasses, setSelectedClasses] = useState(() => {
    const saved = localStorage.getItem('selectedClasses');
    return saved ? JSON.parse(saved) : [];
  });

  const [subjectRequirements, setSubjectRequirements] = useState(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

  // 4. Perzistence zapnutých volitelných B/C předmětů
  const [enabledOptionalSubjects, setEnabledOptionalSubjects] = useState(() => {
    const saved = localStorage.getItem('enabledOptionalSubjects');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [teachersMap, setTeachersMap] = useState(new Map());
  const isInitialMount = useRef(true);
  const [isPohaOpen, setIsPohaOpen] = useState(false);
  const [hasSharedData, setHasSharedData] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const [changedProgramName, setChangedProgramName] = useState('');
  const [changedTimestamp, setChangedTimestamp] = useState('');
  const [programTimestamps, setProgramTimestamps] = useState({});
  const [programLastVisited, setProgramLastVisited] = useState({});

  // Detekce URL parametrů při startu
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    
    if (data) {
      try {
        const decoded = JSON.parse(atob(data));
        setPreviewData(decoded);
        setHasSharedData(true);
        setIsPreviewMode(true);
      } catch (err) {
        console.error('Failed to parse shared data:', err);
      }
    }
  }, []);

  // Ukládání do localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('selectedProgram', selectedProgram);
  }, [selectedProgram]);

  useEffect(() => {
    // Pokud jsme v režimu náhledu sdíleného rozvrhu, NEUKLÁDAT do localStorage!
    if (isPreviewMode) return;
    
    // Při startu aplikace nebudeme přepisovat storage prázdným polem
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('selectedClasses', JSON.stringify(selectedClasses));
  }, [selectedClasses, isPreviewMode]);

  useEffect(() => {
    localStorage.setItem('enabledOptionalSubjects', JSON.stringify(Array.from(enabledOptionalSubjects)));
  }, [enabledOptionalSubjects]);

  // Načtení vyučujících ze staff_list
  useEffect(() => {
    const loadStaff = async () => {
      const map = await fetchFimStaffList();
      setTeachersMap(map);
    };
    loadStaff();
  }, []);

  // Validace hodin proběhne až ve chvíli, kdy máme reálná data rozvrhu
  useEffect(() => {
    if (!scheduleData || !scheduleData.schedule || loading) return;

    const saved = localStorage.getItem('selectedClasses');
    const currentSavedClasses = saved ? JSON.parse(saved) : selectedClasses;

    if (currentSavedClasses.length > 0) {
      const validClasses = currentSavedClasses.filter(savedClass => {
        // POHA necháme vždy (je přidávána dynamicky)
        if (savedClass.subject === 'POHA') return true;
        
        const daySchedule = scheduleData.schedule[savedClass.day] || [];
        return daySchedule.some(c => c.id === savedClass.id);
      });

      // Aktualizujeme stav jen pokud se skutečně nějaká hodina zneplatnila
      if (validClasses.length !== currentSavedClasses.length) {
        setSelectedClasses(validClasses);
      }
    }
  }, [scheduleData, loading]);

  // Načtení seznamu programů
  useEffect(() => {
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const fetchedPrograms = await fetchProgramList();
        setPrograms(fetchedPrograms);

        // Načíst timestampy pro všechny programy z localStorage
        const timestamps = {};
        const lastVisited = {};
        fetchedPrograms.forEach(program => {
          const timestamp = localStorage.getItem(`scheduleTimestamp_${program.id}`);
          const visited = localStorage.getItem(`scheduleLastVisited_${program.id}`);
          if (timestamp) {
            timestamps[program.id] = timestamp;
          }
          if (visited) {
            lastVisited[program.id] = visited;
          }
        });
        setProgramTimestamps(timestamps);
        setProgramLastVisited(lastVisited);
      } catch (err) {
        // Fallback na samplePrograms
      } finally {
        setLoadingPrograms(false);
      }
    };
    loadPrograms();
  }, []);

  // Hash funkce pro detekci změn v rozvrhu
  const generateScheduleHash = (scheduleData) => {
    if (!scheduleData || !scheduleData.schedule) return '';
    const scheduleString = JSON.stringify(scheduleData.schedule);
    return scheduleString.length.toString() + scheduleString.slice(0, 100);
  };

  const loadSchedule = async (programId) => {
    if (!programId) {
      setScheduleData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchStagSchedule(programId);

      // Detekce změn v rozvrhu
      const newHash = generateScheduleHash(data);
      const savedHash = localStorage.getItem(`scheduleHash_${programId}`);
      const savedTimestamp = localStorage.getItem(`scheduleTimestamp_${programId}`);
      const newTimestamp = new Date().toISOString();
      const newLastVisited = new Date().toISOString();

      // Vždy aktualizovat last visited timestamp
      localStorage.setItem(`scheduleLastVisited_${programId}`, newLastVisited);
      setProgramLastVisited(prev => ({
        ...prev,
        [programId]: newLastVisited
      }));

      if (savedHash && savedHash !== newHash) {
        // Změna detekována - zobrazit notifikaci a aktualizovat timestamp
        const programName = programs.find(p => p.id === programId)?.name || programId;
        setChangedProgramName(programName);
        setChangedTimestamp(savedTimestamp || newTimestamp);
        setScheduleChanged(true);

        localStorage.setItem(`scheduleHash_${programId}`, newHash);
        localStorage.setItem(`scheduleTimestamp_${programId}`, newTimestamp);

        setProgramTimestamps(prev => ({
          ...prev,
          [programId]: newTimestamp
        }));
      } else if (!savedHash) {
        // První návštěva - uložit hash a timestamp
        localStorage.setItem(`scheduleHash_${programId}`, newHash);
        localStorage.setItem(`scheduleTimestamp_${programId}`, newTimestamp);

        setProgramTimestamps(prev => ({
          ...prev,
          [programId]: newTimestamp
        }));
      }

      setScheduleData(data);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError(`Nepodařilo se načíst rozvrh: ${err.message || 'Neznámá chyba'}. Zkontrolujte připojení k internetu a zkuste to znovu.`);
    } finally {
      setLoading(false);
    }
  };

  // Export rozvrhu jako PDF (přes tisk)
  const handleExportPDF = () => {
    window.print();
  };

  // Sdílení rozvrhu přes URL
  const handleShareSchedule = () => {
    const shareData = {
      program: selectedProgram,
      classes: selectedClasses.map(c => ({ id: c.id, subject: c.subject })),
      optional: Array.from(enabledOptionalSubjects),
    };
    
    const encoded = btoa(JSON.stringify(shareData));
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Odkaz na rozvrh byl zkopírován do schránky!');
    }).catch(() => {
      setError('Nepodařilo se zkopírovat odkaz do schránky.');
    });
  };

  // Uložení sdíleného rozvrhu (přepíše aktuální nastavení)
  const saveSharedSchedule = () => {
    if (!previewData) return;
    
    if (previewData.program) {
      setSelectedProgram(previewData.program);
    }
    
    if (previewData.optional) {
      setEnabledOptionalSubjects(new Set(previewData.optional));
    }
    
    // Uložit vybrané třídy do localStorage
    localStorage.setItem('selectedClasses', JSON.stringify(selectedClasses));
    
    // Ukončit náhledový režim
    setHasSharedData(false);
    setPreviewData(null);
    setIsPreviewMode(false);
    
    // Vyčistit URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Zrušení náhledu a obnovení původních dat
  const cancelPreview = () => {
    // Obnovit původní data z localStorage
    const saved = localStorage.getItem('selectedClasses');
    if (saved) {
      setSelectedClasses(JSON.parse(saved));
    } else {
      setSelectedClasses([]);
    }

    const savedProgram = localStorage.getItem('selectedProgram');
    if (savedProgram) {
      setSelectedProgram(savedProgram);
    }

    const savedOptional = localStorage.getItem('enabledOptionalSubjects');
    if (savedOptional) {
      setEnabledOptionalSubjects(new Set(JSON.parse(savedOptional)));
    }

    // Ukončit náhledový režim
    setHasSharedData(false);
    setPreviewData(null);
    setIsPreviewMode(false);

    // Vyčistit URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Zavření notifikace o změně rozvrhu a uložení nového hash
  const dismissScheduleChange = () => {
    if (selectedProgram && scheduleData) {
      const newHash = generateScheduleHash(scheduleData);
      const newTimestamp = new Date().toISOString();
      localStorage.setItem(`scheduleHash_${selectedProgram}`, newHash);
      localStorage.setItem(`scheduleTimestamp_${selectedProgram}`, newTimestamp);

      // Aktualizovat timestamp v programTimestamps
      setProgramTimestamps(prev => ({
        ...prev,
        [selectedProgram]: newTimestamp
      }));
    }
    setScheduleChanged(false);
  };

  // Formátování data pro zobrazení
  const formatDate = (isoString) => {
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

  useEffect(() => {
    if (selectedProgram) {
      loadSchedule(selectedProgram);
    }
  }, [selectedProgram]);

  useEffect(() => {
    if (scheduleData && scheduleData.schedule && selectedProgram) {
      loadSubjectRequirements(scheduleData.schedule, selectedProgram);
      
      // Pokud máme preview data, načteme třídy pro náhled
      if (previewData && previewData.classes) {
        const restoredClasses = previewData.classes
          .map(c => {
            // Najdeme plné objekty v scheduleData
            for (const day in scheduleData.schedule) {
              const found = scheduleData.schedule[day].find(item => item.id === c.id);
              if (found) return found;
            }
            // Pokud je to POHA, obnovíme z selectedClasses
            if (c.subject === 'POHA') {
              return selectedClasses.find(sc => sc.id === c.id);
            }
            return null;
          })
          .filter(Boolean);
        setSelectedClasses(restoredClasses);
      }
    }
  }, [scheduleData, selectedProgram]);

  const loadSubjectRequirements = async (schedule, programId) => {
    setLoadingRequirements(true);
    try {
      const requirements = await fetchAllSubjectRequirements(schedule, programId || selectedProgram || 'isb33');
      setSubjectRequirements(requirements);
    } catch (err) {
      // Silent fail
    } finally {
      setLoadingRequirements(false);
    }
  };

  const handleProgramSelect = (programId) => {
    if (!programId || programId === selectedProgram) return;

    setSelectedProgram(programId);
    setFilterType('all');
    setSelectedDay('all');
    setSelectedSubject(null);
    setSelectedClasses([]);
    setEnabledOptionalSubjects(new Set());
    setSubjectRequirements(null);
  };

  const toggleOptionalSubject = (subjectCode) => {
    setEnabledOptionalSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectCode)) {
        next.delete(subjectCode);
      } else {
        next.add(subjectCode);
      }
      return next;
    });
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject === selectedSubject ? null : subject);
  };

  const handleClassToggle = (classItem) => {
    setSelectedClasses(prev => {
      const exists = prev.find(c => c.id === classItem.id);
      if (exists) {
        return prev.filter(c => c.id !== classItem.id);
      } else {
        return [...prev, classItem];
      }
    });
  };

  const handleAddPoha = (pohaItem) => {
    setSelectedClasses(prev => [...prev, pohaItem]);
  };

  const handleRemovePoha = (pohaItem) => {
    setSelectedClasses(prev => prev.filter(c => c.id !== pohaItem.id));
  };

  const conflicts = checkConflicts(selectedClasses);
  const requirements = validateRequirements(selectedClasses, subjectRequirements);

  const getFilteredSchedule = () => {
    if (!scheduleData) return null;

    const filtered = {};
    
    const daysToInclude = selectedDay === 'all' 
      ? Object.keys(scheduleData.schedule)
      : [selectedDay];

    daysToInclude.forEach(day => {
      if (!scheduleData.schedule[day]) return;

      filtered[day] = scheduleData.schedule[day].filter(item => {
        const subjectName = item.subject;
        const req = subjectRequirements ? subjectRequirements[subjectName] : null;
        const statut = req ? req.statut : 'C';

        const isOptional = statut === 'B' || statut === 'C';
        const isExplicitlyEnabled = enabledOptionalSubjects.has(subjectName);
        const hasSelectedClass = selectedClasses.some(c => c.subject === subjectName);

        if (isOptional && !isExplicitlyEnabled && !hasSelectedClass) {
          return false;
        }

        const subjectReq = requirements[subjectName];
        if (subjectReq) {
          const isLecture = item.type === 'PREDN';
          const isExercise = item.type === 'CVIC';
          const isSeminar = item.type === 'SEM';

          let categoryComplete = false;
          if (isLecture) categoryComplete = subjectReq.hasLecture;
          else if (isExercise) categoryComplete = subjectReq.hasExercise;
          else if (isSeminar) categoryComplete = subjectReq.hasSeminar;

          if (categoryComplete) {
            return selectedClasses.some(c => c.id === item.id);
          }
        }

        return true;
      });

      // Přidat vybrané POHA aktivity do rozvrhu
      // eslint-disable-next-line
      const dayMap = { 'Po': 'Mon', 'Út': 'Tue', 'St': 'Wed', 'Čt': 'Thu', 'Pá': 'Fri' };
      const pohaForDay = selectedClasses.filter(c => c.subject === 'POHA' && dayMap[c.day] === day);
      if (filtered[day]) {
        filtered[day] = [...filtered[day], ...pohaForDay];
      } else if (pohaForDay.length > 0) {
        filtered[day] = pohaForDay;
      }

      if (filterType !== 'all') {
        filtered[day] = filtered[day].filter(item => item.type === filterType || item.subject === 'POHA');
      }
    });

    return { timeSlots: scheduleData.timeSlots, schedule: filtered };
  };

  const filteredData = getFilteredSchedule();
  const dayOptions = ['all', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  // eslint-disable-next-line
  const dayLabels = { all: 'Všechny dny', Mon: 'Pondělí', Tue: 'Úterý', Wed: 'Středa', Thu: 'Čtvrtek', Fri: 'Pátek', Po: 'Pondělí', Út: 'Úterý', St: 'Středa', Čt: 'Čtvrtek', Pá: 'Pátek' };
  const typeOptions = ['all', 'PREDN', 'CVIC', 'SEM', 'LAB'];
  const typeLabels = { all: 'Všechny typy', PREDN: 'Přednášky', CVIC: 'Cvičení', SEM: 'Semináře', LAB: 'Laboratoře' };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-uhk-light to-white'}`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Calendar className={darkMode ? 'text-blue-400' : 'text-uhk-blue'} size={40} />
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-uhk-dark'}`}>STAG Rozvrh</h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              title={darkMode ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          </div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Interaktivní vizualizace rozvrhu FIM UHK</p>
        </div>

        {/* Ovládací panel rozvrhu */}
        <div className={`toolbar ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-3.5 mb-6 transition-colors`}>
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Výběr programu */}
            <div className="flex-1 min-w-[220px] max-w-sm">
              <ProgramSelector
                programs={programs}
                selectedProgram={selectedProgram}
                onSelect={handleProgramSelect}
                darkMode={darkMode}
                loading={loadingPrograms}
                programTimestamps={programTimestamps}
                programLastVisited={programLastVisited}
              />
            </div>

            {scheduleData && (
              <>
                <div className={`hidden sm:block h-6 w-[1px] ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

                {/* Filtr: Typ akce */}
                <div className="flex items-center gap-2">
                  <Filter size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={`h-10 px-3 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border transition-colors cursor-pointer ${
                      darkMode 
                        ? 'bg-gray-700/80 border-gray-600 text-white hover:bg-gray-700' 
                        : 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-white'
                    }`}
                  >
                    {typeOptions.map(option => (
                      <option key={option} value={option}>{typeLabels[option]}</option>
                    ))}
                  </select>
                </div>

                {/* Filtr: Den */}
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className={`h-10 px-3 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border transition-colors cursor-pointer ${
                    darkMode 
                      ? 'bg-gray-700/80 border-gray-600 text-white hover:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-white'
                  }`}
                >
                  {dayOptions.map(option => (
                    <option key={option} value={option}>{dayLabels[option]}</option>
                  ))}
                </select>

                {/* Tlačítko POHA */}
                <button
                  onClick={() => setIsPohaOpen(true)}
                  className="h-10 flex items-center gap-2 px-3.5 bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30 text-sm font-semibold rounded-lg transition-all cursor-pointer"
                >
                  <Dumbbell size={16}/>
                  <span>POHA</span>
                </button>

                {/* Tlačítka Export a Sdílet */}
                {filteredData && (
                  <>
                    <button
                      onClick={handleExportPDF}
                      className="h-10 flex items-center gap-2 px-3.5 bg-gray-600/20 border border-gray-500/40 text-gray-300 hover:bg-gray-600/30 text-sm font-semibold rounded-lg transition-all cursor-pointer"
                      title="Exportovat jako PDF"
                    >
                      <Download size={16}/>
                      <span className="hidden sm:inline">Export PDF</span>
                    </button>
                    <button
                      onClick={handleShareSchedule}
                      className="h-10 flex items-center gap-2 px-3.5 bg-gray-600/20 border border-gray-500/40 text-gray-300 hover:bg-gray-600/30 text-sm font-semibold rounded-lg transition-all cursor-pointer"
                      title="Sdílet rozvrh"
                    >
                      <Share2 size={16}/>
                      <span className="hidden sm:inline">Sdílet</span>
                    </button>
                  </>
                )}

                {/* Tlačítko Obnovit */}
                <button
                  onClick={() => loadSchedule(selectedProgram)}
                  disabled={loading}
                  className="h-10 flex items-center gap-2 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm ml-auto cursor-pointer"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  <span>Obnovit</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Subject List */}
        {scheduleData && scheduleData.subjects && scheduleData.subjects.length > 0 && (
          <div className="subject-list mb-6">
            <SubjectList
              subjects={scheduleData.subjects}
              selectedSubject={selectedSubject}
              onSubjectSelect={handleSubjectSelect}
              darkMode={darkMode}
              subjectRequirements={subjectRequirements}
              enabledOptionalSubjects={enabledOptionalSubjects}
              onToggleOptional={toggleOptionalSubject}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className={`flex items-center justify-center h-64 rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-center">
              <RefreshCw className={`animate-spin mx-auto mb-4 ${darkMode ? 'text-blue-400' : 'text-uhk-blue'}`} size={40} />
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Načítám rozvrh...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`${darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} border rounded-xl p-6 text-center`}>
            <p className={darkMode ? 'text-red-400' : 'text-red-700'}>{error}</p>
          </div>
        )}

        {/* Shared Data Notification */}
        {hasSharedData && (
          <div className={`${darkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4 mb-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`${darkMode ? 'text-blue-300' : 'text-blue-700'} font-medium mb-1`}>
                  Náhled sdíleného rozvrhu
                </p>
                <p className={`text-sm ${darkMode ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
                  Prohlížíte sdílený rozvrh. Kliknutím na tlačítko uložíte tento rozvrh (přepíše vaše aktuální nastavení)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cancelPreview}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  Zrušit náhled
                </button>
                <button
                  onClick={saveSharedSchedule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Uložit rozvrh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Change Notification */}
        {scheduleChanged && (
          <div className={`${darkMode ? 'bg-amber-900/30 border-amber-800' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4 mb-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`${darkMode ? 'text-amber-300' : 'text-amber-700'} font-medium mb-1`}>
                  Rozvrh byl aktualizován
                </p>
                <p className={`text-sm ${darkMode ? 'text-amber-400/70' : 'text-amber-600/70'}`}>
                  Rozvrh pro obor {changedProgramName} byl aktualizován od poslední návštěvy ({formatDate(changedTimestamp)})
                </p>
              </div>
              <button
                onClick={dismissScheduleChange}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
              >
                Zavřít
              </button>
            </div>
          </div>
        )}

        {/* Schedule Grid */}
        {!loading && !error && filteredData && (
          <>
            <ScheduleGrid 
              schedule={filteredData.schedule} 
              timeSlots={filteredData.timeSlots} 
              darkMode={darkMode}
              selectedSubject={selectedSubject}
              selectedClasses={selectedClasses}
              onClassToggle={handleClassToggle}
              teachersMap={teachersMap}
            />

            {/* Conflicts & Requirements */}
            {selectedClasses.length > 0 && (
              <div className="mt-6 space-y-4">
                {/* Conflicts */}
                {conflicts.length > 0 && (
                  <div className={`${darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}>
                    <h3 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                      <AlertCircle size={18} />
                      Konflikty ({conflicts.length})
                    </h3>
                    <div className="space-y-2">
                      {conflicts.map((conflict, index) => {
                        const day1 = dayLabels[conflict.class1.day] || conflict.class1.day;
                        const day2 = dayLabels[conflict.class2.day] || conflict.class2.day;
                        return (
                          <div key={index} className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                            {conflict.class1.courseCode} ({day1} {conflict.class1.startTime}-{conflict.class1.endTime}) 
                            × {conflict.class2.courseCode} ({day2} {conflict.class2.startTime}-{conflict.class2.endTime})
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                <div className="requirements-section">
                  <SubjectRequirements
                    requirements={requirements}
                    darkMode={darkMode}
                    loadingRequirements={loadingRequirements}
                    enabledOptionalSubjects={enabledOptionalSubjects}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && !scheduleData && (
          <div className={`flex items-center justify-center h-64 rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p>Vyberte program pro zobrazení rozvrhu</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {scheduleData && (
          <div className={`legend mt-6 rounded-xl shadow-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Legenda</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500/30 border border-blue-500 rounded"></div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Přednáška</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/30 border border-emerald-500 rounded"></div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cvičení</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500/30 border border-purple-500 rounded"></div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Seminář</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500/30 border border-orange-500 rounded"></div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>POHA</span>
              </div>
            </div>
          </div>
        )}

        <PohaModal
          isOpen={isPohaOpen}
          onClose={() => setIsPohaOpen(false)}
          selectedClasses={selectedClasses}
          onAddPoha={handleAddPoha}
          onRemovePoha={handleRemovePoha}
          darkMode={darkMode}
        />

        {/* Footer / Disclaimer */}
        <footer className="mt-12 py-6 border-t border-gray-700/30 text-center">
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Neoficiální studentský projekt pro vizualizaci rozvrhů FIM UHK. 
            Data jsou čerpána ze systému IS/STAG.
          </p>
          <p className={`text-[11px] mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            Aplikace neukládá žádná osobní data na externí servery – veškeré nastavení zůstává pouze ve vašem prohlížeči.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
