'use-client'
import Link from 'next/link';

export default function CitizenDashboardPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
            <div className="max-w-4xl w-full">
                {/* Tiêu đề trang */}
                <div className="text-center mb-10 mt-8">
                    <h1 className="text-4xl font-black text-red-700 mb-3 uppercase tracking-wide">
                        Cổng Thông Tin Cứu Hộ Bát Xát
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Lựa chọn dịch vụ hỗ trợ khẩn cấp bên dưới để hệ thống AI đồng hành cùng bạn.
                    </p>
                </div>

                {/* Grid chứa các thẻ điều hướng */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Thẻ 1: Tìm điểm sơ tán */}
                    <Link href="/citizen/evacuation" className="group">
                        <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-red-500 hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <span className="text-red-600 text-2xl">🏃</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Tìm Điểm Sơ Tán</h2>
                            <p className="text-gray-500 text-sm">
                                Quét radar tìm các khu vực trú ẩn an toàn, còn sức chứa và không bị ngập lụt hay sạt lở.
                            </p>
                        </div>
                    </Link>

                    {/* Thẻ 2: Lộ trình an toàn */}
                    <Link href="/citizen/routing" className="group">
                        <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <span className="text-blue-600 text-2xl">🗺️</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Định Vị An Toàn</h2>
                            <p className="text-gray-500 text-sm">
                                Nhập điểm đến mong muốn, AI sẽ tự động vạch ra lộ trình né tránh các vùng thiên tai nguy hiểm.
                            </p>
                        </div>
                    </Link>

                    {/* Thẻ 3: Bản đồ nhiệt */}
                    <Link href="/citizen/heatmap" className="group">
                        <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-amber-500 hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <span className="text-amber-600 text-2xl">🔥</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Bản Đồ Cảnh Báo</h2>
                            <p className="text-gray-500 text-sm">
                                Theo dõi bản đồ nhiệt độ rủi ro Real-time toàn huyện Bát Xát được tổng hợp từ dữ liệu mây và cộng đồng.
                            </p>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}