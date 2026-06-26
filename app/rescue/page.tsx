'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Phone,
  Users,
  Navigation,
  ArrowLeft,
  Shield,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import websocket from '@/app/commander/utils/websocket';
import ToastContainer, { showToast as apiShowToast } from '@/components/ui/Toast';

import { ApiClient } from '@/lib/ApiClient';

// ==================== Types ====================
// Thay đổi interface để khớp với SosResponse từ backend
interface SOSRequest {
  id: string | number;
  requesterName: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  peopleCount?: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  createdAt: Date;
  phoneNumber: string;
}

// ==================== Component Toast ====================
let toastTimeout: NodeJS.Timeout;
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    toastTimeout = setTimeout(onClose, 3000);
    return () => clearTimeout(toastTimeout);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`fixed bottom-5 right-5 z-50 ${bgColor} text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right`}>
      {type === 'success' && <CheckCircle className="h-5 w-5" />}
      {type === 'error' && <XCircle className="h-5 w-5" />}
      {type === 'info' && <AlertCircle className="h-5 w-5" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

// ==================== Priority Config ====================
const priorityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/50', label: 'KHẨN CẤP', icon: '🔴' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/50', label: 'CAO', icon: '🟠' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', label: 'TRUNG BÌNH', icon: '🟡' },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/50', label: 'THẤP', icon: '🔵' },
};

