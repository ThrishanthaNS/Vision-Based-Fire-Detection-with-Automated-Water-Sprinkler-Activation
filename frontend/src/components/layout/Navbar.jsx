import { NavLink } from 'react-router-dom';
import { Flame, LayoutDashboard, Monitor, BarChart3, History, Settings, Radio } from 'lucide-react';
import { useState, useEffect } from 'react';
import StatusIndicator from '../common/StatusIndicator';

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live', label: 'Live Monitoring', icon: Monitor },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/history', label: 'Event History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar({ isConnected, demoMode }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1419]/90 backdrop-blur-xl border-b border-[#2a3142]">
      <div className="max-w-[1920px] mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Flame className="w-7 h-7 text-orange-500" />
            <div className="absolute inset-0 w-7 h-7 text-orange-500 blur-sm opacity-50">
              <Flame className="w-7 h-7" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              FIREGUARD <span className="text-orange-500">AI</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 leading-none mt-0.5">
              Intelligent Fire Detection
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#252b3b]'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {demoMode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20">
              <Radio className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-400">Demo</span>
            </div>
          )}

          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] text-gray-500">{formattedDate}</span>
            <span className="text-xs font-mono text-gray-300 tabular-nums">{formattedTime}</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#252b3b]/50 border border-[#2a3142]">
            <StatusIndicator status={isConnected ? 'normal' : 'danger'} size="sm" />
            <span className={`text-[10px] font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

