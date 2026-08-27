import { fetchProgramList, fetchStagSchedule, fetchAllSubjectRequirements, getOborIdnoDynamically } from './stagParser';

/**
 * Automaticky otestuje všechny dostupné rozvrhy a vypíše výsledky
 */
export let runStagAutoTest = async (rok = 2026) => {
  console.group('STAG Auto Test');
  const programs = await fetchProgramList();

  const results = [];

  for (const prog of programs) {
    const progId = prog.id;
    try {
      // 1. Zjistíme přiřazené oborIdno
      const oborIdno = await getOborIdnoDynamically(progId, rok);

      // 2. Stáhneme rozvrh
      const scheduleData = await fetchStagSchedule(progId);
      const subjectsCount = scheduleData.subjects?.length || 0;

      if (subjectsCount === 0) {
        results.push({
          Program: progId,
          OborIdno: oborIdno || '❌ NENALEZENO',
          Predmety: 0,
          'A (Povinné)': 0,
          'B (PV)': 0,
          'C (Volitelné)': 0,
          Status: '⚠️ Prázdný rozvrh'
        });
        continue;
      }

      // 3. Spočítáme statuty A / B / C
      const reqs = await fetchAllSubjectRequirements(scheduleData.schedule, progId, rok);
      let countA = 0;
      let countB = 0;
      let countC = 0;

      Object.values(reqs).forEach(r => {
        if (r.statut === 'A') countA++;
        else if (r.statut === 'B') countB++;
        else countC++;
      });

      // Vyhodnocení: pokud má rozvrh předměty, ale 0 Aček a 0 Béček, je to podezřelé
      const isSuspicious = countA === 0 && countB === 0 && subjectsCount > 0;

      results.push({
        Program: progId,
        OborIdno: oborIdno,
        Predmety: subjectsCount,
        'A (Povinné)': countA,
        'B (PV)': countB,
        'C (Volitelné)': countC,
        Status: isSuspicious ? '❌ POUZE C (Chyba plánu)' : '✅ OK'
      });

    } catch (err) {
      results.push({
        Program: progId,
        OborIdno: 'ERROR',
        Predmety: 0,
        'A (Povinné)': 0,
        'B (PV)': 0,
        'C (Volitelné)': 0,
        Status: `💥 Chyba: ${err.message}` 
      });
    }
  }

  console.table(results);
  console.groupEnd();
  return results;
};
