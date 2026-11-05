import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

// PWA-ready manifest; a service worker can be added later without changes here.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Multi-company digital marketing management and monitoring.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#111827",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
