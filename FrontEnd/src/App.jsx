// frontend/src/App.jsx

import { useState, useEffect } from 'react';
import { apiFetch } from './apiService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoEmpresa from './assets/Logo programa.jpeg';

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
import ReporteCargaHoraria from './components/ReporteCargaHoraria'; // <-- ¡AÑADIDO!
import GestionAulas from './components/GestionAulas';

const API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "proyecto_horarios_token";

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || null);
  const [authMode, setAuthMode] = useState('login');
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
  if (!token) {
    // ... (código de login/registro sin cambios)
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

      <div className="text-start mb-4">
        <img src={logoEmpresa} alt="Logo Empresa" style={{ height: '50px' }} />
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Proyecto Horarios</h2>
        <Button variant="outline-danger" onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </div>
      <Tabs defaultActiveKey="configuracion" id="app-tabs" className="mb-3" fill>

        {/* --- PESTAÑA 1: CONFIGURACIÓN --- */}
        <Tab eventKey="configuracion" title="1. Datos de los profesores">
          {/* ... (tu código de Pestaña 1 sin cambios) ... */}
          <div className="p-3 border border-top-0 rounded-bottom">
            <h3>Paneles de Gestión</h3>
            <p>Aquí cargas todos los datos base antes de generar un horario.</p>
            <GestionProfesores onDatosCambiados={handleDatosCambiados} />
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
           <GestionRequisitos
              refreshKey={refreshKey}
              onDatosCambiados={handleDatosCambiados}
            /> {/* <-- ¡AÑADE "/>" AQUÍ! */}
            
            <GestionAulas
              refreshKey={refreshKey}
              onDatosCambiados={handleDatosCambiados}
            />
            
          </div>
        </Tab>

        {/* --- PESTAÑA 2: GENERADOR --- */}
        <Tab eventKey="generador" title="2. Generador">
          {/* ... (tu código de Pestaña 2 sin cambios) ... */}
          <div className="p-3 border border-top-0 rounded-bottom">
            <GeneradorHorario
              refreshKey={refreshKey}
              onDatosCambiados={handleDatosCambiados}
            />
          </div>
        </Tab>

        {/* --- PESTAÑA 3: VISUALIZAR HORARIOS --- */}
        <Tab eventKey="visualizar" title="3. Visualizar Horarios">
          {/* ... (tu código de Pestaña 3 sin cambios) ... */}
          <div className="p-3 border border-top-0 rounded-bottom">
            <h3>Visualizador de Horarios</h3>
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
            <TablaHorario
              curso={curso}
              refreshKey={refreshKey}
              onDatosCambiados={handleDatosCambiados}
            />
            <PanelAdmin
              curso={curso}
              onDatosCambiados={handleDatosCambiados}
            />
          </div>
        </Tab>

        {/* ======================================= */}
        {/* =====>> 3. AÑADE LA NUEVA PESTAÑA AQUÍ <<===== */}
        {/* ======================================= */}
        <Tab eventKey="reportes" title="4. Reportes">
          <div className="p-3 border border-top-0 rounded-bottom">
            <h3>Panel de Reportes</h3>
            <p>Análisis y estadísticas de los horarios generados.</p>

            <ReporteCargaHoraria refreshKey={refreshKey} />

            {/* Aquí podremos añadir más reportes en el futuro */}

          </div>
        </Tab>
        {/* ======================================= */}
        {/* ========= FIN NUEVA PESTAÑA ========= */}
        {/* ======================================= */}

      </Tabs>

    </Container>
  )
}

export default App;