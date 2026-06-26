import axios from "axios";
import {
  ApiResponse,
  HeatmapPoint,
  LocationCheckRequest,
  LocationCheckResponse,
  RoutingRequest,
  RoutingResponseData,
  SafeShelterRequest,
  SafeShelterResponseData,
  SosRequest,
  FieldUpdateData,
} from "./Model";

// Gốc của API thiết lập về /api
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Helpers riêng cho heatmap để fallback khi endpoint tổng hợp phía backend lỗi.
const unwrapApiPayload = (payload: any) => {
  if (payload && typeof payload === "object" && payload.code === 200 && "data" in payload) {
    return payload.data;
  }
  return payload;
};

const fetchJsonWithoutInterceptor = async (path: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("jwt_token") || localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  const text = await response.text();
  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload?.message
      ? payload.message
      : text || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return unwrapApiPayload(payload);
};

const findLngLatInGeoJson = (coords: any): [number, number] | null => {
  if (!Array.isArray(coords)) return null;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    return [coords[0], coords[1]];
  }

  for (const child of coords) {
    const found = findLngLatInGeoJson(child);
    if (found) return found;
  }

  return null;
};

const normalizeHeatmapPoints = (payload: any): HeatmapPoint[] => {
  const rows = Array.isArray(payload) ? payload : [];

  return rows
    .map((point: any): HeatmapPoint | null => {
      if (Array.isArray(point)) {
        return [
          Number(point[0]),
          Number(point[1]),
          Number(point[2] ?? 0.5),
        ];
      }

      if (!point || typeof point !== "object") return null;

      if (point.lat !== undefined && point.lng !== undefined) {
        return {
          lat: Number(point.lat),
          lng: Number(point.lng),
          weight: Number(point.weight ?? point.muc_do ?? 0.5),
          severity: point.severity ?? point.risk_severity ?? point.riskStatus,
        };
      }

      if (point.geojson) {
        const geojson = typeof point.geojson === "string"
          ? JSON.parse(point.geojson)
          : point.geojson;
        const lngLat = findLngLatInGeoJson(geojson?.coordinates);

        if (lngLat) {
          return {
            lat: Number(lngLat[1]),
            lng: Number(lngLat[0]),
            weight: Number(point.weight ?? point.muc_do ?? point.combined_score ?? 0.6),
            severity: point.severity ?? point.risk_severity ?? point.riskStatus,
          };
        }
      }

      return null;
    })
    .filter((point): point is HeatmapPoint => {
      const values = Array.isArray(point)
        ? point
        : point
          ? [point.lat, point.lng, point.weight]
          : [];
      return values.every((value) => Number.isFinite(value));
    });
};

// Khởi tạo 1 Axios Instance duy nhất
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Hàm nạp token trực tiếp vào Header để dùng ngay sau khi đăng nhập
export const setAuthToken = (token: string | null) => {
  if (token) {
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
};

// Interceptor: Tự động gắn token vào MỌI request
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("jwt_token") || localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor: Xử lý khi Token hết hạn (401, 403)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("token");
        setAuthToken(null);

        // Chuyển hướng về trang đăng nhập nếu cần
        if (window.location.pathname !== "/auth") {
          window.location.href = '/auth';
        }
      }
    }

    // Xác định error message
    let errorMessage = "Lỗi kết nối máy chủ";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.status === 0 || error.message === "Network Error") {
      errorMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend đang chạy tại http://localhost:8080";
    } else if (error.response?.status >= 500) {
      errorMessage = `Lỗi máy chủ (${error.response.status}): ${error.response?.data?.message || "Vui lòng thử lại sau"}`;
    }

    console.error("[API Error]", {
      status: error.response?.status,
      message: errorMessage,
      url: error.config?.url,
      data: error.response?.data,
    });

    return Promise.reject(new Error(errorMessage));
  },
);

