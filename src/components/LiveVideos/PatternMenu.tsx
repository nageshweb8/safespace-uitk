import React, { useMemo, useState } from 'react';
import { Button, Popover } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import {
  LiveVideoPatternCategory,
  LiveVideoPatternDefinition,
  LiveVideoPatternKey,
} from '../../types/video';
import {
  DEFAULT_PATTERN_CATEGORY_ORDER,
  resolvePatternDefinitions,
  isHighlightPattern,
} from './patterns';
import { cn } from '../../utils/cn';

interface PatternMenuProps {
  activePattern: LiveVideoPatternKey;
  availablePatterns?: LiveVideoPatternKey[];
  onSelect: (pattern: LiveVideoPatternKey) => void;
  placement?: 'top' | 'bottom';
  triggerLabel?: string;
}

const TILE_BG = 'bg-[#3E82FF]';
const TILE_BG_LIGHT = 'bg-[#E5EDFF]';
const TILE_BORDER = 'border border-white/60';

const categoryTitle: Record<LiveVideoPatternCategory, string> = {
  Equal: 'Equal',
  Highlight: 'Highlight',
  Extreme: 'Extreme',
};

function renderNumericPreview(tileCount: number) {
  const cols = Math.ceil(Math.sqrt(tileCount));
  const rows = Math.ceil(tileCount / cols);
  const cells = Array.from({ length: tileCount }, (_, idx) => (
    <div key={idx} className={cn(TILE_BG, TILE_BORDER)} />
  ));

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: 72,
        height: 72,
        gap: 2,
      }}
    >
      {cells}
    </div>
  );
}

function renderM14Preview() {
  const cells: React.ReactNode[] = [];
  const keyMatrix: Array<{ key: string; className: string; style?: React.CSSProperties }> = [];

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const id = `${row}-${col}`;
      let className = TILE_BG;
      const style: React.CSSProperties = {};

      if (row < 2 && col < 2) {
        if (row === 0 && col === 0) {
          className = `${TILE_BG} ${TILE_BORDER}`;
          style.gridColumn = 'span 2';
          style.gridRow = 'span 2';
        } else {
          continue;
        }
      }

      if (row >= 2 && row < 4 && col < 2) {
        if (row === 2 && col === 0) {
          className = `${TILE_BG} ${TILE_BORDER}`;
          style.gridColumn = 'span 2';
          style.gridRow = 'span 2';
        } else {
          continue;
        }
      }

      keyMatrix.push({ key: id, className: `${className} ${TILE_BORDER}`, style });
    }
  }

  keyMatrix.forEach(({ key, className, style }) =>
    cells.push(
      <div key={key} className={className} style={style} />
    )
  );

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        width: 72,
        height: 72,
        gap: 2,
      }}
    >
      {cells}
    </div>
  );
}

function renderM15Preview() {
  const cells: React.ReactNode[] = [];

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const id = `${row}-${col}`;
      const isTopLeft = row < 2 && col < 2;
      const isMidRight = row < 2 && col >= 2 && col < 4;

      if (isTopLeft && !(row === 0 && col === 0)) continue;
      if (isMidRight && !(row === 0 && col === 2)) continue;

      const style: React.CSSProperties = {};
      if (row === 0 && col === 0) {
        style.gridColumn = 'span 2';
        style.gridRow = 'span 2';
      }
      if (row === 0 && col === 2) {
        style.gridColumn = 'span 2';
        style.gridRow = 'span 2';
      }

      cells.push(
        <div key={id} className={`${TILE_BG} ${TILE_BORDER}`} style={style} />
      );
    }
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        width: 72,
        height: 72,
        gap: 2,
      }}
    >
      {cells}
    </div>
  );
}

function renderHighlightPreview(tileCount: number) {
  const size = Math.max(3, Math.floor(tileCount / 2));
  const cells: React.ReactNode[] = [];
  const bigSpan = size - 1;
  let smallIndex = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const id = `${row}-${col}`;
      if (row < bigSpan && col < bigSpan) {
        if (row === 0 && col === 0) {
          cells.push(
            <div
              key={id}
              className={`${TILE_BG} ${TILE_BORDER}`}
              style={{ gridColumn: `span ${bigSpan}`, gridRow: `span ${bigSpan}` }}
            />
          );
        }
        continue;
      }

      if (smallIndex < tileCount - 1) {
        cells.push(<div key={id} className={`${TILE_BG_LIGHT} ${TILE_BORDER}`} />);
        smallIndex += 1;
      }
    }
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
        width: 72,
        height: 72,
        gap: 2,
      }}
    >
      {cells}
    </div>
  );
}

function renderPreview(def: LiveVideoPatternDefinition) {
  if (def.key === 'M14') return renderM14Preview();
  if (def.key === 'M15') return renderM15Preview();
  if (isHighlightPattern(def.key)) return renderHighlightPreview(def.tileCount);
  return renderNumericPreview(def.tileCount);
}

export const PatternMenu: React.FC<PatternMenuProps> = ({
  activePattern,
  availablePatterns,
  onSelect,
  placement = 'bottom',
  triggerLabel = 'Change pattern',
}) => {
  const [open, setOpen] = useState(false);

  const definitions = useMemo(
    () => resolvePatternDefinitions(availablePatterns),
    [availablePatterns]
  );

  const grouped = useMemo(() => {
    return DEFAULT_PATTERN_CATEGORY_ORDER.map(category => ({
      category,
      patterns: definitions.filter(def => def.category === category),
    })).filter(group => group.patterns.length > 0);
  }, [definitions]);

  const content = (
    <div className="min-w-[420px] bg-neutral-900 text-white rounded-md p-4 shadow-2xl">
      <div className="space-y-4">
        {grouped.map(group => (
          <div key={group.category}>
            <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide text-neutral-200">
              {categoryTitle[group.category as LiveVideoPatternCategory]}
            </h4>
            <div className="flex flex-wrap gap-3">
              {group.patterns.map(pattern => (
                <button
                  key={pattern.key}
                  className={cn(
                    'rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-[#43E4FF] transition',
                    activePattern === pattern.key
                      ? 'bg-[#2A5BE2]/80'
                      : 'bg-neutral-800 hover:bg-neutral-700'
                  )}
                  onClick={() => {
                    onSelect(pattern.key);
                    setOpen(false);
                  }}
                >
                  {renderPreview(pattern)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Popover
      trigger="click"
      content={content}
      placement={placement === 'top' ? 'top' : 'bottom'}
      open={open}
      onOpenChange={setOpen}
      overlayInnerStyle={{ padding: 0 }}
    >
      <Button icon={<AppstoreOutlined />}>
        {triggerLabel}
      </Button>
    </Popover>
  );
};
