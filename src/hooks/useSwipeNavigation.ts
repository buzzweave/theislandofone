import { useCallback, useRef, useState } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseSwipeNavigationProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: UseSwipeNavigationProps): SwipeHandlers {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      setIsSwiping(false);
    }
  }, [isSwiping]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && onSwipeRight) onSwipeRight();
      else if (deltaX < 0 && onSwipeLeft) onSwipeLeft();
    }
    setIsSwiping(false);
  }, [isSwiping, threshold, onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
