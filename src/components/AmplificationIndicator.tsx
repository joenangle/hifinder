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
      color: 'green',
      label: 'Easy to Drive',
      icon: '🎧',
      description: 'Works from any source'
    },
    moderate: {
      color: 'yellow', 
      label: 'Amp Beneficial',
      icon: '🔋',
      description: 'Benefits from amplification'
    },
    demanding: {
      color: 'orange',
      label: 'Amp Required', 
      icon: '⚡',
      description: 'Requires dedicated amplification'
    },
    very_demanding: {
      color: 'red',
      label: 'Powerful Amp Required',
      icon: '⚡⚡',
      description: 'Needs high-quality desktop amplification'
    },
    unknown: {
      color: 'gray',
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
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${className}`}
         style={{
           backgroundColor: `var(--${config.color}-50, color-mix(in srgb, var(--accent-primary) 8%, transparent))`,
           borderColor: `var(--${config.color}-200, var(--accent-primary))`,
           color: `var(--${config.color}-800, var(--text-primary))`
         }}>
      
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
    easy: { color: 'green', icon: '🎧', short: 'Easy' },
    moderate: { color: 'yellow', icon: '🔋', short: 'Moderate' },
    demanding: { color: 'orange', icon: '⚡', short: 'Demanding' },
    very_demanding: { color: 'red', icon: '⚡⚡', short: 'Very Hard' },
    unknown: { color: 'gray', icon: '❓', short: 'Unknown' }
  };

  const config = configs[difficulty];

  if (!config) {
    console.warn('AmplificationBadge: Unknown difficulty:', difficulty);
    return null;
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${className}`}
      style={{
        backgroundColor: `var(--${config.color}-50, color-mix(in srgb, var(--accent-primary) 8%, transparent))`,
        borderColor: `var(--${config.color}-200, var(--accent-primary))`,
        color: `var(--${config.color}-800, var(--text-primary))`
      }}
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
        <p className="text-sm text-text-secondary mt-3 leading-relaxed">
          {explanation}
        </p>
      )}
      
      {/* Source compatibility */}
      {(phoneCompatible !== undefined || laptopCompatible !== undefined) && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-text-primary">Source Compatibility</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {phoneCompatible !== undefined && (
              <div className={`flex items-center gap-2 ${phoneCompatible ? 'text-green-700' : 'text-red-700'}`}>
                <span>{phoneCompatible ? '✅' : '❌'}</span>
                <span>Phone/Mobile</span>
              </div>
            )}
            {laptopCompatible !== undefined && (
              <div className={`flex items-center gap-2 ${laptopCompatible ? 'text-green-700' : 'text-red-700'}`}>
                <span>{laptopCompatible ? '✅' : '❌'}</span>
                <span>Laptop/PC</span>
              </div>
            )}
            {portableAmpSufficient !== undefined && (
              <div className={`flex items-center gap-2 ${portableAmpSufficient ? 'text-green-700' : 'text-yellow-700'}`}>
                <span>{portableAmpSufficient ? '✅' : '⚠️'}</span>
                <span>Portable Amp</span>
              </div>
            )}
            {desktopAmpRecommended !== undefined && (
              <div className={`flex items-center gap-2 ${desktopAmpRecommended ? 'text-orange-700' : 'text-gray-600'}`}>
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