"use client";

import { useEffect, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import {
  EffectiveLocation,
  getEffectiveLocation,
  isDemoQrSession,
} from "@/lib/effectiveLocation";

export default function DemoLocationBadge() {
  const [isDemo, setIsDemo] = useState(false);
  const [location, setLocation] = useState<EffectiveLocation | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const demoSession = isDemoQrSession();
    setIsDemo(demoSession);
    if (!demoSession) return;

    let active = true;
    void getEffectiveLocation()
      .then((value) => {
        if (active) setLocation(value);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!isDemo) return null;

  const fullLabel = hasError
    ? "Chưa gán vị trí trình diễn"
    : location
      ? `Nhà #${location.buildingId} · ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
      : "Đang lấy vị trí trình diễn…";
  const compactLabel = hasError
    ? "Thiếu vị trí"
    : location
      ? `Nhà #${location.buildingId}`
      : "Đang tải…";

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[10px] font-bold text-amber-200 sm:px-3 sm:text-xs">
      {location ? (
        <Home size={14} aria-hidden="true" />
      ) : hasError ? (
        <Home size={14} aria-hidden="true" />
      ) : (
        <Loader2 className="animate-spin" size={14} aria-hidden="true" />
      )}
      <span className="lg:hidden">{compactLabel}</span>
      <span className="hidden lg:inline">{fullLabel}</span>
    </div>
  );
}
