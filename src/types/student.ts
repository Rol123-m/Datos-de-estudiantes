export interface Student {
  rowIndex: number; // Row number in the Google Sheet (2-indexed usually, row 1 is header)
  id: string; // ID / Matrícula
  nombre: string; // Full name or First name
  apellidos?: string;
  grupo: string; // Grade / Group / Section
  email?: string;
  telefono?: string;
  calificacion?: number | string; // Grade / Nota
  asistencia?: number | string; // % or count
  estado?: 'Activo' | 'En Riesgo' | 'Excelente' | 'Inactivo';
  observaciones?: string;
  rawValues: Record<string, string>; // Complete original row data by header name
}

export interface SheetColumnMapping {
  idIndex: number;
  nombreIndex: number;
  apellidosIndex: number;
  grupoIndex: number;
  emailIndex: number;
  telefonoIndex: number;
  calificacionIndex: number;
  asistenciaIndex: number;
  observacionesIndex: number;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
}

export interface SpreadsheetInfo {
  id: string;
  title: string;
  sheets: SheetTabInfo[];
  selectedSheetTitle: string;
  selectedSheetId: number;
  headers: string[];
  lastSyncedAt: Date;
}

export type AttendanceStatus = 'presente' | 'ausente' | 'tarde' | 'justificado';

export interface DailyAttendanceRecord {
  studentRowIndex: number;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  note?: string;
}
