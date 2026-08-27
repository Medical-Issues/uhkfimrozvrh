export const parseStagHTML = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const daysMap = { 'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri' };
  const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const schedule = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
  const subjects = new Set();

  // 1. Najít hlavní tabulku s rozvrhem (obsahuje Mon/Tue nebo hlavičku s časy)
  const allTables = doc.querySelectorAll('table');
  let scheduleTable = null;
  for (const t of allTables) {
    if (t.textContent.includes('7:25') && t.textContent.includes('Mon')) {
      scheduleTable = t;
      break;
    }
  }

  if (!scheduleTable) {
    return { timeSlots: [], schedule, subjects: [] };
  }

  const rows = Array.from(scheduleTable.querySelectorAll('tr'));
  if (rows.length === 0) return { timeSlots: [], schedule, subjects: [] };

  // 2. Extrakce časových slotů z prvního řádku (hlavičky)
  const headerTds = Array.from(rows[0].querySelectorAll('td'));
  // První TD je prázdný roh, zbytek jsou časy
  const timeSlots = headerTds.slice(1).map(td => td.textContent.trim()).filter(Boolean);

  let currentDay = null;

  // 3. Procházení řádků rozvrhu
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const cells = Array.from(row.children);
    let cellPointer = 0;
    let colIndex = 0; // index v rámci timeSlots (0 = 7:25, 1 = 8:15...)

    // Zjistíme, jestli první buňka obsahuje název dne
    if (cells.length > 0) {
      const firstText = cells[0].textContent.trim();
      if (daysMap[firstText]) {
        currentDay = daysMap[firstText];
        cellPointer = 1; // přeskočíme buňku se dnem (má rowspan)
      }
    }

    if (!currentDay) continue;

    // Procházíme buňky v řádku a mapujeme je na časovou osu
    while (cellPointer < cells.length && colIndex < timeSlots.length) {
      const cell = cells[cellPointer];
      const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

      // Zkontrolujeme, zda buňka obsahuje předmět (má v sobě vnořenou tabulku s kódem)
      const innerTables = cell.querySelectorAll('table');
      if (innerTables.length >= 2) {
        // Vytáhneme data z vnořených tabulek
        let teacher = '';
        let room = '';
        let courseCode = '';
        let type = '';

        // Tabulka 1: Vyučující a Učebna (např. SOB | J7)
        const t1Tds = innerTables[0]?.querySelectorAll('td');
        if (t1Tds && t1Tds.length >= 2) {
          teacher = t1Tds[0].textContent.trim();
          room = t1Tds[1].textContent.trim();
        }

        // Tabulka 2: Kód předmětu (např. KIT/ETH-P/01)
        const t2Td = innerTables[1]?.querySelector('td');
        if (t2Td) {
          courseCode = t2Td.textContent.trim();
        }

        // Tabulka 3: Typ akce (např. PREDN / CVIC)
        if (innerTables[2]) {
          const t3Tds = innerTables[2].querySelectorAll('td');
          type = t3Tds[t3Tds.length - 1]?.textContent.trim() || '';
        }

        const startTime = timeSlots[colIndex];
        const endIndex = colIndex + colspan;
        const endTime = timeSlots[endIndex] || timeSlots[timeSlots.length - 1] || '';

        if (courseCode && startTime) {
          const subjectMatch = courseCode.match(/\/([A-Z0-9]+)-/);
          const subjectName = subjectMatch ? subjectMatch[1] : courseCode.split('/')[0];
          subjects.add(subjectName);

          schedule[currentDay].push({
            id: `${currentDay}-${startTime}-${courseCode}-${colIndex}`,
            teacher,
            room,
            courseCode,
            subject: subjectName,
            type,
            startTime,
            endTime,
            day: currentDay,
            colStart: colIndex,   // přesný index sloupce pro CSS Grid
            colSpan: colspan,     // šířka v mřížce (typicky 2)
            selected: false
          });
        }
      }

      // Posuneme se v čase o tolik slotů, kolik buňka zabírá
      colIndex += colspan;
      cellPointer++;
    }
  }

  return {
    timeSlots,
    schedule,
    subjects: Array.from(subjects).sort()
  };
};

