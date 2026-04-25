import "./globals.css";
import type { ReactNode } from "react";
import { RouteAnnouncerGuard } from "../components/route-announcer-guard";

export const metadata = {
  title: "Chirper",
  description: "Service-oriented Twitter clone learning project",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RouteAnnouncerGuard />
      </body>
    </html>
  );
}
