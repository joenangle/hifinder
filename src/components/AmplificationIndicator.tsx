import React from 'react'

interface AmplificationIndicatorProps {
  difficulty?: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown';
  powerRequired?: number;
  voltageRequired?: number;
  impedance?: number | null;
  className?: string;
  showDetails?: boolean;
  explanation?: string;
}

export function AmplificationIndicator({ 
  difficulty, 
  powerRequired, 
  voltageRequired,
  impedance,
  className = "",
  showDetails = false,
  explanation
}: AmplificationIndicatorProps) {
  if (!difficulty) return null;

  const configs = {
    easy: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-200',
      label: 'Easy to Drive',
      icon: '🎧',
      description: 'Works from any source'
    },
    moderate: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      label: 'Amp Beneficial',
      icon: '🔋',
      description: 'Benefits from amplification'
    },
    demanding: {
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-800 dark:text-orange-200',
      label: 'Amp Required',
      icon: '⚡',
      description: 'Requires dedicated amplification'
    },
    very_demanding: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      label: 'Powerful Amp Required',
      icon: '⚡⚡',
      description: 'Needs high-quality desktop amplification'
    },
    unknown: {
      bg: 'bg-gray-50 dark:bg-gray-900/40',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      label: 'Unknown Requirement',
      icon: '❓',
      description: 'Amplification need cannot be determined'
    }
  };

  const config = configs[difficulty];

  if (!config) {
    console.warn('AmplificationIndicator: Unknown difficulty:', difficulty);
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border} ${config.text} ${className}`}>
      
      {/* Icon */}
      <span className="text-lg" role="img" aria-label={config.label}>
        {config.icon}
      </span>
      
      {/* Main content */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm leading-tight">
            {config.label}
          </span>
          
          {/* Power/Voltage details */}
          {showDetails && powerRequired && voltageRequired && (
            <span className="text-xs opacity-75 font-mono">
              {powerRequired.toFixed(1)}mW / {voltageRequired.toFixed(2)}V
            </span>
          )}
        </div>
        
        {/* Description or explanation */}
        {(explanation || config.description) && (
          <span className="text-xs opacity-80 leading-tight mt-0.5">
            {explanation || config.description}
          </span>
        )}
        
        {/* Impedance info */}
        {impedance && (
          <span className="text-xs opacity-60 leading-tight">
            {impedance}Ω impedance
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for use in cards and lists
 */
export function AmplificationBadge({
  difficulty,
  powerRequired,
  voltageRequired,
  className = ""
}: Pick<AmplificationIndicatorProps, 'difficulty' | 'powerRequired' | 'voltageRequired' | 'className'>) {
  if (!difficulty) return null;

  const configs = {
    easy: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-800 dark:text-emerald-200', icon: '🎧', short: 'Easy' },
    moderate: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-200', icon: '🔋', short: 'Moderate' },
    demanding: { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-200', icon: '⚡', short: 'Demanding' },
    very_demanding: { bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200', icon: '⚡⚡', short: 'Very Hard' },
    unknown: { bg: 'bg-gray-50 dark:bg-gray-900/40', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: '❓', short: 'Unknown' }
  };

  const config = configs[difficulty];

  if (!config) {
    console.warn('AmplificationBadge: Unknown difficulty:', difficulty);
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.border} ${config.text} ${className}`}
      title={powerRequired && voltageRequired ? 
        `${powerRequired.toFixed(1)}mW, ${voltageRequired.toFixed(2)}V required` : 
        undefined
      }
    >
      <span role="img" aria-label={config.short}>
        {config.icon}
      </span>
      <span className="leading-none">
        {config.short}
      </span>
    </div>
  );
}

/**
 * Detailed amplification assessment with recommendations
 */
export function AmplificationAssessment({
  difficulty,
  powerRequired,
  voltageRequired,
  impedance,
  phoneCompatible,
  laptopCompatible, 
  portableAmpSufficient,
  desktopAmpRecommended,
  explanation,
  className = ""
}: AmplificationIndicatorProps & {
  phoneCompatible?: boolean;
  laptopCompatible?: boolean;
  portableAmpSufficient?: boolean;
  desktopAmpRecommended?: boolean;
}) {
  if (!difficulty) return null;

  return (
    <div className={`p-4 rounded-lg border border-border bg-card ${className}`}>
      <div className="flex items-start gap-3">
        <AmplificationIndicator 
          difficulty={difficulty}
          powerRequired={powerRequired}
          voltageRequired={voltageRequired}
          impedance={impedance}
          showDetails={true}
          className="flex-1"
        />
      </div>
      
      {explanation && (
        <p className="text-sm text-secondary mt-3 leading-relaxed">
          {explanation}
        </p>
      )}
      
      {/* Source compatibility */}
      {(phoneCompatible !== undefined || laptopCompatible !== undefined) && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-primary">Source Compatibility</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {phoneCompatible !== undefined && (
              <div className={`flex items-center gap-2 ${phoneCompatible ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                <span>{phoneCompatible ? '✅' : '❌'}</span>
                <span>Phone/Mobile</span>
              </div>
            )}
            {laptopCompatible !== undefined && (
              <div className={`flex items-center gap-2 ${laptopCompatible ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                <span>{laptopCompatible ? '✅' : '❌'}</span>
                <span>Laptop/PC</span>
              </div>
            )}
            {portableAmpSufficient !== undefined && (
              <div className={`flex items-center gap-2 ${portableAmpSufficient ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                <span>{portableAmpSufficient ? '✅' : '⚠️'}</span>
                <span>Portable Amp</span>
              </div>
            )}
            {desktopAmpRecommended !== undefined && (
              <div className={`flex items-center gap-2 ${desktopAmpRecommended ? 'text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-400'}`}>
                <span>{desktopAmpRecommended ? '🏠' : '👍'}</span>
                <span>Desktop Amp {desktopAmpRecommended ? 'Recommended' : 'Optional'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}