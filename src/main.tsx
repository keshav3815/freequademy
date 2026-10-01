import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { installGlobalErrorHandlers } from './lib/monitoring.ts'
import { startWebVitals } from './lib/telemetry/vitals.ts'

installGlobalErrorHandlers();
startWebVitals();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
