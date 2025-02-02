// hooks/validador-ml/useInfiniteScroll.js
import { useEffect, useCallback } from 'react';

export const useInfiniteScroll = (containerRef, onLoadMore, hasMore, loading) => {
  const handleScroll = useCallback(() => {
    if (!containerRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener('scroll', handleScroll);
      return () => currentContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
};