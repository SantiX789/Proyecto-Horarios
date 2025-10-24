// frontend/src/components/TablaHorario.jsx (Refactorizado)
import { useState, useEffect } from 'react';
import { Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';

// 1. Importamos el servicio
import { apiFetch } from '../apiService';

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
  const [isLoading, setIsLoading] = useState(false);

  async function cargarHorarioDelCurso() {
    if (!curso) {
      setHorariosDelCurso({});
      return;
    }
    setIsLoading(true);
    try {
      // 2. Usamos apiFetch
      const data = await apiFetch(`/api/horarios/${curso}`);
      setHorariosDelCurso(data);
    } catch (error) {
      toast.error(`Error al cargar el horario: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarHorarioDelCurso();
  }, [curso, refreshKey]);

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