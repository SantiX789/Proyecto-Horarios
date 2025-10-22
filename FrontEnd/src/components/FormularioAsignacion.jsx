// frontend/src/components/FormularioAsignacion.jsx
import { useState } from 'react'

const API_URL = "http://127.0.0.1:8000";
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_INICIO = [
    "07:00", "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40",
    "12:20", "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",
    "17:40", "18:20", "19:00"
];

// 1. Recibimos 'props' del padre (App.jsx)
function FormularioAsignacion( { curso, setCurso, onHorarioGenerado } ) {
  
  // 2. El 'curso' ya no se maneja aquí.
  //    Solo manejamos los estados de este formulario.
  const [profesor, setProfesor] = useState("");
  const [materia, setMateria] = useState("");
  const [horas, setHoras] = useState("");
  
  async function handleGenerarHorario() {
      const horasSemanales = parseInt(horas, 10);
      
      // 3. Lógica para recolectar los checkboxes (¡AHORA SÍ!)
      const disponibilidad = [];
      HORARIOS_INICIO.forEach(horaInicio => {
          DIAS.forEach(dia => {
              const checkboxId = `check-${dia}-${horaInicio}`;
              // ¡Volvemos a usar getElementById!
              // Aunque no es "puro React", para una grilla tan grande
              // es la solución más simple y rápida.
              const checkbox = document.getElementById(checkboxId); 
              if (checkbox && checkbox.checked) {
                  disponibilidad.push(`${dia}-${horaInicio}`);
              }
          });
      });

      if (!profesor || !materia || !horasSemanales) {
          alert("Por favor, completa los campos.");
          return;
      }

      const requestData = {
          curso: curso, // Usamos el 'curso' que vino de App.jsx
          profesor: profesor,
          materia: materia,
          horasSemanales: horasSemanales,
          disponibilidad: disponibilidad
      };

      const response = await fetch(`${API_URL}/api/horarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
      });
      
      const result = await response.json();
      if (result.faltantes > 0) {
        alert(`No se pudo asignar todas las horas. Faltan ${result.faltantes} bloques por asignar.`);
      } else {
        alert(result.mensaje);
      }
      
      setProfesor("");
      setMateria("");
      setHoras("");
      
      // Limpiamos los checkboxes manualmente
      document.querySelectorAll("input[type='checkbox']").forEach(checkbox => checkbox.checked = false);

      // 4. ¡Avisamos a App.jsx que generamos un horario!
      onHorarioGenerado(); 
  }

  return (
    <form>
        <label htmlFor="curso">Curso:</label>
        {/* 5. El <select> ahora es controlado por App.jsx */}
        <select 
          id="curso" 
          name="curso" 
          value={curso} // Lee el valor de App.jsx
          onChange={ (e) => setCurso(e.target.value) } // Avisa a App.jsx del cambio
        >
            <option value="1A">1A</option>
            <option value="1B">1B</option>
            <option value="6Electronica">6 Electrónica</option>
            {/* Agrega todos tus cursos aquí */}
        </select><br />

        <label htmlFor="profesor">Nombre del profesor:</label>
        <input 
          type="text" 
          id="profesor" 
          name="profesor" 
          value={profesor} 
          onChange={ (e) => setProfesor(e.target.value) } 
        /><br />

        <label htmlFor="materia">Materia:</label>
        <input 
          type="text" 
          id="materia" 
          name="materia" 
          value={materia} 
          onChange={ (e) => setMateria(e.target.value) }
        /><br />

        <label htmlFor="horas-semanales">Horas semanales:</label>
        <input 
          type="number" 
          id="horas-semanales" 
          name="horas-semanales" 
          min="1" 
          value={horas} 
          onChange={ (e) => setHoras(e.target.value) }
        /><br />

        <button type="button" onClick={handleGenerarHorario}>Generar Horario</button>
    </form>
  )
}

export default FormularioAsignacion