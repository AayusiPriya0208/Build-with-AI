export type LocalityName =
  | "Whitefield"
  | "Sarjapur Road"
  | "Bellandur"
  | "Marathahalli"
  | "Electronic City";

export type BhkType = "1BHK" | "2BHK" | "3BHK";

export type WaterReliability = "High" | "Moderate" | "Tanker Dependent";

export type CommuteMode = "Car" | "Two-Wheeler" | "Cab/Auto" | "Metro + Feeder";

export interface HistoricalTrendPoint {
  month: string;
  avgRent: number;
}

export interface Property {
  id: string;
  name: string;
  societyName: string;
  locality: LocalityName;
  bhk: BhkType;
  areaSqFt: number;
  baseRent: number;
  maintenanceCharges: number;
  securityDeposit: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  amenities: string[];
  nearbyDistances: {
    metroKm: number;
    hospitalKm: number;
    supermarketKm: number;
  };
  waterReliability: WaterReliability;
  tankerSurchargeEst: number;
  historicalTrends: HistoricalTrendPoint[];
  highlightNote: string;
}

export interface OfficeHub {
  id: string;
  name: string;
  shortName: string;
  area: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  metroConnected: boolean;
}

export interface LocalityHubRoute {
  distanceKm: number;
  baseCarMinutes: number;
  trafficMultiplier: number;
  metroAvailable: boolean;
  metroMinutes?: number;
}

export interface PriorityWeights {
  cost: number;
  commute: number;
  amenities: number;
}

export interface ComputedProperty extends Property {
  roadDistanceKm: number;
  peakCommuteMinutes: number;
  monthlyCommuteCost: number;
  monthlyTrafficHours: number;
  estimatedUtilities: number;
  trueMonthlyCost: number;
  costScore: number;
  commuteScore: number;
  amenityScore: number;
  smartMatchScore: number;
  budgetDelta: number;
}

export interface SimulatorParams {
  propertyId: string;
  utilitiesCost: number;
  maidCookCost: number;
  tankerBuffer: number;
  commuteMode: CommuteMode;
  includeDepositOpportunityCost: boolean;
}

export interface AITradeoffExplanation {
  propertyId: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
