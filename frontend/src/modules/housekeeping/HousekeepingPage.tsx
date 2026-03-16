import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { CalendarDays, AlertTriangle, UserPlus, CheckCircle2, Sparkles, ClipboardCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { usePropertyStore } from '../../stores/propertyStore';
import type { RoomInventory } from '../../types';
import { cn } from '../../utils';

const STAFF_OPTIONS = [
  { value: '', label: 'Unassigned' },
  { value: 'Anita', label: 'Anita' },
  { value: 'Ramesh', label: 'Ramesh' },
  { value: 'Sonia', label: 'Sonia' },
  { value: 'Karim', label: 'Karim' },
];

const STATUS_COLUMNS: Array<{ key: HousekeepingStatus; title: string; helper: string; tone: string }> = [
  { key: 'dirty', title: 'Dirty', helper: 'Needs cleaning', tone: 'bg-red-50 border-red-200' },
  { key: 'clean', title: 'Clean', helper: 'Awaiting inspection', tone: 'bg-blue-50 border-blue-200' },
  { key: 'inspected', title: 'Inspected', helper: 'Guest-ready', tone: 'bg-emerald-50 border-emerald-200' },
];

type HousekeepingStatus = 'dirty' | 'clean' | 'inspected';

type HousekeepingTask = {
  id: string;
  roomId: string;
  roomNumber: string;
  roomTypeId: string;
  floorId: string;
  status: HousekeepingStatus;
  assignedTo: string;
  priority: boolean;
  maintenance: boolean;
  lastUpdated: string;
};

const generateId = () => Math.random().toString(36).slice(2, 9);

export function HousekeepingPage() {
  const { rooms, updateRoomStatus } = usePropertyStore();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);

  useEffect(() => {
    if (!rooms.length) {
      setTasks([]);
      return;
    }

    setTasks((prev) => {
      const existingMap = new Map(prev.map((task) => [task.roomId, task]));
      return rooms.map((room) => {
        const state = existingMap.get(room.id);
        if (state) {
          return state;
        }
        return createTaskFromRoom(room);
      });
    });
  }, [rooms]);

  const grouped = useMemo(() => {
    const columns: Record<HousekeepingStatus, HousekeepingTask[]> = {
      dirty: [],
      clean: [],
      inspected: [],
    };

    tasks.forEach((task) => {
      columns[task.status].push(task);
    });

    (Object.keys(columns) as HousekeepingStatus[]).forEach((status) => {
      columns[status].sort((a, b) => {
        if (a.priority !== b.priority) {
          return Number(b.priority) - Number(a.priority);
        }
        return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
      });
    });

    return columns;
  }, [tasks]);

  const mobileTasks = useMemo(() => {
    const priorityOrder: HousekeepingStatus[] = ['dirty', 'clean', 'inspected'];
    return [...tasks].sort((a, b) => {
      const statusDelta = priorityOrder.indexOf(a.status) - priorityOrder.indexOf(b.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }
      if (a.priority !== b.priority) {
        return Number(b.priority) - Number(a.priority);
      }
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });
  }, [tasks]);

  const handleAssign = (roomId: string, staff: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.roomId === roomId ? { ...task, assignedTo: staff, lastUpdated: new Date().toISOString() } : task
      )
    );
  };

  const handleTogglePriority = (roomId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.roomId === roomId ? { ...task, priority: !task.priority, lastUpdated: new Date().toISOString() } : task
      )
    );
  };

  const handleToggleMaintenance = (roomId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.roomId !== roomId) {
          return task;
        }
        const nextMaintenance = !task.maintenance;
        updateRoomStatus(roomId, nextMaintenance ? 'maintenance' : mapStatusToRoomState(task.status));
        return { ...task, maintenance: nextMaintenance, lastUpdated: new Date().toISOString() };
      })
    );
  };

  const handleStatusAdvance = (roomId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.roomId !== roomId) {
          return task;
        }
        const nextStatus = task.status === 'dirty' ? 'clean' : 'inspected';
        updateRoomStatus(roomId, mapStatusToRoomState(nextStatus));
        return { ...task, status: nextStatus, lastUpdated: new Date().toISOString() };
      })
    );
  };

  const handleStatusReset = (roomId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.roomId !== roomId) {
          return task;
        }
        updateRoomStatus(roomId, 'dirty');
        return { ...task, status: 'dirty', lastUpdated: new Date().toISOString() };
      })
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
          <p className="mt-1 text-sm text-gray-500">Track room readiness, assign teams, and flag maintenance instantly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-2">
            <UserPlus className="h-4 w-4" /> Assign Roster
          </Button>
          <Button variant="outline" className="gap-2">
            <ClipboardCheck className="h-4 w-4" /> Inspection Report
          </Button>
        </div>
      </header>

      <section className="grid gap-4 text-sm text-gray-600 md:grid-cols-3">
        <QuickMetric
          label="Dirty"
          value={grouped.dirty.length}
          tone="bg-red-100 text-red-700"
          icon={AlertTriangle}
        />
        <QuickMetric
          label="In Cleaning"
          value={grouped.clean.length}
          tone="bg-blue-100 text-blue-700"
          icon={Sparkles}
        />
        <QuickMetric
          label="Inspected"
          value={grouped.inspected.length}
          tone="bg-emerald-100 text-emerald-700"
          icon={CheckCircle2}
        />
      </section>

      <div className="md:hidden">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mobile sprint</p>
        <div className="mt-2 space-y-3">
          {mobileTasks.map((task) => (
            <MobileTaskRow
              key={task.id}
              task={task}
              onAdvance={handleStatusAdvance}
              onReset={handleStatusReset}
              onTogglePriority={handleTogglePriority}
            />
          ))}
          {!mobileTasks.length && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-xs text-gray-500">
              No housekeeping tickets open.
            </div>
          )}
        </div>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-3">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.key} className="flex flex-col gap-3">
            <header className={cn('rounded-2xl border px-4 py-3 shadow-sm', column.tone)}>
              <p className="text-sm font-semibold text-gray-900">{column.title}</p>
              <p className="text-xs text-gray-600">{column.helper}</p>
            </header>
            <div className="space-y-3">
              {grouped[column.key].map((task) => (
                <RoomCard
                  key={task.id}
                  task={task}
                  onAssign={handleAssign}
                  onTogglePriority={handleTogglePriority}
                  onToggleMaintenance={handleToggleMaintenance}
                  onAdvance={handleStatusAdvance}
                  onReset={handleStatusReset}
                />
              ))}

              {!grouped[column.key].length && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-xs text-gray-500">
                  No rooms in this stage.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileTaskRow({ task, onAdvance, onReset, onTogglePriority }: { task: HousekeepingTask; onAdvance: (roomId: string) => void; onReset: (roomId: string) => void; onTogglePriority: (roomId: string) => void; }) {
  const nextLabel = task.status === 'inspected' ? 'Reset' : 'Advance';
  const nextAction = task.status === 'inspected' ? onReset : onAdvance;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div className="space-y-1 text-xs text-gray-600">
        <p className="text-sm font-semibold text-gray-900">Room {task.roomNumber}</p>
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          {task.priority && <Badge variant="warning">Priority</Badge>}
        </div>
        <button
          onClick={() => onTogglePriority(task.roomId)}
          className="text-[11px] font-semibold uppercase tracking-wide text-primary-600"
        >
          {task.priority ? 'Unmark priority' : 'Mark priority'}
        </button>
      </div>
      <Button size="sm" variant="secondary" onClick={() => nextAction(task.roomId)}>
        {nextLabel}
      </Button>
    </div>
  );
}

