import { ApiClient } from "@/lib/ApiClient";

export type EffectiveLocationSource = "DEMO_HOME" | "DEVICE_GPS";

export type EffectiveLocation = {
  lat: number;
  lng: number;
  source: EffectiveLocationSource;
  buildingId?: number;
};

type JwtPayload = {
  login_type?: string;
  exp?: number;
};

let cachedDemoToken = "";
let cachedDemoLocation: Promise<EffectiveLocation> | null = null;

const getStoredToken = () => {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("jwt_token") ||
    window.localStorage.getItem("token") ||
    ""
  );
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
        )
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

export const isDemoQrSession = () => {
  const token = getStoredToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  return payload?.login_type === "demo_qr";
};

const getDemoLocation = async (): Promise<EffectiveLocation> => {
  const token = getStoredToken();
  if (!token) throw new Error("Phiên đăng nhập QR không còn hợp lệ.");

  if (cachedDemoToken !== token || !cachedDemoLocation) {
    cachedDemoToken = token;
    cachedDemoLocation = ApiClient.getMyDemoLocation()
      .then((response) => {
        const location = response?.data;
        if (
          typeof location?.latitude !== "number" ||
          typeof location?.longitude !== "number"
        ) {
          throw new Error("Tài khoản chưa được gán ngôi nhà trình diễn.");
        }
        return {
          lat: location.latitude,
          lng: location.longitude,
          source: "DEMO_HOME" as const,
          buildingId: location.buildingId,
        };
      })
      .catch((error) => {
        cachedDemoLocation = null;
        throw error;
      });
  }

  return cachedDemoLocation;
};

const getDeviceLocation = (
  options?: PositionOptions,
): Promise<EffectiveLocation> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Thiết bị không hỗ trợ định vị GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "DEVICE_GPS",
        }),
      reject,
      options,
    );
  });

export const getEffectiveLocation = (options?: PositionOptions) =>
  isDemoQrSession() ? getDemoLocation() : getDeviceLocation(options);

export const watchEffectiveLocation = (
  onLocation: (location: EffectiveLocation) => void,
  onError: (error: Error) => void,
  options?: PositionOptions,
) => {
  if (isDemoQrSession()) {
    let cancelled = false;
    void getDemoLocation()
      .then((location) => {
        if (!cancelled) onLocation(location);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onError(error instanceof Error ? error : new Error("Không lấy được vị trí trình diễn."));
        }
      });
    return () => {
      cancelled = true;
    };
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError(new Error("Thiết bị không hỗ trợ định vị GPS."));
    return () => undefined;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) =>
      onLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        source: "DEVICE_GPS",
      }),
    (error) => onError(new Error(error.message)),
    options,
  );

  return () => navigator.geolocation.clearWatch(watchId);
};
