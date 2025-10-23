import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // <-- Importa tu componente App
import './index.css'

// 1. Importa el CSS de Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';

// 2. Importa el CSS de Toastify
import 'react-toastify/dist/ReactToastify.css';

// 3. Renderiza el componente <App />
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)