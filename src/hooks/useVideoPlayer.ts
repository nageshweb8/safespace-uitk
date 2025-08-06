import { useState, useCallback } from 'react';
import { CameraStream } from '../types/video';

export interface UseVideoPlayerState {
  activeStreamIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  error: string | null;
  isLoading: boolean;
}

export interface UseVideoPlayerActions {
  setActiveStreamIndex: (index: number) => void;
  togglePlayPause: () => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  clearError: () => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  handleStreamChange: (streamIndex: number) => void;
  handleError: (error: Error, stream?: CameraStream) => void;
  handleRetry: () => void;
}

export interface UseVideoPlayerReturn extends UseVideoPlayerState, UseVideoPlayerActions {}

export function useVideoPlayer(
  streams: CameraStream[],
  initialAutoPlay = true,
  initialMuted = true,
  onStreamChange?: (stream: CameraStream) => void,
  onError?: (error: Error, stream: CameraStream) => void
): UseVideoPlayerReturn {
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(initialAutoPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const setError = useCallback((error: string) => {
    setErrorState(error);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleStreamChange = useCallback((streamIndex: number) => {
    if (streamIndex >= 0 && streamIndex < streams.length) {
      setActiveStreamIndex(streamIndex);
      setErrorState(null);
      onStreamChange?.(streams[streamIndex]);
    }
  }, [streams, onStreamChange]);

  const handleError = useCallback((error: Error, stream?: CameraStream) => {
    const errorMessage = error.message;
    setErrorState(errorMessage);
    onError?.(error, stream || streams[activeStreamIndex]);
  }, [streams, activeStreamIndex, onError]);

  const handleRetry = useCallback(() => {
    setErrorState(null);
    setIsLoading(true);
    // Force re-render by updating the active stream index
    setActiveStreamIndex(prev => prev);
  }, []);

  return {
    // State
    activeStreamIndex,
    isPlaying,
    isMuted,
    isFullscreen,
    error,
    isLoading,
    // Actions
    setActiveStreamIndex,
    togglePlayPause,
    toggleMute,
    toggleFullscreen,
    clearError,
    setError,
    setLoading,
    handleStreamChange,
    handleError,
    handleRetry,
  };
}
