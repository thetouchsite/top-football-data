import React from "react";
import { BarChart3, Shield, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
              <BarChart3 className="w-3 h-3 text-primary" />
            </div>
            <span className="font-orbitron text-xs tracking-wider text-muted-foreground">
              TOP FOOTBALL DATA
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Privacy Policy</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Termini & Condizioni</span>
            <span>© 2026 Top Football Data</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>La vostre scommesse sono vostre responsabilità</span>
          </div>
        </div>
      </div>
    </footer>
  );
}