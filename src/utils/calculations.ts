import { LOCALITY_HUB_MATRIX, OFFICE_HUBS } from "../data/bengaluruData";
import type {
  BhkType,
  CommuteMode,
  ComputedProperty,
  OfficeHub,
  PriorityWeights,
  Property,
} from "../types/rental";

const WORKING_DAYS_PER_MONTH = 22;

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function getDefaultUtilities(bhk: BhkType, tankerSurchargeEst: number): number {
  const baseByBhk: Record<BhkType, number> = {
    "1BHK": 2400,
    "2BHK": 3200,
    "3BHK": 4200,
  };
  return baseByBhk[bhk] + tankerSurchargeEst;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateCommuteMetrics(
  property: Property,
  hubId: string,
  mode: CommuteMode
): {
  roadDistanceKm: number;
  peakCommuteMinutes: number;
  monthlyCommuteCost: number;
  monthlyTrafficHours: number;
} {
  const route = LOCALITY_HUB_MATRIX[property.locality]?.[hubId];
  const hub: OfficeHub | undefined = OFFICE_HUBS.find((h) => h.id === hubId);

  const straightKm = hub
    ? haversineKm(
        property.coordinates.lat,
        property.coordinates.lng,
        hub.coordinates.lat,
        hub.coordinates.lng
      )
    : 8;

  const baseDist = route ? route.distanceKm : Math.max(2.5, straightKm * 1.35);
  // Subtle micro-variation from property's exact coordinate offset
  const microOffsetKm = Math.max(-1.2, Math.min(1.8, (straightKm - baseDist * 0.68) * 0.35));
  const roadDistanceKm = Math.round(Math.max(1.5, baseDist + microOffsetKm) * 10) / 10;

  const baseCarMin = route ? route.baseCarMinutes : Math.round(roadDistanceKm * 3.1);
  const multiplier = route ? route.trafficMultiplier : 1.22;

  let peakCommuteMinutes = Math.round(baseCarMin * multiplier);
  let monthlyCommuteCost = 0;

  switch (mode) {
    case "Car": {
      peakCommuteMinutes = Math.max(8, Math.round(baseCarMin * multiplier + microOffsetKm * 1.4));
      // ₹11.5/km fuel + maintenance + ₹1,200 monthly office/hub parking
      const roundTripDailyCost = roadDistanceKm * 2 * 11.5;
      monthlyCommuteCost = Math.round((roundTripDailyCost * WORKING_DAYS_PER_MONTH + 1200) / 50) * 50;
      break;
    }
    case "Two-Wheeler": {
      // Lane filtering cuts Bengaluru peak traffic delay by ~28%
      peakCommuteMinutes = Math.max(7, Math.round(baseCarMin * multiplier * 0.72 + microOffsetKm));
      // ₹3.4/km fuel + service + ₹350 parking
      const roundTripDailyCost = roadDistanceKm * 2 * 3.4;
      monthlyCommuteCost = Math.round((roundTripDailyCost * WORKING_DAYS_PER_MONTH + 350) / 50) * 50;
      break;
    }
    case "Cab/Auto": {
      // Peak wait time + car traffic
      peakCommuteMinutes = Math.max(11, Math.round(baseCarMin * multiplier + 5 + microOffsetKm * 1.3));
      // ₹24/km + ₹35 surge/base per trip
      const perTripCost = Math.max(85, roadDistanceKm * 24 + 35);
      monthlyCommuteCost = Math.round((perTripCost * 2 * WORKING_DAYS_PER_MONTH) / 50) * 50;
      break;
    }
    case "Metro + Feeder": {
      const feederWalkOrAutoMin = Math.round(4 + property.nearbyDistances.metroKm * 4.5);
      const feederCostPerTrip = property.nearbyDistances.metroKm <= 1.0 ? 20 : 45;
      if (route?.metroAvailable && route.metroMinutes) {
        peakCommuteMinutes = Math.round(route.metroMinutes + feederWalkOrAutoMin);
        const metroFarePerTrip = Math.min(60, Math.max(20, Math.round(roadDistanceKm * 4.2)));
        monthlyCommuteCost =
          Math.round(((metroFarePerTrip + feederCostPerTrip) * 2 * WORKING_DAYS_PER_MONTH) / 50) *
          50;
      } else {
        // Non-metro corridor: BMTC AC Vajra / Shuttle + Auto feeder
        peakCommuteMinutes = Math.round(baseCarMin * multiplier * 1.08 + 7);
        const busAndFeederPerTrip = Math.round(45 + roadDistanceKm * 3.5);
        monthlyCommuteCost =
          Math.round((busAndFeederPerTrip * 2 * WORKING_DAYS_PER_MONTH) / 50) * 50;
      }
      break;
    }
  }

  const monthlyTrafficHours =
    Math.round(((peakCommuteMinutes * 2 * WORKING_DAYS_PER_MONTH) / 60) * 10) / 10;

  return {
    roadDistanceKm,
    peakCommuteMinutes,
    monthlyCommuteCost,
    monthlyTrafficHours,
  };
}

export function computePropertyMetrics(
  property: Property,
  hubId: string,
  mode: CommuteMode,
  maxBudget: number,
  weights: PriorityWeights
): ComputedProperty {
  const commute = calculateCommuteMetrics(property, hubId, mode);
  const estimatedUtilities = getDefaultUtilities(property.bhk, property.tankerSurchargeEst);
  const trueMonthlyCost =
    property.baseRent +
    property.maintenanceCharges +
    estimatedUtilities +
    commute.monthlyCommuteCost;

  // 1. Cost Score (0-100): compares TMCL against maxBudget
  const budgetRatio = trueMonthlyCost / Math.max(15000, maxBudget);
  let costScore: number;
  if (budgetRatio <= 0.72) {
    costScore = 98;
  } else if (budgetRatio <= 1.0) {
    // Smooth curve from 98 down to 78 at exact budget ceiling
    costScore = Math.round(98 - ((budgetRatio - 0.72) / 0.28) * 20);
  } else {
    // Sharp penalty above maxBudget
    costScore = Math.max(8, Math.round(78 - (budgetRatio - 1.0) * 140));
  }

  // 2. Commute Score (0-100): rewards shorter peakCommuteMinutes
  const mins = commute.peakCommuteMinutes;
  let commuteScore: number;
  if (mins <= 15) {
    commuteScore = 98;
  } else if (mins <= 25) {
    commuteScore = Math.round(98 - ((mins - 15) / 10) * 8); // 90-98
  } else if (mins <= 40) {
    commuteScore = Math.round(90 - ((mins - 25) / 15) * 22); // 68-90
  } else if (mins <= 60) {
    commuteScore = Math.round(68 - ((mins - 40) / 20) * 28); // 40-68
  } else {
    commuteScore = Math.max(12, Math.round(40 - (mins - 60) * 1.1));
  }

  // 3. Amenity & Livability Score (0-100)
  const waterPoints =
    property.waterReliability === "High"
      ? 34
      : property.waterReliability === "Moderate"
        ? 21
        : 9;
  const amenityPoints = Math.min(34, property.amenities.length * 5.8);
  const metroPoints = Math.max(
    4,
    Math.min(18, 18 - (property.nearbyDistances.metroKm - 0.5) * 2.4)
  );
  const essentialPoints = Math.max(
    4,
    14 - property.nearbyDistances.hospitalKm * 2.5 - property.nearbyDistances.supermarketKm * 3
  );
  const amenityScore = Math.min(
    99,
    Math.max(25, Math.round(waterPoints + amenityPoints + metroPoints + essentialPoints))
  );

  const totalWeight = Math.max(1, weights.cost + weights.commute + weights.amenities);
  const smartMatchScore = Math.round(
    (costScore * weights.cost +
      commuteScore * weights.commute +
      amenityScore * weights.amenities) /
      totalWeight
  );

  return {
    ...property,
    ...commute,
    estimatedUtilities,
    trueMonthlyCost,
    costScore,
    commuteScore,
    amenityScore,
    smartMatchScore,
    budgetDelta: trueMonthlyCost - maxBudget,
  };
}
