'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Navigation, AlertTriangle, Phone, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FieldUpdate, { FieldUpdateData } from '../../FieldUpdate';
import UpdateTimeline from '../../UpdateTimeline';

const RescueMapWithRouting = dynamic(
  () => import('@/components/RescueMapWithRouting'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-slate-500 font-medium">Đang tải bản đồ...</span>
        </div>
      </div>
    ),
  }
);

// ==================== DỮ LIỆU NHIỆM VỤ ====================
// Mỗi nhiệm vụ có thể có điểm xuất phát riêng (startPos)
// Nếu không có startPos riêng, sẽ dùng DEFAULT_START_POS

interface MissionData {
  id: string;
  requesterName: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  startPos?: [number, number]; // Điểm xuất phát riêng của đội cứu hộ cho nhiệm vụ này
  phoneNumber: string;
  peopleCount: number;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// Điểm xuất phát mặc định (UBND thị trấn Bát Xát)
const DEFAULT_START_POS: [number, number] = [22.5284, 103.9998];

const priorityConfig: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Khẩn cấp', icon: '🔴', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { label: 'Cao', icon: '🟠', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { label: 'Trung bình', icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  low: { label: 'Thấp', icon: '⚪', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
};

import { ApiClient } from '@/lib/ApiClient';

