import React, { useState, useMemo } from 'react';
import { Search, Filter, Dumbbell, X } from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';
import { ExerciseCard } from '../components/ExerciseCard';

export const Exercises: React.FC = () => {
  const exercises = useRoutineStore((s) => s.exercises);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('todos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('todos');

  const muscleOptions: { id: string; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'pecho', label: 'Pecho' },
    { id: 'espalda', label: 'Espalda' },
    { id: 'piernas', label: 'Piernas' },
    { id: 'hombros', label: 'Hombros' },
    { id: 'brazos', label: 'Brazos' },
    { id: 'core', label: 'Core' },
  ];

  const equipmentOptions: { id: string; label: string }[] = [
    { id: 'todos', label: 'Cualquier equipo' },
    { id: 'ninguno', label: 'Sin equipo (Corporal)' },
    { id: 'mancuernas', label: 'Mancuernas' },
    { id: 'gimnasio', label: 'Gimnasio completo' },
  ];

  const difficultyOptions: { id: string; label: string }[] = [
    { id: 'todos', label: 'Todas las dificultades' },
    { id: 'principiante', label: 'Principiante' },
    { id: 'intermedio', label: 'Intermedio' },
    { id: 'avanzado', label: 'Avanzado' },
  ];

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMuscle =
        selectedMuscle === 'todos' || ex.muscle_group === selectedMuscle;

      const matchesEquipment =
        selectedEquipment === 'todos' || ex.equipment === selectedEquipment;

      const matchesDifficulty =
        selectedDifficulty === 'todos' || ex.difficulty === selectedDifficulty;

      return matchesSearch && matchesMuscle && matchesEquipment && matchesDifficulty;
    });
  }, [exercises, searchTerm, selectedMuscle, selectedEquipment, selectedDifficulty]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedMuscle !== 'todos' ||
    selectedEquipment !== 'todos' ||
    selectedDifficulty !== 'todos';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMuscle('todos');
    setSelectedEquipment('todos');
    setSelectedDifficulty('todos');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24 text-[#1C1917]">
      {/* Top Header */}
      <header className="px-4 pt-6 pb-3 max-w-lg mx-auto">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading block truncate">
              CATÁLOGO DE MOVIMIENTOS
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight font-heading uppercase flex items-center gap-2">
              <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-[#9E5325] shrink-0" />
              <span className="truncate">Biblioteca</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-[#78716C] mt-0.5 truncate">
              Técnica, posturas y biomecánica de {exercises.length} ejercicios
            </p>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#9E5325] font-bold hover:underline flex items-center gap-1 font-heading uppercase shrink-0 pt-1 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E5325]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ejercicio o grupo muscular..."
            className="w-full bg-white border border-[#EAE3D9] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#9E5325] shadow-sm transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Muscle group horizontal pill selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {muscleOptions.map((m) => {
            const isSelected = selectedMuscle === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMuscle(m.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all capitalize select-none font-heading ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                    : 'bg-white text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Secondary filters row (Equipment & Difficulty dropdowns) */}
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="bg-white border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs text-[#44403C] focus:outline-none focus:border-[#9E5325] font-medium"
          >
            {equipmentOptions.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.label}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-white border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs text-[#44403C] focus:outline-none focus:border-[#9E5325] font-medium"
          >
            {difficultyOptions.map((diff) => (
              <option key={diff.id} value={diff.id}>
                {diff.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Exercises List */}
      <main className="max-w-lg mx-auto px-4 pt-3 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#78716C] px-1 font-semibold uppercase tracking-wider font-heading gap-2">
          <span className="truncate">{filteredExercises.length} ejercicios encontrados</span>
          {selectedMuscle !== 'todos' && (
            <span className="text-[#9E5325] capitalize whitespace-nowrap shrink-0">Filtro: {selectedMuscle}</span>
          )}
        </div>

        {filteredExercises.length > 0 ? (
          filteredExercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#EAE3D9] my-6 shadow-sm">
            <Filter className="w-10 h-10 text-[#A8A29E] mx-auto mb-2" />
            <h3 className="font-bold text-[#1C1917] text-base font-heading uppercase">Sin resultados</h3>
            <p className="text-xs text-[#78716C] mt-1 max-w-xs mx-auto">
              No encontramos ejercicios con los filtros seleccionados. Prueba a cambiar el grupo muscular o equipo.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 bg-[#9E5325] text-white font-bold text-xs px-4 py-2.5 rounded-xl min-h-[44px] uppercase font-heading"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
