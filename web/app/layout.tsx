import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalExtract AI",
  description: "Evidence-linked, governed document signal extraction",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
