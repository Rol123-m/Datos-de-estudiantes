import React from 'react';
import {
  X,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Award,
  CalendarCheck,
  Building,
  Hash,
  MessageSquare,
} from 'lucide-react';
import { Student } from '../types/student';

interface StudentDetailModalProps {
  isOpen: boolean;
  student: Student | null;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  student,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!isOpen || !student) return null;

  const calNum = typeof student.calificacion === 'number' ? student.calificacion : parseFloat(String(student.calificacion || '0'));
  const isApproved = !isNaN(calNum) && calNum >= 6.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs text-white text-2xl font-black flex items-center justify-center border border-white/30 shadow-inner">
              {student.nombre.charAt(0)}
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-semibold text-blue-100 uppercase tracking-wide">
                {student.grupo || 'General'}
              </span>
              <h3 className="text-xl font-bold leading-tight mt-1">
                {student.nombre} {student.apellidos || ''}
              </h3>
              <p className="text-xs text-blue-200 flex items-center gap-1 mt-0.5">
                <Hash className="w-3 h-3" /> ID: {student.id}
              </p>
            </div>
          </div>
        </div>

        {/* Content details */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 text-xs block mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-blue-500" /> Calificación
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-black ${
                  isNaN(calNum) ? 'text-slate-700' : isApproved ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {student.calificacion !== undefined && student.calificacion !== '' ? student.calificacion : 'Sin nota'}
                </span>
                {!isNaN(calNum) && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                    isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isApproved ? 'Aprobado' : 'En riesgo'}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 text-xs block mb-1 flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /> Asistencia
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-800">
                  {student.asistencia ? `${student.asistencia}${String(student.asistencia).includes('%') ? '' : '%'}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contacto & Grupo</h4>
            
            {student.email && (
              <a
                href={`mailto:${student.email}`}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-100"
              >
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate flex-1">{student.email}</span>
              </a>
            )}

            {student.telefono && (
              <div className="flex gap-2">
                <a
                  href={`tel:${student.telefono}`}
                  className="flex-1 flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors border border-slate-100"
                >
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{student.telefono}</span>
                </a>
                <a
                  href={`https://wa.me/${student.telefono.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center hover:bg-emerald-600 transition-colors"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            )}

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Grupo / Sección: <strong>{student.grupo || 'No asignado'}</strong></span>
            </div>
          </div>

          {/* Observations */}
          {student.observaciones && (
            <div className="space-y-1 pt-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observaciones</h4>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-slate-700 text-xs leading-relaxed">
                {student.observaciones}
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-400 text-right">
            Fila en Google Sheets: #{student.rowIndex}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 gap-2">
          <button
            onClick={() => {
              onClose();
              onDelete(student);
            }}
            className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors flex items-center gap-1.5 text-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar fila</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onEdit(student);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 text-xs shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editar datos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
