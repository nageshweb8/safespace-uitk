import React from 'react';
import { StreamInfoProps } from '../../types/video';
import { cn } from '../../utils/cn';

export const StreamInfo: React.FC<StreamInfoProps> = ({
  stream,
  showLiveIndicator = true,
  className
}) => {
  return (
    <div className={cn('absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded', className)}>
      <span>{stream.title}</span>
      {stream.isLive && showLiveIndicator && (
        <span className="ml-2 px-1 bg-red-600 rounded text-[10px] live-indicator">
          LIVE
        </span>
      )}
      {stream.metadata?.resolution && (
        <span className="ml-2 text-[10px] opacity-75">
          {stream.metadata.resolution}
        </span>
      )}
    </div>
  );
};
