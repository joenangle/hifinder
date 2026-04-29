export const FILTER_TOOLTIPS = {
  budget: {
    title: 'Budget',
    description: 'Set your spending limit',
    details: 'Shows gear that fits your budget. Adjust anytime to see more or fewer options.'
  },

  equipment: {
    headphones: {
      title: 'Headphones',
      description: 'Over-ear & On-ear headphones',
      details: 'Best for home listening. Comfortable for long sessions with immersive soundstage. Count shows total options in your budget — top-rated matches are displayed first.'
    },
    iems: {
      title: 'IEMs (In-Ear Monitors)',
      description: 'Earphones that go in your ears',
      details: 'Perfect for portability. Great isolation and detailed sound in a compact form. Count shows total options in your budget — top-rated matches are displayed first.'
    },
    dacs: {
      title: 'DACs (Digital-to-Analog Converters)',
      description: 'Improve your audio source quality',
      details: 'Converts digital audio from your computer/phone to analog. Cleaner, more detailed sound. Count shows total options in your budget — top-rated matches are displayed first.'
    },
    amps: {
      title: 'Amplifiers',
      description: 'Power your headphones properly',
      details: 'Provides clean power to drive demanding headphones. Better dynamics and control. Count shows total options in your budget — top-rated matches are displayed first.'
    },
    combos: {
      title: 'DAC/Amp Combos',
      description: 'All-in-one DAC/Amp solutions',
      details: 'Combines DAC and amplifier in one unit. Convenient and often better value. Count shows total options in your budget — top-rated matches are displayed first.'
    }
  },

  sound: {
    neutral: {
      title: 'Neutral / Balanced',
      description: 'Accurate, uncolored sound',
      details: 'Balanced across all frequencies. Perfect for critical listening, studio work, and experiencing music as intended. Count shows total options — top-rated matches are displayed first.'
    },
    warm: {
      title: 'Warm',
      description: 'Rich bass, smooth treble',
      details: 'Emphasized low-end warmth. Great for long listening sessions, electronic music, and fatigue-free enjoyment. Count shows total options — top-rated matches are displayed first.'
    },
    bright: {
      title: 'Bright / Analytical',
      description: 'Enhanced detail & clarity',
      details: 'Elevated treble for analytical listening. Excellent for classical, acoustic, and hearing every detail. Count shows total options — top-rated matches are displayed first.'
    },
    fun: {
      title: 'V-Shaped / Fun',
      description: 'Boosted bass & treble',
      details: 'Exciting, energetic sound. Perfect for EDM, gaming, movies, and when you want extra impact. Count shows total options — top-rated matches are displayed first.'
    },
    'v-shaped': {
      title: 'V-Shaped',
      description: 'Strong bass & treble boost',
      details: 'Pronounced bass and treble with recessed midrange. More extreme than "Fun" — great for bass-heavy music and cinematic experiences.'
    },
    dark: {
      title: 'Dark',
      description: 'Subdued treble, relaxed tone',
      details: 'Rolled-off treble with a laid-back presentation. Fatigue-free for long sessions. Pairs well with acoustic and vocal music.'
    }
  },

  general: {
    refineSearch: {
      title: 'Refine Your Search',
      description: 'Customize your recommendations',
      details: 'Toggle filters to see different combinations. Active filters work together to narrow results.'
    },
    matchScore: {
      title: 'Match Score',
      description: 'How well this fits your needs',
      details: 'Based on: Price fit (45%) + Sound signature match (45%) + Expert ratings bonus (10%). Higher scores mean better alignment with your preferences.'
    }
  }
} as const
