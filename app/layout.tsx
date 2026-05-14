import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trend Finder | AI Signal Radar",
  description: "Premium AI trend intelligence dashboard for early signals, hidden gems, and content opportunities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
