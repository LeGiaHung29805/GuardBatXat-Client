'use client'
import dynamic from 'next/dynamic';

const RealtimeHeatmap = dynamic(() => import('./RealtimeHeatmap'), {
    ssr: false,
    loading: () => (
        <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
                <h2 className="text-xl font-semibold">Đang kết nối hệ thống Vệ tinh & AI...</h2>
            </div>
        </div>
    )
});

export default function HeatmapPage() {
    return (
        <main className="h-screen w-full overflow-hidden">
            <RealtimeHeatmap />
        </main>
    );
}