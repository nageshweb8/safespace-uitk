import React from 'react';
import { Button, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  SoundOutlined,
  MutedOutlined,
  ArrowsAltOutlined,
} from '@ant-design/icons';
import { VideoControlsProps } from '../../types/video';
import { cn } from '../../utils/cn';

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  isMuted,
  onPlayPause,
  onMuteUnmute,
  onFullscreen,
  showControls = true,
  size = 'medium',
}) => {
  if (!showControls) return null;

  const sizeClasses = {
    small: 'gap-0.5',
    medium: 'gap-1',
    large: 'gap-2',
  };

  const buttonSizeClasses = {
    small: 'text-xs p-0 min-w-0 w-4 h-4',
    medium: 'text-sm',
    large: 'text-base',
  };

  return (
    <div className={cn('absolute top-2 right-2 flex', sizeClasses[size])}>
      <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
        <Button
          type="text"
          size={size === 'small' ? 'small' : 'middle'}
          icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
          onClick={e => {
            e.stopPropagation();
            onPlayPause();
          }}
          className={cn(
            'text-white hover:text-gray-300 hover:bg-black/20',
            size === 'small' && buttonSizeClasses.small
          )}
        />
      </Tooltip>

      <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
        <Button
          type="text"
          size={size === 'small' ? 'small' : 'middle'}
          icon={isMuted ? <MutedOutlined /> : <SoundOutlined />}
          onClick={e => {
            e.stopPropagation();
            onMuteUnmute();
          }}
          className={cn(
            'text-white hover:text-gray-300 hover:bg-black/20',
            size === 'small' && buttonSizeClasses.small
          )}
        />
      </Tooltip>

      <Tooltip title="Expand">
        <Button
          type="text"
          size={size === 'small' ? 'small' : 'middle'}
          icon={<ArrowsAltOutlined />}
          onClick={e => {
            e.stopPropagation();
            onFullscreen();
          }}
          className={cn(
            'text-white hover:text-gray-300 hover:bg-black/20',
            size === 'small' && buttonSizeClasses.small
          )}
        />
      </Tooltip>
    </div>
  );
};
