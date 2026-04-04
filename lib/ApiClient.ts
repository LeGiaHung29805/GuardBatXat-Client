import axios from "axios";
import {
  ApiResponse,
  HeatmapPoint,
  RoutingRequest,
  RoutingResponseData,
  SafeShelterRequest,
  SafeShelterResponseData,
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

    // Đọc dữ liệu JSON trả về (cho dù là 200 OK hay 500 Error thì Spring Boot vẫn trả về JSON nhờ GlobalExceptionHandler)
    let result: any;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error(`Lỗi mạng hoặc Server sập: ${response.statusText}`);
    }

    if (!response.ok) {
      // In toàn bộ cục lỗi ra F12 để chúng ta dễ bắt bệnh
      console.error("Chi tiết lỗi từ Backend:", result);
      // Lấy thêm trường result.error của Spring Boot mặc định
      throw new Error(
        result.message || result.error || "Lỗi xử lý từ máy chủ AI.",
      );
    }
    return result;
  },
  getSafeRoute: async (
    data: RoutingRequest,
  ): Promise<ApiResponse<RoutingResponseData>> => {
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
};
