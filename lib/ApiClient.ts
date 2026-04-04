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
  return config;
});

export const ApiClient = {
  // --- HEATMAP ---
  getInitialLandslideData: async (): Promise<HeatmapPoint[]> => {
    const response = await axiosInstance.get("/map/heatmap/landslide");
    return response.data;
  },

  // --- SAFE SHELTER ---
  findSafeShelters: async (
    data: SafeShelterRequest,
  ): Promise<ApiResponse<SafeShelterResponseData>> => {
    const response = await axiosInstance.post(
      "/routing/find-safe-shelter",
      data,
    );
    return response.data;
  },

  // --- ROUTING ---
  getSafeRoute: async (
    data: RoutingRequest,
  ): Promise<ApiResponse<RoutingResponseData>> => {
    const response = await axiosInstance.post("/routing/safety", data);
    return response.data;
  },

  // --- SOS ---
  sendSosAlert: async (data: SosRequest): Promise<ApiResponse<string>> => {
    const response = await axiosInstance.post("/sos/send", data);
    return response.data;
  },

  // --- CHECK SAFETY ---
  checkSafety: async (
    data: LocationCheckRequest,
  ): Promise<ApiResponse<LocationCheckResponse>> => {
    const response = await axiosInstance.post("/safety/check", data);
    return response.data;
  },
};