interface RoomCardProps {
  task: HousekeepingTask;
  onAssign: (roomId: string, staff: string) => void;
  onTogglePriority: (roomId: string) => void;
  onToggleMaintenance: (roomId: string) => void;
  onAdvance: (roomId: string) => void;
  onReset: (roomId: string) => void;
}

function RoomCard({ task, onAssign, onTogglePriority, onToggleMaintenance, onAdvance, onReset }: RoomCardProps) {
  const nextLabel = task.status === 'inspected' ? 'Reset to Dirty' : task.status === 'dirty' ? 'Mark Clean' : 'Mark Inspected';
  const nextAction = task.status === 'inspected' ? onReset : onAdvance;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">Room {task.roomNumber}</p>
          <p className="text-xs text-gray-500">Type: {task.roomTypeId}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs">
          <button
            onClick={() => onTogglePriority(task.roomId)}
            className={cn(
              'rounded-full px-2 py-1 font-semibold',
              task.priority ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            )}
          >
            Priority
          </button>
          <button
            onClick={() => onToggleMaintenance(task.roomId)}
            className={cn(
              'rounded-full px-2 py-1 font-semibold',
              task.maintenance ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
            )}
          >
            {task.maintenance ? 'Maintenance' : 'Flag Issue'}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          Updated {new Date(task.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div>
          <p className="mb-1 font-medium text-gray-700">Assigned To</p>
          <Select
            value={task.assignedTo}
            onChange={(event) => onAssign(task.roomId, event.target.value)}
            options={STAFF_OPTIONS}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={task.status} />
          {task.maintenance && <Badge variant="danger">Maintenance</Badge>}
          {task.priority && <Badge variant="warning">Priority</Badge>}
        </div>
      </div>

      <div className="mt-4 flex gap-2 text-xs font-semibold">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => nextAction(task.roomId)}
        >
          {nextLabel}
        </Button>
        {task.status !== 'dirty' && (
          <Button variant="ghost" size="sm" className="text-gray-600" onClick={() => onReset(task.roomId)}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: HousekeepingStatus }) {
  if (status === 'dirty') {
    return <Badge variant="danger">Dirty</Badge>;
  }
  if (status === 'clean') {
    return <Badge variant="info">Clean</Badge>;
  }
  return <Badge variant="success">Inspected</Badge>;
}

interface QuickMetricProps {
  label: string;
  value: number;
  tone: string;
  icon: ComponentType<{ className?: string }>;
}

function QuickMetric({ label, value, tone, icon: Icon }: QuickMetricProps) {
  return (
    <div className={cn('flex items-center justify-between rounded-2xl border px-4 py-3 shadow-sm', tone)}>
      <div>
        <p className="text-xs font-semibold uppercase text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <Icon className="h-8 w-8 text-gray-400" />
    </div>
  );
}

function createTaskFromRoom(room: RoomInventory): HousekeepingTask {
  let status: HousekeepingStatus = 'clean';
  if (room.status === 'dirty') {
    status = 'dirty';
  } else if (room.status === 'vacant') {
    status = 'clean';
  } else if (room.status === 'occupied') {
    status = 'inspected';
  }
  return {
    id: generateId(),
    roomId: room.id,
    roomNumber: room.roomNumber,
    roomTypeId: room.roomTypeId,
    floorId: room.floorId,
    status,
    assignedTo: '',
    priority: false,
    maintenance: room.status === 'maintenance',
    lastUpdated: new Date().toISOString(),
  };
}

function mapStatusToRoomState(status: HousekeepingStatus): 'vacant' | 'dirty' | 'maintenance' {
  if (status === 'dirty') {
    return 'dirty';
  }
  return 'vacant';
}
