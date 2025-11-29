import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Select, Button, Alert, Progress, Space, Divider, message } from 'antd';
import { 
    PlayCircleOutlined, 
    PauseOutlined, 
    StopOutlined,
    ReloadOutlined,
    CameraOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import { useReactMediaRecorder } from 'react-media-recorder';

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
    ovalDimensions?: { width: number; height: number };
    /** Custom class name */
    className?: string;
}

// Default guidance sequence (as per meeting discussion)
const DEFAULT_GUIDANCE_STEPS: GuidanceStep[] = [
    { direction: 'front', duration: 5, message: 'Look straight at the camera', icon: '👤' },
    { direction: 'left', duration: 4, message: 'Slowly turn your face to the left', icon: '◀️' },
    { direction: 'right', duration: 4, message: 'Slowly turn your face to the right', icon: '▶️' },
    { direction: 'up', duration: 4, message: 'Tilt your head slightly up', icon: '⬆️' },
    { direction: 'down', duration: 4, message: 'Tilt your head slightly down', icon: '⬇️' }
];

// Constants
const VIDEO_ASPECT_RATIO = '16/9';
const DEFAULT_OVAL_DIMENSIONS = { width: 300, height: 380 };
const DEFAULT_SYSTEM_CAMERA: CameraOption = { 
    id: 'default-system-camera', 
    name: 'Default System Camera', 
    cameraName: 'Default System Camera' 
};

/**
 * AdvancedModeCapture Component
 * 
 * Record video with guided prompts for advanced profile embedding.
 * Features 5-step guidance sequence and live preview.
 */
