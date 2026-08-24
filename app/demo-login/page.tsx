"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { ApiClient, setAuthToken } from "@/lib/ApiClient";

type LoginState = "loading" | "error";

export default function DemoLoginPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [state, setState] = useState<LoginState>("loading");
  const [message, setMessage] = useState(
    "Đang xác thực mã trải nghiệm và tải Hồ sơ Cứu hộ của bạn…",
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const exchangeToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const token = hashParams.get("t");

      // Xóa token khỏi thanh địa chỉ và lịch sử ngay sau khi đọc.
      window.history.replaceState({}, "", window.location.pathname);

      if (!token) {
        setState("error");
        setMessage("Mã QR không hợp lệ hoặc không có mã đăng nhập.");
        return;
      }

      try {
        const response = await ApiClient.demoLogin(token);
        const jwt = response.data;

        if (!jwt) {
          throw new Error("Máy chủ không trả về phiên đăng nhập.");
        }

        localStorage.setItem("jwt_token", jwt);
        localStorage.setItem("token", jwt);
        setAuthToken(jwt);

        setMessage("Xác thực thành công. Đang mở Hồ sơ Cứu hộ cá nhân…");
        router.replace("/citizen/profile");
      } catch (error: unknown) {
        setAuthToken(null);
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("token");
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Mã QR đã hết hạn hoặc đã được sử dụng.",
        );
      }
    };

    void exchangeToken();
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${
            state === "loading"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {state === "loading" ? (
            <ShieldCheck size={42} aria-hidden="true" />
          ) : (
            <CircleAlert size={42} aria-hidden="true" />
          )}
        </div>

        <h1 className="text-2xl font-black text-white">
          {state === "loading" ? "Đăng nhập trải nghiệm" : "Không thể đăng nhập"}
        </h1>
        <p className="mt-3 leading-7 text-slate-400">{message}</p>

        {state === "loading" ? (
          <div className="mt-8 flex items-center justify-center gap-3 text-sm font-bold text-emerald-400">
            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
            Vui lòng giữ nguyên trang
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-slate-500">
              Mỗi mã chỉ dùng được một lần. Hãy liên hệ quản trị viên để cấp mã mới.
            </p>
            <Link
              href="/auth"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-800 px-5 py-3 font-bold text-white transition hover:bg-slate-700"
            >
              Đăng nhập bằng tài khoản
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
