import React from 'react';
import { LiveFeedWhepProps } from '../types/video';
/**
 * LiveFeedWhep Component
 *
 * WHEP-compatible live feed player that mirrors the LiveFeedPlayer UI
 * but uses WHEP protocol for video streaming via WebRTC.
 *
 * Used for local mode streaming where cameras stream via WHEP from MediaMTX.
 *
 * @example
 * ```tsx
 * import { LiveFeedWhep } from '@safespace/uitk';
 *
 * const whepConfig = {
 *   baseUrl: 'http://192.168.101.87:8889',
 *   authCredentials: 'admin:admin', // optional
 * };
 *
 * <LiveFeedWhep
 *   streams={streams}
 *   whepConfig={whepConfig}
 *   autoPlay={true}
 *   muted={true}
 * />
 * ```
 */
export declare const LiveFeedWhep: React.FC<LiveFeedWhepProps>;
export default LiveFeedWhep;
//# sourceMappingURL=LiveFeedWhep.d.ts.map