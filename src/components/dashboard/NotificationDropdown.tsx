import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info, CheckCircle2, X } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useProjects";
import { useNavigate } from "react-router-dom";

const typeConfig: Record<string, { icon: typeof Info; className: string }> = {
  critical: { icon: AlertCircle, className: "text-destructive" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  success: { icon: CheckCircle2, className: "text-success" },
  info: { icon: Info, className: "text-primary" },
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}j lalu`;
    return `${Math.floor(hrs / 24)}h lalu`;
  }

  const handleNotificationClick = (n: typeof notifications[0]) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.project_id) {
      navigate(`/project/${n.project_id}`);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors border border-border"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-xl z-50 animate-fade-in">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notifikasi</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" /> Baca semua
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                Tidak ada notifikasi
              </div>
            ) : (
              notifications.map(n => {
                const tc = typeConfig[n.type] || typeConfig.info;
                const Icon = tc.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 p-3 border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tc.className}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${!n.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                        {!n.is_read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />}
                      </div>
                      {n.message && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {n.projects && (
                          <span className="text-[9px] font-mono-data text-primary">{n.projects.project_code} →</span>
                        )}
                        <span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
