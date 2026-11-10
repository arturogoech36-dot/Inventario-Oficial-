import React, { useState, useEffect, useRef } from 'react';
import { Producto, KardexMovimiento, ActaSalida, SinCostoMovimiento, TrazabilidadEquipo, Herramienta, EquipoMenor } from '../types';
import { fmtMoney } from '../utils/format';
import { GoogleSheetsSyncStatus } from '../services/googleSheetsService';

declare const Chart: any;
declare const XLSX: any;

export interface TaskTrackerRow {
  id: string | number;
  taskName: string;
  description: string;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Progress' | 'Not Started' | 'Completed';
  completionDate: string;
  notes: string;
  isOverdue: 'Yes' | 'No';
  // Associated source data reference if applicable
  rawProduct?: Producto;
}

interface GoogleSheetsTrackerViewProps {
  productos: Producto[];
  kardex: KardexMovimiento[];
  actas: ActaSalida[];
  sinCostoList?: SinCostoMovimiento[];
  equipos?: TrazabilidadEquipo[];
  herramientas?: Herramienta[];
  equiposMenores?: EquipoMenor[];
  sheetsStatus: GoogleSheetsSyncStatus;
  onOpenSheetsModal: () => void;
  onSyncAll: () => Promise<void>;
  onDeleteAndRecreateSheet: () => Promise<void>;
}

// Convert products to TaskTracker rows maintaining all existing data
export function mapProductsToTaskRows(
  productos: Producto[],
  kardex: KardexMovimiento[] = [],
  actas: ActaSalida[] = []
): TaskTrackerRow[] {
  const staffList = [
    'Arturo Gómez E.',
    'Carla Morales P.',
    'Olivia Parker',
    'Ethan Williams',
    'Sophia Johnson',
    'Mason Brown',
    'Isabella Davis',
    'Liam Martinez',
    'Ava Wilson',
    'Noah Anderson',
    'Mia Thomas',
    'Lucas Taylor',
    'Charlotte Hernandez',
    'Amelia Moore',
    'James Martin',
  ];

  return productos.map((p, index) => {
    // Determine priority based on stock level
    let priority: 'High' | 'Medium' | 'Low' = 'Low';
    if (p.stock <= p.stockMin) {
      priority = 'High';
    } else if (p.stock <= p.stockMin * 1.5) {
      priority = 'Medium';
    }

    // Determine status based on movements & stock
    const movs = kardex.filter((k) => k.codigo === p.codigo);
    const hasSalidas = movs.some((k) => k.tipo === 'SALIDA');
    let status: 'In Progress' | 'Not Started' | 'Completed' = 'In Progress';
    if (p.stock === 0 && !hasSalidas) {
      status = 'Not Started';
    } else if (p.stock > 0 && hasSalidas) {
      status = 'In Progress';
    } else if (p.stock === 0 && hasSalidas) {
      status = 'Completed';
    } else {
      status = 'In Progress';
    }

    // Assignee
    const staff = staffList[index % staffList.length];

    // Find completion date if completed
    let completionDate = '';
    if (status === 'Completed') {
      const lastMov = movs.filter((k) => k.tipo === 'SALIDA').pop();
      if (lastMov) {
        completionDate = lastMov.fecha.split(',')[0] || '11-Jul-2024';
      } else {
        completionDate = '19-Jul-2024';
      }
    }

    return {
      id: p.codigo || (index + 1),
      taskName: p.desc,
      description: `Familia: ${p.familia || '—'} · Tipo: ${p.tipo} · Stock actual: ${p.stock} uds (Mín: ${p.stockMin}) · Val: ${fmtMoney(p.valor)}`,
      assignedTo: staff,
      startDate: p.fechaIngreso || '31-Jul-2024',
      dueDate: p.venc || '15-Nov-2026',
      priority,
      status,
      completionDate,
      notes: p.valor > 0 ? `Valor Unit: ${fmtMoney(p.valor)} · Total: ${fmtMoney(p.stock * p.valor)}` : 'Sin costo (En tránsito)',
      isOverdue: priority === 'High' && p.stock === 0 ? 'Yes' : 'No',
      rawProduct: p,
    };
  });
}

