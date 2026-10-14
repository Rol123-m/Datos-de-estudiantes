import React, { useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Award,
  CalendarCheck,
  ChevronRight,
  Filter,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Student } from '../types/student';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onAddStudent: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenConnector: () => void;
  sheetTitle: string;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onAddStudent,
  onRefresh,
  isLoading,
  onOpenConnector,
  sheetTitle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'excelente' | 'en_riesgo'>('todos');

  // Extract unique groups
  const groups = Array.from(new Set(students.map((s) => s.grupo).filter(Boolean)));

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.nombre} ${s.apellidos || ''} ${s.id} ${s.email || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'todos' || s.grupo === selectedGroup;

    let matchesStatus = true;
    const calNum = typeof s.calificacion === 'number' ? s.calificacion : parseFloat(String(s.calificacion || '0'));
    if (statusFilter === 'excelente') {
      matchesStatus = !isNaN(calNum) && calNum >= 9.0;
    } else if (statusFilter === 'en_riesgo') {
      matchesStatus = !isNaN(calNum) && calNum < 6.0;
    }

    return matchesSearch && matchesGroup && matchesStatus;
  });

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2 truncate">
              <GraduationCap className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="truncate">Lista de Estudiantes</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold shrink-0">
                {students.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 truncate">
              Pestaña: <strong>{sheetTitle || 'Estudiantes'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors border border-slate-200"
              title="Recargar desde Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={onAddStudent}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Alumno</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellidos, ID o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filtro:
          </span>

          <button
            onClick={() => setSelectedGroup('todos')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              selectedGroup === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({students.length})
          </button>

          {groups.map((grp) => {
            const count = students.filter((s) => s.grupo === grp).length;
            return (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedGroup === grp
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {grp} ({count})
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            onClick={() => setStatusFilter(statusFilter === 'excelente' ? 'todos' : 'excelente')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'excelente'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            ⭐ Destacados
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'en_riesgo' ? 'todos' : 'en_riesgo')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'en_riesgo'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            ⚠️ En riesgo (&lt;6)
          </button>
        </div>
      </div>

      {/* Student List View */}
      {filteredStudents.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-700 text-sm">No se encontraron estudiantes</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {students.length === 0
                ? 'Esta hoja no contiene filas aún o no ha sido conectada.'
                : 'Intenta con otro término de búsqueda o cambia los filtros.'}
            </p>
          </div>
          {students.length === 0 && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={onOpenConnector}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Conectar otra hoja
              </button>
              <button
                onClick={onAddStudent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Agregar primer alumno
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStudents.map((student) => {
            const calNum = typeof student.calificacion === 'number' 
              ? student.calificacion 
              : parseFloat(String(student.calificacion || 'NaN'));
            const hasCal = !isNaN(calNum);
            const isApproved = hasCal && calNum >= 6.0;

            return (
              <div
                key={`${student.id}-${student.rowIndex}`}
                onClick={() => onSelectStudent(student)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {student.nombre.charAt(0)}
                      </div>
                      <div className="truncate">
                        <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                          {student.nombre} {student.apellidos || ''}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded-xs">{student.id}</span>
                          {student.grupo && (
                            <span>• {student.grupo}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Badges / Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-slate-400 text-[11px]">Nota:</span>
                      <span className={`font-bold ${
                        !hasCal ? 'text-slate-500' : isApproved ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {student.calificacion !== undefined && student.calificacion !== '' ? student.calificacion : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-slate-400 text-[11px]">Asist:</span>
                      <span className="font-bold text-slate-700">
                        {student.asistencia ? `${student.asistencia}${String(student.asistencia).includes('%') ? '' : '%'}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {student.observaciones && (
                  <p className="mt-2.5 text-[11px] text-slate-500 line-clamp-1 italic bg-slate-50 px-2 py-1 rounded-lg">
                    "{student.observaciones}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
