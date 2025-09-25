import React, { useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { VideoPlayerProps, CameraStream } from '../../types/video';
import { cn } from '../../utils/cn';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  autoPlay = true,
  muted = true,
  controls = false,
  className,
  onError,
  onLoadStart,
  onLoadEnd,
  showOverlay = false,
  objectFit = 'cover',
  exposeVideoRef,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream.url) return;

    onLoadStart?.();
    // Cleanup helper (will be populated differently depending on chosen transport)
    let cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    // Heuristic to decide if this stream should use WebRTC.
    // Prefer explicit opt-in via stream.metadata.protocol === 'webrtc' or a special scheme.
  const isWebrtcExplicit = (stream as CameraStream & { metadata?: { protocol?: string } })?.metadata?.protocol === 'webrtc';
  const isWebrtcScheme = typeof stream.url === 'string' && stream.url.startsWith('webrtc:');
  const isWebrtcQuery = typeof stream.url === 'string' && stream.url.includes('webrtc=true');
  // Heuristic: many camera endpoints expose a simple '/cam' path — treat as WebRTC if it doesn't look like HLS (.m3u8)
  const isCamLike = typeof stream.url === 'string' && /\/cam\d*\/?(\?|$)/i.test(stream.url) && !/\.m3u8(\?|$)/i.test(stream.url);
  const useWebrtc = isWebrtcExplicit || isWebrtcScheme || isWebrtcQuery || isCamLike;

    if (useWebrtc && typeof window !== 'undefined' && 'RTCPeerConnection' in window) {
      // Basic WebRTC client flow:
      // 1) create RTCPeerConnection
      // 2) createOffer and setLocalDescription
      // 3) POST offer.sdp to the stream.url and expect an SDP answer (plain text or JSON { sdp })
      // 4) setRemoteDescription(answer)
      // Note: servers differ in signaling. This implementation tries common variants and falls back
      // to treating the URL as a direct video src if signaling fails.

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      let aborted = false;

      const onTrack = (ev: RTCTrackEvent) => {
        const ms: MediaStream = ev.streams && ev.streams[0] ? ev.streams[0] : ev.streams[0];
        if (ms) {
          video.srcObject = ms;
          onLoadEnd?.();
        }
      };

      pc.addEventListener('track', onTrack);

      pc.addEventListener('iceconnectionstatechange', () => {
        const state = pc.iceConnectionState;
        if (state === 'failed' || state === 'disconnected') {
          onError?.(new Error(`WebRTC connection state: ${state}`));
        }
      });

      // For some servers it's necessary to create a recvonly transceiver to get media
      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
      } catch (e) {
        // ignore if not supported
      }

      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Try signaling endpoints. Some servers expect raw SDP POST, others expect JSON or respond with JSON.
          let signalUrl = stream.url;
          if (!signalUrl.endsWith("/whep") && !signalUrl.endsWith("/whip")) {
            signalUrl = signalUrl.replace(/\/?$/, "/whep"); // default to WHEP for playback
          }
          const headersCandidates = [
            { 'Content-Type': 'application/sdp' },
            { 'Content-Type': 'application/json' },
          ];

          let answered = false;
          for (const headers of headersCandidates) {
            if (aborted) break;
            try {
              const body = headers['Content-Type'] === 'application/json'
                ? JSON.stringify({ sdp: offer.sdp, type: offer.type })
                : offer.sdp;

              const res = await fetch(signalUrl, { method: 'POST', body, headers });
              if (!res.ok) continue;

              const ct = res.headers.get('content-type') || '';
              let remoteSdp: string | undefined;
              if (ct.includes('application/json')) {
                const data = await res.json();
                remoteSdp = data.sdp || data.answer || data.payload?.sdp;
              } else {
                remoteSdp = await res.text();
              }

              if (remoteSdp) {
                await pc.setRemoteDescription({ type: 'answer', sdp: remoteSdp } as RTCSessionDescriptionInit);
                answered = true;
                break;
              }
            } catch (err) {
              // try next header candidate
            }
          }

          if (!answered) {
            throw new Error('WebRTC signaling failed (no valid answer)');
          }
        } catch (err: unknown) {
          console.error('WebRTC error', err);
          onError?.(err instanceof Error ? err : new Error(String(err)));
          // Fallback: try to use the URL as a normal video src (may work if server provides mjpeg/HLS)
          try {
            video.src = stream.url;
            onLoadEnd?.();
          } catch (e) {
            // Ignore - fallback video src assignment can fail safely
          }
        }
      })();

      cleanup = () => {
        aborted = true;
        try {
          video.srcObject = null;
        } catch (e) {
          // Ignore - srcObject cleanup can fail safely
        }
        try {
          pc.removeEventListener('track', onTrack);
          pc.close();
        } catch (e) {
          // Ignore - peer connection cleanup can fail safely
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
      return cleanup;
    }

    // HLS flow (unchanged)
    cleanup();

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = stream.url;
      onLoadEnd?.();
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        startLevel: -1,
        autoStartLoad: true,
        capLevelToPlayerSize: true,
      });

      hlsRef.current = hls;
      hls.loadSource(stream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onLoadEnd?.();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              onError?.(new Error(`Network Error: ${data.details}`));
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              onError?.(new Error(`Media Error: ${data.details}`));
              try {
                hls.recoverMediaError();
              } catch (recoverError) {
                onError?.(
                  new Error(`Media Error Recovery Failed: ${recoverError}`)
                );
              }
              break;
            default:
              onError?.(
                new Error(`Fatal Error: ${data.type} - ${data.details}`)
              );
              break;
          }
        }
      });
    } else {
      onError?.(new Error('HLS not supported in this browser'));
    }

    return cleanup;
  }, [stream.url, stream, onError, onLoadStart, onLoadEnd]);

  useEffect(() => {
    exposeVideoRef?.(videoRef.current);
    return () => {
      exposeVideoRef?.(null);
    };
  }, [exposeVideoRef]);

  const handleVideoError = () => {
    onError?.(new Error('Video playback error'));
  };

  const handleVideoLoadStart = () => {
    onLoadStart?.();
  };

  const handleVideoLoadedData = () => {
    onLoadEnd?.();
  };

  return (
    <div className={cn('relative w-full h-full', className)}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        playsInline
        className={cn(
          'w-full h-full',
          objectFit === 'contain' && 'object-contain bg-black',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'cover' && 'object-cover'
        )}
        onError={handleVideoError}
        onLoadStart={handleVideoLoadStart}
        onLoadedData={handleVideoLoadedData}
        onContextMenu={e => e.preventDefault()} // Disable right-click menu
      />

      {showOverlay && (
        <div className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors" />
      )}
    </div>
  );
};
