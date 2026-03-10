"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { EdgeStoreProvider } from "@/lib/edgestore-client";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <EdgeStoreProvider>
          {children}
          <Toaster position="top-right" />
        </EdgeStoreProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
