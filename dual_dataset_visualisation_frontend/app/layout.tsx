import type {Metadata} from "next";
import {Geist, Geist_Mono, Nunito_Sans} from "next/font/google";
import "./globals.css";
import {QueryClient} from "@tanstack/query-core";
import Providers from "@/app/providers";

const nunitoSans = Nunito_Sans({variable: '--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dual Dataset Visualisation Tool",
  description: "Bachelor's Thesis of Fabian Cuza",
};

const queryClient = new QueryClient()

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunitoSans.variable}>
    <head>
      <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🗺️</text></svg>" />
    </head>
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 `}
    >
    <main className="p-8">
      <Providers>
        {children}
      </Providers>
    </main>
    </body>
    </html>
  );
}
