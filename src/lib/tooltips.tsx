export const FILTER_TOOLTIPS = {
  budget: {
    title: 'Budget',
    content: (
      <div>
        <p className="font-medium mb-1">Set your spending limit</p>
        <p className="text-xs text-text-secondary">
          We&apos;ll show gear that fits your budget. You can adjust anytime to see more or fewer options.
        </p>
      </div>
    )
  },

  equipment: {
    headphones: {
      title: 'Headphones',
      content: (
        <div>
          <p className="font-medium mb-1">Over-ear & On-ear headphones</p>
          <p className="text-xs text-text-secondary">
            Best for home listening. Comfortable for long sessions with immersive soundstage.
          </p>
        </div>
      )
    },
    iems: {
      title: 'IEMs (In-Ear Monitors)',
      content: (
        <div>
          <p className="font-medium mb-1">Earphones that go in your ears</p>
          <p className="text-xs text-text-secondary">
            Perfect for portability. Great isolation and detailed sound in a compact form.
          </p>
        </div>
      )
    },
    dacs: {
      title: 'DACs (Digital-to-Analog Converters)',
      content: (
        <div>
          <p className="font-medium mb-1">Improve your audio source quality</p>
          <p className="text-xs text-text-secondary">
            Converts digital audio from your computer/phone to analog. Cleaner, more detailed sound.
          </p>
        </div>
      )
    },
    amps: {
      title: 'Amplifiers',
      content: (
        <div>
          <p className="font-medium mb-1">Power your headphones properly</p>
          <p className="text-xs text-text-secondary">
            Provides clean power to drive demanding headphones. Better dynamics and control.
          </p>
        </div>
      )
    },
    combos: {
      title: 'DAC/Amp Combos',
      content: (
        <div>
          <p className="font-medium mb-1">All-in-one solution</p>
          <p className="text-xs text-text-secondary">
            Combines DAC and amplifier in one unit. Convenient and often better value.
          </p>
        </div>
      )
    }
  },

  sound: {
    neutral: {
      title: 'Neutral / Balanced',
      content: (
        <div>
          <p className="font-medium mb-1">Accurate, uncolored sound</p>
          <p className="text-xs text-text-secondary">
            Balanced across all frequencies. Perfect for critical listening, studio work, and experiencing music as intended.
          </p>
        </div>
      )
    },
    warm: {
      title: 'Warm',
      content: (
        <div>
          <p className="font-medium mb-1">Rich bass, smooth treble</p>
          <p className="text-xs text-text-secondary">
            Emphasized low-end warmth. Great for long listening sessions, electronic music, and fatigue-free enjoyment.
          </p>
        </div>
      )
    },
    bright: {
      title: 'Bright / Analytical',
      content: (
        <div>
          <p className="font-medium mb-1">Enhanced detail & clarity</p>
          <p className="text-xs text-text-secondary">
            Elevated treble for analytical listening. Excellent for classical, acoustic, and hearing every detail.
          </p>
        </div>
      )
    },
    fun: {
      title: 'V-Shaped / Fun',
      content: (
        <div>
          <p className="font-medium mb-1">Boosted bass & treble</p>
          <p className="text-xs text-text-secondary">
            Exciting, energetic sound. Perfect for EDM, gaming, movies, and when you want extra impact.
          </p>
        </div>
      )
    }
  },

  general: {
    refineSearch: {
      title: 'Refine Your Search',
      content: (
        <div>
          <p className="font-medium mb-1">Customize your recommendations</p>
          <p className="text-xs text-text-secondary">
            Toggle filters to see different combinations. All active filters work together to find your perfect match.
          </p>
        </div>
      )
    },
    matchScore: {
      title: 'Match Score',
      content: (
        <div>
          <p className="font-medium mb-1">How well this fits your needs</p>
          <p className="text-xs text-text-secondary mb-2">
            Based on:
          </p>
          <ul className="text-xs text-text-secondary space-y-1 ml-4">
            <li>• Price fit (45%)</li>
            <li>• Sound signature match (45%)</li>
            <li>• Expert ratings bonus (10%)</li>
          </ul>
          <p className="text-xs text-text-secondary mt-2">
            Higher scores mean better alignment with your preferences.
          </p>
        </div>
      )
    }
  }
}
