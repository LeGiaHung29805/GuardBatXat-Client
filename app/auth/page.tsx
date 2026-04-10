"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClient, setAuthToken } from "@/lib/ApiClient"; // QUAN TRỌNG: Import setAuthToken

export default function AuthPage() {
    const router = useRouter();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [formData, setFormData] = useState({
        identifier: "", // Dùng chung cho Đăng nhập
        emailOrPhone: "", // Dùng cho Đăng ký
        password: "",
        fullName: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            if (isLoginMode) {
                // LUỒNG ĐĂNG NHẬP
                const res = await ApiClient.login({
                    identifier: formData.identifier,
                    password: formData.password,
                });

                const token = res.data;

                localStorage.setItem("jwt_token", token);

                setAuthToken(token);
                router.push("/citizen/evacuation");

            } else {
                await ApiClient.register({
                    emailOrPhone: formData.emailOrPhone,
                    password: formData.password,
                    fullName: formData.fullName,
                    roleName: "CITIZEN",
                });

                setSuccessMsg("Đăng ký thành công! Đang chuyển sang Đăng nhập...");
                setTimeout(() => {
                    setIsLoginMode(true);
                    setSuccessMsg("");
                }, 2000);
            }
        } catch (error: any) {
            setErrorMsg(error.message || "Có lỗi xảy ra, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200">
            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
                <h2 className="text-3xl font-bold text-center mb-6 text-emerald-400">
                    {isLoginMode ? "Đăng nhập" : "Tạo tài khoản"}
                </h2>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded mb-4 text-center">
                        {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 text-sm p-3 rounded mb-4 text-center">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginMode && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Họ và tên</label>
                            <input
                                type="text"
                                name="fullName"
                                required
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="VD: Nguyễn Văn A"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Email hoặc Số điện thoại
                        </label>
                        <input
                            type="text"
                            name={isLoginMode ? "identifier" : "emailOrPhone"}
                            required
                            value={isLoginMode ? formData.identifier : formData.emailOrPhone}
                            onChange={handleChange}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="VD: 0987654321"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Mật khẩu</label>
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? "Đang xử lý..." : isLoginMode ? "Đăng nhập" : "Đăng ký"}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-400">
                    {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
                    <button
                        onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setErrorMsg("");
                            setSuccessMsg("");
                        }}
                        className="text-emerald-400 hover:underline focus:outline-none font-medium"
                    >
                        {isLoginMode ? "Đăng ký ngay" : "Đăng nhập tại đây"}
                    </button>
                </div>
            </div>
        </div>
    );
}