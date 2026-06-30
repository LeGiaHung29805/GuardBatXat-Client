const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface ApiError {
  message: string;
  status: number;
}

class ApiService {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    // Dùng đúng key token chuẩn của hệ thống (đăng nhập chính lưu "jwt_token")
    const token =
      localStorage.getItem("jwt_token") || localStorage.getItem("token");
    
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const textData = await response.text();
      let errorMsg = "Lỗi kết nối Server";
      try {
        const json = JSON.parse(textData);
        errorMsg = json.message || textData;
      } catch (e) {
        errorMsg = textData;
      }
      throw { message: errorMsg, status: response.status };
    }

    const json = await response.json();

    // TUYỆT CHIÊU ĐỒNG BỘ BACKEND MỚI: Tự động "bóc vỏ" ApiResponse
    if (json && json.code === 200) {
        if (json.hasOwnProperty('data')) {
            return json.data; // Chỉ trả về cái ruột bên trong cho các Component dùng
        } else if (json.message) {
            return json.message; // Trả về text message để tránh lỗi React child object
        }
    }

    return json;
  }

  // ==================== DASHBOARD & THỐNG KÊ ====================
  async getDashboardStats(level: string) {
    return this.fetchWithAuth(`/commander/statistics/dashboard?level=${level}`);
  }

  async getAvailableScenarios() {
    return this.fetchWithAuth(`/commander/statistics/scenarios`);
  }

  // ==================== HEATMAP (Bản đồ số GIS) ====================
  async getCommanderFloodHeatmap(level: string) {
    return this.fetchWithAuth(`/v1/commander/dashboard/commander-heatmap-flood?level=${level}`);
  }

  async getCommanderLandslideHeatmap() {
    return this.fetchWithAuth(`/v1/commander/dashboard/commander-heatmap-landslide`);
  }

  // ==================== PHÂN TÍCH THIỆT HẠI ====================
  async getDamageByType(level: string) {
    return this.fetchWithAuth(`/commander/analysis/damage-by-type?level=${level}`);
  }

  async getSeverityChart(level: string) {
    return this.fetchWithAuth(`/commander/analysis/severity-chart?level=${level}`);
  }

  async getTopAreas(level: string) {
    return this.fetchWithAuth(`/commander/analysis/top-areas?level=${level}`);
  }

  async getDamageTrend() {
    return this.fetchWithAuth(`/commander/analysis/damage-trend`);
  }

  async getCommuneRanking(level: string) {
    return this.fetchWithAuth(`/commander/analysis/commune-ranking?level=${level}`);
  }

  async getWaterForecast() {
    return this.fetchWithAuth(`/commander/analysis/water-forecast`);
  }

  // ==================== ĐIỀU HÀNH SƠ TÁN ====================
  async activateEvacuation(level: string, radius: number = 1000) {
    return this.fetchWithAuth(`/commander/evacuation/activate?level=${level}&radius=${radius}`, {
      method: "POST",
    });
  }

  async getEvacuationCenter(level: string) {
    return this.fetchWithAuth(`/commander/evacuation/center?level=${level}`);
  }

  // ==================== CẢNH BÁO (ALERTS) ====================
  async sendAlert(data: { title?: string; content: string; level: string; targetArea: string }) {
    return this.fetchWithAuth("/commander/notifications/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAlertHistory() {
    return this.fetchWithAuth(`/commander/notifications/history`);
  }

  // ==================== XUẤT BÁO CÁO ====================
  async exportDamageReport(scenario: string, format: "excel" | "pdf") {
    console.log("Tính năng xuất báo cáo đang được cập nhật...");
  }

  // ==================== AUTH ====================
  async login(identifier: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json || json.code !== 200) {
      throw new Error(json?.message || "Đăng nhập thất bại");
    }

    // Backend trả ApiResponse: token JWT nằm trong trường "data"
    const token = json.data;
    localStorage.setItem("jwt_token", token);
    return token;
  }

  async logout() {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("token");
  }

  async getProfile() {
    return this.fetchWithAuth("/v1/users/me");
  }
}

export const api = new ApiService();
export default api;