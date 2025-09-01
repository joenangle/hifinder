'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    title: 'Open vs Closed Back Headphones',
    type: 'video',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.youtube.com/watch?v=example1',
    description: 'Learn the fundamental differences and which is right for you',
    duration: '8 min',
    author: 'DMS',
    featured: true
  },
  {
    id: '2',
    title: 'Do You Really Need an Amp?',
    type: 'article',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.headphones.com/blogs/news/do-you-need-an-amp',
    description: 'Understanding when amplification is necessary and when it\'s not',
    author: 'Head-Fi',
    featured: true
  },
  {
    id: '3',
    title: 'Sound Signatures Explained',
    type: 'article',
    difficulty: 'beginner',
    category: 'basics',
    url: 'https://www.reddit.com/r/headphones/wiki/sound_signatures',
    description: 'Warm vs neutral vs bright - what does it all mean?',
    author: 'r/headphones Wiki',
    featured: true
  },
  // Technical
  {
    id: '4',
    title: 'Understanding Impedance & Sensitivity',
    type: 'video',
    difficulty: 'intermediate',
    category: 'technical',
    url: 'https://www.youtube.com/watch?v=example2',
    description: 'Technical specs explained in simple terms',
    duration: '12 min',
    author: 'Joshua Valour'
  },
  {
    id: '5',
    title: 'What is a DAC and Do You Need One?',
    type: 'video',
    difficulty: 'beginner',
    category: 'technical',
    url: 'https://www.youtube.com/watch?v=example3',
    description: 'Digital to Analog Converters demystified',
    duration: '10 min',
    author: 'Z Reviews'
  },
  {
    id: '6',
    title: 'Reading Frequency Response Graphs',
    type: 'video',
    difficulty: 'advanced',
    category: 'technical',
    url: 'https://www.youtube.com/watch?v=example4',
    description: 'Learn to interpret measurements like a pro',
    duration: '15 min',
    author: 'Crinacle'
  },
  {
    id: '7',
    title: 'Balanced vs Single-Ended Explained',
    type: 'article',
    difficulty: 'advanced',
    category: 'technical',
    url: 'https://www.headphones.com/blogs/news/balanced-audio',
    description: 'Is balanced audio worth the extra cost?',
    author: 'Headphones.com'
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
    title: 'First Headphone Setup Guide',
    type: 'article',
    difficulty: 'beginner',
    category: 'guides',
    url: 'https://www.reddit.com/r/headphones/wiki/getting_started',
    description: 'Complete beginner\'s guide to your first audiophile setup',
    author: 'r/headphones'
  },
  // Communities
  {
    id: '10',
    title: 'r/headphones Community',
    type: 'community',
    difficulty: 'beginner',
    category: 'guides',
    url: 'https://www.reddit.com/r/headphones',
    description: 'Active community for questions and discussions',
    author: 'Reddit'
  },
  {
    id: '11',
    title: 'Head-Fi Forums',
    type: 'community',
    difficulty: 'intermediate',
    category: 'guides',
    url: 'https://www.head-fi.org',
    description: 'Deep discussions and extensive reviews',
    author: 'Head-Fi'
  },
  {
    id: '12',
    title: 'ASR Forum',
    type: 'community',
    difficulty: 'advanced',
    category: 'technical',
    url: 'https://www.audiosciencereview.com/forum',
    description: 'Science-based audio discussions and measurements',
    author: 'Audio Science Review'
  }
];

