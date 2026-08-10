"use client";

import React, { useState, useEffect } from "react";
import MonitorTab from "./components/MonitorTab";
import EvacuateTab from "./components/EvacuateTab";
import AnalyzeTab from "./components/AnalyzeTab";
import AlertTab from "./components/AlertTab";
import ModerateTab from "./components/ModerateTab";
import api from "./utils/api";
import websocket from "./utils/websocket";
import type { ScenarioLevel, DamageStats, NotificationLog } from "./types";
import {
  ShieldAlert,
  Map,
  Siren,
  TrendingUp,
  Megaphone,
  Loader2,
} from "lucide-react";
import ToastContainer, { showToast } from "@/components/ui/Toast";

// Tổng số dân ước tính của khu vực Bát Xát (dùng làm số người dân nhận cảnh báo diện rộng).
// Đây là con số dân số toàn vùng, không phải số thiết bị; broadcast gửi tới toàn bộ người dân trong vùng.
const BAT_XAT_POPULATION = 3241;

export default function PCTTCommanderDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "monitor" | "evacuate" | "analyze" | "alert" | "moderate"
  >("monitor");
  const [scenarios, setScenarios] = useState<ScenarioLevel[]>([
    "80m",
    "82m",
    "83.5m",
  ]);
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioLevel>("80m");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("Đang cập nhật...");

  const [floodPoints, setFloodPoints] = useState<any[]>([]);
  const [landslidePoints, setLandslidePoints] = useState<any[]>([]);

  const [damageStats, setDamageStats] = useState<DamageStats>({
    housesFlooded: 0,
    areaAffected: 0,
    populationEvacuated: 0,
    roadsBlocked: 0,
  });

  const [incidentReports, setIncidentReports] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<NotificationLog[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
      if (!token) {
        window.location.href = "/auth";
        return;
      }
      try {
        const profile = await api.getProfile();
        const role = profile?.roleName;
        if (role === "COMMANDER" || role === "ADMIN") {
          setAuthorized(true);
        } else {
          window.location.href = "/";
        }
      } catch (err) {
        window.location.href = "/auth";
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authorized) return;
    setLastUpdate(new Date().toLocaleString("vi-VN"));
    setupWebSocket();
    fetchAlertHistory();
    fetchScenarios();
    fetchIncidents();

    return () => {
      websocket.disconnect();
    };
  }, [authorized]);

  const fetchIncidents = async () => {
    try {
      const res: any = await api.getIncidentReports();
      if (res) {
        setIncidentReports(res);
      }
    } catch (e) {
      console.error("Lỗi khi tải danh sách sự cố cho bản đồ:", e);
    }
  };

  const fetchScenarios = async () => {
    try {
      const data: any = await api.getAvailableScenarios();
      if (data && data.length > 0) {
        setScenarios(data);
        if (!data.includes(selectedScenario)) {
          setSelectedScenario(data[0]);
        }
      }
    } catch (e) {
      console.error("Lỗi khi tải danh sách kịch bản:", e);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    fetchDataForScenario();
  }, [selectedScenario, authorized]);

  const fetchDataForScenario = async () => {
    try {
      setLoading(true);
      const levelNumber = selectedScenario.replace("m", "");

      const [statsRes, floodRes, landslideRes, incidentsRes] = await Promise.all([
        api.getDashboardStats(levelNumber),
        api.getCommanderFloodHeatmap(levelNumber),
        api.getCommanderLandslideHeatmap(),
        api.getIncidentReports(),
      ]);

      setDamageStats({
        housesFlooded: (statsRes as any).nha_bi_ngap || 0,
        areaAffected: (statsRes as any).dien_tich_ngap_m2 || 0,
        populationEvacuated: (statsRes as any).nguoi_can_so_tan || 0,
        roadsBlocked: (statsRes as any).duong_bi_chan || 0,
      });

      setFloodPoints(floodRes as any[]);
      setLandslidePoints(landslideRes as any[]);
      setIncidentReports(incidentsRes as any[] || []);
      setLastUpdate(new Date().toLocaleString("vi-VN"));
    } catch (error) {
      console.error("Lỗi khi kéo dữ liệu Backend:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    const token =
      localStorage.getItem("jwt_token") || localStorage.getItem("token") || "guest";
    websocket.connect(token);

    // Lắng nghe API cũ
    websocket.on("MANUAL_ALERT", (data) => {
      console.log("Nhận được thông báo mới qua WebSocket:", data);
      fetchAlertHistory();
    });

    // Lắng nghe tín hiệu SOS khẩn cấp
    websocket.subscribe("/topic/emergency", (data) => {
      console.log("Nhận được tín hiệu SOS:", data);
      showToast(
        "danger",
        "TÍN HIỆU SOS KHẨN CẤP",
        `Nạn nhân: ${data.senderPhone || "Không rõ"}\nTin nhắn: ${data.message}\nTọa độ: [${data.lat}, ${data.lng}]`,
      );
    });

    // Lắng nghe cảnh báo rủi ro an toàn từ AI
    websocket.subscribe("/topic/safety-alerts", (data) => {
      console.log("Cảnh báo AI:", data);
      if (data.alertLevel === "DANGER" || data.alertLevel === "WARNING") {
        showToast(
          data.alertLevel === "DANGER" ? "danger" : "warning",
          "HỆ THỐNG CẢNH BÁO RỦI RO",
          data.message,
        );
      }
    });

    // Lắng nghe live update thống kê (nếu có)
    websocket.subscribe("/topic/safety-stats", (data) => {
      // Có thể làm mới dashboard ngầm
      // fetchDataForScenario();
    });
  };

  const handleScenarioChange = (scenario: ScenarioLevel) => {
    setSelectedScenario(scenario);
  };

  const handleActivateEvacuation = async (radius: number) => {
    if (
      !confirm(
        `Xác nhận KÍCH HOẠT lệnh sơ tán khẩn cấp cho mốc ${selectedScenario} với bán kính ${radius}m?`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const levelNumber = selectedScenario.replace("m", "");
      const response: any = await api.activateEvacuation(levelNumber, radius);

      showToast("info", "Thông báo", response);
    } catch (error: any) {
      showToast("danger", "Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async (message: string, level: string = "WARNING", targetArea: string = "Tất cả") => {
    try {
      setLoading(true);
      await api.sendAlert({
        title: "CẢNH BÁO TỪ BAN CHỈ HUY",
        content: message,
        level,
        targetArea,
      });

      showToast("info", "Thành công", "Đã phát loa cảnh báo thành công!");
      fetchAlertHistory();
    } catch (error: any) {
      showToast("danger", "Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertHistory = async () => {
    try {
      const history: any = await api.getAlertHistory();

      const formattedHistory = (history ?? []).map((item: any) => ({
        id: item.notifyId?.toString() ?? "",
        message: `[${item.targetArea}] ${item.title} - ${item.content}`,
        sentTo: BAT_XAT_POPULATION,
        timestamp: item.time,
        status: "sent",
      }));

      setNotifications(formattedHistory);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử cảnh báo:", error);
    }
  };

  const navTabs = [
    { id: "monitor", label: "Bản đồ Chỉ huy", icon: <Map size={18} /> },
    { id: "evacuate", label: "Kịch bản sơ tán", icon: <Siren size={18} /> },
    {
      id: "analyze",
      label: "Phân tích thiệt hại",
      icon: <TrendingUp size={18} />,
    },
    { id: "alert", label: "Phát cảnh báo", icon: <Megaphone size={18} /> },
    { id: "moderate", label: "Kiểm duyệt sự cố", icon: <ShieldAlert size={18} /> },
  ];

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-white relative">
      <ToastContainer />

      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-800/90 border border-gray-700 rounded-2xl p-8 flex flex-col items-center shadow-2xl">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <div className="text-xl font-semibold">Đang đồng bộ dữ liệu...</div>
          </div>
        </div>
      )}

      <header className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-red-600 p-3 rounded-xl shadow-lg shadow-red-600/20">
                <ShieldAlert size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Trung tâm Chỉ huy PCTT
                </h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  Cấp Xã/Thôn - Huyện Bát Xát, Lào Cai
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Đồng bộ cuối cùng</div>
                <div className="text-lg font-semibold text-blue-100">
                  {lastUpdate}
                </div>
              </div>
              <div className="bg-green-500 w-3.5 h-3.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-2">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-blue-600/10 text-blue-400 border-b-4 border-blue-500"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border-b-4 border-transparent"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        {activeTab === "monitor" && (
          <MonitorTab
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onScenarioChange={handleScenarioChange}
            floodData={floodPoints}
            landslideData={landslidePoints}
            incidentReports={incidentReports}
          />
        )}
        {activeTab === "evacuate" && (
          <EvacuateTab
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            damageStats={damageStats}
            floodData={floodPoints}
            onActivate={handleActivateEvacuation}
          />
        )}
        {activeTab === "analyze" && (
          <AnalyzeTab
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            damageStats={damageStats}
          />
        )}
        {activeTab === "alert" && (
          <AlertTab
            notifications={notifications}
            onSendAlert={handleSendAlert}
          />
        )}
        {activeTab === "moderate" && (
          <ModerateTab
            onIncidentApproved={fetchDataForScenario}
          />
        )}
      </main>
    </div>
  );
}
