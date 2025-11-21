import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { assessAmplificationFromImpedance } from "@/lib/audio-calculations";
import { calculateBudgetRange } from "@/lib/budget-ranges";
import {
  calculateExpertScore,
  gradeToNumeric as gradeToNumeric10Scale,
  type ScoringComponent,
} from "@/lib/crinacle-scoring";
import { getCached, generateCacheKey } from "@/lib/cache-recommendations";

// Caching enabled via Vercel Data Cache (unstable_cache)
// 10-minute TTL balances freshness with performance
// Cache persists across deployments and serverless instances

// Enhanced component interface for recommendations
interface RecommendationComponent {
  id: string;
  name: string;
  brand: string;
  category: string;
  price_new?: number;
  price_used_min?: number;
  price_used_max?: number;
  budget_tier?: string;
  sound_signature?: string;
  use_cases?: string[];
  impedance?: number;
  sensitivity?: number;
  power_required_mw?: number;
  voltage_required_v?: number;
  needs_amp?: boolean;
  amazon_url?: string;
  why_recommended?: string;
  image_url?: string;
  // Expert analysis fields (Crinacle data)
  crin_signature?: string;
  crin_tone?: string;
  crin_tech?: string;
  expert_grade_numeric?: number;
  crin_comments?: string;
  driver_type?: string;
  fit?: string;
  crin_rank?: string; // Letter grade: S+, S, S-, A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F
  crin_value?: number;
  asr_sinad?: number;
  // Amp specific
  power_output?: string;
  // Used listings
  usedListingsCount?: number; // Number of active used listings
  // Computed fields
  avgPrice: number;
  synergyScore: number;
  compatibilityScore?: number;
  powerAdequacy?: number;
  amplificationAssessment?: {
    difficulty:
      | "easy"
      | "moderate"
      | "demanding"
      | "very_demanding"
      | "unknown";
    explanation: string;
    estimatedSensitivity?: number;
  };
}

interface RecommendationRequest {
  budget: number;
  budgetRangeMin: number;
  budgetRangeMax: number;
  headphoneType: string;
  wantRecommendationsFor: {
    headphones: boolean;
    dac: boolean;
    amp: boolean;
    combo: boolean;
  };
  existingGear: {
    headphones: boolean;
    dac: boolean;
    amp: boolean;
    combo: boolean;
    specificModels: {
      headphones: string;
      dac: string;
      amp: string;
      combo: string;
    };
  };
  usage: string;
  usageRanking: string[];
  excludedUsages: string[];
  soundSignatures: string[]; // Array for multi-select support
  powerNeeds?: string;
  connectivity?: string[];
  usageContext?: string;
  existingHeadphones?: string;
  optimizeAroundHeadphones?: string;
  driverType?: string;
}

// Convert letter grades to numeric for quality gating
function gradeToNumeric(grade: string | null | undefined): number | null {
  if (!grade) return null;

  const gradeMap: Record<string, number> = {
    "S+": 4.3,
    S: 4.0,
    "S-": 3.7,
    "A+": 4.0,
    A: 3.7,
    "A-": 3.3,
    "B+": 3.0,
    B: 2.7,
    "B-": 2.3,
    "C+": 2.0,
    C: 1.7,
    "C-": 1.3,
    "D+": 1.0,
    D: 0.7,
    "D-": 0.3,
    F: 0,
  };

  // Clean the grade string
  const cleanGrade = grade.trim().toUpperCase();
  return gradeMap[cleanGrade] ?? null;
}