export default function LearnPage() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFeatured, setShowFeatured] = useState(true);

  const filteredResources = resources.filter(resource => {
    const typeMatch = selectedType === 'all' || resource.type === selectedType;
    const difficultyMatch = selectedDifficulty === 'all' || resource.difficulty === selectedDifficulty;
    const categoryMatch = selectedCategory === 'all' || resource.category === selectedCategory;
    return typeMatch && difficultyMatch && categoryMatch;
  });

  const featuredResources = filteredResources.filter(resource => resource.featured);
  const regularResources = filteredResources.filter(resource => !resource.featured);

  const getTypeIcon = (type: Resource['type']) => {
    switch(type) {
      case 'video': return '▶️';
      case 'article': return '📝';
      case 'tool': return '🔧';
      case 'community': return '💬';
    }
  };

  const getDifficultyColor = (difficulty: Resource['difficulty']) => {
    switch(difficulty) {
      case 'beginner': return 'bg-green-600/30 text-green-300 border-green-500/50';
      case 'intermediate': return 'bg-yellow-600/30 text-yellow-300 border-yellow-500/50';
      case 'advanced': return 'bg-red-600/30 text-red-300 border-red-500/50';
    }
  };

  const getCategoryColor = (category: Resource['category']) => {
    switch(category) {
      case 'basics': return 'bg-blue-600/30 text-blue-300';
      case 'technical': return 'bg-purple-600/30 text-purple-300';
      case 'guides': return 'bg-orange-600/30 text-orange-300';
      case 'reviews': return 'bg-pink-600/30 text-pink-300';
    }
  };

  const clearAllFilters = () => {
    setSelectedType('all');
    setSelectedDifficulty('all');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">Learn Audio</h1>
          <p className="text-gray-400 text-lg">Curated resources to help you understand audio gear and make better decisions</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{resources.filter(r => r.type === 'video').length}</div>
            <div className="text-sm text-gray-400">Videos</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">{resources.filter(r => r.type === 'article').length}</div>
            <div className="text-sm text-gray-400">Articles</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-400">{resources.filter(r => r.type === 'community').length}</div>
            <div className="text-sm text-gray-400">Communities</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-400">{resources.filter(r => r.difficulty === 'beginner').length}</div>
            <div className="text-sm text-gray-400">Beginner</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Type Filter */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-medium">Content Type</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="video">▶️ Videos</option>
                <option value="article">📝 Articles</option>
                <option value="community">💬 Communities</option>
                <option value="tool">🔧 Tools</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-medium">Difficulty</label>
              <select 
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Levels</option>
                <option value="beginner">🟢 Beginner</option>
                <option value="intermediate">🟡 Intermediate</option>
                <option value="advanced">🔴 Advanced</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-medium">Category</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="basics">💡 Basics</option>
                <option value="technical">⚙️ Technical</option>
                <option value="guides">📚 Guides</option>
                <option value="reviews">⭐ Reviews</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center">
            <p className="text-gray-400">
              Showing {filteredResources.length} of {resources.length} resources
            </p>
            <button 
              onClick={clearAllFilters}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Featured Resources */}
        {showFeatured && featuredResources.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">⭐ Featured Resources</h2>
              <button
                onClick={() => setShowFeatured(!showFeatured)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Hide Featured
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {featuredResources.slice(0, 3).map(resource => (
                <div key={resource.id} className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 p-6 rounded-lg hover:border-blue-400/50 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{getTypeIcon(resource.type)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(resource.difficulty)}`}>
                      {resource.difficulty}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{resource.title}</h3>
                  {resource.author && (
                    <p className="text-sm text-gray-400 mb-2">by {resource.author}</p>
                  )}
                  
                  <p className="text-gray-300 text-sm mb-4">{resource.description}</p>
                  
                  <div className="flex items-center justify-between">
                    {resource.duration && (
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                        {resource.duration}
                      </span>
                    )}
                    
                    <a 
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {resource.type === 'video' ? 'Watch' : 
                       resource.type === 'community' ? 'Visit' : 'Read'} →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Resources */}
        {regularResources.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">All Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regularResources.map(resource => (
                <div key={resource.id} className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-750 hover:border-gray-600 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{resource.title}</h3>
                      {resource.author && (
                        <p className="text-sm text-gray-400">by {resource.author}</p>
                      )}
                    </div>
                    <span className="text-xl ml-4">{getTypeIcon(resource.type)}</span>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4">{resource.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(resource.difficulty)}`}>
                        {resource.difficulty}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(resource.category)}`}>
                        {resource.category}
                      </span>
                      {resource.duration && (
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                          {resource.duration}
                        </span>
                      )}
                    </div>
                    
                    <a 
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      {resource.type === 'video' ? 'Watch' : 
                       resource.type === 'community' ? 'Visit' : 'Read'} →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400 text-lg mb-4">No resources found with these filters.</p>
            <button 
              onClick={clearAllFilters}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Add Resource CTA */}
        <div className="mt-16 p-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg text-center">
          <h3 className="text-xl font-semibold mb-2">Know a great resource?</h3>
          <p className="text-gray-400 mb-6">Help the community by suggesting additions to our learning library</p>
          <div className="flex gap-4 justify-center">
            <a 
              href="mailto:suggestions@hifinder.app?subject=Resource Suggestion&body=Resource Title:%0D%0AURL:%0D%0ADescription:%0D%0AAuthor:%0D%0AType (video/article/community):%0D%0ADifficulty (beginner/intermediate/advanced):%0D%0ACategory (basics/technical/guides/reviews):"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📧 Suggest a Resource
            </a>
            <Link 
              href="/"
              className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Recommendations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}