import { useMemo } from 'react';
import { Bell, CheckCircle2, CircleAlert, CircleX, Clock, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { useAlertStore } from '../../stores/alertStore';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../utils';
import { formatDistanceToNow } from 'date-fns';
import type { AlertItem } from '../../types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const severityTone: Record<string, string> = {
  low: 'border-gray-200 bg-white',
  medium: 'border-amber-200 bg-amber-50',
  high: 'border-orange-200 bg-orange-50',
  critical: 'border-red-200 bg-red-50',
};

const severityBadge: Record<string, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'default' },
  medium: { label: 'Medium', variant: 'warning' },
  high: { label: 'High', variant: 'danger' },
  critical: { label: 'Critical', variant: 'danger' },
};

export function AlertBell({ onClick }: { onClick: () => void }) {
  const unread = useAlertStore((state) => state.getUnreadCount());

  return (
    <button className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors" onClick={onClick} aria-label="Open alerts">
      <Bell className="h-5 w-5" />
      {unread > 0 && <span className="absolute -top-1 -right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unread}</span>}
    </button>
  );
}

export function AlertCenterPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { alerts, markAllRead, acknowledgeAlert, dismissAlert } = useAlertStore();
  const { user } = useAuthStore();

  const grouped = useMemo(() => {
    const unread = alerts.filter((alert) => !alert.isRead);
    const rest = alerts.filter((alert) => alert.isRead);
    return { unread, rest };
  }, [alerts]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-x-4 top-20 z-40 mx-auto max-w-3xl">
      <Card className="shadow-xl">
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Alerts Center</CardTitle>
            <CardDescription>Rule-based exceptions synced with live operations.</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-600" onClick={markAllRead}>
              <CheckCircle2 className="h-4 w-4" /> Mark all read
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[420px] space-y-4 overflow-y-auto">
          {grouped.unread.length ? (
            <AlertSection
              title="New"
              alerts={grouped.unread}
              onAcknowledge={(id) => acknowledgeAlert(id, user?.name || 'System')}
              onDismiss={dismissAlert}
            />
          ) : null}
          {grouped.rest.length ? (
            <AlertSection
              title="History"
              alerts={grouped.rest}
              onAcknowledge={(id) => acknowledgeAlert(id, user?.name || 'System')}
              onDismiss={dismissAlert}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              All clear. No alerts at the moment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AlertSectionProps {
  title: string;
  alerts: AlertItem[];
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

function AlertSection({ title, alerts, onAcknowledge, onDismiss }: AlertSectionProps) {
  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span>{title}</span>
        <span>{alerts.length}</span>
      </header>
      <div className="space-y-3">
        {alerts.map((alert: AlertItem) => {
          const tone = severityTone[alert.severity] || severityTone.low;
          const badge = severityBadge[alert.severity] || severityBadge.low;
          return (
            <div key={alert.id} className={cn('rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg', tone)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{alert.message}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                    {alert.acknowledgedBy && (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Ack by {alert.acknowledgedBy}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs">
                  {!alert.acknowledgedAt && (
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => onAcknowledge(alert.id)}>
                      <CheckCircle2 className="h-4 w-4" /> Acknowledge
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="gap-1 text-gray-600" onClick={() => onDismiss(alert.id)}>
                    <CircleX className="h-4 w-4" /> Dismiss
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AlertsToaster() {
  const alerts = useAlertStore((state) => state.alerts);
  const dismissAlert = useAlertStore((state) => state.dismissAlert);

  const recent = useMemo(() => {
    const cutoff = Date.now() - 90_000;
    return alerts.filter((alert) => !alert.isRead && new Date(alert.createdAt).getTime() >= cutoff).slice(0, 3);
  }, [alerts]);

  if (!recent.length) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 space-y-3">
      {recent.map((alert) => {
        const badge = severityBadge[alert.severity] || severityBadge.low;
        return (
          <div key={alert.id} className="w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                {alert.severity === 'critical' ? <TriangleAlert className="h-4 w-4 text-red-500" /> : alert.severity === 'high' ? <CircleAlert className="h-4 w-4 text-orange-500" /> : <CircleAlert className="h-4 w-4 text-amber-500" />}
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissAlert(alert.id)}
                className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-900">{alert.title}</p>
            <p className="mt-1 text-xs text-gray-600">{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