// Sound signature synergy scoring with detailed Crinacle signatures
function calculateSynergyScore(
  component: unknown,
  soundSignatures: string[]
): number {
  const comp = component as {
    sound_signature?: string;
    crin_signature?: string;
  };

  // Sound signature matching only - usage matching removed
  let score = 0;

  // If multiple signatures selected, check if component matches ANY (OR logic)
  // Use best match among selected signatures
  let bestSoundScore = 0;

  for (const soundSig of soundSignatures) {
    // If user didn't specify signature preference, assume neutral
    const effectiveSignature = soundSig !== "any" ? soundSig : "neutral";

    // Component 1: Sound Signature Match (max 50% weight - INCREASED)
    let soundScore = 0;
    if (comp.sound_signature && effectiveSignature !== "any") {
      if (comp.sound_signature === effectiveSignature) {
        soundScore = 0.35; // Perfect basic match (was 0.20)
      } else if (
        effectiveSignature === "neutral" &&
        comp.sound_signature === "balanced"
      ) {
        soundScore = 0.28; // Close match (was 0.16)
      } else if (
        (effectiveSignature === "warm" && comp.sound_signature === "neutral") ||
        (effectiveSignature === "bright" && comp.sound_signature === "neutral")
      ) {
        soundScore = 0.2; // Compatible match (was 0.12)
      } else {
        soundScore = 0.08; // Has signature but doesn't match (was 0.05)
      }
    } else {
      soundScore = 0.15; // No signature = neutral baseline (was 0.10)
    }

    // Detailed Crinacle signature adds to sound score
    if (comp.crin_signature && effectiveSignature !== "any") {
      const detailedMatch = getDetailedSignatureMatch(
        comp.crin_signature,
        effectiveSignature
      );
      soundScore += detailedMatch * 0.15; // Up to +15% for detailed match (was 0.10)
    }

    // Keep the best score from any matched signature (OR logic)
    bestSoundScore = Math.max(bestSoundScore, soundScore);
  }

  score += Math.min(0.5, bestSoundScore); // Cap at 50%

  // Usage matching removed - not differentiated enough to be useful
  // "Music" works for almost everything, "gaming" needs soundstage data we don't have,
  // and sound signature already captures the important tonal preferences

  // Total from synergy: max 50% (sound signature matching only)
  return Math.min(1, score);
}

// Detailed signature matching with partial scoring
function getDetailedSignatureMatch(crinSig: string, userPref: string): number {
  if (!crinSig || !userPref) return 0;

  const exactMatches: Record<string, Record<string, number>> = {
    neutral: {
      Neutral: 1.0,
      "Bass-rolled neutral": 0.85,
      "Warm neutral": 0.75,
      "Bright neutral": 0.75,
      "Harman neutral": 0.9,
      "DF-neutral": 0.85,
      "Dark neutral": 0.8,
      '"""Balanced"""': 0.8,
    },
    bright: {
      "Bright neutral": 1.0,
      Bright: 0.95,
      Neutral: 0.7,
      "Bass-rolled neutral": 0.5, // Less bass = more apparent brightness (more accurate)
    },
    warm: {
      "Warm neutral": 1.0,
      Warm: 0.95,
      "Warm V-shape": 0.85,
      "Warm U-shape": 0.8,
      Neutral: 0.6,
      "Neutral with bass boost": 0.8, // Better match for warm preference
      "Dark neutral": 0.9,
    },
    fun: {
      "V-shaped": 1.0,
      "U-shaped": 0.95,
      "Warm V-shape": 0.9,
      "Mild V-shape": 0.85,
      "Neutral with bass boost": 0.7,
      "Mid-centric": 0.3,
    },
  };

  return exactMatches[userPref]?.[crinSig] || 0;
}

// Helper: Check if components are available in a budget range
async function checkComponentAvailability(
  category: string,
  minPrice: number,
  maxPrice: number
): Promise<number> {
  const { count } = await supabaseServer
    .from("components")
    .select("id", { count: "exact", head: true })
    .eq("category", category)
    .gte("price_used_min", minPrice)
    .lte("price_used_max", maxPrice);

  return count || 0;
}