export default function RescueNavigation() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.missionId as string;

  const [mounted, setMounted] = useState(false);
  const [missionStarted, setMissionStarted] = useState(false);
  const [updates, setUpdates] = useState<FieldUpdateData[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [mission, setMission] = useState<MissionData | null>(null);

  useEffect(() => {
    setMounted(true);
    
    const fetchMissionAndUpdates = async () => {
      try {
        const res = await ApiClient.getRescueSosRequests();
        const allSos: any[] = res.data || [];
        const found = allSos.find((m: any) => String(m.id) === missionId);
        
        let initialStartPos: [number, number] | undefined = undefined;
        try {
          if (navigator.geolocation) {
             const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
               navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
             });
             initialStartPos = [pos.coords.latitude, pos.coords.longitude];
          }
        } catch(e) {
          console.warn("Không lấy được GPS thực tế, dùng mặc định:", e);
        }

        if (found) {
          setMission({
            id: String(found.id),
            requesterName: found.senderName || 'Người dân',
            location: {
              lat: found.gpsLat,
              lng: found.gpsLng,
              address: `Lat: ${found.gpsLat}, Lng: ${found.gpsLng}`
            },
            startPos: initialStartPos,
            phoneNumber: found.senderPhone,
            peopleCount: found.totalPeople || 1,
            description: found.message || '',
            priority: 'high', // Mặc định là High vì backend chưa có trường priority
          });
        } else {
          router.push('/rescue');
          return;
        }

        // Fetch updates
        const updatesRes = await ApiClient.getSosFieldUpdates(missionId);
        if (updatesRes.data && updatesRes.data.length > 0) {
           const mappedUpdates: FieldUpdateData[] = updatesRes.data.map((log: any) => ({
             missionId: String(missionId),
             status: log.status,
             message: log.message,
             images: log.images ? log.images.split(',') : undefined,
             location: log.gpsLat && log.gpsLng ? { lat: log.gpsLat, lng: log.gpsLng } : undefined,
             timestamp: new Date(log.createdAt),
           }));
           setUpdates(mappedUpdates);
           setMissionStarted(true);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu điều hướng:", error);
        router.push('/rescue');
      }
    };
    
    fetchMissionAndUpdates();
  }, [missionId, router]);

  const startMission = async () => {
    setMissionStarted(true);
    const initialUpdate: FieldUpdateData = {
      missionId,
      status: 'en_route',
      message: 'Đội cứu hộ đã xuất phát, đang di chuyển đến hiện trường',
      timestamp: new Date(),
    };
    // Tối ưu UI: Cập nhật state ngay lập tức
    setUpdates([initialUpdate]);
    
    try {
      await ApiClient.sendSosFieldUpdate(missionId, {
        status: initialUpdate.status,
        message: initialUpdate.message,
        lat: DEFAULT_START_POS[0],
        lng: DEFAULT_START_POS[1],
        images: []
      });
    } catch (e) {
      console.error("Lỗi gửi cập nhật:", e);
    }
  };

  const handleFieldUpdate = async (update: FieldUpdateData) => {
    // Tối ưu UI: Cập nhật state ngay lập tức (lên đầu)
    setUpdates((prev) => [update, ...prev]);
    
    try {
      await ApiClient.sendSosFieldUpdate(missionId, {
        status: update.status,
        message: update.message,
        lat: update.location?.lat,
        lng: update.location?.lng,
        images: update.images || []
      });
    } catch (e) {
      console.error("Lỗi gửi cập nhật:", e);
    }
    
    if (update.status === 'completed') {
      alert('🎉 Nhiệm vụ hoàn thành! Cảm ơn đội cứu hộ.');
    }
  };

  const handleRouteFound = (distance: number, duration: number) => {
    setRouteInfo({ distance, duration });
  };

  if (!mounted || !mission) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          <p className="text-sm text-cyan-400 animate-pulse tracking-widest uppercase font-semibold">Đang đồng bộ dữ liệu vệ tinh...</p>
        </div>
      </div>
    );
  }

  // Lấy điểm xuất phát: ưu tiên startPos riêng, nếu không có thì dùng mặc định
  const startPos: [number, number] = mission.startPos || DEFAULT_START_POS;
  const destPos: [number, number] = [mission.location.lat, mission.location.lng];
  const priority = priorityConfig[mission.priority] ?? priorityConfig.medium;

  return (
    <div className="h-screen flex flex-col bg-slate-950 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-900/50 px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wider">Trở lại</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center uppercase tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
            <Navigation className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
            TỌA ĐỘ MỤC TIÊU
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs text-slate-500 font-mono tracking-wider">#{missionId}</span>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded border font-bold tracking-widest ${priority.bg.replace('/10', '/20')} ${priority.color} ${priority.border}`}>
              {priority.label}
            </span>
          </div>
        </div>

        <div className="w-24" /> {/* Spacer để cân bằng Header */}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative min-h-[280px] lg:min-h-0 border-r border-slate-800">
          <RescueMapWithRouting startPos={startPos} destPos={destPos} onRouteFound={handleRouteFound} />
          {/* Lớp phủ shadow cho Map để blend với viền tối */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(2,6,23,0.5)] z-[400]"></div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-[400px] bg-slate-900/95 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-5">
            {/* Thông tin người báo */}
            <section>
              <h2 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                Dữ liệu Nhiệm vụ
              </h2>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-600 transition-colors">
                <div className="absolute -right-6 -top-6 opacity-5">
                  <Users className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-sm font-bold text-white tracking-wide">{mission.requesterName}</span>
                  <a
                    href={`tel:${mission.phoneNumber}`}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono tracking-wider bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-900/50 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all"
                  >
                    <Phone className="h-3 w-3" />
                    {mission.phoneNumber}
                  </a>
                </div>
                <div className="flex items-start gap-2.5 text-sm text-slate-300 relative z-10 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <MapPin className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <span className="font-mono text-xs leading-relaxed">{mission.location.address}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-300 relative z-10 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <Users className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs uppercase tracking-wider font-medium"><span className="font-bold text-white text-sm">{mission.peopleCount}</span> Nạn nhân</span>
                </div>
                <div className="pt-3 border-t border-slate-700/50 relative z-10">
                  <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-slate-600 pl-2">"{mission.description}"</p>
                </div>
              </div>
            </section>

            {/* Thông tin tuyến đường */}
            <div className="flex items-center gap-3 px-4 py-3 bg-indigo-950/20 border border-indigo-900/50 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <svg className="h-5 w-5 text-indigo-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                <circle cx="7.5" cy="14.5" r="1.5"/>
                <circle cx="16.5" cy="14.5" r="1.5"/>
              </svg>

              {routeInfo ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{routeInfo.duration} <span className="text-xs text-slate-400 font-medium">PHÚT</span></span>
                  <span className="text-sm text-slate-500">·</span>
                  <span className="text-sm text-indigo-300 font-mono tracking-wider">{routeInfo.distance} KM</span>
                </div>
              ) : (
                <span className="text-xs font-medium text-indigo-400 animate-pulse tracking-widest uppercase">Đang quét tuyến đường...</span>
              )}

              {routeInfo && (
                <span className="ml-auto text-[10px] font-bold px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded shadow-[0_0_8px_rgba(99,102,241,0.2)] uppercase tracking-widest">
                  TỐI ƯU
                </span>
              )}
            </div>

            {/* Cảnh báo */}
            <section>
              <div className="flex items-start gap-3 bg-orange-950/30 border border-orange-900/50 rounded-xl p-4 relative overflow-hidden group hover:bg-orange-950/40 transition-colors">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-orange-400 mb-1.5 uppercase tracking-widest">Cảnh báo Địa hình</p>
                  <ul className="space-y-1.5">
                    <li className="text-xs text-orange-200/80 font-medium flex items-start gap-1.5"><span className="text-orange-500 mt-0.5">■</span> Đường đèo: nguy cơ sạt lở thấp, chú ý quan sát</li>
                    <li className="text-xs text-orange-200/80 font-medium flex items-start gap-1.5"><span className="text-orange-500 mt-0.5">■</span> Đường trơn trượt sau mưa, giảm tốc độ</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Hành động */}
            {!missionStarted ? (
              <Button
                onClick={startMission}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-14 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all border border-emerald-400/50 uppercase tracking-widest"
                size="lg"
              >
                <Navigation className="h-5 w-5 mr-2 drop-shadow-md" />
                BẮT ĐẦU DI CHUYỂN
              </Button>
            ) : (
              <div className="space-y-5">
                <FieldUpdate missionId={missionId} onUpdateSent={handleFieldUpdate} />
                <UpdateTimeline updates={updates} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}