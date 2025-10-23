// frontend/src/components/TablaHorario.jsx
import { useState, useEffect } from 'react'; // ¡Importamos hooks nuevos!

// Traemos las constantes. (Mejor si estuvieran en su propio archivo,
// pero por ahora está bien copiarlas)
const API_URL = "http://127.0.0.1:8000";
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
    "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
    "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
    "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
    "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
    "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40" 
];

// Este componente recibe el "curso" que está seleccionado en App.jsx
function TablaHorario( { curso, refreshKey } ) {
  // 1. Creamos un estado para guardar los datos del horario
  const [horariosDelCurso, setHorariosDelCurso] = useState({});

  // 2. Esta es la función 'actualizarTablaHorario' de tu HTML
  async function cargarHorarioDelCurso() {
    const response = await fetch(`${API_URL}/api/horarios/${curso}`);
    const data = await response.json();
    setHorariosDelCurso(data);
  }

  // 3. Este hook (useEffect) es la magia de React.
  //    Se ejecuta automáticamente cuando el componente carga
  //    y cada vez que la variable 'curso' cambia.
  useEffect(() => {
    if (curso) {
      cargarHorarioDelCurso();
    }
  }, [curso, refreshKey]); // <-- 2. Añade 'refreshKey' a las dependencias
  // 4. Tu HTML adaptado
  return (
    <>
      <h2>Horario del curso</h2>
      <table id="tabla-horario">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Lunes</th>
            <th>Martes</th>
            <th>Miércoles</th>
            <th>Jueves</th>
            <th>Viernes</th>
          </tr>
        </thead>
        {/* Ahora dibujamos la tabla dinámicamente usando el "estado"
          en lugar de 'tablaHorario.innerHTML = ""' 
        */}
        <tbody>
          {HORARIOS_RANGOS.map(horaRango => (
            // Usamos .map() para crear una <tr> por cada hora
            <tr key={horaRango}>
              <td>{horaRango}</td>
              {DIAS.map(dia => {
                // Buscamos si hay datos para esta celda
                const asignacion = horariosDelCurso[horaRango]?.[dia] || "";
                return (
                  <td 
                    key={dia} 
                    className={asignacion ? "asignado" : ""}
                  >
                    {asignacion}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default TablaHorario