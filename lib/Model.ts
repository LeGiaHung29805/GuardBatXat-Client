// lib/Model.ts

// ============= HEATMAP TYPES =============
// Dạng object (dùng trong API response)
export interface HeatmapPointObject {
  lat: number;
  lng: number;
  weight: number;
  severity?: string;
}

// Dạng mảng (dùng cho leaflet.heat)
export type HeatmapPointArray = [number, number, number];

// Type union cho linh hoạt
export type HeatmapPoint = HeatmapPointObject | HeatmapPointArray;

// Helper: chuyển đổi về dạng mảng
export function toHeatmapArray(point: HeatmapPoint): [number, number, number] {
  if (Array.isArray(point)) {
    return point;
  }
  return [point.lat, point.lng, point.weight];
}

// Helper: chuyển đổi mảng về dạng object
export function toHeatmapObject(point: HeatmapPointArray): HeatmapPointObject {
  return {
    lat: point[0],
    lng: point[1],
    weight: point[2],
    severity: point[2] > 0.8 ? 'high' : point[2] > 0.5 ? 'medium' : 'low'
  };
}

// ============= SHELTER TYPES =============
export interface SafeShelterRequest {
  currentLat: number;
  currentLng: number;
  strategy?: string;
}

export interface ShelterDestination {
  id: number;
  name: string;
  lat: number;
  lng: number;
  available_capacity: number;
}

export interface EvacuationOption {
  destination: ShelterDestination;
  route_coordinates: [number, number][];
  cost_value: number;
}

export interface SafeShelterResponseData {
  status: string;
  message: string;
  strategy_used: string;
  options: EvacuationOption[];
}

// ============= ROUTING TYPES =============
export interface RoutingRequest {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface RoutingResponseData {
  status: string;
  message: string;
  route_coordinates: [number, number][];
  total_mcdm_cost: number;
}

// ============= SOS TYPES =============
export interface SosRequest {
  senderPhone: string;
  message: string;
  lat: number;
  lng: number;
}

// ============= SAFETY CHECK TYPES =============
export interface LocationCheckRequest {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface LocationCheckResponse {
  isSafe: boolean;
  alertLevel: string;
  message: string;
  floodRiskStatus: string;
  landslideRiskStatus: string;
  floodDepth: number;
  aiLandslideProb: number;
  buildingType: string;
  distanceToWater: number;
  currentElevation: number;
}

// ============= GENERIC API RESPONSE =============
export interface ApiResponse<T> {
  code: number;
  status: string;
  data: T;
}

// ============= FIELD UPDATE TYPES (Cập nhật hiện trường) =============

/**
 * Trạng thái của nhiệm vụ cứu hộ
 */
export type MissionStatus = 'en_route' | 'arrived' | 'rescuing' | 'completed';

/**
 * Dữ liệu cập nhật hiện trường
 */
export interface FieldUpdateData {
  id?: string;
  missionId: string;
  status: MissionStatus;
  message: string;
  images?: string[];
  location?: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  reporterName?: string;
  reporterId?: string;
}

/**
 * Request gửi cập nhật hiện trường
 */
export interface SendFieldUpdateRequest {
  missionId: string;
  status: MissionStatus;
  message: string;
  images?: string[];
  lat?: number;
  lng?: number;
}

/**
 * Request cập nhật trạng thái nhiệm vụ
 */
export interface UpdateMissionStatusRequest {
  missionId: string;
  status: MissionStatus;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Response sau khi gửi cập nhật
 */
export interface FieldUpdateResponse {
  id: string;
  missionId: string;
  status: MissionStatus;
  message: string;
  timestamp: string;
}

/**
 * Danh sách các cập nhật của nhiệm vụ
 */
export interface MissionUpdatesResponse {
  missionId: string;
  updates: FieldUpdateData[];
  total: number;
}

// ============= RESCUE MISSION TYPES (Nhiệm vụ cứu hộ) =============

/**
 * Nhiệm vụ cứu hộ
 */
export interface RescueMission {
  id: string;
  sosId: string;
  rescueTeamId: string;
  teamName?: string;
  status: MissionStatus;
  assignedAt: Date;
  startedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Thống kê của đội cứu hộ
 */
export interface RescueTeamStats {
  totalMissions: number;
  completedMissions: number;
  inProgressMissions: number;
  averageResponseTime: number; // phút
  averageRescueTime: number; // phút
}

// ============= HELPER FUNCTIONS =============

/**
 * Lấy label hiển thị cho trạng thái
 */
export function getMissionStatusLabel(status: MissionStatus): string {
  const labels: Record<MissionStatus, string> = {
    en_route: 'Đang di chuyển',
    arrived: 'Đã đến hiện trường',
    rescuing: 'Đang cứu hộ',
    completed: 'Hoàn thành',
  };
  return labels[status];
}

/**
 * Lấy màu sắc cho trạng thái
 */
export function getMissionStatusColor(status: MissionStatus): string {
  const colors: Record<MissionStatus, string> = {
    en_route: 'bg-blue-100 text-blue-700',
    arrived: 'bg-green-100 text-green-700',
    rescuing: 'bg-orange-100 text-orange-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  return colors[status];
}

/**
 * Lấy icon cho trạng thái
 */
export function getMissionStatusIcon(status: MissionStatus): string {
  const icons: Record<MissionStatus, string> = {
    en_route: '🚑',
    arrived: '📍',
    rescuing: '🆘',
    completed: '✅',
  };
  return icons[status];
}