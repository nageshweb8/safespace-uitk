import React from 'react';
import { LiveVideoPatternKey } from '../../types/video';
interface PatternMenuProps {
    activePattern: LiveVideoPatternKey;
    availablePatterns?: LiveVideoPatternKey[];
    onSelect: (pattern: LiveVideoPatternKey) => void;
    placement?: 'top' | 'bottom';
    triggerLabel?: string;
}
export declare const PatternMenu: React.FC<PatternMenuProps>;
export {};
//# sourceMappingURL=PatternMenu.d.ts.map