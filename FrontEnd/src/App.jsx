// frontend/src/App.jsx

import { useState, useEffect } from 'react';
import { apiFetch } from './apiService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoEmpresa from './assets/Logo programa.jpeg';
// CORRECCIÓN: Eliminamos la importación de 'jwt-decode'
// import { jwtDecode } from 'jwt-decode';

// 1. Importamos TODOS los componentes de Bootstrap
import { Tabs, Tab, Container, Form, Button } from 'react-bootstrap';

// 2. Importamos TODOS nuestros componentes
import Login from './components/Login';
import Registro from './components/Registro';
import TablaHorario from './components/TablaHorario';
import PanelAdmin from './components/PanelAdmin';
import GestionCursos from './components/GestionCursos';
import GestionMaterias from './components/GestionMaterias';
import GestionProfesores from './components/GestionProfesores';
import GestionRequisitos from './components/GestionRequisitos';
import GeneradorHorario from './components/GeneradorHorario';
import ReporteCargaHoraria from './components/ReporteCargaHoraria';
import GestionAulas from './components/GestionAulas';
import GestionPreferencias from './components/GestionPreferencias';

const API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "proyecto_horarios_token";

// CORRECCIÓN: Añadimos una función interna para parsear el JWT
// Esto reemplaza la necesidad de la librería 'jwt-decode'
const parseJwtPayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error al decodificar el token:", e);
    return null; // Token inválido o malformado
  }
};


// Función helper para decodificar (fuera del componente App)
const getRoleFromToken = (token) => {
  if (!token) return null;
  try {
    // CORRECCIÓN: Usamos nuestra función interna
    const decoded = parseJwtPayload(token);
    if (!decoded) return null; // Verificación extra
    return decoded.rol || 'admin'; // Asumir 'admin' si el rol no está
  } catch (e) {
    return null; // Token inválido
  }
};

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || null);
  const [userRole, setUserRole] = useState(() => getRoleFromToken(localStorage.getItem(TOKEN_KEY)));

  // --- Estados que faltaban en tu copia ---
  const [authMode, setAuthMode] = useState('login');
  const [curso, setCurso] = useState("");
  const [listaCursos, setListaCursos] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // --- Fin ---

  // Versión correcta de los handlers (solo debe haber una)
  const handleLoginSuccess = (newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUserRole(getRoleFromToken(newToken));
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUserRole(null); // <-- LIMPIAR ROL
    toast.info("Has cerrado sesión.");
  };

  function handleDatosCambiados() {
    setRefreshKey(key => key + 1);
  }

  async function cargarCursosApp() {
    // Solo cargar cursos si somos admin
    if (!token || userRole !== 'admin') {
      setListaCursos([]); // Asegurarse de que esté vacío si no es admin
      return;
    }
    try {
      const data = await apiFetch('/api/cursos');
      setListaCursos(data);
    } catch (error) {
      console.error("Error cargando cursos en App:", error);
    }
  }

  useEffect(() => {
    cargarCursosApp();
    // El efecto debe depender también del rol
  }, [refreshKey, token, userRole]);


  // --- Lógica de renderizado CONDICIONAL ---
  if (!token) {
    // Si NO hay token, mostramos Login o Registro
    return (
      <>
        <ToastContainer position="bottom-right" autoClose={3000} />
        {authMode === 'login' ? (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setAuthMode('register')}
          />
        ) : (
          <Registro
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}
      </>
    );
  }

  // --- Si SÍ hay token, mostramos la app principal ---
  return (
    <Container className="mt-4 mb-4">
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />

      <div className="text-start mb-4">
        <img src={logoEmpresa} alt="Logo Empresa" style={{ height: '50px' }} />
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Proyecto Horarios</h2>
        <Button variant="outline-danger" onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </div>

      {/* 3. LÓGICA CONDICIONAL PARA LAS PESTAÑAS */}
      {userRole === 'admin' ? (
        // VISTA DE ADMINISTRADOR (Tus pestañas actuales)
        <Tabs defaultActiveKey="configuracion" id="app-tabs-admin" className="mb-3" fill>
          
          <Tab eventKey="configuracion" title="1. Datos Base">
            <div className="p-3 border border-top-0 rounded-bottom">
              <h3>Paneles de Gestión</h3>
              <p>Aquí cargas todos los datos base antes de generar un horario.</p>
              <GestionProfesores refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} />
              <div className="d-flex justify-content-around flex-wrap gap-3 my-3">
                <GestionCursos
                  refreshKey={refreshKey}
                  onDatosCambiados={handleDatosCambiados}
                />
                <GestionMaterias
                  refreshKey={refreshKey}
                  onDatosCambiados={handleDatosCambiados}
                />
              </div>
              <GestionAulas
                refreshKey={refreshKey}
                onDatosCambiados={handleDatosCambiados}
              />
              <GestionRequisitos
                refreshKey={refreshKey}
                onDatosCambiados={handleDatosCambiados}
              />
              <GestionPreferencias
                refreshKey={refreshKey}
              />
            </div>
          </Tab>
          
          <Tab eventKey="generador" title="2. Generador">
            <div className="p-3 border border-top-0 rounded-bottom">
              <GeneradorHorario
                refreshKey={refreshKey}
                onDatosCambiados={handleDatosCambiados}
              />
            </div>
          </Tab>
          
          <Tab eventKey="visualizar" title="3. Visualizar Horarios (Admin)">
            <div className="p-3 border border-top-0 rounded-bottom">
              <h3>Visualizador de Horarios</h3>
              <Form.Group controlId="curso-select-visualizador" className="mb-3">
                <Form.Label>Ver Horario del Curso:</Form.Label>
                <Form.Select value={curso} onChange={(e) => setCurso(e.target.value)}>
                  <option value="">-- Seleccione un curso --</option>
                  {listaCursos.map(c => (<option key={c.id} value={c.nombre}>{c.nombre}</option>))}
                </Form.Select>
              </Form.Group>
              <TablaHorario
                curso={curso} // Pasa el curso seleccionado
                refreshKey={refreshKey}
                onDatosCambiados={handleDatosCambiados}
                userRole={userRole} // Pasar el rol
              />
              <PanelAdmin curso={curso} onDatosCambiados={handleDatosCambiados} />
            </div>
          </Tab>
          
          <Tab eventKey="reportes" title="4. Reportes">
            <div className="p-3 border border-top-0 rounded-bottom">
              <h3>Panel de Reportes</h3>
              <p>Análisis y estadísticas de los horarios generados.</p>
              <ReporteCargaHoraria refreshKey={refreshKey} />
            </div>
          </Tab>

        </Tabs>

      ) : (

        // VISTA DE PROFESOR
        <Tabs defaultActiveKey="mi-horario" id="app-tabs-profesor" className="mb-3" fill>
          <Tab eventKey="mi-horario" title="Mi Horario Personal">
            <div className="p-3 border border-top-0 rounded-bottom">
              <h3>Mi Horario Semanal</h3>
              <TablaHorario
                curso={null} // ¡Importante! Pasa null
                refreshKey={refreshKey}
                onDatosCambiados={handleDatosCambiados}
                userRole={userRole} // Pasar el rol
              />
            </div>
          </Tab>
        </Tabs>
      )}

    </Container>
  )
}

export default App;

