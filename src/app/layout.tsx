import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DialogProvider } from "@/components/dialog";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Team Tracker", template: "%s · Team Tracker" },
  description: "Track your team, tasks and deadlines.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans md:h-screen md:flex-row md:overflow-hidden">
        <DialogProvider>
          <Sidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-y-auto">{children}</main>
        </DialogProvider>
      </body>
    </html>
  );
}