// Calculate budget allocation with smart redistribution
async function allocateBudgetAcrossComponents(
  totalBudget: number,
  requestedComponents: string[],
  existingGear: RecommendationRequest["existingGear"],
  rangeMin: number = 20,
  rangeMax: number = 10
): Promise<Record<string, number>> {
  const allocation: Record<string, number> = {};

  // V3: Dynamic budget caps that scale with total budget
  // Removed hard $2K/$3K caps that stranded money at high-end budgets
  const componentBudgetCaps = {
    headphones: totalBudget * 0.9, // Headphones can take most budget
    dac: totalBudget * 0.4,         // DACs up to 40% (was capped at $2K)
    amp: totalBudget * 0.4,         // Amps up to 40% (was capped at $2K)
    combo: totalBudget * 0.6,       // Combos up to 60% (was capped at $3K)
  };

  // Price ratios adjusted for existing gear
  const priceRatios = {
    headphones: existingGear?.headphones ? 0.6 : 0.5,
    dac: existingGear?.dac ? 0.3 : 0.2,
    amp: existingGear?.amp ? 0.3 : 0.2,
    combo: existingGear?.combo ? 0.5 : 0.35,
  };

  // Special handling: If combo is requested alongside DAC/amp, give combo the combined budget
  const hasCombo = requestedComponents.includes("combo");
  const hasDac = requestedComponents.includes("dac");
  const hasAmp = requestedComponents.includes("amp");

  if (hasCombo && (hasDac || hasAmp)) {
    // Remove DAC and amp from requested components - combo replaces them
    const filteredComponents = requestedComponents.filter(
      (c) => c !== "dac" && c !== "amp"
    );
    // Calculate what DAC + amp budgets would have been
    const dacRatio = priceRatios.dac;
    const ampRatio = priceRatios.amp;
    const combinedSignalGearRatio = dacRatio + ampRatio;
    // Give that combined budget to combo
    priceRatios.combo = combinedSignalGearRatio;
    requestedComponents = filteredComponents;
  }

  // Single component gets full budget (respects caps)
  if (requestedComponents.length === 1) {
    const component = requestedComponents[0];
    const cap =
      componentBudgetCaps[component as keyof typeof componentBudgetCaps] ||
      totalBudget;
    allocation[component] = Math.min(totalBudget, cap);
    return allocation;
  }

  // Calculate initial proportional allocation
  const totalRatio = requestedComponents.reduce((sum, comp) => {
    return sum + (priceRatios[comp as keyof typeof priceRatios] || 0.25);
  }, 0);

  const initialAllocation: Record<string, number> = {};
  requestedComponents.forEach((component) => {
    const ratio = priceRatios[component as keyof typeof priceRatios] || 0.25;
    const proportionalBudget = Math.floor(totalBudget * (ratio / totalRatio));
    const cap =
      componentBudgetCaps[component as keyof typeof componentBudgetCaps] ||
      totalBudget;
    initialAllocation[component] = Math.min(proportionalBudget, cap);
  });

  // Check availability for each component and redistribute if needed
  const componentsWithNoResults: string[] = [];
  const categoryMap: Record<string, string> = {
    headphones: "cans", // Will also check 'iems'
    dac: "dac",
    amp: "amp",
    combo: "dac_amp",
  };

  for (const component of requestedComponents) {
    const componentBudget = initialAllocation[component];

    // Entry-level budget handling: For very low budgets, allow ultra-budget options
    // Examples: Apple dongle ($9), budget IEMs ($10-30), budget headphones ($20-50)
    let searchMin: number;
    let searchMax: number;

    if (
      totalBudget <= 150 &&
      (component === "dac" || component === "amp" || component === "combo")
    ) {
      // For entry-level total budgets with signal gear, start from $5 to include dongles
      searchMin = 5;
      searchMax = Math.round(componentBudget * (1 + rangeMax / 100));
    } else {
      // Standard behavior for higher budgets
      searchMin = Math.max(
        20,
        Math.round(componentBudget * (1 - rangeMin / 100))
      );
      searchMax = Math.round(componentBudget * (1 + rangeMax / 100));
    }

    let count = 0;
    if (component === "headphones") {
      // Check both cans and iems
      const cansCount = await checkComponentAvailability(
        "cans",
        searchMin,
        searchMax
      );
      const iemsCount = await checkComponentAvailability(
        "iems",
        searchMin,
        searchMax
      );
      count = cansCount + iemsCount;
    } else {
      const category = categoryMap[component];
      if (category) {
        count = await checkComponentAvailability(
          category,
          searchMin,
          searchMax
        );
      }
    }

    if (count === 0) {
      componentsWithNoResults.push(component);
    }
  }

  // Redistribute budget from components with no results
  if (
    componentsWithNoResults.length > 0 &&
    componentsWithNoResults.length < requestedComponents.length
  ) {
    const componentsWithResults = requestedComponents.filter(
      (c) => !componentsWithNoResults.includes(c)
    );
    const budgetToRedistribute = componentsWithNoResults.reduce(
      (sum, comp) => sum + initialAllocation[comp],
      0
    );

    // Distribute the freed budget proportionally among components that have results
    const redistributionRatio = componentsWithResults.reduce((sum, comp) => {
      return sum + (priceRatios[comp as keyof typeof priceRatios] || 0.25);
    }, 0);

    componentsWithResults.forEach((component) => {
      const ratio = priceRatios[component as keyof typeof priceRatios] || 0.25;
      const additionalBudget = Math.floor(
        budgetToRedistribute * (ratio / redistributionRatio)
      );
      const cap =
        componentBudgetCaps[component as keyof typeof componentBudgetCaps] ||
        totalBudget;
      allocation[component] = Math.min(
        initialAllocation[component] + additionalBudget,
        cap
      );
    });

    // Still include the components with no results (allocated $0 or minimal)
    componentsWithNoResults.forEach((component) => {
      allocation[component] = 0;
    });
  } else {
    // No redistribution needed - use initial allocation
    Object.assign(allocation, initialAllocation);
  }

  return allocation;
}

