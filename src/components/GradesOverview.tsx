import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Users,
  CheckCircle,
  Save,
} from 'lucide-react';
import { Student } from '../types/student';

interface GradesOverviewProps {
  students: Student[];
  onBatchUpdateGrades: (updatedGrades: { studentRowIndex: number; newGrade: string }[]) => void;
  isLoading: boolean;
}

export const GradesOverview: React.FC<GradesOverviewProps> = ({
  students,
  onBatchUpdateGrades,
  isLoading,
}) => {
  const [gradeEdits, setGradeEdits] = useState<Record<string, string>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('todos');

  const groups = Array.from(new Set(students.map((s) => s.grupo).filter(Boolean)));

  const filteredStudents = students.filter((s) => {
    return selectedGroup === 'todos' || s.grupo === selectedGroup;
  });

  // Calculate statistics
  const gradesList: number[] = [];
  filteredStudents.forEach((s) => {
    const val = typeof s.calificacion === 'number' ? s.calificacion : parseFloat(String(s.calificacion || ''));
    if (!isNaN(val)) gradesList.push(val);
  });

  const totalEvaluated = gradesList.length;
  const average = totalEvaluated > 0 ? (gradesList.reduce((a, b) => a + b, 0) / totalEvaluated).toFixed(1) : '—';
  const highest = totalEvaluated > 0 ? Math.max(...gradesList).toFixed(1) : '—';
  const lowest = totalEvaluated > 0 ? Math.min(...gradesList).toFixed(1) : '—';
  const approvedCount = gradesList.filter((g) => g >= 6.0).length;
  const atRiskCount = gradesList.filter((g) => g < 6.0).length;
  const approvedRate = totalEvaluated > 0 ? Math.round((approvedCount / totalEvaluated) * 100) : 0;

  const handleGradeChange = (studentId: string, val: string) => {
    setGradeEdits((prev) => ({
      ...prev,
      [studentId]: val,
    }));
  };

  const handleSaveGrades = () => {
    const updates: { studentRowIndex: number; newGrade: string }[] = [];
    Object.entries(gradeEdits).forEach(([id, grade]) => {
      const st = students.find((s) => s.id === id);
      if (st && grade.trim()) {
        updates.push({
          studentRowIndex: st.rowIndex,
          newGrade: grade.trim(),
        });
      }
    });

    if (updates.length > 0) {
      onBatchUpdateGrades(updates);
    }
  };

  const hasPendingEdits = Object.keys(gradeEdits).length > 0;

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-semibold text-slate-500">Promedio General</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800">{average}</div>
          <span className="text-[11px] text-slate-400">De {totalEvaluated} evaluados</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-semibold text-slate-500">Aprobados</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{approvedRate}%</div>
          <span className="text-[11px] text-slate-400">{approvedCount} estudiantes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-semibold text-slate-500">En Riesgo (&lt; 6.0)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600">{atRiskCount}</div>
          <span className="text-[11px] text-slate-400">Requieren apoyo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-semibold text-slate-500">Rango de Notas</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800">
            {lowest} - {highest}
          </div>
          <span className="text-[11px] text-slate-400">Mínima a máxima</span>
        </div>
      </div>

      {/* Grade Quick Updater table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Registro Rápido de Calificaciones</h3>
            <p className="text-xs text-slate-500">Modifica calificaciones directamente y guárdalas en Google Sheets</p>
          </div>

          <div className="flex items-center gap-2">
            {groups.length > 0 && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
              >
                <option value="todos">Todos los grupos</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}

            {hasPendingEdits && (
              <button
                onClick={handleSaveGrades}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar en Sheets ({Object.keys(gradeEdits).length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Matrícula / ID</th>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Nota Actual</th>
                <th className="px-4 py-3">Nueva Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => {
                const currentGrade = s.calificacion !== undefined && s.calificacion !== '' ? String(s.calificacion) : '';
                const editVal = gradeEdits[s.id] !== undefined ? gradeEdits[s.id] : currentGrade;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-600">{s.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {s.nombre} {s.apellidos || ''}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.grupo || '—'}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {currentGrade || <span className="text-slate-400 font-normal italic">Sin nota</span>}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editVal}
                        onChange={(e) => handleGradeChange(s.id, e.target.value)}
                        placeholder="Ej. 9.5"
                        className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
