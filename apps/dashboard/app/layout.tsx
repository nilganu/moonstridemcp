import type { Metadata } from "next";
import "./globals.css";
import "./navigator.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Moonstride Dashboard",
  description: "Operational dashboard + AI assistant for the Moonstride API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css?family=Montserrat:400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
