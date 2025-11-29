import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Image, Alert, Row, Col, message, Modal, Tooltip } from 'antd';
import { 
    UploadOutlined, 
    CameraOutlined, 
    DeleteOutlined,
    CheckCircleOutlined,
    CloseOutlined
} from '@ant-design/icons';

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

// Constants
const DEFAULT_MAX_FILE_SIZE_MB = 5;
const DEFAULT_IMAGE_PREVIEW_HEIGHT = 200;
const JPEG_QUALITY = 0.95;
const BUTTON_SIZE = { width: '48px', height: '38px' };
const FACE_GUIDE_SIZE = { width: '300px', height: '400px' };
const CAMERA_CONSTRAINTS = {
    video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }
};
const MODAL_RENDER_DELAY = 100;

// Angle instruction mapping
const ANGLE_INSTRUCTIONS: Record<string, string> = {
    front: '👤 Look straight at the camera',
    left: '◀️ Turn your face to the left (45°)',
    right: '▶️ Turn your face to the right (45°)'
};

const DEFAULT_GUIDELINES = [
    'Face should be clearly visible and well-lit',
    'Remove glasses, hats, or face coverings if possible',
    'Look directly at the camera for front view',
    'Turn head 45° for left and right views'
];

/**
 * BasicModeCapture Component
 * 
 * Capture 1-3 static images for basic profile embedding.
 * Supports file upload and camera capture.
 */
