/**
 * Audio power calculation utilities for headphone amplification assessment
 *
 * This module provides comprehensive power requirement calculations based on
 * impedance and sensitivity, replacing the oversimplified impedance-only approach.
 *
 * Based on standard audio engineering formulas and real-world device capabilities.
 */

import type { PowerRequirements } from '@/types/audio'

export type { PowerRequirements } from '@/types/audio'

/**
 * Calculate comprehensive power requirements for headphones/IEMs
 * 
 * @param impedance - Headphone impedance in ohms
 * @param sensitivity_dB_mW - Sensitivity in dB/mW (preferred measurement)  
 * @param targetSPL - Target SPL level in dB (default: 110 dB for loud listening)
 * @returns Complete power requirements assessment
 */
export function calculatePowerRequirements(
  impedance: number,
  sensitivity_dB_mW: number,
  targetSPL: number = 110
): PowerRequirements {
  // Core power calculation: P = 10^((Target_SPL - Sensitivity_dB)/10)
  const powerNeeded_mW = Math.pow(10, (targetSPL - sensitivity_dB_mW) / 10);
  const powerNeeded_W = powerNeeded_mW / 1000;
  
  // Voltage calculation: V = sqrt(P * R)
  const voltageNeeded_V = Math.sqrt(powerNeeded_W * impedance);
  
  // Current calculation: I = V / R (in milliamps)
  const currentNeeded_mA = (voltageNeeded_V / impedance) * 1000;

  // Device capability assessment (conservative real-world values)
  const phoneMaxVoltage = 1.0;      // Typical smartphone output
  const phoneMaxPower = 30;         // mW into typical loads
  const laptopMaxVoltage = 2.0;     // Typical laptop/PC output  
  const laptopMaxPower = 60;        // mW into typical loads
  const portableAmpVoltage = 3.0;   // Good portable amp
  const portableAmpPower = 300;     // mW capability

  const phoneCompatible = voltageNeeded_V <= phoneMaxVoltage && powerNeeded_mW <= phoneMaxPower;
  const laptopCompatible = voltageNeeded_V <= laptopMaxVoltage && powerNeeded_mW <= laptopMaxPower;
  const portableAmpSufficient = voltageNeeded_V <= portableAmpVoltage && powerNeeded_mW <= portableAmpPower;

  // Difficulty assessment - considers both power AND voltage requirements
  let difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding';
  
  if (powerNeeded_mW <= 10 && voltageNeeded_V <= 1.0) {
    difficulty = 'easy';
  } else if (powerNeeded_mW <= 50 && voltageNeeded_V <= 2.5) {
    difficulty = 'moderate';
  } else if (powerNeeded_mW <= 200 && voltageNeeded_V <= 5.0) {
    difficulty = 'demanding';
  } else {
    difficulty = 'very_demanding';
  }

  // Generate contextual explanation
  const explanation = generateAmplificationExplanation(
    difficulty, 
    impedance, 
    sensitivity_dB_mW, 
    powerNeeded_mW, 
    voltageNeeded_V
  );

  return {
    powerNeeded_mW: Math.round(powerNeeded_mW * 10) / 10,
    voltageNeeded_V: Math.round(voltageNeeded_V * 100) / 100,
    currentNeeded_mA: Math.round(currentNeeded_mA * 10) / 10,
    difficulty,
    phoneCompatible,
    laptopCompatible,
    portableAmpSufficient,
    desktopAmpRecommended: difficulty === 'demanding' || difficulty === 'very_demanding',
    explanation
  };
}

/**
 * Generate detailed explanation for amplification requirements
 */
