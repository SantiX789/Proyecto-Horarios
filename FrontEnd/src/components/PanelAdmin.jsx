import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { apiFetch } from '../apiService'; 

import GestionProfesores from './GestionProfesores';
import GestionMaterias from './GestionMaterias';
import GestionCursos from './GestionCursos';
import GestionAulas from './GestionAulas';
import GestionRequisitos from './GestionRequisitos';
import GeneradorHorario from './GeneradorHorario';
import GrillaHorarios from './GrillaHorarios';
import Herramientas from './Herramientas';
import Dashboard from './Dashboard'; // <--- Importamos el Dashboard

function PanelAdmin({ onLogout }) {
  const { theme, toggleTheme } = useTheme();

  // "inicio" será la pestaña por defecto
  const [activeTab, setActiveTab] = useState('inicio');
  const [subTab, setSubTab] = useState('profesores');
  
  // Estado para el resumen (contadores) y recarga
  const [resumen, setResumen] = useState({ profesores: 0, materias: 0, cursos: 0, aulas: 0 });
  const [refreshGrilla, setRefreshGrilla] = useState(0);

  // --- ESTADO PARA LA IDENTIDAD DEL COLEGIO ---
  const [institucion, setInstitucion] = useState({ nombre: "Cronos", logo: null });

  // Cargar resumen e identidad al iniciar
  useEffect(() => { 
      cargarResumen(); 
      cargarIdentidad(); 
  }, []);

  // Función para cargar contadores
  const cargarResumen = async () => {
    try {
      const p = await apiFetch('/api/profesores');
      const m = await apiFetch('/api/materias');
      const c = await apiFetch('/api/cursos');
      const a = await apiFetch('/api/aulas');
      setResumen({ profesores: p.length, materias: m.length, cursos: c.length, aulas: a.length });
    } catch (error) { console.error("Error cargando resumen:", error); }
  };

  // Función para cargar Logo y Nombre
  const cargarIdentidad = async () => {
    try {
        const data = await apiFetch('/api/config/institucion');
        if (data) {
            setInstitucion({
                nombre: data.nombre || "Cronos",
                logo: data.logo_base64 || null
            });
        }
    } catch (error) { console.error("Error cargando identidad:", error); }
  };

  const renderStepCard = (id, number, label, count) => {
    const isActive = subTab === id;
    return (
      <div className="col-md-3 col-6">
        <div 
            onClick={() => setSubTab(id)}
            className="p-3 border rounded-3 shadow-sm h-100 position-relative"
            style={{ 
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--primary-light, #f0fdfa)' : 'var(--card-bg, white)', 
                borderColor: isActive ? 'var(--primary, #0d9488)' : 'var(--border, #dee2e6)',
                borderWidth: isActive ? '2px' : '1px',
                transition: 'all 0.2s'
            }}
        >
            <div className="d-flex justify-content-between">
                <div className="small fw-bold mb-1" style={{color: isActive ? 'var(--primary, #0d9488)' : 'var(--text-muted, #94a3b8)'}}>
                    {number}
                </div>
                <span className="badge rounded-pill bg-light text-dark border">{count}</span>
            </div>
            
            <div className="fw-bold" style={{ color: 'var(--text-main, #212529)' }}>
                {label}
            </div>
            {isActive && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, width: '100%', 
                    height: '4px', backgroundColor: 'var(--primary, #0d9488)', 
                    borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px'
                }}></div>
            )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      // --- 1. CASO INICIO (DASHBOARD) ---
      case 'inicio':
        return <Dashboard />;

      // --- 2. CASO DATOS MAESTROS ---
      case 'datos':
        return (
          <div>
            {/* Sub-navegación interna de Datos Maestros */}
            <div className="row g-3 mb-4">
                {renderStepCard('profesores', '01', 'Profesores', resumen.profesores)}
                {renderStepCard('cursos', '02', 'Cursos', resumen.cursos)}
                {renderStepCard('materias', '03', 'Mat. & Aulas', resumen.materias)}
                {renderStepCard('requisitos', '04', 'Relaciones', '-')}
            </div>

            <div className="animate-fade-in">
                {subTab === 'profesores' && <GestionProfesores onDatosCambiados={cargarResumen} />}
                {subTab === 'cursos' && <GestionCursos onDatosCambiados={cargarResumen} />}
                {subTab === 'materias' && (
                    <div className="row">
                        <div className="col-md-6"><GestionMaterias onDatosCambiados={cargarResumen} /></div>
                        <div className="col-md-6"><GestionAulas onDatosCambiados={cargarResumen} /></div> 
                    </div>
                )}
                {subTab === 'requisitos' && <GestionRequisitos onDatosCambiados={cargarResumen} />}
            </div>
          </div>
        );

      case 'asignacion':
        return <GeneradorHorario onSuccess={() => setRefreshGrilla(prev => prev + 1)} />;

      case 'grilla':
        return <GrillaHorarios refreshKey={refreshGrilla} />;

      case 'herramientas':
        return <Herramientas />; 

      default:
        return <div>Selecciona una opción</div>;
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Navbar Principal */}
      <nav className="navbar navbar-expand-lg border-bottom shadow-sm px-4 py-3 navbar-custom">
        <div className="container-fluid">
          
          {/* BRAND CON LOGO DINÁMICO */}
          <span className="navbar-brand fw-bold d-flex align-items-center gap-2 fs-4 logo">
            {institucion.logo ? (
                <img 
                    src={institucion.logo} 
                    alt="Logo" 
                    style={{height: '40px', width: 'auto', objectFit: 'contain'}} 
                />
            ) : (
                <i className="fa-solid fa-shapes"></i>
            )}
            <span className="d-none d-sm-inline text-truncate" style={{maxWidth: '300px'}}>
                {institucion.nombre}
            </span>
          </span>
          
          {/* MENÚ DE NAVEGACIÓN (PILLS) */}
          <div className="d-flex gap-2 p-1 rounded-pill border nav-links-container" style={{background: 'var(--bg-body)'}}>
             {['inicio', 'datos', 'asignacion', 'grilla', 'herramientas'].map(tab => {
                const labels = {
                    inicio: 'Inicio',
                    datos: 'Datos Maestros',
                    asignacion: 'Asignación',
                    grilla: 'Grilla Final',
                    herramientas: 'Herramientas'
                };
                const icons = {
                    inicio: 'fa-house',
                    datos: 'fa-database',
                    asignacion: 'fa-wand-magic-sparkles',
                    grilla: 'fa-calendar-days',
                    herramientas: 'fa-toolbox'
                };
                return (
                    <button 
                        key={tab}
                        className={`btn btn-sm rounded-pill px-3 fw-bold ${activeTab === tab ? 'shadow-sm' : ''}`}
                        style={{ 
                            border: 'none',
                            backgroundColor: activeTab === tab ? 'var(--card-bg)' : 'transparent',
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)'
                        }}
                        onClick={() => setActiveTab(tab)}
                    >
                        <i className={`fa-solid ${icons[tab]} me-2`}></i> {labels[tab]}
                    </button>
                );
             })}
          </div>

          {/* CONTROLES DERECHA */}
          <div className="d-flex align-items-center gap-3">
              <button 
                onClick={toggleTheme} 
                className="btn btn-sm border rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                title={theme === 'light' ? "Activar Modo Oscuro" : "Activar Modo Claro"}
                style={{ 
                    width: '38px', height: '38px', 
                    backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderColor: 'var(--border)'
                }}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              <button className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold" onClick={onLogout}>
                Admin <i className="fa-solid fa-right-from-bracket ms-2"></i>
              </button>
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-grow-1 p-4" style={{ backgroundColor: 'var(--bg-body)' }}>
        <div className="container-fluid" style={{maxWidth: '1400px'}}>
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default PanelAdmin;