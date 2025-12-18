// FrontEnd/src/components/PanelAdmin.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

// Importamos tus componentes (asegúrate de que las rutas estén bien)
import GestionProfesores from './GestionProfesores';
import GestionMaterias from './GestionMaterias';
import GestionCursos from './GestionCursos';
import GestionAulas from './GestionAulas';
import GestionRequisitos from './GestionRequisitos';
import GeneradorHorario from './GeneradorHorario';
import TablaHorario from './TablaHorario';
import GestionPreferencias from './GestionPreferencias';
import ReporteCargaHoraria from './ReporteCargaHoraria';
import Configuracion from './Configuracion';
import BuscadorSuplentes from './BuscadorSuplentes';

function PanelAdmin() {
  // Estado para la navegación principal (Datos, Generador, Grilla)
  const [activeView, setActiveView] = useState('datos'); 
  // Estado para el Stepper dentro de Datos Maestros
  const [activeStep, setActiveStep] = useState(1);
  
  const [refreshKey, setRefreshKey] = useState(0); 
  const [horariosPublicados, setHorariosPublicados] = useState(false); 
  const navigate = useNavigate();

  useEffect(() => {
    async function checkStatus() {
      try {
        const data = await apiFetch('/api/config/publicacion-status');
        setHorariosPublicados(data.publicado);
      } catch (error) {
        console.error(error);
      }
    }
    checkStatus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('proyecto_horarios_token');
    localStorage.removeItem('user_role');
    window.location.href = '/'; 
  };

  const handleDatosCambiados = () => {
    setRefreshKey(old => old + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {/* --- 1. NAVBAR SUPERIOR (DISEÑO TEAL) --- */}
      <nav className="navbar-custom">
        <div className="logo">
          <i className="fa-solid fa-shapes"></i> Cronos
        </div>
        
        <div className="nav-links">
          <button 
            className={`nav-btn ${activeView === 'datos' ? 'active' : ''}`} 
            onClick={() => setActiveView('datos')}
          >
            <i className="fa-solid fa-database"></i> Datos Maestros
          </button>
          
          <button 
            className={`nav-btn ${activeView === 'generador' ? 'active' : ''}`} 
            onClick={() => setActiveView('generador')}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> Asignación
          </button>
          
          <button 
            className={`nav-btn ${activeView === 'horarios' ? 'active' : ''}`} 
            onClick={() => setActiveView('horarios')}
          >
            <i className="fa-regular fa-calendar-days"></i> Grilla Final
          </button>

           <button 
            className={`nav-btn ${activeView === 'herramientas' ? 'active' : ''}`} 
            onClick={() => setActiveView('herramientas')}
          >
            <i className="fa-solid fa-toolbox"></i> Herramientas
          </button>
        </div>

        <div className="user-pill" onClick={handleLogout}>
          <span>Admin</span>
          <i className="fa-solid fa-right-from-bracket" style={{ color: 'var(--danger)' }}></i>
        </div>
      </nav>


      {/* --- 2. CONTENEDOR PRINCIPAL --- */}
      <main className="main-container">
        
        {/* VISTA 1: DATOS MAESTROS (Con Stepper) */}
        {activeView === 'datos' && (
          <section>
            <div className="header-section">
              <div>
                <h1 className="page-title">Configuración Académica</h1>
                <p className="page-desc">Carga la estructura de la escuela paso a paso.</p>
              </div>
              <button className="btn-teal btn-sm" onClick={handleDatosCambiados}>
                <i className="fa-solid fa-arrows-rotate"></i> Refrescar
              </button>
            </div>

            {/* STEPPER HORIZONTAL */}
            <div className="stepper-row">
              <div className={`step-card ${activeStep === 1 ? 'active' : ''}`} onClick={() => setActiveStep(1)}>
                <span className="step-num">01</span><span className="step-title">Profesores</span>
              </div>
              <div className={`step-card ${activeStep === 2 ? 'active' : ''}`} onClick={() => setActiveStep(2)}>
                <span className="step-num">02</span><span className="step-title">Cursos</span>
              </div>
              <div className={`step-card ${activeStep === 3 ? 'active' : ''}`} onClick={() => setActiveStep(3)}>
                <span className="step-num">03</span><span className="step-title">Mat. & Aulas</span>
              </div>
              <div className={`step-card ${activeStep === 4 ? 'active' : ''}`} onClick={() => setActiveStep(4)}>
                <span className="step-num">04</span><span className="step-title">Relaciones</span>
              </div>
            </div>

            {/* CONTENIDO DE LOS PASOS */}
            <div>
                {activeStep === 1 && <GestionProfesores refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} />}
                {activeStep === 2 && <GestionCursos refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} />}
                {activeStep === 3 && (
                    <div className="row">
                        <div className="col-md-6"><GestionMaterias refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} /></div>
                        <div className="col-md-6"><GestionAulas refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} /></div>
                    </div>
                )}
                {activeStep === 4 && <GestionRequisitos refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} />}
            </div>
          </section>
        )}


        {/* VISTA 2: GENERADOR */}
        {activeView === 'generador' && (
           <section>
              <div className="header-section">
                <div>
                   <h1 className="page-title">Motor de Asignación</h1>
                   <p className="page-desc">Algoritmo inteligente de generación de horarios.</p>
                </div>
              </div>
              <GeneradorHorario refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} />
           </section>
        )}


        {/* VISTA 3: GRILLA FINAL */}
        {activeView === 'horarios' && (
           <section>
              <div className="header-section">
                <div>
                   <h1 className="page-title">Grilla de Horarios</h1>
                   <p className="page-desc">Visualiza, exporta y comparte los resultados.</p>
                </div>
                
                {/* --- AQUÍ ESTÁ EL NUEVO BOTÓN --- */}
                <button className="btn-teal btn-sm" onClick={handleDatosCambiados}>
                   <i className="fa-solid fa-arrows-rotate"></i> Actualizar Tabla
                </button>
              </div>
              
              {/* Le pasamos refreshKey para que reaccione al botón */}
              <TablaHorario refreshKey={refreshKey} onDatosCambiados={handleDatosCambiados} userRole="admin"/>
           </section>
        )}

        {/* VISTA 4: HERRAMIENTAS */}
        {activeView === 'herramientas' && (
           <section>
              <div className="header-section">
                <div>
                   <h1 className="page-title">Herramientas & Configuración</h1>
                   <p className="page-desc">Utilidades extra y mantenimiento del sistema.</p>
                </div>
              </div>
              
              <div className="d-flex flex-column gap-4">
                 <div className="card-custom">
                    <h5 className="mb-3 text-secondary">🔎 Buscador de Suplentes</h5>
                    <BuscadorSuplentes />
                 </div>
                 
                 <div className="card-custom">
                    <h5 className="mb-3 text-secondary">⚙️ Mantenimiento</h5>
                    <Configuracion />
                 </div>

                 <div className="card-custom">
                    <h5 className="mb-3 text-secondary">🍽️ Preferencias</h5>
                    <GestionPreferencias refreshKey={refreshKey} />
                 </div>

                 <div className="card-custom">
                    <h5 className="mb-3 text-secondary">📊 Reportes</h5>
                    <ReporteCargaHoraria refreshKey={refreshKey} />
                 </div>
              </div>
           </section>
        )}

      </main>
    </div>
  );
}

export default PanelAdmin;