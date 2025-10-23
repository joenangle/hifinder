export const FILTER_TOOLTIPS = {
  budget: {
    title: 'Budget',
    description: 'Set your spending limit',
    details: 'We\'ll show gear that fits your budget. You can adjust anytime to see more or fewer options.'
  },

  equipment: {
    headphones: {
      title: 'Headphones',
      description: 'Over-ear & On-ear headphones',
      details: 'Best for home listening. Comfortable for long sessions with immersive soundstage.'
    },
    iems: {
      title: 'IEMs (In-Ear Monitors)',
      description: 'Earphones that go in your ears',
      details: 'Perfect for portability. Great isolation and detailed sound in a compact form.'
    },
    dacs: {
      title: 'DACs (Digital-to-Analog Converters)',
      description: 'Improve your audio source quality',
      details: 'Converts digital audio from your computer/phone to analog. Cleaner, more detailed sound.'
    },
    amps: {
      title: 'Amplifiers',
      description: 'Power your headphones properly',
      details: 'Provides clean power to drive demanding headphones. Better dynamics and control.'
    },
    combos: {
      title: 'DAC/Amp Combos',
      description: 'All-in-one solution',
      details: 'Combines DAC and amplifier in one unit. Convenient and often better value.'
    }
  },

  sound: {
    neutral: {
      title: 'Neutral / Balanced',
      description: 'Accurate, uncolored sound',
      details: 'Balanced across all frequencies. Perfect for critical listening, studio work, and experiencing music as intended.'
    },
    warm: {
      title: 'Warm',
      description: 'Rich bass, smooth treble',
      details: 'Emphasized low-end warmth. Great for long listening sessions, electronic music, and fatigue-free enjoyment.'
    },
    bright: {
      title: 'Bright / Analytical',
      description: 'Enhanced detail & clarity',
      details: 'Elevated treble for analytical listening. Excellent for classical, acoustic, and hearing every detail.'
    },
    fun: {
      title: 'V-Shaped / Fun',
      description: 'Boosted bass & treble',
      details: 'Exciting, energetic sound. Perfect for EDM, gaming, movies, and when you want extra impact.'
    }
  },

  general: {
    refineSearch: {
      title: 'Refine Your Search',
      description: 'Customize your recommendations',
      details: 'Toggle filters to see different combinations. All active filters work together to find your perfect match.'
    },
    matchScore: {
      title: 'Match Score',
      description: 'How well this fits your needs',
      details: 'Based on: Price fit (45%) + Sound signature match (45%) + Expert ratings bonus (10%). Higher scores mean better alignment with your preferences.'
    }
  }
} as const
