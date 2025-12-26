import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../apiService';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import CambiarPassword from './CambiarPassword'; // Importamos el componente

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORAS = [
  "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40", "12:20",
  "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",
  "17:40", "18:20", "19:00", "19:40", "20:20", "21:00", "21:40", "22:20"
];

function PanelProfesor({ onLogout, currentUser }) {
  const [horarios, setHorarios] = useState({});
  const [tab, setTab] = useState('horario'); // 'horario' o 'cuenta'
  const grillaRef = useRef(null);

  useEffect(() => {
    cargarMisHorarios();
  }, []);

  async function cargarMisHorarios() {
    try {
      const data = await apiFetch('/api/horarios/profesor/me');
      setHorarios(data || {});
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar tus horarios.");
    }
  }

  const getCelda = (dia, hora) => {
    if (horarios[hora] && horarios[hora][dia]) {
        return horarios[hora][dia];
    }
    return null;
  };

  const handleExportar = () => {
    if (!grillaRef.current) return;
    toast.info("Generando imagen...");
    html2canvas(grillaRef.current, { scale: 2, backgroundColor: "#F4F7F6" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Mi_Horario_${currentUser}.png`;
        link.href = canvas.toDataURL();
        link.click();
        toast.success("Imagen descargada");
    });
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm px-4">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold text-teal">
            <i className="fa-solid fa-shapes me-2"></i> Cronos <span className="text-muted fw-normal fs-6">| Portal Docente</span>
          </span>
          <div className="d-flex gap-3">
             {/* BOTÓN HORARIO */}
             <button className={`btn btn-sm rounded-pill px-3 ${tab==='horario' ? 'btn-teal text-white' : 'btn-light'}`} 
                style={tab==='horario' ? {backgroundColor: '#0d9488'} : {}}
                onClick={() => setTab('horario')}>
                <i className="fa-solid fa-calendar-days me-2"></i> Mi Horario
             </button>
             
             {/* BOTÓN CUENTA (ACTIVADO) */}
             <button className={`btn btn-sm rounded-pill px-3 ${tab==='cuenta' ? 'btn-teal text-white' : 'btn-light'}`} 
                style={tab==='cuenta' ? {backgroundColor: '#0d9488'} : {}}
                onClick={() => setTab('cuenta')}>
                <i className="fa-solid fa-user-gear me-2"></i> Mi Cuenta
             </button>
          </div>
          <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={onLogout}>
            Salir <i className="fa-solid fa-right-from-bracket ms-2"></i>
          </button>
        </div>
      </nav>

      {/* CONTENIDO */}
      <div className="container py-4">
        
        {/* ENCABEZADO */}
        {tab === 'horario' && (
            <div className="d-flex justify-content-between align-items-center mb-3 animate-fade-in">
                <h3 className="fw-bold text-secondary">Hola, <span className="text-teal" style={{color: '#0d9488'}}>{currentUser}</span> 👋</h3>
                <button className="btn btn-sm text-white shadow-sm" onClick={handleExportar} style={{backgroundColor: '#0d9488'}}>
                    <i className="fa-solid fa-camera me-2"></i> Guardar Imagen
                </button>
            </div>
        )}

        {/* PESTAÑA HORARIO */}
        {tab === 'horario' ? (
             <div className="timetable-container animate-fade-in" ref={grillaRef}>
                <div className="schedule-grid">
                    <div className="sch-header time-col">HORA</div>
                    {DIAS.map(d => <div key={d} className="sch-header day-col">{d}</div>)}

                    {HORAS.map((hora) => (
                        <div key={hora} style={{ display: 'contents' }}>
                            <div className="sch-cell sch-hour">{hora}</div>
                            {DIAS.map(dia => {
                                const clase = getCelda(dia, hora);
                                return (
                                    <div key={`${dia}-${hora}`} className="sch-cell">
                                        {clase ? (
                                            <div className="class-block" style={{ 
                                                borderLeftColor: clase.color || '#0d9488',
                                                borderColor: clase.color || '#0d9488'
                                            }}>
                                                <div className="subject-text">{clase.materia}</div>
                                                <div className="profesor-text fw-bold text-dark">{clase.curso}</div>
                                                {clase.aula && (
                                                    <div className="aula-badge"><i className="fa-solid fa-location-dot"></i> {clase.aula}</div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
             </div>
        ) : (
            /* PESTAÑA CUENTA - AQUÍ CARGAMOS EL COMPONENTE DE CAMBIO DE CLAVE */
            <div className="animate-fade-in mt-4">
               <CambiarPassword />
            </div>
        )}
      </div>
    </div>
  );
}

export default PanelProfesor;