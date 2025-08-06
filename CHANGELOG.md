# Changelog

All notable changes to the SafeSpace UI Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2024-08-06

### Added
- Keyboard shortcuts support: Space (play/pause), M (mute), F (fullscreen), ←→ (switch streams)
- Enhanced video player hooks with `useVideoPlayer` and `useStreamLayout`
- Better component architecture with dedicated MainVideoPlayer and FullscreenModal
- Development playground excluded from builds (playground/, playgroud/)
- Comprehensive .npmignore for cleaner package distribution

### Fixed
- **CRITICAL**: Thumbnails now auto-play correctly (changed from autoPlay={false} to autoPlay={true})
- **CRITICAL**: Fixed main video height jerking when switching streams (added min-height and aspect-ratio constraints)
- Removed duplicate LiveFeedPlayer files - consolidated to single enhanced version
- Fixed import paths after component restructuring
- Enhanced error handling and loading states

### Changed
- Moved MainVideoPlayer and FullscreenModal to shared components directory
- Improved video player architecture with custom hooks
- Enhanced LiveFeedPlayer with keyboard controls and better state management
- Better aspect ratio handling (16:9) with minimum height constraints
- Playground now properly excluded from npm package builds

### Improved
- Smoother video transitions with proper height management
- Better thumbnail video playback experience
- Enhanced developer experience with playground for feature testing
- More stable video layout that doesn't jump during stream switching
- Better component organization and reusability

## [0.1.3] - 2024-01-XX

### Added
- Enhanced modular architecture with separated concerns
- Better TypeScript type exports and definitions
- Comprehensive peer dependency management following Material UI patterns
- Production-ready build pipeline with ESM/CJS dual exports
- Enhanced package.json with proper metadata and scripts

### Changed
- **BREAKING**: Refactored `LiveFeedPlayer` component for better maintainability
- Separated `VideoPlayer` into standalone, reusable component
- Improved `ThumbnailGrid` component with cleaner interface
- Streamlined imports and removed duplicate code
- Optimized peer dependencies for better React version compatibility (>=16.8.0)
- Enhanced ESLint configuration for better code quality

### Fixed
- Resolved TypeScript compilation errors
- Fixed ESLint configuration issues with TypeScript rules
- Removed unused imports and variables
- Fixed duplicate identifier errors in component files
- Corrected export conflicts between components and types

### Improved
- Code organization following industry best practices
- Better separation of concerns in component architecture
- Cleaner, more maintainable codebase
- Enhanced developer experience with proper type definitions
- Reduced bundle size through optimized imports

## [0.1.0] - 2024-01-XX

### Added
- Initial release of SafeSpace UI Toolkit
- `LiveFeedPlayer` component for video streaming
- Theme provider system
- Basic TypeScript support
- Ant Design integration
