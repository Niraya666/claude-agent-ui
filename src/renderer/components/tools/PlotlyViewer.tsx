import { Download, Expand, ExternalLink, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface PlotlyViewerProps {
  path: string;
  title?: string;
}

export default function PlotlyViewer({ path, title }: PlotlyViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const htmlSrc = `/agent/html?path=${encodeURIComponent(path)}`;
  const downloadUrl = `/agent/download?path=${encodeURIComponent(path)}`;
  const fileName = title ?? path.split('/').pop() ?? 'chart.html';

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
  }, []);

  if (hasError) {
    return (
      <div className="plotly-error rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
        Failed to load interactive chart: {fileName}
      </div>
    );
  }

  return (
    <>
      {/* Inline viewer */}
      <div className="plotly-container group relative overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--ink-muted)]">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Interactive Chart</span>
            <span className="text-[var(--ink-faint)]">·</span>
            <span className="max-w-[200px] truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExpand}
              className="rounded-md p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-contrast)] hover:text-[var(--ink)]"
              title="Expand"
            >
              <Expand className="h-4 w-4" />
            </button>
            <a
              href={downloadUrl}
              className="rounded-md p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-contrast)] hover:text-[var(--ink)]"
              title="Download HTML"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex h-[400px] items-center justify-center bg-neutral-50 dark:bg-neutral-900">
            <div className="text-sm text-[var(--ink-muted)]">Loading chart...</div>
          </div>
        )}

        {/* Sandboxed iframe */}
        <iframe
          src={htmlSrc}
          title={fileName}
          className={`w-full bg-white ${isLoading ? 'hidden' : ''}`}
          style={{ height: '400px', border: 'none' }}
          sandbox="allow-scripts"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="glass-panel flex h-[90vh] w-[90vw] max-w-6xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-[13px] font-semibold text-[var(--ink)]">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={downloadUrl}
                  className="action-button flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={handleClose}
                  className="action-button flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={htmlSrc}
                title={fileName}
                className="h-full w-full bg-white"
                style={{ border: 'none' }}
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
