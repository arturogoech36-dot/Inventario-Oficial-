import React, { useState, useMemo } from 'react';
import {
  Producto,
  KardexMovimiento,
  ActaSalida,
  SinCostoMovimiento,
  TrazabilidadEquipo,
  Herramienta,
  EquipoMenor,
} from '../types';
import { GoogleSheetsSyncStatus } from '../services/googleSheetsService';

export interface TaskItem {
  id: number;
  name: string;
  desc: string;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Progress' | 'Not Started' | 'Completed';
  completionDate: string;
  notes: string;
  isOverdue?: 'Yes' | 'No';
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 1,
    name: 'Conduct Team Meeting',
    desc: 'Lead a meeting to discuss project updates.',
    assignedTo: 'Olivia Parker',
    startDate: '31-Jul-2024',
    dueDate: '2-Aug-2024',
    priority: 'Medium',
    status: 'In Progress',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 2,
    name: 'Write Blog Post',
    desc: 'Create a new blog article',
    assignedTo: 'Ethan Williams',
    startDate: '3-Jul-2024',
    dueDate: '4-Jul-2024',
    priority: 'High',
    status: 'Not Started',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 3,
    name: 'Update Customer Database',
    desc: 'Refresh customer records',
    assignedTo: 'Sophia Johnson',
    startDate: '5-Jul-2024',
    dueDate: '6-Jul-2024',
    priority: 'Low',
    status: 'Not Started',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 4,
    name: 'Prepare Financial Report',
    desc: 'Compile quarterly financial data',
    assignedTo: 'Mason Brown',
    startDate: '9-Jul-2024',
    dueDate: '10-Jul-2024',
    priority: 'High',
    status: 'Completed',
    completionDate: '11-Jul-2024',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 5,
    name: 'Organize Office Event',
    desc: 'Plan an office event',
    assignedTo: 'Isabella Davis',
    startDate: '17-Jul-2024',
    dueDate: '18-Jul-2024',
    priority: 'Medium',
    status: 'Completed',
    completionDate: '19-Jul-2024',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 6,
    name: 'Develop Mobile App',
    desc: 'Build a mobile app',
    assignedTo: 'Liam Martinez',
    startDate: '13-Jul-2024',
    dueDate: '14-Jul-2024',
    priority: 'High',
    status: 'In Progress',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 7,
    name: 'Test Website Functionality',
    desc: 'Test website for bugs',
    assignedTo: 'Ava Wilson',
    startDate: '21-Jul-2024',
    dueDate: '22-Jul-2024',
    priority: 'Low',
    status: 'In Progress',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 8,
    name: 'Draft Employee Handbook',
    desc: 'Write employee guidelines',
    assignedTo: 'Noah Anderson',
    startDate: '18-Jul-2024',
    dueDate: '20-Jul-2024',
    priority: 'Medium',
    status: 'Completed',
    completionDate: '20-Jul-2024',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 9,
    name: 'Analyze Sales Data',
    desc: 'Review sales trends',
    assignedTo: 'Mia Thomas',
    startDate: '22-Jul-2024',
    dueDate: '23-Jul-2024',
    priority: 'High',
    status: 'Not Started',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 10,
    name: 'Plan Product Launch',
    desc: 'Coordinate product launch',
    assignedTo: 'Lucas Taylor',
    startDate: '24-Jul-2024',
    dueDate: '25-Jul-2024',
    priority: 'High',
    status: 'In Progress',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 11,
    name: 'Create Social Media Content',
    desc: 'Develop social media posts',
    assignedTo: 'Charlotte Hernandez',
    startDate: '26-Jul-2024',
    dueDate: '27-Jul-2024',
    priority: 'Low',
    status: 'Not Started',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 12,
    name: 'Review Legal Documents',
    desc: 'Check legal compliance',
    assignedTo: 'Amelia Moore',
    startDate: '2-Jul-2024',
    dueDate: '3-Jul-2024',
    priority: 'High',
    status: 'Completed',
    completionDate: '10-Jul-2024',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 13,
    name: 'Implement Security Measures',
    desc: 'Deploy security protocols',
    assignedTo: 'James Martin',
    startDate: '5-Jul-2024',
    dueDate: '7-Jul-2024',
    priority: 'Medium',
    status: 'In Progress',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  },
  {
    id: 14,
    name: 'Optimize Cloud Server Infrastructure',
    desc: 'Enhance database response time & security',
    assignedTo: 'Benjamin Clark',
    startDate: '10-Jul-2024',
    dueDate: '12-Jul-2024',
    priority: 'High',
    status: 'Completed',
    completionDate: '12-Jul-2024',
    notes: '',
    isOverdue: 'No',
  },
  {
    id: 15,
    name: 'Customer Feedback & Q3 Review',
    desc: 'Review customer satisfaction surveys',
    assignedTo: 'Emma White',
    startDate: '28-Jul-2024',
    dueDate: '30-Jul-2024',
    priority: 'Low',
    status: 'In Progress',
    completionDate: '',
    notes: '',
    isOverdue: 'No',
  },
];

