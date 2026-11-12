import { useState, useRef, useCallback } from 'react';
import { Camera, Maximize2, Minimize2, Radio } from 'lucide-react';
import StatusIndicator from '../common/StatusIndicator';
import { getCameraStreamUrl } from '../../services/api';

export default function CameraFeed({ telemetry, compact = false }) {
  const [imgError, setImgError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const cameraConnected = telemetry?.camera_connected ?? false;
  const fps = telemetry?.fps ?? 0;
  const frameId = telemetry?.frame_id ?? 0;
  const demoMode = telemetry?.demo_mode ?? false;

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const handleImgError = () => {
    setImgError(true);
  };

  const handleImgLoad = () => {
    setImgError(false);
  };

  return (
    <div
      ref={containerRef}
      className={`bg-[#1a1f2e] rounded-xl border border-[#2a3142] overflow-hidden flex flex-col ${isFullscreen ? 'bg-black' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a3142]">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
            Live Camera Feed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIndicator
            status={cameraConnected || !imgError ? 'normal' : 'danger'}
            size="sm"
          />
          <span className={`text-[10px] font-medium ${cameraConnected || !imgError ? 'text-green-400' : 'text-red-400'}`}>
            {cameraConnected || !imgError ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Camera View */}
      <div className={`relative bg-black ${compact ? 'aspect-video' : 'aspect-video'}`}>
        {!imgError ? (
          <img
            src={getCameraStreamUrl()}
            alt="Live Camera Feed"
            className="absolute inset-0 w-full h-full object-contain"
            onError={handleImgError}
            onLoad={handleImgLoad}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]">
            <Camera className="w-16 h-16 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500">Camera Offline</p>
            <p className="text-xs text-gray-600 mt-1">Waiting for connection...</p>
          </div>
        )}

        {/* Overlays */}
        {!imgError && (
          <>
            {/* LIVE / DEMO Badge */}
            <div className="absolute top-3 left-3">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${demoMode ? 'bg-yellow-500/20' : 'bg-red-500/20'} backdrop-blur-sm`}>
                <span className={`w-2 h-2 rounded-full ${demoMode ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                <span className={`text-[10px] font-bold ${demoMode ? 'text-yellow-400' : 'text-red-400'}`}>
                  {demoMode ? 'DEMO' : 'LIVE'}
                </span>
              </div>
            </div>

            {/* FPS */}
            <div className="absolute top-3 right-3">
              <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                <span className="text-[10px] font-mono text-green-400 tabular-nums">
                  {fps.toFixed(1)} FPS
                </span>
              </div>
            </div>

            {/* Frame Count */}
            <div className="absolute bottom-3 left-3">
              <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                <span className="text-[10px] font-mono text-gray-300 tabular-nums">
                  Frame #{frameId}
                </span>
              </div>
            </div>

            {/* Fullscreen Toggle */}
            <div className="absolute bottom-3 right-3">
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-gray-300" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-300" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

