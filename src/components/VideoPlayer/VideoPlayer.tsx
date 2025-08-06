import React, { useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { VideoPlayerProps } from '../../types/video';
import { cn } from '../../utils/cn';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  autoPlay = true,
  muted = true,
  controls = false,
  className,
  onError,
  onLoadStart,
  onLoadEnd,
  showOverlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream.url) return;

    onLoadStart?.();

    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    cleanup();

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = stream.url;
      onLoadEnd?.();
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        startLevel: -1,
        autoStartLoad: true,
        capLevelToPlayerSize: true,
      });
      
      hlsRef.current = hls;
      hls.loadSource(stream.url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onLoadEnd?.();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              onError?.(new Error(`Network Error: ${data.details}`));
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              onError?.(new Error(`Media Error: ${data.details}`));
              try {
                hls.recoverMediaError();
              } catch (recoverError) {
                onError?.(new Error(`Media Error Recovery Failed: ${recoverError}`));
              }
              break;
            default:
              onError?.(new Error(`Fatal Error: ${data.type} - ${data.details}`));
              break;
          }
        }
      });
    } else {
      onError?.(new Error('HLS not supported in this browser'));
    }

    return cleanup;
  }, [stream.url, onError, onLoadStart, onLoadEnd]);

  const handleVideoError = () => {
    onError?.(new Error('Video playback error'));
  };

  const handleVideoLoadStart = () => {
    onLoadStart?.();
  };

  const handleVideoLoadedData = () => {
    onLoadEnd?.();
  };

  return (
    <div className={cn('relative w-full h-full', className)}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        playsInline
        className="w-full h-full object-cover"
        onError={handleVideoError}
        onLoadStart={handleVideoLoadStart}
        onLoadedData={handleVideoLoadedData}
        onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
      />
      
      {showOverlay && (
        <div className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors" />
      )}
    </div>
  );
};
