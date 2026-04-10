export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ScenarioLevel = "80m" | "82m" | "83.5m";

export interface HeatmapData {
  type: "flood" | "landslide";
  level: RiskLevel;
  affectedAreas: number;
  timestamp: string;
}

export interface DamageStats {
  housesFlooded: number;
  areaAffected: number; // km²
  populationEvacuated: number;
  roadsBlocked: number;
}

export interface NotificationLog {
  id: string;
  message: string;
  sentTo: number;
  timestamp: string;
  status: "sent" | "failed";
}