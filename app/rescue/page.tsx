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
import ToastContainer, { showToast } from '@/components/ui/Toast';

// ==================== Types ====================
interface SOSRequest {
  id: string;
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

// ==================== Dữ liệu mẫu (đầy đủ trạng thái) ====================
const ALL_MISSIONS: SOSRequest[] = [
  {
    id: 'SOS001',
    requesterName: 'Nguyễn Văn A',
    location: {
      lat: 22.62,
      lng: 103.72,
      address: 'Thôn Nậm Pung, Xã Trịnh Tường, Bát Xát',
    },
    priority: 'critical',
    description: '3 người mắc kẹt trên mái nhà, nước dâng nhanh',
    peopleCount: 3,
    status: 'pending',
    createdAt: new Date(Date.now() - 15 * 60000),
    phoneNumber: '0909123456',
  },
  {
    id: 'SOS002',
    requesterName: 'Trần Thị B',
    location: {
      lat: 22.605,
      lng: 103.71,
      address: 'Thôn Làng Mô, Xã Bản Qua, Bát Xát',
    },
    priority: 'high',
    description: 'Nước ngập 1.5m, cần di dời 2 người già',
    peopleCount: 2,
    status: 'pending',
    createdAt: new Date(Date.now() - 35 * 60000),
    phoneNumber: '0909234567',
  },
  {
    id: 'SOS003',
    requesterName: 'Lê Văn C',
    location: {
      lat: 22.63,
      lng: 103.725,
      address: 'Thôn Phìn Ngan, Xã Phìn Ngan, Bát Xát',
    },
    priority: 'medium',
    description: 'Đất sạt nhẹ sau nhà, cần hỗ trợ di dời',
    peopleCount: 4,
    status: 'pending',
    createdAt: new Date(Date.now() - 120 * 60000),
    phoneNumber: '0909345678',
  },
  {
    id: 'SOS004',
    requesterName: 'Phạm Thị D',
    location: {
      lat: 22.615,
      lng: 103.73,
      address: 'Thôn Nậm Chạc, Xã Trịnh Tường',
    },
    priority: 'high',
    description: 'Cụ già 85 tuổi mắc kẹt, nước ngập 1.2m',
    peopleCount: 1,
    status: 'accepted',
    createdAt: new Date(Date.now() - 45 * 60000),
    phoneNumber: '0909456789',
  },
  {
    id: 'SOS005',
    requesterName: 'Hoàng Văn E',
    location: {
      lat: 22.608,
      lng: 103.715,
      address: 'Thản Mả, Xã Bản Qua',
    },
    priority: 'critical',
    description: '5 người trên nóc nhà, nước dâng rất nhanh',
    peopleCount: 5,
    status: 'accepted',
    createdAt: new Date(Date.now() - 70 * 60000),
    phoneNumber: '0909567890',
  },
  {
    id: 'SOS006',
    requesterName: 'Đỗ Thị F',
    location: {
      lat: 22.625,
      lng: 103.74,
      address: 'Thôn Cốc Ly, Xã Cốc Ly',
    },
    priority: 'medium',
    description: 'Đã di dời thành công, cần kiểm tra lại',
    peopleCount: 2,
    status: 'completed',
    createdAt: new Date(Date.now() - 180 * 60000),
    phoneNumber: '0909678901',
  },
  {
    id: 'SOS007',
    requesterName: 'Bùi Văn G',
    location: {
      lat: 22.6,
      lng: 103.7,
      address: 'Thôn Séo Mý, Xã Bản Vược',
    },
    priority: 'low',
    description: 'Nước rút, hỗ trợ dọn dẹp',
    peopleCount: 3,
    status: 'completed',
    createdAt: new Date(Date.now() - 240 * 60000),
    phoneNumber: '0909789012',
  },
];

// ==================== Priority Config ====================
const priorityConfig = {
  critical: { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-500', label: 'KHẨN CẤP', icon: '🔴' },
  high: { color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-500', label: 'CAO', icon: '🟠' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-500', label: 'TRUNG BÌNH', icon: '🟡' },
  low: { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-500', label: 'THẤP', icon: '🔵' },
};

// ==================== Component chính ====================
export default function RescueDashboard() {
  const router = useRouter();
  const [pendingMissions, setPendingMissions] = useState<SOSRequest[]>([]);
  const [activeMissions, setActiveMissions] = useState<SOSRequest[]>([]);
  const [completedMissions, setCompletedMissions] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data
  const loadData = useCallback(() => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      const pending = ALL_MISSIONS.filter((m) => m.status === 'pending');
      const active = ALL_MISSIONS.filter((m) => m.status === 'accepted');
      const completed = ALL_MISSIONS.filter((m) => m.status === 'completed');
      setPendingMissions(pending);
      setActiveMissions(active);
      setCompletedMissions(completed);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    loadData();

    // Kết nối WebSocket
    const token = localStorage.getItem("token") || "guest";
    websocket.connect(token);

    // Lắng nghe tín hiệu SOS khẩn cấp
    websocket.subscribe("/topic/emergency", (data) => {
      console.log("Nhận được tín hiệu SOS:", data);
      showToast(
        "danger", 
        "TÍN HIỆU SOS KHẨN CẤP", 
        `Nạn nhân: ${data.senderPhone || "Không rõ"}\nTin nhắn: ${data.message}\nTọa độ: [${data.lat}, ${data.lng}]`
      );

      // Cập nhật danh sách pending động
      const newSOS: SOSRequest = {
        id: `SOS_NEW_${Date.now()}`,
        requesterName: data.senderPhone || 'Ẩn danh',
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

  // Reset to initial state
  const resetData = () => {
    loadData();
    showToast('info', 'Thông báo', 'Đã khôi phục dữ liệu mẫu');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadData();
      setRefreshing(false);
      showToast('info', 'Thông báo', 'Đã cập nhật danh sách nhiệm vụ');
    }, 600);
  };

  // Nhận nhiệm vụ
  const acceptMission = (mission: SOSRequest) => {
    // Chuyển từ pending -> active
    setPendingMissions((prev) => prev.filter((m) => m.id !== mission.id));
    setActiveMissions((prev) => [...prev, { ...mission, status: 'accepted' }]);
    showToast('info', 'Thành công', `Đã nhận nhiệm vụ ${mission.id} - ${mission.requesterName}`);
  };

  // Hoàn thành nhiệm vụ
  const completeMission = (mission: SOSRequest) => {
    setActiveMissions((prev) => prev.filter((m) => m.id !== mission.id));
    setCompletedMissions((prev) => [...prev, { ...mission, status: 'completed' }]);
    showToast('info', 'Hoàn thành', `✅ Hoàn thành nhiệm vụ ${mission.id} - ${mission.requesterName}`);
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
    { title: 'SOS đang chờ', value: stats.pending, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Đang xử lý', value: stats.inProgress, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Hoàn thành', value: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Tổng hôm nay', value: stats.totalToday, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
      <ToastContainer />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Quay lại trang chủ"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>🚨</span> Trung tâm Cứu hộ Khẩn cấp
                </h1>
                <p className="text-sm text-gray-500">Đội cứu hộ - Huyện Bát Xát, Lào Cai</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
                aria-label="Làm mới"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={resetData}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                aria-label="Reset dữ liệu"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Đang trực • 8 thành viên</span>
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
              className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-all duration-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* SOS Pending List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="border-b px-6 py-4 bg-gray-50/50">
                <h2 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  DANH SÁCH SOS ĐANG CHỜ
                </h2>
                <p className="text-xs text-gray-500 mt-1">Sắp xếp theo mức độ khẩn cấp</p>
              </div>
              <div className="p-5">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : pendingMissions.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Không có SOS mới</h3>
                    <p className="mt-1 text-sm text-gray-500">Tất cả nhiệm vụ đã được tiếp nhận</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingMissions.map((sos) => {
                      const config = priorityConfig[sos.priority];
                      return (
                        <div
                          key={sos.id}
                          className={`border-l-4 ${config.border} rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200`}
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xl">{config.icon}</span>
                                <h3 className="font-semibold text-gray-900">{sos.requesterName}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                                  {config.label}
                                </span>
                                <span className="text-xs text-gray-400">{formatTime(sos.createdAt)}</span>
                              </div>
                              <Button onClick={() => acceptMission(sos)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                NHẬN
                              </Button>
                            </div>

                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-start text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                                <span className="flex-1">{sos.location.address}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                                <a href={`tel:${sos.phoneNumber}`} className="hover:text-blue-600">
                                  {sos.phoneNumber}
                                </a>
                              </div>
                              {sos.peopleCount && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span>{sos.peopleCount} người cần hỗ trợ</span>
                                </div>
                              )}
                              <p className="text-sm text-gray-700 mt-2 pt-1 border-t border-gray-100">{sos.description}</p>
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
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="border-b px-5 py-4 bg-gray-50/50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-orange-500" />
                  NHIỆM VỤ ĐANG XỬ LÝ ({activeMissions.length})
                </h2>
              </div>
              <div className="p-5">
                {activeMissions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">Chưa có nhiệm vụ nào đang xử lý</p>
                ) : (
                  <div className="space-y-3">
                    {activeMissions.map((mission) => (
                      <div key={mission.id} className="border rounded-xl p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{mission.requesterName}</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{mission.location.address}</p>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 whitespace-nowrap">
                            Đang đến
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Link
                            href={`/rescue/navigation/${mission.id}`}
                            className="flex-1 flex items-center justify-center gap-1 text-blue-600 text-sm border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition"
                          >
                            <Navigation className="h-3 w-3" />
                            Điều hướng
                          </Link>
                          <button
                            onClick={() => completeMission(mission)}
                            className="flex-1 flex items-center justify-center gap-1 text-green-600 text-sm border border-green-200 rounded-lg py-1.5 hover:bg-green-50 transition"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Hoàn thành
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Completed Missions (gọn) */}
            {completedMissions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="border-b px-5 py-3 bg-gray-50/50">
                  <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    ĐÃ HOÀN THÀNH ({completedMissions.length})
                  </h2>
                </div>
                <div className="p-3 max-h-48 overflow-y-auto">
                  {completedMissions.map((m) => (
                    <div key={m.id} className="text-sm py-2 border-b last:border-0 flex justify-between">
                      <span className="font-medium">{m.requesterName}</span>
                      <span className="text-gray-400 text-xs">{formatTime(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Lưu ý khi tác nghiệp
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">• Ưu tiên xử lý SOS mức độ 🔴 trước</li>
                <li className="flex items-start gap-2">• Kiểm tra tuyến đường an toàn trước khi di chuyển</li>
                <li className="flex items-start gap-2">• Cập nhật trạng thái thường xuyên qua ứng dụng</li>
                <li className="flex items-start gap-2">• Giữ liên lạc với nạn nhân qua số điện thoại</li>
              </ul>
            </div>

            {/* Hotline */}
            <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Đường dây nóng
              </h3>
              <p className="text-2xl font-bold text-red-700">1900 1234</p>
              <p className="text-xs text-red-600 mt-1">Hỗ trợ 24/7</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}