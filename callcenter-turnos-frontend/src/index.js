import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Asegúrate de haber creado este archivo en src
import App from './components/App'; // Corrige el nombre de la carpeta

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// reportWebVitals eliminado porque no se está usando
