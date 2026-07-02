import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WodStars Box Gestión",
  description: "SaaS para administración de boxes de CrossFit"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
