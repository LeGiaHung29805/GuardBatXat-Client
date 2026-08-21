"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Clipboard,
  Download,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { ApiClient } from "@/lib/ApiClient";

type AdminUser = {
  userId: number;
  username: string;
  fullName?: string;
  phoneNumber?: string;
  roleName?: string;
  isActive?: boolean;
  defaultBuildingId?: number;
};

type AssignedLocation = {
  buildingId: number;
  latitude: number;
  longitude: number;
  source: "DEMO_HOME";
};

type LocationDraft = {
  latitude: string;
  longitude: string;
};

type GeneratedInvite = {
  identifier: string;
  fullName: string;
  expiresAt: string;
  loginUrl: string;
  qrDataUrl: string;
  location: AssignedLocation;
};

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

export default function AdminQrLoginPage() {
  const [citizens, setCitizens] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [ttlMinutes, setTtlMinutes] = useState(120);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [generated, setGenerated] = useState<GeneratedInvite[]>([]);
  const [locations, setLocations] = useState<Record<number, AssignedLocation>>({});
  const [locationDrafts, setLocationDrafts] = useState<Record<number, LocationDraft>>({});
  const [savingLocationFor, setSavingLocationFor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedIdentifier, setCopiedIdentifier] = useState("");

  useEffect(() => {
    setPublicBaseUrl(window.location.origin);

    const loadCitizens = async () => {
      try {
        const response = await ApiClient.getAdminUsers();
        const users = Array.isArray(response.data) ? response.data : [];
        const activeCitizens = users.filter(
          (user: AdminUser) =>
            user.roleName === "CITIZEN" && user.isActive !== false,
        );

        const assignedUsers = activeCitizens.filter(
          (user: AdminUser) => Boolean(user.defaultBuildingId),
        );
        const locationResults = await Promise.all(
          assignedUsers.map(async (user: AdminUser) => {
            try {
              const locationResponse = await ApiClient.getAdminDemoLocation(
                user.userId,
              );
              return [user.userId, locationResponse.data] as const;
            } catch {
              return null;
            }
          }),
        );
        const loadedLocations: Record<number, AssignedLocation> = {};
        const loadedDrafts: Record<number, LocationDraft> = {};
        locationResults.forEach((entry) => {
          if (!entry) return;
          const [userId, location] = entry;
          loadedLocations[userId] = location;
          loadedDrafts[userId] = {
            latitude: String(location.latitude),
            longitude: String(location.longitude),
          };
        });
        setCitizens(activeCitizens);
        setLocations(loadedLocations);
        setLocationDrafts(loadedDrafts);
        setSelected(
          activeCitizens
            .filter(
              (user: AdminUser) =>
                user.username.toLowerCase().startsWith("teacher") &&
                Boolean(loadedLocations[user.userId]),
            )
            .map((user: AdminUser) => user.username),
        );
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải danh sách Citizen.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCitizens();
  }, []);

  const assignableCitizens = useMemo(
    () => citizens.filter((user) => Boolean(locations[user.userId])),
    [citizens, locations],
  );

  const allSelected = useMemo(
    () =>
      assignableCitizens.length > 0 &&
      selected.length === assignableCitizens.length,
    [assignableCitizens.length, selected.length],
  );

  const toggleCitizen = (identifier: string) => {
    const account = citizens.find((user) => user.username === identifier);
    if (!account || !locations[account.userId]) {
      setError("Hãy gán tọa độ ngôi nhà cho tài khoản trước khi chọn tạo QR.");
      return;
    }
    setSelected((current) =>
      current.includes(identifier)
        ? current.filter((value) => value !== identifier)
        : [...current, identifier],
    );
  };

  const toggleAll = () => {
    setSelected(
      allSelected ? [] : assignableCitizens.map((user) => user.username),
    );
  };

  const updateLocationDraft = (
    userId: number,
    field: keyof LocationDraft,
    value: string,
  ) => {
    setLocationDrafts((current) => ({
      ...current,
      [userId]: {
        latitude: current[userId]?.latitude || "",
        longitude: current[userId]?.longitude || "",
        [field]: value,
      },
    }));
  };

  const saveDemoLocation = async (user: AdminUser) => {
    const draft = locationDrafts[user.userId];
    const latitude = Number(draft?.latitude);
    const longitude = Number(draft?.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(`Tọa độ của ${user.username} không hợp lệ.`);
      return;
    }

    setError("");
    setSavingLocationFor(user.userId);
    try {
      const response = await ApiClient.assignAdminDemoLocation(
        user.userId,
        latitude,
        longitude,
      );
      const assigned = response.data as AssignedLocation;
      setLocations((current) => ({ ...current, [user.userId]: assigned }));
      setLocationDrafts((current) => ({
        ...current,
        [user.userId]: {
          latitude: String(assigned.latitude),
          longitude: String(assigned.longitude),
        },
      }));
      setCitizens((current) =>
        current.map((account) =>
          account.userId === user.userId
            ? { ...account, defaultBuildingId: assigned.buildingId }
            : account,
        ),
      );
      setGenerated([]);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : `Không thể gán tọa độ cho ${user.username}.`,
      );
    } finally {
      setSavingLocationFor(null);
    }
  };

  const validateBaseUrl = () => {
    const normalized = normalizeBaseUrl(publicBaseUrl);
    const parsed = new URL(normalized);

    if (
      parsed.protocol !== "https:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    ) {
      throw new Error("URL công khai phải sử dụng HTTPS.");
    }

    return normalized;
  };

  const generateQrCodes = async () => {
    if (selected.length === 0) {
      setError("Hãy chọn ít nhất một tài khoản Citizen.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const baseUrl = validateBaseUrl();
      const results: GeneratedInvite[] = [];

      for (const identifier of selected) {
        const account = citizens.find((user) => user.username === identifier);
        if (!account) {
          throw new Error(`Không tìm thấy tài khoản ${identifier}.`);
        }
        const location = locations[account.userId];
        if (!location) {
          throw new Error(`Hãy lưu tọa độ ngôi nhà cho ${identifier} trước.`);
        }

        const response = await ApiClient.createDemoInvite(identifier, ttlMinutes);
        const invite = response.data;

        if (!invite?.token || !invite?.expiresAt) {
          throw new Error(`Không nhận được token cho ${identifier}.`);
        }

        const loginUrl = `${baseUrl}/demo-login#t=${encodeURIComponent(invite.token)}`;
        const qrDataUrl = await QRCode.toDataURL(loginUrl, {
          errorCorrectionLevel: "H",
          margin: 3,
          width: 420,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        results.push({
          identifier,
          fullName: account?.fullName || identifier,
          expiresAt: invite.expiresAt,
          loginUrl,
          qrDataUrl,
          location,
        });
      }

      setGenerated(results);
    } catch (generateError: unknown) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Không thể tạo mã QR.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQr = (invite: GeneratedInvite) => {
    const anchor = document.createElement("a");
    anchor.href = invite.qrDataUrl;
    anchor.download = `qr-${invite.identifier.replace(/[^a-zA-Z0-9_-]/g, "-")}.png`;
    anchor.click();
  };

  const copyLink = async (invite: GeneratedInvite) => {
    await navigator.clipboard.writeText(invite.loginUrl);
    setCopiedIdentifier(invite.identifier);
    window.setTimeout(() => setCopiedIdentifier(""), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-200">
            <QrCode size={28} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              QR đăng nhập trải nghiệm
            </h1>
            <p className="mt-2 max-w-3xl text-slate-500">
              Cấp mã dùng một lần cho tài khoản Citizen. Tạo mã mới cho một tài khoản sẽ làm mã cũ mất hiệu lực.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              URL ngrok công khai
            </span>
            <input
              type="url"
              value={publicBaseUrl}
              onChange={(event) => setPublicBaseUrl(event.target.value)}
              placeholder="https://your-domain.ngrok-free.app"
              className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-2 block text-sm text-slate-500">
              Nếu đang mở Admin bằng localhost, hãy thay bằng URL HTTPS của ngrok trước khi tạo QR.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Hiệu lực QR (phút)
            </span>
            <input
              type="number"
              min={5}
              max={1440}
              value={ttlMinutes}
              onChange={(event) => setTtlMinutes(Number(event.target.value))}
              className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Chọn tài khoản Citizen</h2>
            <p className="mt-1 text-sm text-slate-500">
              Đã chọn {selected.length}/{assignableCitizens.length} tài khoản đã gán nhà
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={toggleAll}
              disabled={isLoading || assignableCitizens.length === 0}
              className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            <button
              type="button"
              onClick={generateQrCodes}
              disabled={isLoading || isGenerating || selected.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" size={19} aria-hidden="true" />
              ) : (
                <RefreshCw size={19} aria-hidden="true" />
              )}
              {isGenerating ? "Đang tạo QR…" : "Tạo QR đã chọn"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 p-16 text-slate-500">
            <Loader2 className="animate-spin" size={24} aria-hidden="true" />
            Đang tải tài khoản…
          </div>
        ) : citizens.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            Chưa có tài khoản Citizen đang hoạt động.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {citizens.map((user) => {
              const assignedLocation = locations[user.userId];
              const draft = locationDrafts[user.userId] || {
                latitude: "",
                longitude: "",
              };
              const hasAssignedHome = Boolean(assignedLocation);

              return (
                <div
                  key={user.userId}
                  className="grid gap-4 px-6 py-5 transition hover:bg-slate-50 lg:grid-cols-[minmax(220px,1fr)_minmax(360px,1.5fr)] lg:items-center"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${user.username} để tạo QR`}
                      checked={selected.includes(user.username)}
                      onChange={() => toggleCitizen(user.username)}
                      disabled={!hasAssignedHome}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-slate-900">
                        {user.fullName || "Chưa có họ tên"}
                      </div>
                      <div className="mt-1 break-all text-sm text-slate-500">
                        {user.username}
                        {user.phoneNumber ? ` · ${user.phoneNumber}` : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                          <ShieldCheck size={12} aria-hidden="true" /> Citizen
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                            hasAssignedHome
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          <MapPin size={12} aria-hidden="true" />
                          {assignedLocation
                            ? `Nhà #${assignedLocation.buildingId}`
                            : "Chưa gán nhà"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <label className="block">
                        <span className="sr-only">Vĩ độ cho {user.username}</span>
                        <input
                          type="number"
                          step="any"
                          value={draft.latitude}
                          onChange={(event) =>
                            updateLocationDraft(
                              user.userId,
                              "latitude",
                              event.target.value,
                            )
                          }
                          placeholder="Vĩ độ, ví dụ 22.5458"
                          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Kinh độ cho {user.username}</span>
                        <input
                          type="number"
                          step="any"
                          value={draft.longitude}
                          onChange={(event) =>
                            updateLocationDraft(
                              user.userId,
                              "longitude",
                              event.target.value,
                            )
                          }
                          placeholder="Kinh độ, ví dụ 103.8895"
                          className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveDemoLocation(user)}
                        disabled={savingLocationFor === user.userId}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                      >
                        {savingLocationFor === user.userId ? (
                          <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                        ) : (
                          <Save size={17} aria-hidden="true" />
                        )}
                        Gán nhà
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {assignedLocation
                        ? `Điểm trong nhà: ${assignedLocation.latitude.toFixed(6)}, ${assignedLocation.longitude.toFixed(6)}`
                        : "Nhập tọa độ; hệ thống sẽ tự chọn ngôi nhà gần nhất."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {generated.length > 0 && (
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-black text-slate-900">Mã QR vừa tạo</h2>
            <p className="mt-1 text-slate-500">
              Hãy tải xuống ngay; token gốc không được lưu để xem lại sau khi rời trang.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {generated.map((invite, index) => (
              <article
                key={invite.identifier}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 p-5">
                  <div className="text-xs font-black uppercase tracking-widest text-blue-600">
                    Thẻ trải nghiệm {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-2 text-xl font-black text-slate-900">
                    {invite.fullName}
                  </h3>
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {invite.identifier}
                  </p>
                </div>

                <div className="p-5 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={invite.qrDataUrl}
                    alt={`Mã QR đăng nhập cho ${invite.fullName}`}
                    className="mx-auto aspect-square w-full max-w-72 rounded-2xl border border-slate-200 bg-white"
                  />
                  <p className="mt-4 text-sm text-slate-500">
                    Hết hạn: {new Date(invite.expiresAt).toLocaleString("vi-VN")}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                    <MapPin size={14} aria-hidden="true" /> Nhà #{invite.location.buildingId} · {invite.location.latitude.toFixed(5)}, {invite.location.longitude.toFixed(5)}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => downloadQr(invite)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 font-bold text-white transition hover:bg-black"
                    >
                      <Download size={17} aria-hidden="true" /> Tải PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyLink(invite)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      {copiedIdentifier === invite.identifier ? (
                        <Check size={17} aria-hidden="true" />
                      ) : (
                        <Clipboard size={17} aria-hidden="true" />
                      )}
                      {copiedIdentifier === invite.identifier ? "Đã chép" : "Chép link"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
