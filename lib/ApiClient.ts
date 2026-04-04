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
} from "./Model";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  // const token = localStorage.getItem('token');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// TẬP HỢP TOÀN BỘ API CỦA HỆ THỐNG
export const ApiClient = {
  // --- API BẢN ĐỒ NHIỆT ---
  getInitialLandslideData: async (): Promise<HeatmapPoint[]> => {
    try {
      const response = await axiosInstance.get<HeatmapPoint[]>(
        "/map/heatmap/landslide",
      );
      return response.data;
    } catch (error) {
      console.error("Lỗi lấy dữ liệu Heatmap:", error);
      throw error;
    }
  },

  /**
   * API gọi sang Spring Boot để AI dò tìm Top 3 điểm sơ tán
   */
  findSafeShelters: async (
    data: SafeShelterRequest,
  ): Promise<ApiResponse<SafeShelterResponseData>> => {
    const response = await fetch(`${API_BASE_URL}/routing/find-safe-shelter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    let result: any;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error(`Lỗi mạng hoặc Server sập: ${response.statusText}`);
    }

    if (!response.ok) {
      console.error("Chi tiết lỗi từ Backend:", result);
      throw new Error(
        result.message || result.error || "Lỗi xử lý từ máy chủ AI.",
      );
    }
    return result;
  },

  /**
   * API Tìm đường đi an toàn
   */
  getSafeRoute: async (
    data: RoutingRequest,
  ): Promise<ApiResponse<RoutingResponseData>> => {
    // Đã fix cứng URL chọc đúng vào API admin của Spring Boot
    const response = await fetch(
      "http://localhost:8080/api/admin/routing/safety",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    let result: any;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error(`Lỗi mạng hoặc Server sập: ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(
        result.message || result.error || "Lỗi xử lý AI khi tìm đường.",
      );
    }

    return result;
  },

  /**
   * API Gửi tín hiệu cấp cứu SOS
   */
  sendSosAlert: async (data: SosRequest): Promise<ApiResponse<string>> => {
    const response = await fetch(`${API_BASE_URL}/sos/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    let result: any;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error(`Lỗi mạng hoặc Server sập: ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
          result.error ||
          "Không thể gửi tín hiệu SOS. Vui lòng gọi điện trực tiếp!",
      );
    }

    return result;
  },

  /**
   * API Kiểm tra an toàn vị trí hiện tại
   */
  checkSafety: async (
    data: LocationCheckRequest,
  ): Promise<ApiResponse<LocationCheckResponse>> => {
    const response = await fetch(`${API_BASE_URL}/safety/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Lỗi kiểm tra an toàn");
    return result;
  },
};
