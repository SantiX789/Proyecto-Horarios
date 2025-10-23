// frontend/src/components/TablaHorario.jsx (Refactorizado)
import { useState, useEffect } from 'react';
// 1. Importamos Table y Spinner
import { Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';

const API_URL = "http://127.0.0.1:8000";
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
    "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
    "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
    "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
    "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
    "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40" 
];

function TablaHorario( { curso, refreshKey } ) {
  const [horariosDelCurso, setHorariosDelCurso] = useState({});
  // 2. Estado de carga (UX)
  const [isLoading, setIsLoading] = useState(false);

  async function cargarHorarioDelCurso() {
    if (!curso) {
      setHorariosDelCurso({});
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/horarios/${curso}`);
      if (response.ok) {
        const data = await response.json();
        setHorariosDelCurso(data);
      } else {
        toast.error("Error al cargar el horario.");
      }
    } catch (error) {
      toast.error("Error de red al cargar el horario.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarHorarioDelCurso();
  }, [curso, refreshKey]); // Depende de 'curso' y 'refreshKey'

  // 3. Renderizado condicional (UX)
  if (!curso) {
    return <Alert variant="info" className="mt-3">Selecciona un curso para ver su horario.</Alert>;
  }

  if (isLoading) {
    return (
      <div className="text-center mt-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando horario...</span>
        </Spinner>
      </div>
    );
  }

  const tieneHorarios = Object.keys(horariosDelCurso).length > 0;

  if (!tieneHorarios && !isLoading) {
    return <Alert variant="warning" className="mt-3">Este curso no tiene ningún horario generado.</Alert>;
  }

  // 4. Usamos el componente <Table> de React-Bootstrap
  return (
    <Table bordered hover responsive size="sm" className="mt-3">
      <thead className="table-primary text-center">
        <tr>
          <th>Hora</th>
          <th>Lunes</th>
          <th>Martes</th>
          <th>Miércoles</th>
          <th>Jueves</th>
          <th>Viernes</th>
        </tr>
      </thead>
      <tbody>
        {HORARIOS_RANGOS.map(horaRango => (
          <tr key={horaRango}>
            <td>{horaRango}</td>
            {DIAS.map(dia => {
              const asignacion = horariosDelCurso[horaRango]?.[dia] || "";
              return (
                <td 
                  key={dia} 
                  className={asignacion ? "table-light" : ""}
                >
                  {asignacion}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default TablaHorario;