const AdvancedModeCapture: React.FC<AdvancedModeCaptureProps> = ({ 
    onChange, 
    registrationCameras = [],
    instructionPosition = 'bottom',
    guidanceSteps = DEFAULT_GUIDANCE_STEPS,
    alertMessage = 'Advanced Profile Embedding',
    alertDescription = 'Record a video following the on-screen guidance. Our AI service will analyze your video for facial recognition quality and provide feedback.',
    hideAlert = false,
    hideInstructions = false,
    ovalDimensions = DEFAULT_OVAL_DIMENSIONS,
    className = ''
}) => {
    // Add default system camera if no cameras provided
    const availableCameras = registrationCameras.length > 0 
        ? registrationCameras 
        : [DEFAULT_SYSTEM_CAMERA];
    
    // Calculate max recording duration from guidance steps
    const maxRecordingDuration = guidanceSteps.reduce((sum, step) => sum + step.duration, 0);
    
    // State management
    const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [currentGuidanceStep, setCurrentGuidanceStep] = useState(0);
    
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);

    // react-media-recorder hook
    const {
        status,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        mediaBlobUrl,
        previewStream,
        clearBlobUrl
    } = useReactMediaRecorder({
        video: (selectedCamera && selectedCamera !== 'default-system-camera') 
            ? { deviceId: { exact: selectedCamera } } 
            : true,
        audio: false,
        onStop: (blobUrl: string, blob: Blob) => {
            handleRecordingComplete(blobUrl, blob);
        }
    });

    // Connect preview stream to video element
    useEffect(() => {
        if (previewStream && videoRef.current && status === 'recording') {
            videoRef.current.srcObject = previewStream;
        }
    }, [previewStream, status]);

    // Timer for recording
    useEffect(() => {
        if (status !== 'recording') {
            return;
        }

        const interval = setInterval(() => {
            setRecordingTime(prev => {
                const newTime = prev + 1;
                
                // Calculate current guidance step
                let elapsed = 0;
                for (let i = 0; i < guidanceSteps.length; i++) {
                    elapsed += guidanceSteps[i].duration;
                    if (newTime < elapsed) {
                        setCurrentGuidanceStep(i);
                        break;
                    }
                }
                
                // Auto-stop at max duration
                if (newTime >= maxRecordingDuration) {
                    stopRecording();
                }
                
                return newTime;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [status, maxRecordingDuration, stopRecording, guidanceSteps]);

    // Helper to reset recording state
    const resetRecordingState = useCallback(() => {
        setRecordingTime(0);
        setCurrentGuidanceStep(0);
    }, []);

    // Format time display
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const getProgress = (): number => {
        return Math.round((recordingTime / maxRecordingDuration) * 100);
    };

    // Handlers
    const handleCameraSelect = (cameraId: string) => {
        setSelectedCamera(cameraId);
    };

    const handleStartRecording = () => {
        if (!selectedCamera) {
            message.warning('Please select a camera first');
            return;
        }

        resetRecordingState();
        startRecording();
        message.success('Recording started! Follow the guidance prompts.');
    };

    const handlePauseRecording = () => {
        pauseRecording();
        message.info('Recording paused');
    };

    const handleResumeRecording = () => {
        resumeRecording();
        message.info('Recording resumed');
    };

    const handleRecordingComplete = (blobUrl: string, blob: Blob) => {
        if (onChange && selectedCamera) {
            onChange({
                videoBlob: blob,
                videoBlobUrl: blobUrl,
                duration: recordingTime,
                cameraId: selectedCamera,
                timestamp: new Date().toISOString()
            });
        }
        
        message.success(`Recording complete! Duration: ${formatTime(recordingTime)}`);
    };

    const handleRetake = () => {
        clearBlobUrl();
        resetRecordingState();
        onChange?.(null);
        message.info('Ready to record again');
    };

    const handleUseVideo = () => {
        if (!mediaBlobUrl) {
            message.error('No video recorded');
            return;
        }
        message.success('Video accepted! This will be used for profile embedding.');
    };

    // Helper component for idle status message
    interface IdleStatusMessageProps {
        icon: React.ComponentType<{ style?: React.CSSProperties }>;
        message: string;
        status: string | null;
        statusType?: 'info' | 'success' | 'warning';
    }

    const IdleStatusMessage: React.FC<IdleStatusMessageProps> = ({ 
        icon: IconElement, 
        message: msg, 
        status: statusMsg, 
        statusType = 'info' 
    }) => (
        <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
                {IconElement && <IconElement style={{ fontSize: '64px', marginBottom: '16px' }} />}
                <p className="text-lg">{msg}</p>
                {statusMsg && (
                    <p className={`text-sm mt-2 ${
                        statusType === 'success' ? 'text-green-400' :
                        statusType === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                    }`}>
                        <CheckCircleOutlined /> {statusMsg}
                    </p>
                )}
            </div>
        </div>
    );

    return (
        <div className={`safespace-advanced-mode-capture ${className}`}>
            {!hideAlert && (
                <Alert
                    message={alertMessage}
                    description={alertDescription}
                    type="info"
                    showIcon
                    className="mb-4"
                />
            )}

            {/* Camera Selection */}
            <div className="mb-4">
                <label className="block mb-2 font-medium">
                    Select Registration Camera <span className="text-red-500">*</span>
                </label>
                <Select
                    placeholder="Choose a camera"
                    style={{ width: '100%' }}
                    value={selectedCamera}
                    onChange={handleCameraSelect}
                    disabled={status !== 'idle'}
                    size="large"
                >
                    {availableCameras.map(camera => (
                        <Select.Option key={camera.id} value={camera.id}>
                            <Space>
                                <CameraOutlined />
                                {camera.name || camera.cameraName}
                            </Space>
                        </Select.Option>
                    ))}
                </Select>
            </div>

            <Divider />

            {/* Video Preview Area */}
            <div className="video-preview-container relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: VIDEO_ASPECT_RATIO }}>
                {/* No camera selected */}
                {status === 'idle' && !selectedCamera && (
                    <IdleStatusMessage
                        icon={CameraOutlined}
                        message="Select a camera to begin"
                        status={null}
                        statusType="warning"
                    />
                )}

                {/* Camera selected, ready to record */}
                {status === 'idle' && selectedCamera && !mediaBlobUrl && (
                    <IdleStatusMessage
                        icon={PlayCircleOutlined}
                        message="Click Start Recording to begin"
                        status="Ready to record (Backend AI verification)"
                        statusType="success"
                    />
                )}

                {/* Live Video Preview */}
                {(status === 'recording' || status === 'paused') && (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ backgroundColor: '#000' }}
                        />

                        {/* Guidance Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Configurable Guidance Message - Top or Bottom */}
                            {instructionPosition === 'top' ? (
                                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6">
                                    <div className="text-white">
                                        <div className="text-sm font-medium mb-1 flex items-center gap-2">
                                            <span>Step {currentGuidanceStep + 1} of {guidanceSteps.length}</span>
                                            <span className="text-2xl">{guidanceSteps[currentGuidanceStep]?.icon}</span>
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {guidanceSteps[currentGuidanceStep]?.message}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                                    <div className="text-white">
                                        <div className="text-2xl font-bold mb-2">
                                            {guidanceSteps[currentGuidanceStep]?.message}
                                        </div>
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            <span>Step {currentGuidanceStep + 1} of {guidanceSteps.length}</span>
                                            <span className="text-2xl">{guidanceSteps[currentGuidanceStep]?.icon}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recording Indicator */}
                            <div className="absolute top-6 right-6 space-y-2">
                                <div className="flex items-center gap-2 bg-red-500 px-3 py-2 rounded-full">
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                                    <span className="text-white font-medium">
                                        {formatTime(recordingTime)} / {formatTime(maxRecordingDuration)}
                                    </span>
                                </div>
                            </div>

                            {/* Face Guide Oval - Green Radium Glow */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div 
                                    className="rounded-full transition-all duration-300 border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.5),0_0_60px_rgba(34,197,94,0.0)]"
                                    style={{ 
                                        width: `${ovalDimensions.width}px`, 
                                        height: `${ovalDimensions.height}px`,
                                        borderWidth: '4px',
                                        borderStyle: 'solid'
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Playback of recorded video */}
                {status === 'stopped' && mediaBlobUrl && (
                    <video
                        src={mediaBlobUrl}
                        controls
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* Progress Bar */}
            {(status === 'recording' || status === 'paused') && (
                <Progress 
                    percent={getProgress()} 
                    status={status === 'paused' ? 'exception' : 'active'}
                    strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                    }}
                    format={(percent) => `${percent}% (${formatTime(recordingTime)})`}
                    className="mb-4"
                />
            )}

            {/* Recording Controls */}
            <div className="flex justify-center gap-3 mb-4">
                {(status === 'idle' || status === 'stopped') && !mediaBlobUrl && (
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={handleStartRecording}
                        disabled={!selectedCamera}
                    >
                        Start Recording
                    </Button>
                )}

                {status === 'recording' && (
                    <>
                        <Button
                            size="large"
                            icon={<PauseOutlined />}
                            onClick={handlePauseRecording}
                        >
                            Pause
                        </Button>
                        <Button
                            danger
                            size="large"
                            icon={<StopOutlined />}
                            onClick={stopRecording}
                        >
                            Stop
                        </Button>
                    </>
                )}

                {status === 'paused' && (
                    <>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlayCircleOutlined />}
                            onClick={handleResumeRecording}
                        >
                            Resume
                        </Button>
                        <Button
                            danger
                            size="large"
                            icon={<StopOutlined />}
                            onClick={stopRecording}
                        >
                            Stop
                        </Button>
                    </>
                )}

                {status === 'stopped' && mediaBlobUrl && (
                    <>
                        <Button
                            size="large"
                            icon={<ReloadOutlined />}
                            onClick={handleRetake}
                        >
                            Retake
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            icon={<CheckCircleOutlined />}
                            onClick={handleUseVideo}
                        >
                            Use This Video
                        </Button>
                    </>
                )}
            </div>

            {/* Instructions */}
            {!hideInstructions && status === 'idle' && !mediaBlobUrl && (
                <Alert
                    message="Recording Instructions"
                    description={
                        <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>Position your face within the oval guide</li>
                            <li>Follow the on-screen prompts carefully ({guidanceSteps.length} steps, {maxRecordingDuration} seconds total)</li>
                            <li>Move your head slowly and smoothly</li>
                            <li>Good lighting is important for best results</li>
                            <li>The green status indicator shows recording is active</li>
                            <li>Recording will automatically stop after {maxRecordingDuration} seconds</li>
                        </ul>
                    }
                    type="warning"
                    showIcon
                />
            )}

            {/* Success Message */}
            {status === 'stopped' && mediaBlobUrl && (
                <Alert
                    message="Recording Complete!"
                    description={
                        <div>
                            <p>Your video has been recorded successfully ({formatTime(recordingTime)}).</p>
                            <p className="mt-2">Review the video above. If you&apos;re satisfied, click &quot;Use This Video&quot; to proceed.</p>
                            <p className="text-xs text-gray-500 mt-2">
                                Note: In production, this video will be validated by the backend quality gate before acceptance.
                            </p>
                        </div>
                    }
                    type="success"
                    showIcon
                />
            )}
        </div>
    );
};

export default AdvancedModeCapture;
