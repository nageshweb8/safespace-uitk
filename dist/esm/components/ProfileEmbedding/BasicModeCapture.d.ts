import React from 'react';
/**
 * Image data structure for captured/uploaded images
 */
export interface ImageData {
    file: File | null;
    url: string;
    name: string;
    isExisting?: boolean;
}
/**
 * Basic mode images structure
 */
export interface BasicModeImages {
    front: ImageData | null;
    left: ImageData | null;
    right: ImageData | null;
}
/**
 * User data for edit mode
 */
export interface UserData {
    filePathUrl?: string;
    [key: string]: unknown;
}
/**
 * BasicModeCapture Props
 */
export interface BasicModeCaptureProps {
    /** Current images value */
    value?: BasicModeImages;
    /** Callback when images change */
    onChange?: (images: BasicModeImages) => void;
    /** User data for edit mode (pre-fill existing image) */
    user?: UserData | null;
    /** Maximum file size in MB */
    maxFileSizeMB?: number;
    /** Image preview height in pixels */
    imagePreviewHeight?: number;
    /** Custom alert message */
    alertMessage?: string;
    /** Custom alert description */
    alertDescription?: string;
    /** Hide the info alert */
    hideAlert?: boolean;
    /** Hide the guidelines alert */
    hideGuidelines?: boolean;
    /** Custom guidelines list */
    guidelines?: string[];
    /** Custom class name */
    className?: string;
}
/**
 * BasicModeCapture Component
 *
 * Capture 1-3 static images for basic profile embedding.
 * Supports file upload and camera capture.
 */
declare const BasicModeCapture: React.FC<BasicModeCaptureProps>;
export default BasicModeCapture;
//# sourceMappingURL=BasicModeCapture.d.ts.map