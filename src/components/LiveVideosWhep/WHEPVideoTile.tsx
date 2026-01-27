import React, { memo, useEffect, useRef, useCallback, useState } from 'react';
import { WHEPCameraStream, WHEPConfig } from '../../types/video';
import { cn } from '../../utils/cn';

// Default WHEP configuration values
const DEFAULT_RECONNECT_DELAY = 5000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 3;
const DEFAULT_HEALTH_CHECK_INTERVAL = 5000;
const DEFAULT_STREAM_STALL_TIMEOUT = 12000;

export interface WHEPVideoTileProps {
  stream?: WHEPCameraStream;
  index: number;
  whepConfig: WHEPConfig;
  showLabel?: boolean;
  labelPlacement?: 'top' | 'bottom';
  showControls?: boolean;
  isSelected?: boolean;
  enableSelection?: boolean;
  onToggleSelect?: (streamId: string) => void;
  onFullscreen?: (streamId: string) => void;
  onClick?: (streamId: string) => void;
  onError?: (error: Error, streamId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * WHEPVideoTile - Individual WHEP video tile component
 * Handles WebRTC WHEP connection for a single camera stream
 */
const WHEPVideoTileInner: React.FC<WHEPVideoTileProps> = ({
  stream,
  index,
  whepConfig,
  showLabel = true,
  labelPlacement = 'top',
  showControls = true,
  isSelected = false,
  enableSelection = false,
  onToggleSelect,
  // onFullscreen - Reserved for future use
  onClick,
  onError,
  className,
  style,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const reconnectAttemptsRef = useRef<number>(0);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const hasStream = !!stream;
  const streamId = stream?.id ?? '';

  // Extract config values with defaults
  const {
    baseUrl,
    authCredentials,
    reconnectDelay = DEFAULT_RECONNECT_DELAY,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    healthCheckInterval = DEFAULT_HEALTH_CHECK_INTERVAL,
    streamStallTimeout = DEFAULT_STREAM_STALL_TIMEOUT,
  } = whepConfig;

  // Get camera ID for WHEP URL
  const cameraId = stream?.cameraId || 
                   stream?.uniqueIdentifier || 
                   stream?.guid ||
                   stream?.originalData?.uniqueIdentifier ||
                   stream?.originalData?.guid ||
                   stream?.originalData?.key ||
                   stream?.id || '';

  const cameraName = stream?.title || stream?.originalData?.label || `Camera ${index + 1}`;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Stream health monitoring
  const startStreamHealthMonitor = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.onplaying = () => {
      lastFrameTimeRef.current = Date.now();
      setIsHealthy(true);
    };

    videoElement.ontimeupdate = () => {
      lastFrameTimeRef.current = Date.now();
      setIsHealthy(true);
    };

    videoElement.onstalled = () => {
      setIsHealthy(false);
    };

    videoElement.onerror = () => {
      handleStreamFailureInternal('Video element error');
    };

    // Periodic health check
    healthCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current;
      if (timeSinceLastFrame > streamStallTimeout) {
        setIsHealthy(false);
        handleStreamFailureInternal('Stream stalled - no frames received');
      }
    }, healthCheckInterval);
    
    // Internal handler to avoid circular dependency
    function handleStreamFailureInternal(reason: string) {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        video.onplaying = null;
        video.ontimeupdate = null;
        video.onstalled = null;
        video.onwaiting = null;
        video.onerror = null;
      }
      
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      setStatus('error');

      if (onError && streamId) {
        onError(new Error(reason), streamId);
      }
    }
  }, [healthCheckInterval, streamStallTimeout, onError, streamId]);

  // Stop stream health monitor
  const stopStreamHealthMonitor = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.onplaying = null;
      videoElement.ontimeupdate = null;
      videoElement.onstalled = null;
      videoElement.onwaiting = null;
      videoElement.onerror = null;
    }
  }, []);

  // Handle stream failure
  const handleStreamFailure = useCallback((reason: string) => {
    stopStreamHealthMonitor();
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setStatus('error');

    if (onError && streamId) {
      onError(new Error(reason), streamId);
    }

    // Trigger reconnection (handled via ref to avoid circular dependency)
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      setReconnectCount(reconnectAttemptsRef.current);
    }
  }, [stopStreamHealthMonitor, maxReconnectAttempts, onError, streamId]);

  // Connect to stream
  const connectToStream = useCallback(async () => {
    if (!cameraId || !baseUrl) {
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        bundlePolicy: 'max-bundle',
      });

      pcRef.current = pc;

      // Handle incoming tracks
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play()
            .then(() => {
              lastFrameTimeRef.current = Date.now();
            })
            .catch(e => {
              handleStreamFailure(`Failed to start video playback: ${e.message}`);
            });
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStatus('connected');
          reconnectAttemptsRef.current = 0;
          setReconnectCount(0);
          startStreamHealthMonitor();
        } else if (pc.iceConnectionState === 'disconnected') {
          handleStreamFailure('ICE connection disconnected');
        } else if (pc.iceConnectionState === 'failed') {
          handleStreamFailure('ICE connection failed');
        }
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          handleStreamFailure('Peer connection failed');
        }
      };

      // Add transceiver for receiving video only
      pc.addTransceiver('video', { direction: 'recvonly' });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to WHEP endpoint
      const whepUrl = `${baseUrl}/${cameraId}/whep`;
      
      const headers = new Headers();
      headers.append('Content-Type', 'application/sdp');
      if (authCredentials) {
        headers.append('Authorization', `Basic ${btoa(authCredentials)}`);
      }

      const response = await fetch(whepUrl, {
        method: 'POST',
        headers,
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHEP request failed: ${response.status} ${response.statusText}`);
      }

      // Set remote description from answer
      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      handleStreamFailure(errorMessage);
    }
  }, [cameraId, baseUrl, authCredentials, startStreamHealthMonitor, handleStreamFailure]);

  // Initial connection and reconnection effect
  useEffect(() => {
    if (hasStream && cameraId) {
      connectToStream();
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, hasStream]);

  // Reconnection effect
  useEffect(() => {
    if (reconnectCount > 0 && reconnectCount < maxReconnectAttempts) {
      reconnectTimeoutRef.current = setTimeout(() => {
        connectToStream();
      }, reconnectDelay);
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [reconnectCount, maxReconnectAttempts, reconnectDelay, connectToStream]);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setReconnectCount(0);
    connectToStream();
  }, [connectToStream]);

  // Fullscreen handler
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle tile click
  const handleClick = useCallback(() => {
    if (onClick && streamId) {
      onClick(streamId);
    }
  }, [onClick, streamId]);

  // Handle selection toggle
  const handleSelectionToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect && streamId) {
      onToggleSelect(streamId);
    }
  }, [onToggleSelect, streamId]);

  // Empty slot
  if (!hasStream) {
    return (
      <div
        className={cn(
          'relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center',
          className
        )}
        style={style}
      >
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">No camera</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-gray-900 rounded-lg overflow-hidden group',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900',
        className
      )}
      style={style}
      onClick={handleClick}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Selection Checkbox */}
      {enableSelection && (
        <div className="absolute top-2 left-2 z-20">
          <label 
            className="flex items-center cursor-pointer"
            onClick={handleSelectionToggle}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="w-5 h-5 rounded border-2 border-white bg-black/40 text-blue-500 
                         focus:ring-blue-500 focus:ring-offset-0 cursor-pointer
                         checked:bg-blue-500 checked:border-blue-500"
            />
          </label>
        </div>
      )}

      {/* Camera Name Label */}
      {showLabel && (
        <div 
          className={cn(
            'absolute left-2 bg-black/60 text-white px-3 py-1 rounded text-sm font-medium z-10',
            labelPlacement === 'top' ? 'top-2' : 'bottom-2',
            enableSelection && labelPlacement === 'top' && 'left-10'
          )}
        >
          {cameraName}
        </div>
      )}

      {/* Status Indicator */}
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
        {status === 'connecting' && (
          <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Connecting
          </div>
        )}
        {status === 'connected' && (
          <div className={cn(
            'text-white px-2 py-1 rounded text-xs flex items-center gap-1',
            isHealthy ? 'bg-green-500' : 'bg-yellow-500'
          )}>
            <div className={cn('w-2 h-2 bg-white rounded-full', !isHealthy && 'animate-pulse')}></div>
            {isHealthy ? 'Live' : 'Buffering'}
          </div>
        )}
        {status === 'error' && reconnectCount > 0 && reconnectCount < maxReconnectAttempts && (
          <div className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px]">
            Retry: {reconnectCount}/{maxReconnectAttempts}
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      {showControls && status === 'connected' && (
        <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="bg-black/60 hover:bg-black/80 text-white p-2 rounded transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Error/No Signal Overlay */}
      {(status === 'disconnected' || status === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">
              {status === 'error' ? 'Failed to fetch' : 'No Signal'}
            </p>
            {reconnectAttemptsRef.current > 0 && reconnectAttemptsRef.current < maxReconnectAttempts && (
              <p className="text-xs mt-2">Reconnecting in {Math.ceil(reconnectDelay / 1000)}s...</p>
            )}
            {reconnectAttemptsRef.current >= maxReconnectAttempts && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
                className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const WHEPVideoTile = memo(WHEPVideoTileInner);
