// frontend/src/components/TablaHorario.jsx (Modificado para Roles)
import { useState, useEffect } from 'react';
import { Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
// CORRECCIÓN: Se añade la extensión .js
import { apiFetch } from '../apiService.js'; 
// CORRECCIÓN: Se añade la extensión .jsx
import ModalEdicion from './ModalEdicion.jsx'; 

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
  "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
  "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
  "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
  "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
  "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];

// 1. AÑADIMOS 'userRole' a las props recibidas
function TablaHorario({ curso, refreshKey, onDatosCambiados, userRole }) {
  const [horariosDelCurso, setHorariosDelCurso] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  const handleCellClick = (asignacionData, dia, horaRango) => {
    // 2. MODIFICACIÓN: Solo abrir el modal si es admin
    if (!asignacionData || userRole !== 'admin') return;

    console.log("Clic de admin detectado!", { asignacionData, dia, horaRango });

    setModalData({
      curso: curso, // Nota: 'curso' será el nombre del curso (para admin)
      dia: dia,
      horaRango: horaRango,
      asignacion: asignacionData
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalData(null);
  };

  const handleEditSuccess = () => {
    if (onDatosCambiados) {
      onDatosCambiados();
    }
  };


  async function cargarHorarioDelCurso() {
    // 3. MODIFICACIÓN: Lógica de fetch basada en el rol
    
    // Si somos admin pero no hemos seleccionado curso, no cargar nada
    if (userRole === 'admin' && !curso) {
      setHorariosDelCurso({});
      return;
    }

    setIsLoading(true);
    try {
      let data;
      if (userRole === 'admin' && curso) {
        // Vista Admin: Cargar por nombre de curso
        data = await apiFetch(`/api/horarios/${curso}`);
      } else if (userRole !== 'admin') {
        // Vista Profesor: Cargar el horario personal
        // (Esto requiere que el endpoint /api/horarios/mi-horario exista en el backend)
        data = await apiFetch(`/api/horarios/mi-horario`);
      } else {
        data = {}; // Caso por defecto (ej. admin sin curso seleccionado)
      }
      setHorariosDelCurso(data);
    } catch (error) {
      toast.error(`Error al cargar el horario: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarHorarioDelCurso();
    // 4. MODIFICACIÓN: El efecto ahora también depende del userRole
  }, [curso, refreshKey, userRole]);

  // --- Renderizado Condicional ---
  // (Modificamos el mensaje para la vista de admin)
  if (userRole === 'admin' && !curso) {
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
    // Mensaje genérico para admin o profesor
    return <Alert variant="warning" className="mt-3">No hay ningún horario generado para mostrar.</Alert>;
  }

  // --- Renderizado Principal ---
  return (
    <>
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
                const asignacionData = horariosDelCurso[horaRango]?.[dia];
                const displayText = asignacionData ? asignacionData.text : "";
                const displayAula = asignacionData ? asignacionData.aula_nombre : "";

                return (
                  <td
                    key={dia}
                    className={asignacionData ? "table-light" : ""}
                    // 5. MODIFICACIÓN: La función 'handleCellClick' ya filtra el rol
                    onClick={() => handleCellClick(asignacionData, dia, horaRango)}
                    style={{
                      // 6. MODIFICACIÓN: Cambiar cursor basado en el rol
                      cursor: (asignacionData && userRole === 'admin') ? 'pointer' : 'default',
                      lineHeight: 1.2,
                      fontSize: '0.9em'
                    }}
                  >
                    {displayText}
                    {displayAula && (
                      <>
                        <br />
                        <small className="text-muted">{displayAula}</small>
                      </>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      {/* El modal solo se mostrará si 'handleCellClick' lo permite (solo admins) */}
      <ModalEdicion
        show={showModal}
        handleClose={handleCloseModal}
        data={modalData}
        onSaveSuccess={handleEditSuccess}
      />
    </>
  );
}

export default TablaHorario;

