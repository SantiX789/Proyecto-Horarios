// frontend/src/App.jsx

import { useState, useEffect } from 'react';
import { apiFetch } from './apiService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

const API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "proyecto_horarios_token";

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || null);
  const [authMode, setAuthMode] = useState('login'); // 'login' o 'register'
  const [curso, setCurso] = useState("");
  const [listaCursos, setListaCursos] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDatosCambiados() {
    setRefreshKey(key => key + 1);
  }

  async function cargarCursosApp() {
    if (!token) return;
    try {
      const data = await apiFetch('/api/cursos');
      setListaCursos(data);
    } catch (error) {
      console.error("Error cargando cursos en App:", error);
    }
  }

  useEffect(() => {
    cargarCursosApp();
  }, [refreshKey, token]);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    toast.info("Has cerrado sesión.");
  };

  // --- RENDERIZADO CONDICIONAL ---

  // Si NO hay token...
  if (!token) {
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

  // Si SÍ hay token, mostramos la app
  return (
    <Container className="mt-4 mb-4">
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Proyecto Horarios</h2>
        <Button variant="outline-danger" onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </div>
      <Tabs defaultActiveKey="configuracion" id="app-tabs" className="mb-3" fill>

        {/* --- PESTAÑA 1: CONFIGURACIÓN --- */}
        <Tab eventKey="configuracion" title="1. Configuración (Datos Maestros)">
          <div className="p-3 border border-top-0 rounded-bottom">
            <h3>Paneles de Gestión</h3>
            <p>Aquí cargas todos los datos base antes de generar un horario.</p>

            {/* El orden que pediste */}
            <GestionProfesores onDatosCambiados={handleDatosCambiados} />

            <div className="d-flex justify-content-around flex-wrap gap-3 my-3">
              <GestionCursos refreshKey={refreshKey} />
              <GestionMaterias refreshKey={refreshKey} />
            </div>

            <GestionRequisitos
              refreshKey={refreshKey}
              onDatosCambiados={handleDatosCambiados}
            />
          </div>
        </Tab>

        {/* --- PESTAÑA 2: GENERADOR --- */}
        <Tab eventKey="generador" title="2. Generador (Cuadro 3)">
          <div className="p-3 border border-top-0 rounded-bottom">
            <GeneradorHorario
              refreshKey={refreshKey}
              onDatosCambiados={handleDatosCambiados}
            />
          </div>
        </Tab>

        {/* --- PESTAÑA 3: VISUALIZAR HORARIOS --- */}
      <Tab eventKey="visualizar" title="3. Visualizar Horarios (Cuadro 4)">
        <div className="p-3 border border-top-0 rounded-bottom">
          <h3>Visualizador de Horarios</h3>

          {/* 1. PONEMOS EL SELECTOR PRIMERO */}
          <Form.Group controlId="curso-select-visualizador" className="mb-3">
            <Form.Label>Ver Horario del Curso:</Form.Label>
            <Form.Select
              value={curso}
              onChange={(e) => setCurso(e.target.value)}
            >
              <option value="">-- Seleccione un curso --</option>
              {listaCursos.map(c => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* 2. LUEGO LA TABLA (UNA SOLA VEZ) */}
          <TablaHorario
            curso={curso}
            refreshKey={refreshKey}
            onDatosCambiados={handleDatosCambiados} // Pasamos la prop necesaria
          />

          {/* 3. Y FINALMENTE EL PANEL ADMIN (UNA SOLA VEZ) */}
          <PanelAdmin
            curso={curso}
            onDatosCambiados={handleDatosCambiados}
          />

        </div>
      </Tab>

      </Tabs>

    </Container>
  )
}

export default App;