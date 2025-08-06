import React from 'react';
import { Card, Typography } from 'antd';
import { LiveFeedPlayerProps } from '../types/video';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { useStreamLayout } from '../hooks/useStreamLayout';
import { MainVideoPlayer } from './shared/MainVideoPlayer';
import { ThumbnailGrid } from './shared/ThumbnailGrid';
import { FullscreenModal } from './shared/FullscreenModal';
import { cn } from '../utils/cn';

const { Text } = Typography;

export const LiveFeedPlayer: React.FC<LiveFeedPlayerProps> = ({
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
  enableKeyboardControls = true
}) => {
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

  const themeClasses = {
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-900 border-gray-700'
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
    handleStreamChange
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
                <Text strong className="text-base block">{title}</Text>
                <Text type="secondary" className="text-sm">
                  {subtitle}
                </Text>
              </div>
              {enableKeyboardControls && (
                <div className="text-xs text-gray-400">
                  <Text type="secondary" className="text-xs">
                    Keyboard: Space (play/pause), M (mute), F (fullscreen), ←→ (switch)
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
};
