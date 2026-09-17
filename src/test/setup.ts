import '@testing-library/jest-dom';

// Mock HLS.js for tests
jest.mock('hls.js', () => {
  const MockHls = Object.assign(
    jest.fn().mockImplementation(() => ({
      loadSource: jest.fn(),
      attachMedia: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
      startLoad: jest.fn(),
      recoverMediaError: jest.fn(),
      liveSyncPosition: null,
    })),
    {
      isSupported: jest.fn(() => true),
      Events: {
        ERROR: 'hlsError',
        MANIFEST_PARSED: 'hlsManifestParsed',
        FRAG_LOADED: 'hlsFragLoaded',
      },
      ErrorTypes: { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' },
      ErrorDetails: {
        MANIFEST_LOAD_ERROR: 'manifestLoadError',
        MANIFEST_LOAD_TIMEOUT: 'manifestLoadTimeOut',
      },
    }
  );
  return { __esModule: true, default: MockHls };
});

// jsdom does not implement media playback or resource loading.
Object.defineProperties(HTMLMediaElement.prototype, {
  play: { configurable: true, value: jest.fn().mockResolvedValue(undefined) },
  pause: { configurable: true, value: jest.fn() },
  load: { configurable: true, value: jest.fn() },
});

// Mock matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console errors in tests unless they're expected
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
