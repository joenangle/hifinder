import LearnContent from './LearnContent'

interface Resource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'tool' | 'community';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'basics' | 'technical' | 'reviews' | 'guides';
  url: string;
  description: string;
  duration?: string;
  author?: string;
  featured?: boolean;
}

const resources: Resource[] = [
  // Featured/Basics
  {
    id: '1',
    title: 'Headphone Measurements 101',
    type: 'article',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.erinsaudiocorner.com/headphone-measurements/',
    description: 'Learn how to read and understand headphone measurements and frequency response',
    author: 'Erin\'s Audio Corner',
    featured: true
  },
  {
    id: 'v1',
    title: 'Headphones Explained for Beginners',
    type: 'video',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.youtube.com/watch?v=a3moaaWDSQA',
    description: 'Complete beginner guide covering headphone types, drivers, and what to look for',
    author: 'DankPods',
    duration: '15 min',
    featured: true
  },
  {
    id: 'v2',
    title: 'IEMs vs Headphones: What\'s the Difference?',
    type: 'video',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.youtube.com/watch?v=C4oc3RgMFoo',
    description: 'Clear explanation of IEMs vs over-ear headphones with pros and cons of each',
    author: 'Z Reviews',
    duration: '12 min',
    featured: true
  },
  {
    id: '2',
    title: 'Do You Really Need an Amp?',
    type: 'article',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.audiosciencereview.com/forum/index.php?threads/how-much-power-do-you-need-in-headphone-amp.4525/',
    description: 'Science-based analysis of when amplification is actually needed',
    author: 'Audio Science Review',
    featured: true
  },
  {
    id: '3',
    title: 'Harman Target Curve Explained',
    type: 'article',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.audiosciencereview.com/forum/index.php?threads/harman-target-curve-for-headphones.9251/',
    description: 'Understanding the research-backed target for neutral headphone sound',
    author: 'Audio Science Review',
    featured: true
  },
  // Technical
  {
    id: '4',
    title: 'Understanding Impedance & Sensitivity',
    type: 'article',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.audiosciencereview.com/forum/index.php?threads/headphone-sensitivity-impedance-and-amplifier-power.4436/',
    description: 'Technical specs explained with actual measurements and calculations',
    author: 'Audio Science Review'
  },
  {
    id: '5',
    title: 'What is THD+N in Audio?',
    type: 'article',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.audiosciencereview.com/forum/index.php?threads/understanding-audio-measurements.7649/',
    description: 'Total Harmonic Distortion and Noise measurements explained',
    author: 'Audio Science Review'
  },
  {
    id: '6',
    title: 'Klippel NFS Headphone Testing',
    type: 'article',
    difficulty: 'advanced',
    category: 'technical',
    url: 'https://www.erinsaudiocorner.com/klippel-nfs-headphone-testing/',
    description: 'State-of-the-art measurement methodology for headphones',
    author: 'Erin\'s Audio Corner'
  },
  {
    id: '7',
    title: 'Balanced Audio: Fact vs Fiction',
    type: 'article',
    difficulty: 'advanced',
    category: 'technical',
    url: 'https://www.audiosciencereview.com/forum/index.php?threads/balanced-headphone-outputs.15492/',
    description: 'Objective analysis of balanced headphone connections',
    author: 'Audio Science Review'
  },
  // Videos for Beginners
  {
    id: 'v3',
    title: 'DACs and Amps Explained Simply',
    type: 'video',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.youtube.com/watch?v=a_426RiwST8',
    description: 'Easy to understand explanation of what DACs and amps do and when you need them',
    author: 'Audio University',
    duration: '18 min'
  },
  {
    id: 'v4',
    title: 'How to Choose Your First Good Headphones',
    type: 'video',
    difficulty: 'beginner',
    category: 'guides',
    url: 'https://www.youtube.com/watch?v=XxuQNcQvmn8',
    description: 'Practical guide for beginners on what to consider when buying your first quality headphones',
    author: 'Joshua Valour',
    duration: '20 min'
  },
  {
    id: 'v5',
    title: 'IEM Buyer\'s Guide for Beginners',
    type: 'video',
    difficulty: 'beginner',
    category: 'guides',
    url: 'https://www.youtube.com/watch?v=q89SsUv_2Qs',
    description: 'Everything beginners need to know about choosing in-ear monitors',
    author: 'Crinacle',
    duration: '25 min'
  },
  {
    id: 'v6',
    title: 'Open vs Closed Back Headphones',
    type: 'video',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.youtube.com/watch?v=YA6QA17JPBo',
    description: 'Clear explanation of the differences between open and closed back headphones',
    author: 'Audio Technica',
    duration: '8 min'
  },
  {
    id: 'v7',
    title: 'Understanding Frequency Response',
    type: 'video',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.youtube.com/watch?v=PngTj7hy5js',
    description: 'Learn how to read frequency response graphs and what they mean for sound quality',
    author: 'Resolve Reviews',
    duration: '22 min'
  },
  {
    id: 'v8',
    title: 'Budget Headphone Setup Guide',
    type: 'video',
    difficulty: 'beginner',
    category: 'guides',
    url: 'https://www.youtube.com/watch?v=VgTnJ3JQQ0k',
    description: 'How to build a great sounding audio setup on a budget',
    author: 'Z Reviews',
    duration: '16 min'
  },
  {
    id: 'v9',
    title: 'Headphone Impedance Explained',
    type: 'video',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.youtube.com/watch?v=lPSLaEjYWLs',
    description: 'Simple explanation of impedance and why it matters for headphones',
    author: 'Audio University',
    duration: '12 min'
  },
  {
    id: 'v10',
    title: 'Planar vs Dynamic Drivers',
    type: 'video',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.youtube.com/watch?v=gvYvNf1crOQ',
    description: 'Differences between planar magnetic and dynamic driver headphones',
    author: 'Resolve Reviews',
    duration: '19 min'
  },
  {
    id: 'v11',
    title: 'EQ Basics for Headphones',
    type: 'video',
    difficulty: 'intermediate',
    category: 'guides',
    url: 'https://www.youtube.com/watch?v=FRYOLCmRFl8',
    description: 'Introduction to equalizing headphones for better sound',
    author: 'oratory1990',
    duration: '22 min'
  },
  {
    id: 'v12',
    title: 'Soundstage and Imaging Explained',
    type: 'video',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.youtube.com/watch?v=Ybz4XRmVaV8',
    description: 'Understanding spatial qualities in headphone audio',
    author: 'Joshua Valour',
    duration: '14 min'
  },
  {
    id: 'v13',
    title: 'Tube Amps vs Solid State',
    type: 'video',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.youtube.com/watch?v=VgTMJ3JQQ0k',
    description: 'Comparing tube and solid state amplifier characteristics',
    author: 'Z Reviews',
    duration: '18 min'
  },

  // Guides
  {
    id: '8',
    title: 'Buying Used Audio Gear Safely',
    type: 'article',
    difficulty: 'intermediate',
    category: 'guides',
    url: 'https://www.reddit.com/r/AVexchange/wiki/index',
    description: 'How to avoid scams and get great deals on used equipment',
    author: 'r/AVexchange'
  },
  {
    id: '9',
    title: 'Headphone Purchase Guide',
    type: 'article',
    difficulty: 'beginner',
    category: 'guides',
    url: 'https://www.reddit.com/r/headphones/comments/15ul6x6/2023_audeze_lcd2_classic_vs_hifiman_edition_xs/',
    description: 'Research-based recommendations for different budgets and use cases',
    author: 'r/headphones'
  },
  {
    id: '10',
    title: 'EQ and DSP for Headphones',
    type: 'article',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.audiosciencereview.com/forum/index.php?threads/equalizer-apo-tutorial.7472/',
    description: 'How to properly EQ headphones using measurements',
    author: 'Audio Science Review'
  },
  // Communities
  {
    id: '11',
    title: 'r/headphones Community',
    type: 'community',
    difficulty: 'beginner',
    category: 'guides',
    url: 'https://www.reddit.com/r/headphones',
    description: 'Active community for questions and discussions',
    author: 'Reddit'
  },
  {
    id: '12',
    title: 'Audio Science Review Forum',
    type: 'community',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.audiosciencereview.com/forum/',
    description: 'Science-based audio discussions with objective measurements',
    author: 'Audio Science Review'
  },
  {
    id: '13',
    title: 'Head-Fi Measurement Database',
    type: 'tool',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.head-fi.org/threads/headphone-measurements-database.908070/',
    description: 'Comprehensive database of headphone measurements',
    author: 'Head-Fi'
  },
  {
    id: '14',
    title: 'Crinacle\'s Headphone Rankings',
    type: 'tool',
    difficulty: 'intermediate',
    category: 'reviews',
    url: 'https://crinacle.com/rankings/headphones/',
    description: 'Measurement-based rankings and reviews of popular headphones',
    author: 'Crinacle'
  },
  {
    id: '15',
    title: 'AutoEQ Database',
    type: 'tool',
    difficulty: 'advanced',
    category: 'technical',
    url: 'https://github.com/jaakkopasanen/AutoEq',
    description: 'Automated EQ curves for thousands of headphones based on measurements',
    author: 'jaakkopasanen'
  }
];

