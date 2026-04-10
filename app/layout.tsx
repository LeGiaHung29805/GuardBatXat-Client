import "./globals.css"; // File css của Next.js
import GlobalUI from "@/components/ui/GlobalUI";

export const metadata = {
  title: "Guard Bat Xat - Hệ Thống Cảnh Báo",
  description: "Bản đồ cảnh báo và sơ tán thiên tai Huyện Bát Xát",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-200">

        {/* Bộ khung chính của Website */}
        <main className="relative min-h-screen">
          {children}
        </main>

        {/* Nơi chứa nút Đăng nhập góc trên, Modal Đăng ký, và Nút SOS góc dưới */}
        <GlobalUI />

      </body>
    </html>
  );
}