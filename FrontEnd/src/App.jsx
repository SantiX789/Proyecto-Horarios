// FrontEnd/src/App.jsx (Corregido)
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './components/Login';
import Registro from './components/Registro';
import PanelAdmin from './components/PanelAdmin';
import TablaHorario from './components/TablaHorario';
import CambiarPassword from './components/CambiarPassword';

const ProtectedRoute = ({ isAllowed, children, redirectTo = "/" }) => {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
};

// Función auxiliar para leer rol
const getRoleFromToken = () => {
  const token = localStorage.getItem("proyecto_horarios_token");
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload).rol;
  } catch (e) {
    return null;
  }
};

function App() {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('user_role') || getRoleFromToken();
    if (role) setUserRole(role);
  }, []);

  const handleLoginSuccess = (role) => {
    setUserRole(role);
  };

  // --- AGREGAMOS ESTA FUNCIÓN QUE FALTABA ---
  const handleLogout = () => {
    localStorage.removeItem('proyecto_horarios_token');
    localStorage.removeItem('user_role');
    setUserRole(null);
    window.location.href = '/'; // Forzamos recarga para ir al login limpio
  };
  // -------------------------------------------

  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <ToastContainer position="top-right" autoClose={3000} />
        
        <Container className="py-4">
          <Routes>
            <Route path="/" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/cambiar-password" element={<CambiarPassword />} />

            <Route 
              path="/admin" 
              element={
                <ProtectedRoute isAllowed={!!userRole && userRole === 'admin'}>
                  <PanelAdmin />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/mis-horarios" 
              element={
                <ProtectedRoute isAllowed={!!userRole && (userRole === 'profesor' || userRole === 'admin')}>
                   <div className="bg-white p-4 rounded shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                          <h2 className="mb-0 text-primary">Mi Horario Personal</h2>
                          {/* Ahora sí funcionará este botón */}
                          <button className="btn btn-outline-danger" onClick={handleLogout}>
                              Cerrar Sesión
                          </button>
                      </div>
                      <TablaHorario curso={null} userRole="profesor" refreshKey={0} />
                   </div>
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;