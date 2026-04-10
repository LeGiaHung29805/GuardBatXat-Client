// lib/ApiClient.ts
import axios from 'axios';
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
  FieldUpdateData  // ← THÊM DÒNG NÀY
} from './Model';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || true;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  // const token = localStorage.getItem('token');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============= MOCK DATA =============
const mockHeatmapData: HeatmapPoint[] = [
  [22.6105, 103.8012, 0.8],
  [22.615, 103.805, 0.6],
  [22.608, 103.798, 0.9],
  [22.612, 103.802, 0.7],
  [22.618, 103.808, 0.5],
  [22.605, 103.795, 0.85],
  [22.62, 103.81, 0.4],
  [22.6, 103.79, 0.75],
  [22.614, 103.8, 0.65],
  [22.607, 103.803, 0.72],
];

const mockSafeShelters: ApiResponse<SafeShelterResponseData> = {
  code: 200,
  message: "Success",
  data: {
    shelters: [
      {
        id: "shelter_001",
        name: "Trường THCS Trịnh Tường",
        address: "Xã Trịnh Tường, Bát Xát",
        lat: 22.618,
        lng: 103.805,
        available_capacity: 150,
        distance_km: 2.3,
        estimated_time_min: 15,
        safety_score: 95,
        route_coordinates: [[22.6105, 103.8012], [22.612, 103.802], [22.615, 103.804], [22.618, 103.805]]
      },
      {
        id: "shelter_002",
        name: "UBND Xã Bản Qua",
        address: "Xã Bản Qua, Bát Xát",
        lat: 22.605,
        lng: 103.798,
        available_capacity: 80,
        distance_km: 3.1,
        estimated_time_min: 20,
        safety_score: 88,
        route_coordinates: [[22.6105, 103.8012], [22.608, 103.8], [22.606, 103.799], [22.605, 103.798]]
      },
      {
        id: "shelter_003",
        name: "Nhà Văn hóa Thôn Nậm Pung",
        address: "Thôn Nậm Pung, Trịnh Tường",
        lat: 22.622,
        lng: 103.81,
        available_capacity: 50,
        distance_km: 4.5,
        estimated_time_min: 28,
        safety_score: 82,
        route_coordinates: [[22.6105, 103.8012], [22.615, 103.805], [22.618, 103.808], [22.622, 103.81]]
      }
    ]
  }
};

const mockSafeRoute: ApiResponse<RoutingResponseData> = {
  code: 200,
  message: "Success",
  data: {
    path: [[22.6105, 103.8012], [22.612, 103.802], [22.615, 103.804], [22.618, 103.805]],
    distance_km: 2.3,
    duration_min: 15,
    safety_score: 92,
    warnings: [
      { segment: "Đoạn qua đèo", risk: "medium", message: "Chú ý quan sát, đường trơn trượt" }
    ]
  }
};

const mockSosResponse: ApiResponse<string> = {
  code: 200,
  message: "Success",
  data: "Tín hiệu SOS đã được gửi đến trung tâm cứu hộ"
};

const mockSafetyCheck: ApiResponse<LocationCheckResponse> = {
  code: 200,
  message: "Success",
  data: {
    is_safe: false,
    risk_level: "high",
    warnings: ["Nguy cơ lũ quét cao", "Khu vực đang có mưa lớn"],
    nearest_shelter: {
      id: "shelter_001",
      name: "Trường THCS Trịnh Tường",
      distance_km: 1.5
    }
  }
};

// Mock data cho field update
const mockFieldUpdateResponse = {
  code: 200,
  status: "success",
  data: "Đã gửi cập nhật thành công"
};

