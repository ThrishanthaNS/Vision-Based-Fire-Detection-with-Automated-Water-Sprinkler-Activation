import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Camera, Brain, Cpu, Gauge, Save, CheckCircle, AlertCircle, Radio } from 'lucide-react';
import { getSettings, updateSettings, toggleDemoMode } from '../services/api';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a3142]">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-200">{title}</span>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ label, description, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="text-xs font-medium text-gray-300 block mb-1">{label}</label>
      {description && <p className="text-[10px] text-gray-500 mb-1.5">{description}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg bg-[#252b3b] border border-[#2a3142] text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
    />
  );
}

function NumberInput({ value, onChange, min, max, step = '0.01' }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 rounded-lg bg-[#252b3b] border border-[#2a3142] text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-[#252b3b] border border-[#2a3142] text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${checked ? 'bg-orange-500' : 'bg-[#252b3b] border border-[#2a3142]'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );
}

export default function Settings() {
  const [form, setForm] = useState({
    camera_url: 'http://192.168.1.100:8080/video',
    model_path: 'best.pt',
    confidence_threshold: 0.5,
    arduino_port: 'COM3',
    baud_rate: '9600',
    demo_mode: true,
    pressure_params: {
      base: 1.0,
      factor: 5.0,
      min_pressure: 1.0,
      max_pressure: 12.0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    getSettings()
      .then(data => {
        setForm(prev => ({
          ...prev,
          camera_url: data.camera_url ?? prev.camera_url,
          model_path: data.model_path ?? prev.model_path,
          confidence_threshold: data.confidence_threshold ?? prev.confidence_threshold,
          arduino_port: data.arduino_port ?? prev.arduino_port,
          baud_rate: String(data.baud_rate ?? prev.baud_rate),
          demo_mode: data.demo_mode ?? prev.demo_mode,
          pressure_params: {
            base: data.pressure_params?.base ?? prev.pressure_params.base,
            factor: data.pressure_params?.factor ?? prev.pressure_params.factor,
            min_pressure: data.pressure_params?.min_pressure ?? prev.pressure_params.min_pressure,
            max_pressure: data.pressure_params?.max_pressure ?? prev.pressure_params.max_pressure,
          },
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const setPressure = (field, value) => setForm(prev => ({
    ...prev,
    pressure_params: { ...prev.pressure_params, [field]: value },
  }));

  const showNotif = (type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        camera_url: form.camera_url,
        model_path: form.model_path,
        confidence_threshold: parseFloat(form.confidence_threshold),
        arduino_port: form.arduino_port,
        baud_rate: parseInt(form.baud_rate, 10),
        demo_mode: form.demo_mode,
        pressure_params: form.pressure_params,
      });
      showNotif('success', 'Settings saved successfully');
    } catch (e) {
      showNotif('error', 'Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDemoToggle = async () => {
    try {
      const res = await toggleDemoMode();
      setField('demo_mode', res.demo_mode);
      showNotif('success', `Demo mode ${res.demo_mode ? 'enabled' : 'disabled'}`);
    } catch (e) {
      showNotif('error', 'Failed to toggle demo mode');
    }
  };

  if (loading) {
    return (
      <div className="mt-2 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-gray-400" />
          <h1 className="text-lg font-bold text-white">System Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border animate-slide-in ${
          notification.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-xs">{notification.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Camera Settings */}
        <Section title="Camera Settings" icon={Camera}>
          <FieldGroup label="IP Camera Stream URL" description="RTSP or HTTP stream URL from your IP camera">
            <TextInput
              value={form.camera_url}
              onChange={v => setField('camera_url', v)}
              placeholder="http://192.168.1.100:8080/video"
            />
          </FieldGroup>
        </Section>

        {/* AI Model */}
        <Section title="AI Detection Model" icon={Brain}>
          <FieldGroup label="YOLO Model Path" description="Path to your best.pt YOLO model file">
            <TextInput
              value={form.model_path}
              onChange={v => setField('model_path', v)}
              placeholder="best.pt"
            />
          </FieldGroup>
          <FieldGroup label={`Detection Confidence Threshold: ${(form.confidence_threshold * 100).toFixed(0)}%`}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={form.confidence_threshold}
              onChange={e => setField('confidence_threshold', parseFloat(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0% (Sensitive)</span>
              <span>100% (Strict)</span>
            </div>
          </FieldGroup>
        </Section>

        {/* Hardware */}
        <Section title="Hardware / Arduino" icon={Cpu}>
          <FieldGroup label="Arduino COM Port" description="Serial port for Arduino Nano (Windows: COM3, Linux: /dev/ttyUSB0)">
            <TextInput
              value={form.arduino_port}
              onChange={v => setField('arduino_port', v)}
              placeholder="COM3"
            />
          </FieldGroup>
          <FieldGroup label="Baud Rate">
            <SelectInput
              value={form.baud_rate}
              onChange={v => setField('baud_rate', v)}
              options={[
                { value: '9600', label: '9600 baud' },
                { value: '19200', label: '19200 baud' },
                { value: '38400', label: '38400 baud' },
                { value: '57600', label: '57600 baud' },
                { value: '115200', label: '115200 baud' },
              ]}
            />
          </FieldGroup>
        </Section>

        {/* Pressure Calculation */}
        <Section title="Pressure Calculation Parameters" icon={Gauge}>
          <p className="text-[10px] text-yellow-400/70 bg-yellow-500/5 border border-yellow-500/10 rounded px-2 py-1.5 mb-3">
            ⚠️ Placeholder formula: pressure = base + (factor / distance). Replace with calibrated engineering formula.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Base Pressure (bar)">
              <NumberInput value={form.pressure_params.base} onChange={v => setPressure('base', v)} min="0" max="20" />
            </FieldGroup>
            <FieldGroup label="Distance Factor">
              <NumberInput value={form.pressure_params.factor} onChange={v => setPressure('factor', v)} min="0" max="100" />
            </FieldGroup>
            <FieldGroup label="Min Pressure (bar)">
              <NumberInput value={form.pressure_params.min_pressure} onChange={v => setPressure('min_pressure', v)} min="0" max="20" />
            </FieldGroup>
            <FieldGroup label="Max Pressure (bar)">
              <NumberInput value={form.pressure_params.max_pressure} onChange={v => setPressure('max_pressure', v)} min="0" max="50" />
            </FieldGroup>
          </div>
        </Section>

        {/* System */}
        <Section title="System Mode" icon={Radio}>
          <FieldGroup
            label="Demo Mode"
            description="Enable demo mode to simulate sensor readings without real hardware. Demo values are clearly labelled and never presented as real measurements."
          >
            <ToggleSwitch
              checked={form.demo_mode}
              onChange={v => { setField('demo_mode', v); handleDemoToggle(); }}
              label={form.demo_mode ? 'Demo mode active — simulated data' : 'Live mode — real hardware required'}
            />
          </FieldGroup>
        </Section>
      </div>

      {/* Save Button Bottom */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

