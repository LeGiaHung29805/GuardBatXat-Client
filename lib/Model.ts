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

export interface ApiResponse<T> {
    code: number;
    status: string;
    data: T;
}