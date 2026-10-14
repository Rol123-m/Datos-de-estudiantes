import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Link,
  PlusCircle,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Layers,
  Clock,
  Trash2,
} from 'lucide-react';
import { extractSpreadsheetId, getSpreadsheetMetadata, createStudentTemplateSheet } from '../services/sheetsService';
import { SheetTabInfo } from '../types/student';

interface SheetConnectorModalProps {
  isOpen: boolean;
  currentSpreadsheetId?: string;
  currentSheetTitle?: string;
  token: string | null;
  onConnect: (spreadsheetId: string, sheetTitle: string) => Promise<void>;
  onClose: () => void;
  recentSheets: { id: string; title: string; sheetTitle: string; date: string }[];
  onRemoveRecent: (id: string) => void;
}

export const SheetConnectorModal: React.FC<SheetConnectorModalProps> = ({
  isOpen,
  currentSpreadsheetId,
  currentSheetTitle,
  token,
  onConnect,
  onClose,
  recentSheets,
  onRemoveRecent,
}) => {
  const [inputVal, setInputVal] = useState(currentSpreadsheetId || '');
  const [detectedTabs, setDetectedTabs] = useState<SheetTabInfo[]>([]);
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [selectedTabTitle, setSelectedTabTitle] = useState(currentSheetTitle || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'selectTab'>('input');

  if (!isOpen) return null;

  const handleInspectSheet = async (overrideId?: string) => {
    const raw = overrideId || inputVal;
    const extractedId = extractSpreadsheetId(raw);
    
    if (!extractedId) {
      setError('Por favor ingresa una URL válida de Google Sheets o su ID correspondiente.');
      return;
    }

    if (!token) {
      setError('Debes iniciar sesión con Google para acceder a tus hojas de cálculo.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const meta = await getSpreadsheetMetadata(extractedId, token);
      setSpreadsheetName(meta.title);
      setDetectedTabs(meta.sheets);
      
      // Default to the first sheet or one containing "alumno", "estudiante", etc.
      const studentTab = meta.sheets.find((s) => 
        s.title.toLowerCase().includes('alumno') || 
        s.title.toLowerCase().includes('estudiante') ||
        s.title.toLowerCase().includes('student')
      );

      const targetTab = studentTab ? studentTab.title : (meta.sheets[0]?.title || 'Hoja 1');
      setSelectedTabTitle(targetTab);
      setStep('selectTab');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo conectar con la hoja de Google Sheets.';
      setError(
        msg.includes('404')
          ? 'No se encontró la hoja de cálculo. Verifica que el enlace o ID sea correcto y tengas permisos de acceso.'
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmConnection = async () => {
    const extractedId = extractSpreadsheetId(inputVal);
    if (!extractedId || !selectedTabTitle) return;

    setIsLoading(true);
    setError(null);
    try {
      await onConnect(extractedId, selectedTabTitle);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos de los estudiantes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!token) {
      setError('Debes iniciar sesión con Google para crear la plantilla.');
      return;
    }

    setIsCreatingTemplate(true);
    setError(null);

    try {
      const res = await createStudentTemplateSheet('Gestión de Estudiantes - Mi Registro', token);
      setInputVal(res.spreadsheetId);
      // Automatically load the newly created template
      const meta = await getSpreadsheetMetadata(res.spreadsheetId, token);
      setSpreadsheetName(meta.title);
      setDetectedTabs(meta.sheets);
      setSelectedTabTitle('Estudiantes');
      setStep('selectTab');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la plantilla en Google Sheets.');
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Conectar Google Sheet</h2>
              <p className="text-xs text-emerald-100">Configura la hoja de cálculo de tus alumnos</p>
            </div>
          </div>
          {currentSpreadsheetId && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xs bg-white/10 px-2.5 py-1 rounded-lg"
            >
              Cerrar
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {step === 'input' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Enlace o ID de tu hoja de Google Sheets
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Link className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => {
                      setInputVal(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  💡 Abre tu archivo en Google Sheets, copia la URL del navegador y pégala aquí.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleInspectSheet()}
                  disabled={isLoading || !inputVal.trim()}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verificando hoja...</span>
                    </>
                  ) : (
                    <>
                      <span>Conectar mi hoja</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Divider / Option 2 */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">¿Aún no tienes una preparada?</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-800">Crear plantilla lista para usar</h4>
                    <p className="text-xs text-slate-500">Crea un archivo nuevo en tu Drive con columnas de alumnos, notas y asistencia.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateTemplate}
                  disabled={isCreatingTemplate}
                  className="w-full sm:w-auto px-4 py-2 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-semibold rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {isCreatingTemplate ? (
                    <span>Creando...</span>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Crear en mi Sheets</span>
                    </>
                  )}
                </button>
              </div>

              {/* Recent Sheets */}
              {recentSheets && recentSheets.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Hojas recientes
                  </span>
                  <div className="space-y-1.5">
                    {recentSheets.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 group transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setInputVal(item.id);
                            handleInspectSheet(item.id);
                          }}
                          className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-semibold text-slate-800 block truncate">{item.title}</span>
                            <span className="text-[11px] text-slate-500 truncate block">Pestaña: {item.sheetTitle} • {item.date}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveRecent(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar de recientes"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Step 2: Tab Selection & Confirmation */
            <div className="space-y-5 animate-fade-in">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-700 font-medium">Hoja detectada:</span>
                  <h4 className="text-sm font-bold text-slate-800 truncate max-w-xs">{spreadsheetName}</h4>
                </div>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(inputVal)}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 p-1.5 bg-white rounded-lg border border-emerald-200 text-xs flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Sheets</span>
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-400" />
                  Selecciona la pestaña o grupo de alumnos:
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {detectedTabs.map((tab) => (
                    <button
                      key={tab.sheetId}
                      type="button"
                      onClick={() => setSelectedTabTitle(tab.title)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedTabTitle === tab.title
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className={`w-4 h-4 ${selectedTabTitle === tab.title ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{tab.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {tab.rowCount > 0 ? `~${tab.rowCount} filas` : 'Pestaña activa'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium rounded-xl"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConnection}
                  disabled={isLoading || !selectedTabTitle}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Usar esta pestaña y cargar estudiantes</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
