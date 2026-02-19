import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookFlow AI — Smart Appointment Scheduling",
  description:
    "AI-powered appointment scheduling platform with voice calling agents. Manage your bookings, staff, and services with intelligent automation.",
  keywords: [
    "appointment scheduling",
    "AI booking",
    "voice agent",
    "salon booking",
    "appointment management",
  ],
  openGraph: {
    title: "BookFlow AI",
    description: "AI-Powered Appointment Scheduling Platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
