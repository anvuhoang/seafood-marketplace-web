import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { CartProvider } from "@/features/cart/context/CartContext";

// Designed for Vietnamese diacritics. Weights stop at 700 on purpose, so the
// heavier utility classes used across the UI render at bold rather than black.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

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
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="min-h-screen flex flex-col bg-white text-slate-800 antialiased">
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}