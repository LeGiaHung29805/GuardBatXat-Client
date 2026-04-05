import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_V1 = `${API_BASE_URL}/api/v1`;
const API_ADMIN = `${API_BASE_URL}/api/admin`;

const axiosInstance = axios.create({
  baseURL: API_V1,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

const getAuthHeaders = () => {
  const headers: any = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && token !== "null" && token.trim() !== "") {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const ApiClient = {
  // --- AUTH ---
  login: async (credentials: any) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return res.json();
  },

  // --- ADMIN USERS ---
  getAdminUsers: async () => {
    const res = await fetch(`${API_ADMIN}/users`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createUser: async (userData: any) => {
    const res = await fetch(`${API_ADMIN}/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return res.json();
  },
  updateUser: async (id: number, userData: any) => {
    const res = await fetch(`${API_ADMIN}/users/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return res.json();
  },
  toggleUserStatus: async (id: number) => {
    const res = await fetch(`${API_ADMIN}/users/${id}/toggle-status`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  deleteUser: async (id: number) => {
    const res = await fetch(`${API_ADMIN}/users/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // --- ADMIN SPATIAL (Hạ tầng) ---
  getAdminBuildings: async () => {
    const res = await fetch(`${API_ADMIN}/spatial/buildings`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getAdminRoads: async () => {
    const res = await fetch(`${API_ADMIN}/spatial/roads`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createBuilding: async (data: any) => {
    const res = await fetch(`${API_ADMIN}/spatial/buildings`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateBuilding: async (id: number, data: any) => {
    const res = await fetch(`${API_ADMIN}/spatial/buildings/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteBuilding: async (id: number) => {
    const res = await fetch(`${API_ADMIN}/spatial/buildings/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createRoad: async (data: any) => {
    const res = await fetch(`${API_ADMIN}/spatial/roads`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // --- ADMIN AI & SIMULATION ---
  updateAHPWeights: async (strategyName: string, weights: any) => {
    const res = await fetch(`${API_ADMIN}/system/weights/${strategyName}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(weights),
    });
    return res.json();
  },
  getSystemModels: async () => {
    const res = await fetch(`${API_ADMIN}/system/models`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  activateModel: async (id: number) => {
    const res = await fetch(`${API_ADMIN}/system/models/${id}/activate`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  runFloodSimulation: async (waterLevel: number) => {
    const res = await fetch(`${API_ADMIN}/simulation/flood`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ waterLevel }),
    });
    return res.json();
  },
  getSimulationStats: async (simulationId: string) => {
    const res = await fetch(
      `${API_ADMIN}/simulation/flood/${simulationId}/stats`,
      { headers: getAuthHeaders() },
    );
    return res.json();
  },

  // --- CITIZEN & PUBLIC ---
  getInitialLandslideData: async () => {
    const res = await axiosInstance.get("/map/heatmap/landslide");
    return res.data;
  },
  checkSafety: async (data: any) => {
    const res = await axiosInstance.post("/safety/check", data);
    return res.data;
  },
  getSafeRoute: async (data: any) => {
    // Trỏ đúng vào API Routing theo hợp đồng mới
    const res = await fetch(`${API_ADMIN}/routing/safety`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  findSafeShelters: async (data: any) => {
    const res = await fetch(`${API_ADMIN}/routing/find-safe-shelter`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  sendSosAlert: async (data: any) => {
    const res = await axiosInstance.post("/sos/send", data);
    return res.data;
  },
  getEvacuationRoute: async (data: any) => {
    const res = await axiosInstance.post("/map/evacuation-route", data);
    return res.data;
  },
  triggerBroadcast: async (data: any) => {
    const res = await axiosInstance.post(
      "/map/internal/trigger-broadcast",
      data,
    );
    return res.data;
  },
  // Gọi API so sánh 3 đường của Admin
  getAdminCompareRoute: async (payload: any) => {
    const res = await fetch(`${API_ADMIN}/routing/compare`, {
      method: "POST",
      headers: getAuthHeaders(), // Nhớ truyền header để Spring Security cho qua
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
