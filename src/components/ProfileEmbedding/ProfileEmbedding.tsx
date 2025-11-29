import React, { useState } from 'react';
import { Radio, Space } from 'antd';
import { CameraOutlined, VideoCameraOutlined } from '@ant-design/icons';
import BasicModeCapture, { BasicModeImages, BasicModeCaptureProps, UserData } from './BasicModeCapture';
import AdvancedModeCapture, { VideoData, AdvancedModeCaptureProps, CameraOption } from './AdvancedModeCapture';

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
const ProfileEmbedding: React.FC<ProfileEmbeddingProps> = ({
    value,
    onChange,
    defaultMode = 'basic',
    user = null,
    registrationCameras = [],
    allowModeSwitch = true,
    hideModeSelector = false,
    basicModeProps = {},
    advancedModeProps = {},
    className = '',
    modeLabels = {
        basic: 'Basic Mode (Images)',
        advanced: 'Advanced Mode (Video)'
    }
}) => {
    // State for mode selection
    const [mode, setMode] = useState<ProfileEmbeddingMode>(value?.mode || defaultMode);
    
    // State for captured data
    const [basicImages, setBasicImages] = useState<BasicModeImages | null>(value?.basicImages || null);
    const [advancedVideo, setAdvancedVideo] = useState<VideoData | null>(value?.advancedVideo || null);

    // Handle mode change
    const handleModeChange = (newMode: ProfileEmbeddingMode) => {
        if (!allowModeSwitch) return;
        
        setMode(newMode);
        onChange?.({
            mode: newMode,
            basicImages: newMode === 'basic' ? basicImages : null,
            advancedVideo: newMode === 'advanced' ? advancedVideo : null
        });
    };

    // Handle basic mode images change
    const handleBasicImagesChange = (images: BasicModeImages) => {
        setBasicImages(images);
        onChange?.({
            mode: 'basic',
            basicImages: images,
            advancedVideo: null
        });
    };

    // Handle advanced mode video change
    const handleAdvancedVideoChange = (video: VideoData | null) => {
        setAdvancedVideo(video);
        onChange?.({
            mode: 'advanced',
            basicImages: null,
            advancedVideo: video
        });
    };

    return (
        <div className={`safespace-profile-embedding ${className}`}>
            {/* Mode Selector */}
            {!hideModeSelector && (
                <div className="mb-6">
                    <Radio.Group 
                        value={mode} 
                        onChange={(e) => handleModeChange(e.target.value)}
                        buttonStyle="solid"
                        size="large"
                        disabled={!allowModeSwitch}
                    >
                        <Space direction="horizontal" size="middle">
                            <Radio.Button value="basic">
                                <Space>
                                    <CameraOutlined />
                                    {modeLabels.basic}
                                </Space>
                            </Radio.Button>
                            <Radio.Button value="advanced">
                                <Space>
                                    <VideoCameraOutlined />
                                    {modeLabels.advanced}
                                </Space>
                            </Radio.Button>
                        </Space>
                    </Radio.Group>
                </div>
            )}

            {/* Basic Mode */}
            {mode === 'basic' && (
                <BasicModeCapture
                    value={basicImages || undefined}
                    onChange={handleBasicImagesChange}
                    user={user}
                    {...basicModeProps}
                />
            )}

            {/* Advanced Mode */}
            {mode === 'advanced' && (
                <AdvancedModeCapture
                    onChange={handleAdvancedVideoChange}
                    registrationCameras={registrationCameras}
                    {...advancedModeProps}
                />
            )}
        </div>
    );
};

export default ProfileEmbedding;
