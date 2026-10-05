import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Trustonics — Just tell us. We’ll handle the rest.",
    template: "%s | Trustonics",
  },
  description:
    "Tell us what you need in a laptop or PC. A Trustonics expert helps you find your fit in Pakistan.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
