import Navbar from './Navbar';
import useTelemetry from '../../hooks/useTelemetry';
import { createContext, useContext } from 'react';

const TelemetryContext = createContext(null);

export function useTelemetryContext() {
  return useContext(TelemetryContext);
}

export default function Layout({ children }) {
  const telemetryData = useTelemetry();

  return (
    <TelemetryContext.Provider value={telemetryData}>
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar isConnected={telemetryData.isConnected} demoMode={telemetryData.demoMode} />
        <main className="pt-16 pb-8 px-4 max-w-[1920px] mx-auto">
          {children}
        </main>
      </div>
    </TelemetryContext.Provider>
  );
}

