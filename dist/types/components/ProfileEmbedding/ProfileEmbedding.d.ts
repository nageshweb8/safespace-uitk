import React from 'react';
import { BasicModeImages, BasicModeCaptureProps, UserData } from './BasicModeCapture';
import { VideoData, AdvancedModeCaptureProps, CameraOption } from './AdvancedModeCapture';
/**
 * Profile embedding mode
 */
export type ProfileEmbeddingMode = 'basic' | 'advanced';
/**
 * Combined value for profile embedding
 */
export interface ProfileEmbeddingValue {
    mode: ProfileEmbeddingMode;
    basicImages?: BasicModeImages | null;
    advancedVideo?: VideoData | null;
}
/**
 * ProfileEmbedding Props
 */
export interface ProfileEmbeddingProps {
    /** Current value */
    value?: ProfileEmbeddingValue;
    /** Callback when value changes */
    onChange?: (value: ProfileEmbeddingValue) => void;
    /** Initial mode selection */
    defaultMode?: ProfileEmbeddingMode;
    /** User data for edit mode */
    user?: UserData | null;
    /** Available cameras for advanced mode */
    registrationCameras?: CameraOption[];
    /** Allow mode switching */
    allowModeSwitch?: boolean;
    /** Hide mode selector */
    hideModeSelector?: boolean;
    /** Basic mode props override */
    basicModeProps?: Partial<BasicModeCaptureProps>;
    /** Advanced mode props override */
    advancedModeProps?: Partial<AdvancedModeCaptureProps>;
    /** Custom class name */
    className?: string;
    /** Labels for mode selector */
    modeLabels?: {
        basic?: string;
        advanced?: string;
    };
}
/**
 * ProfileEmbedding Component
 *
 * Unified component for profile facial embedding capture.
 * Supports both basic (static images) and advanced (video) modes.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ProfileEmbedding
 *   onChange={(value) => console.log(value)}
 *   registrationCameras={cameras}
 * />
 *
 * // Advanced mode only
 * <ProfileEmbedding
 *   defaultMode="advanced"
 *   hideModeSelector
 *   registrationCameras={cameras}
 * />
 *
 * // Edit mode with existing user
 * <ProfileEmbedding
 *   user={existingUser}
 *   onChange={handleChange}
 * />
 * ```
 */
declare const ProfileEmbedding: React.FC<ProfileEmbeddingProps>;
export default ProfileEmbedding;
//# sourceMappingURL=ProfileEmbedding.d.ts.map