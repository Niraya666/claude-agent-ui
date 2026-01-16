import { Download, Expand, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface InlineImageProps {
  path: string;
  alt?: string;
}

export default function InlineImage({ path, alt }: InlineImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageSrc = `/agent/image?path=${encodeURIComponent(path)}`;
  const downloadUrl = `/agent/download?path=${encodeURIComponent(path)}`;
  const fileName = path.split('/').pop() ?? 'image';

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
      <div className="inline-image-error rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
        Failed to load image: {fileName}
      </div>
    );
  }

  return (
    <>
      {/* Inline thumbnail */}
      <div className="inline-image-container group relative">
        {isLoading && (
          <div className="inline-image-skeleton h-48 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        )}
        <img
          src={imageSrc}
          alt={alt ?? fileName}
          className={`inline-image max-h-80 max-w-full cursor-zoom-in rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] object-contain shadow-sm transition-shadow hover:shadow-md ${
            isLoading ? 'hidden' : ''
          }`}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          onClick={handleExpand}
        />
        {/* Hover actions */}
        {!isLoading && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleExpand}
              className="rounded-md bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              title="Expand"
            >
              <Expand className="h-4 w-4" />
            </button>
            <a
              href={downloadUrl}
              className="rounded-md bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}
        {/* File name badge */}
        {!isLoading && (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {fileName}
          </div>
        )}
      </div>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="glass-panel relative max-h-[90vh] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <div className="text-[13px] font-semibold text-[var(--ink)]">{fileName}</div>
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
            <div className="flex items-center justify-center overflow-auto p-4">
              <img
                src={imageSrc}
                alt={alt ?? fileName}
                className="max-h-[80vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
