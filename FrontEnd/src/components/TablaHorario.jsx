// frontend/src/components/TablaHorario.jsx
import { useState, useEffect } from 'react';
import { Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService.js'; 
import ModalEdicion from './ModalEdicion.jsx'; 

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
  "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
  "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
  "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
  "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
  "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];

function TablaHorario({ curso, refreshKey, onDatosCambiados, userRole }) {
  const [horariosDelCurso, setHorariosDelCurso] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  const handleCellClick = (asignacionData, dia, horaRango) => {
    // Solo permitir edición si es admin y hay datos
    if (!asignacionData || userRole !== 'admin') return;

    setModalData({
      curso: curso, 
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
    // Si somos admin y no hay curso seleccionado, limpiamos y salimos
    if (userRole === 'admin' && !curso) {
      setHorariosDelCurso({});
      return;
    }

    setIsLoading(true);
    try {
      let data;
      
      if (userRole === 'admin') {
        // --- CASO ADMIN: Recibe diccionario estructurado ---
        // { "07:40 a 08:20": { "Lunes": { text: "Profe (Mat)", aula_nombre: "Aula 1" } } }
        data = await apiFetch(`/api/horarios/${curso}`);
        setHorariosDelCurso(data);

      } else {
        // --- CASO PROFESOR: Recibe lista plana ---
        // [ { dia: "Lunes", hora_rango: "...", materia: "...", curso: "...", aula: "..." } ]
        const listaClases = await apiFetch(`/api/horarios/mi-horario`);
        
        // TRANSFORMACIÓN MÁGICA: De Lista a Diccionario para que la tabla lo entienda
        const horarioTransformado = {};
        
        if (Array.isArray(listaClases)) {
            listaClases.forEach(clase => {
                const rango = clase.hora_rango;
                const dia = clase.dia;

                if (!horarioTransformado[rango]) {
                    horarioTransformado[rango] = {};
                }

                // Construimos el objeto celda como lo espera el renderizado
                horarioTransformado[rango][dia] = {
                    id: clase.id,
                    // Para el profe, mostramos "Curso - Materia"
                    text: `${clase.curso} - ${clase.materia}`, 
                    aula_nombre: clase.aula,
                    // Guardamos datos extra por si acaso
                    ...clase 
                };
            });
        }
        setHorariosDelCurso(horarioTransformado);
      }

    } catch (error) {
      toast.error(`Error al cargar el horario: ${error.message}`);
      setHorariosDelCurso({});
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarHorarioDelCurso();
  }, [curso, refreshKey, userRole]);

  // --- Renderizado ---

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
    return <Alert variant="warning" className="mt-3">No hay clases asignadas para mostrar.</Alert>;
  }

  return (
    <>
      <Table bordered hover responsive size="sm" className="mt-3 shadow-sm">
        <thead className="table-primary text-center">
          <tr>
            <th style={{ width: '150px' }}>Hora</th>
            {DIAS.map(dia => <th key={dia}>{dia}</th>)}
          </tr>
        </thead>
        <tbody>
          {HORARIOS_RANGOS.map(horaRango => (
            <tr key={horaRango}>
              <td className="fw-bold text-muted" style={{ fontSize: '0.85rem' }}>{horaRango}</td>
              
              {DIAS.map(dia => {
                // Ahora esto funciona tanto para Admin (backend devuelve dict) 
                // como para Profe (frontend transformó lista a dict)
                const asignacionData = horariosDelCurso[horaRango]?.[dia];
                
                const displayText = asignacionData ? asignacionData.text : "";
                const displayAula = asignacionData ? asignacionData.aula_nombre : "";

                return (
                  <td
                    key={dia}
                    className={asignacionData ? "table-light text-center align-middle" : ""}
                    onClick={() => handleCellClick(asignacionData, dia, horaRango)}
                    style={{
                      cursor: (asignacionData && userRole === 'admin') ? 'pointer' : 'default',
                      height: '50px',
                      backgroundColor: asignacionData ? '#e3f2fd' : 'transparent' 
                    }}
                  >
                    {asignacionData && (
                        <div style={{ lineHeight: '1.2' }}>
                            <div className="fw-bold" style={{ fontSize: '0.9rem' }}>
                                {displayText}
                            </div>
                            {displayAula && (
                                <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                                    <i className="bi bi-geo-alt-fill me-1"></i>
                                    {displayAula}
                                </div>
                            )}
                        </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </Table>

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