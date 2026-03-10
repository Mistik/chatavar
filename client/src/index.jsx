import { createRoot } from 'react-dom/client';
import { useStore } from './store/useStore';
import { bootAuth } from './utils/boot';
import App from './App';

// Run auth check ONCE before first render — resolves fast from cache on HMR
bootAuth(useStore).then(() => {
  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
});
