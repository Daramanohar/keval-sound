import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { PlayerProvider } from "@/lib/player-context";
import { StoreProvider } from "@/lib/store-context";
import { ToastProvider } from "@/lib/toast-context";
import AppShell from "@/components/AppShell";
import PersistentPlayer from "@/components/PersistentPlayer";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Keval Sound - Your Sound. Yours Alone. Forever.",
  description:
    "India's premier exclusive music licensing platform. Discover and license premium Indian regional music across 22+ languages. Once purchased, tracks are permanently removed - true exclusive ownership.",
  keywords: [
    "music licensing",
    "exclusive music",
    "Indian music",
    "Bollywood beats",
    "regional music",
    "music production",
    "exclusive rights",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-vampire-black text-light-grey font-body">
        <AuthProvider>
          <StoreProvider>
            <ToastProvider>
              <PlayerProvider>
                <div className="aurora-bg" aria-hidden="true" />
                <AppShell>{children}</AppShell>
                <PersistentPlayer />
              </PlayerProvider>
            </ToastProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