function generateAmplificationExplanation(
  difficulty: string, 
  impedance: number, 
  sensitivity: number,
  power_mW: number,
  voltage_V: number
): string {
  const highImpedance = impedance >= 150;
  const lowSensitivity = sensitivity < 90;
  const highPower = power_mW > 50;
  const highVoltage = voltage_V > 2.0;
  
  if (difficulty === 'easy') {
    return `Efficient and easy to drive. Works well from phones, laptops, and any source. Requires only ${power_mW.toFixed(1)}mW and ${voltage_V.toFixed(2)}V for loud listening.`;
  } 
  
  if (difficulty === 'moderate') {
    if (highImpedance && !lowSensitivity) {
      return `High impedance (${impedance}Ω) requires good voltage swing (${voltage_V.toFixed(2)}V). A portable amp or audio interface will provide better dynamics and headroom.`;
    } else if (lowSensitivity && !highImpedance) {
      return `Lower sensitivity (${sensitivity} dB/mW) demands more power (${power_mW.toFixed(1)}mW). A portable amp is recommended for optimal performance.`;
    } else {
      return `Benefits from dedicated amplification for best performance. Needs ${power_mW.toFixed(1)}mW and ${voltage_V.toFixed(2)}V for full potential.`;
    }
  } 
  
  if (difficulty === 'demanding') {
    if (highImpedance && lowSensitivity) {
      return `Challenging combination: high impedance (${impedance}Ω) and low sensitivity (${sensitivity} dB/mW) require substantial power (${power_mW.toFixed(1)}mW) and voltage (${voltage_V.toFixed(2)}V). Desktop amplifier strongly recommended.`;
    } else if (highPower) {
      return `High power requirement (${power_mW.toFixed(1)}mW) demands serious amplification. Desktop amplifier or powerful portable recommended.`;
    } else if (highVoltage) {
      return `High voltage requirement (${voltage_V.toFixed(2)}V) needs amplifier with good voltage swing. Desktop amp recommended.`;
    } else {
      return `Requires proper amplification for full performance. Desktop amplifier or high-end portable needed.`;
    }
  } 
  
  // very_demanding
  if (power_mW > 500) {
    return `Extremely demanding: requires ${power_mW.toFixed(0)}mW and ${voltage_V.toFixed(2)}V. Needs high-quality desktop amplification with substantial power reserves. Not suitable for portable use.`;
  } else {
    return `Very challenging to drive properly. Requires ${power_mW.toFixed(1)}mW and ${voltage_V.toFixed(2)}V from a quality desktop amplifier. Mobile sources will not provide adequate performance.`;
  }
}

/**
 * Enhanced power requirement assessment using current simple inputs
 * 
 * This works with the existing database structure and provides enhanced
 * assessment even without sensitivity data, using impedance patterns
 * and known headphone characteristics.
 */
const KNOWN_DIFFICULT_MODELS = [
  'sennheiser hd600', 'sennheiser hd650', 'sennheiser hd660s',
  'beyerdynamic dt770', 'beyerdynamic dt880', 'beyerdynamic dt990',
  'hifiman sundara', 'hifiman edition xs', 'hifiman he400se',
];

/** Lowercase and strip everything that isn't a letter or digit. */
function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Typical sensitivity (dB/mW) for a given impedance.
 *
 * A last-resort estimate for components with no measured sensitivity. Real
 * `sensitivity_db_mw` should always be preferred — see `resolveSensitivityDbMw`.
 */
export function estimateSensitivityFromImpedance(impedance: number): number {
  if (impedance >= 300) return 97;
  if (impedance >= 150) return 99;
  if (impedance >= 80) return 102;
  if (impedance >= 32) return 106;
  return 110;
}

/**
 * Convert a sensitivity quoted in dB/V to dB/mW.
 *
 * dB/mW = dB/V - 10*log10(Z/1000)
 *
 * @returns null when impedance is missing or non-positive (the conversion is
 *          undefined without a load).
 */
export function sensitivityDbVToDbMw(
  sensitivity_dB_V: number | null | undefined,
  impedance: number | null | undefined
): number | null {
  if (sensitivity_dB_V == null || !impedance || impedance <= 0) return null;
  return sensitivity_dB_V - 10 * Math.log10(impedance / 1000);
}

/**
 * Best available sensitivity in dB/mW for a component, in preference order:
 * measured dB/mW → converted dB/V → impedance-based estimate.
 *
 * @returns null when there is no impedance and no measured sensitivity.
 */
export function resolveSensitivityDbMw(component: {
  sensitivity_db_mw?: number | null;
  sensitivity_db_v?: number | null;
  impedance?: number | null;
}): number | null {
  if (component.sensitivity_db_mw != null) return component.sensitivity_db_mw;

  const converted = sensitivityDbVToDbMw(component.sensitivity_db_v, component.impedance);
  if (converted != null) return converted;

  if (component.impedance) return estimateSensitivityFromImpedance(component.impedance);

  return null;
}

