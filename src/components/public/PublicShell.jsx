"use client";

import { useState } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import LeadGuideModal from "@/components/public/LeadGuideModal";

export default function PublicShell({ children }) {
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader onOpenGuideModal={() => setGuideModalOpen(true)} />
      <main>{children}</main>
      <PublicFooter />
      <LeadGuideModal
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
        source="public_shell_modal"
      />
    </div>
  );
}

