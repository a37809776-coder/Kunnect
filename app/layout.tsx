import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "플랜트커넥트",
  description: "원예테라피 이후에도 식물과 마음을 이어가는 화분 친구",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#5f8d5e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