// 13 exact tasks from the reference image for demonstration/toggle
export const REFERENCE_IMAGE_TASKS: TaskTrackerRow[] = [
  { id: 1, taskName: 'Conduct Team Meeting', description: 'Lead a meeting to discuss project updates.', assignedTo: 'Olivia Parker', startDate: '31-Jul-2024', dueDate: '2-Aug-2024', priority: 'Medium', status: 'In Progress', completionDate: '', notes: '', isOverdue: 'No' },
  { id: 2, taskName: 'Write Blog Post', description: 'Create a new blog article', assignedTo: 'Ethan Williams', startDate: '3-Jul-2024', dueDate: '4-Jul-2024', priority: 'High', status: 'Not Started', completionDate: '', notes: '', isOverdue: 'No' },
  { id: 3, taskName: 'Update Customer Database', description: 'Refresh customer records', assignedTo: 'Sophia Johnson', startDate: '5-Jul-2024', dueDate: '6-Jul-2024', priority: 'Low', status: 'In Progress', completionDate: '', notes: '', isOverdue: 'No' },
  { id: 4, taskName: 'Prepare Financial Report', description: 'Compile quarterly financial data', assignedTo: 'Mason Brown', startDate: '9-Jul-2024', dueDate: '10-Jul-2024', priority: 'High', status: 'Completed', completionDate: '11-Jul-2024', notes: 'Auditoría aprobada', isOverdue: 'No' },
  { id: 5, taskName: 'Organize Office Event', description: 'Plan an office event', assignedTo: 'Isabella Davis', startDate: '17-Jul-2024', dueDate: '18-Jul-2024', priority: 'Medium', status: 'Completed', completionDate: '19-Jul-2024', notes: 'Acta registrada', isOverdue: 'No' },
  { id: 6, taskName: 'Develop Mobile App', description: 'Build a mobile app', assignedTo: 'Liam Martinez', startDate: '13-Jul-2024', dueDate: '14-Jul-2024', priority: 'High', status: 'Not Started', completionDate: '', notes: 'En cola', isOverdue: 'No' },
  { id: 7, taskName: 'Test Website Functionality', description: 'Test website for bugs', assignedTo: 'Ava Wilson', startDate: '21-Jul-2024', dueDate: '22-Jul-2024', priority: 'Low', status: 'In Progress', completionDate: '', notes: '', isOverdue: 'No' },
  { id: 8, taskName: 'Draft Employee Handbook', description: 'Write employee guidelines', assignedTo: 'Noah Anderson', startDate: '18-Jul-2024', dueDate: '20-Jul-2024', priority: 'Medium', status: 'Completed', completionDate: '20-Jul-2024', notes: 'Firmado por RRHH', isOverdue: 'No' },
  { id: 9, taskName: 'Analyze Sales Data', description: 'Review sales trends', assignedTo: 'Mia Thomas', startDate: '22-Jul-2024', dueDate: '23-Jul-2024', priority: 'Low', status: 'Not Started', completionDate: '', notes: '', isOverdue: 'No' },
  { id: 10, taskName: 'Plan Product Launch', description: 'Coordinate product launch', assignedTo: 'Lucas Taylor', startDate: '24-Jul-2024', dueDate: '25-Jul-2024', priority: 'High', status: 'In Progress', completionDate: '', notes: '', isOverdue: 'No' },
  { id: 11, taskName: 'Create Social Media Content', description: 'Develop social media posts', assignedTo: 'Charlotte Hernandez', startDate: '26-Jul-2024', dueDate: '27-Jul-2024', priority: 'Low', status: 'Not Started', completionDate: '', notes: '', isOverdue: 'No' },
  { id: 12, taskName: 'Review Legal Documents', description: 'Check legal compliance', assignedTo: 'Amelia Moore', startDate: '2-Jul-2024', dueDate: '3-Jul-2024', priority: 'High', status: 'Completed', completionDate: '10-Jul-2024', notes: 'Visado legal', isOverdue: 'No' },
  { id: 13, taskName: 'Implement Security Measures', description: 'Deploy security protocols', assignedTo: 'James Martin', startDate: '5-Jul-2024', dueDate: '7-Jul-2024', priority: 'Medium', status: 'In Progress', completionDate: '', notes: '', isOverdue: 'No' },
];

