import React, { useState } from 'react';
import { X, Dumbbell, Plus, Trash2 } from 'lucide-react';

const DAYS = [
  { key: 'Po', label: 'Pondělí' },
  { key: 'Út', label: 'Úterý' },
  { key: 'St', label: 'Středa' },
  { key: 'Čt', label: 'Čtvrtek' },
  { key: 'Pá', label: 'Pátek' }
];

const PohaModal = ({ isOpen, onClose, selectedClasses, onAddPoha, onRemovePoha, darkMode }) => {
  const [sportName, setSportName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [place, setPlace] = useState('');
  const [day, setDay] = useState('St');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  if (!isOpen) return null;

  // Vyfiltrujeme existující uložené pohybové aktivity
  const savedPoha = selectedClasses.filter(c => c.subject === 'POHA');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sportName.trim()) return;

    const newPohaItem = {
      id: `poha-${Date.now()}`,
      subject: 'POHA',
      courseCode: `KRCH/POHA`,
      sportName: sportName.trim(),
      teacher: teacherName.trim() || 'KRCH',
      type: 'CVIC',
      day: day,
      time: `${startTime}-${endTime}`,
      startTime: startTime,
      endTime: endTime,
      room: place.trim() || 'Sportoviště',
      katedra: 'KRCH',
      kredity: 2
    };

    onAddPoha(newPohaItem);
    setSportName('');
    setTeacherName('');
    setPlace('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border ${
        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-700/50 mb-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="text-orange-500" size={22}/>
            <h3 className="text-lg font-bold">Pohybové aktivity (POHA)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400">
            <X size={20}/>
          </button>
        </div>

        {/* Formulář pro přidání vlastní aktivity */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-400">Sport / Aktivita *</label>
              <input
                type="text"
                placeholder="např. Squash, Posilovna, Plavání"
                value={sportName}
                onChange={(e) => setSportName(e.target.value)}
                required
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-400">Vyučující (volitelné)</label>
              <input
                type="text"
                placeholder="např. Hrnčíř, Novák..."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-400">Sportoviště</label>
              <input
                type="text"
                placeholder="např. Squash centrum, J10"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className={`w-full px-2.5 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-400">Den</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={`w-full px-2 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                }`}
              >
                {DAYS.map(d => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1.5">
              <div className="w-1/2">
                <label className="block text-xs font-semibold mb-1 text-gray-400">Od</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className={`w-full px-1.5 py-2 text-xs rounded-lg border focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                  }`}
                />
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-semibold mb-1 text-gray-400">Do</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className={`w-full px-1.5 py-2 text-xs rounded-lg border focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                  }`}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all active:scale-[0.98] cursor-pointer mt-2"
          >
            <Plus size={16}/>
            <span>Přidat aktivitu do rozvrhu</span>
          </button>
        </form>

        {/* Seznam existujících POHA aktivit */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Zapsané aktivity ({savedPoha.length}):
          </span>
          {savedPoha.length === 0 ? (
            <p className="text-xs text-gray-500 mt-2 italic">Zatím nemáte přidanou žádnou pohybovou aktivitu.</p>
          ) : (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1">
              {savedPoha.map(item => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    darkMode ? 'bg-orange-950/20 border-orange-500/30 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-900'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm">{item.sportName || item.name}</span>
                    <div className="text-xs opacity-75">
                      {item.day} {item.time} · {item.room} {item.teacher !== 'KRCH' ? `· ${item.teacher}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemovePoha(item)}
                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                    title="Odebrat aktivitu"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PohaModal;
