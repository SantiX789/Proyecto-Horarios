import { useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GeneradorHorario({ onDatosCambiados }) {
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const handleGenerar = async () => {
    if (!confirm("Esto borrará la grilla actual y generará una nueva propuesta. ¿Continuar?")) return;
    
    setLoading(true);
    setProgreso(10); // Iniciar barra

    try {
      // Simulación visual de progreso para que el usuario sienta que "piensa"
      const intervalo = setInterval(() => {
        setProgreso((old) => {
            if (old >= 90) return 90; // Esperar al 100% real
            return old + Math.random() * 10;
        });
      }, 300);

      // Llamada real al Backend
      await apiFetch('/api/generar_horario', { method: 'POST' });
      
      clearInterval(intervalo);
      setProgreso(100);
      
      setTimeout(() => {
        toast.success("¡Horarios Generados con Éxito!");
        setLoading(false);
        setProgreso(0);
        if (onDatosCambiados) onDatosCambiados(); // Refrescar la App
      }, 500);

    } catch (error) {
      setLoading(false);
      setProgreso(0);
      console.error(error);
      toast.error("Error en el algoritmo: " + error.message);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      
      <div className="card-custom text-center p-5 shadow-lg" style={{ maxWidth: '600px', width: '100%' }}>
        
        {/* ÍCONO ANIMADO */}
        <div className="mb-4">
            {loading ? (
                <i className="fa-solid fa-gear fa-spin" style={{ fontSize: '5rem', color: 'var(--primary)' }}></i>
            ) : (
                <i className="fa-solid fa-brain" style={{ fontSize: '5rem', color: 'var(--primary)' }}></i>
            )}
        </div>

        <h2 className="fw-bold text-dark mb-3">Motor de Asignación</h2>
        
        <p className="text-muted mb-5" style={{ fontSize: '1.1rem' }}>
            El algoritmo analizará las materias cargadas, la disponibilidad de aulas y la estructura de los cursos para generar una propuesta de horario optimizada.
        </p>

        {/* BOTÓN DE ACCIÓN */}
        {!loading ? (
            <button 
                className="btn-teal w-100 py-3 fs-5 fw-bold shadow-sm" 
                onClick={handleGenerar}
                style={{ borderRadius: '12px' }}
            >
                <i className="fa-solid fa-bolt me-2"></i> Iniciar Proceso Automático
            </button>
        ) : (
            <div className="text-start">
                <span className="small fw-bold text-primary mb-1 d-block">Procesando reglas...</span>
                <div className="progress" style={{ height: '25px', borderRadius: '12px' }}>
                    <div 
                        className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                        role="progressbar" 
                        style={{ width: `${progreso}%` }}
                    >
                        {Math.round(progreso)}%
                    </div>
                </div>
            </div>
        )}

        <div className="mt-4 text-muted small">
            <i className="fa-solid fa-circle-info me-1"></i> 
            Este proceso puede tardar unos segundos dependiendo de la cantidad de cursos.
        </div>

      </div>
    </div>
  );
}

export default GeneradorHorario;