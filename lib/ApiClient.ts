import axios from 'axios';
import { ApiResponse, HeatmapPoint, LocationCheckRequest, LocationCheckResponse, RoutingRequest, RoutingResponseData, SafeShelterRequest, SafeShelterResponseData, SosRequest } from './Model';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// THÊM HÀM NÀY: Nạp token trực tiếp vào Header để dùng ngay lập tức sau khi đăng nhập
export const setAuthToken = (token: string | null) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt_token');
    // Chỉ set nếu chưa được set bởi setAuthToken
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Xử lý khi Token hết hạn (401, 403)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jwt_token');
        setAuthToken(null); 
        
        if (window.location.pathname !== '/auth') {
          // window.location.href = '/auth';
        }
      }
    }
    const errorMessage = error.response?.data?.message || "Lỗi kết nối máy chủ";
    return Promise.reject(new Error(errorMessage));
  }
);

// TẬP HỢP TOÀN BỘ API CỦA HỆ THỐNG
export const ApiClient = {

  //API XÁC THỰC (AUTH)
  login: async (data: any): Promise<ApiResponse<string>> => {
    const response = await axiosInstance.post('/auth/login', data);
    return response.data;
  },

  register: async (data: any): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.post('/auth/register', data);
    return response.data;
  },

  //API QUẢN LÝ TÀI KHOẢN & HỒ SƠ
  getMyProfile: async (): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.get('/users/me');
    return response.data;
  },

  getMySurvivalProfile: async (): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.get('/users/me/profile');
    return response.data;
  },
  updateMyProfile: async (data: any): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.put('/users/me', data);
    return response.data;
  },
  updateMySurvivalProfile: async (data: any): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.put('/users/me/profile', data);
    return response.data;
  },

  // API BẢN ĐỒ & AI 
  getInitialLandslideData: async (): Promise<HeatmapPoint[]> => {
    const response = await axiosInstance.get('/map/heatmap/landslide');
    return response.data;
  },

  findSafeShelters: async (data: SafeShelterRequest): Promise<ApiResponse<SafeShelterResponseData>> => {
    const response = await axiosInstance.post('/routing/find-safe-shelter', data);
    return response.data;
  },

  getSafeRoute: async (data: RoutingRequest): Promise<ApiResponse<RoutingResponseData>> => {
    const response = await axiosInstance.post('/routing/safe-route', data);
    return response.data;
  },

  sendSosAlert: async (data: SosRequest): Promise<ApiResponse<string>> => {
    const response = await axiosInstance.post('/sos/send', data);
    return response.data;
  },

  checkSafety: async (data: LocationCheckRequest): Promise<ApiResponse<LocationCheckResponse>> => {
    const response = await axiosInstance.post('/safety/check', data);
    return response.data;
  },
}