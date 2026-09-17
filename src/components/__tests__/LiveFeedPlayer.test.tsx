import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Hls from 'hls.js';
import { LiveFeedPlayer } from '../LiveFeedPlayer';
import { VideoPlayer } from '../VideoPlayer';
import { LiveVideos } from '../LiveVideos';
import { CameraStream } from '../../types/video';

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

describe('LiveFeedPlayer', () => {
  it('renders without crashing', () => {
    render(<LiveFeedPlayer streams={mockStreams} />);
    expect(screen.getByText('Live Feed')).toBeInTheDocument();
  });

  it('shows empty state when no streams provided', () => {
    render(<LiveFeedPlayer streams={[]} />);
    expect(screen.getByText('No camera streams available')).toBeInTheDocument();
  });

  it('displays stream titles correctly', () => {
    render(<LiveFeedPlayer streams={mockStreams} />);
    expect(screen.getByText('Camera 1')).toBeInTheDocument();
  });
});

// Exercise the shared player in the existing live-feed regression suite.
describe('shared HLS player lifecycle', () => {
  const getPlayer = (index = 0): jest.Mocked<Hls> =>
    jest.mocked(Hls).mock.results[index].value;
  const emit = (player: Hls, event: string, data?: unknown) => {
    for (const [name, handler] of (player.on as jest.Mock).mock.calls) {
      if (name === event) handler(event, data);
    }
  };
  const networkError = {
    fatal: true,
    type: Hls.ErrorTypes.NETWORK_ERROR,
    details: 'fragLoadError',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.mocked(Hls.isSupported).mockReturnValue(true);
    jest.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('prefers HLS.js when both engines support HLS', () => {
    render(<VideoPlayer stream={mockStreams[0]} />);
    expect(Hls).toHaveBeenCalledTimes(1);
    expect(getPlayer().loadSource).toHaveBeenCalledWith(mockStreams[0].url);
    expect(HTMLMediaElement.prototype.canPlayType).not.toHaveBeenCalled();
  });

  it('uses and releases native HLS only when HLS.js is unsupported', () => {
    jest.mocked(Hls.isSupported).mockReturnValue(false);
    const { container, unmount } = render(<VideoPlayer stream={mockStreams[0]} />);
    const video = container.querySelector('video')!;
    expect(Hls).not.toHaveBeenCalled();
    expect(video.getAttribute('src')).toBe(mockStreams[0].url);
    unmount();
    expect(video.hasAttribute('src')).toBe(false);
    expect(video.pause).toHaveBeenCalled();
    expect(video.load).toHaveBeenCalled();
  });

  it('reports an unsupported browser', () => {
    jest.mocked(Hls.isSupported).mockReturnValue(false);
    jest.mocked(HTMLMediaElement.prototype.canPlayType).mockReturnValue('');
    const onError = jest.fn();
    render(<VideoPlayer stream={mockStreams[0]} onError={onError} />);
    expect(onError).toHaveBeenCalledWith(new Error('HLS not supported in this browser'));
  });

  it('honors the latest controlled pause when the manifest arrives', () => {
    const { rerender, container } = render(<VideoPlayer stream={mockStreams[0]} isPlaying />);
    rerender(<VideoPlayer stream={mockStreams[0]} isPlaying={false} />);
    jest.mocked(HTMLMediaElement.prototype.play).mockClear();
    act(() => emit(getPlayer(), Hls.Events.MANIFEST_PARSED));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(container.querySelector('video')!.autoplay).toBe(false);
    expect(Hls).toHaveBeenCalledTimes(1);
  });

  it('does not autoplay when disabled', () => {
    render(<VideoPlayer stream={mockStreams[0]} autoPlay={false} />);
    act(() => emit(getPlayer(), Hls.Events.MANIFEST_PARSED));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('updates callbacks without recreating HLS', () => {
    const previous = jest.fn();
    const current = jest.fn();
    const { rerender } = render(<VideoPlayer stream={mockStreams[0]} onLoadEnd={previous} />);
    rerender(<VideoPlayer stream={{ ...mockStreams[0] }} onLoadEnd={current} />);
    act(() => emit(getPlayer(), Hls.Events.MANIFEST_PARSED));
    expect(current).toHaveBeenCalledTimes(1);
    expect(previous).not.toHaveBeenCalled();
    expect(Hls).toHaveBeenCalledTimes(1);
  });

  it('leaves nonfatal recovery to HLS.js and recovers fatal media errors', () => {
    render(<VideoPlayer stream={mockStreams[0]} />);
    act(() => emit(getPlayer(), Hls.Events.ERROR, { ...networkError, fatal: false }));
    expect(jest.getTimerCount()).toBe(0);
    expect(getPlayer().startLoad).not.toHaveBeenCalled();
    act(() => emit(getPlayer(), Hls.Events.ERROR, {
      fatal: true, type: Hls.ErrorTypes.MEDIA_ERROR, details: 'bufferAppendError',
    }));
    expect(getPlayer().recoverMediaError).toHaveBeenCalledTimes(1);
  });

  it('deduplicates pending retries and retains the three-attempt limit', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const onError = jest.fn();
    render(<VideoPlayer stream={mockStreams[0]} onError={onError} />);
    const player = getPlayer();
    for (const delay of [1000, 2000, 4000]) {
      act(() => {
        emit(player, Hls.Events.ERROR, networkError);
        emit(player, Hls.Events.ERROR, networkError);
      });
      expect(jest.getTimerCount()).toBe(1);
      act(() => jest.advanceTimersByTime(delay));
    }
    expect(player.startLoad).toHaveBeenCalledTimes(3);
    act(() => emit(player, Hls.Events.ERROR, networkError));
    expect(onError).toHaveBeenCalledWith(new Error('Network Error: fragLoadError'));
    expect(jest.getTimerCount()).toBe(0);
    act(() => emit(player, Hls.Events.FRAG_LOADED));
    act(() => emit(player, Hls.Events.ERROR, networkError));
    act(() => jest.advanceTimersByTime(1000));
    expect(player.startLoad).toHaveBeenCalledTimes(4);
  });

  it('reloads a failed initial manifest rather than only starting fragment loading', () => {
    render(<VideoPlayer stream={mockStreams[0]} />);
    const player = getPlayer();
    act(() => emit(player, Hls.Events.ERROR, {
      ...networkError, details: Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
    }));
    act(() => jest.advanceTimersByTime(1000));
    expect(player.loadSource).toHaveBeenCalledTimes(2);
    expect(player.startLoad).not.toHaveBeenCalled();
  });

  it('cancels old retries and gives a replacement URL a fresh budget', () => {
    const { rerender, unmount } = render(<VideoPlayer stream={mockStreams[0]} />);
    const previous = getPlayer();
    act(() => emit(previous, Hls.Events.ERROR, networkError));
    rerender(<VideoPlayer stream={{ ...mockStreams[0], url: mockStreams[1].url }} />);
    expect(previous.destroy).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(4000));
    expect(previous.startLoad).not.toHaveBeenCalled();
    const current = getPlayer(1);
    act(() => emit(current, Hls.Events.ERROR, networkError));
    act(() => jest.advanceTimersByTime(1000));
    expect(current.startLoad).toHaveBeenCalledTimes(1);
    act(() => emit(current, Hls.Events.ERROR, networkError));
    unmount();
    act(() => jest.runOnlyPendingTimers());
    expect(current.startLoad).toHaveBeenCalledTimes(1);
    expect(current.destroy).toHaveBeenCalledTimes(1);
  });

  it('does not restart healthy cameras when another camera retries', () => {
    render(<LiveVideos streams={mockStreams} />);
    const [first, second] = [getPlayer(0), getPlayer(1)];
    act(() => emit(first, Hls.Events.ERROR, networkError));
    act(() => jest.advanceTimersByTime(1000));
    expect(first.startLoad).toHaveBeenCalledTimes(1);
    expect(second.startLoad).not.toHaveBeenCalled();
    expect(second.destroy).not.toHaveBeenCalled();
  });

  it('passes the grid pause state to the player before manifest parsing', () => {
    render(<LiveVideos streams={[mockStreams[0]]} autoPlay={false} />);
    act(() => emit(getPlayer(), Hls.Events.MANIFEST_PARSED));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('keeps a paused live player at its current position during a network retry', () => {
    const { container } = render(<VideoPlayer stream={mockStreams[0]} isPlaying={false} />);
    const video = container.querySelector('video')!;
    video.currentTime = 12;
    Object.defineProperty(getPlayer(), 'liveSyncPosition', { value: 50 });
    act(() => emit(getPlayer(), Hls.Events.ERROR, networkError));
    act(() => jest.advanceTimersByTime(1000));
    expect(video.currentTime).toBe(12);
    expect(getPlayer().startLoad).toHaveBeenCalledTimes(1);
    expect(video.play).not.toHaveBeenCalled();
  });

  it('releases the old source when the URL becomes empty', () => {
    const { rerender, container } = render(<VideoPlayer stream={mockStreams[0]} />);
    act(() => emit(getPlayer(), Hls.Events.ERROR, networkError));
    rerender(<VideoPlayer stream={{ ...mockStreams[0], url: '' }} />);
    act(() => jest.runOnlyPendingTimers());
    expect(getPlayer().destroy).toHaveBeenCalledTimes(1);
    expect(getPlayer().startLoad).not.toHaveBeenCalled();
    expect(container.querySelector('video')!.hasAttribute('src')).toBe(false);
    expect(Hls).toHaveBeenCalledTimes(1);
  });

  it('cleans up Strict Mode initialization without leaving two active players', () => {
    const { unmount } = render(
      <React.StrictMode><VideoPlayer stream={mockStreams[0]} /></React.StrictMode>
    );
    expect(Hls).toHaveBeenCalledTimes(2);
    expect(getPlayer(0).destroy).toHaveBeenCalledTimes(1);
    expect(getPlayer(1).destroy).not.toHaveBeenCalled();
    unmount();
    expect(getPlayer(1).destroy).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending loop restart on unmount', () => {
    const { container, unmount } = render(<VideoPlayer stream={mockStreams[0]} loop />);
    fireEvent.ended(container.querySelector('video')!);
    unmount();
    act(() => jest.advanceTimersByTime(100));
    expect(Hls).toHaveBeenCalledTimes(1);
    expect(getPlayer().destroy).toHaveBeenCalledTimes(1);
  });

  it('leaves WebRTC selection and peer cleanup ahead of HLS selection', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'RTCPeerConnection');
    const peer = {
      addEventListener: jest.fn(), removeEventListener: jest.fn(),
      addTransceiver: jest.fn(), close: jest.fn(),
      createOffer: jest.fn(() => new Promise(() => {})),
    };
    const constructor = jest.fn(() => peer);
    Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: constructor });
    try {
      const { unmount } = render(
        <VideoPlayer stream={{ ...mockStreams[0], url: 'webrtc:camera' }} />
      );
      expect(constructor).toHaveBeenCalledTimes(1);
      expect(Hls).not.toHaveBeenCalled();
      unmount();
      expect(peer.close).toHaveBeenCalledTimes(1);
    } finally {
      if (descriptor) Object.defineProperty(window, 'RTCPeerConnection', descriptor);
      else Reflect.deleteProperty(window, 'RTCPeerConnection');
    }
  });
});
