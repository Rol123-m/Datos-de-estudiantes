import { SheetTabInfo, Student, SheetColumnMapping, DailyAttendanceRecord } from '../types/student';

/**
 * Extracts a Google Spreadsheet ID from either a full URL or a raw ID string.
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Pattern for Google Sheet URLs: /spreadsheets/d/<ID>/...
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // If already an ID: typically 30+ chars of alphanumeric, hyphens, underscores
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Normalizes text for header matching (lowercase, no accents)
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Automatically detects column mapping based on sheet headers.
 */
export function detectColumnMapping(headers: string[]): SheetColumnMapping {
  let idIndex = -1;
  let nombreIndex = -1;
  let apellidosIndex = -1;
  let grupoIndex = -1;
  let emailIndex = -1;
  let telefonoIndex = -1;
  let calificacionIndex = -1;
  let asistenciaIndex = -1;
  let observacionesIndex = -1;

  headers.forEach((h, index) => {
    const norm = normalizeHeader(h);
    
    if (idIndex === -1 && (norm === 'id' || norm === 'matricula' || norm === 'codigo' || norm === 'dni' || norm === 'curp' || norm === 'clave' || norm === 'no' || norm === 'n°' || norm === 'cedula')) {
      idIndex = index;
    } else if (nombreIndex === -1 && (norm === 'nombre' || norm === 'nombres' || norm === 'alumno' || norm === 'estudiante' || norm === 'nombre completo' || norm === 'name')) {
      nombreIndex = index;
    } else if (apellidosIndex === -1 && (norm === 'apellido' || norm === 'apellidos' || norm === 'last name' || norm === 'apellido paterno')) {
      apellidosIndex = index;
    } else if (grupoIndex === -1 && (norm === 'grupo' || norm === 'grado' || norm === 'curso' || norm === 'seccion' || norm === 'aula' || norm === 'clase' || norm === 'periodo')) {
      grupoIndex = index;
    } else if (emailIndex === -1 && (norm === 'email' || norm === 'correo' || norm === 'correo electronico' || norm === 'e-mail')) {
      emailIndex = index;
    } else if (telefonoIndex === -1 && (norm === 'telefono' || norm === 'tel' || norm === 'celular' || norm === 'movil' || norm === 'contacto' || norm === 'phone')) {
      telefonoIndex = index;
    } else if (calificacionIndex === -1 && (norm === 'calificacion' || norm === 'nota' || norm === 'promedio' || norm === 'evaluacion' || norm === 'grade' || norm === 'puntos' || norm === 'score')) {
      calificacionIndex = index;
    } else if (asistenciaIndex === -1 && (norm === 'asistencia' || norm === 'asistencias' || norm === '% asistencia' || norm === 'presencia' || norm === 'attendance')) {
      asistenciaIndex = index;
    } else if (observacionesIndex === -1 && (norm === 'observaciones' || norm === 'observacion' || norm === 'notas' || norm === 'comentarios' || norm === 'detalles' || norm === 'estado')) {
      observacionesIndex = index;
    }
  });

  // Fallbacks if some wasn't found
  if (nombreIndex === -1 && headers.length > 0) {
    nombreIndex = 0; // Default first col to Name if nothing matched
  }
  if (idIndex === -1 && headers.length > 1 && nombreIndex !== 0) {
    idIndex = 0;
  }

  return {
    idIndex,
    nombreIndex,
    apellidosIndex,
    grupoIndex,
    emailIndex,
    telefonoIndex,
    calificacionIndex,
    asistenciaIndex,
    observacionesIndex,
  };
}

/**
 * Fetches metadata about the spreadsheet (title and all tabs/sheets)
 */
