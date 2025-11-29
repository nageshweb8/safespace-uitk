import React, { memo, useEffect, useRef, useCallback } from 'react';
import { CameraStream } from '../../types/video';
import { VideoPlayer } from '../VideoPlayer';
import { VideoControls } from '../shared/VideoControls';
import { cn } from '../../utils/cn';

export interface LiveVideoTileProps {
  stream?: CameraStream;
  index: number;
  isPrimary?: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  showControls: boolean;
  controlsSize: 'small' | 'medium';
  showLabel: boolean;
  labelPlacement?: 'top' | 'bottom';
  onTogglePlay: (streamId: string) => void;
  onToggleMute: (streamId: string) => void;
  onFullscreen: (streamId: string) => void;
  onClick?: (streamId: string) => void;
  onError?: (error: Error, streamId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const LiveVideoTileInner: React.FC<LiveVideoTileProps> = ({
  stream,
  index,
  isPrimary = false,
  isPlaying,
  isMuted,
  showControls,
  controlsSize,
  showLabel,
  labelPlacement = 'top',
  onTogglePlay,
  onToggleMute,
  onFullscreen,
  onClick,
  onError,
  className,
  style,
}) => {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const hasStream = !!stream && !!stream.url;
  const streamId = stream?.id ?? '';

  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;
    if (isMuted !== video.muted) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          /* ignore */
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const handleExposeVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoElementRef.current = video;
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (streamId) onTogglePlay(streamId);
  }, [streamId, onTogglePlay]);

  const handleToggleMute = useCallback(() => {
    if (streamId) onToggleMute(streamId);
  }, [streamId, onToggleMute]);

  const handleFullscreen = useCallback(() => {
    if (streamId) onFullscreen(streamId);
  }, [streamId, onFullscreen]);

  const handleClick = useCallback(() => {
    if (streamId && onClick) onClick(streamId);
  }, [streamId, onClick]);

  const handleError = useCallback((error: Error) => {
    if (onError && streamId) {
      onError(error, streamId);
    }
  }, [onError, streamId]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-black rounded-md isolate',
        isPrimary ? 'shadow-[0_0_0_2px_rgba(67,228,255,0.35)]' : '',
        className
      )}
      style={style}
      onClick={handleClick}
    >
      {hasStream ? (
        <VideoPlayer
          key={stream?.id ?? index}
          stream={stream!}
          autoPlay={isPlaying}
          muted={isMuted}
          controls={false}
          objectFit="cover"
          exposeVideoRef={handleExposeVideoRef}
          onError={handleError}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-black text-xs text-gray-300">
          No Video
        </div>
      )}

      {showLabel && (
        <div
          className={cn(
            'pointer-events-none absolute left-0 right-0 flex items-center justify-between px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-[1px]',
            labelPlacement === 'bottom'
              ? 'bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent'
              : 'top-0 bg-gradient-to-b from-black/75 via-black/40 to-transparent'
          )}
        >
          <span>{stream?.title || `Camera ${index + 1}`}</span>
        </div>
      )}

      {showControls && hasStream && (
        <VideoControls
          isPlaying={isPlaying}
          isMuted={isMuted}
          onPlayPause={handleTogglePlay}
          onMuteUnmute={handleToggleMute}
          onFullscreen={handleFullscreen}
          showControls
          size={controlsSize}
        />
      )}
    </div>
  );
};

// Memoize to prevent re-renders when parent state changes but this tile's props haven't
export const LiveVideoTile = memo(LiveVideoTileInner, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.stream?.id === nextProps.stream?.id &&
    prevProps.stream?.url === nextProps.stream?.url &&
    prevProps.stream?.title === nextProps.stream?.title &&
    prevProps.index === nextProps.index &&
    prevProps.isPrimary === nextProps.isPrimary &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.showControls === nextProps.showControls &&
    prevProps.controlsSize === nextProps.controlsSize &&
    prevProps.showLabel === nextProps.showLabel &&
    prevProps.labelPlacement === nextProps.labelPlacement &&
    prevProps.className === nextProps.className &&
    prevProps.onTogglePlay === nextProps.onTogglePlay &&
    prevProps.onToggleMute === nextProps.onToggleMute &&
    prevProps.onFullscreen === nextProps.onFullscreen &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onError === nextProps.onError
  );
});