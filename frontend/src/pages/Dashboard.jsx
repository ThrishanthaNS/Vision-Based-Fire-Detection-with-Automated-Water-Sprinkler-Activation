import { Flame, Brain, Ruler, Gauge } from 'lucide-react';
import { useTelemetryContext } from '../components/layout/Layout';
import StatusCard from '../components/dashboard/StatusCard';
import CameraFeed from '../components/dashboard/CameraFeed';
import FrameAnalysis from '../components/dashboard/FrameAnalysis';
import SensorMonitor from '../components/dashboard/SensorMonitor';
import PressurePanel from '../components/dashboard/PressurePanel';
import DecisionPanel from '../components/dashboard/DecisionPanel';
import SuppressionTimeline from '../components/dashboard/SuppressionTimeline';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Dashboard() {
  const {
    latestTelemetry: t,
    frameRecords,
    pressureHistory,
    isConnected,
  } = useTelemetryContext();

  const loading = !t;

  const fireStatus = t?.fire_detected ? 'FIRE DETECTED' : t ? 'NO FIRE' : 'WAITING';
  const fireStatusLevel = t?.fire_detected ? 'danger' : t ? 'normal' : 'offline';

  const confidence = t?.confidence != null ? (t.confidence * 100).toFixed(1) : null;
  const confStatus = t?.confidence > 0.7 ? 'danger' : t?.confidence > 0.4 ? 'warning' : 'normal';

  const distance = t?.distance_m != null ? t.distance_m.toFixed(2) : null;
  const distStatus = t?.lidar_connected ? 'normal' : 'offline';

  const pressure = t?.estimated_pressure_bar != null ? t.estimated_pressure_bar.toFixed(2) : null;
  const pressurePsi = t?.estimated_pressure_psi != null ? t.estimated_pressure_psi.toFixed(1) + ' PSI' : '';

  return (
    <div className="space-y-4 mt-2">
      {/* Status Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Fire Status"
          value={fireStatus}
          subtitle={t?.fire_detected ? 'Immediate attention required' : 'Environment is safe'}
          icon={Flame}
          status={fireStatusLevel}
          loading={loading}
        />
        <StatusCard
          title="AI Confidence"
          value={confidence}
          unit="%"
          subtitle="YOLO detection confidence"
          icon={Brain}
          status={loading ? 'offline' : confStatus}
          loading={loading}
        />
        <StatusCard
          title="Fire Distance"
          value={distance}
          unit="m"
          subtitle={t?.lidar_connected ? 'LiDAR measurement active' : 'Sensor disconnected'}
          icon={Ruler}
          status={loading ? 'offline' : distStatus}
          loading={loading}
        />
        <StatusCard
          title="Est. Pressure"
          value={pressure}
          unit="bar"
          subtitle={pressurePsi || 'Awaiting distance data'}
          icon={Gauge}
          status={loading ? 'offline' : (pressure ? 'warning' : 'offline')}
          loading={loading}
        />
      </div>

      {/* Camera + Frame Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <CameraFeed telemetry={t} />
        </div>
        <div className="lg:col-span-2">
          <FrameAnalysis frameRecords={frameRecords} latestTelemetry={t} />
        </div>
      </div>

      {/* Sensors + Decision Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SensorMonitor telemetry={t} />
        <DecisionPanel telemetry={t} />
      </div>

      {/* Pressure Panel */}
      <PressurePanel telemetry={t} pressureHistory={pressureHistory} />

      {/* Suppression Timeline */}
      <SuppressionTimeline telemetry={t} />
    </div>
  );
}

