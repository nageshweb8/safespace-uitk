import { useMemo } from 'react';
import { StreamLayoutConfig } from '../types/video';

export function useStreamLayout(streamCount: number): StreamLayoutConfig {
  return useMemo(() => {
    if (streamCount === 1) {
      return {
        container: 'grid grid-cols-1 gap-4 h-full',
        mainVideo: 'w-full h-full',
        thumbnailContainer: 'hidden',
      };
    } else if (streamCount === 2) {
      return {
        container: 'grid grid-cols-2 gap-4 h-full',
        mainVideo: 'w-full h-full',
        thumbnailContainer: 'w-full h-full',
      };
    } else {
      return {
        container: 'grid grid-cols-4 gap-4 h-full',
        mainVideo: 'col-span-3 w-full h-full',
        thumbnailContainer: 'col-span-1 w-full h-full',
      };
    }
  }, [streamCount]);
}
