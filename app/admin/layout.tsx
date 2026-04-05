import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navLinkClass =
    "block px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl font-semibold transition-all duration-200 hover:translate-x-2";

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 text-center border-b border-slate-800">
          <Link href="/admin">
            <h1 className="text-2xl font-black tracking-tighter text-blue-400 cursor-pointer hover:text-blue-300 transition">
              GUARD<span className="text-white">BATXAT</span>
            </h1>
          </Link>
          <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-widest">
            Hệ thống điều hành PCTT
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-black text-slate-600 px-4 py-2 uppercase tracking-wider">
            Hạ tầng và Dữ liệu
          </div>
          <Link href="/admin/users" className={navLinkClass}>
            Tài khoản & Role
          </Link>
          <Link href="/admin/buildings" className={navLinkClass}>
            Quản lý Nhà cửa
          </Link>
          <Link href="/admin/roads" className={navLinkClass}>
            Mạng lưới Đường
          </Link>

          <div className="text-[10px] font-black text-slate-600 px-4 py-2 mt-4 uppercase tracking-wider">
            AI
          </div>
          <Link href="/admin/ai-config" className={navLinkClass}>
            Cấu hình AI
          </Link>
          <Link href="/admin/simulation" className={navLinkClass}>
            Giả lập ngập lụt
          </Link>

          <div className="text-[10px] font-black text-slate-600 px-4 py-2 mt-4 uppercase tracking-wider">
            Giám sát
          </div>
          <Link
            href="/admin/routing"
            className="block px-4 py-3 text-blue-400 hover:bg-slate-800 rounded-xl font-bold transition-all"
          >
            Kiểm chứng lộ trình
          </Link>
        </nav>
        <div className="p-6 border-t border-slate-800 text-[10px] text-slate-500 text-center italic">
          NCKH 2026
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
