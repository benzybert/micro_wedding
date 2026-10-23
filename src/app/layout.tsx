import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/heebo/hebrew-400.css";
import "@fontsource/heebo/hebrew-600.css";
import "@fontsource/heebo/hebrew-700.css";
import "@fontsource/heebo/latin-400.css";
import "@fontsource/heebo/latin-600.css";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: { default: "מיקרו חתונה", template: "%s · מיקרו חתונה" },
  description: "תכנון חתונה קטנה בישראל: תאריך לפי הלוח העברי, תקציב, אורחים, ספקים, רישום ולוח זמנים.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Nav />
        <main className="container">{children}</main>
        <footer className="container site-footer">
          הנתונים נשמרים בדפדפן שלכם בלבד, ולא נשלחים לשום שרת.
        </footer>
      </body>
    </html>
  );
}
