'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertTriangle, Shield, MapIcon } from 'lucide-react';
import SosButton from '@/components/ui/SosButton';

// Dynamic import cho component chứa bản đồ - QUAN TRỌNG: ssr: false
const BatXatBoundaryMap = dynamic(
  () => import('@/components/ui/BatXatBoundaryMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-full bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Đang tải bản đồ...</span>
      </div>
    )
  }
);

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl">GuardBatXat</h1>
              <p className="text-xs text-red-100">Hệ thống cảnh báo sạt lở & cứu hộ thông minh</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/rescue"
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Đội cứu hộ</span>
            </Link>
            
            <Link
              href="/citizen"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <MapIcon className="h-4 w-4" />
              <span className="text-sm">Người dân</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Map Container - sử dụng component đã dynamic import */}
      <div className="flex-1 relative">
        <BatXatBoundaryMap />
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-2 px-4 text-xs flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <span>📡 Dữ liệu từ trạm quan trắc</span>
          <span>🤖 AI dự báo rủi ro</span>
          <span>🆘 Cứu hộ 24/7</span>
        </div>
        <div>
          <span>© 2024 GuardBatXat - Bát Xát, Lào Cai</span>
        </div>
      </footer>

      {/* Nút SOS nổi */}
      <SosButton />
    </div>
  );
}