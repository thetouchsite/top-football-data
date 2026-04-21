"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LeadGuideForm from "@/components/public/LeadGuideForm";

export default function LeadGuideModal({ open, onOpenChange, source }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border/50 bg-background/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-xl">Guida gratuita</DialogTitle>
          <DialogDescription>
            Inserisci i tuoi dati e ricevi la guida con framework, checklist e suggerimenti pratici.
          </DialogDescription>
        </DialogHeader>
        <LeadGuideForm
          compact
          source={source}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

