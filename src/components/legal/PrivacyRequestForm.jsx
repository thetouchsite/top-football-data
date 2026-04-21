"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const requestTypes = [
  { value: "access", label: "Accesso ai dati" },
  { value: "delete", label: "Cancellazione dati" },
  { value: "rectify", label: "Rettifica dati" },
  { value: "portability", label: "Portabilita dati" },
  { value: "cookie", label: "Richiesta cookie/privacy" },
  { value: "other", label: "Altro" },
];

export default function PrivacyRequestForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    requestType: "",
    message: "",
    consent: false,
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!form.fullName.trim() || !form.email.trim() || !form.requestType || !form.message.trim()) {
      setStatus({ type: "error", message: "Compila tutti i campi obbligatori." });
      return;
    }

    if (!form.consent) {
      setStatus({ type: "error", message: "Devi confermare il consenso all'invio della richiesta." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/legal/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Invio non riuscito.");
      }

      setStatus({ type: "success", message: "Richiesta inviata. Ti risponderemo appena possibile." });
      setForm({ fullName: "", email: "", requestType: "", message: "", consent: false });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Errore durante l'invio." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/40 bg-secondary/10 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Nome e cognome *</span>
          <Input
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            placeholder="Mario Rossi"
            required
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Email *</span>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="mario@email.com"
            required
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">Tipo richiesta *</p>
        <Select
          value={form.requestType}
          onValueChange={(value) => setForm((prev) => ({ ...prev, requestType: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona una richiesta" />
          </SelectTrigger>
          <SelectContent>
            {requestTypes.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="space-y-1.5 text-sm">
        <span className="text-muted-foreground">Messaggio *</span>
        <Textarea
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          placeholder="Descrivi la tua richiesta in modo chiaro."
          className="min-h-[120px]"
          required
        />
      </label>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border border-border"
          checked={form.consent}
          onChange={(event) => setForm((prev) => ({ ...prev, consent: event.target.checked }))}
        />
        <span>Confermo di aver letto l'informativa privacy e autorizzo l'invio di questa richiesta.</span>
      </label>

      {status.message ? (
        <p className={`text-sm ${status.type === "error" ? "text-destructive" : "text-primary"}`}>{status.message}</p>
      ) : null}

      <Button type="submit" disabled={loading} className="font-semibold">
        {loading ? "Invio in corso..." : "Invia richiesta privacy"}
      </Button>
    </form>
  );
}
