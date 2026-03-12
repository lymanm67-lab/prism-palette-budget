import { useState, useRef, useCallback, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

const THRESHOLD = 80;

const PullToRefresh = ({ children, onRefresh, className }: PullToRefreshProps) => {
  const isMobile = useIsMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || refreshing) return;
    // Only activate if scrolled to top
    if (containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Resistance curve
      const distance = Math.min(diff * 0.4, 120);
      setPullDistance(distance);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10;

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: showIndicator ? pullDistance : 0 }}
      >
        <div
          className="flex items-center justify-center rounded-full bg-muted h-9 w-9"
          style={{
            opacity: progress,
            transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
            transition: pulling.current ? 'none' : 'all 0.3s ease',
          }}
        >
          <RefreshCw
            className={`h-4 w-4 text-primary ${refreshing ? 'animate-spinner' : ''}`}
          />
        </div>
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