export const fetchStagSchedule = async (identifier) => {
  const url = `/api/rozvrhy/ttable.asp?identifier=${identifier}&weeks=1-13&idtype=name&objectclass=Programmes+of+Study&periods=2-17&days=1-5&width=100`;
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    return parseStagHTML(html);
  } catch (error) {
    return { timeSlots: [], schedule: {} };
  }
};

export const fetchProgramList = async () => {
  try {
    // Load custom programs from localStorage
    const savedPrograms = localStorage.getItem('customPrograms');
    if (savedPrograms) {
      const customPrograms = JSON.parse(savedPrograms);
      if (customPrograms.length > 0) {
        return [...samplePrograms, ...customPrograms];
      }
    }
    
    // Try to parse from STAG schedules page
    const url = '/api/rozvrhy/fim.htm';
    const response = await fetch(url);
    
    if (!response.ok) {
      return samplePrograms;
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try to extract programs from select dropdown
    const selects = doc.querySelectorAll('select');
    
    const programs = [];
    
    // Regulární výraz pro učebny, které chceme vyřadit:
    // Učebny na FIM: J1-J99, A201-A299, B1-B99, T1-T99 apod.
    const roomPattern = /^(j\d+|a\d{3}|b\d+|t\d+)$/i;
    
    selects.forEach((select) => {
      const options = select.querySelectorAll('option');
      
      options.forEach(option => {
        const value = (option.value || '').trim();
        const text = (option.textContent || '').trim();
        
        if (!value || value === '') return;
        
        // Pokud je to učebna, přeskočíme
        if (roomPattern.test(value)) return;
        
        // Povolíme pouze validní studijní skupiny (např. isb33, im31, ai3s1, eam21, mcra1, dv21)
        if (value.match(/^[a-z]{2,4}\d{1,2}[a-z0-9]*$/i)) {
          const id = value.toLowerCase();
          if (!programs.find(p => p.id === id)) {
            programs.push({
              id,
              name: text || id.toUpperCase()
            });
          }
        }
      });
    });
    
    if (programs.length > 0) {
      return programs.sort((a, b) => a.id.localeCompare(b.id));
    }
    
    return samplePrograms;
  } catch (error) {
    return samplePrograms;
  }
};

export const saveCustomProgram = (program) => {
  const savedPrograms = localStorage.getItem('customPrograms');
  let customPrograms = savedPrograms ? JSON.parse(savedPrograms) : [];
  
  if (!customPrograms.find(p => p.id === program.id)) {
    customPrograms.push(program);
    localStorage.setItem('customPrograms', JSON.stringify(customPrograms));
  }
};

export const checkConflicts = (selectedClasses) => {
  const conflicts = [];
  
  for (let i = 0; i < selectedClasses.length; i++) {
    for (let j = i + 1; j < selectedClasses.length; j++) {
      const class1 = selectedClasses[i];
      const class2 = selectedClasses[j];
      
      // Check if same day
      if (class1.day !== class2.day) continue;
      
      // Check time overlap
      const start1 = timeToMinutes(class1.startTime);
      const end1 = timeToMinutes(class1.endTime);
      const start2 = timeToMinutes(class2.startTime);
      const end2 = timeToMinutes(class2.endTime);
      
      if (start1 < end2 && start2 < end1) {
        conflicts.push({
          class1,
          class2,
          reason: 'Časový konflikt'
        });
      }
    }
  }
  
  return conflicts;
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const validateRequirements = (selectedClasses, requirementsMap) => {
  const validationResults = {};

  if (!requirementsMap) {
    return validationResults;
  }

  Object.entries(requirementsMap).forEach(([subject, req]) => {
    const selected = selectedClasses.filter(c => c.subject === subject);

    const hasLecture = selected.some(c => c.type === 'PREDN' || c.courseCode?.includes('-P/'));
    const hasExercise = selected.some(c => c.type === 'CVIC' || c.courseCode?.includes('-C/'));
    const hasSeminar = selected.some(c => c.type === 'SEM' || c.courseCode?.includes('-S/'));

    const missing = [];
    if (req.needsLecture && !hasLecture) missing.push('Přednáška');
    if (req.needsExercise && !hasExercise) missing.push('Cvičení');
    if (req.needsSeminar && !hasSeminar) missing.push('Seminář');

    validationResults[subject] = {
      subject,
      nazev: req.nazev,
      kredity: req.kredity,
      typZkousky: req.typZkousky,
      statut: req.statut, // 'A' | 'B' | 'C'
      needsLecture: req.needsLecture,
      needsExercise: req.needsExercise,
      needsSeminar: req.needsSeminar,
      hasLecture,
      hasExercise,
      hasSeminar,
      isComplete: selected.length > 0 && missing.length === 0,
      isSelected: selected.length > 0,
      missing,
      selectedCount: selected.length
    };
  });

  // Přidat POHA pokud je vybrána
  const pohaClasses = selectedClasses.filter(c => c.subject === 'POHA');
  if (pohaClasses.length > 0) {
    validationResults['POHA'] = {
      subject: 'POHA',
      nazev: 'Pohybové aktivity',
      kredity: 2,
      typZkousky: 'Zápočet',
      statut: 'C',
      needsLecture: false,
      needsExercise: true,
      needsSeminar: false,
      hasLecture: false,
      hasExercise: true,
      hasSeminar: false,
      isComplete: true,
      isSelected: true,
      missing: [],
      selectedCount: pohaClasses.length
    };
  }

  return validationResults;
};

export const samplePrograms = [
  { id: 'isb33', name: 'ISB33 - Informační systémy' },
  { id: 'isb34', name: 'ISB34 - Informační systémy' },
  { id: 'im33', name: 'IM33 - Informatika a management' },
  { id: 'ki33', name: 'KI33 - Kybernetika' },
  { id: 'am33', name: 'AM33 - Aplikovaná matematika' },
  { id: 'ki34', name: 'KI34 - Kybernetika' },
  { id: 'fm34', name: 'FM34 - Finanční matematika' },
  { id: 'ai33', name: 'AI33 - Umělá inteligence' },
];

// Dynamická paměťová cache
let cachedAllObory = null;
const studyPlansCache = new Map();

/**
 * 1. Načte všechny obory FIM dynamicky (bez filtrování, které by cokoliv zahodilo)
 */
export const fetchAllFimObory = async (rok = 2026) => {
  if (cachedAllObory) return cachedAllObory;

  try {
    const progRes = await fetch(`/api/stag/ws/services/rest2/programy/getStudijniProgramy?fakulta=FIM&rok=${rok}&outputFormat=JSON`);
    if (!progRes.ok) throw new Error('Chyba getStudijniProgramy');
    const progData = await progRes.json();
    
    let progs = [];
    if (Array.isArray(progData?.programInfo)) {
      progs = progData.programInfo;
    } else if (progData?.programInfo) {
      progs = [progData.programInfo];
    }

    // Dotáhneme obory pro všechny programy FIM
    const oboryPromises = progs.map(async (p) => {
      try {
        const res = await fetch(`/api/stag/ws/services/rest2/programy/getOboryStudijnihoProgramu?stprIdno=${p.stprIdno}&outputFormat=JSON`);
        if (!res.ok) return [];
        const data = await res.json();
        const items = data.oborInfo ? (Array.isArray(data.oborInfo) ? data.oborInfo : [data.oborInfo]) : [];
        return items.map(o => ({
          ...o,
          programNazev: p.nazevCz || p.nazev || '',
          stprIdno: p.stprIdno
        }));
      } catch {
        return [];
      }
    });

    const nested = await Promise.all(oboryPromises);
    cachedAllObory = nested.flat();
    return cachedAllObory;
  } catch (err) {
    return [];
  }
};

/**
 * Plně dynamické a přesné spárování libovolného rozvrhu na oborIdno
 */
export const getOborIdnoDynamically = async (identifier = 'isb33', rok = 2026) => {
  const obory = await fetchAllFimObory(rok);
  if (!obory || obory.length === 0) return 4166;

  const raw = identifier.toLowerCase().trim();

  // 1. Detekce délky studia (2 = Mgr, 3 = Bc)
  const isMcr = raw.startsWith('mcr');
  const isBcStrict = raw.includes('3') || isMcr || raw.startsWith('isb');
  const isMgr = !isBcStrict && raw.includes('2');
  const studyLength = isMgr ? '2' : '3';

  // 2. Normalizace klíče programu
  let key = raw.match(/^([a-z]+)/)?.[1] || raw;
  if (key.startsWith('isb')) key = 'isb';
  else if (key.startsWith('ais') || key.startsWith('ai')) key = 'ai';
  else if (key.startsWith('im')) key = 'im';
  else if (key.startsWith('mcra') || key.startsWith('mcr')) key = 'mcr';
  else if (key.startsWith('eam') || key.startsWith('em')) key = 'em';
  else if (key.startsWith('dv')) key = 'dv';

  // Filtrujeme české prezenční obory
  const czechPrezObory = obory.filter(o => {
    const zkr = (o.zkratka || o.cisloOboru || '').toLowerCase();
    const isPrez = (o.forma || '').toLowerCase().includes('p') || (o.formaNazev || '').toLowerCase().includes('prezen');
    const isEnglish = zkr.endsWith('-an') || zkr.endsWith('-dd') || zkr.endsWith('-en') || zkr.includes('dd');
    return isPrez && !isEnglish;
  });

  const pool = czechPrezObory.length > 0 ? czechPrezObory : obory;

  // 3. Hledání nejlepší shody v českých oborech STAGu
  let candidates = pool.filter(o => {
    const zkr = (o.zkratka || o.cisloOboru || '').toLowerCase();
    const name = (o.nazevCz || o.nazev || o.programNazev || '').toLowerCase();

    let matchesObor = false;
    if (key === 'isb') matchesObor = zkr.includes('isb') || name.includes('bezpečnost');
    else if (key === 'ai') matchesObor = (zkr.startsWith('ai') || name.includes('aplikovaná informatika')) && !name.includes('management');
    else if (key === 'im') matchesObor = (zkr.startsWith('im') || name.includes('informační management')) && !name.includes('aplikovaná');
    else if (key === 'mcr') matchesObor = zkr.includes('mcr') || zkr.includes('cr') || name.includes('cestovn') || name.includes('ruch') || name.includes('turism');
    else if (key === 'em') matchesObor = zkr.startsWith('em') || zkr.startsWith('eam') || name.includes('ekonomika');
    else if (key === 'dv') matchesObor = zkr.startsWith('dv') || name.includes('datov');

    const isCorrectLevel = isMgr 
      ? (zkr.includes('2') || o.typ === 'N' || o.typ === 'M' || name.includes('navazující') || name.includes('magistr'))
      : (zkr.includes('3') || o.typ === 'B' || name.includes('bakalář') || isMcr);

    return matchesObor && isCorrectLevel;
  });

  if (candidates.length > 0) {
    // Upřednostníme přesnou jazykovou větev (pro mcra preferujeme -a / anglický jazyk)
    candidates.sort((a, b) => {
      const zkrA = (a.zkratka || a.cisloOboru || '').toLowerCase();
      const zkrB = (b.zkratka || b.cisloOboru || '').toLowerCase();
      const nameA = (a.nazevCz || a.nazev || '').toLowerCase();
      const nameB = (b.nazevCz || b.nazev || '').toLowerCase();

      if (raw.startsWith('mcra')) {
        const isA_A = zkrA.includes('-a') || nameA.includes('anglick');
        const isB_A = zkrB.includes('-a') || nameB.includes('anglick');
        if (isA_A && !isB_A) return -1;
        if (!isA_A && isB_A) return 1;
      }

      return (b.oborIdno || 0) - (a.oborIdno || 0);
    });

    const matched = candidates[0];
    return matched.oborIdno;
  }

  return obory[0]?.oborIdno || 4166;
};

/**
 * Správně extrahuje katedru, zkratku předmětu a typ akce z kódu rozvrhové akce
 * Např. "KIKM/SDBS-P/01" -> katedra: "KIKM", zkratka: "SDBS", type: "PREDN"
 *       "KIT/OS2-C/05"   -> katedra: "KIT",  zkratka: "OS2",  type: "CVIC"
 */
export const parseCourseCode = (courseCode) => {
  if (!courseCode) return { katedra: 'KIT', zkratka: '', type: '' };
  
  const match = courseCode.match(/^([A-Z0-9]+)\/([A-Z0-9]+)(?:-([A-Z0-9]+)\/(\d+))?/i);
  if (match) {
    const katedra = match[1];
    const zkratka = match[2];
    const rawType = match[3] || '';
    let type = 'CVIC';
    if (rawType.startsWith('P')) type = 'PREDN';
    else if (rawType.startsWith('S')) type = 'SEM';
    
    return { katedra, zkratka, type };
  }
  
  return { katedra: 'KIT', zkratka: courseCode, type: 'CVIC' };
};

/**
 * 4. Načtení předmětů studijního plánu ze STAG WS
 */
export const fetchStudyPlanSubjects = async (oborIdno, rok = 2026) => {
  if (!oborIdno) return new Map();

  const cacheKey = `${oborIdno}_${rok}`;
  if (studyPlansCache.has(cacheKey)) {
    return studyPlansCache.get(cacheKey);
  }

  const url = `/api/stag/ws/services/rest2/predmety/getPredmetyByObor?oborIdno=${oborIdno}&rok=${rok}&outputFormat=JSON`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    let items = [];
    if (Array.isArray(data?.predmetOboru)) {
      items = data.predmetOboru;
    } else if (data?.predmetOboru) {
      items = [data.predmetOboru];
    }

    const planMap = new Map();
    items.forEach((p) => {
      if (p.zkratka) {
        planMap.set(p.zkratka, {
          zkratka: p.zkratka,
          katedra: p.katedra,
          nazev: p.nazev,
          kredity: p.kreditu || 0,
          statut: p.statut || 'C',
          doporucenyRocnik: p.doporucenyRocnik,
          doporucenySemestr: p.doporucenySemestr,
          typZk: p.typZk
        });
      }
    });

    studyPlansCache.set(cacheKey, planMap);
    return planMap;
  } catch (err) {
    return new Map();
  }
};

/**
 * 4. Načte detail předmětu (hodiny výuky, kredity, zkoušky)
 * Endpoint: /ws/services/rest2/predmety/getPredmetInfo
 */
export const fetchSubjectRequirements = async (katedra, zkratka, rok = 2026) => {
  const url = `/api/stag/ws/services/rest2/predmety/getPredmetInfo?katedra=${encodeURIComponent(katedra)}&zkratka=${encodeURIComponent(zkratka)}&rok=${rok}&lang=cs&outputFormat=JSON`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return {
      katedra: data.katedra || katedra,
      subject: data.zkratka || zkratka,
      nazev: data.nazev || zkratka,
      kredity: data.kreditu || 0,
      typZkousky: data.typZkousky || '',
      maZapocetPredZk: data.maZapocetPredZk === 'ANO',
      needsLecture: (data.jednotekPrednasek || 0) > 0,
      needsExercise: (data.jednotekCviceni || 0) > 0,
      needsSeminar: (data.jednotekSeminare || 0) > 0,
      hoursLecture: data.jednotekPrednasek || 0,
      hoursExercise: data.jednotekCviceni || 0,
      hoursSeminar: data.jednotekSeminare || 0,
    };
  } catch (err) {
    return null;
  }
};

