import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-noto-thai",
});

export const metadata: Metadata = {
  title: "Dr.Tech.Care — ระบบตู้ดูแลและฟื้นฟูกายภาพบำบัด",
  description:
    "ระบบตู้ Kiosk แนวตั้งอัจฉริยะสำหรับคลินิกกายภาพบำบัด เครื่องมือช่วยการฝึก ไม่ใช่การวินิจฉัยโรค",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="h-full w-full overflow-hidden flex flex-col">{children}</body>
    </html>
  );
}
