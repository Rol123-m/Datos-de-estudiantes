import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  CheckCheck,
  Search,
} from 'lucide-react';
import { Student, AttendanceStatus, DailyAttendanceRecord } from '../types/student';

interface AttendanceTrackerProps {
  students: Student[];
  onSaveAttendance: (dateStr: string, records: DailyAttendanceRecord[]) => void;
  isLoading: boolean;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  students,
  onSaveAttendance,
  isLoading,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [filterGroup, setFilterGroup] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Attendance map: student.id -> status
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      initial[s.id] = 'presente';
    });
    return initial;
  });

  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const groups = Array.from(new Set(students.map((s) => s.grupo).filter(Boolean)));

  const filteredStudents = students.filter((s) => {
    const matchesGroup = filterGroup === 'todos' || s.grupo === filterGroup;
    const fullName = `${s.nombre} ${s.apellidos || ''} ${s.id}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        next[s.id] = status;
      });
      return next;
    });
  };

  const handleTriggerSave = () => {
    const records: DailyAttendanceRecord[] = filteredStudents.map((s) => ({
      studentRowIndex: s.rowIndex,
      studentId: s.id,
      studentName: `${s.nombre} ${s.apellidos || ''}`.trim(),
      status: attendanceMap[s.id] || 'presente',
      note: notesMap[s.id] || '',
    }));

    onSaveAttendance(selectedDate, records);
  };

  // Calculations
  const presentCount = filteredStudents.filter((s) => (attendanceMap[s.id] || 'presente') === 'presente').length;
  const absentCount = filteredStudents.filter((s) => attendanceMap[s.id] === 'ausente').length;
  const lateCount = filteredStudents.filter((s) => attendanceMap[s.id] === 'tarde').length;
  const excusedCount = filteredStudents.filter((s) => attendanceMap[s.id] === 'justificado').length;
  const totalCount = filteredStudents.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top Controls card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Pase de Asistencia</h3>
              <p className="text-xs text-slate-500">Registra y sincroniza asistencia diaria en Google Sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTriggerSave}
              disabled={isLoading || totalCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Guardar en Sheets</span>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">Presentes</span>
            <span className="text-sm font-bold text-emerald-700">{presentCount}</span>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
            <span className="text-xs text-rose-800 font-medium">Ausentes</span>
            <span className="text-sm font-bold text-rose-700">{absentCount}</span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
            <span className="text-xs text-amber-800 font-medium">Tardes</span>
            <span className="text-sm font-bold text-amber-700">{lateCount}</span>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
            <span className="text-xs text-blue-800 font-medium">% Asistencia</span>
            <span className="text-sm font-bold text-blue-700">{attendanceRate}%</span>
          </div>
        </div>

        {/* Quick filters & actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar alumno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white"
              />
            </div>

            {groups.length > 0 && (
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
              >
                <option value="todos">Todos los grupos</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleMarkAll('presente')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Todos Presentes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student Attendance List */}
      <div className="space-y-2">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            No se encontraron alumnos para esta búsqueda o grupo.
          </div>
        ) : (
          filteredStudents.map((s) => {
            const currentStatus = attendanceMap[s.id] || 'presente';
            return (
              <div
                key={s.id}
                className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-slate-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs shrink-0">
                    {s.nombre.charAt(0)}
                  </div>
                  <div className="truncate">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate">
                      {s.nombre} {s.apellidos || ''}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block">
                      ID: {s.id} {s.grupo ? `• ${s.grupo}` : ''}
                    </span>
                  </div>
                </div>

                {/* Status selector buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSetStatus(s.id, 'presente')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      currentStatus === 'presente'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>P</span>
                  </button>

                  <button
                    onClick={() => handleSetStatus(s.id, 'ausente')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      currentStatus === 'ausente'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>A</span>
                  </button>

                  <button
                    onClick={() => handleSetStatus(s.id, 'tarde')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      currentStatus === 'tarde'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>T</span>
                  </button>

                  <button
                    onClick={() => handleSetStatus(s.id, 'justificado')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      currentStatus === 'justificado'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>J</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
