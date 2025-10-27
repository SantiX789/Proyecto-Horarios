// frontend/src/components/GestionCursos.jsx

import { useState, useEffect } from 'react';
import { Form, Button, ListGroup, Card, Spinner, Modal, InputGroup, ButtonGroup } from 'react-bootstrap'; // Añade Modal, InputGroup, ButtonGroup
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService'; // Make sure this path is correct

// 1. Make sure the component receives 'onDatosCambiados'
function GestionCursos({ refreshKey, onDatosCambiados }) {
  const [cursos, setCursos] = useState([]);
  const [nombreCurso, setNombreCurso] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cursoToDelete, setCursoToDelete] = useState(null); // Guarda el {id, nombre} del curso a borrar
  const [showEditModal, setShowEditModal] = useState(false);
  const [cursoToEdit, setCursoToEdit] = useState(null); // Guarda el {id, nombre} del curso a editar
  const [nuevoNombreCurso, setNuevoNombreCurso] = useState(""); // Para el input de edición
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleShowDeleteModal = (curso) => {
    setCursoToDelete(curso);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setCursoToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!cursoToDelete) return;
    setIsDeleting(true);
    try {
      // Llamamos al endpoint DELETE que creamos en main.py
      await apiFetch(`/api/cursos/${cursoToDelete.id}`, { method: 'DELETE' });
      toast.success(`¡Curso "${cursoToDelete.nombre}" borrado!`);
      if (onDatosCambiados) onDatosCambiados(); // Refrescar listas
      handleCloseDeleteModal(); // Cerrar modal
    } catch (error) {
      toast.error(`Error al borrar: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Funciones para Editar ---
  const handleShowEditModal = (curso) => {
    setCursoToEdit(curso);
    setNuevoNombreCurso(curso.nombre); // Pre-llenar input con nombre actual
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setCursoToEdit(null);
    setNuevoNombreCurso("");
  };

  const handleSaveChanges = async () => {
    if (!cursoToEdit || !nuevoNombreCurso || nuevoNombreCurso === cursoToEdit.nombre) {
      // Si no hay cambio o el nombre está vacío, simplemente cierra
      if (!nuevoNombreCurso) toast.warn("El nombre no puede estar vacío.");
      handleCloseEditModal();
      return;
    }
    setIsUpdating(true);
    try {
      // Llamamos al endpoint PUT que creamos en main.py
      await apiFetch(`/api/cursos/${cursoToEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: nuevoNombreCurso.toUpperCase() }) // Enviamos el nuevo nombre (en mayúsculas)
      });
      toast.success(`¡Curso "${cursoToEdit.nombre}" actualizado a "${nuevoNombreCurso.toUpperCase()}"!`);
      if (onDatosCambiados) onDatosCambiados(); // Refrescar listas
      handleCloseEditModal(); // Cerrar modal
    } catch (error) {
      // El backend ya valida nombre duplicado (409)
      toast.error(`Error al modificar: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  async function cargarCursos() {
    setIsListLoading(true);
    try {
      const data = await apiFetch('/api/cursos');
      setCursos(data);
    } catch (error) {
      console.error("Error de red:", error);
      toast.error(`Error al cargar cursos: ${error.message}`);
    }
    setIsListLoading(false);
  }

  useEffect(() => {
    cargarCursos();
  }, [refreshKey]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombreCurso) {
      toast.warn("Por favor, ingresa un nombre para el curso.");
      return;
    }

    setIsLoading(true);

    try {
      await apiFetch('/api/cursos', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreCurso.toUpperCase() })
      });

      toast.success("¡Curso agregado con éxito!");
      setNombreCurso("");

      // 2. LLAMA a onDatosCambiados AQUÍ, después del éxito
      if (onDatosCambiados) {
        onDatosCambiados();
      }
      // Ya no necesitas llamar a cargarCursos() aquí,
      // porque el cambio en refreshKey lo hará automáticamente.

    } catch (error) {
      // Maneja el error específico de nombre duplicado (409 Conflict)
      if (error.status === 409) {
        toast.error(`Error al guardar: ${error.message}`);
      } else {
        toast.error(`Error inesperado al guardar: ${error.message}`);
      }
      console.error("Error al guardar curso:", error); // Loguea el error completo
    } finally {
      // Asegúrate de que setIsLoading(false) esté en un bloque finally
      // para que se ejecute incluso si hay un error.
      setIsLoading(false);
    }
  }

  // ... (el resto del componente y el return no cambian) ...
  return (
    <Card className="mt-3 shadow-sm border-0" style={{ width: '100%', maxWidth: '400px' }}>
      <Card.Body>
        <Card.Title>Agregar Nuevo Curso</Card.Title>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="nombre-curso-form">
            <Form.Label>Nombre del Curso:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: 1°AÑO"
              value={nombreCurso}
              onChange={(e) => setNombreCurso(e.target.value.toUpperCase())}
              disabled={isLoading}
            />
          </Form.Group>

          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-1">Guardando...</span>
              </>
            ) : (
              'Guardar Curso'
            )}
          </Button>
        </Form>

        <h4 className="mt-4">Cursos Existentes:</h4>
        {isListLoading ? (
          <div className="text-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <ListGroup> {/* Quita variant="flush" si lo tenías */}
            {cursos.length === 0 && <ListGroup.Item>No hay cursos creados.</ListGroup.Item>}
            {cursos.map(curso => (
              <ListGroup.Item
                key={curso.id}
                className="d-flex justify-content-between align-items-center" // Flexbox para alinear botones
              >
                <span className="text-center flex-grow-1">{curso.nombre}</span> {/* texto centrado y ocupa espacio */}
                <ButtonGroup size="sm"> {/* Agrupa los botones */}
                  <Button
                    variant="outline-primary"
                    onClick={() => handleShowEditModal(curso)} // Llama a función para abrir modal de editar
                    title="Modificar Nombre"
                  >
                    ✏️ {/* Emoji de lápiz */}
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={() => handleShowDeleteModal(curso)} // Llama a función para abrir modal de borrar
                    title="Borrar Curso"
                  >
                    🗑️ {/* Emoji de papelera */}
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
          ¿Seguro que quieres borrar el curso **"{cursoToDelete?.nombre}"**?
          <br />
          <small className="text-danger">Esta acción no se puede deshacer.</small>
          {/* TODO: Advertir sobre requisitos/horarios dependientes si implementamos esa lógica */}
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
          <Modal.Title>Modificar Curso</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="edit-curso-nombre">
            <Form.Label>Nuevo nombre para "{cursoToEdit?.nombre}":</Form.Label>
            <Form.Control
              type="text"
              value={nuevoNombreCurso}
              onChange={(e) => setNuevoNombreCurso(e.target.value.toUpperCase())} // Auto mayúsculas
              disabled={isUpdating}
              placeholder="Escribe el nuevo nombre"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isUpdating || !nuevoNombreCurso}>
            {isUpdating ? <Spinner as="span" animation="border" size="sm" /> : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* --- Fin Modal Edición --- */}

    </Card> // Cierre del Card principal
  );
}

export default GestionCursos;