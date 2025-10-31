// frontend/src/components/ModalEdicion.jsx (Con Edición)
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService'; // Importamos nuestro servicio

// Constantes de días y horas (podrían venir del backend o un config)
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
// Necesitamos una lista de TODOS los rangos posibles para los selects
const HORARIOS_RANGOS = [
  "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
  "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
  "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
  "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
  "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];


function ModalEdicion({ show, handleClose, data, onSaveSuccess }) { // Añadimos onSaveSuccess
  // --- Estados del Modal ---
  const [availableSlots, setAvailableSlots] = useState([]); // Huecos libres [{ dia, hora_rango }]
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Estados para la nueva selección
  const [selectedDia, setSelectedDia] = useState("");
  const [selectedHoraRango, setSelectedHoraRango] = useState("");

  // --- Efecto para Cargar Huecos Libres ---
  useEffect(() => {
    // Solo cargar si el modal está visible y tenemos datos válidos
    if (show && data?.asignacion?.id) {
      const fetchAvailableSlots = async () => {
        setIsLoadingSlots(true);
        setError(""); // Limpiamos errores anteriores
        try {
          const slots = await apiFetch(`/api/asignaciones/${data.asignacion.id}/slots-disponibles`);
          setAvailableSlots(slots);
          // Pre-seleccionar el día y hora actuales
          setSelectedDia(data.dia);
          setSelectedHoraRango(data.horaRango);
        } catch (err) {
          setError(`Error al cargar horarios disponibles: ${err.message}`);
          setAvailableSlots([]); // Limpiar por si acaso
        } finally {
          setIsLoadingSlots(false);
        }
      };
      fetchAvailableSlots();
    } else {
      // Limpiar estados cuando el modal se cierra o no hay datos
      setAvailableSlots([]);
      setSelectedDia("");
      setSelectedHoraRango("");
      setError("");
    }
  }, [show, data]); // Se ejecuta cuando 'show' o 'data' cambian


  // --- Filtrar Horas Disponibles según el Día Seleccionado ---
  const horasDisponiblesParaDia = availableSlots
    .filter(slot => slot.dia === selectedDia)
    .map(slot => slot.hora_rango);

  // Añadir la hora actual a la lista si no está (para permitir quedarse en el mismo sitio)
  if (data && selectedDia === data.dia && !horasDisponiblesParaDia.includes(data.horaRango)) {
    horasDisponiblesParaDia.push(data.horaRango);
    horasDisponiblesParaDia.sort(); // Mantener orden
  }


  // --- Handler para Guardar Cambios ---
  const handleSaveChanges = async () => {
    if (!selectedDia || !selectedHoraRango) {
      toast.warn("Por favor, selecciona un día y una hora.");
      return;
    }
    // Verificar si realmente hubo un cambio
    if (selectedDia === data.dia && selectedHoraRango === data.horaRango) {
      toast.info("No se realizaron cambios.");
      handleClose();
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const updateData = {
        dia: selectedDia,
        hora_rango: selectedHoraRango
      };

      // Llamamos al endpoint PUT
      const result = await apiFetch(`/api/asignaciones/${data.asignacion.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      toast.success(result.mensaje);
      onSaveSuccess(); // ¡Avisamos a TablaHorario para que refresque!
      handleClose();   // Cerramos el modal

    } catch (err) {
      setError(`Error al guardar: ${err.message}`); // Mostramos el error en el modal
      toast.error(`Error al guardar: ${err.message}`); // Y también como toast
    } finally {
      setIsSaving(false);
    }
  };


  // --- Renderizado ---
  if (!data) return null; // No renderizar si no hay datos

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Editar Asignación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Curso:</strong> {data.curso}</p>
        <p><strong>Asignación Actual:</strong> {data.asignacion?.text || 'N/A'}</p>

        {/* --- ¡AÑADE ESTA LÍNEA! --- */}
        <p><strong>Aula Actual:</strong> {data.asignacion?.aula_nombre || 'N/A'}</p>

        <p><em>Moviendo desde: {data.dia} - {data.horaRango}</em></p>
        <hr />

        {/* --- Controles de Edición --- */}
        <h5>Seleccionar Nuevo Horario:</h5>
        {isLoadingSlots ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <Form>
            <Row>
              <Col>
                <Form.Group controlId="edit-dia">
                  <Form.Label>Nuevo Día:</Form.Label>
                  <Form.Select
                    value={selectedDia}
                    onChange={e => {
                      setSelectedDia(e.target.value);
                      // Resetear hora al cambiar día si la actual no está disponible
                      const nuevasHoras = availableSlots
                        .filter(slot => slot.dia === e.target.value)
                        .map(slot => slot.hora_rango);
                      if (!nuevasHoras.includes(selectedHoraRango)) {
                        setSelectedHoraRango(nuevasHoras.length > 0 ? nuevasHoras[0] : "");
                      }
                    }}
                    disabled={isSaving}
                  >
                    {/* Opciones de días disponibles (basado en availableSlots) */}
                    {[...new Set(availableSlots.map(s => s.dia))].sort().map(diaOption => (
                      <option key={diaOption} value={diaOption}>{diaOption}</option>
                    ))}
                    {/* Asegurarse que el día actual esté si no está en disponibles */}
                    {![...new Set(availableSlots.map(s => s.dia))].includes(data.dia) &&
                      <option key={data.dia} value={data.dia}>{data.dia}</option>
                    }
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group controlId="edit-hora">
                  <Form.Label>Nueva Hora:</Form.Label>
                  <Form.Select
                    value={selectedHoraRango}
                    onChange={e => setSelectedHoraRango(e.target.value)}
                    disabled={!selectedDia || isSaving} // Deshabilitado si no hay día
                  >
                    {/* Opciones de horas disponibles PARA ESE DÍA */}
                    {horasDisponiblesParaDia.length === 0 && <option value="">(No hay horas libres este día)</option>}
                    {horasDisponiblesParaDia.map(horaOption => (
                      <option key={horaOption} value={horaOption}>{horaOption}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        )}

        {/* Mostramos el error de guardado si ocurre */}
        {error && !isLoadingSlots && <Alert variant="danger" className="mt-3">{error}</Alert>}

      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSaveChanges}
          disabled={isLoadingSlots || isSaving || !selectedDia || !selectedHoraRango}
        >
          {isSaving ? <Spinner as="span" animation="border" size="sm" /> : 'Guardar Cambios'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalEdicion;