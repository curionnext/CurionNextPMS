import { useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO, isBefore } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Bed, DoorOpen, DollarSign, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils';
import { useReservationStore } from '../../stores/reservationStore';
import { usePropertyStore } from '../../stores/propertyStore';
import type { Reservation } from '../../types';

type DateRangeKey = 'today' | '7d' | '30d';

interface OccupancyDatum {
  date: Date;
  label: string;
  occupancy: number;
  checkIns: number;
  checkOuts: number;
}

const RANGE_OPTIONS: Array<{ label: string; value: DateRangeKey }> = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
];

// Lighter zinc-based color palette for charts
const PIE_COLORS = ['#71717a', '#a1a1aa', '#d4d4d8'];

export function DashboardPage() {
  const { reservations } = useReservationStore();
  const { rooms } = usePropertyStore();
  const [range, setRange] = useState<DateRangeKey>('7d');

  const today = new Date();
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((room) => room.status === 'occupied').length;
  const dirtyRooms = rooms.filter((room) => room.status === 'dirty').length;
  const maintenanceRooms = rooms.filter((room) => room.status === 'maintenance').length;
  const vacantRooms = rooms.filter((room) => room.status === 'vacant').length;
  const housekeepingPending = dirtyRooms + maintenanceRooms;

  const rangeBoundary = useMemo(() => {
    const current = new Date();
    if (range === 'today') {
      return { start: startOfDay(current), end: endOfDay(current) };
    }
    const days = range === '7d' ? 6 : 29;
    return { start: startOfDay(subDays(current, days)), end: endOfDay(current) };
  }, [range]);

  const overlappingReservations = useMemo(() => {
    return reservations.filter((reservation) => overlapsRange(reservation.checkIn, reservation.checkOut, rangeBoundary.start, rangeBoundary.end));
  }, [reservations, rangeBoundary]);

  const roomNights = overlappingReservations.reduce((sum, reservation) => sum + (reservation.nights || 0), 0);
  const roomRevenue = overlappingReservations.reduce((sum, reservation) => sum + (reservation.subtotal || 0), 0);
  const taxRevenue = overlappingReservations.reduce((sum, reservation) => sum + (reservation.tax || 0), 0);
  const totalRevenue = overlappingReservations.reduce((sum, reservation) => sum + (reservation.totalAmount || 0), 0);
  const ancillaryRevenue = Math.max(totalRevenue - roomRevenue - taxRevenue, 0);

  const arr = roomNights ? roomRevenue / roomNights : 0;
  const revpar = totalRooms ? roomRevenue / totalRooms : 0;
  const occupancyRate = totalRooms ? (occupiedRooms / totalRooms) * 100 : 0;

  const todayKey = format(startOfDay(today), 'yyyy-MM-dd');
  const todayCheckIns = reservations.filter((reservation) => reservation.checkIn === todayKey).length;
  const todayCheckOuts = reservations.filter((reservation) => reservation.checkOut === todayKey).length;

  const occupancyTrend = useMemo(() => buildOccupancySeries(reservations, rooms.length, range), [reservations, rooms.length, range]);

  const revenueSplit = [
    { name: 'Room Revenue', value: roomRevenue, color: PIE_COLORS[0] },
    { name: 'Taxes', value: taxRevenue, color: PIE_COLORS[1] },
    { name: 'Add-ons', value: ancillaryRevenue, color: PIE_COLORS[2] },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950">Property Pulse</h1>
          <p className="mt-1 text-sm text-zinc-500">Real-time occupancy, revenue, and operational insights derived from live data.</p>
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${range === option.value ? 'bg-zinc-900 text-white shadow' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-5">
        <StatCard
          title="Occupancy"
          value={`${occupancyRate.toFixed(1)}%`}
          helper={`${occupiedRooms} of ${totalRooms || 0} rooms`}
          icon={Bed}
          tone="bg-zinc-50 text-zinc-700"
        />
        <StatCard
          title="ARR"
          value={formatCurrency(arr || 0)}
          helper="Average room rate"
          icon={DollarSign}
          tone="bg-green-50 text-green-700"
        />
        <StatCard
          title="RevPAR"
          value={formatCurrency(revpar || 0)}
          helper="Revenue per available room"
          icon={TrendingUp}
          tone="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Today Check-ins"
          value={todayCheckIns.toString()}
          helper={`${todayCheckOuts} departures due`}
          icon={DoorOpen}
          tone="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          title="HK Pending"
          value={housekeepingPending.toString()}
          helper="Dirty or maintenance"
          icon={Sparkles}
          tone="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Occupancy Trend</CardTitle>
                <CardDescription>Rolling occupancy and daily arrivals/departures</CardDescription>
              </div>
              <Badge variant="info">{range === 'today' ? '24h view' : `${occupancyTrend.length}-day span`}</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            {occupancyTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" stroke="#71717a" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} stroke="#71717a" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#71717a" allowDecimals={false} style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value: number, key: string) => (key === 'occupancy' ? `${value.toFixed(1)}%` : value)} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="occupancy" name="Occupancy %" stroke="#18181b" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="checkIns" name="Check-ins" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="checkOuts" name="Check-outs" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No occupancy data for the selected window." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Split</CardTitle>
            <CardDescription>Composition of room revenue, taxes, and add-ons</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {totalRevenue > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueSplit} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={4}>
                    {revenueSplit.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Revenue will appear once stays are billed." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Arrivals vs Departures</CardTitle>
            <CardDescription>Operational load across the selected window</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {occupancyTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="checkIns" name="Check-ins" fill="#71717a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkOuts" name="Check-outs" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No arrival or departure activity recorded." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Highlights</CardTitle>
            <CardDescription>Snapshot of upcoming housekeeping workload</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-zinc-600">
              <div className="flex items-center justify-between">
                <span>Dirty rooms</span>
                <Badge variant="danger">{dirtyRooms}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Maintenance flagged</span>
                <Badge variant="warning">{maintenanceRooms}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Vacant &amp; clean</span>
                <Badge variant="success">{vacantRooms}</Badge>
              </div>
              <p className="text-xs text-zinc-500">
                Use the Housekeeping board to reassign staff and mark rooms as inspected once walkthroughs finish.
              </p>
              <Link to="/housekeeping">
                <Button variant="outline" className="w-full">
                  Open Housekeeping Board
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function buildOccupancySeries(reservations: Reservation[], totalRooms: number, range: DateRangeKey): OccupancyDatum[] {
  if (!reservations.length || !totalRooms) {
    return [];
  }

  const today = startOfDay(new Date());
  const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
  const start = range === 'today' ? today : subDays(today, days - 1);
  const interval = eachDayOfInterval({ start, end: today });

  return interval.map((date) => {
    const occupancyCount = reservations.filter((reservation) => isOccupiedOn(reservation, date)).length;
    const checkIns = reservations.filter((reservation) => reservation.checkIn === format(date, 'yyyy-MM-dd')).length;
    const checkOuts = reservations.filter((reservation) => reservation.checkOut === format(date, 'yyyy-MM-dd')).length;

    return {
      date,
      label: format(date, range === '30d' ? 'MMM d' : 'MMM d'),
      occupancy: totalRooms ? Math.min(100, (occupancyCount / totalRooms) * 100) : 0,
      checkIns,
      checkOuts,
    };
  });
}

function overlapsRange(checkIn: string, checkOut: string, start: Date, end: Date) {
  const arrival = parseISO(checkIn);
  const departure = parseISO(checkOut);
  return arrival <= end && departure >= start;
}

function isOccupiedOn(reservation: Reservation, date: Date) {
  const arrival = startOfDay(parseISO(reservation.checkIn));
  const departure = startOfDay(parseISO(reservation.checkOut));
  return arrival <= date && isBefore(date, departure);
}

interface StatCardProps {
  title: string;
  value: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}

function StatCard({ title, value, helper, icon: Icon, tone }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600">{title}</p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">{value}</p>
          </div>
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
            <Icon className="h-6 w-6" />
          </span>
        </div>
        <p className="text-xs text-zinc-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
      {message}
    </div>
  );
}
