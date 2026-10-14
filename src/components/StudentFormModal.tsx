import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, X, AlertCircle } from 'lucide-react';
import { Student, SheetColumnMapping } from '../types/student';

interface StudentFormModalProps {
  isOpen: boolean;
  student?: Student | null; // If null, creating new student
  headers: string[];
  mapping: SheetColumnMapping;
  onSave: (studentData: {
    id: string;
    nombre: string;
    apellidos: string;
    grupo: string;
    email: string;
    telefono: string;
    calificacion: string;
    asistencia: string;
    observaciones: string;
    rowValues: (string | number)[];
  }) => void;
  onClose: () => void;
  existingGroups: string[];
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  student,
  headers,
  mapping,
  onSave,
  onClose,
  existingGroups,
}) => {
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    apellidos: '',
    grupo: '',
    email: '',
    telefono: '',
    calificacion: '',
    asistencia: '',
    observaciones: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (student) {
      setFormData({
        id: student.id || '',
        nombre: student.nombre || '',
        apellidos: student.apellidos || '',
        grupo: student.grupo || (existingGroups[0] || 'Grupo A'),
        email: student.email || '',
        telefono: student.telefono || '',
        calificacion: student.calificacion !== undefined ? String(student.calificacion) : '',
        asistencia: student.asistencia !== undefined ? String(student.asistencia) : '',
        observaciones: student.observaciones || '',
      });
    } else {
      setFormData({
        id: `EST-${Math.floor(100 + Math.random() * 900)}`,
        nombre: '',
        apellidos: '',
        grupo: existingGroups[0] || 'Grupo A',
        email: '',
        telefono: '',
        calificacion: '',
        asistencia: '100%',
        observaciones: '',
      });
    }
    setErrors({});
  }, [student, existingGroups, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.nombre.trim()) {
      errs.nombre = 'El nombre del estudiante es obligatorio.';
    }
    if (formData.calificacion && isNaN(Number(formData.calificacion.replace(',', '.')))) {
      errs.calificacion = 'Ingresa un número válido para la calificación.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Assemble row values respecting the order of the sheet's original headers
    const rowValues: (string | number)[] = headers.map((header, idx) => {
      if (idx === mapping.idIndex) return formData.id;
      if (idx === mapping.nombreIndex) return formData.nombre;
      if (idx === mapping.apellidosIndex) return formData.apellidos;
      if (idx === mapping.grupoIndex) return formData.grupo;
      if (idx === mapping.emailIndex) return formData.email;
      if (idx === mapping.telefonoIndex) return formData.telefono;
      if (idx === mapping.calificacionIndex) return formData.calificacion;
      if (idx === mapping.asistenciaIndex) return formData.asistencia;
      if (idx === mapping.observacionesIndex) return formData.observaciones;
      // If student is being edited, preserve any unknown column values
      if (student && student.rawValues && student.rawValues[header] !== undefined) {
        return student.rawValues[header];
      }
      return '';
    });

    onSave({
      ...formData,
      rowValues,
    });
  };

  const isEditing = Boolean(student);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isEditing ? <UserCheck className="w-5 h-5 text-blue-200" /> : <UserPlus className="w-5 h-5 text-blue-200" />}
            <h3 className="font-bold text-base">
              {isEditing ? `Editar: ${student?.nombre} ${student?.apellidos || ''}` : 'Agregar Nuevo Estudiante'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Matrícula / ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="EST-001"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Grupo / Grado / Sección
              </label>
              <input
                type="text"
                value={formData.grupo}
                onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="Grupo A, 3er Grado, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre(s) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value });
                  if (errors.nombre) setErrors({ ...errors, nombre: '' });
                }}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                  errors.nombre ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
                placeholder="Juan Carlos"
              />
              {errors.nombre && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.nombre}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="González Pérez"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="alumno@ejemplo.com"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Calificación / Nota Promedio
              </label>
              <input
                type="text"
                value={formData.calificacion}
                onChange={(e) => setFormData({ ...formData, calificacion: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. 9.5 o 8"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Asistencia (%)
              </label>
              <input
                type="text"
                value={formData.asistencia}
                onChange={(e) => setFormData({ ...formData, asistencia: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. 95%"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observaciones o Anotaciones del Profesor
            </label>
            <textarea
              rows={2}
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="Notas de desempeño, conducta, recordatorios..."
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