// Helper function để gọi API với fallback mock
async function callWithMock<T>(
  apiCall: () => Promise<T>,
  mockData: T,
  endpointName: string
): Promise<T> {
  if (USE_MOCK) {
    console.log(`[MOCK] ${endpointName} - using mock data`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockData;
  }

  try {
    return await apiCall();
  } catch (error) {
    console.error(`[API Error] ${endpointName}:`, error);
    console.warn(`[FALLBACK] ${endpointName} - using mock data`);
    return mockData;
  }
}

// TẬP HỢP TOÀN BỘ API CỦA HỆ THỐNG
export const ApiClient = {

  // --- API BẢN ĐỒ NHIỆT ---
  getInitialLandslideData: async (): Promise<HeatmapPoint[]> => {
    return callWithMock(
      async () => {
        const response = await axiosInstance.get<HeatmapPoint[]>('/map/heatmap/landslide');
        return response.data;
      },
      mockHeatmapData,
      'getInitialLandslideData'
    );
  },

  /**
   * API gọi sang Spring Boot để AI dò tìm Top 3 điểm sơ tán
   */
  findSafeShelters: async (data: SafeShelterRequest): Promise<ApiResponse<SafeShelterResponseData>> => {
    return callWithMock(
      async () => {
        const response = await fetch(`${API_BASE_URL}/routing/find-safe-shelter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
          throw new Error(result.message || result.error || "Lỗi xử lý từ máy chủ AI.");
        }
        return result;
      },
      mockSafeShelters,
      'findSafeShelters'
    );
  },

  getSafeRoute: async (data: RoutingRequest): Promise<ApiResponse<RoutingResponseData>> => {
    return callWithMock(
      async () => {
        const response = await fetch(`${API_BASE_URL}/routing/safe-route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        let result: any;
        try {
          result = await response.json();
        } catch (e) {
          throw new Error(`Lỗi mạng hoặc Server sập: ${response.statusText}`);
        }

        if (!response.ok) {
          throw new Error(result.message || result.error || "Lỗi xử lý AI khi tìm đường.");
        }

        return result;
      },
      mockSafeRoute,
      'getSafeRoute'
    );
  },

  /**
   * API Gửi tín hiệu cấp cứu SOS
   */
  sendSosAlert: async (data: SosRequest): Promise<ApiResponse<string>> => {
    return callWithMock(
      async () => {
        const response = await fetch(`${API_BASE_URL}/sos/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        let result: any;
        try {
          result = await response.json();
        } catch (e) {
          throw new Error(`Lỗi mạng hoặc Server sập: ${response.statusText}`);
        }

        if (!response.ok) {
          throw new Error(result.message || result.error || "Không thể gửi tín hiệu SOS. Vui lòng gọi điện trực tiếp!");
        }

        return result;
      },
      mockSosResponse,
      'sendSosAlert'
    );
  },

  checkSafety: async (data: LocationCheckRequest): Promise<ApiResponse<LocationCheckResponse>> => {
    return callWithMock(
      async () => {
        const response = await fetch(`${API_BASE_URL}/safety/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Lỗi kiểm tra an toàn");
        return result;
      },
      mockSafetyCheck,
      'checkSafety'
    );
  },

  // ============= API CẬP NHẬT HIỆN TRƯỜNG =============

  // Gửi cập nhật hiện trường
  sendFieldUpdate: async (data: {
    missionId: string;
    status: string;
    message: string;
    images?: string[];
    lat?: number;
    lng?: number;
  }): Promise<ApiResponse<string>> => {
    return callWithMock(
      async () => {
        const response = await fetch(`${API_BASE_URL}/rescue/field-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Lỗi gửi cập nhật");
        return result;
      },
      mockFieldUpdateResponse,
      'sendFieldUpdate'
    );
  },

  // Lấy lịch sử cập nhật của nhiệm vụ
  getMissionUpdates: async (missionId: string): Promise<FieldUpdateData[]> => {
    return callWithMock(
      async () => {
        const response = await fetch(`${API_BASE_URL}/rescue/missions/${missionId}/updates`);
        const result = await response.json();
        return result.data;
      },
      [],
      'getMissionUpdates'
    );
  },
};