import React from 'react';
/**
 * Camera option structure
 */
export interface CameraOption {
    id: string;
    name?: string;
    cameraName?: string;
}
/**
 * Guidance step structure
 */
export interface GuidanceStep {
    direction: string;
    duration: number;
    message: string;
    icon: string;
}
/**
 * Video data structure
 */
export interface VideoData {
    videoBlob: Blob;
    videoBlobUrl: string;
    duration: number;
    cameraId: string;
    timestamp: string;
}
/**
 * AdvancedModeCapture Props
 */
export interface AdvancedModeCaptureProps {
    /** Callback when video changes */
    onChange?: (video: VideoData | null) => void;
    /** List of available cameras */
    registrationCameras?: CameraOption[];
    /** Position of instructions: 'top' | 'bottom' */
    instructionPosition?: 'top' | 'bottom';
    /** Custom guidance steps */
    guidanceSteps?: GuidanceStep[];
    /** Custom alert message */
    alertMessage?: string;
    /** Custom alert description */
    alertDescription?: string;
    /** Hide the info alert */
    hideAlert?: boolean;
    /** Hide the instructions alert */
    hideInstructions?: boolean;
    /** Face guide oval dimensions */
    ovalDimensions?: {
        width: number;
        height: number;
    };
    /** Custom class name */
    className?: string;
}
/**
 * AdvancedModeCapture Component
 *
 * Record video with guided prompts for advanced profile embedding.
 * Features 5-step guidance sequence and live preview.
 */
declare const AdvancedModeCapture: React.FC<AdvancedModeCaptureProps>;
export default AdvancedModeCapture;
//# sourceMappingURL=AdvancedModeCapture.d.ts.map