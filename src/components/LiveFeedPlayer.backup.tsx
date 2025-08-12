import React, { useState, useCallback } from 'react';
import { Modal, Card, Typography, Button } from 'antd';
import {
  ArrowsAltOutlined,
  ShrinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { VideoPlayer } from './VideoPlayer/VideoPlayer';
import { ThumbnailGrid } from './shared/ThumbnailGrid';
import { CameraStream } from '../types/video';
import { cn } from '../utils/cn';

const { Text } = Typography;

export interface LiveFeedPlayerProps {
  streams: CameraStream[];
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  showThumbnails?: boolean;
  onStreamChange?: (stream: CameraStream) => void;
  onError?: (error: Error, stream: CameraStream) => void;
  theme?: 'light' | 'dark';
  aspectRatio?: '16:9' | '4:3' | '1:1';
  title?: string;
  subtitle?: string;
}

interface LayoutConfig {
  container: string;
  mainVideo: string;
  thumbnailContainer: string;
}

const getLayoutClasses = (streamCount: number): LayoutConfig => {
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
};

const themeClasses = {
  light: 'bg-white border-gray-200',
  dark: 'bg-gray-900 border-gray-700',
};

export const LiveFeedPlayer: React.FC<LiveFeedPlayerProps> = ({
  streams,
  className,
  autoPlay = true,
  muted = true,
  showThumbnails = true,
  onStreamChange,
  onError,
  theme = 'light',
  title = 'Live Feed',
  subtitle = 'All pinned cameras will be displayed here',
}) => {
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlaying] = useState(autoPlay);
  const [isMuted] = useState(muted);
  const [error, setError] = useState<string | null>(null);

  const activeStream = streams[activeStreamIndex];
  const streamCount = streams.length;
  const layoutClasses = getLayoutClasses(streamCount);

  const handleStreamChange = useCallback(
    (streamIndex: number) => {
      setActiveStreamIndex(streamIndex);
      setError(null);
      onStreamChange?.(streams[streamIndex]);
    },
    [onStreamChange, streams]
  );

  const handleError = useCallback(
    (error: Error, stream?: CameraStream) => {
      setError(error.message);
      onError?.(error, stream || activeStream);
    },
    [onError, activeStream]
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setActiveStreamIndex(prev => prev);
  }, []);

  if (!streams.length) {
    return (
      <Card className={cn('w-full h-full', themeClasses[theme], className)}>
        <div className="flex items-center justify-center h-64">
          <Text type="secondary">No camera streams available</Text>
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
            <Text strong className="text-base block">
              {title}
            </Text>
            <Text type="secondary" className="text-sm">
              {subtitle}
            </Text>
          </div>

          {/* Video Layout */}
          <div className={layoutClasses.container}>
            {/* Main Video Area */}
            <div className={layoutClasses.mainVideo}>
              <div className="relative w-full h-full overflow-hidden rounded-lg bg-black">
                {error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Text className="text-white mb-2">
                      Failed to load stream
                    </Text>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={handleRetry}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <>
                    <VideoPlayer
                      key={`${activeStream.id}-${Date.now()}`}
                      stream={activeStream}
                      autoPlay={isPlaying}
                      muted={isMuted}
                      controls={false}
                      onError={error => handleError(error, activeStream)}
                    />

                    {/* Stream info overlay */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {activeStream.title}
                      {activeStream.isLive && (
                        <span className="ml-2 px-1 bg-red-600 rounded text-[10px]">
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Control buttons */}
                    <div className="absolute top-2 right-2">
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowsAltOutlined />}
                        onClick={() => setIsModalOpen(true)}
                        className="text-white hover:text-gray-300"
                        title="Expand"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnail Grid */}
            {showThumbnails && streamCount > 1 && (
              <div className={layoutClasses.thumbnailContainer}>
                <ThumbnailGrid
                  streams={streams}
                  activeStreamIndex={activeStreamIndex}
                  onStreamSelect={handleStreamChange}
                  onFullscreen={() => setIsModalOpen(true)}
                  layout={streamCount === 2 ? 'horizontal' : 'vertical'}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Fullscreen Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width="90vw"
        centered
        closable={false}
        bodyStyle={{ padding: 0, height: '90vh' }}
        className="fullscreen-modal"
      >
        <div className="relative h-full bg-black">
          <VideoPlayer
            key={`modal-${activeStream.id}`}
            stream={activeStream}
            autoPlay={isPlaying}
            muted={isMuted}
            controls={true}
            className="h-full"
            onError={error => handleError(error, activeStream)}
          />

          <Button
            type="text"
            size="large"
            icon={<ShrinkOutlined />}
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            title="Exit fullscreen"
          />
        </div>
      </Modal>
    </>
  );
};
