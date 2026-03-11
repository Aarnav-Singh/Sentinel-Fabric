import type { Metadata } from "next";
import { Inter, Sora, Outfit, JetBrains_Mono, Barlow_Condensed, Space_Mono } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { QueryProvider } from "@/components/providers/QueryProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-jetbrains-mono" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-barlow-condensed" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export const metadata: Metadata = {
  title: "Sentinel Fabric | Command Center",
  description: "Turns security tool noise into attack campaign narratives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full bg-[#0a0f18]">
      <body className={`${inter.variable} ${sora.variable} ${outfit.variable} ${jetbrainsMono.variable} ${barlowCondensed.variable} ${spaceMono.variable} font-sans antialiased h-full flex flex-col overflow-hidden selection:bg-brand-accent/30 text-slate-300 bg-brand-dark`}>
        <QueryProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
