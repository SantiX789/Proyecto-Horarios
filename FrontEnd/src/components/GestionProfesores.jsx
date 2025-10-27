// frontend/src/components/GestionProfesores.jsx (Con Lista y Nueva UI Disponibilidad)
import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Spinner, ListGroup, Modal, InputGroup, ButtonGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

// Constantes para la nueva UI de disponibilidad
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORAS_INICIO = [
    "07:00", "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40",
    "12:20", "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",
    "17:40", "18:20", "19:00", "19:40" // Añadimos 19:40 si es relevante
];

function GestionProfesores({ refreshKey, onDatosCambiados }) {
  // Estados para lista y formulario de añadir
  const [profesores, setProfesores] = useState([]);
  const [nombreProfesor, setNombreProfesor] = useState("");
  const [selectedSlots, setSelectedSlots] = useState(new Set()); // Para el formulario de añadir
  const [isLoading, setIsLoading] = useState(false); // Para el botón 'Guardar'
  const [isListLoading, setIsListLoading] = useState(false);

  // Estados para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profToDelete, setProfToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profToEdit, setProfToEdit] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editSelectedSlots, setEditSelectedSlots] = useState(new Set()); // Para el modal de editar
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- Carga de Profesores ---
  async function cargarProfesores() {
    setIsListLoading(true);
    try {
      const data = await apiFetch('/api/profesores');
      setProfesores(data);
    } catch (error) {
      toast.error(`Error al cargar profesores: ${error.message}`);
    }
    setIsListLoading(false);
  }

  useEffect(() => {
    cargarProfesores();
  }, [refreshKey]); // Recarga cuando refreshKey cambia

  // --- Lógica de Disponibilidad (Nueva UI Checkboxes) ---
  const handleSlotChange = (slotId, currentSlots, setSlots) => {
    setSlots(prev => {
      const newSlots = new Set(prev);
      if (newSlots.has(slotId)) {
        newSlots.delete(slotId);
      } else {
        newSlots.add(slotId);
      }
      return newSlots;
    });
  };

  const limpiarCheckboxes = (setSlots) => {
    setSlots(new Set());
  };

  const getDisponibilidadArray = (slotSet) => Array.from(slotSet);

  // --- Lógica Formulario Añadir ---
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!nombreProfesor) {
      toast.warn("Ingresa un nombre."); return;
    }
    const disponibilidad = getDisponibilidadArray(selectedSlots);
    if (disponibilidad.length === 0) {
      toast.warn("Selecciona al menos un bloque horario."); return;
    }
    setIsLoading(true);
    try {
      await apiFetch('/api/profesores', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreProfesor, disponibilidad: disponibilidad })
      });
      toast.success("¡Profesor guardado!");
      setNombreProfesor("");
      limpiarCheckboxes(setSelectedSlots);
      if (onDatosCambiados) onDatosCambiados(); // Refrescar listas
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lógica Borrar ---
  const handleShowDeleteModal = (prof) => { setProfToDelete(prof); setShowDeleteModal(true); };
  const handleCloseDeleteModal = () => { setShowDeleteModal(false); setProfToDelete(null); };
  const handleConfirmDelete = async () => { /* ... (similar a cursos/materias, llama DELETE /api/profesores/{id}) ... */
    if (!profToDelete) return;
    setIsDeleting(true);
    try {
        await apiFetch(`/api/profesores/${profToDelete.id}`, { method: 'DELETE' });
        toast.success(`¡Profesor "${profToDelete.nombre}" borrado!`);
        if (onDatosCambiados) onDatosCambiados();
        handleCloseDeleteModal();
    } catch (error) {
        toast.error(`Error al borrar: ${error.message}`); // El backend ya maneja el 409
    } finally {
        setIsDeleting(false);
    }
   };

  // --- Lógica Editar ---
  const handleShowEditModal = (prof) => {
    setProfToEdit(prof);
    setEditNombre(prof.nombre);
    // Convertir la lista de disponibilidad guardada de nuevo a Set para el modal
    setEditSelectedSlots(new Set(prof.disponibilidad || []));
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => { setShowEditModal(false); setProfToEdit(null); setEditNombre(""); setEditSelectedSlots(new Set()); };
  const handleSaveChanges = async () => { /* ... (similar a cursos/materias, llama PUT /api/profesores/{id}) ... */
    if (!profToEdit || !editNombre) {
         if (!editNombre) toast.warn("El nombre no puede estar vacío.");
        handleCloseEditModal(); return;
    }
    const disponibilidadEditada = getDisponibilidadArray(editSelectedSlots);
     if (disponibilidadEditada.length === 0) {
      toast.warn("Selecciona al menos un bloque horario."); return;
    }

    // Comprobar si hubo cambios reales
     if (editNombre === profToEdit.nombre && JSON.stringify(disponibilidadEditada.sort()) === JSON.stringify((profToEdit.disponibilidad || []).sort())) {
         toast.info("No se realizaron cambios.");
         handleCloseEditModal();
         return;
     }

    setIsUpdating(true);
    try {
        await apiFetch(`/api/profesores/${profToEdit.id}`, {
            method: 'PUT',
            body: JSON.stringify({ nombre: editNombre, disponibilidad: disponibilidadEditada })
        });
        toast.success(`¡Profesor "${profToEdit.nombre}" actualizado!`);
        if (onDatosCambiados) onDatosCambiados();
        handleCloseEditModal();
    } catch (error) {
        toast.error(`Error al modificar: ${error.message}`);
    } finally {
        setIsUpdating(false);
    }
   };

  // --- Componente Reutilizable para Checkboxes de Disponibilidad ---
  const DisponibilidadCheckboxes = ({ selected, onChange }) => (
    <Row>
      {DIAS.map(dia => (
        <Col key={dia} md={2} sm={4} xs={6} className="mb-3">
          <h6>{dia}</h6>
          {HORAS_INICIO.map(hora => {
            const slotId = `${dia}-${hora}`;
            return (
              <Form.Check
                key={slotId}
                type="checkbox"
                id={`check-${slotId}`} // ID único para el label
                label={hora}
                checked={selected.has(slotId)}
                onChange={() => onChange(slotId)}
              />
            );
          })}
        </Col>
      ))}
    </Row>
  );

  // --- Renderizado ---
  return (
    <Card className="mt-3 shadow-sm border-0">
      <Card.Body>
        <Card.Title>Gestión de Profesores</Card.Title>

        {/* --- Formulario para Añadir Nuevo Profesor --- */}
        <Form onSubmit={handleAddSubmit} className="mb-4 p-3 border rounded bg-light">
          <h5>Añadir Nuevo Profesor</h5>
          <Form.Group className="mb-3" controlId="nombre-profesor-form">
            <Form.Label>Nombre del Profesor:</Form.Label>
            <Form.Control
              type="text" placeholder="Ej: Nombre Apellido"
              value={nombreProfesor}
              onChange={(e) => setNombreProfesor(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
          <Form.Label>Disponibilidad Horaria:</Form.Label>
          <DisponibilidadCheckboxes
              selected={selectedSlots}
              onChange={(slotId) => handleSlotChange(slotId, selectedSlots, setSelectedSlots)}
          />
          <Button variant="primary" type="submit" disabled={isLoading} className="mt-2">
            {isLoading ? <Spinner size="sm" /> : 'Guardar Nuevo Profesor'}
          </Button>
        </Form>

        {/* --- Lista de Profesores Existentes --- */}
        <h4 className="mt-4">Profesores Existentes:</h4>
        {isListLoading ? (
          <div className="text-center"><Spinner /></div>
        ) : (
          <ListGroup>
            {profesores.length === 0 && <ListGroup.Item>No hay profesores creados.</ListGroup.Item>}
            {profesores.map(prof => (
              <ListGroup.Item key={prof.id} className="d-flex justify-content-between align-items-center">
                {prof.nombre}
                <ButtonGroup size="sm">
                  <Button variant="outline-primary" onClick={() => handleShowEditModal(prof)} title="Editar">✏️</Button>
                  <Button variant="outline-danger" onClick={() => handleShowDeleteModal(prof)} title="Borrar">🗑️</Button>
                </ButtonGroup>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>

      {/* --- Modales (Borrar y Editar) --- */}
      {/* Modal Borrar */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered size="sm">
        {/* ... (Contenido del modal de borrado, similar a cursos/materias) ... */}
         <Modal.Header closeButton><Modal.Title>Confirmar Borrado</Modal.Title></Modal.Header>
         <Modal.Body>¿Seguro que quieres borrar a **"{profToDelete?.nombre}"**?</Modal.Body>
         <Modal.Footer>
             <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting}>Cancelar</Button>
             <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm"/> : 'Borrar'}</Button>
         </Modal.Footer>
      </Modal>

      {/* Modal Editar */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} centered size="lg"> {/* Hacemos el modal más grande */}
        <Modal.Header closeButton>
          <Modal.Title>Modificar Profesor: {profToEdit?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="edit-prof-nombre">
            <Form.Label>Nombre:</Form.Label>
            <Form.Control type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} disabled={isUpdating} />
          </Form.Group>
          <Form.Label>Disponibilidad Horaria:</Form.Label>
          {/* Usamos el componente reutilizable de checkboxes */}
          <DisponibilidadCheckboxes
              selected={editSelectedSlots}
              onChange={(slotId) => handleSlotChange(slotId, editSelectedSlots, setEditSelectedSlots)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal} disabled={isUpdating}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isUpdating || !editNombre}>
            {isUpdating ? <Spinner size="sm"/> : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

    </Card>
  );
}

export default GestionProfesores;