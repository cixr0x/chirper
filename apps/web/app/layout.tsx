import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Chirper",
  description: "Service-oriented Twitter clone learning project",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

