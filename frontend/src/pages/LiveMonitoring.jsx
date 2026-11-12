import { Flame, Brain, Ruler, Gauge, Activity, Wind, Cpu, Camera as CameraIcon } from 'lucide-react';
import { useTelemetryContext } from '../components/layout/Layout';
import CameraFeed from '../components/dashboard/CameraFeed';
import StatusIndicator from '../components/common/StatusIndicator';

function TelemetryValue({ label, value, unit, icon: Icon, status }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#252b3b] border border-[#2a3142]">
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${
        status === 'danger' ? 'text-red-400' : status === 'warning' ? 'text-orange-400' : 'text-gray-400'
      }`} />}
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-mono font-bold text-white tabular-nums truncate">{value ?? '—'}</span>
          {unit && <span className="text-[10px] text-gray-400">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function SensorBadge({ name, connected, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#252b3b] border border-[#2a3142]">
      <Icon className={`w-3.5 h-3.5 ${connected ? 'text-green-400' : 'text-red-400'}`} />
      <span className="text-xs text-gray-300 flex-1">{name}</span>
      <StatusIndicator status={connected ? 'normal' : 'danger'} size="sm" />
    </div>
  );
}

export default function LiveMonitoring() {
  const { latestTelemetry: t, frameRecords } = useTelemetryContext();

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-orange-400" />
        <h1 className="text-lg font-bold text-white">Live Monitoring</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Camera - Large */}
        <div className="lg:col-span-3">
          <CameraFeed telemetry={t} />
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1 space-y-3">
          {/* Current Readings */}
          <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Current Telemetry
            </p>
            <div className="space-y-2">
              <TelemetryValue
                label="Fire Status"
                value={t?.fire_detected ? '🔥 FIRE' : '✓ CLEAR'}
                icon={Flame}
                status={t?.fire_detected ? 'danger' : 'normal'}
              />
              <TelemetryValue
                label="Confidence"
                value={t?.confidence != null ? (t.confidence * 100).toFixed(1) : null}
                unit="%"
                icon={Brain}
                status={t?.confidence > 0.7 ? 'danger' : 'normal'}
              />
              <TelemetryValue
                label="Distance"
                value={t?.distance_m != null ? t.distance_m.toFixed(2) : null}
                unit="m"
                icon={Ruler}
              />
              <TelemetryValue
                label="Pressure (Est.)"
                value={t?.estimated_pressure_bar != null ? t.estimated_pressure_bar.toFixed(2) : null}
                unit="bar"
                icon={Gauge}
                status="warning"
              />
              <TelemetryValue
                label="Smoke"
                value={t?.smoke_triggered ? 'TRIGGERED' : 'Normal'}
                icon={Wind}
                status={t?.smoke_triggered ? 'warning' : 'normal'}
              />
              <TelemetryValue
                label="System State"
                value={t?.system_state ?? 'UNKNOWN'}
                icon={Cpu}
              />
            </div>
          </div>

          {/* Sensor Status */}
          <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Sensors
            </p>
            <div className="space-y-2">
              <SensorBadge name="Camera" connected={t?.camera_connected ?? false} icon={CameraIcon} />
              <SensorBadge name="Smoke Sensor" connected={t?.smoke_sensor_connected ?? false} icon={Wind} />
              <SensorBadge name="LiDAR" connected={t?.lidar_connected ?? false} icon={Ruler} />
              <SensorBadge name="Arduino" connected={t?.arduino_connected ?? false} icon={Cpu} />
            </div>
          </div>

          {/* Recent Frames */}
          <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Recent Frames
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {frameRecords.slice(-15).reverse().map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${r.fire_detected ? 'bg-red-500/5' : ''}`}>
                  <span className="font-mono text-gray-500 w-10">#{r.frame_id}</span>
                  <span className={`font-semibold w-10 ${r.fire_detected ? 'text-red-400' : 'text-green-400'}`}>
                    {r.fire_detected ? 'FIRE' : 'CLEAR'}
                  </span>
                  <span className="font-mono text-gray-400">{(r.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
              {frameRecords.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">No frame data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

