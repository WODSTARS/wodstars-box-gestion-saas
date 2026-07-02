import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WODSTARS Atletas",
    short_name: "WODSTARS",
    description: "Reserva clases, consulta cupos y gestiona tu asistencia desde el telefono.",
    start_url: "/app",
    display: "standalone",
    background_color: "#050506",
    theme_color: "#f4c430",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
