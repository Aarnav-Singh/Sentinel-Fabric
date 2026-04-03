import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { QueryProvider } from "@/components/providers/QueryProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-jetbrains-mono" });

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
    <html lang="en" className="dark h-full bg-sf-bg">
      <body className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans antialiased h-full flex flex-col overflow-hidden selection:bg-sf-accent/30 text-sf-text bg-sf-bg`}>
        <QueryProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
