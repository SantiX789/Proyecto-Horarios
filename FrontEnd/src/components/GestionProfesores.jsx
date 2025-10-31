// frontend/src/components/GestionProfesores.jsx (Revertido a Grilla Clickable)
import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Spinner, ListGroup, Modal, InputGroup, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

// 1. Importamos la GRILA en lugar de definirla aquí
import GrillaDisponibilidad from './GrillaDisponibilidad';

// (Quitamos las constantes DIAS y HORAS_INICIO, ya que ahora están en GrillaDisponibilidad.jsx)

function GestionProfesores({ refreshKey, onDatosCambiados }) {
  // ... (Estados para lista y formulario de añadir, sin cambios) ...
  const [profesores, setProfesores] = useState([]);
  const [nombreProfesor, setNombreProfesor] = useState("");
  const [selectedSlots, setSelectedSlots] = useState(new Set()); // Para el formulario de añadir
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);

  // ... (Estados para modales, sin cambios) ...
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profToDelete, setProfToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profToEdit, setProfToEdit] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editSelectedSlots, setEditSelectedSlots] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ... (Función cargarProfesores, sin cambios) ...
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
  }, [refreshKey]);

  // --- Lógica de Disponibilidad (manejada por el padre) ---
  // Esta función ahora se pasará a GrillaDisponibilidad
  const handleSlotClick = (slotId, currentSlots, setSlots) => {
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

  const limpiarGrilla = (setSlots) => {
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
      limpiarGrilla(setSelectedSlots); // Limpia el estado de la grilla de "Añadir"
      if (onDatosCambiados) onDatosCambiados();
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lógica Borrar (sin cambios) ---
  const handleShowDeleteModal = (prof) => { setProfToDelete(prof); setShowDeleteModal(true); };
  const handleCloseDeleteModal = () => { setShowDeleteModal(false); setProfToDelete(null); };
  const handleConfirmDelete = async () => {
    if (!profToDelete) return;
    setIsDeleting(true);
    try {
        await apiFetch(`/api/profesores/${profToDelete.id}`, { method: 'DELETE' });
        toast.success(`¡Profesor "${profToDelete.nombre}" borrado!`);
        if (onDatosCambiados) onDatosCambiados();
        handleCloseDeleteModal();
    } catch (error) {
        toast.error(`Error al borrar: ${error.message}`);
    } finally {
        setIsDeleting(false);
    }
   };

  // --- Lógica Editar (sin cambios) ---
  const handleShowEditModal = (prof) => {
    setProfToEdit(prof);
    setEditNombre(prof.nombre);
    setEditSelectedSlots(new Set(prof.disponibilidad || []));
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => { setShowEditModal(false); setProfToEdit(null); setEditNombre(""); setEditSelectedSlots(new Set()); };
  const handleSaveChanges = async () => {
    if (!profToEdit || !editNombre) {
         if (!editNombre) toast.warn("El nombre no puede estar vacío.");
        handleCloseEditModal(); return;
    }
    const disponibilidadEditada = getDisponibilidadArray(editSelectedSlots);
     if (disponibilidadEditada.length === 0) {
      toast.warn("Selecciona al menos un bloque horario."); return;
    }
     const sortedEditada = [...disponibilidadEditada].sort();
     const sortedOriginal = [...(profToEdit.disponibilidad || [])].sort();

     if (editNombre === profToEdit.nombre && JSON.stringify(sortedEditada) === JSON.stringify(sortedOriginal)) {
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

  // 2. ELIMINAMOS la función 'DisponibilidadCheckboxes' de aquí

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
          <Form.Label>Disponibilidad Horaria (haz clic en las celdas):</Form.Label>
          
          {/* 3. Reemplazamos <DisponibilidadCheckboxes> por <GrillaDisponibilidad> */}
          <GrillaDisponibilidad 
              selectedSlots={selectedSlots}
              onSlotClick={(slotId) => handleSlotClick(slotId, selectedSlots, setSelectedSlots)}
          />

          <Button variant="primary" type="submit" disabled={isLoading} className="mt-2">
            {isLoading ? <Spinner size="sm" /> : 'Guardar Nuevo Profesor'}
          </Button>
        </Form>

        {/* --- Lista de Profesores Existentes (sin cambios) --- */}
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
      {/* Modal Borrar (sin cambios) */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered size="sm">
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
          
          {/* 4. Reemplazamos <DisponibilidadCheckboxes> por <GrillaDisponibilidad> aquí también */}
          <GrillaDisponibilidad 
              selectedSlots={editSelectedSlots}
              onSlotClick={(slotId) => handleSlotClick(slotId, editSelectedSlots, setEditSelectedSlots)}
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