const BasicModeCapture: React.FC<BasicModeCaptureProps> = ({ 
    value = { front: null, left: null, right: null }, 
    onChange, 
    user = null,
    maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
    imagePreviewHeight = DEFAULT_IMAGE_PREVIEW_HEIGHT,
    alertMessage = 'Basic Profile Embedding',
    alertDescription = 'Please upload clear, well-lit images of the face. Front view is required. Left and right views are optional but recommended for better recognition.',
    hideAlert = false,
    hideGuidelines = false,
    guidelines = DEFAULT_GUIDELINES,
    className = ''
}) => {
    // Initialize images from value prop or user data (for edit mode)
    const getInitialImages = (): BasicModeImages => {
        // Priority 1: value prop (controlled component)
        if (value?.front || value?.left || value?.right) {
            return {
                front: value.front || null,
                left: value.left || null,
                right: value.right || null
            };
        }
        
        // Priority 2: user.filePathUrl (edit mode - load existing image)
        if (user?.filePathUrl) {
            return {
                front: {
                    url: user.filePathUrl,
                    name: 'front-view.jpg',
                    file: null,
                    isExisting: true
                },
                left: null,
                right: null
            };
        }
        
        // Default: empty state
        return { front: null, left: null, right: null };
    };

    const [images, setImages] = useState<BasicModeImages>(getInitialImages());
    
    // Sync with parent value prop changes
    useEffect(() => {
        if (value && Object.keys(value).length > 0) {
            setImages(value);
        }
    }, [value]);
    
    // Update images when user prop changes (edit mode) - Only on mount
    useEffect(() => {
        if (user?.filePathUrl && !images.front) {
            setImages({
                front: {
                    url: user.filePathUrl,
                    name: 'front-view.jpg',
                    file: null,
                    isExisting: true
                },
                left: null,
                right: null
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.filePathUrl]);
    
    // Camera capture state
    const [cameraModalOpen, setCameraModalOpen] = useState(false);
    const [currentAngle, setCurrentAngle] = useState<string | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Helper: Validate image file
    const validateImageFile = (file: File): { valid: boolean; error?: string } => {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            return { valid: false, error: 'Please upload an image file' };
        }

        const isValidSize = file.size / 1024 / 1024 < maxFileSizeMB;
        if (!isValidSize) {
            return { valid: false, error: `Image must be smaller than ${maxFileSizeMB}MB` };
        }

        return { valid: true };
    };

    // Helper: Create image data object
    const createImageData = (file: File, url: string): ImageData => ({
        file,
        url,
        name: file.name
    });

    // Helper: Update images state and notify parent
    const updateImages = (angle: string, imageData: ImageData | null) => {
        const newImages = {
            ...images,
            [angle]: imageData
        } as BasicModeImages;
        setImages(newImages);
        onChange?.(newImages);
    };

    // Helper: Get formatted angle title
    const getAngleTitle = (angle: string | null): string => {
        return angle ? angle.charAt(0).toUpperCase() + angle.slice(1) : '';
    };

    const handleImageUpload = (angle: string, file: File): boolean => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            message.error(validation.error || 'Invalid file');
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = createImageData(file, e.target?.result as string);
            updateImages(angle, imageData);
        };
        reader.readAsDataURL(file);

        return false; // Prevent auto upload
    };

    const handleRemoveImage = (angle: string) => {
        updateImages(angle, null);
    };

    // Camera capture functions
    const openCamera = async (angle: string) => {
        setCurrentAngle(angle);
        setCameraModalOpen(true);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
            setCameraStream(stream);
            
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, MODAL_RENDER_DELAY);
        } catch (error) {
            message.error('Unable to access camera. Please check permissions.');
            console.error('Camera access error:', error);
            setCameraModalOpen(false);
        }
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setCameraModalOpen(false);
        setCurrentAngle(null);
    };

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current || !currentAngle) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            if (!blob) {
                message.error('Failed to capture image');
                return;
            }

            const url = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
            const file = new File([blob], `${currentAngle}-view-${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            const imageData = createImageData(file, url);
            updateImages(currentAngle, imageData);
            
            message.success('Image captured successfully!');
            closeCamera();
        }, 'image/jpeg', JPEG_QUALITY);
    };

    const renderImageCapture = (angle: 'front' | 'left' | 'right', label: string, required = false) => {
        const imageData = images[angle];
        const hasImage = !!imageData;

        return (
            <Col xs={24} md={8}>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-full">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-between w-full">
                            <span className="font-medium">
                                {label}
                                {required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                            {hasImage && (
                                <CheckCircleOutlined className="text-green-500" />
                            )}
                        </div>

                        {hasImage ? (
                            <div className="w-full">
                                <Image
                                    src={imageData.url}
                                    alt={label}
                                    width="100%"
                                    height={imagePreviewHeight}
                                    style={{ objectFit: 'cover', borderRadius: '8px' }}
                                />
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleRemoveImage(angle)}
                                    className="w-full mt-2"
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <div className="w-full">
                                <div 
                                    className="bg-gray-100 rounded-lg flex items-center justify-center mb-3"
                                    style={{ height: `${imagePreviewHeight}px` }}
                                >
                                    <CameraOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                                </div>
                                
                                <div className="flex items-center justify-center gap-2">
                                    <Tooltip title="Take Photo" placement="bottom">
                                        <Button 
                                            icon={<CameraOutlined />} 
                                            type={required && !hasImage ? 'primary' : 'default'}
                                            size="large"
                                            onClick={() => openCamera(angle)}
                                            className="flex items-center justify-center"
                                            style={BUTTON_SIZE}
                                        />
                                    </Tooltip>
                                    
                                    <Upload
                                        accept="image/*"
                                        showUploadList={false}
                                        beforeUpload={(file) => handleImageUpload(angle, file)}
                                    >
                                        <Tooltip title="Upload from Device" placement="bottom">
                                            <Button 
                                                icon={<UploadOutlined />} 
                                                size="large"
                                                className="flex items-center justify-center"
                                                style={BUTTON_SIZE}
                                            />
                                        </Tooltip>
                                    </Upload>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Col>
        );
    };

    return (
        <div className={`safespace-basic-mode-capture ${className}`}>
            {!hideAlert && (
                <Alert
                    message={alertMessage}
                    description={alertDescription}
                    type="info"
                    showIcon
                    className="mb-4"
                />
            )}

            <Row gutter={[16, 16]}>
                {renderImageCapture('front', 'Front View', true)}
                {renderImageCapture('left', 'Left View', false)}
                {renderImageCapture('right', 'Right View', false)}
            </Row>

            {!hideGuidelines && (
                <div className="mt-4">
                    <Alert
                        message="Image Guidelines"
                        description={
                            <ul className="list-disc list-inside space-y-1 mt-2">
                                {guidelines.map((guideline, index) => (
                                    <li key={index}>{guideline}</li>
                                ))}
                                <li>Maximum file size: {maxFileSizeMB}MB per image</li>
                            </ul>
                        }
                        type="warning"
                        showIcon
                    />
                </div>
            )}

            {/* Camera Capture Modal */}
            <Modal
                title={`Capture ${getAngleTitle(currentAngle)} View`}
                open={cameraModalOpen}
                onCancel={closeCamera}
                width={800}
                footer={[
                    <Button key="cancel" onClick={closeCamera} icon={<CloseOutlined />}>
                        Cancel
                    </Button>,
                    <Button key="capture" type="primary" onClick={captureImage} icon={<CameraOutlined />}>
                        Capture Photo
                    </Button>
                ]}
            >
                <div className="camera-preview-container">
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Face guide overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div 
                                className="border-4 border-white border-dashed rounded-full opacity-50"
                                style={FACE_GUIDE_SIZE}
                            />
                        </div>

                        {/* Instruction overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                            <p className="text-white text-center text-lg">
                                {currentAngle ? ANGLE_INSTRUCTIONS[currentAngle] : ''}
                            </p>
                        </div>
                    </div>
                </div>
                
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </Modal>
        </div>
    );
};

export default BasicModeCapture;
