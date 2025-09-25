import {
  LiveVideoPatternDefinition,
  LiveVideoPatternKey,
} from '../../types/video';

export const DEFAULT_PATTERN_DEFINITIONS: LiveVideoPatternDefinition[] = [
  { key: '1', label: '1-Up', category: 'Equal', tileCount: 1 },
  { key: '2', label: '2-Up', category: 'Equal', tileCount: 2 },
  { key: '4', label: 'Quad', category: 'Equal', tileCount: 4 },
  { key: '8', label: '2x4', category: 'Equal', tileCount: 8 },
  { key: '9', label: '3x3', category: 'Equal', tileCount: 9 },
  { key: '14', label: '14 Grid', category: 'Equal', tileCount: 14 },
  { key: '16', label: '4x4', category: 'Equal', tileCount: 16 },
  { key: '28', label: '28 Grid', category: 'Equal', tileCount: 28 },
  { key: 'M14', label: 'M14', category: 'Equal', tileCount: 15 },
  { key: 'M15', label: 'M15', category: 'Equal', tileCount: 15 },
  { key: '6-Highlight', label: '6 Highlight', category: 'Highlight', tileCount: 6 },
  { key: '8-Highlight', label: '8 Highlight', category: 'Highlight', tileCount: 8 },
  { key: '10-Highlight', label: '10 Highlight', category: 'Highlight', tileCount: 10 },
  { key: '12-Highlight', label: '12 Highlight', category: 'Highlight', tileCount: 12 },
  { key: '16-Highlight', label: '16 Highlight', category: 'Highlight', tileCount: 16 },
  { key: '20', label: '20 Grid', category: 'Extreme', tileCount: 20 },
  { key: '36', label: '36 Grid', category: 'Extreme', tileCount: 36 },
  { key: '64', label: '64 Grid', category: 'Extreme', tileCount: 64 },
];

const definitionMap = new Map(
  DEFAULT_PATTERN_DEFINITIONS.map(def => [def.key, def] as const)
);

export const DEFAULT_PATTERN_KEYS: LiveVideoPatternKey[] = DEFAULT_PATTERN_DEFINITIONS.map(
  def => def.key
);

export const DEFAULT_PATTERN_CATEGORY_ORDER = ['Equal', 'Highlight', 'Extreme'] as const;

export function getPatternDefinition(
  key: LiveVideoPatternKey
): LiveVideoPatternDefinition | undefined {
  return definitionMap.get(key);
}

export function resolvePatternDefinitions(
  available?: LiveVideoPatternKey[]
): LiveVideoPatternDefinition[] {
  if (!available || available.length === 0) {
    return DEFAULT_PATTERN_DEFINITIONS;
  }

  return available
    .map(key => getPatternDefinition(key))
    .filter((def): def is LiveVideoPatternDefinition => !!def);
}

export function isHighlightPattern(key: LiveVideoPatternKey): boolean {
  return key.includes('Highlight');
}

export function pickNearestPattern(count: number): LiveVideoPatternKey {
  if (count <= 1) return '1';
  if (count <= 2) return '2';
  if (count <= 4) return '4';
  if (count <= 8) return '8';
  if (count <= 9) return '9';
  if (count === 14) return 'M14';
  if (count <= 14) return '14';
  if (count === 15) return 'M15';
  if (count <= 16) return '16';
  if (count <= 20) return '20';
  if (count <= 28) return '28';
  if (count <= 36) return '36';
  return '64';
}
