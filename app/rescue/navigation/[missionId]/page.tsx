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

const ALL_MISSIONS = [
  {
    id: 'SOS001',
    requesterName: 'Nguyễn Văn A',
    location: { lat: 22.5101, lng: 103.9756, address: 'Thôn Nậm Pung, Xã Bát Xát' },
    phoneNumber: '0909123456',
    peopleCount: 3,
    description: '3 người mắc kẹt trên mái nhà, nước dâng nhanh',
    priority: 'high',
  },
  {
    id: 'SOS002',
    requesterName: 'Trần Thị B',
    location: { lat: 22.4712, lng: 103.9512, address: 'Thôn Làng Mô, Xã Bát Xát' },
    phoneNumber: '0909234567',
    peopleCount: 2,
    description: 'Nước ngập 1.5m, cần di dời 2 người già',
    priority: 'medium',
  },
  {
    id: 'SOS003',
    requesterName: 'Lê Văn C',
    location: { lat: 22.5023, lng: 103.9621, address: 'Thôn Phìn Ngan, Xã Bát Xát' },
    phoneNumber: '0909345678',
    peopleCount: 4,
    description: 'Đất sạt nhẹ sau nhà, cần hỗ trợ di dời',
    priority: 'medium',
  },
  {
    id: 'SOS004',
    requesterName: 'Phạm Thị D',
    location: { lat: 22.5134, lng: 103.9834, address: 'Thôn Nậm Chạc, Xã Bát Xát' },
    phoneNumber: '0909456789',
    peopleCount: 1,
    description: 'Cụ già 85 tuổi mắc kẹt, nước ngập 1.2m',
    priority: 'high',
  },
  {
    id: 'SOS005',
    requesterName: 'Hoàng Văn E',
    location: { lat: 22.4934, lng: 103.9889, address: 'Thản Mả, Xã Bản Qua' },
    phoneNumber: '0909567890',
    peopleCount: 5,
    description: '5 người trên nóc nhà, nước dâng rất nhanh',
    priority: 'critical',
  },
  {
    id: 'SOS006',
    requesterName: 'Đỗ Thị F',
    location: { lat: 22.4778, lng: 103.9623, address: 'Thôn Cốc Ly, Xã Cốc Ly' },
    phoneNumber: '0909678901',
    peopleCount: 2,
    description: 'Đã di dời thành công, cần kiểm tra lại',
    priority: 'low',
  },
  {
    id: 'SOS007',
    requesterName: 'Bùi Văn G',
    location: { lat: 22.4689, lng: 103.9801, address: 'Thôn Séo Mý, Xã Bản Vược' },
    phoneNumber: '0909789012',
    peopleCount: 3,
    description: 'Nước rút, hỗ trợ dọn dẹp',
    priority: 'low',
  },
];

// Trụ sở đội cứu hộ — Phường Lào Cai, TP Lào Cai
const RESCUE_TEAM_POS: [number, number] = [22.4856, 103.9707];

const priorityConfig = {
  critical: { label: 'Khẩn cấp', className: 'bg-red-50 text-red-700 border border-red-200' },
  high: { label: 'Cao', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  medium: { label: 'Trung bình', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  low: { label: 'Thấp', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

export default function RescueNavigation() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.missionId as string;

  const [mounted, setMounted] = useState(false);
  const [missionStarted, setMissionStarted] = useState(false);
  const [updates, setUpdates] = useState<FieldUpdateData[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [mission, setMission] = useState<(typeof ALL_MISSIONS)[0] | null>(null);

  useEffect(() => {
    setMounted(true);
    const found = ALL_MISSIONS.find((m) => m.id === missionId);
    if (found) setMission(found);
    else router.push('/rescue');
  }, [missionId, router]);

  const startMission = () => {
    setMissionStarted(true);
    const initialUpdate: FieldUpdateData = {
      missionId,
      status: 'en_route',
      message: 'Đội cứu hộ đã xuất phát, đang di chuyển đến hiện trường',
      timestamp: new Date(),
    };
    setUpdates([initialUpdate]);
  };

  const handleFieldUpdate = (update: FieldUpdateData) => {
    setUpdates((prev) => [update, ...prev]);
    if (update.status === 'completed') {
      alert('Nhiệm vụ hoàn thành! Cảm ơn đội cứu hộ.');
    }
  };

  const handleRouteFound = (distance: number, duration: number) => {
    setRouteInfo({ distance, duration });
  };

  if (!mounted || !mission) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Đang tải nhiệm vụ...</p>
        </div>
      </div>
    );
  }

  const destPos: [number, number] = [mission.location.lat, mission.location.lng];
  const priority = priorityConfig[mission.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Quay lại</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 justify-center">
            <Navigation className="h-4 w-4 text-blue-600" />
            Điều hướng cứu hộ
          </h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">#{missionId}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.className}`}>
              {priority.label}
            </span>
          </div>
        </div>

        <div className="w-20" />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative min-h-[280px] lg:min-h-0">
          <RescueMapWithRouting startPos={RESCUE_TEAM_POS} destPos={destPos} onRouteFound={handleRouteFound} />
        </div>

        {/* Sidebar */}
        <div className="lg:w-[380px] bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Thông tin người báo */}
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Thông tin nhiệm vụ
              </h2>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{mission.requesterName}</span>
                  <a
                    href={`tel:${mission.phoneNumber}`}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {mission.phoneNumber}
                  </a>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{mission.location.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span><span className="font-semibold text-slate-900">{mission.peopleCount}</span> người cần hỗ trợ</span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-sm text-slate-600 leading-relaxed">{mission.description}</p>
                </div>
              </div>
            </section>

            {/* Thông tin tuyến đường — Google Maps style */}
            <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              {/* Car icon — giống Google Maps */}
              <svg className="h-5 w-5 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                <circle cx="7.5" cy="14.5" r="1.5"/>
                <circle cx="16.5" cy="14.5" r="1.5"/>
              </svg>

              {routeInfo ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-slate-900">{routeInfo.duration} phút</span>
                  <span className="text-sm text-slate-400">·</span>
                  <span className="text-sm text-slate-500">{routeInfo.distance} km</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 animate-pulse">Đang tính tuyến đường...</span>
              )}

              {routeInfo && (
                <span className="ml-auto text-xs font-medium px-2 py-1 bg-blue-600 text-white rounded-lg">
                  Nhanh nhất
                </span>
              )}
            </div>

            {/* Cảnh báo */}
            <section>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1.5">Cảnh báo trên tuyến</p>
                  <ul className="space-y-1">
                    <li className="text-sm text-amber-700">Đèo Nậm Pung: nguy cơ sạt lở thấp</li>
                    <li className="text-sm text-amber-700">Đường trơn trượt sau mưa, đi chậm</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Hành động */}
            {!missionStarted ? (
              <Button
                onClick={startMission}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl font-semibold text-sm shadow-sm"
                size="lg"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Bắt đầu di chuyển
              </Button>
            ) : (
              <div className="space-y-4">
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