/**
 * 5. Hlavní funkce volaná z App.jsx
 */
export const fetchAllSubjectRequirements = async (schedule, currentProgramId = 'isb33', rok = 2026) => {
  // Dynamicky zjistíme oborIdno přesně pro aktuální rozvrh
  const oborIdno = await getOborIdnoDynamically(currentProgramId, rok);
  const studyPlanMap = await fetchStudyPlanSubjects(oborIdno, rok);

  const uniqueSubjects = new Map();
  Object.values(schedule).flat().forEach((item) => {
    if (item.courseCode) {
      const { katedra, zkratka } = parseCourseCode(item.courseCode);
      if (zkratka && !uniqueSubjects.has(zkratka)) {
        uniqueSubjects.set(zkratka, { katedra, zkratka, rawItem: item });
      }
    }
  });

  const requirementsMap = {};

  const promises = Array.from(uniqueSubjects.values()).map(async ({ katedra, zkratka, rawItem }) => {
    let req = null;
    try {
      req = await fetchSubjectRequirements(katedra, zkratka, rok);
    } catch (e) {}

    if (!req) {
      const allItemsForSubj = Object.values(schedule).flat().filter(i => i.subject === zkratka);
      req = {
        katedra,
        subject: zkratka,
        nazev: rawItem.subject || zkratka,
        kredity: 0,
        typZkousky: '',
        needsLecture: allItemsForSubj.some(i => i.type === 'PREDN' || i.courseCode?.includes('-P/')),
        needsExercise: allItemsForSubj.some(i => i.type === 'CVIC' || i.courseCode?.includes('-C/')),
        needsSeminar: allItemsForSubj.some(i => i.type === 'SEM' || i.courseCode?.includes('-S/')),
        hoursLecture: 2,
        hoursExercise: 2,
        hoursSeminar: 0
      };
    }

    const planInfo = studyPlanMap.get(zkratka);
    if (planInfo) {
      req.statut = planInfo.statut; // A / B / C ze STAGu
      if (!req.kredity && planInfo.kredity) req.kredity = planInfo.kredity;
    } else {
      req.statut = 'C';
    }

    requirementsMap[zkratka] = req;
  });

  await Promise.all(promises);
  return requirementsMap;
};

