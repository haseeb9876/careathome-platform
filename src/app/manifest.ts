import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sukoonara Care — Home Care",
    short_name: brand.name,
    description: "Your home visits, care team and care records in one place.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f8f6",
    theme_color: "#195c50",
    lang: "en",
    icons: [
      {
        src: "/icons/app-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