export const ApiClient = {
  // ==========================================
  // --- API XÁC THỰC (AUTH) ---
  // ==========================================
  login: async (data: any): Promise<ApiResponse<string>> => {
    const response = await axiosInstance.post("/v1/auth/login", data);
    return response.data;
  },
  register: async (data: any): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.post("/v1/auth/register", data);
    return response.data;
  },

  // ==========================================
  // --- API QUẢN LÝ TÀI KHOẢN & HỒ SƠ ---
  // ==========================================
  getMyProfile: async (): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.get("/v1/users/me");
    return response.data;
  },
  getMySurvivalProfile: async (): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.get("/v1/users/me/profile");
    return response.data;
  },
  updateMyProfile: async (data: any): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.put("/v1/users/me", data);
    return response.data;
  },
  updateMySurvivalProfile: async (data: any): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.put("/v1/users/me/profile", data);
    return response.data;
  },

  // ==========================================
  // --- CITIZEN & PUBLIC ---
  // ==========================================
  getInitialLandslideData: async (): Promise<HeatmapPoint[]> => {
    try {
      const payload = await fetchJsonWithoutInterceptor("/v1/map/heatmap/landslide");
      const points = normalizeHeatmapPoints(payload);
      if (points.length > 0) return points;
    } catch (error) {
      console.warn(
        "Combined heatmap endpoint failed, falling back to landslide-only heatmap:",
        error,
      );
    }

    const fallbackPayload = await fetchJsonWithoutInterceptor(
      "/v1/commander/dashboard/commander-heatmap-landslide",
    );
    return normalizeHeatmapPoints(fallbackPayload);
  },
  checkSafety: async (
    data: LocationCheckRequest,
  ): Promise<ApiResponse<LocationCheckResponse>> => {
    const response = await axiosInstance.post("/v1/safety/check", data);
    return response.data;
  },
  getSafeRoute: async (
    data: RoutingRequest,
  ): Promise<ApiResponse<RoutingResponseData>> => {
    const response = await axiosInstance.post("/v1/routing/safe-route", data);
    return response.data;
  },

  findSafeShelters: async (
    data: SafeShelterRequest,
  ): Promise<ApiResponse<SafeShelterResponseData>> => {
    const response = await axiosInstance.post(
      "/v1/routing/find-safe-shelter",
      data,
    );
    return response.data;
  },
  sendSosAlert: async (data: SosRequest): Promise<ApiResponse<string>> => {
    const response = await axiosInstance.post("/v1/sos/send", data);
    return response.data;
  },
  getEvacuationRoute: async (data: any) => {
    const response = await axiosInstance.post("/v1/map/evacuation-route", data);
    return response.data;
  },
  triggerBroadcast: async (data: any) => {
    const response = await axiosInstance.post(
      "/v1/map/internal/trigger-broadcast",
      data,
    );
    return response.data;
  },

  // ==========================================
  // --- RESCUE TEAM ---
  // ==========================================
  getRescueSosRequests: async (): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.get("/v1/rescue/sos");
    return response.data;
  },
  acceptRescueSosRequest: async (id: number): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.put(`/v1/rescue/sos/${id}/accept`);
    return response.data;
  },
  completeRescueSosRequest: async (id: number): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.put(`/v1/rescue/sos/${id}/complete`);
    return response.data;
  },
  getSosFieldUpdates: async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.get(`/v1/rescue/sos/${id}/updates`);
    return response.data;
  },
  sendSosFieldUpdate: async (id: string | number, data: any): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.post(`/v1/rescue/sos/${id}/updates`, data);
    return response.data;
  },

  // ==========================================
  // --- ADMIN USERS ---
  // ==========================================
  getAdminUsers: async () => {
    const response = await axiosInstance.get("/admin/users");
    return response.data;
  },
  createUser: async (userData: any) => {
    const response = await axiosInstance.post("/admin/users", userData);
    return response.data;
  },
  updateUser: async (id: number, userData: any) => {
    const response = await axiosInstance.put(`/admin/users/${id}`, userData);
    return response.data;
  },
  toggleUserStatus: async (id: number) => {
    const response = await axiosInstance.put(
      `/admin/users/${id}/toggle-status`,
    );
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await axiosInstance.delete(`/admin/users/${id}`);
    return response.data;
  },

  // ==========================================
  // --- ADMIN SPATIAL (Hạ tầng) ---
  // ==========================================
  getAdminBuildings: async () => {
    const response = await axiosInstance.get("/admin/spatial/buildings");
    return response.data;
  },
  getAdminRoads: async () => {
    const response = await axiosInstance.get("/admin/spatial/roads");
    return response.data;
  },
  createBuilding: async (data: any) => {
    const response = await axiosInstance.post("/admin/spatial/buildings", data);
    return response.data;
  },
  updateBuilding: async (id: number, data: any) => {
    const response = await axiosInstance.put(
      `/admin/spatial/buildings/${id}`,
      data,
    );
    return response.data;
  },
  deleteBuilding: async (id: number) => {
    const response = await axiosInstance.delete(
      `/admin/spatial/buildings/${id}`,
    );
    return response.data;
  },
  createRoad: async (data: any) => {
    const response = await axiosInstance.post("/admin/spatial/roads", data);
    return response.data;
  },

  // ==========================================
  // --- ADMIN AI, SIMULATION & ROUTING ---
  // ==========================================
  updateAHPWeights: async (strategyName: string, weights: any) => {
    const response = await axiosInstance.put(
      `/admin/system/weights/${strategyName}`,
      weights,
    );
    return response.data;
  },
  getSystemModels: async () => {
    const response = await axiosInstance.get("/admin/system/models");
    return response.data;
  },
  activateModel: async (id: number) => {
    const response = await axiosInstance.put(
      `/admin/system/models/${id}/activate`,
    );
    return response.data;
  },
  runFloodSimulation: async (waterLevel: number) => {
    const response = await axiosInstance.post("/admin/simulation/flood", {
      waterLevel,
    });
    return response.data;
  },
  getSimulationStats: async (simulationId: string) => {
    const response = await axiosInstance.get(
      `/admin/simulation/flood/${simulationId}/stats`,
    );
    return response.data;
  },
  getAdminCompareRoute: async (payload: any) => {
    const response = await axiosInstance.post(
      "/admin/routing/compare",
      payload,
    );
    return response.data;
  },
  getSystemHealth: () => axiosInstance.get("/admin/health"),
};
