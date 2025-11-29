/**
 * ProfileEmbedding Components
 *
 * Reusable components for profile facial embedding capture across SafeSpace verticals
 * - BasicModeCapture: Static image capture (1-3 images)
 * - AdvancedModeCapture: Video recording with guided prompts
 * - ProfileEmbedding: Wrapper component with mode switching
 */
export { default as ProfileEmbedding } from './ProfileEmbedding';
export { default as BasicModeCapture } from './BasicModeCapture';
export { default as AdvancedModeCapture } from './AdvancedModeCapture';
export type { ProfileEmbeddingProps, ProfileEmbeddingMode, ProfileEmbeddingValue } from './ProfileEmbedding';
export type { BasicModeCaptureProps, BasicModeImages, ImageData } from './BasicModeCapture';
export type { AdvancedModeCaptureProps, VideoData, CameraOption, GuidanceStep } from './AdvancedModeCapture';
//# sourceMappingURL=index.d.ts.map