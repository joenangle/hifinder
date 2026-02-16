/**
 * Audio power calculation utilities for headphone amplification assessment
 * 
 * This module provides comprehensive power requirement calculations based on
 * impedance and sensitivity, replacing the oversimplified impedance-only approach.
 * 
 * Based on standard audio engineering formulas and real-world device capabilities.
 */

export interface PowerRequirements {
  powerNeeded_mW: number;
  voltageNeeded_V: number;
  currentNeeded_mA: number;
  difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding';
  phoneCompatible: boolean;
  laptopCompatible: boolean;
  portableAmpSufficient: boolean;
  desktopAmpRecommended: boolean;
  explanation: string;
}

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
 * Convert between different sensitivity measurement formats
 * 
 * @param value - Sensitivity value to convert
 * @param fromType - Source measurement type
 * @param toType - Target measurement type  
 * @param impedance - Headphone impedance (needed for conversion)
 * @returns Converted sensitivity value
 */
export function convertSensitivity(
  value: number,
  fromType: 'dB/mW' | 'dB/V',
  toType: 'dB/mW' | 'dB/V',
  impedance: number
): number {
  if (fromType === toType) return value;
  
  if (fromType === 'dB/V' && toType === 'dB/mW') {
    // dB/V to dB/mW: subtract 10*log10(impedance/1000)
    return value - 10 * Math.log10(impedance / 1000);
  } else {
    // dB/mW to dB/V: add 10*log10(impedance/1000)  
    return value + 10 * Math.log10(impedance / 1000);
  }
}

