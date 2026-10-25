import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dinesh Kumar G — AI Engineer",
  description: "AI engineer building multi-agent systems for healthcare. Scroll through one inference pass: prompt, embeddings, attention, training, fine-tuning and output.",
  openGraph: {
    title: "Dinesh Kumar G — AI Engineer",
    description: "One inference pass through my work.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#04050a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
