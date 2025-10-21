import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 👇 ¡CAMBIA ESTA LÍNEA! 👇
import './App.css'; // Asegúrate de que apunte a App.css
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);