export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  token: string
): Promise<{ title: string; sheets: SheetTabInfo[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets(properties(sheetId,title,index,gridProperties))`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData?.error?.message || `Error ${res.status}: No se pudo acceder a la hoja de cálculo`;
    throw new Error(message);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Hoja de Estudiantes';
  
  interface GoogleSheetRaw {
    properties: {
      sheetId: number;
      title: string;
      index: number;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
      };
    };
  }

  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: GoogleSheetRaw) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    index: s.properties.index,
    rowCount: s.properties.gridProperties?.rowCount || 0,
    columnCount: s.properties.gridProperties?.columnCount || 0,
  }));

  return { title, sheets };
}

/**
 * Fetches all row values from a specific sheet tab.
 */
export async function getSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  token: string
): Promise<{ headers: string[]; students: Student[]; mapping: SheetColumnMapping }> {
  // Read range A1:ZZ1000
  const encodedTitle = encodeURIComponent(sheetTitle);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodedTitle}'!A1:ZZ1000?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Error al leer la hoja "${sheetTitle}"`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  if (rows.length === 0) {
    return {
      headers: [],
      students: [],
      mapping: detectColumnMapping([]),
    };
  }

  const headers = rows[0].map((h) => String(h || '').trim());
  const mapping = detectColumnMapping(headers);

  const students: Student[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    if (!row || row.every((c) => !c || String(c).trim() === '')) {
      continue;
    }

    const rowIndex = i + 1; // 1-indexed row number in the Google Sheet
    const rawValues: Record<string, string> = {};
    headers.forEach((h, hIdx) => {
      rawValues[h] = row[hIdx] !== undefined ? String(row[hIdx]).trim() : '';
    });

    const id = mapping.idIndex !== -1 && row[mapping.idIndex] ? String(row[mapping.idIndex]).trim() : `EST-${rowIndex}`;
    const nombre = mapping.nombreIndex !== -1 && row[mapping.nombreIndex] ? String(row[mapping.nombreIndex]).trim() : `Estudiante ${rowIndex}`;
    const apellidos = mapping.apellidosIndex !== -1 && row[mapping.apellidosIndex] ? String(row[mapping.apellidosIndex]).trim() : '';
    const grupo = mapping.grupoIndex !== -1 && row[mapping.grupoIndex] ? String(row[mapping.grupoIndex]).trim() : 'General';
    const email = mapping.emailIndex !== -1 && row[mapping.emailIndex] ? String(row[mapping.emailIndex]).trim() : '';
    const telefono = mapping.telefonoIndex !== -1 && row[mapping.telefonoIndex] ? String(row[mapping.telefonoIndex]).trim() : '';
    
    // Parse grade / calificacion
    let calificacion: number | string | undefined = undefined;
    if (mapping.calificacionIndex !== -1 && row[mapping.calificacionIndex] !== undefined) {
      const parsedNum = parseFloat(String(row[mapping.calificacionIndex]).replace(',', '.'));
      calificacion = !isNaN(parsedNum) ? parsedNum : String(row[mapping.calificacionIndex]).trim();
    }

    // Parse asistencia
    let asistencia: number | string | undefined = undefined;
    if (mapping.asistenciaIndex !== -1 && row[mapping.asistenciaIndex] !== undefined) {
      const cleanVal = String(row[mapping.asistenciaIndex]).replace('%', '').trim();
      const parsedNum = parseFloat(cleanVal.replace(',', '.'));
      asistencia = !isNaN(parsedNum) ? parsedNum : String(row[mapping.asistenciaIndex]).trim();
    }

    const observaciones = mapping.observacionesIndex !== -1 && row[mapping.observacionesIndex] 
      ? String(row[mapping.observacionesIndex]).trim() 
      : '';

    // Calculate status
    let estado: Student['estado'] = 'Activo';
    if (typeof calificacion === 'number') {
      if (calificacion >= 9.0) estado = 'Excelente';
      else if (calificacion < 6.0) estado = 'En Riesgo';
      else estado = 'Activo';
    }

    students.push({
      rowIndex,
      id,
      nombre,
      apellidos,
      grupo,
      email,
      telefono,
      calificacion,
      asistencia,
      estado,
      observaciones,
      rawValues,
    });
  }

  return { headers, students, mapping };
}

/**
 * Appends a new student row to the Google Sheet.
 */
export async function appendStudentRow(
  spreadsheetId: string,
  sheetTitle: string,
  rowValues: (string | number)[],
  token: string
): Promise<void> {
  const encodedTitle = encodeURIComponent(sheetTitle);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodedTitle}'!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Error al agregar el estudiante en Google Sheets');
  }
}

/**
 * Updates an existing student row in Google Sheets.
 */
