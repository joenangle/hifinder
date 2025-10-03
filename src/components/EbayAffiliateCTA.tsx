'use client'

import { ExternalLink } from 'lucide-react'
import { generateEbayAffiliateLink, generateTrackingId, type ComponentSearchParams } from '@/lib/ebay-affiliate'

interface EbayAffiliateCTAProps {
  component: ComponentSearchParams & { id: string };
  source?: 'recommendations' | 'component_detail' | 'used_listings';
  variant?: 'primary' | 'secondary' | 'inline';
  className?: string;
}

export function EbayAffiliateCTA({
  component,
  source = 'component_detail',
  variant = 'primary',
  className = ''
}: EbayAffiliateCTAProps) {
  const handleClick = async () => {
    const trackingId = generateTrackingId(component.id, source);
    const link = generateEbayAffiliateLink(component, { customId: trackingId });

    // Track the click
    try {
      await fetch('/api/analytics/affiliate-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'ebay',
          component_id: component.id,
          tracking_id: trackingId,
          source,
          referrer_url: window.location.href
        })
      });
    } catch (error) {
      console.error('Failed to track affiliate click:', error);
    }

    // Open in new tab
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Primary button (standalone CTA)
  if (variant === 'primary') {
    return (
      <div className={`${className}`}>
        <button
          onClick={handleClick}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          <span>Check eBay Prices</span>
          <ExternalLink className="w-4 h-4" />
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Affiliate link - HiFinder may earn commission at no cost to you
        </p>
      </div>
    );
  }

  // Secondary button (among other options)
  if (variant === 'secondary') {
    return (
      <div className={`${className}`}>
        <button
          onClick={handleClick}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.5 21c0-1.5-1.5-2.5-3.5-2.5-1 0-2 0-2.5-.5S1 16.5 1 15.5s0-2 .5-2.5S3 12.5 4 12.5c2 0 3.5-1 3.5-2.5V6c0-3 2-5 5-5s5 2 5 5v4c0 1.5 1.5 2.5 3.5 2.5 1 0 2 0 2.5.5s.5 1.5.5 2.5 0 2-.5 2.5-1.5.5-2.5.5c-2 0-3.5 1-3.5 2.5v2c0 .5-.5 1-1 1h-8c-.5 0-1-.5-1-1v-2z"/>
          </svg>
          <span>eBay</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Inline link (minimal)
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors ${className}`}
    >
      <span>Check eBay</span>
      <ExternalLink className="w-3 h-3" />
    </button>
  );
}

/**
 * Compact version for listing cards
 */
export function EbayAffiliateButton({
  component,
  className = ''
}: Omit<EbayAffiliateCTAProps, 'variant' | 'source'>) {
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click if inside a clickable card
    const trackingId = generateTrackingId(component.id, 'used_listings');
    const link = generateEbayAffiliateLink(component, { customId: trackingId });

    // Track the click
    try {
      await fetch('/api/analytics/affiliate-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'ebay',
          component_id: component.id,
          tracking_id: trackingId,
          source: 'used_listings',
          referrer_url: window.location.href
        })
      });
    } catch (error) {
      console.error('Failed to track affiliate click:', error);
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 transition-colors ${className}`}
    >
      <span>eBay</span>
      <ExternalLink className="w-3 h-3" />
    </button>
  );
}
