import React, { useEffect, useRef } from 'react';
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
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onClick?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const LiveVideoTile: React.FC<LiveVideoTileProps> = ({
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

  const handleExposeVideoRef = (video: HTMLVideoElement | null) => {
    videoElementRef.current = video;
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-black rounded-md isolate',
        isPrimary ? 'shadow-[0_0_0_2px_rgba(67,228,255,0.35)]' : '',
        className
      )}
      style={style}
      onClick={onClick}
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
          onError={error => {
            if (onError && stream) {
              onError(error);
            }
          }}
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
          onPlayPause={onTogglePlay}
          onMuteUnmute={onToggleMute}
          onFullscreen={onFullscreen}
          showControls
          size={controlsSize}
        />
      )}
    </div>
  );
};
