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
    case 'beginner': return 'bg-success/20 text-success border-success/50';
    case 'intermediate': return 'bg-warning/20 text-warning border-warning/50';
    case 'advanced': return 'bg-error/20 text-error border-error/50';
  }
};

const getCategoryColor = (category: Resource['category']) => {
  switch(category) {
    case 'basics': return 'bg-info/20 text-info';
    case 'technical': return 'bg-accent/20 text-accent';
    case 'guides': return 'bg-warning/20 text-warning';
    case 'reviews': return 'bg-accent/20 text-accent';
  }
};

export default function LearnContent({ resources }: { resources: Resource[] }) {
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

  const clearAllFilters = () => {
    setSelectedType('all');
    setSelectedDifficulty('all');
    setSelectedCategory('all');
  };

  return (
    <>
      {/* Filters */}
      <div className="card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Type Filter */}
          <div>
            <label className="text-sm text-secondary mb-2 block font-medium">Content Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-surface-elevated border rounded-lg p-3 text-primary focus:border-accent focus:outline-none"
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
            <label className="text-sm text-secondary mb-2 block font-medium">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-surface-elevated border rounded-lg p-3 text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="beginner">🟢 Beginner</option>
              <option value="intermediate">🟡 Intermediate</option>
              <option value="advanced">🔴 Advanced</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm text-secondary mb-2 block font-medium">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-surface-elevated border rounded-lg p-3 text-primary focus:border-accent focus:outline-none"
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
          <p className="text-secondary">
            Showing {filteredResources.length} of {resources.length} resources
          </p>
          <button
            onClick={clearAllFilters}
            className="text-accent hover:text-accent-hover text-sm font-medium"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Featured Resources */}
      {showFeatured && featuredResources.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-2">⭐ Featured Resources</h2>
            <button
              onClick={() => setShowFeatured(!showFeatured)}
              className="text-secondary hover:text-primary text-sm"
            >
              Hide Featured
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {featuredResources.slice(0, 3).map(resource => (
              <div key={resource.id} className="card bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 p-6 hover:border-accent/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{getTypeIcon(resource.type)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(resource.difficulty)}`}>
                    {resource.difficulty}
                  </span>
                </div>

                <h3 className="font-semibold text-lg mb-2 text-primary">{resource.title}</h3>
                {resource.author && (
                  <p className="text-sm text-secondary mb-2">by {resource.author}</p>
                )}

                <p className="text-secondary text-sm mb-4">{resource.description}</p>

                <div className="flex items-center justify-between">
                  {resource.duration && (
                    <span className="text-xs bg-surface-elevated px-2 py-1 rounded text-secondary">
                      {resource.duration}
                    </span>
                  )}

                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-primary text-sm"
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
          <h2 className="heading-2 mb-4">All Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regularResources.map(resource => (
              <div key={resource.id} className="card border p-6 hover:border-accent transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1 text-primary">{resource.title}</h3>
                    {resource.author && (
                      <p className="text-sm text-secondary">by {resource.author}</p>
                    )}
                  </div>
                  <span className="text-xl ml-4">{getTypeIcon(resource.type)}</span>
                </div>

                <p className="text-secondary text-sm mb-4">{resource.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(resource.difficulty)}`}>
                      {resource.difficulty}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(resource.category)}`}>
                      {resource.category}
                    </span>
                    {resource.duration && (
                      <span className="text-xs bg-surface-elevated px-2 py-1 rounded text-secondary">
                        {resource.duration}
                      </span>
                    )}
                  </div>

                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover text-sm font-medium"
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
          <p className="text-secondary text-lg mb-4">No resources found with these filters.</p>
          <button
            onClick={clearAllFilters}
            className="button button-primary"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Add Resource CTA */}
      <div className="mt-16 card p-8 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 text-center">
        <h3 className="heading-3 mb-2">Know a great resource?</h3>
        <p className="text-secondary mb-6">Help the community by suggesting additions to our learning library</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:suggestions@hifinder.app?subject=Resource Suggestion&body=Resource Title:%0D%0AURL:%0D%0ADescription:%0D%0AAuthor:%0D%0AType (video/article/community):%0D%0ADifficulty (beginner/intermediate/advanced):%0D%0ACategory (basics/technical/guides/reviews):"
            className="button button-primary"
          >
            📧 Suggest a Resource
          </a>
          <Link
            href="/recommendations"
            className="button button-secondary"
          >
            Get Recommendations
          </Link>
        </div>
      </div>
    </>
  );
}
