// frontend/src/components/GestionMaterias.jsx (Completo y Corregido)
import { useState, useEffect } from 'react';
import { Form, Button, ListGroup, Card, Spinner, Badge, Modal, InputGroup, ButtonGroup } from 'react-bootstrap'; // Añade Modal, InputGroup, ButtonGroup
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

const API_URL = "http://127.0.0.1:8000";

// 1. Asegúrate de recibir 'onDatosCambiados' como prop
function GestionMaterias({ refreshKey, onDatosCambiados }) {
  const [materias, setMaterias] = useState([]);
  const [nombreMateria, setNombreMateria] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [materiaToDelete, setMateriaToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [materiaToEdit, setMateriaToEdit] = useState(null);
  const [nuevoNombreMateria, setNuevoNombreMateria] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- Funciones para Editar ---
  const handleShowEditModal = (materia) => {
    setMateriaToEdit(materia);
    setNuevoNombreMateria(materia.nombre);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setMateriaToEdit(null);
    setNuevoNombreMateria("");
  };

  const handleSaveChanges = async () => {
    if (!materiaToEdit || !nuevoNombreMateria || nuevoNombreMateria === materiaToEdit.nombre) {
      if (!nuevoNombreMateria) toast.warn("El nombre no puede estar vacío.");
      handleCloseEditModal();
      return;
    }
    setIsUpdating(true);
    try {
      // ¡NECESITAMOS CREAR ESTE ENDPOINT EN main.py!
      await apiFetch(`/api/materias/${materiaToEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: nuevoNombreMateria.toUpperCase() })
      });
      toast.success(`¡Materia "${materiaToEdit.nombre}" actualizada a "${nuevoNombreMateria.toUpperCase()}"!`);
      if (onDatosCambiados) onDatosCambiados();
      handleCloseEditModal();
    } catch (error) {
      toast.error(`Error al modificar: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShowDeleteModal = (materia) => {
    setMateriaToDelete(materia);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setMateriaToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!materiaToDelete) return;
    setIsDeleting(true);
    try {
      // ¡NECESITAMOS CREAR ESTE ENDPOINT EN main.py!
      await apiFetch(`/api/materias/${materiaToDelete.id}`, { method: 'DELETE' });
      toast.success(`¡Materia "${materiaToDelete.nombre}" borrada!`);
      if (onDatosCambiados) onDatosCambiados();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error(`Error al borrar: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  async function cargarMaterias() {
    setIsListLoading(true);
    try {
      const data = await apiFetch('/api/materias');
      setMaterias(data);
    } catch (error) {
      toast.error(`Error al cargar materias: ${error.message}`);
    }
    setIsListLoading(false);
  }

  useEffect(() => {
    cargarMaterias();
  }, [refreshKey]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombreMateria) {
      toast.warn("Por favor, ingresa un nombre para la materia.");
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch('/api/materias', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreMateria.toUpperCase() })
      });

      toast.success("¡Materia agregada con éxito!");
      setNombreMateria("");

      // 2. Llama a onDatosCambiados aquí
      if (onDatosCambiados) {
        onDatosCambiados();
      }
      // Opcional: puedes quitar cargarMaterias() si quieres que refreshKey lo haga
      // cargarMaterias();

    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // El return no necesita cambios respecto a la versión anterior
  return (
    <Card className="mt-3 shadow-sm border-0" style={{ width: '100%', maxWidth: '400px' }}>
      <Card.Body>
        <Card.Title>Agregar Nueva Materia</Card.Title>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="nombre-materia-form">
            <Form.Label>Nombre de la Materia:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: MATEMÁTICA"
              value={nombreMateria}
              onChange={(e) => setNombreMateria(e.target.value.toUpperCase())}
              disabled={isLoading}
            />
          </Form.Group>

          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" />
                <span className="ms-1">Guardando...</span>
              </>
            ) : (
              'Guardar Materia'
            )}
          </Button>
        </Form>

        <h4 className="mt-4">Materias Existentes:</h4>
        {isListLoading ? (
          <div className="text-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <ListGroup>
            {materias.length === 0 && <ListGroup.Item>No hay materias creadas.</ListGroup.Item>}
            {materias.map(materia => (
              <ListGroup.Item
                key={materia.id}
                // Quitamos justify-content-center, volvemos a space-between
                className="mb-2 p-3 border rounded shadow-sm d-flex justify-content-between align-items-center"
              >
                {/* Nombre y Badge a la izquierda */}
                <div>
                  <span className="fw-bold me-3">{materia.nombre}</span>
                  <Badge bg="info">Materia</Badge>
                </div>
                {/* Grupo de botones a la derecha */}
                <ButtonGroup size="sm">
                  <Button
                    variant="outline-primary"
                    onClick={() => handleShowEditModal(materia)}
                    title="Modificar Nombre"
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={() => handleShowDeleteModal(materia)}
                    title="Borrar Materia"
                  >
                    🗑️
                  </Button>
                </ButtonGroup>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>

      {/* --- Modal de Confirmación de Borrado --- */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Borrado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Seguro que quieres borrar la materia **"{materiaToDelete?.nombre}"**?
          <br />
          <small className="text-danger">Esta acción no se puede deshacer.</small>
          {/* TODO: Advertir sobre requisitos/horarios dependientes */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? <Spinner as="span" animation="border" size="sm" /> : 'Borrar'}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* --- Fin Modal Borrado --- */}

      {/* --- Modal de Edición --- */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Modificar Materia</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="edit-materia-nombre">
            <Form.Label>Nuevo nombre para "{materiaToEdit?.nombre}":</Form.Label>
            <Form.Control
              type="text"
              value={nuevoNombreMateria}
              onChange={(e) => setNuevoNombreMateria(e.target.value.toUpperCase())}
              disabled={isUpdating}
              placeholder="Escribe el nuevo nombre"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isUpdating || !nuevoNombreMateria}>
            {isUpdating ? <Spinner as="span" animation="border" size="sm" /> : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* --- Fin Modal Edición --- */}

    </Card> // Cierre del Card principal
  );
}

export default GestionMaterias;