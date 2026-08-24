"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/lib/ApiClient";

export default function RescueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
      if (!token) {
        router.push("/auth");
        return;
      }
      try {
        const profileRes = await ApiClient.getMyProfile();
        const role = profileRes.data?.roleName;
        if (role === "RESCUE_TEAM" || role === "ADMIN" || role === "COMMANDER") {
          setAuthorized(true);
        } else {
          router.push("/");
        }
      } catch (err) {
        router.push("/auth");
      }
    };
    checkAuth();
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}
