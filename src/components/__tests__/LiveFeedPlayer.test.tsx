import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LiveFeedPlayer } from '../LiveFeedPlayer';
import { CameraStream } from '../../types/video';
import * as useVideoPlayerHook from '../../hooks/useVideoPlayer';

jest.mock('../VideoPlayer', () => ({
  VideoPlayer: ({ stream }: { stream: { id: string; title: string } }) => (
    <div data-testid="video-player" data-stream-id={stream.id}>
      {stream.title}
    </div>
  ),
}));

const getRenderedStreamIds = () =>
  screen.queryAllByTestId('video-player').map(node => node.getAttribute('data-stream-id'));

const mockStreams: CameraStream[] = [
  {
    id: '1',
    url: 'https://example.com/stream1.m3u8',
    title: 'Camera 1',
    isLive: true,
  },
  {
    id: '2',
    url: 'https://example.com/stream2.m3u8',
    title: 'Camera 2',
    isLive: true,
  },
];

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LiveFeedPlayer', () => {
  it('renders without crashing', () => {
    render(<LiveFeedPlayer streams={mockStreams} />);
    expect(screen.getByText('Live Feed')).toBeInTheDocument();
  });

  it('shows empty state when no streams provided', () => {
    render(<LiveFeedPlayer streams={[]} />);
    expect(screen.getByText('No camera streams available')).toBeInTheDocument();
  });

  it('shows "No Video" when the active stream URL is empty', () => {
    render(<LiveFeedPlayer streams={[{ ...mockStreams[0], url: '' }]} />);

    expect(screen.getByText('No Video')).toBeInTheDocument();
    expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
  });

  it('shows "No Video" when the only stream URL is missing and renders no side thumbnail', () => {
    const streamWithoutUrl = {
      id: '3',
      title: 'Camera 3',
      isLive: true,
    } as unknown as CameraStream;

    render(<LiveFeedPlayer streams={[streamWithoutUrl]} />);

    expect(screen.getByText('No Video')).toBeInTheDocument();
    expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
  });

  it('renders VideoPlayer for a valid stream URL', () => {
    render(<LiveFeedPlayer streams={[mockStreams[0]]} />);

    expect(screen.getByTestId('video-player')).toHaveTextContent('Camera 1');
    expect(screen.queryByText('No Video')).not.toBeInTheDocument();
  });

  it('preserves the existing error UI for non-empty stream failures', () => {
    jest.spyOn(useVideoPlayerHook, 'useVideoPlayer').mockReturnValue({
      activeStreamIndex: 0,
      isPlaying: true,
      isMuted: true,
      isFullscreen: false,
      error: 'Network Error: manifestLoadError',
      isLoading: false,
      setActiveStreamIndex: jest.fn(),
      togglePlayPause: jest.fn(),
      toggleMute: jest.fn(),
      toggleFullscreen: jest.fn(),
      clearError: jest.fn(),
      setError: jest.fn(),
      setLoading: jest.fn(),
      handleStreamChange: jest.fn(),
      handleError: jest.fn(),
      handleRetry: jest.fn(),
    });

    render(<LiveFeedPlayer streams={[mockStreams[0]]} />);

    expect(screen.getByText('Network Error: manifestLoadError')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
    expect(screen.queryByText('No Video')).not.toBeInTheDocument();
  });

  it('keeps the empty stream in the side thumbnail when switching between two streams', () => {
    const handleStreamChange = jest.fn();
    const streams = [
      { ...mockStreams[0], url: '' },
      mockStreams[1],
    ];

    render(<LiveFeedPlayer streams={streams} onStreamChange={handleStreamChange} />);

    expect(screen.getByText('No Video')).toBeInTheDocument();
    expect(getRenderedStreamIds()).toEqual(['2']);

    fireEvent.click(screen.getByTestId('video-player'));

    expect(handleStreamChange).toHaveBeenLastCalledWith(streams[1]);
    expect(getRenderedStreamIds()).toEqual(['2']);
    expect(screen.getByText('No Video')).toBeInTheDocument();

    fireEvent.click(screen.getByText('No Video'));

    expect(handleStreamChange).toHaveBeenLastCalledWith(streams[0]);
    expect(getRenderedStreamIds()).toEqual(['2']);
    expect(screen.getByText('No Video')).toBeInTheDocument();
  });

  it('shows an inactive empty stream as "No Video" for three streams while keeping valid streams distinct', () => {
    const streams = [
      mockStreams[0],
      { ...mockStreams[1], id: '3', title: 'Camera 3', url: '' },
      { ...mockStreams[1], id: '4', title: 'Camera 4', url: 'https://example.com/stream4.m3u8' },
    ];

    render(<LiveFeedPlayer streams={streams} />);

    expect(getRenderedStreamIds()).toEqual(['1', '4']);
    expect(screen.getByText('No Video')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('video-player')[1]);

    expect(getRenderedStreamIds()).toEqual(['4', '1']);
    expect(screen.getByText('No Video')).toBeInTheDocument();
  });
});
