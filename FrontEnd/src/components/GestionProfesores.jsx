// frontend/src/components/GestionProfesores.jsx
import { useState } from 'react';
import GrillaDisponibilidad from './GrillaDisponibilidad'; // 1. Importamos la grilla

const API_URL = "http://127.0.0.1:8000";

// 2. Traemos las constantes de la grilla (las mismas de tu FormularioAsignacion)
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_INICIO = [
    "07:00", "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40",
    "12:20", "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",
    "17:40", "18:20", "19:00"
];

// Recibimos 'onDatosCambiados' para refrescar otras partes si es necesario
function GestionProfesores({ onDatosCambiados }) {
  const [nombreProfesor, setNombreProfesor] = useState("");

  // 3. Lógica para leer los checkboxes (la misma que tenías)
  function leerDisponibilidad() {
    const disponibilidad = [];
    HORARIOS_INICIO.forEach(horaInicio => {
        DIAS.forEach(dia => {
            // El ID del checkbox es generado por GrillaDisponibilidad.jsx
            const checkboxId = `check-${dia}-${horaInicio}`; 
            const checkbox = document.getElementById(checkboxId); 
            if (checkbox && checkbox.checked) {
                disponibilidad.push(`${dia}-${horaInicio}`);
            }
        });
    });
    return disponibilidad;
  }
  
  // 4. Limpiar los checkboxes (también de tu lógica anterior)
  function limpiarGrilla() {
    document.querySelectorAll("input[type='checkbox']").forEach(checkbox => checkbox.checked = false);
  }

  // 5. Manejar el envío
  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombreProfesor) {
      alert("Por favor, ingresa un nombre para el profesor.");
      return;
    }

    const disponibilidad = leerDisponibilidad();
    if (disponibilidad.length === 0) {
      alert("Por favor, selecciona al menos un bloque de disponibilidad.");
      return;
    }
    
    const profesorData = {
        nombre: nombreProfesor,
        disponibilidad: disponibilidad
    };

    // 6. Llamamos al nuevo endpoint de la API
    await fetch(`${API_URL}/api/profesores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profesorData)
    });

    alert("Profesor guardado");
    setNombreProfesor(""); // Limpia el input
    limpiarGrilla();       // Limpia los checkboxes
    
    // Avisamos a App que algo cambió (por si otros componentes
    // necesitan recargar la lista de profesores)
    if (onDatosCambiados) {
        onDatosCambiados();
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
      <h3>Gestión de Profesores (Cuadro 1)</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="nombre-profesor">Nombre del Profesor:</label>
        <input
          type="text"
          id="nombre-profesor"
          value={nombreProfesor}
          onChange={(e) => setNombreProfesor(e.target.value)}
          style={{ marginRight: '10px' }}
        />
        <button type="submit">Guardar Profesor</button>
      </form>
      
      <p>Selecciona la disponibilidad horaria del profesor:</p>
      
      {/* 7. ¡Renderizamos la grilla aquí dentro! */}
      <GrillaDisponibilidad />
    </div>
  );
}

export default GestionProfesores;