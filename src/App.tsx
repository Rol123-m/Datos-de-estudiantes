/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Users,
  CalendarCheck2,
  BarChart3,
  Settings,
  Plus,
  RefreshCw,
  ExternalLink,
  LogOut,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';

import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import {
  getSheetValues,
  appendStudentRow,
  updateStudentRow,
  deleteStudentRow,
  saveAttendanceRecords,
  getSpreadsheetMetadata,
} from './services/sheetsService';
import {
  Student,
  SheetColumnMapping,
  DailyAttendanceRecord,
} from './types/student';

import { PWAInstallBanner } from './components/PWAInstallBanner';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SheetConnectorModal } from './components/SheetConnectorModal';
import { StudentList } from './components/StudentList';
import { StudentFormModal } from './components/StudentFormModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { AttendanceTracker } from './components/AttendanceTracker';
import { GradesOverview } from './components/GradesOverview';

interface RecentSheetItem {
  id: string;
  title: string;
  sheetTitle: string;
  date: string;
}

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('last_sheet_id') || '';
  });
  const [sheetTitle, setSheetTitle] = useState<string>(() => {
    return localStorage.getItem('last_sheet_tab') || 'Estudiantes';
  });
  const [sheetId, setSheetId] = useState<number>(0);
  const [spreadsheetName, setSpreadsheetName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<SheetColumnMapping>({
    idIndex: 0,
    nombreIndex: 1,
    apellidosIndex: 2,
    grupoIndex: 3,
    emailIndex: 4,
    telefonoIndex: 5,
    calificacionIndex: 6,
    asistenciaIndex: 7,
    observacionesIndex: 8,
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const cached = localStorage.getItem('cached_students');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [recentSheets, setRecentSheets] = useState<RecentSheetItem[]>(() => {
    try {
      const cached = localStorage.getItem('recent_sheets');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // UI Navigation
  const [activeTab, setActiveTab] = useState<'alumnos' | 'asistencia' | 'calificaciones' | 'ajustes'>('alumnos');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Modals
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);

  // Confirmation Modal state (Mandatory for destructive/mutating Google Sheets operations)
  const [confirmationConfig, setConfirmationConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    details?: string[];
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showToast('Sesión iniciada con Google');
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    showToast('Sesión cerrada');
  };

  // Load students from Google Sheet
  const loadSheetData = useCallback(async (targetId?: string, targetTitle?: string) => {
    const idToUse = targetId || spreadsheetId;
    const titleToUse = targetTitle || sheetTitle;

    if (!idToUse) {
      setIsConnectorOpen(true);
      return;
    }

    const currentAccessToken = token || (await getAccessToken());
    if (!currentAccessToken) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Fetch metadata first to get actual sheet title & ID
      const meta = await getSpreadsheetMetadata(idToUse, currentAccessToken);
      setSpreadsheetName(meta.title);

      const targetSheet = meta.sheets.find((s) => s.title === titleToUse) || meta.sheets[0];
      const actualTitle = targetSheet ? targetSheet.title : titleToUse;
      const actualSheetId = targetSheet ? targetSheet.sheetId : 0;
      setSheetId(actualSheetId);
      setSheetTitle(actualTitle);

      // Fetch values
      const { headers: fetchedHeaders, students: fetchedStudents, mapping: detectedMapping } = 
        await getSheetValues(idToUse, actualTitle, currentAccessToken);

      setHeaders(fetchedHeaders);
      setStudents(fetchedStudents);
      setMapping(detectedMapping);

      // Save to localStorage
      localStorage.setItem('last_sheet_id', idToUse);
      localStorage.setItem('last_sheet_tab', actualTitle);
      localStorage.setItem('cached_students', JSON.stringify(fetchedStudents));

      // Add to recent sheets
      setRecentSheets((prev) => {
        const filtered = prev.filter((item) => item.id !== idToUse);
        const updated = [
          {
            id: idToUse,
            title: meta.title,
            sheetTitle: actualTitle,
            date: new Date().toLocaleDateString(),
          },
          ...filtered,
        ].slice(0, 5);
        localStorage.setItem('recent_sheets', JSON.stringify(updated));
        return updated;
      });

      showToast(`Sincronizados ${fetchedStudents.length} estudiantes`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [spreadsheetId, sheetTitle, token]);

  // Auto-load on token ready
  useEffect(() => {
    if (token && spreadsheetId) {
      loadSheetData();
    }
  }, [token, loadSheetData, spreadsheetId]);

  // Connect new Sheet
  const handleConnectSheet = async (newSpreadsheetId: string, newSheetTitle: string) => {
    setSpreadsheetId(newSpreadsheetId);
    setSheetTitle(newSheetTitle);
    await loadSheetData(newSpreadsheetId, newSheetTitle);
  };

  const handleRemoveRecent = (id: string) => {
    setRecentSheets((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('recent_sheets', JSON.stringify(updated));
      return updated;
    });
  };

  // Safe mutation handler: Student Create or Update
  const handleSaveStudent = (data: {
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
  }) => {
    setIsStudentFormOpen(false);

    if (editingStudent) {
      // Update Confirmation
      setConfirmationConfig({
        isOpen: true,
        title: `Actualizar estudiante en Google Sheets`,
        description: `¿Estás seguro de modificar los datos de ${data.nombre} ${data.apellidos}? Esta operación actualizará directamente la fila #${editingStudent.rowIndex} en la pestaña "${sheetTitle}".`,
        confirmLabel: 'Guardar Cambios',
        isDestructive: false,
        details: [
          `Fila en hoja: #${editingStudent.rowIndex}`,
          `Estudiante: ${data.nombre} ${data.apellidos} (ID: ${data.id})`,
          `Grupo: ${data.grupo || 'General'}`,
          `Calificación: ${data.calificacion || '—'}`,
        ],
        onConfirm: async () => {
          const accessToken = await getAccessToken();
          if (!accessToken) throw new Error('Token de acceso no disponible');

          await updateStudentRow(spreadsheetId, sheetTitle, editingStudent.rowIndex, data.rowValues, accessToken);
          showToast(`Datos de ${data.nombre} actualizados con éxito`);
          setEditingStudent(null);
          await loadSheetData();
        },
      });
    } else {
      // Append Confirmation
      setConfirmationConfig({
        isOpen: true,
        title: `Agregar nuevo estudiante a Google Sheets`,
        description: `¿Deseas agregar a ${data.nombre} ${data.apellidos} a tu hoja de cálculo? Se agregará una nueva fila al final de la pestaña "${sheetTitle}".`,
        confirmLabel: 'Agregar a la Hoja',
        isDestructive: false,
        details: [
          `Estudiante: ${data.nombre} ${data.apellidos} (ID: ${data.id})`,
          `Pestaña destino: ${sheetTitle}`,
          `Grupo: ${data.grupo || 'General'}`,
        ],
        onConfirm: async () => {
          const accessToken = await getAccessToken();
          if (!accessToken) throw new Error('Token de acceso no disponible');

          await appendStudentRow(spreadsheetId, sheetTitle, data.rowValues, accessToken);
          showToast(`Estudiante ${data.nombre} agregado a Google Sheets`);
          await loadSheetData();
        },
      });
    }
  };

  // Safe mutation handler: Delete Student Row
  const handleDeleteStudent = (student: Student) => {
    setConfirmationConfig({
      isOpen: true,
      title: `Eliminar estudiante de Google Sheets`,
      description: `¿Estás completamente seguro de eliminar a ${student.nombre} ${student.apellidos || ''}? Esta acción eliminará permanentemente la fila #${student.rowIndex} en Google Sheets.`,
      confirmLabel: 'Eliminar Fila',
      isDestructive: true,
      details: [
        `Fila afectada: #${student.rowIndex}`,
        `Estudiante: ${student.nombre} ${student.apellidos || ''} (ID: ${student.id})`,
        `Archivo: ${spreadsheetName || spreadsheetId}`,
      ],
      onConfirm: async () => {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error('Token de acceso no disponible');

        await deleteStudentRow(spreadsheetId, sheetId, student.rowIndex, accessToken);
        showToast(`Fila de ${student.nombre} eliminada de Google Sheets`);
        setSelectedStudentDetail(null);
        await loadSheetData();
      },
    });
  };

  // Safe mutation handler: Daily Attendance
  const handleSaveAttendance = (dateStr: string, records: DailyAttendanceRecord[]) => {
    setConfirmationConfig({
      isOpen: true,
      title: `Guardar pase de asistencia en Google Sheets`,
      description: `¿Deseas registrar la asistencia del día ${dateStr} para ${records.length} estudiantes? Los datos se guardarán en la pestaña "Asistencia" de tu hoja de cálculo.`,
      confirmLabel: 'Guardar Asistencia',
      isDestructive: false,
      details: [
        `Fecha de registro: ${dateStr}`,
        `Total de alumnos: ${records.length}`,
        `Presentes: ${records.filter((r) => r.status === 'presente').length}`,
        `Ausentes: ${records.filter((r) => r.status === 'ausente').length}`,
      ],
      onConfirm: async () => {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error('Token de acceso no disponible');

        await saveAttendanceRecords(spreadsheetId, dateStr, records, accessToken);
        showToast(`Asistencia del ${dateStr} sincronizada en Google Sheets`);
      },
    });
  };

  // Safe mutation handler: Batch Grades
  const handleBatchUpdateGrades = (updates: { studentRowIndex: number; newGrade: string }[]) => {
    setConfirmationConfig({
      isOpen: true,
      title: `Actualizar calificaciones en Google Sheets`,
      description: `¿Deseas sincronizar las calificaciones de ${updates.length} alumnos en la pestaña "${sheetTitle}"?`,
      confirmLabel: 'Actualizar Notas',
      isDestructive: false,
      details: [
        `Alumnos afectados: ${updates.length}`,
        `Columna: Calificación (columna ${mapping.calificacionIndex + 1})`,
      ],
      onConfirm: async () => {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error('Token de acceso no disponible');

        for (const item of updates) {
          const st = students.find((s) => s.rowIndex === item.studentRowIndex);
          if (st) {
            // Build updated row values
            const updatedRow: (string | number)[] = headers.map((h, idx) => {
              if (idx === mapping.calificacionIndex) return item.newGrade;
              return st.rawValues[h] || '';
            });
            await updateStudentRow(spreadsheetId, sheetTitle, item.studentRowIndex, updatedRow, accessToken);
          }
        }
        showToast(`${updates.length} calificaciones actualizadas en Google Sheets`);
        await loadSheetData();
      },
    });
  };

  const existingGroups = Array.from(new Set(students.map((s) => s.grupo).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 sm:pb-6 selection:bg-blue-200">
      {/* PWA / APK Install Banner */}
      <PWAInstallBanner />

      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Sin Conexión — Mostrando datos en caché de tus estudiantes.</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & App title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                <span>Gestión Escolar</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider hidden xs:inline">
                  Sheets
                </span>
              </h1>
              {spreadsheetId ? (
                <button
                  onClick={() => setIsConnectorOpen(true)}
                  className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 truncate text-left transition-colors"
                >
                  <span className="font-semibold text-slate-700 truncate max-w-[150px] sm:max-w-xs">
                    {spreadsheetName || 'Hoja Conectada'}
                  </span>
                  <span className="text-slate-400">({sheetTitle})</span>
                </button>
              ) : (
                <span className="text-xs text-amber-600 font-medium">Sin hoja conectada</span>
              )}
            </div>
          </div>

          {/* User & Sheets Connect Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <button
                  onClick={() => setIsConnectorOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200/80 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cambiar Hoja</span>
                </button>

                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Abrir hoja en Google Sheets"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <div className="flex items-center gap-1.5 pl-1">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Profesor'}
                      className="w-7 h-7 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {(user.displayName || user.email || 'P').charAt(0)}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              /* Google Sign-in button styled per Google specifications */
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 bg-white border border-slate-300 px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-xs font-semibold text-slate-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'Iniciando...' : 'Acceder con Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Tabs */}
        {user && spreadsheetId && (
          <div className="max-w-5xl mx-auto hidden sm:flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('alumnos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'alumnos'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Alumnos ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('asistencia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'asistencia'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Pase de Asistencia</span>
            </button>

            <button
              onClick={() => setActiveTab('calificaciones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'calificaciones'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Calificaciones & Resumen</span>
            </button>

            <button
              onClick={() => setActiveTab('ajustes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'ajustes'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar Hoja</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto p-4 flex-1">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-slide-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Authentication Callout if not logged in */}
        {!user ? (
          <div className="max-w-md mx-auto my-12 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">Bienvenido Profesor(a)</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Conecta tu cuenta de Google para sincronizar tus alumnos, pasar asistencia diaria y registrar calificaciones directamente en tu hoja de Google Sheets.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Acceso directo y seguro con Google</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-6">
                Podrás ingresar el enlace de tu hoja de Sheets para gestionar las notas y asistencias fácilmente desde tu teléfono móvil como una APK.
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#ffffff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#ffffff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#ffffff" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#ffffff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}</span>
            </button>
          </div>
        ) : !spreadsheetId ? (
          /* Needs Sheet Connection */
          <div className="max-w-md mx-auto my-10 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">¿Cuál es tu hoja de Google Sheets?</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Pega el enlace o ID de tu hoja de cálculo existente, o genera una plantilla lista para usar con un solo clic.
              </p>
            </div>

            <button
              onClick={() => setIsConnectorOpen(true)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Conectar mi hoja de cálculo</span>
            </button>
          </div>
        ) : (
          /* Authenticated & Sheet Connected */
          <>
            {activeTab === 'alumnos' && (
              <StudentList
                students={students}
                onSelectStudent={(s) => setSelectedStudentDetail(s)}
                onAddStudent={() => {
                  setEditingStudent(null);
                  setIsStudentFormOpen(true);
                }}
                onRefresh={() => loadSheetData()}
                isLoading={isLoading}
                onOpenConnector={() => setIsConnectorOpen(true)}
                sheetTitle={sheetTitle}
              />
            )}

            {activeTab === 'asistencia' && (
              <AttendanceTracker
                students={students}
                onSaveAttendance={handleSaveAttendance}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'calificaciones' && (
              <GradesOverview
                students={students}
                onBatchUpdateGrades={handleBatchUpdateGrades}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'ajustes' && (
              <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Configuración de Google Sheets</h3>
                  <p className="text-xs text-slate-500">Administra la conexión y columnas de tu hoja escolar</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Nombre de la hoja:</span>
                    <span className="font-bold text-slate-800">{spreadsheetName || 'Archivo Sheets'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Pestaña activa:</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {sheetTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">ID de Hoja:</span>
                    <span className="font-mono text-slate-600 truncate max-w-xs">{spreadsheetId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Estudiantes cargados:</span>
                    <span className="font-bold text-slate-800">{students.length} filas</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setIsConnectorOpen(true)}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Cambiar de hoja o pestaña</span>
                  </button>

                  <button
                    onClick={() => loadSheetData()}
                    disabled={isLoading}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Recargar datos</span>
                  </button>
                </div>

                {/* Column detection inspection */}
                {headers.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Columnas detectadas en Google Sheets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {headers.map((h, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                          {i + 1}. {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Tailored for mobile app / APK thumb feel) */}
      {user && spreadsheetId && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveTab('alumnos')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'alumnos' ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Alumnos</span>
          </button>

          <button
            onClick={() => setActiveTab('asistencia')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'asistencia' ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <CalendarCheck2 className="w-5 h-5" />
            <span className="text-[10px]">Asistencia</span>
          </button>

          <button
            onClick={() => setActiveTab('calificaciones')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'calificaciones' ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Notas</span>
          </button>

          <button
            onClick={() => setActiveTab('ajustes')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'ajustes' ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">Hoja</span>
          </button>
        </nav>
      )}

      {/* Modals */}
      <SheetConnectorModal
        isOpen={isConnectorOpen}
        currentSpreadsheetId={spreadsheetId}
        currentSheetTitle={sheetTitle}
        token={token}
        onConnect={handleConnectSheet}
        onClose={() => setIsConnectorOpen(false)}
        recentSheets={recentSheets}
        onRemoveRecent={handleRemoveRecent}
      />

      <StudentFormModal
        isOpen={isStudentFormOpen}
        student={editingStudent}
        headers={headers}
        mapping={mapping}
        onSave={handleSaveStudent}
        onClose={() => {
          setIsStudentFormOpen(false);
          setEditingStudent(null);
        }}
        existingGroups={existingGroups}
      />

      <StudentDetailModal
        isOpen={Boolean(selectedStudentDetail)}
        student={selectedStudentDetail}
        onEdit={(st) => {
          setSelectedStudentDetail(null);
          setEditingStudent(st);
          setIsStudentFormOpen(true);
        }}
        onDelete={(st) => {
          handleDeleteStudent(st);
        }}
        onClose={() => setSelectedStudentDetail(null)}
      />

      {/* Confirmation Modal for Google Sheets Mutations */}
      <ConfirmationModal
        isOpen={confirmationConfig.isOpen}
        title={confirmationConfig.title}
        description={confirmationConfig.description}
        confirmLabel={confirmationConfig.confirmLabel}
        isDestructive={confirmationConfig.isDestructive}
        details={confirmationConfig.details}
        isLoading={isConfirmLoading}
        onCancel={() => {
          setConfirmationConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onConfirm={async () => {
          setIsConfirmLoading(true);
          try {
            await confirmationConfig.onConfirm();
            setConfirmationConfig((prev) => ({ ...prev, isOpen: false }));
          } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Error durante la sincronización');
          } finally {
            setIsConfirmLoading(false);
          }
        }}
      />
    </div>
  );
}
