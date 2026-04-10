"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiClient, setAuthToken } from "@/lib/ApiClient";

export default function ProfilePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    // State lưu thông tin tài khoản cơ bản (Tên, SĐT được phép sửa)
    const [basicInfo, setBasicInfo] = useState({
        fullName: "",
        email: "",
        phoneNumber: "",
        roleName: ""
    });

    // State lưu Hồ sơ sinh tồn
    const [survivalProfile, setSurvivalProfile] = useState({
        totalMembers: 1,
        elderlyCount: 0,
        childrenCount: 0,
        disabledCount: 0,
        emergencyContactName: "",
        emergencyContactPhone: "",
        medicalNotes: "",
        specialAssets: ""
    });

    useEffect(() => {
        const fetchProfileData = async () => {
            const token = localStorage.getItem("jwt_token");
            if (!token) {
                router.push("/auth");
                return;
            }

            try {
                setAuthToken(token);

                // Lúc lấy dữ liệu vẫn phải lấy từ 2 API vì Backend đang tách 2 bảng
                const [basicRes, survivalRes] = await Promise.all([
                    ApiClient.getMyProfile(),
                    ApiClient.getMySurvivalProfile()
                ]);

                if (basicRes.data) {
                    setBasicInfo({
                        fullName: basicRes.data.fullName || "",
                        email: basicRes.data.email || "",
                        phoneNumber: basicRes.data.phoneNumber || "",
                        roleName: basicRes.data.roleName || ""
                    });
                }

                if (survivalRes.data) {
                    setSurvivalProfile({
                        totalMembers: survivalRes.data.totalMembers || 1,
                        elderlyCount: survivalRes.data.elderlyCount || 0,
                        childrenCount: survivalRes.data.childrenCount || 0,
                        disabledCount: survivalRes.data.disabledCount || 0,
                        emergencyContactName: survivalRes.data.emergencyContactName || "",
                        emergencyContactPhone: survivalRes.data.emergencyContactPhone || "",
                        medicalNotes: survivalRes.data.medicalNotes || "",
                        specialAssets: survivalRes.data.specialAssets || ""
                    });
                }
            } catch (error) {
                console.error("Lỗi tải hồ sơ:", error);
                setMessage({ type: "error", text: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." });
                setTimeout(() => {
                    localStorage.removeItem("jwt_token");
                    router.push("/auth");
                }, 2000);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
    }, [router]);

    // Xử lý thay đổi cho Thông tin cơ bản
    const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBasicInfo({ ...basicInfo, [e.target.name]: e.target.value });
    };

    // Xử lý thay đổi cho Hồ sơ sinh tồn
    const handleSurvivalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setSurvivalProfile(prev => ({
            ...prev,
            [name]: type === "number" ? (value === "" ? 0 : parseInt(value)) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: "", text: "" });

        try {
            // ĐÃ SỬA: Gom Tên, SĐT và toàn bộ Hồ sơ sinh tồn vào 1 Object duy nhất
            const payload = {
                fullName: basicInfo.fullName,
                phoneNumber: basicInfo.phoneNumber,
                ...survivalProfile
            };

            // ĐÃ SỬA: Gọi duy nhất 1 API lên Backend
            await ApiClient.updateMySurvivalProfile(payload);

            setMessage({ type: "success", text: "Đã cập nhật toàn bộ hồ sơ thành công!" });

            // Xóa thông báo sau 5 giây và cuộn lên đầu trang
            setTimeout(() => setMessage({ type: "", text: "" }), 5000);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error: any) {
            setMessage({ type: "error", text: error.message || "Có lỗi xảy ra khi lưu hồ sơ." });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // ĐÃ SỬA CSS TẠI ĐÂY: Thêm h-full, w-full, overflow-y-auto và pb-32 để giải quyết triệt để lỗi không cuộn được
    return (
        <div className="min-h-screen h-full w-full bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 text-slate-200 overflow-y-auto pb-32">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-emerald-400">Hồ sơ Cứu hộ Cá nhân</h1>
                    <p className="mt-2 text-slate-400">
                        Thông tin này sẽ được tự động đính kèm khi bạn gửi tín hiệu SOS, giúp đội cứu hộ chuẩn bị phương án tốt nhất.
                    </p>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-md text-center border shadow-lg ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <div className="bg-slate-800 shadow-2xl rounded-2xl overflow-hidden border border-slate-700">
                    <form onSubmit={handleSubmit}>

                        {/* 1. KHU VỰC THÔNG TIN CƠ BẢN (Cho phép sửa Tên và SĐT) */}
                        <div className="px-6 py-6 bg-slate-800/80 border-b border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-emerald-400">Thông tin liên hệ</h3>
                                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                    {basicInfo.roleName}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Họ và tên</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={basicInfo.fullName}
                                        onChange={handleBasicChange}
                                        required
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Số điện thoại</label>
                                    <input
                                        type="text"
                                        name="phoneNumber"
                                        value={basicInfo.phoneNumber}
                                        onChange={handleBasicChange}
                                        placeholder="Chưa cập nhật"
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none text-white"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm text-slate-400 mb-1">Email (Tài khoản đăng nhập - Không thể sửa)</label>
                                    <input
                                        type="email"
                                        value={basicInfo.email || "Không có"}
                                        disabled
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. KHU VỰC HỒ SƠ SINH TỒN */}
                        <div className="px-6 py-8 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-emerald-400 mb-4">Nhân khẩu trong gia đình / Nhóm</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Tổng số người</label>
                                        <input type="number" min="1" name="totalMembers" value={survivalProfile.totalMembers} onChange={handleSurvivalChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Người già (&gt;60t)</label>
                                        <input type="number" min="0" name="elderlyCount" value={survivalProfile.elderlyCount} onChange={handleSurvivalChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Trẻ em (&lt;12t)</label>
                                        <input type="number" min="0" name="childrenCount" value={survivalProfile.childrenCount} onChange={handleSurvivalChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Khuyết tật</label>
                                        <input type="number" min="0" name="disabledCount" value={survivalProfile.disabledCount} onChange={handleSurvivalChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-700" />

                            <div>
                                <h3 className="text-lg font-medium text-emerald-400 mb-4">Liên hệ Khẩn cấp (Ngoài vùng lũ)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Tên người thân</label>
                                        <input type="text" name="emergencyContactName" value={survivalProfile.emergencyContactName} onChange={handleSurvivalChange} placeholder="VD: Chú Hoàng (Hà Nội)" className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">SĐT người thân</label>
                                        <input type="text" name="emergencyContactPhone" value={survivalProfile.emergencyContactPhone} onChange={handleSurvivalChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-700" />

                            <div>
                                <h3 className="text-lg font-medium text-emerald-400 mb-4">Ghi chú Y tế & Đặc biệt</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Tình trạng y tế (Thuốc men, dị ứng, bệnh nền...)</label>
                                        <textarea name="medicalNotes" rows={3} value={survivalProfile.medicalNotes} onChange={handleSurvivalChange} placeholder="VD: Có 1 người bị tiểu đường cần tiêm Insulin, 1 bé bị suyễn..." className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Tài sản cần sơ tán (Gia súc, giấy tờ...)</label>
                                        <textarea name="specialAssets" rows={2} value={survivalProfile.specialAssets} onChange={handleSurvivalChange} placeholder="VD: Có 10 con lợn, hồ sơ bảo hiểm..." className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Nút Submit dính dưới cùng form */}
                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Đang lưu...
                                        </>
                                    ) : "Lưu Toàn Bộ Hồ Sơ"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}