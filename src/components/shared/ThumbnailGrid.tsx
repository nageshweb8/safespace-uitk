import React, { useMemo } from 'react';
import { Typography } from 'antd';
import { ThumbnailGridProps, CameraStream } from '../../types/video';
import { VideoPlayer } from '../VideoPlayer';
import { VideoControls } from '../shared/VideoControls';
import { StreamInfo } from '../shared/StreamInfo';
import { ProgressBar } from '../shared/ProgressBar';

const { Text } = Typography;

// Memoized thumbnail item to prevent re-renders when other thumbnails change
interface ThumbnailItemProps {
  stream: CameraStream;
  index: number;
  onStreamSelect: (index: number) => void;
  onFullscreen?: () => void;
  showControls?: boolean;
  size?: 'small' | 'large';
}

const ThumbnailItem = React.memo<ThumbnailItemProps>(({
  stream,
  index,
  onStreamSelect,
  onFullscreen,
  showControls = false,
}) => {
  return (
    <div
      className="relative overflow-hidden rounded-md bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-1 min-h-0"
      onClick={() => onStreamSelect(index)}
    >
      <VideoPlayer
        stream={stream}
        autoPlay={true}
        muted={true}
        controls={false}
        showOverlay={true}
        className="hover:scale-105 transition-transform"
      />

      <StreamInfo
        stream={stream}
        showLiveIndicator={true}
        className="text-[10px] px-1 py-0.5"
      />

      <VideoControls
        isPlaying={false}
        isMuted={true}
        onPlayPause={() => {}}
        onMuteUnmute={() => {}}
        onFullscreen={onFullscreen || (() => {})}
        showControls={showControls}
        size="small"
      />

      <ProgressBar
        progress={30 + index * 10}
        size="small"
        color="white"
        className="px-1 pb-0.5"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the stream itself changes (by id or url)
  return (
    prevProps.stream.id === nextProps.stream.id &&
    prevProps.stream.url === nextProps.stream.url &&
    prevProps.index === nextProps.index
  );
});

ThumbnailItem.displayName = 'ThumbnailItem';

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  streams,
  activeStreamIndex,
  onStreamSelect,
  onFullscreen,
  layout,
  maxVisible = 3,
}) => {
  const streamCount = streams.length;

  if (streamCount === 2 && layout === 'horizontal') {
    // 50:50 layout for 2 videos
    const inactiveStream = streams[activeStreamIndex === 0 ? 1 : 0];
    const inactiveIndex = activeStreamIndex === 0 ? 1 : 0;

    return (
      <div className="w-full h-full">
        <div
          className="relative w-full h-full overflow-hidden rounded-lg bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
          onClick={() => onStreamSelect(inactiveIndex)}
        >
          <VideoPlayer
            stream={inactiveStream}
            autoPlay={true}
            muted={true}
            controls={false}
            showOverlay={true}
            className="hover:scale-105 transition-transform"
          />

          <StreamInfo stream={inactiveStream} showLiveIndicator={true} />

          <VideoControls
            isPlaying={false}
            isMuted={true}
            onPlayPause={() => {}}
            onMuteUnmute={() => {}}
            onFullscreen={onFullscreen}
            showControls={true}
            size="small"
          />

          <ProgressBar
            progress={45 + inactiveIndex * 10}
            size="small"
            color="white"
          />
        </div>
      </div>
    );
  }

  if (streamCount >= 3 && layout === 'vertical') {
    // Thumbnail grid layout for 3+ videos (25% width area)
    // Memoize the thumbnail streams to prevent recalculating on every render
    const thumbnailStreams = streams
      .map((stream, index) => ({ stream, index }))
      .filter(({ index }) => index !== activeStreamIndex)
      .slice(0, maxVisible);

    return (
      <div className="w-full h-full">
        <div className="flex flex-col gap-2 h-full">
          {thumbnailStreams.map(({ stream, index }) => (
            <ThumbnailItem
              key={stream.id}
              stream={stream}
              index={index}
              onStreamSelect={onStreamSelect}
              onFullscreen={onFullscreen}
              showControls={false}
            />
          ))}

          {/* Show indicator if there are more videos */}
          {streams.length > maxVisible + 1 && (
            <div className="text-center py-1">
              <Text className="text-xs text-gray-500">
                +{streams.length - maxVisible - 1} more
              </Text>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
