import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import PanelAdmin from './components/PanelAdmin';
import PanelProfesor from './components/PanelProfesor'; // <--- USAMOS TU PANEL
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('proyecto_horarios_token')); // Usamos las keys que pusiste en Login
  const [role, setRole] = useState(localStorage.getItem('proyecto_horarios_role'));
  const [user, setUser] = useState(localStorage.getItem('proyecto_horarios_user')); // Guardamos el nombre de usuario

  useEffect(() => {
    // Sincronizar estado con LocalStorage al cargar
    const storedToken = localStorage.getItem('proyecto_horarios_token');
    const storedRole = localStorage.getItem('proyecto_horarios_role');
    const storedUser = localStorage.getItem('proyecto_horarios_user');

    if (storedToken) {
        setToken(storedToken);
        setRole(storedRole);
        setUser(storedUser);
    }
  }, []);

  const handleLogin = (newRole, newUsername) => {
    // Actualizamos el estado cuando el Login nos avisa
    setToken(localStorage.getItem('proyecto_horarios_token'));
    setRole(newRole);
    setUser(newUsername);
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    setUser(null);
    localStorage.removeItem('proyecto_horarios_token');
    localStorage.removeItem('proyecto_horarios_role');
    localStorage.removeItem('proyecto_horarios_user');
    window.location.reload();
  };

  // --- LÓGICA DE RUTAS ---
  let content;
  if (!token) {
    content = <Login onLogin={handleLogin} />;
  } else {
    // Si es Admin, va al Panel completo
    if (role === 'admin') {
        content = <PanelAdmin onLogout={handleLogout} />;
    } 
    // Si es Profesor, va a TU PANEL PROFESOR
    else if (role === 'profesor') {
        content = <PanelProfesor onLogout={handleLogout} currentUser={user} />;
    } 
    // Por defecto logout
    else {
        handleLogout();
        content = null;
    }
  }

  return (
    <ThemeProvider>
      {content}
      <ToastContainer position="bottom-right" autoClose={3000} />
    </ThemeProvider>
  );
}

export default App;