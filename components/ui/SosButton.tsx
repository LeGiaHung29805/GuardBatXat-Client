'use client';

import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/ApiClient';
import { SosRequest } from '@/lib/Model';

export default function SosButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [totalPeople, setTotalPeople] = useState<number | ''>(1);
    const [elderlyCount, setElderlyCount] = useState<number | ''>(0);
    const [childrenCount, setChildrenCount] = useState<number | ''>(0);
    const [message, setMessage] = useState('');

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Kiểm tra trạng thái đăng nhập
    useEffect(() => {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
        } else {
            setIsLoggedIn(false);
        }
    }, []);

    const handleSendSos = () => {
        // Validate khách (Guest)
        if (!isLoggedIn) {
            if (!name || !phone) {
                setStatusMsg({ type: 'error', text: 'Vui lòng nhập Họ tên và Số điện thoại!' });
                return;
            }
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
                        // 2. Chuẩn bị payload
                        const payload: SosRequest = {
                            lat: lat,
                            lng: lng,
                            message: message
                        };

                        if (!isLoggedIn) {
                            payload.senderName = name;
                            payload.senderPhone = phone;
                            payload.totalPeople = Number(totalPeople) || 1;
                            payload.elderlyCount = Number(elderlyCount) || 0;
                            payload.childrenCount = Number(childrenCount) || 0;
                        }

                        // 3. Gửi dữ liệu qua API
                        const result = await ApiClient.sendSosAlert(payload);

                        if (result.code === 200) {
                            setStatusMsg({ type: 'success', text: result.data || 'Tín hiệu đã được phát đi!' });
                            // Tự động đóng modal sau 3 giây
                            setTimeout(() => {
                                setIsOpen(false);
                                // Reset form if guest
                                if (!isLoggedIn) {
                                    setName('');
                                    setPhone('');
                                    setMessage('');
                                    setTotalPeople(1);
                                    setElderlyCount(0);
                                    setChildrenCount(0);
                                } else {
                                    setMessage('');
                                }
                            }, 3000);
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
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        {/* Nút tắt Modal */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-black text-red-600 mb-2 text-center">BÁO ĐỘNG KHẨN CẤP</h2>

                        {isLoggedIn ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-blue-800 font-medium text-center">
                                    Hệ thống đã nhận diện được bạn. Thông tin gia đình và vị trí GPS sẽ tự động gửi đi.
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 text-center mb-6">
                                Hệ thống sẽ đính kèm tọa độ GPS hiện tại. Xin vui lòng điền thông tin để đội cứu hộ chuẩn bị.
                            </p>
                        )}

                        <div className="space-y-4">
                            {!isLoggedIn && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Nhập tên của bạn..."
                                            className="w-full p-3 border border-black-300 text-black rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại liên hệ <span className="text-red-500">*</span></label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Nhập số điện thoại..."
                                            className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1" title="Tổng số người đang gặp nạn">Tổng số người</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={totalPeople}
                                                onChange={(e) => setTotalPeople(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full p-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1" title="Số lượng người già (>65 tuổi)">Người già</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={elderlyCount}
                                                onChange={(e) => setElderlyCount(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full p-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1" title="Số lượng trẻ em (<12 tuổi)">Trẻ em</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={childrenCount}
                                                onChange={(e) => setChildrenCount(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full p-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-center"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Lời nhắn / Tình trạng (Tùy chọn)</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ví dụ: Cần cano cứu hộ gấp, nước ngập ngang ngực..."
                                    rows={isLoggedIn ? 4 : 2}
                                    className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
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
                                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-black text-lg rounded-xl shadow-lg transition-all uppercase tracking-wide mt-2"
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