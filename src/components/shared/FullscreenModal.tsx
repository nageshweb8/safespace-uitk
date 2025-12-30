import React from 'react';
import { Modal, Button } from 'antd';
import { ShrinkOutlined } from '@ant-design/icons';
import { CameraStream } from '../../types/video';
import { VideoPlayer } from '../VideoPlayer';

export interface FullscreenModalProps {
  isOpen: boolean;
  stream: CameraStream;
  isPlaying: boolean;
  isMuted: boolean;
  onClose: () => void;
  onError: (error: Error) => void;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  isOpen,
  stream,
  isPlaying,
  isMuted,
  onClose,
  onError,
}) => {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width="90vw"
      centered
      closable={false}
      bodyStyle={{ padding: 0, height: '90vh' }}
      className="fullscreen-modal"
      destroyOnClose
    >
      <div className="relative h-full bg-black">
        <VideoPlayer
          key={`modal-${stream.id}`}
          stream={stream}
          autoPlay={true}
          muted={isMuted}
          controls={true}
          className="h-full"
          onError={onError}
        />

        <Button
          type="text"
          size="large"
          icon={<ShrinkOutlined />}
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          title="Close Fullscreen"
        />

        {/* Stream info in fullscreen */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded">
          <div className="text-lg font-medium">{stream.title}</div>
          {stream.metadata?.resolution && stream.metadata?.fps && (
            <div className="text-sm opacity-75">
              {stream.metadata.resolution} • {stream.metadata.fps}fps
              {stream.metadata.bitrate && ` • ${stream.metadata.bitrate}`}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
