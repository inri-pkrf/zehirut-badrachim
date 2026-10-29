import React from 'react';
import { createRoot } from 'react-dom/client';

// פונטים מותקנים מקומית (עובדים גם בלי אינטרנט)
import '@fontsource/karantina/300.css';
import '@fontsource/karantina/400.css';
import '@fontsource/karantina/700.css';
import '@fontsource/assistant/400.css';
import '@fontsource/assistant/600.css';
import '@fontsource/assistant/700.css';
import '@fontsource/assistant/800.css';

import './styles.css';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
