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
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true" || true;

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
          // window.location.href = '/auth';
        }
      }
    }
    const errorMessage = error.response?.data?.message || "Lỗi kết nối máy chủ";
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
    const response = await axiosInstance.get("/v1/map/heatmap/landslide");
    return response.data;
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
