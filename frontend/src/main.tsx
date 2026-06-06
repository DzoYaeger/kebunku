import React from 'react';
import { createRoot } from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';

/* Ionic core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/text-alignment.css';

/* Theme + Tailwind */
import './theme/variables.css';
import './index.css';

import App from './App';

setupIonicReact({ mode: 'ios' });

const container = document.getElementById('root');
if (!container) throw new Error('Root element tidak ditemukan');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
