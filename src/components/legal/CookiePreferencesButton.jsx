"use client";

import { useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CookiePreferencesButton({
  className = "",
  label = "Gestisci cookie",
  variant = "outline",
  source = "legal",
}) {
  const [feedback, setFeedback] = useState("");

  const handleClick = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("open-cookie-preferences", {
        detail: { source },
      })
    );
    setFeedback("Preference center pronto per integrazione CMP.");
    window.setTimeout(() => setFeedback(""), 2500);
  };

  return (
    <div>
      <Button type="button" variant={variant} onClick={handleClick} className={className}>
        <Cookie className="mr-1 h-4 w-4" />
        {label}
      </Button>
      {feedback ? <p className="mt-2 text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
