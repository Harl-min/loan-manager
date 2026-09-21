import type { Metadata } from "next";
import "./globals.css";
import { brand, brandCssVariables } from "@/lib/brand";
import SessionProvider from "@/components/SessionProvider";
import ClickTracker from "@/components/ClickTracker";
import IdleTimeout from "@/components/IdleTimeout";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: `${brand.name} loan servicing portal`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Theme variables derived from env/brand config — the one place a
            white-label deployment needs to touch to change the look. */}
        <style dangerouslySetInnerHTML={{ __html: `:root { ${brandCssVariables()} }` }} />
      </head>
      <body className="min-h-screen bg-muted text-foreground antialiased">
        <SessionProvider>
          <IdleTimeout />
          {children}
          <ClickTracker />
        </SessionProvider>
      </body>
    </html>
  );
}
