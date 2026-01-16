import { BarChart3 } from 'lucide-react';

import { type ExtractedMedia } from '../../utils/mediaPathExtractor';
import InlineImage from './InlineImage';
import PlotlyViewer from './PlotlyViewer';

interface InlineMediaDisplayProps {
  mediaItems: ExtractedMedia[];
  className?: string;
}

export default function InlineMediaDisplay({
  mediaItems,
  className = ''
}: InlineMediaDisplayProps) {
  if (mediaItems.length === 0) {
    return null;
  }

  const images = mediaItems.filter((item) => item.type === 'image');
  const htmlCharts = mediaItems.filter((item) => item.type === 'plotly_html');

  return (
    <div className={`inline-media-output ${className}`}>
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[var(--accent-cool)]" />
        <span className="text-[11px] font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
          Output
        </span>
        <span className="text-[11px] text-[var(--ink-faint)]">
          {mediaItems.length} {mediaItems.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Images grid */}
      {images.length > 0 && (
        <div
          className={`mb-4 ${
            images.length === 1 ? ''
            : images.length === 2 ? 'grid grid-cols-2 gap-3'
            : 'grid grid-cols-2 gap-3 lg:grid-cols-3'
          }`}
        >
          {images.map((item) => (
            <InlineImage key={item.path} path={item.path} />
          ))}
        </div>
      )}

      {/* Interactive HTML charts */}
      {htmlCharts.length > 0 && (
        <div className="space-y-4">
          {htmlCharts.map((item) => (
            <PlotlyViewer key={item.path} path={item.path} />
          ))}
        </div>
      )}
    </div>
  );
}
