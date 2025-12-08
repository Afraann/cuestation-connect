// src/utils/pricing.ts

export type PricingTier = {
  min: number;
  max: number;
  price: number;
};

export interface SessionSegment {
  durationMins: number;
  pricingTiers: PricingTier[];
}

/**
 * Calculates the bill based on a fixed lookup table.
 * Used to find the "Full Price" for a specific duration.
 */
export const calculateSessionBill = (
  durationInMinutes: number, 
  tiers: PricingTier[]
): number => {
  if (durationInMinutes <= 0 || !tiers || tiers.length === 0) return 0;

  // Round up to nearest minute for pricing lookup (standard billing practice)
  const durationToCheck = Math.ceil(durationInMinutes);

  const sortedTiers = [...tiers].sort((a, b) => a.min - b.min);

  const match = sortedTiers.find(
    (t) => durationToCheck >= t.min && durationToCheck <= t.max
  );

  if (match) {
    return match.price;
  }

  // Fallback: Use the price of the highest tier
  const lastTier = sortedTiers[sortedTiers.length - 1];
  if (durationToCheck > lastTier.max) {
    return lastTier.price;
  }

  return 0;
};

/**
 * Calculates the Weighted Average Bill.
 * Formula: Sum of ( (SegmentDuration / TotalDuration) * FullPriceForTotalDuration )
 */
export const calculateWeightedBill = (
  segments: SessionSegment[]
): number => {
  // 1. Calculate Total Duration from all segments
  const totalDuration = segments.reduce((sum, s) => sum + s.durationMins, 0);

  if (totalDuration <= 0) return 0;

  let totalBill = 0;

  // 2. Loop through each segment to calculate its weighted contribution
  segments.forEach((segment) => {
    // A. What would be the price if they played the *Entire Session* with this profile?
    const fullPriceForTotalTime = calculateSessionBill(totalDuration, segment.pricingTiers);

    // B. What fraction of the time did they actually use this profile?
    const weight = segment.durationMins / totalDuration;

    // C. Add the weighted portion to the total
    totalBill += fullPriceForTotalTime * weight;
  });

  // 3. Round to nearest integer
  return Math.round(totalBill);
};