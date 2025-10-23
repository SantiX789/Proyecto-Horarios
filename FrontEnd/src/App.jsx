// frontend/src/App.jsx (Refactorizado con <Tabs> de Bootstrap)

import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 1. Importamos los componentes de Pestañas
import { Tabs, Tab, Container } from 'react-bootstrap';

// 2. Importamos todos tus "cuadros" (componentes)
import TablaHorario from './components/TablaHorario';
import PanelAdmin from './components/PanelAdmin';
import GestionCursos from './components/GestionCursos';
import GestionMaterias from './components/GestionMaterias';
import GestionProfesores from './components/GestionProfesores';
import GestionRequisitos from './components/GestionRequisitos';
import GeneradorHorario from './components/GeneradorHorario'; 

const API_URL = "http://127.0.0.1:8000";

function App() {
  // --- Estados de la App ---
  const [curso, setCurso] = useState(""); // Para el visualizador
  const [listaCursos, setListaCursos] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 3. Ya NO necesitamos el estado [pestañaActiva]

  // --- Funciones de Carga ---
  function handleDatosCambiados() {
    setRefreshKey(key => key + 1);
  }

  async function cargarCursosApp() {
    try {
      const response = await fetch(`${API_URL}/api/cursos`);
      const data = await response.json();
      setListaCursos(data);
    } catch (error) {
      console.error("Error cargando cursos en App:", error);
    }
  }

  useEffect(() => {
    cargarCursosApp();
  }, [refreshKey]);

  // --- Renderizado de la App ---
  return (
    // Usamos el <Container> de Bootstrap para centrar y alinear todo
    <Container className="mt-4 mb-4">
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      
      <h2 className="mb-4">Proyecto Horarios</h2>

      {/* 4. ¡Reemplazamos todo el código de pestañas por esto! */}
      <Tabs defaultActiveKey="configuracion" id="app-tabs" className="mb-3" fill>
        
        {/* --- PESTAÑA 1: CONFIGURACIÓN --- */}
        <Tab eventKey="configuracion" title="1. Configuración (Datos Maestros)">
          <div className="p-3 border border-top-0 rounded-bottom">
            <h3>Paneles de Gestión</h3>
            <p>Aquí cargas todos los datos base antes de generar un horario.</p>
            
            {/* Usamos un div simple para agrupar, podrías usar <Row> y <Col> de Bootstrap */}
            <div className="d-flex justify-content-around flex-wrap gap-3 mb-3">
              <GestionCursos refreshKey={refreshKey} />
              {/* Aquí irá GestionMaterias refactorizado */}
              { <GestionMaterias refreshKey={refreshKey} /> }
            </div>
            {/* <GestionRequisitos 
              refreshKey={refreshKey} 
              onDatosCambiados={handleDatosCambiados} 
            />
            <GestionProfesores onDatosCambiados={handleDatosCambiados} /> */}
          </div>
        </Tab>

        {/* --- PESTAÑA 2: GENERADOR --- */}
        <Tab eventKey="generador" title="2. Generador (Cuadro 3)">
          <div className="p-3 border border-top-0 rounded-bottom">
            {/* <GeneradorHorario 
              refreshKey={refreshKey} 
              onDatosCambiados={handleDatosCambiados} 
            /> */}
          </div>
        </Tab>

        {/* --- PESTAÑA 3: VISUALIZAR HORARIOS --- */}
        <Tab eventKey="visualizar" title="3. Visualizar Horarios (Cuadro 4)">
          <div className="p-3 border border-top-0 rounded-bottom">
            <h3>Visualizador de Horarios</h3>
            
            {/* Aquí irá el selector de curso refactorizado */}
            <label htmlFor="curso-select">Ver Horario del Curso:</label>
            <select 
              id="curso-select"
              value={curso} 
              onChange={ (e) => setCurso(e.target.value) }
            >
              <option value="">-- Seleccione un curso --</option>
              {listaCursos.map(c => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
            
            {/* <TablaHorario 
              curso={curso} 
              refreshKey={refreshKey} 
            />
            <PanelAdmin 
              curso={curso} 
              onDatosCambiados={handleDatosCambiados} 
              refreshKey={refreshKey}
            /> */}
          </div>
        </Tab>
      
      </Tabs>
      
    </Container>
  )
}

export default App;