import React from 'react';
import { Clock, MapPin, User, BookOpen } from 'lucide-react';
import { resolveTeacherName } from '../utils/stagParser';
import ScheduleBlock from './ScheduleBlock';

const ScheduleGrid = ({ schedule, timeSlots, darkMode, selectedSubject, selectedClasses, onClassToggle, teachersMap }) => {
  const dayNames = { Mon: 'Po', Tue: 'Út', Wed: 'St', Thu: 'Čt', Fri: 'Pá' };
  
  // Převod času "HH:MM" na minuty od půlnoci
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Výpočet pozice v gridu pro POHA s libovolným časem
  const getGridPosition = (item, timeSlots) => {
    if (!timeSlots || timeSlots.length === 0) return { gridColumnStart: 2, gridColumnEnd: 'span 2' };

    const [startStr, endStr] = (item.time || `${item.startTime}-${item.endTime}`).split('-');
    const startMin = toMinutes(startStr);
    const endMin = toMinutes(endStr);

    // 1. Začátek v mřížce
    let colStart = timeSlots.findIndex(slot => {
      const slotMin = toMinutes(slot);
      return slotMin >= startMin - 20;
    });

    if (colStart === -1) colStart = 0;

    // 2. Šířka bloku (1 vyučovací hodina = min 2 sloty v mřížce)
    const durationMin = Math.max(endMin - startMin, 45);
    // Cokoliv nad 45 minut zabere 2 sloupce, nad 100 minut 3 sloupce atd.
    const colSpan = Math.max(2, Math.round(durationMin / 45));

    return {
      gridColumnStart: colStart + 2, // +2 kvůli záhlaví dne
      gridColumnEnd: `span ${colSpan}` 
    };
  };
  
  // Získáme dny, které reálně máme v datech (1 den při filtru, 5 dnů při celém týdnu)
  const activeDays = Object.keys(schedule || {}).sort((a, b) => {
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return order.indexOf(a) - order.indexOf(b);
  });
  
  const calculateDayLayout = (daySchedule) => {
    if (!daySchedule || daySchedule.length === 0) return { rows: 1, layout: {} };
    
    const layout = {};
    
    daySchedule.forEach(classItem => {
      // Pro POHA použijeme dynamické mapování času
      if (classItem.subject === 'POHA') {
        const pos = getGridPosition(classItem, timeSlots);
        const span = parseInt(pos.gridColumnEnd.replace('span ', ''), 10);
        layout[classItem.id] = {
          start: pos.gridColumnStart - 2, // Převod zpět na index (odečteme +2)
          end: (pos.gridColumnStart - 2) + span,
          row: 0
        };
      } else {
        const startIndex = timeSlots.indexOf(classItem.startTime);
        const endIndex = timeSlots.indexOf(classItem.endTime);
        
        layout[classItem.id] = {
          start: classItem.colStart || startIndex,
          end: (classItem.colStart || startIndex) + (classItem.colSpan || 2),
          row: 0
        };
      }
    });
    
    // Assign rows to avoid overlaps using a simple greedy algorithm
    const rows = [];
    
    daySchedule.forEach(classItem => {
      const classLayout = layout[classItem.id];
      let placed = false;
      
      for (let row = 0; row < rows.length && !placed; row++) {
        let canPlace = true;
        for (const otherId of rows[row]) {
          const otherLayout = layout[otherId];
          // Check overlap
          if (classLayout.start < otherLayout.end && classLayout.end > otherLayout.start) {
            canPlace = false;
            break;
          }
        }
        
        if (canPlace) {
          classLayout.row = row;
          rows[row].push(classItem.id);
          placed = true;
        }
      }
      
      if (!placed) {
        classLayout.row = rows.length;
        rows.push([classItem.id]);
      }
    });
    
    return { rows: rows.length, layout };
  };
  
  const dayLayouts = {};
  activeDays.forEach(day => {
    dayLayouts[day] = calculateDayLayout(schedule[day]);
  });
  
  const getTypeColor = (type, isSelected, isDimmed) => {
    if (isDimmed) {
      return darkMode ? 'bg-gray-800/50 border-gray-700 text-gray-500' : 'bg-gray-100/50 border-gray-200 text-gray-400';
    }
    
    // Base colors by type
    const baseColors = {
      PREDN: darkMode ? 'bg-blue-900/50 border-blue-700 text-blue-200' : 'bg-blue-100 border-blue-300 text-blue-800',
      CVIC: darkMode ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-green-100 border-green-300 text-green-800',
      SEM: darkMode ? 'bg-purple-900/50 border-purple-700 text-purple-200' : 'bg-purple-100 border-purple-300 text-purple-800',
      LAB: darkMode ? 'bg-orange-900/50 border-orange-700 text-orange-200' : 'bg-orange-100 border-orange-300 text-orange-800',
      default: darkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-800'
    };
    
    const baseColor = baseColors[type] || baseColors.default;
    
    // Selected colors (more opaque and stronger border)
    const selectedColors = {
      PREDN: darkMode ? 'bg-blue-700 border-blue-500 text-white' : 'bg-blue-500 border-blue-600 text-white',
      CVIC: darkMode ? 'bg-green-700 border-green-500 text-white' : 'bg-green-500 border-green-600 text-white',
      SEM: darkMode ? 'bg-purple-700 border-purple-500 text-white' : 'bg-purple-500 border-purple-600 text-white',
      LAB: darkMode ? 'bg-orange-700 border-orange-500 text-white' : 'bg-orange-500 border-orange-600 text-white',
      default: darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-500 border-gray-600 text-white'
    };
    
    // Add selection indicator (ring) with stronger colors
    if (isSelected) {
      return `${selectedColors[type] || selectedColors.default} ring-4 ring-blue-400 ring-opacity-50`;
    }
    
    return baseColor;
  };
  
  const getTypeLabel = (type) => {
    switch (type) {
      case 'PREDN':
        return 'Přednáška';
      case 'CVIC':
        return 'Cvičení';
      case 'SEM':
        return 'Seminář';
      case 'LAB':
        return 'Laboratoř';
      default:
        return type;
    }
  };
  
  const findClassAtSlot = (day, timeIndex) => {
    const daySchedule = schedule[day] || [];
    return daySchedule.find(classItem => {
      const startIndex = timeSlots.indexOf(classItem.startTime);
      const endIndex = timeSlots.indexOf(classItem.endTime);
      return timeIndex >= startIndex && timeIndex <= endIndex;
    });
  };
  
  const getColspanForClass = (classItem) => {
    const startIndex = timeSlots.indexOf(classItem.startTime);
    const endIndex = timeSlots.indexOf(classItem.endTime);
    return endIndex - startIndex + 1;
  };
  
  const getRenderedClasses = (day) => {
    const rendered = new Set();
    const daySchedule = schedule[day] || [];
    return daySchedule.filter(classItem => {
      const startIndex = timeSlots.indexOf(classItem.startTime);
      if (rendered.has(startIndex)) return false;
      rendered.add(startIndex);
      return true;
    });
  };
  
  if (!timeSlots || timeSlots.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Žádná data k zobrazení</p>
      </div>
    );
  }
  
  return (
    <div className={`schedule-grid rounded-xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`text-white ${darkMode ? 'bg-blue-900' : 'bg-uhk-blue'}`}>
              <th className="p-4 text-left font-semibold min-w-[80px]">Den</th>
              {timeSlots.map((time, index) => (
                <th key={index} className="p-3 text-center font-semibold min-w-[70px] border-l border-white/20">
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeDays.map((day, dayIndex) => {
              const daySchedule = schedule[day] || [];
              const { rows, layout } = dayLayouts[day];
              
              return (
                <React.Fragment key={day}>
                  {[...Array(rows)].map((_, rowIndex) => {
                    return (
                      <tr key={`${day}-${rowIndex}`} className={`border-b transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'} ${rowIndex === 0 && dayIndex > 0 ? 'border-t-4' : ''}`}>
                        {rowIndex === 0 && (
                          <td 
                            className={`p-4 font-semibold sticky left-0 ${darkMode ? 'text-blue-300 bg-gray-700' : 'text-uhk-dark bg-uhk-light'}`}
                            rowSpan={rows}
                          >
                            <div className="flex flex-col">
                              <span>{dayNames[day] || day}</span>
                              {activeDays.length === 1 && (
                                <span className={`text-[11px] font-normal ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                  Denní pohled
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {timeSlots.map((time, timeIndex) => {
                          // Normal mode - find class that starts in this cell and row
                          const classInCell = daySchedule.find(classItem => {
                            const classLayout = layout[classItem.id];
                            if (!classLayout) return false;
                            return classLayout.row === rowIndex && 
                                   timeIndex === classLayout.start;
                          });
                          
                          // Check if this cell is covered by an ongoing class in this row
                          const isCovered = daySchedule.some(classItem => {
                            const classLayout = layout[classItem.id];
                            if (!classLayout) return false;
                            return classLayout.row === rowIndex && 
                                   timeIndex > classLayout.start && 
                                   timeIndex < classLayout.end;
                          });

                          if (classInCell) {
                            const colspan = classInCell.colSpan || 2;
                            const isSelected = selectedClasses.find(c => c.id === classInCell.id);
                            const isDimmed = selectedSubject && classInCell.subject !== selectedSubject;
                            
                            return (
                              <td
                                key={timeIndex}
                                colSpan={colspan}
                                className={`p-2 border-l border-2 rounded-md m-1 relative ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${!isSelected ? 'schedule-block-unselected' : ''}`}
                              >
                                <ScheduleBlock
                                  item={classInCell}
                                  teachersMap={teachersMap}
                                  isSelected={isSelected}
                                  selectedSubject={selectedSubject}
                                  onClick={() => onClassToggle(classInCell)}
                                />
                              </td>
                            );
                          } else if (isCovered) {
                            return null; // This cell is covered by colspan
                          } else {
                            // Empty cell
                            return (
                              <td key={timeIndex} className={`p-2 border-l min-w-[70px] ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="h-full min-h-[60px]"></div>
                              </td>
                            );
                          }
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleGrid;
