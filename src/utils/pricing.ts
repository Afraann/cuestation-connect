// src/utils/pricing.ts

export type PricingTier = {
  min: number;
  max: number;
  price: number;
};

/**
 * Calculates the bill based on a fixed lookup table.
 * @param durationInMinutes - Total duration of the session
 * @param tiers - The JSON array from rate_profiles_test
 */
export const calculateSessionBill = (
  durationInMinutes: number, 
  tiers: PricingTier[]
): number => {
  // 1. Safety check
  if (durationInMinutes <= 0 || !tiers || tiers.length === 0) return 0;

  // 2. Sort tiers by time just to be safe
  const sortedTiers = [...tiers].sort((a, b) => a.min - b.min);

  // 3. Find the matching bracket
  const match = sortedTiers.find(
    (t) => durationInMinutes >= t.min && durationInMinutes <= t.max
  );

  if (match) {
    return match.price;
  }

  // 4. Handle "Out of Bounds" (Duration > Max Tier)
  // For now, let's fall back to the highest defined price + linear extrapolation
  // or just return the highest price.
  // Let's implement a safe fallback: Use the last tier's price
  const lastTier = sortedTiers[sortedTiers.length - 1];
  
  if (durationInMinutes > lastTier.max) {
    // OPTION A: Just return max price (Safest for now)
    return lastTier.price;

    // OPTION B (Advanced): Calculate extra time at the rate of the last bracket
    // const extraMins = durationInMinutes - lastTier.max;
    // const lastBracketDuration = lastTier.max - lastTier.min;
    // const ratePerMin = lastTier.price / (lastTier.max > 0 ? lastTier.max : 1); // Rough estimate
    // return lastTier.price + (extraMins * ratePerMin);
  }

  return 0;
};