// Power matching for amps based on existing headphones
function calculatePowerCompatibility(
  amp: RecommendationComponent,
  headphones: {
    impedance?: number;
    sensitivity?: number;
    power_required_mw?: number;
    voltage_required_v?: number;
    name?: string;
  }
): number {
  if (!headphones.impedance && !headphones.sensitivity) return 0.5;

  // If we have power requirements, check if amp can meet them
  if (headphones.power_required_mw && amp.power_output) {
    // Parse power output (e.g., "500mW @ 32Ω")
    const powerMatch = amp.power_output.match(/(\d+)mW.*?(\d+)[Ωohm]/i);
    if (powerMatch) {
      const ampPower = parseInt(powerMatch[1]);
      const ampImpedance = parseInt(powerMatch[2]);

      // Rough power scaling based on impedance
      const scaledPower =
        ampPower * (ampImpedance / (headphones.impedance || 32));

      if (scaledPower >= headphones.power_required_mw * 1.5) {
        return 1.0; // Excellent match - 50% headroom
      } else if (scaledPower >= headphones.power_required_mw) {
        return 0.8; // Good match
      } else if (scaledPower >= headphones.power_required_mw * 0.7) {
        return 0.5; // Marginal
      } else {
        return 0.2; // Insufficient
      }
    }
  }

  // Fallback to impedance-based assessment
  const assessment = assessAmplificationFromImpedance(
    headphones.impedance ?? null,
    null,
    headphones.name,
    ""
  );

  const difficultyScores = {
    easy: 0.3,
    moderate: 0.6,
    demanding: 0.8,
    very_demanding: 1.0,
    unknown: 0.5,
  };

  return difficultyScores[assessment.difficulty];
}

