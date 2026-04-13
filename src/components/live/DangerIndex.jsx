import React, { useState } from "react";
import { AlertTriangle, Bell } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

export default function DangerIndex({ value, message, history = [] }) {
  const [alertActive, setAlertActive] = useState(false);

  const getLevel = () => {
    if (value >= 75) return { label: "CRITICO", color: "text-destructive", border: "border-destructive/30", bg: "bg-destructive/10", bar: "bg-destructive", glow: "shadow-[0_0_30px_rgba(239,68,68,0.3)]" };
    if (value >= 55) return { label: "ALTO", color: "text-orange-400", border: "border-orange-400/30", bg: "bg-orange-400/10", bar: "bg-orange-400", glow: "shadow-[0_0_25px_rgba(251,146,60,0.2)]" };
    if (value >= 35) return { label: "MEDIO", color: "text-accent", border: "border-accent/30", bg: "bg-accent/10", bar: "bg-accent", glow: "" };
    return { label: "BASSO", color: "text-muted-foreground", border: "border-border/50", bg: "bg-secondary/30", bar: "bg-muted-foreground", glow: "" };
  };

  const lvl = getLevel();
  const chartData = history.map((v, i) => ({ t: i, v }));

  return (
    <GlassCard className={`${lvl.border} ${lvl.glow}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${lvl.color}`} />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Indice Pericolosità Pro</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lvl.bg} ${lvl.color} border ${lvl.border}`}>
          {lvl.label}
        </span>
      </div>

      <div className="text-center mb-3">
        <div className={`font-orbitron text-5xl font-black ${lvl.color}`}>{value}%</div>
      </div>

      <div className="h-2.5 rounded-full bg-secondary/40 overflow-hidden mb-3">
        <div className={`h-full ${lvl.bar} rounded-full transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>

      {history.length > 0 && (
        <div className="h-12 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="hsl(152, 100%, 50%)" fill="url(#dGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className={`p-3 rounded-lg ${lvl.bg} border ${lvl.border} mb-3`}>
        <p className={`text-xs leading-relaxed ${lvl.color}`}>{message}</p>
      </div>

      <Button onClick={() => setAlertActive(!alertActive)}
        className={`w-full text-xs h-9 font-semibold ${alertActive ? "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30" : "bg-secondary/60 text-foreground hover:bg-secondary border border-border/50"}`}
        variant="ghost">
        <Bell className="w-3.5 h-3.5 mr-2" />
        {alertActive ? "Alert Attivo ●" : "Attiva Alert"}
      </Button>
    </GlassCard>
  );
}