/** A headphone/IEM as far as amplification is concerned. */
export interface AmplificationTarget {
  impedance?: number | null;
  sensitivity_db_mw?: number | null;
  sensitivity_db_v?: number | null;
  needs_amp?: boolean | null;
}

/**
 * Does this headphone want a dedicated amp?
 *
 * The single source of truth for that question. Previously three call sites
 * used three different impedance thresholds (150Ω, 80Ω, and a separate
 * difficulty ladder), so the same headphone could be reported both ways on
 * different screens.
 *
 * Returns false when there is no data — an honest "we don't know" reads better
 * than a guess, and callers that need to distinguish the two should check the
 * underlying fields.
 */
export function needsAmplification(component: AmplificationTarget): boolean {
  if (component.needs_amp === true) return true;
  if (!component.impedance) return false;

  const sensitivity = resolveSensitivityDbMw(component);
  if (sensitivity == null) return false;

  return calculatePowerRequirements(component.impedance, sensitivity).difficulty !== 'easy';
}

/**
 * How well does an amp drive a given headphone?
 *
 * Replaces three divergent implementations (a mW-only regex in the
 * recommendations route, a price→power ladder in the stack builder, and a
 * fallback that scored the *headphone's* difficulty rather than the amp's
 * adequacy — which made every amp score identically, and score highest against
 * the hardest-to-drive headphones).
 *
 * @param ampPowerSpec - freeform power spec, e.g. "2W @ 32Ω"
 * @param headphone - impedance plus whatever sensitivity data exists
 * @returns score 0–1, whether the verdict rests on real data, and the raw
 *          headroom ratio (available power / required power) for display
 */
export function calculateAmpAdequacy(
  ampPowerSpec: string | null | undefined,
  headphone: AmplificationTarget
): { score: number; dataAvailable: boolean; headroomRatio: number | null } {
  const UNKNOWN = { score: 0.5, dataAvailable: false, headroomRatio: null };

  if (!headphone.impedance) return UNKNOWN;

  const sensitivity = resolveSensitivityDbMw(headphone);
  if (sensitivity == null) return UNKNOWN;

  const ampSpec = parsePowerSpec(ampPowerSpec);
  if (!ampSpec) return UNKNOWN;

  const required_mW = calculatePowerRequirements(headphone.impedance, sensitivity).powerNeeded_mW;
  if (required_mW <= 0) return UNKNOWN;

  const available_mW = calculatePowerAtImpedance(
    ampSpec.power_mW,
    ampSpec.reference_impedance,
    headphone.impedance
  );

  const headroomRatio = available_mW / required_mW;

  let score: number;
  if (headroomRatio >= 1.5) score = 1.0;       // comfortable headroom
  else if (headroomRatio >= 1.0) score = 0.8;  // meets the requirement
  else if (headroomRatio >= 0.7) score = 0.5;  // marginal
  else score = 0.2;                            // insufficient

  return { score, dataAvailable: true, headroomRatio };
}

export function assessAmplificationFromImpedance(
  impedance: number | null, 
  needsAmp: boolean | null,
  headphoneName?: string,
  brand?: string
): {
  difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown';
  explanation: string;
  estimatedSensitivity?: number;
} {
  // If we have explicit needs_amp flag and it's true, respect it
  if (needsAmp === true) {
    return {
      difficulty: 'demanding',
      explanation: 'Marked as requiring amplification. Dedicated amp recommended for proper performance.',
    };
  }

  // Without impedance, we can't assess much
  if (!impedance) {
    return {
      difficulty: 'unknown',
      explanation: 'No impedance data available for amplification assessment.',
    };
  }

  // Enhanced impedance-based assessment with brand/model knowledge
  let difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding';
  let estimatedSensitivity: number | undefined;
  
  // Brand/model specific knowledge for common headphones.
  // Both sides are stripped to alphanumerics so spacing variants ("HD 600" vs
  // "HD600") and multi-word models ("Edition XS") match on the full name
  // rather than on a single token.
  const modelKey = squash(`${brand ?? ''} ${headphoneName ?? ''}`);
  const isKnownDifficult =
    modelKey.length > 0 &&
    KNOWN_DIFFICULT_MODELS.some(model => modelKey.includes(squash(model)));

  // Enhanced impedance assessment
  estimatedSensitivity = estimateSensitivityFromImpedance(impedance);

  if (impedance >= 300) {
    difficulty = isKnownDifficult ? 'very_demanding' : 'demanding';
  } else if (impedance >= 150) {
    difficulty = isKnownDifficult ? 'demanding' : 'moderate';
  } else if (impedance >= 80) {
    difficulty = 'moderate';
  } else {
    difficulty = 'easy'; // Low impedance, typically efficient
  }

  // Generate explanation
  let explanation: string;
  if (difficulty === 'easy') {
    explanation = `Low impedance (${impedance}Ω) suggests easy to drive. Should work well from most sources.`;
  } else if (difficulty === 'moderate') {
    explanation = `Medium impedance (${impedance}Ω) benefits from amplification. Portable amp recommended for best performance.`;
  } else if (difficulty === 'demanding') {
    explanation = `High impedance (${impedance}Ω) requires good amplification. Desktop amp recommended for proper dynamics.`;
  } else {
    explanation = `Very high impedance (${impedance}Ω) demands powerful amplification. Quality desktop amp essential.`;
  }

  return {
    difficulty,
    explanation,
    estimatedSensitivity
  };
}

