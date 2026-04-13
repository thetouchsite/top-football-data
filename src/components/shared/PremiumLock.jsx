import React from "react";
import { Link } from "@/lib/router-compat";
import { Lock, Crown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PremiumLock({ message = "Contenuto Premium", blur = true, compact = false }) {
  if (compact) {
    return (
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <Link to="/premium">
            <Button size="sm" className="bg-accent text-accent-foreground font-bold text-xs glow-gold h-8">
              <Lock className="w-3 h-3 mr-1" /> Sblocca
            </Button>
          </Link>
        </div>
        <div className="opacity-30 pointer-events-none select-none">
          {/* placeholder */}
          <div className="h-20 bg-secondary/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      {blur && <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 rounded-xl" />}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Crown className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h3 className="font-orbitron font-bold text-base text-accent mb-1">{message}</h3>
          <p className="text-xs text-muted-foreground">Sblocca con piano Premium per accedere a questa funzione</p>
        </div>
        <Link to="/premium">
          <Button className="bg-primary text-primary-foreground font-bold text-xs glow-green-sm">
            DIVENTA PREMIUM <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="opacity-20 pointer-events-none select-none">
        <div className="h-40 bg-gradient-to-b from-secondary/40 to-secondary/20 rounded-xl" />
      </div>
    </div>
  );
}
