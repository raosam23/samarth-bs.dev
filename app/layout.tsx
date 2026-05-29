import type { Metadata } from "next";
import { Urbanist, Exo_2, Playfair_Display } from "next/font/google";
import Nav from "./components/Nav";
import ChatDock from "./components/ChatDock";
import "./globals.css";

const sans = Urbanist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Exo_2({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Samarth B S | Full-Stack AI Engineer",
  description:
    "Samarth B S — building multi-agent LLM systems and the streaming Next.js apps that ship with them.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <body>
        <Nav />
        {children}
        <ChatDock />
      </body>
    </html>
  );
}