/**
 * Parse amplifier power output specification string
 *
 * Supports formats like:
 * - "500mW @ 32Ω" or "500mW@32Ω"
 * - "2W @ 32Ω" or "2000mW @ 32Ω"
 * - "1.5W into 32 ohms"
 * - "500mW/32Ω"
 *
 * @returns Parsed power in mW and reference impedance, or null if unparseable
 */
export function parsePowerSpec(powerSpec: string | undefined | null): {
  power_mW: number;
  reference_impedance: number;
} | null {
  if (!powerSpec) return null;

  const spec = powerSpec.toLowerCase().trim();

  // Match patterns like "500mw @ 32Ω", "2w@32ohms", "1.5w into 32 ohms", "500mw/32Ω"
  const powerMatch = spec.match(/(\d+(?:\.\d+)?)\s*(mw|w)\s*[@\/]?\s*(?:into\s+)?(\d+)\s*(?:Ω|ohms?)?/i);

  if (!powerMatch) return null;

  const value = parseFloat(powerMatch[1]);
  const unit = powerMatch[2].toLowerCase();
  const impedance = parseInt(powerMatch[3], 10);

  // Convert to mW if in W
  const power_mW = unit === 'w' ? value * 1000 : value;

  return {
    power_mW,
    reference_impedance: impedance
  };
}

/**
 * Calculate amplifier power output at a different impedance
 *
 * Uses the relationship between power, voltage, and impedance:
 * - For voltage-limited amps: P = V²/R (power decreases as impedance increases)
 * - For current-limited amps: P = I²R (power increases as impedance increases)
 *
 * Most headphone amps are voltage-limited for practical impedance ranges,
 * with current limiting only kicking in at very low impedances.
 *
 * @param referencePower_mW - Power at reference impedance
 * @param referenceImpedance - Reference impedance (typically 32Ω)
 * @param targetImpedance - Target impedance to calculate power for
 * @param currentLimit_mA - Optional current limit (defaults to generous 500mA)
 * @returns Power output in mW at target impedance
 */
export function calculatePowerAtImpedance(
  referencePower_mW: number,
  referenceImpedance: number,
  targetImpedance: number,
  currentLimit_mA: number = 500
): number {
  // Calculate reference voltage: V = sqrt(P * R)
  const referencePower_W = referencePower_mW / 1000;
  const referenceVoltage = Math.sqrt(referencePower_W * referenceImpedance);

  // Calculate voltage-limited power at target impedance: P = V²/R
  const voltageLimitedPower_W = (referenceVoltage * referenceVoltage) / targetImpedance;

  // Calculate current-limited power: P = I²R
  const currentLimit_A = currentLimit_mA / 1000;
  const currentLimitedPower_W = currentLimit_A * currentLimit_A * targetImpedance;

  // Amp delivers whichever limit is hit first (lower value)
  const actualPower_W = Math.min(voltageLimitedPower_W, currentLimitedPower_W);

  return actualPower_W * 1000; // Convert back to mW
}

/**
 * Get power requirement from impedance using typical sensitivity values
 * 
 * This is a fallback for when sensitivity data isn't available
 */
export function estimatePowerFromImpedance(impedance: number): PowerRequirements | null {
  if (!impedance) return null;
  
  return calculatePowerRequirements(impedance, estimateSensitivityFromImpedance(impedance));
}