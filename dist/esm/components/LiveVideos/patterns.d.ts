import { LiveVideoPatternDefinition, LiveVideoPatternKey } from '../../types/video';
export declare const DEFAULT_PATTERN_DEFINITIONS: LiveVideoPatternDefinition[];
export declare const DEFAULT_PATTERN_KEYS: LiveVideoPatternKey[];
export declare const DEFAULT_PATTERN_CATEGORY_ORDER: readonly ["Equal", "Highlight", "Extreme"];
export declare function getPatternDefinition(key: LiveVideoPatternKey): LiveVideoPatternDefinition | undefined;
export declare function resolvePatternDefinitions(available?: LiveVideoPatternKey[]): LiveVideoPatternDefinition[];
export declare function isHighlightPattern(key: LiveVideoPatternKey): boolean;
export declare function pickNearestPattern(count: number): LiveVideoPatternKey;
//# sourceMappingURL=patterns.d.ts.map