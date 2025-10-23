import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


import { Tabs, Tab, Container, Form } from 'react-bootstrap'; 



import TablaHorario from './components/TablaHorario';
import PanelAdmin from './components/PanelAdmin';
import GestionCursos from './components/GestionCursos';
import GestionMaterias from './components/GestionMaterias';
import GestionProfesores from './components/GestionProfesores';
import GestionRequisitos from './components/GestionRequisitos';
import GeneradorHorario from './components/GeneradorHorario';

const API_URL = "http://127.0.0.1:8000";

function App() {
  
  const [curso, setCurso] = useState(""); 
  const [listaCursos, setListaCursos] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  

  
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

  
  return (
   
    <Container className="mt-4 mb-4">
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />

      <h2 className="mb-4">Proyecto Horarios</h2>

      
      <Tabs defaultActiveKey="configuracion" id="app-tabs" className="mb-3" fill>

      


<Tab eventKey="configuracion" title="1. Datos de los Profesores">
  <div className="p-3 border border-top-0 rounded-bottom">
    <h3>Paneles de Gestión</h3>
    <p>Aquí cargas todos los datos base antes de generar un horario.</p>
    
    

    
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


        {}
        <Tab eventKey="generador" title="2. Generador">
          <div className="p-3 border border-top-0 rounded-bottom">
            {<GeneradorHorario
              refreshKey={refreshKey}
              onDatosCambiados={handleDatosCambiados}
            />}
          </div>
        </Tab>
        
        <Tab eventKey="visualizar" title="3. Visualizar Horarios">

          
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
            />
            <PanelAdmin
              curso={curso}
              onDatosCambiados={handleDatosCambiados}
              refreshKey={refreshKey} 
            />
          </div>
          

        </Tab>


      </Tabs>

    </Container>
  )
}

export default App;