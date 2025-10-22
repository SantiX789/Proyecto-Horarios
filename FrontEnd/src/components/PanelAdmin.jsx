// frontend/src/components/PanelAdmin.jsx
import { useState, useEffect } from 'react';

const API_URL = "http://127.0.0.1:8000";

// Recibimos el 'curso' actual y una función 'onDatosCambiados'
// para avisarle a App.jsx que debe recargar la tabla.
function PanelAdmin( { curso, onDatosCambiados } ) {
  
  const [profesores, setProfesores] = useState([]);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState("");

  // 1. Tu función 'actualizarSelectProfesores'
  async function cargarProfesoresDelCurso() {
    const response = await fetch(`${API_URL}/api/profesores/${curso}`);
    const data = await response.json();
    setProfesores(data);
    
    // Si hay profesores, seleccionamos el primero por defecto
    if (data.length > 0) {
      setProfesorSeleccionado(data[0]);
    } else {
      setProfesorSeleccionado("");
    }
  }

  // 2. Cargamos los profesores cuando cambia el curso
  useEffect(() => {
    if (curso) {
      cargarProfesoresDelCurso();
    }
  }, [curso]); // <-- Depende de 'curso'

  // 3. Tu función 'borrarHorarios'
  async function handleBorrarHorarios() {
    if (!confirm(`¿Estás seguro de que quieres borrar todos los horarios del curso ${curso}?`)) {
      return;
    }
    
    await fetch(`${API_URL}/api/horarios/${curso}`, { method: 'DELETE' });
    
    alert(`Horarios del curso ${curso} han sido borrados.`);
    // Avisamos a App.jsx que los datos cambiaron
    onDatosCambiados(); 
  }

  // 4. Tu función 'borrarProfesor'
  async function handleBorrarProfesor() {
    if (!profesorSeleccionado) {
      alert("Por favor, selecciona un profesor de la lista.");
      return;
    }
    if (!confirm(`¿Estás seguro de que quieres borrar al profesor ${profesorSeleccionado} del curso ${curso}?`)) {
      return;
    }

    await fetch(`${API_URL}/api/profesor/${curso}/${profesorSeleccionado}`, {
      method: 'DELETE'
    });

    alert(`El profesor ${profesorSeleccionado} ha sido borrado del curso ${curso}.`);
    // Avisamos a App.jsx que los datos cambiaron
    onDatosCambiados();
  }
  
  // 5. El HTML/JSX
  return (
    <div>
      <select 
        id="profesorSelect" 
        value={profesorSeleccionado} 
        onChange={e => setProfesorSeleccionado(e.target.value)}
      >
        {/* Llenamos el select dinámicamente con .map() */}
        {profesores.map(prof => (
          <option key={prof} value={prof}>{prof}</option>
        ))}
      </select>
      
      <button id="borrarProfesor" onClick={handleBorrarProfesor}>Borrar Profesor</button>
      <button id="borrarHorarios" onClick={handleBorrarHorarios}>Borrar todos los horarios</button>
      
      {/* El botón de Excel también puede ir aquí */}
      <button onClick={() => window.location.href = `${API_URL}/api/export/excel`}>
        Descargar Excel
      </button>
    </div>
  )
}

export default PanelAdmin