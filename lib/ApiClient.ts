
import axios from 'axios';
import { HeatmapPoint } from './Model';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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

// TẬP HỢP TOÀN BỘ API CỦA HỆ THỐNG
export const ApiClient = {

  // --- API BẢN ĐỒ NHIỆT ---
  getInitialLandslideData: async (): Promise<HeatmapPoint[]> => {
    try {
      const response = await axiosInstance.get<HeatmapPoint[]>('/map/heatmap/landslide');
      return response.data;
    } catch (error) {
      console.error("Lỗi lấy dữ liệu Heatmap:", error);
      throw error; 
    }
  },

  // --- SAU NÀY SẼ THÊM CÁC API KHÁC Ở ĐÂY ---
}
