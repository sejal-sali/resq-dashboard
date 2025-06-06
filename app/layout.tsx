import type { Metadata } from "next";
import "./globals.css";
import { ttRegular } from "@/lib/fonts/fonts";

export const metadata: Metadata = {
  title: "Admin Dashboard | ResQ",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${ttRegular.className}`}>{children}</body>
    </html>
  );
}
