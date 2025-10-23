// frontend/src/components/PanelAdmin.jsx (Refactorizado)
import React from 'react'; // No necesitamos useState o useEffect aquí

const API_URL = "http://127.0.0.1:8000";

// Recibimos 'curso' y 'onDatosCambiados'
function PanelAdmin( { curso, onDatosCambiados, refreshKey } ) {
  
  // Tu función 'borrarHorarios'
  // ¡No necesita cambios! Ya llama al endpoint correcto.
  async function handleBorrarHorarios() {
    if (!curso) {
        alert("Por favor, selecciona un curso primero.");
        return;
    }
    if (!confirm(`¿Estás seguro de que quieres borrar todos los horarios del curso ${curso}?`)) {
      return;
    }
    
    // Este fetch ahora funcionará porque acabamos de crear
    // el endpoint DELETE /api/horarios/{curso_nombre} en main.py
    const response = await fetch(`${API_URL}/api/horarios/${curso}`, { method: 'DELETE' });
    const result = await response.json();

    alert(result.mensaje);
    
    // Avisamos a App.jsx que los datos cambiaron
    onDatosCambiados(); 
  }
  
  // El HTML/JSX simplificado
  return (
    <div>
      {/* Ya no mostramos el select de profesores */}
      
      <button id="borrarHorarios" onClick={handleBorrarHorarios}>
        Borrar Horarios del Curso
      </button>
      
      <button onClick={() => window.location.href = `${API_URL}/api/export/excel`}>
        Descargar Excel
      </button>
    </div>
  )
}

export default PanelAdmin;