let staffListCache = null;

/**
 * Načte a rozparsuje oficiální staff_list.html z rozvrhového systému FIM UHK
 */
export const fetchFimStaffList = async () => {
  if (staffListCache) return staffListCache;

  const possibleUrls = [
    '/api/rozvrhy/fim/staff_list.html',
    '/api/rozvrhy/staff_list.html'
  ];

  for (const url of possibleUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      // Správné dekódování Windows-1250 ze starého webu UHK
      const buffer = await res.arrayBuffer();
      const decoder = new TextDecoder('windows-1250');
      const html = decoder.decode(buffer);

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const teacherMap = new Map();

      const rows = doc.querySelectorAll('table tr, p, li');
      rows.forEach(el => {
        const text = el.textContent?.trim() || '';
        if (!text) return;

        const cells = el.querySelectorAll('td');
        if (cells.length >= 2) {
          const code = cells[0].textContent.trim();
          const fullName = cells[1].textContent.trim();
          if (code && fullName) {
            teacherMap.set(code.toLowerCase(), fullName);
          }
        } else if (text.includes('-')) {
          const [code, ...rest] = text.split('-');
          const fullName = rest.join('-').trim();
          if (code && fullName) {
            teacherMap.set(code.trim().toLowerCase(), fullName);
          }
        }
      });

      if (teacherMap.size > 0) {
        staffListCache = teacherMap;
        return staffListCache;
      }
    } catch (err) {
      // Silent fail
    }
  }

  return new Map();
};

/**
 * Vyhledání celého jména vyučujícího podle zkratky ze staff_list
 */
export const resolveTeacherName = (rawCode, teacherMap) => {
  if (!rawCode || !teacherMap || teacherMap.size === 0) return rawCode || '';

  const clean = rawCode.trim();
  const lower = clean.toLowerCase();

  if (teacherMap.has(lower)) {
    return teacherMap.get(lower);
  }

  return clean;
};
