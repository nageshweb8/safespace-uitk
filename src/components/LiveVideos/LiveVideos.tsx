import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import {
  CameraStream,
  LiveVideoPatternKey,
  LiveVideosProps,
} from '../../types/video';
import { LiveVideoTile } from './LiveVideoTile';
import { PatternMenu } from './PatternMenu';
import {
  DEFAULT_PATTERN_KEYS,
  resolvePatternDefinitions,
  pickNearestPattern,
} from './patterns';
import { FullscreenModal } from '../shared/FullscreenModal';
import { cn } from '../../utils/cn';

const DEFAULT_HEIGHT = 'calc(100vh - 140px)';

interface TileState {
  playing: boolean;
  muted: boolean;
}

export const LiveVideos: React.FC<LiveVideosProps> = ({
  streams,
  displayStreams,
  loading = false,
  pattern,
  defaultPattern,
  autoPattern = true,
  availablePatterns,
  onPatternChange,
  onTileClick,
  onStreamError,
  showPatternMenu = true,
  patternMenuPlacement = 'bottom',
  showTileLabels = true,
  showTileControls = true,
  tileControlsSize = 'small',
  autoPlay = true,
  muted = true,
  height = DEFAULT_HEIGHT,
  className,
  emptyState,
}) => {
  const effectiveStreams = streams ?? [];
  const renderStreams =
    displayStreams && displayStreams.length > 0 ? displayStreams : effectiveStreams;

  const resolvedHeight = useMemo(() => {
    if (typeof height === 'number') return `${height}px`;
    return height || DEFAULT_HEIGHT;
  }, [height]);

  const definitions = useMemo(
    () => resolvePatternDefinitions(availablePatterns || DEFAULT_PATTERN_KEYS),
    [availablePatterns]
  );

  const availableKeys = useMemo(
    () => definitions.map(def => def.key),
    [definitions]
  );

  const fallbackPattern = availableKeys[0] ?? '1';
  const isControlled = pattern !== undefined;

  const derivePatternFromStreams = useCallback(
    (count: number): LiveVideoPatternKey => {
      const candidate = pickNearestPattern(count);
      return availableKeys.includes(candidate) ? candidate : fallbackPattern;
    },
    [availableKeys, fallbackPattern]
  );

  const [internalPattern, setInternalPattern] = useState<LiveVideoPatternKey>(() => {
    if (defaultPattern && availableKeys.includes(defaultPattern)) {
      return defaultPattern;
    }
    return derivePatternFromStreams(renderStreams.length);
  });

  useEffect(() => {
    if (isControlled) return;
    if (defaultPattern && availableKeys.includes(defaultPattern)) {
      setInternalPattern(defaultPattern);
    }
  }, [defaultPattern, availableKeys, isControlled]);

  useEffect(() => {
    if (isControlled || !autoPattern) return;
    const next = derivePatternFromStreams(renderStreams.length);
    setInternalPattern(prev => (prev === next ? prev : next));
  }, [renderStreams.length, derivePatternFromStreams, autoPattern, isControlled]);

  const [tileState, setTileState] = useState<Record<string, TileState>>({});
  const [fullscreenStream, setFullscreenStream] = useState<CameraStream | null>(null);

  const activePattern = (isControlled ? pattern : internalPattern) ?? fallbackPattern;

  const activeDefinition = useMemo(
    () => definitions.find(def => def.key === activePattern),
    [definitions, activePattern]
  );

  const limitedStreams = useMemo(() => {
    const max = activeDefinition?.tileCount ?? renderStreams.length;
    return renderStreams.slice(0, max);
  }, [renderStreams, activeDefinition]);

  const getTileState = useCallback(
    (stream: CameraStream): TileState => {
      return tileState[stream.id] ?? { playing: autoPlay, muted };
    },
    [tileState, autoPlay, muted]
  );

  const togglePlay = useCallback(
    (stream: CameraStream) => {
      setTileState(prev => {
        const current = prev[stream.id] ?? { playing: autoPlay, muted };
        return { ...prev, [stream.id]: { ...current, playing: !current.playing } };
      });
    },
    [autoPlay, muted]
  );

  const toggleMute = useCallback(
    (stream: CameraStream) => {
      setTileState(prev => {
        const current = prev[stream.id] ?? { playing: autoPlay, muted };
        return { ...prev, [stream.id]: { ...current, muted: !current.muted } };
      });
    },
    [autoPlay, muted]
  );

  const handlePatternSelect = useCallback(
    (next: LiveVideoPatternKey) => {
      if (!availableKeys.includes(next)) return;
      if (!isControlled) {
        setInternalPattern(next);
      }
      onPatternChange?.(next);
    },
    [availableKeys, isControlled, onPatternChange]
  );

  const handleTileClickInternal = useCallback(
    (stream: CameraStream, index: number) => {
      onTileClick?.(stream, index);
    },
    [onTileClick]
  );

  const renderTile = useCallback(
    (
      stream: CameraStream | undefined,
      index: number,
      options: {
        key?: string;
        className?: string;
        style?: React.CSSProperties;
        isPrimary?: boolean;
      } = {}
    ) => {
      const tileKey = options.key ?? stream?.id ?? `slot-${index}`;
      const state = stream ? getTileState(stream) : { playing: false, muted: true };
      const hasStream = !!stream;

      return (
        <LiveVideoTile
          key={tileKey}
          stream={stream}
          index={index}
          isPrimary={options.isPrimary}
          isPlaying={state.playing && hasStream}
          isMuted={state.muted || !hasStream}
          showControls={showTileControls && hasStream}
          controlsSize={tileControlsSize}
          showLabel={showTileLabels}
          onTogglePlay={() => stream && togglePlay(stream)}
          onToggleMute={() => stream && toggleMute(stream)}
          onFullscreen={() => stream && setFullscreenStream(stream)}
          onClick={() => stream && handleTileClickInternal(stream, index)}
          onError={error => {
            if (stream) {
              onStreamError?.(error, stream);
            }
          }}
          className={cn('w-full h-full', options.className)}
          style={options.style}
        />
      );
    },
    [
      getTileState,
      showTileControls,
      showTileLabels,
      tileControlsSize,
      togglePlay,
      toggleMute,
      onStreamError,
      handleTileClickInternal,
    ]
  );

  const patternContent = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <Spin size="large" />
        </div>
      );
    }

    if (limitedStreams.length === 0) {
      return (
        emptyState ?? (
          <div className="flex items-center justify-center w-full h-[320px] rounded-md border border-neutral-800 bg-neutral-900/40 text-sm text-neutral-400">
            No camera streams available
          </div>
        )
      );
    }

    const streamsToUse = limitedStreams;

    const renderNumeric = (count: number) => {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const tiles = streamsToUse.slice(0, count);

      return (
        <div
          className="grid gap-0.5"
          style={{
            height: resolvedHeight,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {tiles.map((stream, idx) => renderTile(stream, idx))}
        </div>
      );
    };

    const renderHighlight = (count: number) => {
      const gridSize = Math.max(3, Math.floor(count / 2));
      const total = Math.min(count, streamsToUse.length);
      const items: React.ReactNode[] = [];
      const primary = streamsToUse[0];

      items.push(
        renderTile(primary, 0, {
          key: 'primary',
          isPrimary: true,
          style: {
            gridColumn: `span ${gridSize - 1} / span ${gridSize - 1}`,
            gridRow: `span ${gridSize - 1} / span ${gridSize - 1}`,
          },
        })
      );

      let idx = 1;
      for (let r = 0; r < gridSize - 1 && idx < total; r++) {
        const stream = streamsToUse[idx];
        items.push(
          renderTile(stream, idx, {
            key: `right-${idx}`,
            style: { gridColumn: `${gridSize} / ${gridSize + 1}`, gridRow: `${r + 1} / ${r + 2}` },
          })
        );
        idx += 1;
      }

      for (let c = 0; c < gridSize && idx < total; c++) {
        const stream = streamsToUse[idx];
        items.push(
          renderTile(stream, idx, {
            key: `bottom-${idx}`,
            style: { gridColumn: `${c + 1} / ${c + 2}`, gridRow: `${gridSize} / ${gridSize + 1}` },
          })
        );
        idx += 1;
      }

      return (
        <div
          className="grid gap-0.5"
          style={{
            height: resolvedHeight,
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          {items}
        </div>
      );
    };

    const renderM14 = () => {
      const items: React.ReactNode[] = [];
      let tileIdx = 0;

      for (let i = 0; i < 20; i++) {
        const row = Math.floor(i / 5) + 1;
        const col = (i % 5) + 1;

        const isTopLeft = row <= 2 && col <= 2;
        const isLowerLeft = row >= 3 && col <= 2;

        if ((isTopLeft && i !== 0) || (isLowerLeft && i !== 11)) {
          continue;
        }

        const stream = streamsToUse[tileIdx];
        items.push(
          renderTile(stream, tileIdx, {
            key: `m14-${i}`,
            style:
              i === 0
                ? { gridColumn: 'span 2 / span 2', gridRow: 'span 2 / span 2' }
                : i === 11
                ? { gridColumn: 'span 2 / span 2', gridRow: 'span 2 / span 2' }
                : undefined,
          })
        );
        tileIdx += 1;
        if (tileIdx >= streamsToUse.length) break;
      }

      return (
        <div
          className="grid grid-cols-5 grid-rows-4 gap-0.5"
          style={{ height: resolvedHeight }}
        >
          {items}
        </div>
      );
    };

    const renderM15 = () => {
      const items: React.ReactNode[] = [];
      let tileIdx = 0;

      for (let i = 0; i < 20; i++) {
        const row = Math.floor(i / 5) + 1;
        const col = (i % 5) + 1;

        const isTopLeft = row <= 2 && col <= 2;
        const isMidRight = row <= 2 && col >= 3 && col <= 4;

        if ((isTopLeft && i !== 0) || (isMidRight && i !== 3)) {
          continue;
        }

        const stream = streamsToUse[tileIdx];
        items.push(
          renderTile(stream, tileIdx, {
            key: `m15-${i}`,
            style:
              i === 0 || i === 3
                ? { gridColumn: 'span 2 / span 2', gridRow: 'span 2 / span 2' }
                : undefined,
          })
        );
        tileIdx += 1;
        if (tileIdx >= streamsToUse.length) break;
      }

      return (
        <div
          className="grid grid-cols-5 grid-rows-4 gap-0.5"
          style={{ height: resolvedHeight }}
        >
          {items}
        </div>
      );
    };

    if (activePattern === 'M14') {
      return renderM14();
    }
    if (activePattern === 'M15') {
      return renderM15();
    }

    if (activePattern.endsWith('Highlight')) {
      const count = Number(activePattern.split('-')[0]) || streamsToUse.length;
      return renderHighlight(count);
    }

    const numericCount = Number(activePattern);
    if (!Number.isNaN(numericCount)) {
      return renderNumeric(numericCount);
    }

    return renderNumeric(streamsToUse.length);
  }, [
    limitedStreams,
    renderTile,
    activePattern,
    resolvedHeight,
    loading,
    emptyState,
  ]);

  return (
    <div className={cn('w-full h-full flex flex-col gap-3', className)}>
      {showPatternMenu && (
        <div className="flex justify-end">
          <PatternMenu
            activePattern={activePattern}
            availablePatterns={availableKeys}
            onSelect={handlePatternSelect}
            placement={patternMenuPlacement}
          />
        </div>
      )}

      <div className="flex-1 min-h-[240px]">
        {patternContent}
      </div>

      {fullscreenStream && (
        <FullscreenModal
          isOpen={!!fullscreenStream}
          stream={fullscreenStream}
          isPlaying={true}
          isMuted={getTileState(fullscreenStream).muted}
          onClose={() => setFullscreenStream(null)}
          onError={error => onStreamError?.(error, fullscreenStream)}
        />
      )}
    </div>
  );
};
