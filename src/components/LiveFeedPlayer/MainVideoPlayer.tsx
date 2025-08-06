import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { CameraStream } from '../../types/video';
import { VideoPlayer } from '../VideoPlayer';
import { VideoControls } from '../shared/VideoControls';
import { StreamInfo } from '../shared/StreamInfo';
import { ProgressBar } from '../shared/ProgressBar';
import { cn } from '../../utils/cn';

export interface MainVideoPlayerProps {
  stream: CameraStream;
  isPlaying: boolean;
  isMuted: boolean;
  error: string | null;
  showControls: boolean;
  streamCount: number;
  onPlayPause: () => void;
  onMuteUnmute: () => void;
  onFullscreen: () => void;
  onRetry: () => void;
  onError: (error: Error) => void;
  className?: string;
}

export const MainVideoPlayer: React.FC<MainVideoPlayerProps> = ({
  stream,
  isPlaying,
  isMuted,
  error,
  showControls,
  streamCount,
  onPlayPause,
  onMuteUnmute,
  onFullscreen,
  onRetry,
  onError,
  className
}) => {
  return (
    <div className={cn('relative w-full h-full overflow-hidden rounded-lg bg-black', className)}>
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="text-center">
            <div className="text-lg mb-2">⚠️</div>
            <div className="text-white mb-4 max-w-xs text-center">
              {error}
            </div>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      ) : (
        <>
          <VideoPlayer
            key={`${stream.id}-${Date.now()}`}
            stream={stream}
            autoPlay={isPlaying}
            muted={isMuted}
            controls={false}
            onError={onError}
          />
          
          <StreamInfo
            stream={stream}
            showLiveIndicator={true}
          />

          <VideoControls
            isPlaying={isPlaying}
            isMuted={isMuted}
            onPlayPause={onPlayPause}
            onMuteUnmute={onMuteUnmute}
            onFullscreen={onFullscreen}
            showControls={showControls && streamCount > 2}
            size="medium"
          />

          {/* Progress bar for main video (only when more than 2 videos) */}
          {streamCount > 2 && (
            <ProgressBar
              progress={65}
              size="medium"
              color="white"
              className="px-3 pb-2"
            />
          )}
        </>
      )}
    </div>
  );
};
