import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar (Thanh menu trái) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-6 text-center border-b border-slate-800">
          <h1 className="text-2xl font-extrabold tracking-widest text-blue-400">
            GUARD<span className="text-white">BATXAT</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Admin Control Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/admin"
            className="block px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-md"
          >
            🎛️ Bảng điều khiển chung
          </Link>
          <Link
            href="/citizen/heatmap"
            target="_blank"
            className="block px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg font-medium transition"
          >
            🌍 Bản đồ Ngập lụt (Live)
          </Link>
          <Link
            href="/citizen/routing"
            target="_blank"
            className="block px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg font-medium transition"
          >
            🗺️ Bản đồ Tìm đường
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 text-sm text-slate-400 text-center">
          Phiên bản NCKH v1.0
        </div>
      </aside>

      {/* Khu vực Nội dung chính */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
