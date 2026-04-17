import React from "react";
import { Bell, Check, TrendingUp, Zap, Crown, BarChart2, Users } from "lucide-react";
import { useApp } from "@/lib/AppContext";

const TYPE_CONFIG = {
  value_bet: { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  live_alert: { icon: Zap, color: "text-destructive", bg: "bg-destructive/10" },
  combo: { icon: Crown, color: "text-accent", bg: "bg-accent/10" },
  odds_drop: { icon: BarChart2, color: "text-blue-400", bg: "bg-blue-400/10" },
  lineup: { icon: Users, color: "text-green-400", bg: "bg-green-400/10" },
};

export default function NotificationsPanel({ onClose: _onClose }) {
  const { notifications, markAllRead, markRead, unreadCount } = useApp();

  return (
    <div className="absolute right-0 top-10 z-50 w-[min(20rem,calc(100dvw-1rem))] max-w-[calc(100dvw-1rem)] overflow-hidden rounded-xl border border-border/50 glass-strong shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-foreground" />
          <span className="font-semibold text-sm text-foreground">Notifiche</span>
          {unreadCount > 0 && (
            <span className="bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 shrink-0 rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Check className="w-3 h-3" /> Segna tutto letto
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto overflow-x-hidden pl-0 pr-1.5">
        {notifications.map((n) => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.value_bet;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/20 hover:bg-secondary/30 transition-all ${!n.read ? "bg-secondary/20" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{n.title}</span>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-xs text-muted-foreground/70 mt-1 block">{n.time}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