export async function updateStudentRow(
  spreadsheetId: string,
  sheetTitle: string,
  rowIndex: number,
  rowValues: (string | number)[],
  token: string
): Promise<void> {
  const encodedTitle = encodeURIComponent(sheetTitle);
  // Column range A to ZZ
  const range = `'${encodedTitle}'!A${rowIndex}:ZZ${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Error al actualizar el estudiante en Google Sheets');
  }
}

/**
 * Deletes a row from the Google Sheet by row index (1-indexed).
 */
export async function deleteStudentRow(
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number,
  token: string
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  // API is 0-indexed for startIndex and endIndex (endIndex is exclusive)
  const startIndex = rowIndex - 1;
  const endIndex = rowIndex;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Error al eliminar la fila en Google Sheets');
  }
}

/**
 * Creates a brand new ready-to-use Student Management Google Sheet in the user's Google Drive.
 */
export async function createStudentTemplateSheet(
  title: string,
  token: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';

  const defaultHeaders = [
    'Matrícula',
    'Nombre',
    'Apellidos',
    'Grupo',
    'Email',
    'Teléfono',
    'Calificación',
    'Asistencia (%)',
    'Observaciones',
  ];

  const sampleRows = [
    ['EST-001', 'Alejandro', 'Pérez Gómez', 'Grupo A', 'alejandro.perez@escuela.edu', '+52 55 1234 5678', '9.5', '96%', 'Participativo y puntual'],
    ['EST-002', 'Camila', 'López Rivera', 'Grupo A', 'camila.lopez@escuela.edu', '+52 55 2345 6789', '8.8', '92%', 'Excelente trabajo en equipo'],
    ['EST-003', 'Mateo', 'Rodríguez Torres', 'Grupo B', 'mateo.rodriguez@escuela.edu', '+52 55 3456 7890', '5.5', '75%', 'Requiere apoyo en matemáticas'],
    ['EST-004', 'Sofía', 'Hernández Ruiz', 'Grupo B', 'sofia.hernandez@escuela.edu', '+52 55 4567 8901', '10.0', '100%', 'Cuadro de honor'],
    ['EST-005', 'Daniel', 'Morales Silva', 'Grupo A', 'daniel.morales@escuela.edu', '+52 55 5678 9012', '7.2', '88%', 'Cumple con entregas'],
  ];

  const body = {
    properties: {
      title: title || 'Gestión de Estudiantes - Registro Oficial',
    },
    sheets: [
      {
        properties: {
          title: 'Estudiantes',
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 100,
            columnCount: 15,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: defaultHeaders.map((h) => ({
                  userEnteredValue: { stringValue: h },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.14, green: 0.38, blue: 0.92 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    horizontalAlignment: 'CENTER',
                  },
                })),
              },
              ...sampleRows.map((r) => ({
                values: r.map((c) => ({
                  userEnteredValue: { stringValue: c },
                })),
              })),
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Error al crear la hoja en Google Sheets');
  }

  const result = await res.json();
  return {
    spreadsheetId: result.spreadsheetId,
    spreadsheetUrl: result.spreadsheetUrl,
  };
}

/**
 * Saves attendance records into an "Asistencia" tab or updates the student's sheet.
 */
export async function saveAttendanceRecords(
  spreadsheetId: string,
  dateStr: string,
  records: DailyAttendanceRecord[],
  token: string
): Promise<void> {
  // First ensure there is an "Asistencia" tab or append to it
  const { sheets } = await getSpreadsheetMetadata(spreadsheetId, token);
  let attendanceTab = sheets.find((s) => s.title.toLowerCase() === 'asistencia');

  if (!attendanceTab) {
    // Create Asistencia sheet tab
    const addSheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Asistencia',
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      }),
    });
    if (addSheetRes.ok) {
      // Add headers
      const headers = ['Fecha', 'Matrícula / ID', 'Estudiante', 'Estado', 'Nota'];
      await appendStudentRow(spreadsheetId, 'Asistencia', headers, token);
    }
  }

  // Format attendance records as rows
  const rows = records.map((r) => [
    dateStr,
    r.studentId,
    r.studentName,
    r.status.toUpperCase(),
    r.note || '',
  ]);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Asistencia'!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const appendRes = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Error al guardar la asistencia en Google Sheets');
  }
}
