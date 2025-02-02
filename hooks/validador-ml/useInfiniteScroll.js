// hooks/validador-ml/useInfiniteScroll.js
import { useEffect, useRef, useCallback } from 'react';

export const useInfiniteScroll = (onLoadMore, hasMore, loading) => {
  const observerRef = useRef();
  const containerRef = useRef();

  const handleObserver = useCallback(entries => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 1.0
    };

    observerRef.current = new IntersectionObserver(handleObserver, options);
    
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  return containerRef;
};