// ==================== Component chính ====================
export default function RescueDashboard() {
  const router = useRouter();
  const [pendingMissions, setPendingMissions] = useState<SOSRequest[]>([]);
  const [activeMissions, setActiveMissions] = useState<SOSRequest[]>([]);
  const [completedMissions, setCompletedMissions] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const toastType: 'info' | 'warning' | 'danger' = type === 'error' ? 'danger' : 'info';
    const title = type === 'success' ? 'Thành công' : type === 'error' ? 'Lỗi' : 'Thông báo';
    apiShowToast(toastType, title, message);
  };

  const [deletedMissionIds, setDeletedMissionIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rescue:deleted-completed');
      if (stored) {
        try {
          setDeletedMissionIds(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const deleteCompletedMission = (id: string) => {
    const updated = [...deletedMissionIds, id];
    setDeletedMissionIds(updated);
    localStorage.setItem('rescue:deleted-completed', JSON.stringify(updated));
    showToast('Đã xóa nhiệm vụ khỏi lịch sử', 'info');
  };

  // Load real data from API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getRescueSosRequests();
      const allSos: any[] = res.data || [];

      // Map từ DTO sang Frontend Interface
      const mappedMissions: SOSRequest[] = allSos.map(sos => {
        let mappedStatus: 'pending' | 'accepted' | 'completed' = 'pending';
        if (sos.status === 'RESCUING') mappedStatus = 'accepted';
        if (sos.status === 'COMPLETED') mappedStatus = 'completed';

        return {
          id: sos.id,
          requesterName: sos.senderName || 'Người dân',
          location: {
            lat: sos.gpsLat,
            lng: sos.gpsLng,
            address: `Lat: ${sos.gpsLat}, Lng: ${sos.gpsLng}` // Hiện toạ độ vì chưa tích hợp Reverse Geocoding
          },
          priority: 'critical', // Có thể thêm logic tính toán mức độ ưu tiên
          description: sos.message || 'Không có mô tả',
          peopleCount: sos.totalPeople,
          status: mappedStatus,
          createdAt: new Date(sos.createdAt),
          phoneNumber: sos.senderPhone
        };
      });

      setPendingMissions(mappedMissions.filter((m) => m.status === 'pending'));
      setActiveMissions(mappedMissions.filter((m) => m.status === 'accepted'));
      setCompletedMissions(mappedMissions.filter((m) => m.status === 'completed'));
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu SOS:", error);
      showToast('Lỗi tải dữ liệu. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Kết nối WebSocket
    const token = localStorage.getItem("token") || "guest";
    websocket.connect(token);

    // Lắng nghe tín hiệu SOS khẩn cấp
    websocket.subscribe("/topic/emergency", (data) => {
      console.log("Nhận được tín hiệu SOS:", data);
      apiShowToast(
        "danger",
        "TÍN HIỆU SOS KHẨN CẤP",
        `Nạn nhân: ${data.senderPhone || "Không rõ"}\nTin nhắn: ${data.message}\nTọa độ: [${data.lat}, ${data.lng}]`
      );

      // Cập nhật danh sách pending động
      const newSOS: SOSRequest = {
        id: data.id || `SOS_NEW_${Date.now()}`,
        requesterName: data.senderName || data.senderPhone || 'Ẩn danh',
        location: {
          lat: data.lat,
          lng: data.lng,
          address: 'Tọa độ GPS',
        },
        priority: 'critical',
        description: data.message,
        status: 'pending',
        createdAt: new Date(),
        phoneNumber: data.senderPhone || 'N/A',
      };
      setPendingMissions(prev => [newSOS, ...prev]);
    });

    // Lắng nghe cập nhật vị trí
    websocket.subscribe("/topic/rescue-tracking", (data) => {
      // Có thể xử lý cập nhật Live Tracking ở đây
    });

    return () => {
      websocket.disconnect();
    };
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    showToast('Đã cập nhật danh sách nhiệm vụ', 'info');
  };

  // Nhận nhiệm vụ (API Call)
  const acceptMission = async (mission: SOSRequest) => {
    const numericId = Number(mission.id);
    const isMockId = isNaN(numericId);

    try {
      if (!isMockId) {
        await ApiClient.acceptRescueSosRequest(numericId);
      }
      // Thay đổi state tạm thời để UI cập nhật mượt hơn
      setPendingMissions((prev) => prev.filter((m) => m.id !== mission.id));
      setActiveMissions((prev) => [...prev, { ...mission, status: 'accepted' }]);
      showToast(`Đã nhận nhiệm vụ ${mission.id} - ${mission.requesterName}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Lỗi nhận nhiệm vụ', 'error');
    }
  };

  // Hoàn thành nhiệm vụ (API Call)
  const completeMission = async (mission: SOSRequest) => {
    const numericId = Number(mission.id);
    const isMockId = isNaN(numericId);

    try {
      if (!isMockId) {
        await ApiClient.completeRescueSosRequest(numericId);
      }
      setActiveMissions((prev) => prev.filter((m) => m.id !== mission.id));
      setCompletedMissions((prev) => [...prev, { ...mission, status: 'completed' }]);
      showToast(`✅ Hoàn thành nhiệm vụ ${mission.id} - ${mission.requesterName}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Lỗi hoàn thành nhiệm vụ', 'error');
    }
  };

  // Format thời gian
  const formatTime = (date: Date): string => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  // Thống kê động
  const stats = {
    pending: pendingMissions.length,
    inProgress: activeMissions.length,
    completed: completedMissions.length,
    totalToday: pendingMissions.length + activeMissions.length + completedMissions.length,
  };

  const statCards = [
    { title: 'SOS đang chờ', value: stats.pending, icon: AlertCircle, color: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]', bg: 'bg-red-500/10 border border-red-500/20' },
    { title: 'Đang xử lý', value: stats.inProgress, icon: Activity, color: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]', bg: 'bg-orange-500/10 border border-orange-500/20' },
    { title: 'Hoàn thành', value: stats.completed, icon: CheckCircle, color: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]', bg: 'bg-emerald-500/10 border border-emerald-500/20' },
    { title: 'Tổng hôm nay', value: stats.totalToday, icon: Clock, color: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]', bg: 'bg-cyan-500/10 border border-cyan-500/20' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-blue-500/30">
      <ToastContainer />
      {/* Toast */}
      {/* {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />} */}

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)] border-b border-slate-800 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/50 p-2 rounded-xl hover:bg-slate-700/50 border border-slate-700/50"
                aria-label="Quay lại trang chủ"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                  <span className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">🚨</span> TRUNG TÂM CHỈ HUY CỨU HỘ
                </h1>
                <p className="text-sm text-slate-400 font-medium">Huyện Bát Xát, Lào Cai - Phân hệ phản ứng nhanh</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pr-24">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 text-cyan-400 hover:text-cyan-300 transition-colors rounded-xl bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-900/50"
                aria-label="Làm mới"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/40 border border-emerald-900/50 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]"></div>
                <span className="text-sm font-semibold text-emerald-400 tracking-wide">TRỰC CHIẾN • 8 THÀNH VIÊN</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statCards.map((stat, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-lg border border-slate-800 hover:border-slate-700 transition-all duration-300 p-5 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">{stat.title}</p>
                  <p className="text-4xl font-black text-white mt-2 tracking-tight">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3.5 rounded-xl`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* SOS Pending List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
              <div className="border-b border-slate-800 px-6 py-4 bg-slate-900/80">
                <h2 className="font-bold text-white text-lg flex items-center gap-2 tracking-wide">
                  <AlertCircle className="h-5 w-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  DANH SÁCH SOS ĐANG CHỜ
                </h2>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Hệ thống phân loại tự động ưu tiên khẩn cấp</p>
              </div>
              <div className="p-5">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                  </div>
                ) : pendingMissions.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800/50 border-dashed">
                    <CheckCircle className="mx-auto h-14 w-14 text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)] opacity-80" />
                    <h3 className="mt-4 text-base font-semibold text-white tracking-wide">HỆ THỐNG AN TOÀN</h3>
                    <p className="mt-1 text-sm text-slate-400">Không có tín hiệu cấp cứu mới nào trong khu vực</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingMissions.map((sos) => {
                      const config = priorityConfig[sos.priority];
                      return (
                        <div
                          key={sos.id}
                          className={`relative rounded-xl bg-slate-800/40 border border-slate-700 shadow-lg hover:bg-slate-800/60 transition-all duration-300 overflow-hidden ${sos.priority === 'critical' ? 'ring-1 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-[pulse_3s_ease-in-out_infinite]' : ''
                            }`}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.bg.split(' ')[0].replace('/10', '')}`}></div>
                          <div className="p-5 pl-6">
                            <div className="flex justify-between items-start flex-wrap gap-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xl drop-shadow-md">{config.icon}</span>
                                <h3 className="font-bold text-white text-lg tracking-wide">{sos.requesterName}</h3>
                                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md ${config.bg} ${config.color} border ${config.border} font-bold`}>
                                  {config.label}
                                </span>
                                <span className="text-xs text-slate-400 font-medium bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700">{formatTime(sos.createdAt)}</span>
                              </div>
                              <Button onClick={() => acceptMission(sos)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wider shadow-[0_0_15px_rgba(8,145,178,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all uppercase text-xs px-6 py-4 rounded-xl border border-cyan-400/30">
                                NHẬN NHIỆM VỤ
                              </Button>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2.5">
                                <div className="flex items-start text-sm text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/50">
                                  <MapPin className="h-4 w-4 mr-2.5 flex-shrink-0 mt-0.5 text-cyan-400" />
                                  <span className="flex-1 leading-relaxed font-mono text-xs">{sos.location.address}</span>
                                </div>
                                <div className="flex items-center text-sm text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/50">
                                  <Phone className="h-4 w-4 mr-2.5 flex-shrink-0 text-emerald-400" />
                                  <a href={`tel:${sos.phoneNumber}`} className="hover:text-emerald-300 font-mono text-xs tracking-wider transition-colors">
                                    {sos.phoneNumber}
                                  </a>
                                </div>
                              </div>

                              <div className="flex flex-col justify-between">
                                {sos.peopleCount && (
                                  <div className="flex items-center text-sm text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/50 w-fit">
                                    <Users className="h-4 w-4 mr-2.5 flex-shrink-0 text-orange-400" />
                                    <span className="font-medium text-xs tracking-wide">SỐ LƯỢNG: {sos.peopleCount} NGƯỜI</span>
                                  </div>
                                )}
                                <div className="mt-auto pt-2">
                                  <p className="text-sm text-slate-400 italic line-clamp-2 pl-3 border-l-2 border-slate-700">"{sos.description}"</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Active + Completed + Info */}
          <div className="space-y-6">
            {/* Active Missions */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
              <div className="border-b border-slate-800 px-5 py-4 bg-slate-900/80">
                <h2 className="font-bold text-white flex items-center gap-2 tracking-wide uppercase text-sm">
                  <Navigation className="h-4 w-4 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                  ĐANG XỬ LÝ ({activeMissions.length})
                </h2>
              </div>
              <div className="p-4">
                {activeMissions.length === 0 ? (
                  <p className="text-center text-slate-500 py-6 text-sm font-medium">Lực lượng đang sẵn sàng</p>
                ) : (
                  <div className="space-y-3">
                    {activeMissions.map((mission) => (
                      <div key={mission.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                        <div className="flex justify-between items-start gap-2 pl-2">
                          <div className="flex-1">
                            <p className="font-bold text-white tracking-wide">{mission.requesterName}</p>
                            <p className="text-xs text-slate-400 mt-1 truncate font-mono">{mission.location.address}</p>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded border border-orange-500/30 text-[10px] font-bold bg-orange-500/10 text-orange-400 uppercase tracking-widest animate-pulse">
                            Tiếp cận
                          </span>
                        </div>
                        <div className="mt-4 flex gap-2 pl-2">
                          <Link
                            href={`/rescue/navigation/${mission.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider border border-cyan-900 bg-cyan-950/30 rounded-lg py-2 hover:bg-cyan-900/50 hover:text-cyan-300 transition-colors shadow-[0_0_10px_rgba(8,145,178,0.1)]"
                          >
                            <Navigation className="h-3 w-3" />
                            ĐIỀU HƯỚNG
                          </Link>
                          <button
                            onClick={() => completeMission(mission)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-900 bg-emerald-950/30 rounded-lg py-2 hover:bg-emerald-900/50 hover:text-emerald-300 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                          >
                            <CheckCircle className="h-3 w-3" />
                            HOÀN TẤT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Completed Missions (gọn) */}
            {completedMissions.filter((m) => !deletedMissionIds.includes(String(m.id))).length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
                <div className="border-b border-slate-800 px-5 py-3 bg-slate-900/80">
                  <h2 className="font-bold text-slate-300 text-xs flex items-center gap-2 uppercase tracking-widest">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ĐÃ HOÀN THÀNH ({completedMissions.filter((m) => !deletedMissionIds.includes(String(m.id))).length})
                  </h2>
                </div>
                <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {completedMissions
                    .filter((m) => !deletedMissionIds.includes(String(m.id)))
                    .map((m) => (
                      <div key={m.id} className="text-sm py-2.5 px-3 border-b border-slate-800/50 last:border-0 flex justify-between items-center hover:bg-slate-800/30 rounded-lg transition-colors group/item">
                        <span className="font-medium text-slate-300">{m.requesterName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded">{formatTime(m.createdAt)}</span>
                          <button
                            onClick={() => deleteCompletedMission(String(m.id))}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors opacity-0 group-hover/item:opacity-100"
                            title="Xóa khỏi lịch sử"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-indigo-950/30 rounded-2xl p-5 border border-indigo-900/50 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Shield className="w-24 h-24 text-indigo-400" />
              </div>
              <h3 className="font-bold text-indigo-300 mb-3 flex items-center gap-2 tracking-wide uppercase text-sm relative z-10">
                <Shield className="h-4 w-4" />
                Quy trình tác chiến
              </h3>
              <ul className="text-xs text-indigo-200/80 space-y-2.5 relative z-10 font-medium">
                <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">■</span> Ưu tiên xử lý tín hiệu cấp độ ĐỎ</li>
                <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">■</span> Xác minh tọa độ vệ tinh trước khi di chuyển</li>
                <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">■</span> Báo cáo hiện trường liên tục (Field Updates)</li>
                <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">■</span> Kích hoạt bộ đàm khi mất sóng GPS</li>
              </ul>
            </div>

            {/* Hotline */}
            <div className="bg-red-950/30 rounded-2xl p-5 border border-red-900/50 text-center relative overflow-hidden group hover:bg-red-950/40 transition-colors cursor-pointer">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Phone className="h-6 w-6 text-red-500 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
              <h3 className="font-bold text-red-400 text-xs uppercase tracking-widest mb-1">
                Kênh liên lạc khẩn
              </h3>
              <p className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">1900<span className="text-red-500">.</span>1234</p>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[10px] text-red-300/70 font-bold uppercase tracking-widest">Trực ban vệ tinh 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}