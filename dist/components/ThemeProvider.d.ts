import React, { ReactNode } from 'react';
import { SafeSpaceTheme, themeVariants } from '../types/theme';
interface SafeSpaceThemeContextValue {
    theme: SafeSpaceTheme;
    variant: keyof typeof themeVariants | 'default';
}
export interface SafeSpaceThemeProviderProps {
    children: ReactNode;
    variant?: keyof typeof themeVariants | 'default';
    customTheme?: Partial<SafeSpaceTheme>;
}
export declare const SafeSpaceThemeProvider: React.FC<SafeSpaceThemeProviderProps>;
export declare const useSafeSpaceTheme: () => SafeSpaceThemeContextValue;
export {};
//# sourceMappingURL=ThemeProvider.d.ts.map