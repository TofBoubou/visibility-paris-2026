import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Baromètre de Visibilité Médiatique - Paris 2026",
  description: "Analyse de la visibilité médiatique des candidats aux élections municipales Paris 2026",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
