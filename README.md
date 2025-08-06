# SafeSpace UI Toolkit (UITK)

[![npm version](https://badge.fury.io/js/%40safespace%2Fuitk.svg)](https://badge.fury.io/js/%40safespace%2Fuitk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Enterprise-grade UI component library for SafeSpace applications, built with React, TypeScript, and Ant Design.

## 🚀 Features

- 🎨 **Consistent Design System** - Unified branding across all SafeSpace applications
- 🔧 **TypeScript First** - Full TypeScript support with comprehensive type definitions
- 🎯 **Application-Specific Themes** - Prison, School, Mall, and SNL variants
- 📱 **Responsive Design** - Mobile-first responsive components
- ♿ **Accessibility** - WCAG 2.1 AA compliant

## 📦 Installation

```bash
npm install @safespace/uitk antd react react-dom
```

## 🎯 Quick Start

```tsx
import { SafeSpaceThemeProvider, LiveFeedPlayer } from '@safespace/uitk';
import '@safespace/uitk/styles';

function App() {
  return (
    <SafeSpaceThemeProvider variant="prison">
      <LiveFeedPlayer streams={streams} />
    </SafeSpaceThemeProvider>
  );
}
```