// ── COMPONENTES REUTILIZABLES DE GRÁFICOS 3D PARA EL DASHBOARD EJECUTIVO ──
const HospitalPieChart3D: React.FC<{
  title: string;
  slices: { label: string; value: number; color: string }[];
}> = ({ title, slices }) => {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  let currentAngle = 0;
  const sliceAngles = slices.map((s) => {
    const fraction = total > 0 ? s.value / total : 1 / Math.max(1, slices.length);
    const start = currentAngle;
    const end = currentAngle + fraction * 360;
    currentAngle = end;
    return { ...s, start, end, fraction };
  });

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        padding: '8px 10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e0e0e0',
        height: '185px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#202124',
          marginBottom: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={title}
      >
        {title}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="190" height="110" viewBox="0 0 200 130">
          <g transform="translate(100, 58) scale(1, 0.55)">
            <ellipse cx="0" cy="18" rx="80" ry="80" fill="rgba(0,0,0,0.15)" />
            <path d="M -80 0 L -80 14 A 80 80 0 0 0 80 14 L 80 0 Z" fill="#1b4332" />

            {sliceAngles.map((sl, i) => {
              const startRad = (sl.start - 90) * (Math.PI / 180);
              const endRad = (sl.end - 90) * (Math.PI / 180);
              const x1 = Math.cos(startRad) * 80;
              const y1 = Math.sin(startRad) * 80;
              const x2 = Math.cos(endRad) * 80;
              const y2 = Math.sin(endRad) * 80;
              const largeArc = sl.fraction > 0.5 ? 1 : 0;
              const d = `M 0 0 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

              const midRad = ((sl.start + sl.end) / 2 - 90) * (Math.PI / 180);
              const tx = Math.cos(midRad) * 48;
              const ty = Math.sin(midRad) * 48;

              return (
                <g key={i}>
                  <path d={d} fill={sl.color} stroke="#ffffff" strokeWidth="1.5" />
                  {sl.value > 0 && sl.fraction >= 0.08 && (
                    <text
                      x={tx}
                      y={ty}
                      fill="#ffffff"
                      fontSize="17"
                      fontWeight="bold"
                      textAnchor="middle"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                    >
                      {sl.value}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '10px',
          color: '#444',
          maxHeight: '34px',
          overflow: 'hidden',
        }}
      >
        {slices.slice(0, 4).map((sl, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sl.color }} />
            <span>{sl.label}: <b>{sl.value}</b></span>
          </span>
        ))}
      </div>
    </div>
  );
};

const HospitalDonutChart3D: React.FC<{
  title: string;
  slices: { label: string; value: number; color: string }[];
}> = ({ title, slices }) => {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  let currentAngle = 0;
  const sliceAngles = slices.map((s) => {
    const fraction = total > 0 ? s.value / total : 1 / Math.max(1, slices.length);
    const start = currentAngle;
    const end = currentAngle + fraction * 360;
    currentAngle = end;
    return { ...s, start, end, fraction };
  });

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        padding: '8px 10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e0e0e0',
        height: '185px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#202124',
          marginBottom: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={title}
      >
        {title}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="190" height="110" viewBox="0 0 200 130">
          <g transform="translate(100, 58) scale(1, 0.58)">
            <ellipse cx="0" cy="16" rx="75" ry="75" fill="rgba(0,0,0,0.15)" />
            <path d="M -75 0 L -75 16 A 75 75 0 0 0 75 16 L 75 0 Z" fill="#1b4332" />

            {sliceAngles.map((sl, i) => {
              const startRad = (sl.start - 90) * (Math.PI / 180);
              const endRad = (sl.end - 90) * (Math.PI / 180);
              const x1 = Math.cos(startRad) * 75;
              const y1 = Math.sin(startRad) * 75;
              const x2 = Math.cos(endRad) * 75;
              const y2 = Math.sin(endRad) * 75;
              const x3 = Math.cos(endRad) * 38;
              const y3 = Math.sin(endRad) * 38;
              const x4 = Math.cos(startRad) * 38;
              const y4 = Math.sin(startRad) * 38;
              const largeArc = sl.fraction > 0.5 ? 1 : 0;
              const d = `M ${x1} ${y1} A 75 75 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 38 38 0 ${largeArc} 0 ${x4} ${y4} Z`;

              const midRad = ((sl.start + sl.end) / 2 - 90) * (Math.PI / 180);
              const tx = Math.cos(midRad) * 56;
              const ty = Math.sin(midRad) * 56;

              return (
                <g key={i}>
                  <path d={d} fill={sl.color} stroke="#ffffff" strokeWidth="1.5" />
                  {sl.value > 0 && sl.fraction >= 0.08 && (
                    <text
                      x={tx}
                      y={ty}
                      fill="#ffffff"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                    >
                      {sl.value}
                    </text>
                  )}
                </g>
              );
            })}

            <ellipse cx="0" cy="0" rx="38" ry="38" fill="#ffffff" />
            <ellipse cx="0" cy="8" rx="38" ry="38" fill="rgba(0,0,0,0.06)" />
          </g>
        </svg>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '10px',
          color: '#444',
          maxHeight: '34px',
          overflow: 'hidden',
        }}
      >
        {slices.slice(0, 4).map((sl, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sl.color }} />
            <span>{sl.label}: <b>{sl.value}</b></span>
          </span>
        ))}
      </div>
    </div>
  );
};

const HospitalColumnChart3D: React.FC<{
  title: string;
  bars: { label: string; value: number; color?: string }[];
}> = ({ title, bars }) => {
  const maxVal = Math.max(1, ...bars.map((b) => b.value));
  const defaultColors = ['#2d6a4f', '#40916c', '#52b788', '#74c69d'];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        padding: '8px 10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e0e0e0',
        height: '185px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#202124',
          marginBottom: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={title}
      >
        {title}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="190" height="120" viewBox="0 0 200 130">
          <line x1="20" y1="18" x2="190" y2="18" stroke="#edf2f7" strokeWidth="1" strokeDasharray="2" />
          <line x1="20" y1="56" x2="190" y2="56" stroke="#edf2f7" strokeWidth="1" strokeDasharray="2" />
          <line x1="20" y1="94" x2="190" y2="94" stroke="#cbd5e1" strokeWidth="1" />

          {bars.slice(0, 4).map((b, i) => {
            const barWidth = 26;
            const x = 32 + i * 40;
            const barHeight = Math.max(6, Math.round((b.value / maxVal) * 68));
            const y = 94 - barHeight;
            const col = b.color || defaultColors[i % defaultColors.length];

            return (
              <g key={i}>
                <polygon
                  points={`${x},${y} ${x + 6},${y - 5} ${x + barWidth + 6},${y - 5} ${x + barWidth},${y}`}
                  fill="#8ec576"
                />
                <polygon
                  points={`${x + barWidth},${y} ${x + barWidth + 6},${y - 5} ${x + barWidth + 6},${94 - 5} ${x + barWidth},94`}
                  fill="#1b4d1b"
                />
                <rect x={x} y={y} width={barWidth} height={barHeight} fill={col} rx="1" />
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  fontSize="11"
                  fill="#13381a"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {b.value}
                </text>
                <text
                  x={x + barWidth / 2}
                  y="108"
                  fontSize="9.5"
                  fill="#475569"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {b.label.length > 7 ? b.label.slice(0, 6) + '.' : b.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
        <span>📊 Valores numéricos calculados en tiempo real</span>
      </div>
    </div>
  );
};

const HospitalHorizontalBarChart3D: React.FC<{
  title: string;
  bars: { label: string; value: number; displayValue?: string; color?: string }[];
}> = ({ title, bars }) => {
  const maxVal = Math.max(1, ...bars.map((b) => b.value));
  const defaultColors = ['#2d6a4f', '#40916c', '#52b788', '#74c69d'];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        padding: '8px 10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e0e0e0',
        height: '185px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#202124',
          marginBottom: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={title}
      >
        {title}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '4px 0' }}>
        {bars.slice(0, 4).map((b, i) => {
          const pct = Math.min(100, Math.max(8, Math.round((b.value / maxVal) * 100)));
          const col = b.color || defaultColors[i % defaultColors.length];

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
              <span
                style={{
                  width: '68px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: '#334155',
                  fontWeight: 500,
                }}
                title={b.label}
              >
                {b.label}
              </span>
              <div style={{ flex: 1, height: '14px', background: '#f1f5f9', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: col,
                    borderRadius: '2px',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span style={{ minWidth: '38px', fontSize: '10px', fontWeight: 700, color: '#0f3d24', textAlign: 'right' }}>
                {b.displayValue || b.value}
              </span>
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '74px', paddingRight: '42px', fontSize: '8.5px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '2px' }}>
          <span>0</span>
          <span>{Math.round(maxVal / 2)}</span>
          <span>{maxVal}</span>
        </div>
      </div>
    </div>
  );
};

interface GoogleSheetsViewProps {
  productos: Producto[];
  kardex: KardexMovimiento[];
  actas: ActaSalida[];
  sinCostoList: SinCostoMovimiento[];
  trazabilidad: TrazabilidadEquipo[];
  herramientas: Herramienta[];
  equiposMenores: EquipoMenor[];
  sheetsStatus?: GoogleSheetsSyncStatus;
  onOpenSyncModal?: () => void;
  onSyncAll?: () => void;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  productos,
  kardex,
  actas: _actas,
  sinCostoList,
  trazabilidad,
  herramientas,
  equiposMenores,
  sheetsStatus,
  onOpenSyncModal,
  onSyncAll,
}) => {
  // Tabs: Las 6 pestañas de datos oficiales del hospital + 'Sheet4' (Tracker de referencia), 'Task', 'List'
  const [activeTab, setActiveTab] = useState<string>('Maestro de Inventario');

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('hah_tracker_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_TASKS;
  });

  // Cell selection state for Formula Bar
  const [selectedCell, setSelectedCell] = useState<{ name: string; formula: string }>({
    name: 'A7:B13',
    formula: '=COUNTA(B16:B1000)',
  });

  // Search & filter in table
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal to add new task
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<TaskItem>>({
    name: '',
    desc: '',
    assignedTo: 'Olivia Parker',
    startDate: '1-Aug-2024',
    dueDate: '5-Aug-2024',
    priority: 'Medium',
    status: 'In Progress',
    completionDate: '',
    notes: '',
    isOverdue: 'Yes',
  });

  // Calculate metrics for Tracker
  const totalTasks = tasks.length;
  const countPriority = useMemo(() => {
    return {
      high: tasks.filter((t) => t.priority === 'High').length,
      medium: tasks.filter((t) => t.priority === 'Medium').length,
      low: tasks.filter((t) => t.priority === 'Low').length,
    };
  }, [tasks]);

  const countStatus = useMemo(() => {
    return {
      inProgress: tasks.filter((t) => t.status === 'In Progress').length,
      notStarted: tasks.filter((t) => t.status === 'Not Started').length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
    };
  }, [tasks]);

  const countOverdue = useMemo(() => {
    return {
      no: tasks.filter((t) => t.isOverdue === 'No').length,
      yes: tasks.filter((t) => t.isOverdue === 'Yes').length,
    };
  }, [tasks]);

  const handleAddTask = () => {
    if (!newTask.name) return;
    const item: TaskItem = {
      id: tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1,
      name: newTask.name || 'Nueva Tarea',
      desc: newTask.desc || '',
      assignedTo: newTask.assignedTo || 'Olivia Parker',
      startDate: newTask.startDate || '1-Aug-2024',
      dueDate: newTask.dueDate || '5-Aug-2024',
      priority: (newTask.priority as any) || 'Medium',
      status: (newTask.status as any) || 'In Progress',
      completionDate: newTask.completionDate || '',
      notes: newTask.notes || '',
      isOverdue: (newTask.isOverdue as any) || 'Yes',
    };
    const updated = [...tasks, item];
    setTasks(updated);
    localStorage.setItem('hah_tracker_tasks', JSON.stringify(updated));
    setShowAddTaskModal(false);
    setNewTask({
      name: '',
      desc: '',
      assignedTo: 'Olivia Parker',
      startDate: '1-Aug-2024',
      dueDate: '5-Aug-2024',
      priority: 'Medium',
      status: 'In Progress',
      completionDate: '',
      notes: '',
      isOverdue: 'Yes',
    });
  };

  const handleUpdateTask = (id: number, field: keyof TaskItem, value: any) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setTasks(updated);
    localStorage.setItem('hah_tracker_tasks', JSON.stringify(updated));
  };

  const handleDeleteTask = (id: number) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    localStorage.setItem('hah_tracker_tasks', JSON.stringify(updated));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchSearch && matchPriority && matchStatus;
    });
  }, [tasks, searchTerm, priorityFilter, statusFilter]);

  // Columns & data for other tabs
  const isTrackerTab = activeTab === 'Sheet4' || activeTab === 'Task';

  // ── DYNAMIC METRICS FOR EACH HOSPITAL TAB ──
  const hospitalMetrics = useMemo(() => {
    // 1. Maestro de Inventario
    const invAli = productos.filter((p) => p.familia === 'ALI').length;
    const invGob = productos.filter((p) => p.familia === 'GOB').length;
    const invEqm = productos.filter((p) => p.familia === 'EQM').length;
    const invBot = productos.filter((p) => p.familia === 'BOT').length;
    const invOtr = Math.max(0, productos.length - (invAli + invGob + invEqm + invBot));

    const invNormal = productos.filter((p) => p.stock > p.stockMin).length;
    const invCritico = productos.filter((p) => p.stock > 0 && p.stock <= p.stockMin).length;
    const invAgotado = productos.filter((p) => p.stock === 0).length;

    const stockAli = productos.filter((p) => p.familia === 'ALI').reduce((s, p) => s + p.stock, 0);
    const stockGob = productos.filter((p) => p.familia === 'GOB').reduce((s, p) => s + p.stock, 0);
    const stockEqm = productos.filter((p) => p.familia === 'EQM').reduce((s, p) => s + p.stock, 0);
    const stockBot = productos.filter((p) => p.familia === 'BOT').reduce((s, p) => s + p.stock, 0);

    const valAli = productos.filter((p) => p.familia === 'ALI').reduce((s, p) => s + p.stock * p.valor, 0);
    const valGob = productos.filter((p) => p.familia === 'GOB').reduce((s, p) => s + p.stock * p.valor, 0);
    const valEqm = productos.filter((p) => p.familia === 'EQM').reduce((s, p) => s + p.stock * p.valor, 0);
    const valBot = productos.filter((p) => p.familia === 'BOT').reduce((s, p) => s + p.stock * p.valor, 0);

    // 2. Registro de Kardex
    const kEntradas = kardex.filter((k) => k.tipo === 'ENTRADA').length;
    const kSalidas = kardex.filter((k) => k.tipo === 'SALIDA').length;
    const kEntradasUds = kardex.filter((k) => k.tipo === 'ENTRADA').reduce((s, k) => s + (k.cantidad || 0), 0);
    const kSalidasUds = kardex.filter((k) => k.tipo === 'SALIDA').reduce((s, k) => s + (k.cantidad || 0), 0);
    const kSaldoUds = kEntradasUds - kSalidasUds;

    const kUrg = kardex.filter((k) => (k.unidad || '').toLowerCase().includes('urgencia')).length;
    const kPab = kardex.filter((k) => (k.unidad || '').toLowerCase().includes('pabellón') || (k.unidad || '').toLowerCase().includes('pabellon')).length;
    const kMed = kardex.filter((k) => (k.unidad || '').toLowerCase().includes('medicina')).length;
    const kOtrUnid = Math.max(0, kardex.length - (kUrg + kPab + kMed));

    // 3. Tránsito Despacho
    const scAli = sinCostoList.filter((s) => s.familia === 'ALI').length;
    const scGob = sinCostoList.filter((s) => s.familia === 'GOB').length;
    const scEqm = sinCostoList.filter((s) => s.familia === 'EQM').length;
    const scBot = sinCostoList.filter((s) => s.familia === 'BOT' || !s.familia).length;

    const scDesp = sinCostoList.reduce((s, it) => s + (it.despachos?.reduce((sum, d) => sum + (d.cantidad || 0), 0) || 0), 0);
    const scTotal = sinCostoList.reduce((s, it) => s + (it.cantidad || 0), 0);
    const scSaldo = Math.max(0, scTotal - scDesp);

    const getDestino = (s: SinCostoMovimiento) => (s.unidad || s.persona || s.despachos?.[0]?.servicio || '').toLowerCase();
    const scDist = sinCostoList.filter((s) => getDestino(s).includes('distrib')).length;
    const scMant = sinCostoList.filter((s) => getDestino(s).includes('manten')).length;
    const scClin = sinCostoList.filter((s) => getDestino(s).includes('pabell') || getDestino(s).includes('urg')).length;
    const scOtrDest = Math.max(0, sinCostoList.length - (scDist + scMant + scClin));

    // 4. Trazabilidad Equipos
    const eqSem = trazabilidad.filter((e) => (e.mantPreventivo || '').toLowerCase().includes('semestral')).length;
    const eqAnu = trazabilidad.filter((e) => (e.mantPreventivo || '').toLowerCase().includes('anual')).length;
    const eqVig = Math.max(0, trazabilidad.length - (eqSem + eqAnu));

    const eqOperativo = trazabilidad.filter((e) => (e.ingresoRetiro || 'OPERATIVO').toUpperCase().includes('OPER') || (e.ingresoRetiro || '').toUpperCase().includes('INGRESO')).length;
    const eqMant = trazabilidad.filter((e) => (e.ingresoRetiro || '').toUpperCase().includes('MANT')).length;
    const eqBaja = Math.max(0, trazabilidad.length - (eqOperativo + eqMant));

    const eqUpc = trazabilidad.filter((e) => (e.servClinico || e.servicioDestino || '').toLowerCase().includes('upc') || (e.servClinico || e.servicioDestino || '').toLowerCase().includes('uci')).length;
    const eqPab = trazabilidad.filter((e) => (e.servClinico || e.servicioDestino || '').toLowerCase().includes('pabell')).length;
    const eqOtr = Math.max(0, trazabilidad.length - (eqUpc + eqPab));

    const eqCostUpc = trazabilidad.filter((e) => (e.servClinico || e.servicioDestino || '').toLowerCase().includes('upc') || (e.servClinico || e.servicioDestino || '').toLowerCase().includes('uci')).reduce((s, e) => s + (e.costoTotal || 0), 0);
    const eqCostPab = trazabilidad.filter((e) => (e.servClinico || e.servicioDestino || '').toLowerCase().includes('pabell')).reduce((s, e) => s + (e.costoTotal || 0), 0);
    const eqCostOtr = Math.max(0, trazabilidad.reduce((s, e) => s + (e.costoTotal || 0), 0) - (eqCostUpc + eqCostPab));

    // 5. Trazabilidad Herramientas
    const herMant = herramientas.filter((h) => (h.servicioDestino || '').toLowerCase().includes('manten')).length;
    const herBod = herramientas.filter((h) => (h.servicioDestino || '').toLowerCase().includes('bodega') || (h.servicioDestino || '').toLowerCase().includes('operac')).length;
    const herOtr = Math.max(0, herramientas.length - (herMant + herBod));

    const herAdj = herramientas.filter((h) => Boolean(h.adjunto || h.documentoAdjunto)).length;
    const herSinAdj = Math.max(0, herramientas.length - herAdj);

    const herUdsTotal = herramientas.reduce((s, h) => s + (h.cantidad || 1), 0);
    const herUdsMant = herramientas.filter((h) => (h.servicioDestino || '').toLowerCase().includes('manten')).reduce((s, h) => s + (h.cantidad || 1), 0);
    const herUdsOtr = Math.max(0, herUdsTotal - herUdsMant);

    const herCostMant = herramientas.filter((h) => (h.servicioDestino || '').toLowerCase().includes('manten')).reduce((s, h) => s + (h.costoTotal || 0), 0);
    const herCostOtr = Math.max(0, herramientas.reduce((s, h) => s + (h.costoTotal || 0), 0) - herCostMant);

    // 6. Trazabilidad Equipos Menores
    const eqmMant = equiposMenores.filter((e) => (e.servicioDestino || '').toLowerCase().includes('manten')).length;
    const eqmClin = equiposMenores.filter((e) => (e.servicioDestino || '').toLowerCase().includes('uci') || (e.servicioDestino || '').toLowerCase().includes('pabell') || (e.servicioDestino || '').toLowerCase().includes('urg')).length;
    const eqmOtr = Math.max(0, equiposMenores.length - (eqmMant + eqmClin));

    const eqmAdj = equiposMenores.filter((e) => Boolean(e.adjunto || e.documentoAdjunto)).length;
    const eqmSinAdj = Math.max(0, equiposMenores.length - eqmAdj);

    const eqmUdsTotal = equiposMenores.reduce((s, e) => s + (e.cantidad || 1), 0);
    const eqmUdsMant = equiposMenores.filter((e) => (e.servicioDestino || '').toLowerCase().includes('manten')).reduce((s, e) => s + (e.cantidad || 1), 0);
    const eqmUdsOtr = Math.max(0, eqmUdsTotal - eqmUdsMant);

    const eqmCostMant = equiposMenores.filter((e) => (e.servicioDestino || '').toLowerCase().includes('manten')).reduce((s, e) => s + (e.costoTotal || 0), 0);
    const eqmCostOtr = Math.max(0, equiposMenores.reduce((s, e) => s + (e.costoTotal || 0), 0) - eqmCostMant);

    return {
      inv: { invAli, invGob, invEqm, invBot, invOtr, invNormal, invCritico, invAgotado, stockAli, stockGob, stockEqm, stockBot, valAli, valGob, valEqm, valBot },
      kardex: { kEntradas, kSalidas, kEntradasUds, kSalidasUds, kSaldoUds, kUrg, kPab, kMed, kOtrUnid },
      despacho: { scAli, scGob, scEqm, scBot, scDesp, scSaldo, scTotal, scDist, scMant, scClin, scOtrDest },
      equipos: { eqSem, eqAnu, eqVig, eqOperativo, eqMant, eqBaja, eqUpc, eqPab, eqOtr, eqCostUpc, eqCostPab, eqCostOtr },
      herramientas: { herMant, herBod, herOtr, herAdj, herSinAdj, herUdsTotal, herUdsMant, herUdsOtr, herCostMant, herCostOtr },
      eqMenores: { eqmMant, eqmClin, eqmOtr, eqmAdj, eqmSinAdj, eqmUdsTotal, eqmUdsMant, eqmUdsOtr, eqmCostMant, eqmCostOtr },
    };
  }, [productos, kardex, sinCostoList, trazabilidad, herramientas, equiposMenores]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
        color: '#202124',
        fontFamily: "'Roboto', Arial, sans-serif",
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── GOOGLE SHEETS HEADER ROW ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px 4px 12px',
          borderBottom: '1px solid #e0e0e0',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Sheets Logo */}
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#0f9d58',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '18px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ transform: 'translateY(-1px)' }}>📊</span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  color: '#202124',
                  letterSpacing: '0.2px',
                }}
              >
                {isTrackerTab
                  ? 'Task Management Tracker'
                  : `INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH — ${activeTab}`}
              </span>
              <span style={{ fontSize: '14px', color: '#5f6368', cursor: 'pointer' }} title="Destacar">
                ⭐
              </span>
              <span style={{ fontSize: '13px', color: '#5f6368', cursor: 'pointer' }} title="Mover a carpeta">
                📁
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: sheetsStatus?.isConnected ? '#188038' : '#5f6368',
                  background: sheetsStatus?.isConnected ? '#e6f4ea' : '#f1f3f4',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 500,
                }}
              >
                {sheetsStatus?.isConnected ? '☁️ Guardado en Google Drive' : '💾 Guardado localmente'}
              </span>
            </div>

            {/* Menu Options Bar */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                fontSize: '13px',
                color: '#3c4043',
                marginTop: '2px',
              }}
            >
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

        {/* Right Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onSyncAll && (
            <button
              onClick={onSyncAll}
              style={{
                background: '#e6f4ea',
                border: '1px solid #188038',
                color: '#137333',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Sincronizar ahora con Google Sheets en Drive"
            >
              <span>🔄</span>
              <span>Sincronizar Sheets</span>
            </button>
          )}

          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              style={{
                background: '#f1f3f4',
                border: '1px solid #dadce0',
                color: '#3c4043',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚙️ Ajustes Google
            </button>
          )}

          {sheetsStatus?.spreadsheetUrl && (
            <a
              href={sheetsStatus.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Abrir en Google Drive ↗</span>
            </a>
          )}

          <button
            onClick={() => setShowAddTaskModal(true)}
            style={{
              background: '#2e7d32',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ➕ Agregar Tarea
          </button>
        </div>
      </div>

      {/* ── GOOGLE SHEETS TOOLBAR (EXACT ICON SET) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          backgroundColor: '#edf2fa',
          borderBottom: '1px solid #dadce0',
          fontSize: '12px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <button className="gs-tool-btn" title="Deshacer (Ctrl+Z)">↶</button>
        <button className="gs-tool-btn" title="Rehacer (Ctrl+Y)">↷</button>
        <button className="gs-tool-btn" title="Imprimir (Ctrl+P)">🖨️</button>
        <button className="gs-tool-btn" title="Copiar formato">🖌️</button>
        <div style={{ width: '1px', height: '18px', background: '#dadce0', margin: '0 3px' }} />

        <div style={{ padding: '2px 6px', background: '#ffffff', borderRadius: '3px', border: '1px solid #dadce0', fontSize: '11px' }}>
          100% ▾
        </div>
        <button className="gs-tool-btn" title="Formato como moneda">$</button>
        <button className="gs-tool-btn" title="Formato como porcentaje">%</button>
        <button className="gs-tool-btn" title="Reducir decimales">.0</button>
        <button className="gs-tool-btn" title="Aumentar decimales">.00</button>
        <div style={{ padding: '2px 6px', background: '#ffffff', borderRadius: '3px', border: '1px solid #dadce0', fontSize: '11px' }}>
          123 ▾
        </div>
        <div style={{ width: '1px', height: '18px', background: '#dadce0', margin: '0 3px' }} />

        <div style={{ padding: '2px 8px', background: '#ffffff', borderRadius: '3px', border: '1px solid #dadce0', fontSize: '11px' }}>
          Default (Arial) ▾
        </div>
        <div style={{ padding: '2px 6px', background: '#ffffff', borderRadius: '3px', border: '1px solid #dadce0', fontSize: '11px' }}>
          10 ▾
        </div>
        <div style={{ width: '1px', height: '18px', background: '#dadce0', margin: '0 3px' }} />

        <button className="gs-tool-btn font-bold" title="Negrita (Ctrl+B)">B</button>
        <button className="gs-tool-btn italic" title="Cursiva (Ctrl+I)">I</button>
        <button className="gs-tool-btn line-through" title="Tachado">S</button>
        <button className="gs-tool-btn" title="Color de texto">
          <span style={{ borderBottom: '3px solid #202124' }}>A</span>
        </button>
        {/* Bucket with green underline - EXACT HIGHLIGHT FROM IMAGE */}
        <button
          className="gs-tool-btn"
          style={{ background: '#d3e3fd', borderRadius: '3px' }}
          title="Color de relleno"
        >
          <span style={{ borderBottom: '3px solid #2e7d32' }}>🪣</span>
        </button>
        <button className="gs-tool-btn" title="Bordes">田</button>
        <button className="gs-tool-btn" title="Combinar celdas">↔</button>
        <div style={{ width: '1px', height: '18px', background: '#dadce0', margin: '0 3px' }} />

        <button className="gs-tool-btn" title="Alineación horizontal">≡ ▾</button>
        <button className="gs-tool-btn" title="Alineación vertical">⬍ ▾</button>
        <button className="gs-tool-btn" title="Ajuste de texto">⏎ ▾</button>
        <button className="gs-tool-btn" title="Rotación de texto">↗ ▾</button>
        <div style={{ width: '1px', height: '18px', background: '#dadce0', margin: '0 3px' }} />

        <button className="gs-tool-btn" title="Insertar enlace">🔗</button>
        <button className="gs-tool-btn" title="Insertar comentario">💬</button>
        <button className="gs-tool-btn" title="Insertar gráfico">📊</button>
        <button className="gs-tool-btn" title="Crear un filtro">🌪️</button>
        <button className="gs-tool-btn" title="Funciones">∑ ▾</button>

        {/* Quick Search inside Google Sheets */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="text"
            placeholder="Buscar en la planilla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid #dadce0',
              outline: 'none',
              width: '160px',
              background: '#ffffff',
            }}
          />
          {isTrackerTab && (
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                padding: '3px 6px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid #dadce0',
                background: '#ffffff',
              }}
            >
              <option value="ALL">Prioridad: Todas</option>
              <option value="High">High (Alta)</option>
              <option value="Medium">Medium (Media)</option>
              <option value="Low">Low (Baja)</option>
            </select>
          )}
        </div>
      </div>

      {/* ── FORMULA BAR (EXACT CLONE: A7:B13 & fx =COUNTA(B16:B1000)) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #dadce0',
          padding: '2px 8px',
          gap: '8px',
          fontSize: '12px',
        }}
      >
        {/* Cell Name Box */}
        <div
          style={{
            minWidth: '65px',
            textAlign: 'center',
            fontWeight: 600,
            color: '#3c4043',
            borderRight: '1px solid #dadce0',
            paddingRight: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'monospace',
          }}
        >
          <span>{selectedCell.name}</span>
          <span style={{ fontSize: '9px', color: '#70757a' }}>▾</span>
        </div>

        {/* fx symbol */}
        <div
          style={{
            fontWeight: 800,
            fontStyle: 'italic',
            color: '#70757a',
            fontSize: '14px',
          }}
        >
          fx
        </div>

        {/* Formula Input */}
        <input
          type="text"
          value={selectedCell.formula}
          onChange={(e) =>
            setSelectedCell((prev) => ({ ...prev, formula: e.target.value }))
          }
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '12.5px',
            fontFamily: 'monospace',
            color: '#202124',
            background: 'transparent',
          }}
        />
      </div>

      {/* ── SPREADSHEET MAIN SCROLLABLE VIEWPORT ── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        {/* ── TAB 1 & 2: TASK MANAGEMENT TRACKER (EXACT CLONE FROM IMAGE) ── */}
        {isTrackerTab && (
          <div style={{ minWidth: '1150px' }}>
            {/* GRID COLUMN HEADERS (A, B, C, D, E, F, G, H, I, J, K) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 85px 230px 290px 170px 115px 115px 105px 125px 135px 130px 100px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #dadce0',
                position: 'sticky',
                top: 0,
                zIndex: 20,
              }}
            >
              <div className="gs-col-header" style={{ width: '40px' }} />
              <div className="gs-col-header">A</div>
              <div className="gs-col-header">B</div>
              <div className="gs-col-header">C</div>
              <div className="gs-col-header">D</div>
              <div className="gs-col-header">E</div>
              <div className="gs-col-header">F</div>
              <div className="gs-col-header">G</div>
              <div className="gs-col-header">H</div>
              <div className="gs-col-header">I</div>
              <div className="gs-col-header">J</div>
              <div className="gs-col-header">K</div>
            </div>

            {/* ROWS 1 - 3: MAIN FOREST GREEN HEADER BANNER */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                backgroundColor: '#23531b',
                borderBottom: '1px solid #1a3d14',
              }}
              onClick={() =>
                setSelectedCell({
                  name: 'A1:K3',
                  formula: 'Task Management Tracker',
                })
              }
            >
              {/* Row numbers */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8f9fa',
                  borderRight: '1px solid #dadce0',
                  color: '#70757a',
                  fontSize: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ height: '22px', lineHeight: '22px' }}>1</div>
                <div style={{ height: '22px', lineHeight: '22px' }}>2</div>
                <div style={{ height: '22px', lineHeight: '22px' }}>3</div>
              </div>

              {/* Title Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '26px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  fontFamily: "'Roboto', sans-serif",
                  padding: '12px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                Task Management Tracker
              </div>
            </div>

            {/* ROWS 4 - 13: DASHBOARD CARDS AREA (PASTEL SAGE GREEN BACKGROUND #d8ebd4) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                backgroundColor: '#d8ebd4',
                borderBottom: '1px solid #b7dbb1',
              }}
            >
              {/* Row numbers 4 to 13 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8f9fa',
                  borderRight: '1px solid #dadce0',
                  color: '#70757a',
                  fontSize: '10px',
                  textAlign: 'center',
                }}
              >
                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
                  <div key={num} style={{ height: '23px', lineHeight: '23px' }}>
                    {num}
                  </div>
                ))}
              </div>

              {/* Dashboard Content Container */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '230px 250px 250px 210px 200px',
                  gap: '12px',
                  padding: '10px 14px',
                  alignItems: 'stretch',
                }}
              >
                {/* ── CARD 1: TOTAL TASK (A5:B13 MERGED REPLICA WITH SELECTION OUTLINE) ── */}
                <div
                  onClick={() =>
                    setSelectedCell({
                      name: 'A7:B13',
                      formula: '=COUNTA(B16:B1000)',
                    })
                  }
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                    outline:
                      selectedCell.name === 'A7:B13' ? '2.5px solid #1a73e8' : 'none',
                    outlineOffset: '-1px',
                    position: 'relative',
                  }}
                  title="Fórmula activa: =COUNTA(B16:B1000)"
                >
                  {/* Card Header (Row 5): Dark Forest Green */}
                  <div
                    style={{
                      backgroundColor: '#275a28',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '18px',
                      textAlign: 'center',
                      padding: '8px 0',
                      letterSpacing: '0.3px',
                    }}
                  >
                    Total Task
                  </div>

                  {/* Card Body (Rows 6-13): Vibrant Light Green with Centered Number 15 */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#98cf85',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '18px 0',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '38px',
                        fontWeight: 900,
                        color: '#13381a',
                        lineHeight: 1,
                      }}
                    >
                      {totalTasks}
                    </div>

                    {/* Google Sheets Blue selection handle at bottom-right corner */}
                    {selectedCell.name === 'A7:B13' && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#1a73e8',
                          border: '1px solid #ffffff',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* ── CARD 2: TASK COUNT BY PRIORITY (3D PIE CHART REPLICA) ── */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#202124',
                      marginBottom: '4px',
                    }}
                  >
                    Task Count by Priority
                  </div>

                  {/* 3D Pie Chart SVG */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="190" height="130" viewBox="0 0 200 140">
                      <defs>
                        <filter id="pieShadow" x="-10%" y="-10%" width="130%" height="130%">
                          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" />
                        </filter>
                      </defs>

                      {/* 3D Pie Base / Depth Layer */}
                      <g transform="translate(100, 65) scale(1, 0.55)">
                        {/* Shadow oval */}
                        <ellipse cx="0" cy="18" rx="80" ry="80" fill="rgba(0,0,0,0.18)" />

                        {/* 3D Depth Slices */}
                        <path d="M 0 0 L -80 0 A 80 80 0 0 0 45 66 L 45 80 A 80 80 0 0 1 -80 14 Z" fill="#1b4d1b" />
                        <path d="M 45 66 L 45 80 A 80 80 0 0 0 80 14 L 80 0 Z" fill="#6ba759" />

                        {/* Top Surface Slices */}
                        {/* Slice 1: High (Dark Green, ~33%) */}
                        <path
                          d="M 0 0 L -80 0 A 80 80 0 0 1 20 -77 Z"
                          fill="#2b6826"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Slice 2: Medium (Medium Lime Green, ~27%) */}
                        <path
                          d="M 0 0 L 20 -77 A 80 80 0 0 1 80 0 Z"
                          fill="#8ec576"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Slice 3: Low (Pale Soft Green, ~40%) */}
                        <path
                          d="M 0 0 L 80 0 A 80 80 0 0 1 -80 0 Z"
                          fill="#c5e6bd"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />

                        {/* Value Labels on Slices */}
                        <text x="-40" y="-30" fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">
                          {countPriority.high}
                        </text>
                        <text x="45" y="-35" fill="#1a3d14" fontSize="18" fontWeight="bold" textAnchor="middle">
                          {countPriority.medium}
                        </text>
                        <text x="0" y="45" fill="#1a3d14" fontSize="18" fontWeight="bold" textAnchor="middle">
                          {countPriority.low}
                        </text>
                      </g>
                    </svg>
                  </div>

                  {/* Chart Legend */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      fontSize: '11px',
                      color: '#444',
                      marginTop: '2px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8ec576' }} />
                      Medium
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2b6826' }} />
                      High
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c5e6bd' }} />
                      Low
                    </span>
                  </div>
                </div>

                {/* ── CARD 3: TASK COUNT BY STATUS (3D DONUT CHART REPLICA) ── */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#202124',
                      marginBottom: '4px',
                    }}
                  >
                    Task Count by Status
                  </div>

                  {/* 3D Donut Chart SVG */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="190" height="130" viewBox="0 0 200 140">
                      <g transform="translate(100, 65) scale(1, 0.58)">
                        {/* 3D Thickness extrusion */}
                        <ellipse cx="0" cy="16" rx="75" ry="75" fill="rgba(0,0,0,0.15)" />

                        {/* Outer Donut Cylinder Wall */}
                        <path d="M -75 0 L -75 16 A 75 75 0 0 0 75 16 L 75 0 A 75 75 0 0 1 -75 0 Z" fill="#1b4d1b" />

                        {/* Donut Segments */}
                        {/* Segment 1: In Progress (Pale Green) */}
                        <path
                          d="M 0 -75 A 75 75 0 0 1 75 0 L 38 0 A 38 38 0 0 0 0 -38 Z"
                          fill="#c5e6bd"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Segment 2: Not Started (Medium Green) */}
                        <path
                          d="M 75 0 A 75 75 0 0 1 -45 60 L -23 30 A 38 38 0 0 0 38 0 Z"
                          fill="#8ec576"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Segment 3: Completed (Dark Green) */}
                        <path
                          d="M -45 60 A 75 75 0 0 1 0 -75 L 0 -38 A 38 38 0 0 0 -23 30 Z"
                          fill="#2b6826"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />

                        {/* Center Hole / White Inner Cylinder */}
                        <ellipse cx="0" cy="0" rx="38" ry="38" fill="#ffffff" />
                        <ellipse cx="0" cy="8" rx="38" ry="38" fill="rgba(0,0,0,0.06)" />

                        {/* Values inside Segments */}
                        <text x="45" y="-30" fill="#1a3d14" fontSize="18" fontWeight="bold" textAnchor="middle">
                          {countStatus.inProgress}
                        </text>
                        <text x="25" y="45" fill="#1a3d14" fontSize="18" fontWeight="bold" textAnchor="middle">
                          {countStatus.notStarted}
                        </text>
                        <text x="-48" y="-10" fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">
                          {countStatus.completed}
                        </text>
                      </g>
                    </svg>
                  </div>

                  {/* Chart Legend */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '10.5px',
                      color: '#444',
                      marginTop: '2px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c5e6bd' }} />
                      In Progress
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8ec576' }} />
                      Not Started
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2b6826' }} />
                      Completed
                    </span>
                  </div>
                </div>

                {/* ── CARD 4: TASK COUNT BY STATUS (3D HORIZONTAL BARS REPLICA) ── */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#202124',
                      marginBottom: '4px',
                    }}
                  >
                    Task Count by Status
                  </div>

                  {/* 3D Bar Chart SVG */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="180" height="110" viewBox="0 0 190 120">
                      {/* Grid lines */}
                      <line x1="45" y1="20" x2="45" y2="90" stroke="#dadce0" strokeWidth="1" />
                      <line x1="85" y1="20" x2="85" y2="90" stroke="#dadce0" strokeWidth="1" strokeDasharray="2" />
                      <line x1="125" y1="20" x2="125" y2="90" stroke="#dadce0" strokeWidth="1" strokeDasharray="2" />
                      <line x1="165" y1="20" x2="165" y2="90" stroke="#dadce0" strokeWidth="1" strokeDasharray="2" />

                      {/* Bar 1: "No" (Value: 2) */}
                      <text x="38" y="44" fontSize="11" fill="#444" textAnchor="end" fontWeight="500">
                        No
                      </text>
                      {/* 3D Isometric Bar 1 */}
                      <g>
                        {/* Front face */}
                        <rect x="45" y="32" width="22" height="18" fill="#8ec576" />
                        {/* Top 3D face */}
                        <polygon points="45,32 53,26 75,26 67,32" fill="#a8db93" />
                        {/* Right 3D face */}
                        <polygon points="67,32 75,26 75,44 67,50" fill="#6ba759" />
                        <text x="56" y="45" fontSize="10.5" fill="#1a3d14" fontWeight="bold">
                          {countOverdue.no}
                        </text>
                      </g>

                      {/* Bar 2: "Yes" (Value: 13) */}
                      <text x="38" y="76" fontSize="11" fill="#444" textAnchor="end" fontWeight="500">
                        Yes
                      </text>
                      {/* 3D Isometric Bar 2 */}
                      <g>
                        {/* Front face */}
                        <rect x="45" y="64" width="112" height="18" fill="#6ba759" />
                        {/* Top 3D face */}
                        <polygon points="45,64 53,58 165,58 157,64" fill="#8ec576" />
                        {/* Right 3D face */}
                        <polygon points="157,64 165,58 165,76 157,82" fill="#4b863a" />
                        <text x="145" y="77" fontSize="10.5" fill="#ffffff" fontWeight="bold">
                          {countOverdue.yes}
                        </text>
                      </g>

                      {/* X Axis Ticks & Labels */}
                      <line x1="45" y1="90" x2="175" y2="90" stroke="#70757a" strokeWidth="1" />
                      <text x="45" y="103" fontSize="10" fill="#70757a" textAnchor="middle">0</text>
                      <text x="85" y="103" fontSize="10" fill="#70757a" textAnchor="middle">5</text>
                      <text x="125" y="103" fontSize="10" fill="#70757a" textAnchor="middle">10</text>
                      <text x="165" y="103" fontSize="10" fill="#70757a" textAnchor="middle">15</text>

                      {/* Small green legend square under axis */}
                      <rect x="82" y="110" width="8" height="8" fill="#8ec576" />
                    </svg>
                  </div>
                </div>

                {/* ── CARD 5: TASK AGING / DUE DAYS (3D BARS) ── */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#202124',
                      marginBottom: '4px',
                    }}
                  >
                    Task Aging (Days)
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', fontSize: '9.5px', color: '#555' }}>
                    {[
                      { label: 'Above 20 days', w: '65%' },
                      { label: '15 to 20 days', w: '85%' },
                      { label: '5 to 10 days', w: '75%' },
                      { label: '0 to 5 days', w: '80%' },
                      { label: '10 to 15 days', w: '70%' },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '70px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {row.label}
                        </span>
                        <div style={{ flex: 1, height: '11px', background: 'transparent' }}>
                          <div
                            style={{
                              width: row.w,
                              height: '100%',
                              backgroundColor: '#8ec576',
                              borderRadius: '2px',
                              border: '1px solid #6ba759',
                              boxShadow: 'inset 0 1px 1px #bce3ab',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '74px', fontSize: '9px', color: '#888' }}>
                      <span>0</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 14: SPACER ROW */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                backgroundColor: '#d8ebd4',
                height: '14px',
                borderBottom: '1px solid #b7dbb1',
              }}
            >
              <div style={{ background: '#f8f9fa', borderRight: '1px solid #dadce0', fontSize: '9px', textAlign: 'center', color: '#70757a' }}>
                14
              </div>
              <div />
            </div>

            {/* ROW 15: TABLE COLUMN HEADERS (FOREST GREEN #388e3c, WHITE BOLD TEXT) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 85px 230px 290px 170px 115px 115px 105px 125px 135px 130px 100px',
                backgroundColor: '#388e3c',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '11.5px',
                borderBottom: '1.5px solid #2e7d32',
                position: 'sticky',
                top: '25px',
                zIndex: 15,
              }}
              onClick={() =>
                setSelectedCell({
                  name: 'A15:K15',
                  formula: 'Task ID | Task Name | Description | Assigned To...',
                })
              }
            >
              <div style={{ background: '#f8f9fa', color: '#70757a', fontSize: '10px', textAlign: 'center', lineHeight: '28px', borderRight: '1px solid #dadce0' }}>
                15
              </div>
              <div className="gs-th-cell">Task ID</div>
              <div className="gs-th-cell">Task Name</div>
              <div className="gs-th-cell">Description</div>
              <div className="gs-th-cell">Assigned To</div>
              <div className="gs-th-cell">Start Date</div>
              <div className="gs-th-cell">Due Date</div>
              <div className="gs-th-cell">Priority</div>
              <div className="gs-th-cell">Status</div>
              <div className="gs-th-cell">Completion Date</div>
              <div className="gs-th-cell">Notes</div>
              <div className="gs-th-cell" style={{ background: '#2563eb' }}>Is Overdue</div>
            </div>

            {/* ROWS 16+: DATA ROWS (INTERACTIVE EDITABLE ROWS) */}
            <div>
              {filteredTasks.map((task, idx) => {
                const rowNum = 16 + idx;
                const isSelected = selectedCell.name.startsWith(`B${rowNum}`);

                return (
                  <div
                    key={task.id}
                    className="gs-data-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 85px 230px 290px 170px 115px 115px 105px 125px 135px 130px 100px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '12px',
                    }}
                    onClick={() =>
                      setSelectedCell({
                        name: `B${rowNum}`,
                        formula: task.name,
                      })
                    }
                  >
                    {/* Row Number */}
                    <div
                      style={{
                        background: '#f8f9fa',
                        borderRight: '1px solid #dadce0',
                        color: '#70757a',
                        fontSize: '10.5px',
                        textAlign: 'center',
                        lineHeight: '26px',
                      }}
                    >
                      {rowNum}
                    </div>

                    {/* Task ID (Centered) */}
                    <div className="gs-td-cell" style={{ textAlign: 'center', fontWeight: 600 }}>
                      {task.id}
                    </div>

                    {/* Task Name */}
                    <div
                      className="gs-td-cell"
                      style={{
                        fontWeight: 500,
                        outline: isSelected ? '2px solid #1a73e8' : 'none',
                        outlineOffset: '-1px',
                      }}
                    >
                      <input
                        type="text"
                        value={task.name}
                        onChange={(e) => handleUpdateTask(task.id, 'name', e.target.value)}
                        className="gs-cell-input"
                      />
                    </div>

                    {/* Description */}
                    <div className="gs-td-cell">
                      <input
                        type="text"
                        value={task.desc}
                        onChange={(e) => handleUpdateTask(task.id, 'desc', e.target.value)}
                        className="gs-cell-input"
                      />
                    </div>

                    {/* Assigned To (With dropdown arrow) */}
                    <div className="gs-td-cell" style={{ position: 'relative' }}>
                      <select
                        value={task.assignedTo}
                        onChange={(e) => handleUpdateTask(task.id, 'assignedTo', e.target.value)}
                        className="gs-cell-select"
                      >
                        <option value="Olivia Parker">Olivia Parker</option>
                        <option value="Ethan Williams">Ethan Williams</option>
                        <option value="Sophia Johnson">Sophia Johnson</option>
                        <option value="Mason Brown">Mason Brown</option>
                        <option value="Isabella Davis">Isabella Davis</option>
                        <option value="Liam Martinez">Liam Martinez</option>
                        <option value="Ava Wilson">Ava Wilson</option>
                        <option value="Noah Anderson">Noah Anderson</option>
                        <option value="Mia Thomas">Mia Thomas</option>
                        <option value="Lucas Taylor">Lucas Taylor</option>
                        <option value="Charlotte Hernandez">Charlotte Hernandez</option>
                        <option value="Amelia Moore">Amelia Moore</option>
                        <option value="James Martin">James Martin</option>
                        <option value="Benjamin Clark">Benjamin Clark</option>
                        <option value="Emma White">Emma White</option>
                      </select>
                    </div>

                    {/* Start Date */}
                    <div className="gs-td-cell" style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        value={task.startDate}
                        onChange={(e) => handleUpdateTask(task.id, 'startDate', e.target.value)}
                        className="gs-cell-input"
                        style={{ textAlign: 'center' }}
                      />
                    </div>

                    {/* Due Date */}
                    <div className="gs-td-cell" style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        value={task.dueDate}
                        onChange={(e) => handleUpdateTask(task.id, 'dueDate', e.target.value)}
                        className="gs-cell-input"
                        style={{ textAlign: 'center' }}
                      />
                    </div>

                    {/* Priority */}
                    <div className="gs-td-cell" style={{ textAlign: 'center' }}>
                      <select
                        value={task.priority}
                        onChange={(e) => handleUpdateTask(task.id, 'priority', e.target.value as any)}
                        className="gs-cell-select"
                        style={{
                          fontWeight: 600,
                          color:
                            task.priority === 'High'
                              ? '#b91c1c'
                              : task.priority === 'Medium'
                              ? '#d97706'
                              : '#15803d',
                        }}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div className="gs-td-cell" style={{ textAlign: 'center' }}>
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateTask(task.id, 'status', e.target.value as any)}
                        className="gs-cell-select"
                        style={{
                          fontWeight: 600,
                          color:
                            task.status === 'Completed'
                              ? '#15803d'
                              : task.status === 'In Progress'
                              ? '#0284c7'
                              : '#64748b',
                        }}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Not Started">Not Started</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    {/* Completion Date */}
                    <div className="gs-td-cell" style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        value={task.completionDate}
                        onChange={(e) => handleUpdateTask(task.id, 'completionDate', e.target.value)}
                        placeholder="—"
                        className="gs-cell-input"
                        style={{ textAlign: 'center' }}
                      />
                    </div>

                    {/* Notes */}
                    <div className="gs-td-cell">
                      <input
                        type="text"
                        value={task.notes}
                        onChange={(e) => handleUpdateTask(task.id, 'notes', e.target.value)}
                        placeholder=""
                        className="gs-cell-input"
                      />
                    </div>

                    {/* Is Overdue */}
                    <div className="gs-td-cell" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: task.isOverdue === 'Yes' ? '#fee2e2' : '#dcfce7',
                          color: task.isOverdue === 'Yes' ? '#dc2626' : '#16a34a',
                        }}
                      >
                        {task.isOverdue || 'No'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: '11px',
                          padding: '0 2px',
                        }}
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Extra blank rows to give standard Google Sheets feel */}
              {Array.from({ length: Math.max(0, 10 - filteredTasks.length) }).map((_, i) => {
                const blankRowNum = 16 + filteredTasks.length + i;
                return (
                  <div
                    key={`blank-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 85px 230px 290px 170px 115px 115px 105px 125px 135px 130px 100px',
                      backgroundColor: '#ffffff',
                      borderBottom: '1px solid #e8eaed',
                      height: '26px',
                    }}
                  >
                    <div style={{ background: '#f8f9fa', borderRight: '1px solid #dadce0', fontSize: '10.5px', textAlign: 'center', lineHeight: '26px', color: '#70757a' }}>
                      {blankRowNum}
                    </div>
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                    <div className="gs-td-cell" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: LIST TAB (REFERENCE DROPDOWN LISTS) ── */}
        {activeTab === 'List' && (
          <div style={{ padding: '20px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#13381a', marginBottom: '16px' }}>
              📋 Listas de Validación (Referencias de la Planilla)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div style={{ border: '1px solid #dadce0', borderRadius: '6px', padding: '12px', background: '#f8fdf8' }}>
                <div style={{ fontWeight: 700, color: '#275a28', borderBottom: '2px solid #275a28', paddingBottom: '6px', marginBottom: '8px' }}>
                  👥 Responsables (Assigned To)
                </div>
                {[
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
                  'Benjamin Clark',
                  'Emma White',
                ].map((name, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                    {i + 1}. {name}
                  </div>
                ))}
              </div>

              <div style={{ border: '1px solid #dadce0', borderRadius: '6px', padding: '12px', background: '#f8fdf8' }}>
                <div style={{ fontWeight: 700, color: '#275a28', borderBottom: '2px solid #275a28', paddingBottom: '6px', marginBottom: '8px' }}>
                  ⭐ Prioridades (Priority)
                </div>
                {['High', 'Medium', 'Low'].map((p, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '12px', fontWeight: 600 }}>
                    {p}
                  </div>
                ))}
              </div>

              <div style={{ border: '1px solid #dadce0', borderRadius: '6px', padding: '12px', background: '#f8fdf8' }}>
                <div style={{ fontWeight: 700, color: '#275a28', borderBottom: '2px solid #275a28', paddingBottom: '6px', marginBottom: '8px' }}>
                  🔄 Estados (Status)
                </div>
                {['In Progress', 'Not Started', 'Completed'].map((s, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '12px', fontWeight: 600 }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── HOSPITAL DATA TABS (MAESTRO DE INVENTARIO, KARDEX, ETC.) PRESERVING ALL DATA & COLUMNS ── */}
        {!isTrackerTab && activeTab !== 'List' && (
          <div style={{ minWidth: '1150px' }}>
            {/* ROWS 1 - 3: MAIN FOREST GREEN HEADER BANNER */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                backgroundColor: '#23531b',
                borderBottom: '1px solid #1a3d14',
              }}
              onClick={() =>
                setSelectedCell({
                  name: 'A1:M3',
                  formula: `HOSPITAL ALTO HOSPICIO — ${activeTab.toUpperCase()}`,
                })
              }
            >
              {/* Row numbers 1-3 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8f9fa',
                  borderRight: '1px solid #dadce0',
                  color: '#70757a',
                  fontSize: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ height: '22px', lineHeight: '22px' }}>1</div>
                <div style={{ height: '22px', lineHeight: '22px' }}>2</div>
                <div style={{ height: '22px', lineHeight: '22px' }}>3</div>
              </div>

              {/* Title Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  fontFamily: "'Roboto', sans-serif",
                  padding: '12px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                HOSPITAL ALTO HOSPICIO — {activeTab.toUpperCase()}
              </div>
            </div>

            {/* ROWS 4 - 13: DASHBOARD CARDS AREA WITH 4 CHARTS (PASTEL SAGE GREEN BACKGROUND #d8ebd4) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                backgroundColor: '#d8ebd4',
                borderBottom: '1px solid #b7dbb1',
              }}
            >
              {/* Row numbers 4 to 13 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8f9fa',
                  borderRight: '1px solid #dadce0',
                  color: '#70757a',
                  fontSize: '10px',
                  textAlign: 'center',
                }}
              >
                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
                  <div key={num} style={{ height: '23px', lineHeight: '23px' }}>
                    {num}
                  </div>
                ))}
              </div>

              {/* Dashboard Content Container: 1 Left KPI Card + 4 Charts with established sizes and measurements */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '240px 230px 230px 230px 235px',
                  gap: '15px',
                  padding: '8px 14px',
                  alignItems: 'stretch',
                }}
              >
                {/* ── CARD 1: KPI TOTAL (A5:B13 MERGED REPLICA CON FÓRMULA AUTOMÁTICA) ── */}
                <div
                  onClick={() =>
                    setSelectedCell({
                      name: 'A7:B13',
                      formula: '=COUNTA(A16:A1000)',
                    })
                  }
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                    outline: selectedCell.name === 'A7:B13' ? '2.5px solid #1a73e8' : 'none',
                    outlineOffset: '-1px',
                    position: 'relative',
                    height: '185px',
                  }}
                  title="Fórmula activa: =COUNTA(A16:A1000)"
                >
                  <div
                    style={{
                      backgroundColor: '#275a28',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '15px',
                      textAlign: 'center',
                      padding: '8px 0',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {activeTab === 'Maestro de Inventario'
                      ? 'Total Productos'
                      : activeTab === 'Registro de Kardex'
                      ? 'Total Movimientos'
                      : activeTab === 'Tránsito Despacho'
                      ? 'Insumos Tránsito'
                      : activeTab === 'Trazabilidad Equipos'
                      ? 'Total Equipos'
                      : activeTab === 'Trazabilidad Herramientas'
                      ? 'Total Herramientas'
                      : 'Total Eq. Menores'}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#98cf85',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px 0',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '38px',
                        fontWeight: 900,
                        color: '#13381a',
                        lineHeight: 1,
                      }}
                    >
                      {activeTab === 'Maestro de Inventario'
                        ? productos.length
                        : activeTab === 'Registro de Kardex'
                        ? kardex.length
                        : activeTab === 'Tránsito Despacho'
                        ? sinCostoList.length
                        : activeTab === 'Trazabilidad Equipos'
                        ? trazabilidad.length
                        : activeTab === 'Trazabilidad Herramientas'
                        ? herramientas.length
                        : equiposMenores.length}
                    </div>
                    <div style={{ fontSize: '10px', color: '#1b4d1b', marginTop: '6px', fontWeight: 600 }}>
                      =COUNTA(A16:A1000)
                    </div>

                    {selectedCell.name === 'A7:B13' && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#1a73e8',
                          border: '1px solid #ffffff',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* ── CARD 2: GRÁFICO 1 (TORTA 3D) SEGÚN LA PESTAÑA CORRESPONDIENTE ── */}
                {activeTab === 'Maestro de Inventario' && (
                  <HospitalPieChart3D
                    title="Distribución por Familia"
                    slices={[
                      { label: 'Alimentación', value: hospitalMetrics.inv.invAli, color: '#1b4332' },
                      { label: 'Gineco-Obstetricia', value: hospitalMetrics.inv.invGob, color: '#2d6a4f' },
                      { label: 'Equipos Médicos', value: hospitalMetrics.inv.invEqm, color: '#40916c' },
                      { label: 'Tránsito', value: hospitalMetrics.inv.invBot, color: '#74c69d' },
                      { label: 'Otras', value: hospitalMetrics.inv.invOtr, color: '#a3d9a5' },
                    ]}
                  />
                )}
                {activeTab === 'Registro de Kardex' && (
                  <HospitalPieChart3D
                    title="Movimientos por Tipo"
                    slices={[
                      { label: 'Entradas', value: hospitalMetrics.kardex.kEntradas, color: '#1b4332' },
                      { label: 'Salidas', value: hospitalMetrics.kardex.kSalidas, color: '#2d6a4f' },
                    ]}
                  />
                )}
                {activeTab === 'Tránsito Despacho' && (
                  <HospitalPieChart3D
                    title="Insumos por Familia"
                    slices={[
                      { label: 'Alimentación', value: hospitalMetrics.despacho.scAli, color: '#1b4332' },
                      { label: 'Gineco-Obstetricia', value: hospitalMetrics.despacho.scGob, color: '#2d6a4f' },
                      { label: 'Equipos Médicos', value: hospitalMetrics.despacho.scEqm, color: '#40916c' },
                      { label: 'Tránsito', value: hospitalMetrics.despacho.scBot, color: '#74c69d' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos' && (
                  <HospitalPieChart3D
                    title="Frecuencia Mantención"
                    slices={[
                      { label: 'Semestral', value: hospitalMetrics.equipos.eqSem, color: '#1b4332' },
                      { label: 'Anual', value: hospitalMetrics.equipos.eqAnu, color: '#2d6a4f' },
                      { label: 'Vigente / Otro', value: hospitalMetrics.equipos.eqVig, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Herramientas' && (
                  <HospitalPieChart3D
                    title="Herramientas por Servicio"
                    slices={[
                      { label: 'Mantención HAH', value: hospitalMetrics.herramientas.herMant, color: '#1b4332' },
                      { label: 'Bodega', value: hospitalMetrics.herramientas.herBod, color: '#2d6a4f' },
                      { label: 'Otros', value: hospitalMetrics.herramientas.herOtr, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos Menores' && (
                  <HospitalPieChart3D
                    title="Servicio Destino"
                    slices={[
                      { label: 'Mantención HAH', value: hospitalMetrics.eqMenores.eqmMant, color: '#1b4332' },
                      { label: 'Serv. Clínicos', value: hospitalMetrics.eqMenores.eqmClin, color: '#2d6a4f' },
                      { label: 'Otros', value: hospitalMetrics.eqMenores.eqmOtr, color: '#52b788' },
                    ]}
                  />
                )}

                {/* ── CARD 3: GRÁFICO 2 (DONA 3D) SEGÚN LA PESTAÑA CORRESPONDIENTE ── */}
                {activeTab === 'Maestro de Inventario' && (
                  <HospitalDonutChart3D
                    title="Estado del Inventario"
                    slices={[
                      { label: 'Normal', value: hospitalMetrics.inv.invNormal, color: '#2d6a4f' },
                      { label: 'Crítico', value: hospitalMetrics.inv.invCritico, color: '#f59e0b' },
                      { label: 'Agotado', value: hospitalMetrics.inv.invAgotado, color: '#dc2626' },
                    ]}
                  />
                )}
                {activeTab === 'Registro de Kardex' && (
                  <HospitalDonutChart3D
                    title="Flujo Entradas vs Salidas (Uds)"
                    slices={[
                      { label: 'Entradas', value: hospitalMetrics.kardex.kEntradasUds, color: '#2d6a4f' },
                      { label: 'Salidas', value: hospitalMetrics.kardex.kSalidasUds, color: '#dc2626' },
                    ]}
                  />
                )}
                {activeTab === 'Tránsito Despacho' && (
                  <HospitalDonutChart3D
                    title="Despacho vs Saldo Disponible"
                    slices={[
                      { label: 'Despachado', value: hospitalMetrics.despacho.scDesp, color: '#dc2626' },
                      { label: 'Disponible', value: hospitalMetrics.despacho.scSaldo, color: '#2d6a4f' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos' && (
                  <HospitalDonutChart3D
                    title="Estado Operativo"
                    slices={[
                      { label: 'Operativo', value: hospitalMetrics.equipos.eqOperativo, color: '#2d6a4f' },
                      { label: 'Mantención', value: hospitalMetrics.equipos.eqMant, color: '#f59e0b' },
                      { label: 'Baja', value: hospitalMetrics.equipos.eqBaja, color: '#dc2626' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Herramientas' && (
                  <HospitalDonutChart3D
                    title="Documentación Adjunta"
                    slices={[
                      { label: 'Con Archivo', value: hospitalMetrics.herramientas.herAdj, color: '#2d6a4f' },
                      { label: 'Sin Adjunto', value: hospitalMetrics.herramientas.herSinAdj, color: '#f59e0b' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos Menores' && (
                  <HospitalDonutChart3D
                    title="Documento Oficial"
                    slices={[
                      { label: 'Con Archivo', value: hospitalMetrics.eqMenores.eqmAdj, color: '#2d6a4f' },
                      { label: 'Sin Adjunto', value: hospitalMetrics.eqMenores.eqmSinAdj, color: '#f59e0b' },
                    ]}
                  />
                )}

                {/* ── CARD 4: GRÁFICO 3 (COLUMNAS 3D) SEGÚN LA PESTAÑA CORRESPONDIENTE ── */}
                {activeTab === 'Maestro de Inventario' && (
                  <HospitalColumnChart3D
                    title="Stock Físico por Familia"
                    bars={[
                      { label: 'ALI', value: hospitalMetrics.inv.stockAli, color: '#1b4332' },
                      { label: 'GOB', value: hospitalMetrics.inv.stockGob, color: '#2d6a4f' },
                      { label: 'EQM', value: hospitalMetrics.inv.stockEqm, color: '#40916c' },
                      { label: 'BOT', value: hospitalMetrics.inv.stockBot, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Registro de Kardex' && (
                  <HospitalColumnChart3D
                    title="Balance General Kardex"
                    bars={[
                      { label: 'Entradas', value: hospitalMetrics.kardex.kEntradasUds, color: '#2d6a4f' },
                      { label: 'Salidas', value: hospitalMetrics.kardex.kSalidasUds, color: '#dc2626' },
                      { label: 'Saldo', value: Math.max(0, hospitalMetrics.kardex.kSaldoUds), color: '#15803d' },
                    ]}
                  />
                )}
                {activeTab === 'Tránsito Despacho' && (
                  <HospitalColumnChart3D
                    title="Flujo de Tránsito (Uds)"
                    bars={[
                      { label: 'Ingreso', value: hospitalMetrics.despacho.scTotal, color: '#2d6a4f' },
                      { label: 'Despacho', value: hospitalMetrics.despacho.scDesp, color: '#dc2626' },
                      { label: 'Saldo', value: hospitalMetrics.despacho.scSaldo, color: '#15803d' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos' && (
                  <HospitalColumnChart3D
                    title="Equipos por Servicio"
                    bars={[
                      { label: 'UPC', value: hospitalMetrics.equipos.eqUpc, color: '#2d6a4f' },
                      { label: 'Pabellón', value: hospitalMetrics.equipos.eqPab, color: '#40916c' },
                      { label: 'Otros', value: hospitalMetrics.equipos.eqOtr, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Herramientas' && (
                  <HospitalColumnChart3D
                    title="Unidades Físicas"
                    bars={[
                      { label: 'Total Uds', value: hospitalMetrics.herramientas.herUdsTotal, color: '#2d6a4f' },
                      { label: 'Mantención', value: hospitalMetrics.herramientas.herUdsMant, color: '#40916c' },
                      { label: 'Otros', value: hospitalMetrics.herramientas.herUdsOtr, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos Menores' && (
                  <HospitalColumnChart3D
                    title="Unidades Físicas"
                    bars={[
                      { label: 'Total Uds', value: hospitalMetrics.eqMenores.eqmUdsTotal, color: '#2d6a4f' },
                      { label: 'Mantención', value: hospitalMetrics.eqMenores.eqmUdsMant, color: '#40916c' },
                      { label: 'Otros', value: hospitalMetrics.eqMenores.eqmUdsOtr, color: '#52b788' },
                    ]}
                  />
                )}

                {/* ── CARD 5: GRÁFICO 4 (BARRAS HORIZONTALES) SEGÚN LA PESTAÑA CORRESPONDIENTE ── */}
                {activeTab === 'Maestro de Inventario' && (
                  <HospitalHorizontalBarChart3D
                    title="Valor Total ($) por Familia"
                    bars={[
                      { label: 'ALI', value: hospitalMetrics.inv.valAli, displayValue: `$${(hospitalMetrics.inv.valAli / 1000).toFixed(0)}k`, color: '#1b4332' },
                      { label: 'GOB', value: hospitalMetrics.inv.valGob, displayValue: `$${(hospitalMetrics.inv.valGob / 1000).toFixed(0)}k`, color: '#2d6a4f' },
                      { label: 'EQM', value: hospitalMetrics.inv.valEqm, displayValue: `$${(hospitalMetrics.inv.valEqm / 1000).toFixed(0)}k`, color: '#40916c' },
                      { label: 'BOT', value: hospitalMetrics.inv.valBot, displayValue: `$${(hospitalMetrics.inv.valBot / 1000).toFixed(0)}k`, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Registro de Kardex' && (
                  <HospitalHorizontalBarChart3D
                    title="Despachos por Servicio"
                    bars={[
                      { label: 'Urgencia', value: hospitalMetrics.kardex.kUrg, color: '#1b4332' },
                      { label: 'Pabellón', value: hospitalMetrics.kardex.kPab, color: '#2d6a4f' },
                      { label: 'Medicina', value: hospitalMetrics.kardex.kMed, color: '#40916c' },
                      { label: 'Otros', value: hospitalMetrics.kardex.kOtrUnid, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Tránsito Despacho' && (
                  <HospitalHorizontalBarChart3D
                    title="Insumos por Área Destino"
                    bars={[
                      { label: 'Distribución', value: hospitalMetrics.despacho.scDist, color: '#1b4332' },
                      { label: 'Mantención', value: hospitalMetrics.despacho.scMant, color: '#2d6a4f' },
                      { label: 'Clínicos', value: hospitalMetrics.despacho.scClin, color: '#40916c' },
                      { label: 'Otros', value: hospitalMetrics.despacho.scOtrDest, color: '#52b788' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos' && (
                  <HospitalHorizontalBarChart3D
                    title="Inversión por Área ($)"
                    bars={[
                      { label: 'UPC Adulto', value: hospitalMetrics.equipos.eqCostUpc, displayValue: `$${(hospitalMetrics.equipos.eqCostUpc / 1000).toFixed(0)}k`, color: '#1b4332' },
                      { label: 'Pabellón', value: hospitalMetrics.equipos.eqCostPab, displayValue: `$${(hospitalMetrics.equipos.eqCostPab / 1000).toFixed(0)}k`, color: '#2d6a4f' },
                      { label: 'Otros', value: hospitalMetrics.equipos.eqCostOtr, displayValue: `$${(hospitalMetrics.equipos.eqCostOtr / 1000).toFixed(0)}k`, color: '#40916c' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Herramientas' && (
                  <HospitalHorizontalBarChart3D
                    title="Inversión por Área ($)"
                    bars={[
                      { label: 'Mantención', value: hospitalMetrics.herramientas.herCostMant, displayValue: `$${(hospitalMetrics.herramientas.herCostMant / 1000).toFixed(0)}k`, color: '#1b4332' },
                      { label: 'Otros', value: hospitalMetrics.herramientas.herCostOtr, displayValue: `$${(hospitalMetrics.herramientas.herCostOtr / 1000).toFixed(0)}k`, color: '#2d6a4f' },
                    ]}
                  />
                )}
                {activeTab === 'Trazabilidad Equipos Menores' && (
                  <HospitalHorizontalBarChart3D
                    title="Costo Total por Área ($)"
                    bars={[
                      { label: 'Mantención', value: hospitalMetrics.eqMenores.eqmCostMant, displayValue: `$${(hospitalMetrics.eqMenores.eqmCostMant / 1000).toFixed(0)}k`, color: '#1b4332' },
                      { label: 'Otros', value: hospitalMetrics.eqMenores.eqmCostOtr, displayValue: `$${(hospitalMetrics.eqMenores.eqmCostOtr / 1000).toFixed(0)}k`, color: '#2d6a4f' },
                    ]}
                  />
                )}
              </div>
            </div>

            {/* ROW 14: SPACER ROW */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                backgroundColor: '#d8ebd4',
                height: '14px',
                borderBottom: '1px solid #b7dbb1',
              }}
            >
              <div style={{ background: '#f8f9fa', borderRight: '1px solid #dadce0', fontSize: '9px', textAlign: 'center', color: '#70757a' }}>
                14
              </div>
              <div />
            </div>

            {/* Table headers & Data for the active hospital tab */}
            {activeTab === 'Maestro de Inventario' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 110px 240px 110px 100px 100px 100px 120px 130px 110px',
                    backgroundColor: '#388e3c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '6px 0',
                    borderBottom: '2px solid #2e7d32',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div style={{ padding: '0 6px' }}>CÓDIGO</div>
                  <div style={{ padding: '0 6px' }}>DESCRIPCIÓN</div>
                  <div style={{ padding: '0 6px' }}>FAMILIA</div>
                  <div style={{ padding: '0 6px' }}>TIPO</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>STOCK</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>STOCK MÍN</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>VALOR UNIT</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>TOTAL NETO</div>
                  <div style={{ padding: '0 6px', textAlign: 'center' }}>ESTADO</div>
                </div>
                {productos.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 110px 240px 110px 100px 100px 100px 120px 130px 110px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fcf9',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '11.5px',
                      padding: '5px 0',
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#70757a', background: '#f8f9fa' }}>{16 + idx}</div>
                    <div style={{ padding: '0 6px', fontWeight: 600 }}>{p.codigo}</div>
                    <div style={{ padding: '0 6px' }}>{p.desc}</div>
                    <div style={{ padding: '0 6px' }}>{p.familia}</div>
                    <div style={{ padding: '0 6px' }}>{p.tipo}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right', fontWeight: 700 }}>{p.stock}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right' }}>{p.stockMin}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right' }}>${p.valor.toLocaleString('es-CL')}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right', fontWeight: 700 }}>
                      ${(p.stock * p.valor).toLocaleString('es-CL')}
                    </div>
                    <div style={{ padding: '0 6px', textAlign: 'center', color: p.estado === 'Activo' ? '#15803d' : '#b91c1c' }}>
                      {p.estado}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Registro de Kardex' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 90px 110px 90px 220px 110px 110px 110px 80px 80px 140px',
                    backgroundColor: '#388e3c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '6px 0',
                    borderBottom: '2px solid #2e7d32',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div style={{ padding: '0 6px' }}>ID</div>
                  <div style={{ padding: '0 6px' }}>FECHA</div>
                  <div style={{ padding: '0 6px' }}>CÓDIGO</div>
                  <div style={{ padding: '0 6px' }}>PRODUCTO</div>
                  <div style={{ padding: '0 6px' }}>OC</div>
                  <div style={{ padding: '0 6px' }}>FACTURA</div>
                  <div style={{ padding: '0 6px' }}>GUÍA</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>ENTRADA</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>SALIDA</div>
                  <div style={{ padding: '0 6px' }}>DESTINO / UNIDAD</div>
                </div>
                {kardex.map((k, idx) => (
                  <div
                    key={k.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 90px 110px 90px 220px 110px 110px 110px 80px 80px 140px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fcf9',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '11.5px',
                      padding: '5px 0',
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#70757a', background: '#f8f9fa' }}>{16 + idx}</div>
                    <div style={{ padding: '0 6px', fontFamily: 'monospace' }}>{k.id}</div>
                    <div style={{ padding: '0 6px' }}>{k.fechaIngreso || k.fecha}</div>
                    <div style={{ padding: '0 6px', fontWeight: 600 }}>{k.codigo}</div>
                    <div style={{ padding: '0 6px' }}>{k.producto}</div>
                    <div style={{ padding: '0 6px' }}>{k.oc || '—'}</div>
                    <div style={{ padding: '0 6px' }}>{k.factura || '—'}</div>
                    <div style={{ padding: '0 6px' }}>{k.guia || '—'}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                      {k.tipo === 'ENTRADA' ? k.cantidad : ''}
                    </div>
                    <div style={{ padding: '0 6px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                      {k.tipo === 'SALIDA' ? k.cantidad : ''}
                    </div>
                    <div style={{ padding: '0 6px' }}>{k.unidad || '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Tránsito Despacho' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 100px 100px 240px 90px 90px 90px 90px 110px 140px',
                    backgroundColor: '#388e3c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '6px 0',
                    borderBottom: '2px solid #2e7d32',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div style={{ padding: '0 6px' }}>FECHA</div>
                  <div style={{ padding: '0 6px' }}>CÓDIGO</div>
                  <div style={{ padding: '0 6px' }}>DESCRIPCIÓN</div>
                  <div style={{ padding: '0 6px' }}>FAMILIA</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>INGRESO</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>DESPACHADO</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>DISPONIBLE</div>
                  <div style={{ padding: '0 6px' }}>GUÍA / OC</div>
                  <div style={{ padding: '0 6px' }}>SERVICIO DESTINO</div>
                </div>
                {sinCostoList.map((sc, idx) => {
                  const totalDesp = (sc.despachos || []).reduce((s, d) => s + (d.cantidad || 0), 0);
                  const saldo = (sc.cantidad || 0) - totalDesp;
                  return (
                    <div
                      key={sc.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 100px 100px 240px 90px 90px 90px 90px 110px 140px',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fcf9',
                        borderBottom: '1px solid #e0e0e0',
                        fontSize: '11.5px',
                        padding: '5px 0',
                      }}
                    >
                      <div style={{ textAlign: 'center', color: '#70757a', background: '#f8f9fa' }}>{16 + idx}</div>
                      <div style={{ padding: '0 6px' }}>{sc.fechaIngreso || sc.fecha}</div>
                      <div style={{ padding: '0 6px', fontWeight: 600 }}>{sc.codigo}</div>
                      <div style={{ padding: '0 6px' }}>{sc.desc}</div>
                      <div style={{ padding: '0 6px' }}>{sc.familia}</div>
                      <div style={{ padding: '0 6px', textAlign: 'right' }}>{sc.cantidad}</div>
                      <div style={{ padding: '0 6px', textAlign: 'right', color: '#dc2626' }}>{totalDesp}</div>
                      <div style={{ padding: '0 6px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        {saldo}
                      </div>
                      <div style={{ padding: '0 6px' }}>{sc.guia || sc.oc || '—'}</div>
                      <div style={{ padding: '0 6px' }}>{sc.unidad || '—'}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'Trazabilidad Equipos' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 110px 100px 200px 110px 110px 80px 110px 140px 140px',
                    backgroundColor: '#388e3c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '6px 0',
                    borderBottom: '2px solid #2e7d32',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div style={{ padding: '0 6px' }}>CÓDIGO</div>
                  <div style={{ padding: '0 6px' }}>FECHA</div>
                  <div style={{ padding: '0 6px' }}>EQUIPO MÉDICO</div>
                  <div style={{ padding: '0 6px' }}>MARCA</div>
                  <div style={{ padding: '0 6px' }}>N° SERIE</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>CANTIDAD</div>
                  <div style={{ padding: '0 6px' }}>ESTADO</div>
                  <div style={{ padding: '0 6px' }}>SERVICIO DESTINO</div>
                  <div style={{ padding: '0 6px' }}>PERSONA QUE RECIBE</div>
                </div>
                {trazabilidad.map((eq, idx) => (
                  <div
                    key={eq.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 110px 100px 200px 110px 110px 80px 110px 140px 140px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fcf9',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '11.5px',
                      padding: '5px 0',
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#70757a', background: '#f8f9fa' }}>{16 + idx}</div>
                    <div style={{ padding: '0 6px', fontWeight: 600 }}>{eq.codigo}</div>
                    <div style={{ padding: '0 6px' }}>{eq.fecha}</div>
                    <div style={{ padding: '0 6px' }}>{eq.nombreEquipo}</div>
                    <div style={{ padding: '0 6px' }}>{eq.marca}</div>
                    <div style={{ padding: '0 6px' }}>{eq.nSerie}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right', fontWeight: 700 }}>{eq.cantidad || 1}</div>
                    <div style={{ padding: '0 6px' }}>{eq.ingresoRetiro || 'OPERATIVO'}</div>
                    <div style={{ padding: '0 6px' }}>{eq.servClinico || (eq as any).servicioDestino || '—'}</div>
                    <div style={{ padding: '0 6px' }}>{eq.quienRecibe || (eq as any).personaRecibe || '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Trazabilidad Herramientas' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 110px 100px 250px 90px 150px 150px 110px',
                    backgroundColor: '#388e3c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '6px 0',
                    borderBottom: '2px solid #2e7d32',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div style={{ padding: '0 6px' }}>CÓDIGO</div>
                  <div style={{ padding: '0 6px' }}>FECHA</div>
                  <div style={{ padding: '0 6px' }}>HERRAMIENTA</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>CANTIDAD</div>
                  <div style={{ padding: '0 6px' }}>SERVICIO DESTINO</div>
                  <div style={{ padding: '0 6px' }}>PERSONA QUE RECIBE</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>COSTO TOTAL</div>
                </div>
                {herramientas.map((h, idx) => (
                  <div
                    key={h.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 110px 100px 250px 90px 150px 150px 110px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fcf9',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '11.5px',
                      padding: '5px 0',
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#70757a', background: '#f8f9fa' }}>{16 + idx}</div>
                    <div style={{ padding: '0 6px', fontWeight: 600 }}>{h.codigo}</div>
                    <div style={{ padding: '0 6px' }}>{h.fecha}</div>
                    <div style={{ padding: '0 6px' }}>{h.descripcion}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right', fontWeight: 700 }}>{h.cantidad}</div>
                    <div style={{ padding: '0 6px' }}>{h.servicioDestino || (h as any).servClinico || '—'}</div>
                    <div style={{ padding: '0 6px' }}>{h.personaRecibe || (h as any).quienRecibe || '—'}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right' }}>${(h.costoTotal || 0).toLocaleString('es-CL')}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Trazabilidad Equipos Menores' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 110px 100px 240px 110px 90px 150px 140px',
                    backgroundColor: '#388e3c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '6px 0',
                    borderBottom: '2px solid #2e7d32',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div style={{ padding: '0 6px' }}>CÓDIGO</div>
                  <div style={{ padding: '0 6px' }}>FECHA</div>
                  <div style={{ padding: '0 6px' }}>EQUIPO MENOR</div>
                  <div style={{ padding: '0 6px' }}>MARCA</div>
                  <div style={{ padding: '0 6px', textAlign: 'right' }}>CANTIDAD</div>
                  <div style={{ padding: '0 6px' }}>SERVICIO DESTINO</div>
                  <div style={{ padding: '0 6px' }}>PERSONA QUE RECIBE</div>
                </div>
                {equiposMenores.map((eqm, idx) => (
                  <div
                    key={eqm.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 110px 100px 240px 110px 90px 150px 140px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fcf9',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '11.5px',
                      padding: '5px 0',
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#70757a', background: '#f8f9fa' }}>{16 + idx}</div>
                    <div style={{ padding: '0 6px', fontWeight: 600 }}>{eqm.codigo}</div>
                    <div style={{ padding: '0 6px' }}>{eqm.fecha}</div>
                    <div style={{ padding: '0 6px' }}>{eqm.nombreEquipo}</div>
                    <div style={{ padding: '0 6px' }}>{eqm.marca}</div>
                    <div style={{ padding: '0 6px', textAlign: 'right', fontWeight: 700 }}>{eqm.cantidad}</div>
                    <div style={{ padding: '0 6px' }}>{eqm.servicioDestino || (eqm as any).servClinico || '—'}</div>
                    <div style={{ padding: '0 6px' }}>{eqm.quienRecibe || (eqm as any).personaRecibe || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── GOOGLE SHEETS BOTTOM TAB BAR (EXACT CLONE: +, ☰, Task, Sheet4, List + Hospital Data Tabs) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f8fafd',
          borderTop: '1px solid #dadce0',
          padding: '2px 8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          gap: '2px',
          fontSize: '12px',
        }}
      >
        {/* Plus & All Sheets icons */}
        <button
          onClick={() => setShowAddTaskModal(true)}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#444746',
            fontWeight: 700,
          }}
          title="Agregar fila / tarea"
        >
          +
        </button>

        <button
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#444746',
          }}
          title="Todas las hojas"
        >
          ☰
        </button>

        <div style={{ width: '1px', height: '16px', background: '#dadce0', margin: '0 4px' }} />

        {/* Tab 1: Task */}
        <button
          onClick={() => setActiveTab('Task')}
          className={`gs-sheet-tab ${activeTab === 'Task' ? 'active' : ''}`}
        >
          <span>Task</span>
          {activeTab === 'Task' && <span style={{ fontSize: '9px', marginLeft: '4px' }}>▾</span>}
        </button>

        {/* Tab 2: Sheet4 (ACTIVE IN IMAGE WITH BLUE HIGHLIGHT) */}
        <button
          onClick={() => setActiveTab('Sheet4')}
          className={`gs-sheet-tab ${activeTab === 'Sheet4' ? 'active' : ''}`}
        >
          <span>Sheet4</span>
          {activeTab === 'Sheet4' && <span style={{ fontSize: '9px', marginLeft: '4px' }}>▾</span>}
        </button>

        {/* Tab 3: List */}
        <button
          onClick={() => setActiveTab('List')}
          className={`gs-sheet-tab ${activeTab === 'List' ? 'active' : ''}`}
        >
          <span>List</span>
          {activeTab === 'List' && <span style={{ fontSize: '9px', marginLeft: '4px' }}>▾</span>}
        </button>

        <div style={{ width: '1px', height: '16px', background: '#dadce0', margin: '0 4px' }} />

        {/* Hospital Data Tabs (Keeping all existing data, tabs, and columns intact!) */}
        {[
          'Maestro de Inventario',
          'Registro de Kardex',
          'Tránsito Despacho',
          'Trazabilidad Equipos',
          'Trazabilidad Herramientas',
          'Trazabilidad Equipos Menores',
        ].map((tabName) => (
          <button
            key={tabName}
            onClick={() => setActiveTab(tabName)}
            className={`gs-sheet-tab ${activeTab === tabName ? 'active' : ''}`}
          >
            <span>{tabName}</span>
            {activeTab === tabName && <span style={{ fontSize: '9px', marginLeft: '4px' }}>▾</span>}
          </button>
        ))}
      </div>

      {/* ── MODAL: AGREGAR NUEVA TAREA ── */}
      {showAddTaskModal && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1200 }}>
          <div
            className="modal-card"
            style={{
              maxWidth: '520px',
              width: '90%',
              backgroundColor: '#ffffff',
              color: '#202124',
              border: '2px solid #2e7d32',
              borderRadius: '8px',
              padding: '18px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b5e20' }}>
                ➕ Agregar Nueva Tarea (Task Management Tracker)
              </div>
              <button
                onClick={() => setShowAddTaskModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>Nombre de la Tarea (Task Name):</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="Ej: Review Security Firewall..."
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>Descripción:</label>
                <input
                  type="text"
                  value={newTask.desc}
                  onChange={(e) => setNewTask({ ...newTask, desc: e.target.value })}
                  placeholder="Descripción de la tarea..."
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>Asignado A:</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {[
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
                      'Benjamin Clark',
                      'Emma White',
                    ].map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>Prioridad:</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="High">High (Alta)</option>
                    <option value="Medium">Medium (Media)</option>
                    <option value="Low">Low (Baja)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>Fecha Inicio:</label>
                  <input
                    type="text"
                    value={newTask.startDate}
                    onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                    placeholder="1-Aug-2024"
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>Fecha Término (Due Date):</label>
                  <input
                    type="text"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    placeholder="5-Aug-2024"
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>Estado:</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Not Started">Not Started</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '3px' }}>¿Atrasada? (Is Overdue):</label>
                  <select
                    value={newTask.isOverdue}
                    onChange={(e) => setNewTask({ ...newTask, isOverdue: e.target.value as any })}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <button
                onClick={() => setShowAddTaskModal(false)}
                style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTask}
                style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', background: '#2e7d32', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Guardar Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
