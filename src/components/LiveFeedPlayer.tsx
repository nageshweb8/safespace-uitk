import React from 'react';
import { Card, Typography } from 'antd';
import { LiveFeedPlayerHandle, LiveFeedPlayerProps, CaptureFramePayload } from '../types/video';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { useStreamLayout } from '../hooks/useStreamLayout';
import { MainVideoPlayer } from './shared/MainVideoPlayer';
import { ThumbnailGrid } from './shared/ThumbnailGrid';
import { FullscreenModal } from './shared/FullscreenModal';
import { cn } from '../utils/cn';

const { Text } = Typography;

export const LiveFeedPlayer = React.forwardRef<LiveFeedPlayerHandle, LiveFeedPlayerProps>(({
  streams,
  className,
  autoPlay = true,
  muted = true,
  controls = true,
  showThumbnails = true,
  onStreamChange,
  onError,
  theme = 'light',
  title = 'Live Feed',
  subtitle = 'All pinned cameras will be displayed here',
  maxThumbnails = 3,
  enableFullscreen = true,
  enableKeyboardControls = true,
  showCaptureButton = false,
  captureIcon,
  captureTooltip,
  onCapture,
}, ref) => {
  const {
    activeStreamIndex,
    isPlaying,
    isMuted,
    isFullscreen,
    error,
    togglePlayPause,
    toggleMute,
    toggleFullscreen,
    handleStreamChange,
    handleError,
    handleRetry,
  } = useVideoPlayer(streams, autoPlay, muted, onStreamChange, onError);

  const layoutClasses = useStreamLayout(streams.length);
  const streamCount = streams.length;
  const activeStream = streams[activeStreamIndex];

  // Hold a reference to the main <video> element rendered by VideoPlayer
  const mainVideoElRef = React.useRef<HTMLVideoElement | null>(null);
  const setMainVideoElRef = (el: HTMLVideoElement | null) => {
    mainVideoElRef.current = el;
  };

  // Capture the current frame from the <video> as a JPEG Blob
  const doCapture = React.useCallback(async (): Promise<CaptureFramePayload> => {
    const video = mainVideoElRef.current;
    if (!video || !activeStream) {
      throw new Error('No active video to capture');
    }
    const w = (video as HTMLVideoElement).videoWidth || video.clientWidth;
    const h = (video as HTMLVideoElement).videoHeight || video.clientHeight;
    if (!w || !h) throw new Error('Video not ready for capture');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed capture'))), 'image/jpeg', 0.92)
    );
    const objectUrl = URL.createObjectURL(blob);
    const payload: CaptureFramePayload = {
      blob,
      objectUrl,
      width: w,
      height: h,
      timestamp: Date.now(),
      stream: activeStream,
      contentType: blob.type || 'image/jpeg',
    };
    return payload;
  }, [activeStream]);

  // Expose imperative API
  React.useImperativeHandle(ref, () => ({
    captureFrame: async () => {
      const payload = await doCapture();
      onCapture?.(payload);
      return payload;
    },
    getActiveStream: () => activeStream,
    getVideoElement: () => mainVideoElRef.current,
  }), [doCapture, onCapture, activeStream]);

  const themeClasses = {
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-900 border-gray-700',
  };

  // Keyboard controls
  React.useEffect(() => {
    if (!enableKeyboardControls) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case ' ':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          if (enableFullscreen) {
            toggleFullscreen();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (activeStreamIndex < streams.length - 1) {
            handleStreamChange(activeStreamIndex + 1);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (activeStreamIndex > 0) {
            handleStreamChange(activeStreamIndex - 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [
    enableKeyboardControls,
    togglePlayPause,
    toggleMute,
    toggleFullscreen,
    enableFullscreen,
    activeStreamIndex,
    streams.length,
    handleStreamChange,
  ]);

  if (!streams.length) {
    return (
      <Card className={cn('w-full h-full', themeClasses[theme], className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">📹</div>
            <Text type="secondary" className="text-lg">
              No camera streams available
            </Text>
            <br />
            <Text type="secondary" className="text-sm">
              Please add camera streams to view live feeds
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn('w-full h-full', themeClasses[theme], className)}
        bodyStyle={{ padding: 16, height: '100%' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <Text strong className="text-base block">
                  {title}
                </Text>
                <Text type="secondary" className="text-sm">
                  {subtitle}
                </Text>
              </div>
              {enableKeyboardControls && (
                <div className="text-xs text-gray-400">
                  <Text type="secondary" className="text-xs">
                    Keyboard: Space (play/pause), M (mute), F (fullscreen), ←→
                    (switch)
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* Video Layout */}
          <div className={layoutClasses.container}>
            {/* Main Video Area */}
            <div className={layoutClasses.mainVideo}>
              <MainVideoPlayer
                stream={activeStream}
                isPlaying={isPlaying}
                isMuted={isMuted}
                error={error}
                showControls={controls}
                streamCount={streamCount}
                onPlayPause={togglePlayPause}
                onMuteUnmute={toggleMute}
                onFullscreen={toggleFullscreen}
                onRetry={handleRetry}
                onError={handleError}
                // Capture UI wiring
                showCaptureButton={showCaptureButton}
                captureIcon={captureIcon}
                captureTooltip={captureTooltip}
                onCaptureClick={async () => {
                  try {
                    const payload = await doCapture();
                    onCapture?.(payload);
                  } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('Capture failed:', e);
                  }
                }}
                setVideoElRef={setMainVideoElRef}
              />
            </div>

            {/* Thumbnail Grid */}
            {showThumbnails && streamCount > 1 && (
              <div className={layoutClasses.thumbnailContainer}>
                <ThumbnailGrid
                  streams={streams}
                  activeStreamIndex={activeStreamIndex}
                  onStreamSelect={handleStreamChange}
                  onFullscreen={toggleFullscreen}
                  layout={streamCount === 2 ? 'horizontal' : 'vertical'}
                  maxVisible={maxThumbnails}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Fullscreen Modal */}
  {enableFullscreen && (
        <FullscreenModal
          isOpen={isFullscreen}
          stream={activeStream}
          isPlaying={isPlaying}
          isMuted={isMuted}
          onClose={() => toggleFullscreen()}
          onError={handleError}
        />
      )}
    </>
  );
});
