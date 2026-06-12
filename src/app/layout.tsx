import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "WDNNSP",
  description:
    "We Dont Need No Sticken Points helps compare points, miles, and cash flight options.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
