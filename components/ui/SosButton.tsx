'use client';

import { useState } from 'react';
import { ApiClient } from '@/lib/ApiClient';

export default function SosButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleSendSos = () => {
        if (!phone) {
            setStatusMsg({ type: 'error', text: 'Vui lòng nhập số điện thoại để cứu hộ liên lạc!' });
            return;
        }

        setLoading(true);
        setStatusMsg(null);

        // 1. Lấy vị trí GPS của người dùng
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    try {
                        // 2. Gửi dữ liệu qua API
                        const result = await ApiClient.sendSosAlert({
                            senderPhone: phone,
                            message: message,
                            lat: lat,
                            lng: lng
                        });

                        if (result.code === 200) {
                            setStatusMsg({ type: 'success', text: result.data || 'Tín hiệu đã được phát đi!' });
                            // Tự động đóng modal sau 3 giây
                            setTimeout(() => setIsOpen(false), 3000);
                        }
                    } catch (error: any) {
                        setStatusMsg({ type: 'error', text: error.message });
                    } finally {
                        setLoading(false);
                    }
                },
                (error) => {
                    setStatusMsg({ type: 'error', text: 'Không thể lấy định vị GPS. Hãy bật Vị trí (Location) trên thiết bị!' });
                    setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setStatusMsg({ type: 'error', text: 'Trình duyệt không hỗ trợ định vị GPS.' });
            setLoading(false);
        }
    };

    return (
        <>
            {/* NÚT BẤM SOS NỔI (LUÔN Ở GÓC DƯỚI BÊN PHẢI) */}
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-red-600 rounded-full shadow-2xl flex items-center justify-center border-4 border-white animate-bounce hover:bg-red-700 transition-colors"
                title="Gửi tín hiệu cấp cứu khẩn cấp"
            >
                <span className="text-white font-black text-xl tracking-widest">SOS</span>
                {/* Vòng tròn đập nhịp tim bao quanh nút */}
                <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></div>
            </button>

            {/* MODAL NHẬP THÔNG TIN (Hiện lên khi bấm nút) */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        {/* Nút tắt Modal */}
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-black text-red-600 mb-2 text-center">BÁO ĐỘNG KHẨN CẤP</h2>
                        <p className="text-sm text-gray-600 text-center mb-6">
                            Hệ thống sẽ đính kèm tọa độ GPS hiện tại của bạn và gửi thẳng về trung tâm chỉ huy.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại liên hệ <span className="text-red-500">*</span></label>
                                <input 
                                    type="tel" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Nhập số điện thoại..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Lời nhắn / Tình trạng (Tùy chọn)</label>
                                <textarea 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ví dụ: Có 3 người mắc kẹt trên mái nhà, cần cano..."
                                    rows={3}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                />
                            </div>

                            {/* Hiển thị thông báo trạng thái */}
                            {statusMsg && (
                                <div className={`p-3 rounded-lg text-sm font-bold ${statusMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {statusMsg.text}
                                </div>
                            )}

                            <button 
                                onClick={handleSendSos}
                                disabled={loading}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-black text-lg rounded-xl shadow-lg transition-all uppercase tracking-wide"
                            >
                                {loading ? 'Đang định vị & Gửi...' : 'GỬI TÍN HIỆU NGAY'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}