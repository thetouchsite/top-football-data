"use client";

import { MotionConfig } from "framer-motion";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from "@/lib/AppContext";
import { queryClientInstance } from "@/lib/query-client";

export default function Providers({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <QueryClientProvider client={queryClientInstance}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </AppProvider>
    </MotionConfig>
  );
}
