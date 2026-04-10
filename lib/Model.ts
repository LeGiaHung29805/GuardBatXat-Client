export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  severity: string;
}
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
export interface RoutingRequest {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
}

export interface RoutingResponseData {
    status: string;
    message: string;
    route_coordinates: [number, number][]; // Mảng tọa độ đường đi
    total_mcdm_cost: number;
}
export interface EvacuationOption {
    destination: ShelterDestination;
    route_coordinates: [number, number][]; // Mảng chứa các cặp tọa độ [vĩ độ, kinh độ]
    cost_value: number;
}

export interface SafeShelterResponseData {
    status: string;
    message: string;
    strategy_used: string;
    options: EvacuationOption[];
}
export interface SosRequest {
    senderPhone: string;
    message: string;
    lat: number;
    lng: number;
}
export interface LocationCheckRequest {
    latitude: number;
    longitude: number;
    address?: string;
}
export interface LocationCheckResponse {
    isSafe: boolean;
    alertLevel: string; // SAFE, WARNING, DANGER
    message: string;
    floodRiskStatus: string;
    landslideRiskStatus: string;
    floodDepth: number;
    aiLandslideProb: number;
    aiFloodProb: number;
    buildingType: string;
    distanceToWater: number;
    currentElevation: number;
}
export interface ApiResponse<T> {
    code: number;
    status: string;
    data: T;
}