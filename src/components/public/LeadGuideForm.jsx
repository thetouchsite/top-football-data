"use client";

import { useState } from "react";
import { Check, Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { trackConversionEvent } from "@/components/public/conversion-events";

const defaultFormState = {
  nome: "",
  email: "",
  eta: "",
  telefono: "",
};

export default function LeadGuideForm({
  source = "public_guide_form",
  compact = false,
  onSuccess = null,
}) {
  const [form, setForm] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    trackConversionEvent("guide_form_submit_attempt", { source });

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          source,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Invio non riuscito.");
      }

      setForm(defaultFormState);
      trackConversionEvent("guide_form_submit_success", { source });
      toast({
        title: "Richiesta inviata",
        description: "Ti contatteremo con il materiale gratuito.",
      });
      onSuccess?.();
    } catch (error) {
      trackConversionEvent("guide_form_submit_error", { source });
      toast({
        variant: "destructive",
        title: "Errore invio",
        description: error.message || "Controlla la configurazione del server.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`app-panel rounded-2xl p-6 ${compact ? "" : "max-w-md"}`}>
      <div className="mb-1 flex items-center gap-2">
        <Download className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Scarica GRATIS</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">la guida operativa Top Football Data</p>

      <div className="mb-4 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-primary">
          <Check className="h-3 w-3" />
          <span className="text-foreground">Metodo rapido lettura quote</span>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <Check className="h-3 w-3" />
          <span className="text-foreground">Filtro value e contesto match</span>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <Check className="h-3 w-3" />
          <span className="text-foreground">Check-list decisionale anti-fuffa</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Nome"
          value={form.nome}
          onChange={handleChange("nome")}
          className="h-10 border-border/50 bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="La tua email"
            value={form.email}
            onChange={handleChange("email")}
            className="h-10 border-border/50 bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <Input
            placeholder="Età"
            value={form.eta}
            onChange={handleChange("eta")}
            className="h-10 border-border/50 bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Input
          placeholder="Telefono (opzionale)"
          value={form.telefono}
          onChange={handleChange("telefono")}
          className="h-10 border-border/50 bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full bg-primary text-sm font-bold text-primary-foreground glow-green hover:bg-primary/90"
        >
          {submitting ? "INVIO IN CORSO..." : "SCARICA GRATIS ORA"}
        </Button>
      </form>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>100% gratuito · No spam · Cancellazione semplice</span>
      </div>
    </div>
  );
}

