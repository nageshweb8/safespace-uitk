import React from 'react';
import { Button, Tooltip } from 'antd';
import { ReloadOutlined, CameraOutlined } from '@ant-design/icons';
import { CameraStream } from '../../types/video';
import { VideoPlayer } from '../VideoPlayer';
import { VideoControls } from './VideoControls';
import { StreamInfo } from './StreamInfo';
import { ProgressBar } from './ProgressBar';
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
  // Optional capture overlay
  showCaptureButton?: boolean;
  captureTooltip?: string;
  captureIcon?: React.ReactNode;
  onCaptureClick?: () => void;
  // Optional: allow parent to access underlying <video>
  setVideoElRef?: (el: HTMLVideoElement | null) => void;
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
  className,
  showCaptureButton,
  captureTooltip,
  captureIcon,
  onCaptureClick,
  setVideoElRef,
}) => {
  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[400px] overflow-hidden rounded-lg bg-black',
        className
      )}
      style={{ aspectRatio: '16/9' }}
    >
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="text-center">
            <div className="text-lg mb-2">⚠️</div>
            <div className="text-white mb-4 max-w-xs text-center">{error}</div>
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
            refCallback={setVideoElRef}
          />

          <StreamInfo stream={stream} showLiveIndicator={true} />

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

          {showCaptureButton && (
            <div className="absolute top-3 right-3 z-20">
              <Tooltip title={captureTooltip || 'Capture frame'}>
                <button
                  type="button"
                  onClick={onCaptureClick}
                  className="rounded-full bg-white/85 hover:bg-white text-gray-800 p-2 shadow-md transition"
                >
                  {captureIcon || <CameraOutlined />}
                </button>
              </Tooltip>
            </div>
          )}
        </>
      )}
    </div>
  );
};
