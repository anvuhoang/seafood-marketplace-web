import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HaiSanExpress - Sàn Thương Mại Điện Tử Hải Sản Tươi Sống",
  description:
    "Kết nối trực tiếp nguồn hải sản tươi ngon từ các vựa uy tín trên toàn quốc. Đặt hàng hỏa tốc trong 2h, cam kết 100% tươi sống.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-white text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
