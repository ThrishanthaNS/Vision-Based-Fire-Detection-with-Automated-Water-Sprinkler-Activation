import { Camera, Wind, Ruler, Cpu } from 'lucide-react';
import StatusIndicator from '../common/StatusIndicator';

function SensorCard({ icon: Icon, name, connected, primaryValue, primaryUnit, secondaryInfo, statusLabel, accentColor }) {
  return (
    <div className="bg-[#252b3b] rounded-lg border border-[#2a3142] p-4 hover:border-[#3a4256] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${connected ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
            <Icon className={`w-4 h-4 ${connected ? accentColor : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-200">{name}</p>
            <p className={`text-[10px] ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {statusLabel || (connected ? 'Connected' : 'Disconnected')}
            </p>
          </div>
        </div>
        <StatusIndicator status={connected ? 'normal' : 'danger'} size="sm" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-mono font-bold text-white tabular-nums">
          {primaryValue ?? '—'}
        </span>
        {primaryUnit && (
          <span className="text-xs text-gray-400">{primaryUnit}</span>
        )}
      </div>
      {secondaryInfo && (
        <p className="text-[10px] text-gray-500 mt-1">{secondaryInfo}</p>
      )}
    </div>
  );
}

export default function SensorMonitor({ telemetry }) {
  const t = telemetry;

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          Sensor Status
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SensorCard
          icon={Camera}
          name="Camera"
          connected={t?.camera_connected ?? false}
          primaryValue={t?.fps != null ? t.fps.toFixed(1) : null}
          primaryUnit="FPS"
          secondaryInfo={t?.camera_connected ? 'IP Camera Active' : 'No camera feed'}
          accentColor="text-blue-400"
        />

        <SensorCard
          icon={Wind}
          name="Smoke Sensor"
          connected={t?.smoke_sensor_connected ?? false}
          primaryValue={t?.smoke_triggered ? 'TRIGGERED' : 'Normal'}
          statusLabel={t?.smoke_triggered ? 'Alert' : (t?.smoke_sensor_connected ? 'Connected' : 'Disconnected')}
          secondaryInfo={t?.smoke_sensor_connected ? 'MQ-2 Sensor Active' : 'Awaiting connection'}
          accentColor="text-orange-400"
        />

        <SensorCard
          icon={Ruler}
          name="LiDAR"
          connected={t?.lidar_connected ?? false}
          primaryValue={t?.distance_m != null ? t.distance_m.toFixed(2) : null}
          primaryUnit="m"
          secondaryInfo={t?.lidar_connected ? 'TF-Luna Active' : 'No distance readings'}
          accentColor="text-purple-400"
        />

        <SensorCard
          icon={Cpu}
          name="Arduino"
          connected={t?.arduino_connected ?? false}
          primaryValue={t?.arduino_connected ? 'Online' : 'Offline'}
          secondaryInfo={t?.arduino_connected ? 'Serial Communication Active' : 'Check COM port'}
          accentColor="text-teal-400"
        />
      </div>
    </div>
  );
}

