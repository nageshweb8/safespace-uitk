import React, { createContext, useContext, ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { SafeSpaceTheme, defaultTheme, themeVariants } from '../types/theme';

interface SafeSpaceThemeContextValue {
  theme: SafeSpaceTheme;
  variant: keyof typeof themeVariants | 'default';
}

const SafeSpaceThemeContext = createContext<SafeSpaceThemeContextValue>({
  theme: defaultTheme,
  variant: 'default',
});

export interface SafeSpaceThemeProviderProps {
  children: ReactNode;
  variant?: keyof typeof themeVariants | 'default';
  customTheme?: Partial<SafeSpaceTheme>;
}

export const SafeSpaceThemeProvider: React.FC<SafeSpaceThemeProviderProps> = ({
  children,
  variant = 'default',
  customTheme,
}) => {
  const baseTheme = variant === 'default' ? defaultTheme : themeVariants[variant];
  const theme = customTheme ? { ...baseTheme, ...customTheme } : baseTheme;

  // Configure Ant Design theme
  const antdTheme = {
    token: {
      colorPrimary: theme.colors.primary[500],
      colorSuccess: theme.colors.success,
      colorWarning: theme.colors.warning,
      colorError: theme.colors.error,
      colorInfo: theme.colors.info,
      borderRadius: parseInt(theme.borderRadius.md),
      fontFamily: theme.typography.fontFamily.sans.join(', '),
    },
    components: {
      Card: {
        borderRadius: parseInt(theme.borderRadius.lg),
      },
      Button: {
        borderRadius: parseInt(theme.borderRadius.md),
      },
      Modal: {
        borderRadius: parseInt(theme.borderRadius.lg),
      },
    },
  };

  return (
    <SafeSpaceThemeContext.Provider value={{ theme, variant }}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </SafeSpaceThemeContext.Provider>
  );
};

export const useSafeSpaceTheme = (): SafeSpaceThemeContextValue => {
  const context = useContext(SafeSpaceThemeContext);
  if (!context) {
    throw new Error('useSafeSpaceTheme must be used within a SafeSpaceThemeProvider');
  }
  return context;
};