/**
 * Enhanced power requirement assessment using current simple inputs
 * 
 * This works with the existing database structure and provides enhanced
 * assessment even without sensitivity data, using impedance patterns
 * and known headphone characteristics.
 */
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
  
  // Brand/model specific knowledge for common headphones
  const modelKey = `${brand?.toLowerCase()} ${headphoneName?.toLowerCase()}`;
  const knownDifficultModels = [
    'sennheiser hd600', 'sennheiser hd650', 'sennheiser hd660s',
    'beyerdynamic dt770', 'beyerdynamic dt880', 'beyerdynamic dt990',
    'hifiman sundara', 'hifiman edition xs', 'hifiman he400se'
  ];

  const isKnownDifficult = knownDifficultModels.some(model => 
    modelKey?.includes(model.split(' ')[1]) || false
  );

  // Enhanced impedance assessment
  if (impedance >= 300) {
    difficulty = isKnownDifficult ? 'very_demanding' : 'demanding';
    estimatedSensitivity = 97; // Typical for high-Z headphones
  } else if (impedance >= 150) {
    difficulty = isKnownDifficult ? 'demanding' : 'moderate';
    estimatedSensitivity = 99; // Typical for medium-high Z
  } else if (impedance >= 80) {
    difficulty = 'moderate';
    estimatedSensitivity = 102; // Typical for medium Z
  } else if (impedance >= 32) {
    difficulty = 'easy';  
    estimatedSensitivity = 106; // Typical for low Z
  } else {
    difficulty = 'easy'; // Very low impedance, typically efficient
    estimatedSensitivity = 110; // IEMs and very efficient headphones
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
 * Match amplifiers to headphone requirements
 *
 * This function evaluates which amplifiers can adequately drive given headphones
 * based on power requirements and provides intelligent matching with headroom considerations.
 */
export function matchAmplifiersToHeadphones(
  headphones: { impedance: number | null; powerRequirement?: PowerRequirements }[],
  amplifiers: {
    id: string;
    name: string;
    brand: string;
    power_output?: string; // e.g., "500mW @ 32Ω"
    price_used_min: number | null;
    price_used_max: number | null;
  }[]
): Array<{
  amplifier: typeof amplifiers[0];
  compatibilityScore: number;
  headroomScore: number;
  powerAtHeadphoneZ: number;
  explanation: string;
}> {
  // Find the most demanding headphone to match against
  const mostDemandingHeadphone = headphones.reduce((most, current) => {
    const currentPower = current.powerRequirement?.powerNeeded_mW ?? 0;
    const mostPower = most?.powerRequirement?.powerNeeded_mW ?? 0;
    return currentPower > mostPower ? current : most;
  }, headphones[0]);

  const targetImpedance = mostDemandingHeadphone?.impedance ?? 32;
  const powerNeeded = mostDemandingHeadphone?.powerRequirement?.powerNeeded_mW ?? 50;

  const results = amplifiers.map(amp => {
    const parsedSpec = parsePowerSpec(amp.power_output);
    let powerAtHeadphoneZ: number;
    let specBased = false;

    if (parsedSpec) {
      // Full power matching with actual specs
      powerAtHeadphoneZ = calculatePowerAtImpedance(
        parsedSpec.power_mW,
        parsedSpec.reference_impedance,
        targetImpedance
      );
      specBased = true;
    } else {
      // Fallback: estimate based on price tier
      const avgPrice = ((amp.price_used_min || 0) + (amp.price_used_max || 0)) / 2;
      let estimatedPower = 100; // Base power in mW
      if (avgPrice > 500) estimatedPower = 1000;
      else if (avgPrice > 300) estimatedPower = 500;
      else if (avgPrice > 150) estimatedPower = 250;
      powerAtHeadphoneZ = estimatedPower;
    }

    // Calculate compatibility: can amp deliver required power?
    // Score 1.0 = can deliver exactly what's needed, >1.0 = headroom
    const powerRatio = powerAtHeadphoneZ / powerNeeded;
    const compatibilityScore = Math.min(1, powerRatio);

    // Headroom score: how much extra power beyond minimum?
    // 2x power (3dB headroom) is ideal, 4x (6dB) is excellent
    let headroomScore: number;
    if (powerRatio >= 4) headroomScore = 1.0;      // 6dB+ headroom - excellent
    else if (powerRatio >= 2) headroomScore = 0.9; // 3-6dB headroom - great
    else if (powerRatio >= 1.5) headroomScore = 0.7; // Some headroom
    else if (powerRatio >= 1) headroomScore = 0.5;  // Just enough
    else headroomScore = powerRatio * 0.5;         // Underpowered

    // Generate explanation
    let explanation: string;
    if (specBased) {
      const parsedPower = parsedSpec!.power_mW;
      const parsedZ = parsedSpec!.reference_impedance;
      if (powerRatio >= 2) {
        explanation = `Delivers ${Math.round(powerAtHeadphoneZ)}mW at ${targetImpedance}Ω (from ${parsedPower}mW @ ${parsedZ}Ω spec). Excellent headroom for demanding passages.`;
      } else if (powerRatio >= 1) {
        explanation = `Delivers ${Math.round(powerAtHeadphoneZ)}mW at ${targetImpedance}Ω. Adequate power with some headroom.`;
      } else {
        explanation = `Only ${Math.round(powerAtHeadphoneZ)}mW at ${targetImpedance}Ω - may struggle with demanding headphones. Consider more powerful amp.`;
      }
    } else {
      explanation = `Estimated ${Math.round(powerAtHeadphoneZ)}mW output (no specs available). ${
        powerAtHeadphoneZ > 200 ? 'Should drive most headphones well.' : 'Suitable for easier to drive headphones.'
      }`;
    }

    return {
      amplifier: amp,
      compatibilityScore,
      headroomScore,
      powerAtHeadphoneZ: Math.round(powerAtHeadphoneZ),
      explanation
    };
  });

  // Sort by overall suitability (weighted: compatibility more important than headroom)
  return results.sort((a, b) => {
    const aScore = (a.compatibilityScore * 0.7) + (a.headroomScore * 0.3);
    const bScore = (b.compatibilityScore * 0.7) + (b.headroomScore * 0.3);
    return bScore - aScore;
  });
}

/**
 * Get power requirement from impedance using typical sensitivity values
 * 
 * This is a fallback for when sensitivity data isn't available
 */
export function estimatePowerFromImpedance(impedance: number): PowerRequirements | null {
  if (!impedance) return null;
  
  // Estimate typical sensitivity based on impedance patterns
  let estimatedSensitivity: number;
  
  if (impedance >= 300) estimatedSensitivity = 97;
  else if (impedance >= 150) estimatedSensitivity = 99; 
  else if (impedance >= 80) estimatedSensitivity = 102;
  else if (impedance >= 32) estimatedSensitivity = 106;
  else estimatedSensitivity = 110;
  
  return calculatePowerRequirements(impedance, estimatedSensitivity);
}