// V3: Filter and score with performance-first prioritization
function filterAndScoreComponents(
  components: unknown[],
  budget: number,
  soundSignatures: string[], // Array for multi-select with OR logic
  primaryUsage: string,
  maxOptions: number,
  driverType?: string,
  existingHeadphones?: {
    impedance?: number;
    sensitivity?: number;
    power_required_mw?: number;
    voltage_required_v?: number;
    name?: string;
  },
  totalBudget?: number, // Added to support entry-level handling
  rangeMinPercent?: number, // V3: User's desired range below budget
  rangeMaxPercent?: number  // V3: User's desired range above budget
): RecommendationComponent[] {
  // Entry-level budget handling: For DACs/amps/combos under $150 total, allow dongles from $5
  const componentCategory = (components[0] as { category?: string })?.category;
  const isSignalGear = componentCategory
    ? ["dac", "amp", "dac_amp"].includes(componentCategory)
    : false;

  // V3: Budget ranges with user parameter support and smooth transitions
  const budgetRange = calculateBudgetRange(
    budget,
    rangeMinPercent,
    rangeMaxPercent,
    isSignalGear
  );
  const minAcceptable = budgetRange.min;
  const maxAcceptable = budgetRange.max;

  return components
    .map((c) => {
      const component = c as {
        price_used_min?: number;
        price_used_max?: number;
        category?: string;
        impedance?: number;
        sensitivity?: number;
        power_required_mw?: number;
        voltage_required_v?: number;
        needs_amp?: boolean;
        name?: string;
        brand?: string;
        crin_rank?: string;
        crin_tone?: string;
        crin_tech?: string;
        expert_grade_numeric?: number;
        crin_value?: number;
        driver_type?: string;
        power_output?: string;
        [key: string]: unknown;
      };

      const avgPrice =
        ((component.price_used_min || 0) + (component.price_used_max || 0)) / 2;

      // Only calculate synergy for headphones/IEMs (sound signature is meaningful)
      // DACs/amps/combos get neutral score since they should be transparent
      const synergyScore =
        component.category === "cans" || component.category === "iems"
          ? calculateSynergyScore(component, soundSignatures)
          : 0.25; // Neutral score for DACs/amps (25% = middle of 0-50% range)

      // Convert letter grades to numeric if not already done (keep for backwards compatibility)
      const toneGradeNumeric =
        component.expert_grade_numeric ?? gradeToNumeric(component.crin_tone);
      const technicalGradeNumeric = gradeToNumeric(component.crin_tech);

      // Calculate comprehensive expert score using new scoring system (0-10)
      const expertScore = calculateExpertScore({
        crin_rank: component.crin_rank,
        crin_tone: component.crin_tone,
        crin_tech: component.crin_tech,
        crin_value: component.crin_value,
      });

      // Calculate power compatibility for amps
      let powerAdequacy = 0.5;
      if (component.category === "amp" && existingHeadphones) {
        powerAdequacy = calculatePowerCompatibility(
          { ...component, avgPrice, synergyScore } as RecommendationComponent,
          existingHeadphones
        );
      }

      return {
        ...component,
        avgPrice,
        synergyScore,
        powerAdequacy,
        expert_grade_numeric: toneGradeNumeric,
        expertScore, // Add comprehensive expert score (0-10)
        // Add amplification assessment for headphones
        ...(component.category === "cans" || component.category === "iems"
          ? {
              amplificationAssessment: assessAmplificationFromImpedance(
                component.impedance ?? null,
                component.needs_amp ?? null,
                component.name,
                component.brand
              ),
            }
          : {}),
      } as RecommendationComponent & { expertScore: number };
    })
    .filter((c, index, arr) => {
      // Remove duplicates
      const key = `${c.name}|${c.brand}`;
      return (
        arr.findIndex((item) => `${item.name}|${item.brand}` === key) === index
      );
    })
    .filter((c) => {
      // Driver type filtering for enthusiasts
      if (driverType && driverType !== "any" && c.driver_type) {
        if (c.driver_type.toLowerCase() !== driverType.toLowerCase()) {
          return false;
        }
      }

      // V3 BUDGET FILTERING (Fixed double-buffering issue)
      // Only use the budget range calculated from user parameters
      // Removed isAffordable check that added extra 15% buffer
      const isInRange =
        c.avgPrice <= maxAcceptable && c.avgPrice >= minAcceptable;

      // Ensure price range is reasonable (not $100-$500 spread on $150 item)
      const hasReasonableRange =
        (c.price_used_max || 0) - (c.price_used_min || 0) <= c.avgPrice * 2.5;

      return isInRange && hasReasonableRange;
    })
    .map((comp) => {
      // V3.1 SCORING ALGORITHM
      // Priority order: Performance (65%) > Sound Signature (25%) > Value (10%)
      // Signature bonus multiplier: 1.2x when signature matches

      // 1. EXPERT PERFORMANCE SCORE (65% weight)
      // Uses Crinacle rank/tone/tech/value or ASR measurements
      const expertScoreValue =
        (comp as unknown as { expertScore?: number }).expertScore ?? 5.0; // 0-10 scale
      const expertScore = expertScoreValue / 10; // Normalize to 0-1

      // 2. SOUND SIGNATURE MATCH (25% weight + 1.2x bonus multiplier)
      // User's preference alignment (neutral/warm/bright/fun)
      const signatureScore = comp.synergyScore || 0.25; // 0-0.5 range, default neutral

      // Apply 1.2x bonus multiplier when signature score is high (>0.35 = good match)
      const signatureBonus = signatureScore > 0.35 ? 1.2 : 1.0;

      // 3. VALUE-FOR-MONEY SCORE (10% weight)
      // Reward under-budget items at same performance tier
      // Linear scoring: items at 50-100% of budget get proportional value score
      let valueScore = 0;
      const priceRatio = comp.avgPrice / budget;

      if (comp.avgPrice <= budget) {
        // Under budget: Linear scale from 0.5 to 1.0
        // 50% of budget = 0.5 score, 75% = 0.75, 100% = 1.0
        valueScore = Math.max(0.5, priceRatio);
      } else {
        // Over budget: Steep penalty (should already be filtered out)
        const overageRatio = (comp.avgPrice - budget) / budget;
        valueScore = Math.max(0, 1 - overageRatio * 2);
      }

      // 4. POWER ADEQUACY BONUS (for amps only, max +5%)
      const powerBonus =
        comp.category === "amp" ? (comp.powerAdequacy || 0.5) * 0.05 : 0;

      // FINAL SCORE CALCULATION
      // Expert: 65% + Signature: 25% + Value: 10% + Power bonus: 0-5%
      // Then apply signature bonus multiplier (1.0x or 1.2x)
      const rawScore =
        (expertScore * 0.65 +
        signatureScore * 0.25 +
        valueScore * 0.10 +
        powerBonus) * signatureBonus;

      // Convert to 0-100 percentage (cap at 1.0 after bonus)
      const matchScore = Math.min(1, rawScore);

      return {
        ...comp,
        matchScore: Math.round(matchScore * 100), // Convert to percentage (0-100)
        valueScore: Math.round(valueScore * 100), // Value-for-money score (0-100)
        expertScoreDisplay: Math.round(expertScore * 100), // Expert quality score (0-100)
        signatureScoreDisplay: Math.round(signatureScore * 100), // Signature match score (0-100)
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxOptions);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const budgetParam = searchParams.get("budget") || "300";
    const budgetRangeMinParam = searchParams.get("budgetRangeMin") || "20";
    const budgetRangeMaxParam = searchParams.get("budgetRangeMax") || "10";
    const headphoneTypeParam = searchParams.get("headphoneType") || "cans";

    // Parse sound signatures - support both array (soundSignatures) and legacy single (sound)
    const soundSignaturesParam = searchParams.get("soundSignatures");
    let soundSignatures: string[] = ["neutral"]; // Default
    if (soundSignaturesParam) {
      try {
        const parsed = JSON.parse(soundSignaturesParam);
        soundSignatures =
          Array.isArray(parsed) && parsed.length > 0 ? parsed : ["neutral"];
      } catch {
        // Not JSON, treat as comma-separated
        soundSignatures = soundSignaturesParam.split(",").filter(Boolean);
        if (soundSignatures.length === 0) soundSignatures = ["neutral"];
      }
    } else {
      // Fall back to legacy 'sound' param
      const legacySound = searchParams.get("sound");
      if (legacySound && legacySound !== "any") {
        soundSignatures = [legacySound];
      }
    }

    const driverTypeParam = searchParams.get("driverType") || "any";

    // Validate parameters
    const budget = parseInt(budgetParam);
    if (isNaN(budget) || budget < 20 || budget > 50000) {
      return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
    }

    const budgetRangeMin = parseInt(budgetRangeMinParam);
    const budgetRangeMax = parseInt(budgetRangeMaxParam);

    // Parse JSON parameters
    let wantRecommendationsFor,
      existingGear,
      usageRanking,
      excludedUsages,
      connectivity,
      customBudgetAllocation;

    try {
      wantRecommendationsFor = JSON.parse(
        searchParams.get("wantRecommendationsFor") || '{"headphones":true}'
      );
      existingGear = JSON.parse(searchParams.get("existingGear") || "{}");
      usageRanking = JSON.parse(
        searchParams.get("usageRanking") || '["Music"]'
      );
      excludedUsages = JSON.parse(searchParams.get("excludedUsages") || "[]");
      connectivity = JSON.parse(searchParams.get("connectivity") || "[]");
      customBudgetAllocation = searchParams.get("customBudgetAllocation")
        ? JSON.parse(searchParams.get("customBudgetAllocation")!)
        : null;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON parameters" },
        { status: 400 }
      );
    }

    const req: RecommendationRequest = {
      budget,
      budgetRangeMin,
      budgetRangeMax,
      headphoneType: headphoneTypeParam,
      wantRecommendationsFor,
      existingGear,
      usage: searchParams.get("usage") || "music",
      usageRanking,
      excludedUsages,
      soundSignatures, // Use the parsed array
      powerNeeds: searchParams.get("powerNeeds") || "",
      connectivity,
      usageContext: searchParams.get("usageContext") || "",
      existingHeadphones: searchParams.get("existingHeadphones") || "",
      optimizeAroundHeadphones:
        searchParams.get("optimizeAroundHeadphones") || "",
      driverType: driverTypeParam,
    };

    // Generate cache key for this query
    const cacheKey = generateCacheKey({
      budget: req.budget,
      soundSignatures: req.soundSignatures,
      headphoneType: req.headphoneType,
      wantRecommendationsFor: req.wantRecommendationsFor,
    });

    // Wrap recommendation generation in cache
    const results = await getCached(cacheKey, async () => {
      // Return more items to enable frontend "Show More" functionality
      const maxOptions = 50; // Reasonable limit to prevent performance issues

      // Get requested components
      const requestedComponents = Object.entries(req.wantRecommendationsFor)
        .filter(([, wanted]) => wanted)
        .map(([component]) => component);

      // Calculate budget allocation with smart redistribution
      // Use custom allocation if provided, otherwise use smart allocation
      let budgetAllocation: Record<string, number>;
      const customRanges: Record<string, { min: number; max: number }> = {};

      if (customBudgetAllocation) {
        // Extract amounts from custom allocation
        budgetAllocation = {};
        Object.entries(customBudgetAllocation).forEach(([component, data]) => {
          const allocationData = data as {
            amount: number;
            rangeMin?: number;
            rangeMax?: number;
          };
          budgetAllocation[component] = allocationData.amount;
          // Store custom ranges if provided
          if (
            allocationData.rangeMin !== undefined ||
            allocationData.rangeMax !== undefined
          ) {
            customRanges[component] = {
              min: allocationData.rangeMin ?? req.budgetRangeMin,
              max: allocationData.rangeMax ?? req.budgetRangeMax,
            };
          }
        });
      } else {
        // Use smart allocation
        budgetAllocation = await allocateBudgetAcrossComponents(
          req.budget,
          requestedComponents,
          req.existingGear,
          req.budgetRangeMin,
          req.budgetRangeMax
        );
      }

      const results: {
        cans: RecommendationComponent[];
        iems: RecommendationComponent[];
        dacs: RecommendationComponent[];
        amps: RecommendationComponent[];
        combos: RecommendationComponent[];
        budgetAllocation: Record<string, number>;
        needsAmplification: boolean;
      } = {
        cans: [],
        iems: [],
        dacs: [],
        amps: [],
        combos: [],
        budgetAllocation,
        needsAmplification: false,
      };

      // Build query for all components
      const requestedCategories: string[] = [];

      if (req.wantRecommendationsFor.headphones) {
        if (req.headphoneType === "cans") {
          requestedCategories.push("cans");
        } else if (req.headphoneType === "iems") {
          requestedCategories.push("iems");
        } else {
          requestedCategories.push("cans", "iems");
        }
      }

      if (req.wantRecommendationsFor.dac) {
        requestedCategories.push("dac");
      }

      if (req.wantRecommendationsFor.amp) {
        requestedCategories.push("amp");
      }

      if (req.wantRecommendationsFor.combo) {
        requestedCategories.push("dac_amp");
      }

      // Fetch components
      const { data: allComponentsData, error } = await supabaseServer
        .from("components")
        .select("*")
        .in("category", requestedCategories)
        .order("price_used_min");

      if (error) throw error;

      // Fetch active used listings counts separately
      const componentIds = allComponentsData?.map((c) => c.id) || [];
      console.log('🔍 DEBUG: Fetching listings for', componentIds.length, 'components');

      // Build query with same filters as /api/used-listings
      console.log('🌍 DEBUG: NODE_ENV =', process.env.NODE_ENV);

      const { data: listingCounts, error: listingsError } = await supabaseServer
        .from("used_listings")
        .select("component_id, url, title")
        .eq("is_active", true)
        .in("component_id", componentIds);

      if (listingsError) {
        console.error('❌ DEBUG: Error fetching listings:', listingsError);
      }

      console.log('📦 DEBUG: Raw listing counts from DB (before filter):', listingCounts?.length, 'listings');

      // Filter out sample/demo listings in application code (more reliable than SQL)
      const filteredListings = listingCounts?.filter(listing => {
        const urlLower = (listing.url || '').toLowerCase();
        const titleLower = (listing.title || '').toLowerCase();
        const isSampleOrDemo =
          urlLower.includes('sample') ||
          urlLower.includes('demo') ||
          titleLower.includes('sample') ||
          titleLower.includes('demo');
        return !isSampleOrDemo;
      }) || [];

      console.log('🧹 DEBUG: Filtered listing counts (after sample/demo filter):', filteredListings.length, 'listings');
      console.log('📊 DEBUG: First 5 filtered listings:', filteredListings.slice(0, 5));

      // Build count map from filtered listings
      const countMap = new Map<string, number>();
      filteredListings.forEach((listing) => {
        countMap.set(
          listing.component_id,
          (countMap.get(listing.component_id) || 0) + 1
        );
      });

      console.log('🗺️ DEBUG: Count map size:', countMap.size, 'unique components with listings');

      // Log components with high counts (>5 listings)
      const highCountComponents = Array.from(countMap.entries())
        .filter(([_, count]) => count > 5)
        .map(([id, count]) => {
          const comp = allComponentsData?.find(c => c.id === id);
          return { id, count, name: comp ? `${comp.brand} ${comp.name}` : 'unknown' };
        });

      if (highCountComponents.length > 0) {
        console.log('⚠️ DEBUG: Components with >5 listings:', highCountComponents);
      }

      // Transform data to add used listings count
      const transformedComponents = allComponentsData?.map((comp) => ({
        ...comp,
        usedListingsCount: countMap.get(comp.id) || 0,
      }));

      // Get existing headphones data for amp matching
      let existingHeadphonesData = null;
      if (req.wantRecommendationsFor.amp && req.existingHeadphones) {
        const { data } = await supabaseServer
          .from("components")
          .select(
            "impedance, sensitivity, power_required_mw, voltage_required_v, name"
          )
          .ilike("name", `%${req.existingHeadphones}%`)
          .limit(1);

        existingHeadphonesData = data?.[0] || null;
      }

      if (transformedComponents) {
        const componentsByCategory = {
          cans: transformedComponents.filter((c) => c.category === "cans"),
          iems: transformedComponents.filter((c) => c.category === "iems"),
          headphones: transformedComponents.filter(
            (c) => c.category === "cans" || c.category === "iems"
          ), // Combined for backward compatibility
          dacs: transformedComponents.filter((c) => c.category === "dac"),
          amps: transformedComponents.filter((c) => c.category === "amp"),
          combos: transformedComponents.filter((c) => c.category === "dac_amp"),
        };

        // Debug: Log what we got from database
        console.log("🔍 API: Components from database:", {
          totalComponents: transformedComponents.length,
          cans: componentsByCategory.cans.length,
          iems: componentsByCategory.iems.length,
          budget: req.budget,
          soundSignatures: req.soundSignatures,
          headphoneType: req.headphoneType,
        });

        // Process cans and IEMs: ALWAYS separate, never combine
        if (req.wantRecommendationsFor.headphones) {
          const headphoneBudget = budgetAllocation.headphones || req.budget;

          // Check if user wants both types or just one specific type
          const wantsBoth = req.headphoneType === "both";
          const wantsCansOnly = req.headphoneType === "cans";
          const wantsIemsOnly = req.headphoneType === "iems";

          // Get cans results if user wants them
          if (wantsCansOnly || wantsBoth) {
            results.cans = filterAndScoreComponents(
              componentsByCategory.cans,
              headphoneBudget,
              req.soundSignatures,
              req.usageRanking[0] || req.usage,
              maxOptions,
              req.driverType, // Pass actual driver type preference (dynamic/planar/etc)
              undefined,
              req.budget,
              req.budgetRangeMin, // V3: Pass user range parameters
              req.budgetRangeMax
            );
          }

          // Get IEMs results if user wants them
          if (wantsIemsOnly || wantsBoth) {
            results.iems = filterAndScoreComponents(
              componentsByCategory.iems,
              headphoneBudget,
              req.soundSignatures,
              req.usageRanking[0] || req.usage,
              maxOptions,
              undefined, // Don't filter by driver type for IEMs
              undefined,
              req.budget,
              req.budgetRangeMin, // V3: Pass user range parameters
              req.budgetRangeMax
            );
          }

          // Check amplification needs from cans (IEMs rarely need amps)
          if (results.cans && results.cans.length > 0) {
            results.needsAmplification = results.cans.some((h) => {
              if (!h.amplificationAssessment) return h.needs_amp === true;
              return (
                h.amplificationAssessment.difficulty === "demanding" ||
                h.amplificationAssessment.difficulty === "very_demanding"
              );
            });
          }
        }

        // Process DACs
        if (
          req.wantRecommendationsFor.dac &&
          componentsByCategory.dacs.length > 0
        ) {
          const dacBudget = budgetAllocation.dac || req.budget * 0.25;

          results.dacs = filterAndScoreComponents(
            componentsByCategory.dacs,
            dacBudget,
            req.soundSignatures,
            req.usageRanking[0] || req.usage,
            maxOptions,
            undefined,
            undefined,
            req.budget,
            req.budgetRangeMin, // V3: Pass user range parameters
            req.budgetRangeMax
          );
        }

        // Process AMPs with power matching
        if (
          req.wantRecommendationsFor.amp &&
          componentsByCategory.amps.length > 0
        ) {
          const ampBudget = budgetAllocation.amp || req.budget * 0.25;

          results.amps = filterAndScoreComponents(
            componentsByCategory.amps,
            ampBudget,
            req.soundSignatures,
            req.usageRanking[0] || req.usage,
            maxOptions,
            undefined,
            existingHeadphonesData || undefined,
            req.budget,
            req.budgetRangeMin, // V3: Pass user range parameters
            req.budgetRangeMax
          );
        }

        // Process combo units
        if (
          req.wantRecommendationsFor.combo &&
          componentsByCategory.combos.length > 0
        ) {
          const comboBudget = budgetAllocation.combo || req.budget * 0.4;

          results.combos = filterAndScoreComponents(
            componentsByCategory.combos,
            comboBudget,
            req.soundSignatures,
            req.usageRanking[0] || req.usage,
            maxOptions,
            undefined,
            undefined,
            req.budget,
            req.budgetRangeMin, // V3: Pass user range parameters
            req.budgetRangeMax
          );
        }
      }

      return results;
    }); // End of getCached wrapper

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error("Error in v2 recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

// POST endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert body to URL params for GET handler
    const url = new URL(request.url);
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(
          key,
          typeof value === "object" ? JSON.stringify(value) : String(value)
        );
      }
    });

    const mockRequest = { url: url.toString() } as NextRequest;
    return await GET(mockRequest);
  } catch (error) {
    console.error("Error in v2 POST:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