// Pre-compute stats on the server
const stats = {
  videos: resources.filter(r => r.type === 'video').length,
  articles: resources.filter(r => r.type === 'article').length,
  communities: resources.filter(r => r.type === 'community').length,
  beginner: resources.filter(r => r.difficulty === 'beginner').length,
};

export default function LearnPage() {
  return (
    <main className="min-h-screen w-full bg-primary flex justify-center items-start px-4 sm:px-6 md:px-8 lg:px-12 py-8 overflow-x-hidden">
      <div className="max-w-6xl w-full">
        {/* Hero Section — server rendered */}
        <section className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-hover rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-accent/20">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="heading-1 mb-4">Learn Audio</h1>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            Curated resources to help you understand audio gear and make better decisions about headphones, DACs, and amplifiers.
          </p>
        </section>

        {/* Quick Stats — server rendered */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">{stats.videos}</div>
            <div className="text-sm text-secondary">Videos</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">{stats.articles}</div>
            <div className="text-sm text-secondary">Articles</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">{stats.communities}</div>
            <div className="text-sm text-secondary">Communities</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">{stats.beginner}</div>
            <div className="text-sm text-secondary">Beginner</div>
          </div>
        </div>

        {/* Interactive content — client component */}
        <LearnContent resources={resources} />
      </div>
    </main>
  );
}
