import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WodStars Box Gestion",
  description: "SaaS para administracion de boxes de CrossFit",
  icons: {
    icon: "/wodstar-logo-transparent.png",
    apple: "/wodstar-logo-transparent.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