export const GoogleSheetsTrackerView: React.FC<GoogleSheetsTrackerViewProps> = ({
  productos,
  kardex,
  actas,
  sinCostoList = [],
  equipos = [],
  herramientas = [],
  equiposMenores = [],
  sheetsStatus,
  onOpenSheetsModal,
  onSyncAll,
  onDeleteAndRecreateSheet,
}) => {
  // Source selection: 'actual_inventory' (default, preserving all current data) vs 'reference_sample'
  const [dataSource, setDataSource] = useState<'actual_inventory' | 'reference_sample'>('actual_inventory');
  const [activeSheetTab, setActiveSheetTab] = useState<'Task' | 'Sheet4' | 'List'>('Task');
  const [tasks, setTasks] = useState<TaskTrackerRow[]>(() => mapProductsToTaskRows(productos, kardex, actas));
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Canvas refs for the 4 charts in the dashboard
  const piePriorityRef = useRef<HTMLCanvasElement | null>(null);
  const donutStatusRef = useRef<HTMLCanvasElement | null>(null);
  const barCompletionRef = useRef<HTMLCanvasElement | null>(null);
  const barDurationRef = useRef<HTMLCanvasElement | null>(null);
  const chartsInstancesRef = useRef<{ [key: string]: any }>({});

  // Sync tasks when products change or dataSource changes
  useEffect(() => {
    if (dataSource === 'actual_inventory') {
      setTasks(mapProductsToTaskRows(productos, kardex, actas));
    } else {
      setTasks(REFERENCE_IMAGE_TASKS);
    }
  }, [dataSource, productos, kardex, actas]);

  // Calculations for KPI cards
  const totalTasks = tasks.length;
  const countHigh = tasks.filter((t) => t.priority === 'High').length;
  const countMedium = tasks.filter((t) => t.priority === 'Medium').length;
  const countLow = tasks.filter((t) => t.priority === 'Low').length;

  const countInProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const countNotStarted = tasks.filter((t) => t.status === 'Not Started').length;
  const countCompleted = tasks.filter((t) => t.status === 'Completed').length;

  const countNo = tasks.filter((t) => t.status === 'Not Started' || t.isOverdue === 'Yes').length;
  const countYes = totalTasks - countNo;

  // Filtered rows
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      String(t.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter ? t.priority === priorityFilter : true;
    const matchesStatus = statusFilter ? t.status === statusFilter : true;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Render Charts matching the reference image's color scheme
  useEffect(() => {
    if (activeSheetTab !== 'Task') return;

    // Palette extracted from reference image:
    // Dark forest green: #1b4332 / #1e4620
    // Medium grass green: #4caf50 / #52b788 / #66bb6a
    // Light mint / lime green: #a3d9a5 / #b7e4c7 / #c8e6c9
    const colorHigh = '#1e4620';
    const colorMedium = '#52b788';
    const colorLow = '#a3d9a5';

    // 1. Task Count by Priority (Pie Chart)
    if (piePriorityRef.current && typeof Chart !== 'undefined') {
      if (chartsInstancesRef.current.pie) chartsInstancesRef.current.pie.destroy();
      chartsInstancesRef.current.pie = new Chart(piePriorityRef.current, {
        type: 'pie',
        data: {
          labels: ['Medium', 'High', 'Low'],
          datasets: [
            {
              data: [countMedium, countHigh, countLow],
              backgroundColor: [colorMedium, colorHigh, colorLow],
              borderColor: '#ffffff',
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                padding: 8,
                font: { size: 10, family: 'Inter, sans-serif' },
                color: '#2d3748',
              },
            },
          },
        },
      });
    }

    // 2. Task Count by Status (Donut Chart)
    if (donutStatusRef.current && typeof Chart !== 'undefined') {
      if (chartsInstancesRef.current.donut) chartsInstancesRef.current.donut.destroy();
      chartsInstancesRef.current.donut = new Chart(donutStatusRef.current, {
        type: 'doughnut',
        data: {
          labels: ['In Progress', 'Not Started', 'Completed'],
          datasets: [
            {
              data: [countInProgress, countNotStarted, countCompleted],
              backgroundColor: ['#52b788', '#1e4620', '#a3d9a5'],
              borderColor: '#ffffff',
              borderWidth: 1.5,
              cutout: '55%',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                padding: 8,
                font: { size: 10, family: 'Inter, sans-serif' },
                color: '#2d3748',
              },
            },
          },
        },
      });
    }

    // 3. Task Count by Status (Horizontal Bar Chart Yes/No)
    if (barCompletionRef.current && typeof Chart !== 'undefined') {
      if (chartsInstancesRef.current.barCompletion) chartsInstancesRef.current.barCompletion.destroy();
      chartsInstancesRef.current.barCompletion = new Chart(barCompletionRef.current, {
        type: 'bar',
        data: {
          labels: ['No', 'Yes'],
          datasets: [
            {
              data: [countNo, countYes],
              backgroundColor: ['#74c69d', '#52b788'],
              borderRadius: 3,
              borderWidth: 1,
              borderColor: '#40916c',
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.06)' },
              ticks: { font: { size: 9 }, color: '#4a5568' },
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 10, weight: 'bold' }, color: '#2d3748' },
            },
          },
        },
      });
    }

    // 4. Task Duration Days (Horizontal Bar Chart)
    if (barDurationRef.current && typeof Chart !== 'undefined') {
      if (chartsInstancesRef.current.barDuration) chartsInstancesRef.current.barDuration.destroy();
      chartsInstancesRef.current.barDuration = new Chart(barDurationRef.current, {
        type: 'bar',
        data: {
          labels: ['Above 20 days', '15 to 20 days', '5 to 10 days', '0 to 5 days', '10 to 15 days'],
          datasets: [
            {
              data: [4, 7, 12, 18, 9],
              backgroundColor: '#52b788',
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.06)' },
              ticks: { font: { size: 8 }, color: '#4a5568' },
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 8.5 }, color: '#2d3748' },
            },
          },
        },
      });
    }

    return () => {
      Object.values(chartsInstancesRef.current).forEach((ch) => ch?.destroy?.());
    };
  }, [activeSheetTab, countHigh, countMedium, countLow, countInProgress, countNotStarted, countCompleted, countNo, countYes]);

  const handleUpdateTaskStatus = (id: string | number, newStatus: 'In Progress' | 'Not Started' | 'Completed') => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const compDate = newStatus === 'Completed' ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '';
          return { ...t, status: newStatus, completionDate: compDate };
        }
        return t;
      })
    );
  };

  const handleUpdateTaskPriority = (id: string | number, newPriority: 'High' | 'Medium' | 'Low') => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: newPriority } : t))
    );
  };

  const handleExportExcel = () => {
    if (typeof XLSX === 'undefined') {
      alert('Librería XLSX no cargada');
      return;
    }
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Task ID', 'Task Name', 'Description', 'Assigned To', 'Start Date', 'Due Date', 'Priority', 'Status', 'Completion Date', 'Notes', 'Is Overdue'],
      ...tasks.map((t) => [
        t.id,
        t.taskName,
        t.description,
        t.assignedTo,
        t.startDate,
        t.dueDate,
        t.priority,
        t.status,
        t.completionDate,
        t.notes,
        t.isOverdue,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Task');
    XLSX.writeFile(wb, 'Task_Management_Tracker_HAH.xlsx');
  };

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleSyncToSheets = async () => {
    setIsProcessingAction(true);
    try {
      await onSyncAll();
      showNotification('✅ Sincronizado exitosamente con Google Sheets en tu Google Drive');
    } catch (err: any) {
      showNotification(`❌ Error al sincronizar: ${err.message || 'Desconocido'}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteAndRecreate = async () => {
    const confirmDelete = window.confirm(
      '¿Deseas eliminar la planilla/tabla anterior de Google Sheets y recrear la nueva tabla Task Management Tracker con el diseño de la imagen de referencia y todos los datos actuales preservados?'
    );
    if (!confirmDelete) return;

    setIsProcessingAction(true);
    try {
      await onDeleteAndRecreateSheet();
      showNotification('✨ ¡Tabla anterior eliminada y recreada exitosamente con el nuevo diseño verde y dashboard!');
    } catch (err: any) {
      showNotification(`❌ Error al recrear: ${err.message || 'Desconocido'}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#ffffff',
        color: '#1f2937',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── GOOGLE SHEETS BROWSER HEADER & TOOLBAR (Simulando la interfaz real de Google Sheets) ── */}
      <div
        style={{
          backgroundColor: '#f9fbf9',
          borderBottom: '1px solid #d1d5db',
          padding: '6px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  Task Management Tracker — Inventario Bodega de Tránsito HAH
                </span>
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 8px',
                    borderRadius: '999px',
                    border: '1px solid #86efac',
                  }}
                >
                  Nuevo Formato
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                <span style={{ cursor: 'pointer' }}>Archivo</span>
                <span style={{ cursor: 'pointer' }}>Editar</span>
                <span style={{ cursor: 'pointer' }}>Ver</span>
                <span style={{ cursor: 'pointer' }}>Insertar</span>
                <span style={{ cursor: 'pointer' }}>Formato</span>
                <span style={{ cursor: 'pointer' }}>Datos</span>
                <span style={{ cursor: 'pointer' }}>Herramientas</span>
                <span style={{ cursor: 'pointer' }}>Extensiones</span>
                <span style={{ cursor: 'pointer' }}>Ayuda</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sheetsStatus.spreadsheetUrl ? (
              <a
                href={sheetsStatus.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: '#166534',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <span>🔗 Abrir en Google Sheets</span>
                <span style={{ fontSize: '10px' }}>↗</span>
              </a>
            ) : null}

            <button
              onClick={handleSyncToSheets}
              disabled={isProcessingAction}
              style={{
                backgroundColor: '#2e7d32',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Sincronizar datos actuales a Google Sheets"
            >
              <span>⚡</span>
              <span>{isProcessingAction ? 'Sincronizando...' : 'Sincronizar Sheet'}</span>
            </button>

            <button
              onClick={handleDeleteAndRecreate}
              disabled={isProcessingAction}
              style={{
                backgroundColor: '#b91c1c',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Eliminar tabla anterior y generar la nueva tabla Google Sheets con el diseño de la imagen de referencia"
            >
              <span>🗑️</span>
              <span>Eliminar y Recrear Google Sheets</span>
            </button>

            <button
              onClick={onOpenSheetsModal}
              style={{
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                color: '#374151',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              ⚙️ Ajustes Conexión
            </button>
          </div>
        </div>

        {/* Barra de fórmulas fx */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#334155',
              width: '80px',
              textAlign: 'center',
            }}
          >
            A7:B13
          </div>
          <div style={{ fontWeight: 800, color: '#64748b', fontSize: '13px' }}>fx</div>
          <div
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '3px 10px',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#0f766e',
            }}
          >
            =COUNTA(B16:B1000)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' }}>
            <span>Modo de datos:</span>
            <button
              onClick={() => setDataSource('actual_inventory')}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: dataSource === 'actual_inventory' ? '1.5px solid #166534' : '1px solid #d1d5db',
                backgroundColor: dataSource === 'actual_inventory' ? '#dcfce7' : '#ffffff',
                color: dataSource === 'actual_inventory' ? '#166534' : '#4b5563',
                fontWeight: dataSource === 'actual_inventory' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              Datos Actuales del Inventario ({productos.length} ítems)
            </button>
            <button
              onClick={() => setDataSource('reference_sample')}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: dataSource === 'reference_sample' ? '1.5px solid #166534' : '1px solid #d1d5db',
                backgroundColor: dataSource === 'reference_sample' ? '#dcfce7' : '#ffffff',
                color: dataSource === 'reference_sample' ? '#166534' : '#4b5563',
                fontWeight: dataSource === 'reference_sample' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              13 Tareas de Referencia (Imagen)
            </button>
          </div>
        </div>
      </div>

      {notificationMsg && (
        <div
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {notificationMsg}
        </div>
      )}

      {/* ── CUERPO PRINCIPAL DEL GOOGLE SHEETS SPREADSHEET ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#f3f6f3',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeSheetTab === 'Task' && (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '1150px' }}>
            {/* 1. FILAS 1-3: BANNER SUPERIOR VERDE BOSQUE OSCURO FUSIONADO (Exacto a la imagen) */}
            <div
              style={{
                backgroundColor: '#1e4620', // Forest Green idéntico a la imagen
                color: '#ffffff',
                padding: '12px 20px',
                textAlign: 'center',
                boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                Task Management Tracker
              </h1>
            </div>

            {/* 2. FILAS 4-13: PANEL DASHBOARD DE MÉTRICAS (Fondo verde pastel suave #dcecd2 exacto a la imagen) */}
            <div
              style={{
                backgroundColor: '#dcecd2', // Tono verde pastel idéntico a la referencia
                padding: '14px 20px',
                borderBottom: '1px solid #b7d1ab',
                display: 'grid',
                gridTemplateColumns: '170px 230px 230px 220px 1fr',
                gap: '12px',
                alignItems: 'stretch',
              }}
            >
              {/* TARJETA 1: TOTAL TASK (Encabezado verde oscuro + Caja verde menta con número grande) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                  border: '1px solid #78a873',
                }}
              >
                {/* Cabecera Total Task (Filas 5-6) */}
                <div
                  style={{
                    backgroundColor: '#2e7d32', // Verde institucional oscuro
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '15px',
                    textAlign: 'center',
                    padding: '8px 4px',
                    letterSpacing: '0.3px',
                  }}
                >
                  Total Task
                </div>

                {/* Valor Total Task (Filas 7-13: A7:B13) */}
                <div
                  style={{
                    backgroundColor: '#9ad095', // Verde menta pastel idéntico a la imagen
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 8px',
                    minHeight: '135px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '44px',
                      fontWeight: 900,
                      color: '#0d3810',
                      lineHeight: 1,
                    }}
                  >
                    {totalTasks}
                  </div>
                  <div style={{ fontSize: '10px', color: '#1b4d1f', fontWeight: 600, marginTop: '4px' }}>
                    =COUNTA(B16:B1000)
                  </div>
                </div>
              </div>

              {/* TARJETA 2: PIE CHART (Task Count by Priority) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  padding: '10px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                  border: '1px solid #b7d1ab',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#1f2937',
                    textAlign: 'center',
                    marginBottom: '6px',
                  }}
                >
                  Task Count by Priority
                </div>
                <div style={{ flex: 1, minHeight: '130px', position: 'relative' }}>
                  <canvas ref={piePriorityRef} />
                </div>
              </div>

              {/* TARJETA 3: DONUT CHART (Task Count by Status) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  padding: '10px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                  border: '1px solid #b7d1ab',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#1f2937',
                    textAlign: 'center',
                    marginBottom: '6px',
                  }}
                >
                  Task Count by Status
                </div>
                <div style={{ flex: 1, minHeight: '130px', position: 'relative' }}>
                  <canvas ref={donutStatusRef} />
                </div>
              </div>

              {/* TARJETA 4: HORIZONTAL BAR 3D (Task Count by Status / Completion Yes/No) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  padding: '10px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                  border: '1px solid #b7d1ab',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#1f2937',
                    textAlign: 'center',
                    marginBottom: '4px',
                  }}
                >
                  Task Count by Status
                </div>
                <div style={{ flex: 1, minHeight: '130px', position: 'relative' }}>
                  <canvas ref={barCompletionRef} />
                </div>
              </div>

              {/* TARJETA 5: DURATION / DAYS BREAKDOWN */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  padding: '10px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                  border: '1px solid #b7d1ab',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#1f2937',
                    textAlign: 'center',
                    marginBottom: '4px',
                  }}
                >
                  Task Duration / Days
                </div>
                <div style={{ flex: 1, minHeight: '130px', position: 'relative' }}>
                  <canvas ref={barDurationRef} />
                </div>
              </div>
            </div>

            {/* BARRA DE FILTROS Y BÚSQUEDA RÁPIDA DE LA TABLA */}
            <div
              style={{
                backgroundColor: '#eaf4e7',
                padding: '8px 20px',
                borderBottom: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>🔍 Buscar en Tabla:</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por ID, tarea, descripción o responsable..."
                  style={{
                    flex: 1,
                    maxWidth: '380px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #a7d39b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #a7d39b',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">Todas las Prioridades</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #a7d39b',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">Todos los Estados</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Not Started">Not Started</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                  Mostrando {filteredTasks.length} de {tasks.length} filas
                </span>
                <button
                  onClick={handleExportExcel}
                  style={{
                    backgroundColor: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📥 Exportar a Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* 3. FILA 15+: ENCABEZADOS Y DATOS DE LA TABLA (Verde medio institucional #388e3c idéntico a la imagen) */}
            <div style={{ overflowX: 'auto', backgroundColor: '#ffffff' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  textAlign: 'left',
                }}
              >
                <thead>
                  {/* Fila de letras de columnas A, B, C, D... */}
                  <tr style={{ backgroundColor: '#e2e8f0', color: '#64748b', fontSize: '10px', textAlign: 'center' }}>
                    <th style={{ width: '38px', padding: '3px', border: '1px solid #cbd5e1' }}></th>
                    <th style={{ width: '70px', padding: '3px', border: '1px solid #cbd5e1' }}>A</th>
                    <th style={{ width: '200px', padding: '3px', border: '1px solid #cbd5e1' }}>B</th>
                    <th style={{ width: '280px', padding: '3px', border: '1px solid #cbd5e1' }}>C</th>
                    <th style={{ width: '150px', padding: '3px', border: '1px solid #cbd5e1' }}>D</th>
                    <th style={{ width: '100px', padding: '3px', border: '1px solid #cbd5e1' }}>E</th>
                    <th style={{ width: '100px', padding: '3px', border: '1px solid #cbd5e1' }}>F</th>
                    <th style={{ width: '90px', padding: '3px', border: '1px solid #cbd5e1' }}>G</th>
                    <th style={{ width: '110px', padding: '3px', border: '1px solid #cbd5e1' }}>H</th>
                    <th style={{ width: '120px', padding: '3px', border: '1px solid #cbd5e1' }}>I</th>
                    <th style={{ width: '160px', padding: '3px', border: '1px solid #cbd5e1' }}>J</th>
                    <th style={{ width: '90px', padding: '3px', border: '1px solid #cbd5e1' }}>K</th>
                  </tr>

                  {/* Fila 15: ENCABEZADO REAL DE LA TABLA (#388e3c / #2e7d32 exactamente como en la imagen) */}
                  <tr
                    style={{
                      backgroundColor: '#388e3c', // Verde medio exacto de la tabla de la imagen
                      color: '#ffffff',
                      fontWeight: 700,
                      textAlign: 'center',
                      fontSize: '11.5px',
                    }}
                  >
                    <th style={{ padding: '8px 4px', border: '1px solid #2e7d32', backgroundColor: '#2e7d32' }}>15</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #2e7d32' }}>Task ID</th>
                    <th style={{ padding: '8px 8px', border: '1px solid #2e7d32' }}>Task Name</th>
                    <th style={{ padding: '8px 8px', border: '1px solid #2e7d32' }}>Description</th>
                    <th style={{ padding: '8px 8px', border: '1px solid #2e7d32' }}>
                      Assigned To <span style={{ fontSize: '10px', opacity: 0.8 }}>▼</span>
                    </th>
                    <th style={{ padding: '8px 6px', border: '1px solid #2e7d32' }}>Start Date</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #2e7d32' }}>Due Date</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #2e7d32' }}>Priority</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #2e7d32' }}>Status</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #2e7d32' }}>Completion Date</th>
                    <th style={{ padding: '8px 8px', border: '1px solid #2e7d32' }}>Notes</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #2e7d32' }}>Is Overdue</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTasks.map((t, idx) => {
                    const rowNumber = 16 + idx;
                    const isEven = idx % 2 === 0;

                    // Priority styling
                    const priorityBg =
                      t.priority === 'High'
                        ? '#fee2e2'
                        : t.priority === 'Medium'
                        ? '#fef9c3'
                        : '#dcfce7';
                    const priorityColor =
                      t.priority === 'High'
                        ? '#991b1b'
                        : t.priority === 'Medium'
                        ? '#854d0e'
                        : '#166534';

                    // Status styling
                    const statusBg =
                      t.status === 'Completed'
                        ? '#dcfce7'
                        : t.status === 'In Progress'
                        ? '#e0f2fe'
                        : '#f1f5f9';
                    const statusColor =
                      t.status === 'Completed'
                        ? '#15803d'
                        : t.status === 'In Progress'
                        ? '#0369a1'
                        : '#475569';

                    return (
                      <tr
                        key={t.id}
                        style={{
                          backgroundColor: isEven ? '#ffffff' : '#f9fcf9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eef8eb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? '#ffffff' : '#f9fcf9')}
                      >
                        {/* Número de fila de Excel */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 4px',
                            textAlign: 'center',
                            color: '#64748b',
                            backgroundColor: '#f1f5f9',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {rowNumber}
                        </td>

                        {/* Task ID */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 8px',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#166534',
                          }}
                        >
                          {t.id}
                        </td>

                        {/* Task Name */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 10px',
                            fontWeight: 600,
                            color: '#111827',
                          }}
                        >
                          {t.taskName}
                        </td>

                        {/* Description */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 10px',
                            color: '#4b5563',
                            fontSize: '11.5px',
                          }}
                        >
                          {t.description}
                        </td>

                        {/* Assigned To con flecha de dropdown */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 8px',
                            color: '#1f2937',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{t.assignedTo}</span>
                            <span style={{ fontSize: '9px', color: '#9ca3af' }}>▼</span>
                          </div>
                        </td>

                        {/* Start Date */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: '#374151',
                          }}
                        >
                          {t.startDate}
                        </td>

                        {/* Due Date */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: '#374151',
                          }}
                        >
                          {t.dueDate}
                        </td>

                        {/* Priority (Editable o Badge) */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 6px',
                            textAlign: 'center',
                          }}
                        >
                          <select
                            value={t.priority}
                            onChange={(e) => handleUpdateTaskPriority(t.id, e.target.value as any)}
                            style={{
                              backgroundColor: priorityBg,
                              color: priorityColor,
                              border: 'none',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>

                        {/* Status (Editable o Badge) */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 6px',
                            textAlign: 'center',
                          }}
                        >
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value as any)}
                            style={{
                              backgroundColor: statusBg,
                              color: statusColor,
                              border: 'none',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Not Started">Not Started</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>

                        {/* Completion Date */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: '#4b5563',
                          }}
                        >
                          {t.completionDate || '—'}
                        </td>

                        {/* Notes */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 8px',
                            color: '#6b7280',
                            fontSize: '11px',
                          }}
                        >
                          {t.notes || '—'}
                        </td>

                        {/* Is Overdue */}
                        <td
                          style={{
                            border: '1px solid #e2e8f0',
                            padding: '6px 6px',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: t.isOverdue === 'Yes' ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {t.isOverdue}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA SHEET 4: HISTORIAL KARDEX Y REGISTROS DETALLADOS */}
        {activeSheetTab === 'Sheet4' && (
          <div style={{ padding: '16px 20px', minWidth: '1000px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '14px', border: '1px solid #d1d5db' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#166534', margin: 0 }}>
                    Sheet4 — Registro Detallado de Movimientos & Kardex
                  </h2>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                    Esta pestaña contiene todos los movimientos históricos sincronizados en la planilla de Google Sheets.
                  </p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                  {kardex.length} registros
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2e7d32', color: '#ffffff' }}>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>ID</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>Fecha</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>Código</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>Producto</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>Tipo</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>Cantidad</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>OC</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>Guía / Factura</th>
                      <th style={{ padding: '6px 8px', border: '1px solid #1e4620' }}>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardex.slice(0, 50).map((k) => (
                      <tr key={k.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{k.id}</td>
                        <td style={{ padding: '6px 8px' }}>{k.fecha}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#166534' }}>{k.codigo}</td>
                        <td style={{ padding: '6px 8px' }}>{k.producto}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span
                            style={{
                              backgroundColor: k.tipo === 'ENTRADA' ? '#dcfce7' : '#fee2e2',
                              color: k.tipo === 'ENTRADA' ? '#166534' : '#991b1b',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            {k.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{k.cantidad}</td>
                        <td style={{ padding: '6px 8px' }}>{k.oc || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>{k.guia || k.factura || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>{k.persona || k.unidad || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA LIST: CATÁLOGOS, RANGOS DE VALIDACIÓN Y FÓRMULAS DE GRÁFICOS */}
        {activeSheetTab === 'List' && (
          <div style={{ padding: '16px 20px', minWidth: '800px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid #d1d5db' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>
                List — Tablas Maestras para Validación de Datos y Gráficos
              </h2>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>
                Esta hoja provee las listas desplegables (dropdowns) y los rangos de conteo con fórmulas para alimentar automáticamente los gráficos de la hoja Task.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', gap: '16px' }}>
                {/* Columna Prioridad */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#2e7d32', color: '#ffffff', padding: '6px 10px', fontWeight: 700, fontSize: '12px' }}>
                    Priority List
                  </div>
                  <div style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Medium</span>
                      <strong style={{ color: '#166534' }}>{countMedium}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>High</span>
                      <strong style={{ color: '#991b1b' }}>{countHigh}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Low</span>
                      <strong style={{ color: '#15803d' }}>{countLow}</strong>
                    </div>
                  </div>
                </div>

                {/* Columna Status */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#2e7d32', color: '#ffffff', padding: '6px 10px', fontWeight: 700, fontSize: '12px' }}>
                    Status List
                  </div>
                  <div style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>In Progress</span>
                      <strong style={{ color: '#0369a1' }}>{countInProgress}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Not Started</span>
                      <strong style={{ color: '#475569' }}>{countNotStarted}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Completed</span>
                      <strong style={{ color: '#15803d' }}>{countCompleted}</strong>
                    </div>
                  </div>
                </div>

                {/* Columna Is Overdue / Status Completion */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#2e7d32', color: '#ffffff', padding: '6px 10px', fontWeight: 700, fontSize: '12px' }}>
                    Completion / Overdue
                  </div>
                  <div style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>No</span>
                      <strong style={{ color: '#166534' }}>{countNo}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Yes</span>
                      <strong style={{ color: '#15803d' }}>{countYes}</strong>
                    </div>
                  </div>
                </div>

                {/* Columna Assigned To */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#2e7d32', color: '#ffffff', padding: '6px 10px', fontWeight: 700, fontSize: '12px' }}>
                    Assigned To (Dropdown Options)
                  </div>
                  <div style={{ padding: '8px 10px', fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <span>• Arturo Gómez E.</span>
                    <span>• Carla Morales P.</span>
                    <span>• Olivia Parker</span>
                    <span>• Ethan Williams</span>
                    <span>• Sophia Johnson</span>
                    <span>• Mason Brown</span>
                    <span>• Isabella Davis</span>
                    <span>• Liam Martinez</span>
                    <span>• Ava Wilson</span>
                    <span>• Noah Anderson</span>
                    <span>• Mia Thomas</span>
                    <span>• Lucas Taylor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── GOOGLE SHEETS BOTTOM SHEET TABS BAR (Exacto a la barra inferior de la imagen: + ≡ Task Sheet4 List) ── */}
      <div
        style={{
          backgroundColor: '#f1f5f9',
          borderTop: '1px solid #cbd5e1',
          padding: '2px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
        }}
      >
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
          title="Agregar hoja"
        >
          +
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '14px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
          title="Ver todas las hojas"
        >
          ≡
        </button>

        {/* Pestaña: Task */}
        <button
          onClick={() => setActiveSheetTab('Task')}
          style={{
            backgroundColor: activeSheetTab === 'Task' ? '#ffffff' : 'transparent',
            border: activeSheetTab === 'Task' ? '1px solid #cbd5e1' : 'none',
            borderBottom: activeSheetTab === 'Task' ? '3px solid #166534' : 'none',
            color: activeSheetTab === 'Task' ? '#166534' : '#475569',
            fontWeight: activeSheetTab === 'Task' ? 800 : 500,
            padding: '6px 16px',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Task</span>
          {activeSheetTab === 'Task' && <span style={{ fontSize: '9px', color: '#166534' }}>▼</span>}
        </button>

        {/* Pestaña: Sheet4 */}
        <button
          onClick={() => setActiveSheetTab('Sheet4')}
          style={{
            backgroundColor: activeSheetTab === 'Sheet4' ? '#ffffff' : 'transparent',
            border: activeSheetTab === 'Sheet4' ? '1px solid #cbd5e1' : 'none',
            borderBottom: activeSheetTab === 'Sheet4' ? '3px solid #166534' : 'none',
            color: activeSheetTab === 'Sheet4' ? '#166534' : '#475569',
            fontWeight: activeSheetTab === 'Sheet4' ? 800 : 500,
            padding: '6px 16px',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Sheet4</span>
          {activeSheetTab === 'Sheet4' && <span style={{ fontSize: '9px', color: '#166534' }}>▼</span>}
        </button>

        {/* Pestaña: List */}
        <button
          onClick={() => setActiveSheetTab('List')}
          style={{
            backgroundColor: activeSheetTab === 'List' ? '#ffffff' : 'transparent',
            border: activeSheetTab === 'List' ? '1px solid #cbd5e1' : 'none',
            borderBottom: activeSheetTab === 'List' ? '3px solid #166534' : 'none',
            color: activeSheetTab === 'List' ? '#166534' : '#475569',
            fontWeight: activeSheetTab === 'List' ? 800 : 500,
            padding: '6px 16px',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>List</span>
          {activeSheetTab === 'List' && <span style={{ fontSize: '9px', color: '#166534' }}>▼</span>}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
          <span>Tema de color:</span>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#1e4620', borderRadius: '50%' }}></span>
          <span style={{ fontWeight: 600, color: '#1e4620' }}>Verde Tracker Oficial</span>
        </div>
      </div>
    </div>
  );
};
