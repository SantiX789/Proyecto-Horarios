// frontend/src/components/TablaHorario.jsx (Completo con Modal y onSaveSuccess)
import { useState, useEffect } from 'react';
import { Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';
import ModalEdicion from './ModalEdicion'; // Importamos el Modal

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
  "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
  "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
  "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
  "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
  "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];

// 1. Añadimos 'onDatosCambiados' a las props recibidas
function TablaHorario({ curso, refreshKey, onDatosCambiados }) {
  const [horariosDelCurso, setHorariosDelCurso] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  const handleCellClick = (asignacionData, dia, horaRango) => {
    if (!asignacionData) return;
    console.log("Clic detectado!", { asignacionData, dia, horaRango });

    setModalData({
      curso: curso,
      dia: dia,
      horaRango: horaRango,
      asignacion: asignacionData
    });
    setShowModal(true);
    console.log("Intentando abrir modal...");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalData(null);
  };

  // 2. Renombramos la función que refresca para claridad
  const handleEditSuccess = () => {
    if (onDatosCambiados) {
      onDatosCambiados(); // Llamamos a la función que viene de App.jsx
    }
  };


  async function cargarHorarioDelCurso() {
    if (!curso) {
      setHorariosDelCurso({});
      return;
    }
    setIsLoading(true);
    try {
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

  // --- Renderizado Condicional ---
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

                // --- ¡AÑADE ESTA LÍNEA! ---
                const displayAula = asignacionData ? asignacionData.aula_nombre : "";

                return (
                  <td
                    key={dia}
                    className={asignacionData ? "table-light" : ""}
                    onClick={() => handleCellClick(asignacionData, dia, horaRango)}
                    style={{
                      cursor: asignacionData ? 'pointer' : 'default',
                      lineHeight: 1.2, // Ajuste para que dos líneas se vean bien
                      fontSize: '0.9em'  // Letra un poco más chica
                    }}
                  >
                    {/* --- MODIFICA ESTA SECCIÓN --- */}
                    {displayText}
                    {displayAula && ( // Si hay un aula, la muestra abajo
                      <>
                        <br />
                        <small className="text-muted">{displayAula}</small>
                      </>
                    )}
                    {/* --- FIN MODIFICACIÓN --- */}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 3. Pasamos 'handleEditSuccess' al prop 'onSaveSuccess' del Modal */}
      <ModalEdicion
        show={showModal}
        handleClose={handleCloseModal}
        data={modalData}
        onSaveSuccess={handleEditSuccess} // ¡Aquí conectamos el refresco!
      />
    </>
  );
}

export default TablaHorario;