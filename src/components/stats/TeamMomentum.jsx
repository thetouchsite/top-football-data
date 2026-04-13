import React from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import GlassCard from "../shared/GlassCard";
import { Badge } from "@/components/ui/badge";

const MOMENTUM_DATA = [
  { match: "G1", inter: 65, milan: 50 },
  { match: "G2", inter: 70, milan: 55 },
  { match: "G3", inter: 80, milan: 45 },
  { match: "G4", inter: 75, milan: 60 },
  { match: "G5", inter: 85, milan: 52 },
  { match: "G6", inter: 78, milan: 65 },
  { match: "G7", inter: 90, milan: 58 },
  { match: "G8", inter: 88, milan: 62 },
];

const BADGES = [
  { label: "Squadra in forma", team: "Inter", type: "positive" },
  { label: "Difesa fragile", team: "Milan", type: "negative" },
  { label: "Trend Over 2.5", team: "Entrambe", type: "neutral" },
  { label: "Clean sheet trend", team: "Inter", type: "positive" },
];

export default function TeamMomentum() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <GlassCard>
        <h3 className="font-semibold text-foreground mb-4">Team Momentum - Ultime 8 giornate</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={MOMENTUM_DATA}>
            <defs>
              <linearGradient id="interGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="milanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="match" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 44%, 10%)',
                border: '1px solid hsl(222, 30%, 18%)',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="inter" stroke="hsl(152, 100%, 50%)" fillOpacity={1} fill="url(#interGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="milan" stroke="hsl(0, 84%, 60%)" fillOpacity={1} fill="url(#milanGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Inter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">Milan</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-semibold text-foreground mb-4">Badge Automatici</h3>
        <div className="space-y-3">
          {BADGES.map((badge, i) => (
            <div key={i} className={`p-3 rounded-lg border ${
              badge.type === "positive" ? "bg-primary/5 border-primary/20" :
              badge.type === "negative" ? "bg-destructive/5 border-destructive/20" :
              "bg-accent/5 border-accent/20"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold text-sm ${
                  badge.type === "positive" ? "text-primary" :
                  badge.type === "negative" ? "text-destructive" :
                  "text-accent"
                }`}>
                  {badge.label}
                </span>
                <Badge variant="outline" className="text-xs border-border/50">
                  {badge.team}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">Ultimi 5 risultati</h4>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-muted-foreground mb-1 block">Inter</span>
              <div className="flex gap-1">
                {["V", "V", "P", "V", "V"].map((r, i) => (
                  <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                    r === "V" ? "bg-primary/20 text-primary" : r === "P" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"
                  }`}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground mb-1 block">Milan</span>
              <div className="flex gap-1">
                {["V", "S", "V", "P", "S"].map((r, i) => (
                  <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                    r === "V" ? "bg-primary/20 text-primary" : r === "S" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"
                  }`}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}