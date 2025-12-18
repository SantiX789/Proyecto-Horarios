// FrontEnd/src/components/PanelProfesor.jsx (DISEÑO CLEAN TEAL)
import { useState } from 'react';
import TablaHorario from './TablaHorario'; // Reutilizamos la tabla potente

function PanelProfesor() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('proyecto_horarios_token');
    localStorage.removeItem('user_role');
    window.location.href = '/'; 
  };

  const handleRefresh = () => {
    setRefreshKey(old => old + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {/* 1. NAVBAR PROFESOR */}
      <nav className="navbar-custom" style={{ borderBottomColor: 'var(--primary-light)' }}>
        <div className="logo">
          <i className="fa-solid fa-graduation-cap"></i> Portal Docente
        </div>
        
        <div className="d-flex gap-3 align-items-center">
            <span className="text-muted fw-bold d-none d-md-block" style={{fontSize: '0.9rem'}}>
                Bienvenido/a
            </span>
            <div className="user-pill" onClick={handleLogout}>
                <span>Salir</span>
                <i className="fa-solid fa-right-from-bracket" style={{ color: 'var(--danger)' }}></i>
            </div>
        </div>
      </nav>

      {/* 2. CONTENEDOR PRINCIPAL */}
      <main className="main-container">
        
        <section>
            <div className="header-section">
              <div>
                <h1 className="page-title" style={{color: 'var(--primary)'}}>Mi Cronograma</h1>
                <p className="page-desc">Aquí puedes ver tus horarios de clase asignados.</p>
              </div>
              <button className="btn-outline-custom btn-sm" onClick={handleRefresh}>
                <i className="fa-solid fa-arrows-rotate"></i> Recargar
              </button>
            </div>

            {/* TARJETA DE HORARIO */}
            <div className="card-custom" style={{ borderTop: '4px solid var(--primary)' }}>
                {/* Reutilizamos TablaHorario. 
                    Al pasar userRole="profesor", el componente ya sabe 
                    que tiene que buscar SOLO los horarios de este usuario.
                */}
                <TablaHorario refreshKey={refreshKey} userRole="profesor" />
            </div>

            {/* PEQUEÑO FOOTER INFORMATIVO */}
            <div className="text-center mt-4 text-muted small">
                <p>
                    <i className="fa-solid fa-circle-info"></i> Si encuentras un error en tu horario, por favor comunícate con Administración.
                </p>
            </div>
        </section>

      </main>
    </div>
  );
}

export default PanelProfesor;