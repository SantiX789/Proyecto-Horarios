// frontend/src/components/GestionCursos.jsx (Actualizado Fase 1)

import { useState, useEffect } from 'react';
import { Form, Button, ListGroup, Card, Spinner, Modal, Row, Col, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GestionCursos({ refreshKey, onDatosCambiados }) {
  const [cursos, setCursos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  
  // Estados para NUEVO curso (Fase 1)
  const [anio, setAnio] = useState("1° Año");
  const [division, setDivision] = useState("A");
  const [cantidadAlumnos, setCantidadAlumnos] = useState(30);

  // Estados para Modal Borrar
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cursoToDelete, setCursoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para Modal Editar
  const [showEditModal, setShowEditModal] = useState(false);
  const [cursoToEdit, setCursoToEdit] = useState(null);
  const [editAnio, setEditAnio] = useState("");
  const [editDivision, setEditDivision] = useState("");
  const [editCantidad, setEditCantidad] = useState(30);
  const [isUpdating, setIsUpdating] = useState(false);

  // Opciones predefinidas (puedes cambiarlas a gusto)
  const OPCIONES_ANIO = ["1° Año", "2° Año", "3° Año", "4° Año", "5° Año", "6° Año"];
  const OPCIONES_DIVISION = ["A", "B", "C", "D", "E", "Única"];

  // --- Cargar Lista ---
  async function cargarCursos() {
    setIsListLoading(true);
    try {
      const data = await apiFetch('/api/cursos');
      // data ahora trae: { anio, division, cantidad_alumnos, nombre_display, ... }
      setCursos(data);
    } catch (error) {
      console.error("Error:", error);
      toast.error(`Error al cargar cursos: ${error.message}`);
    }
    setIsListLoading(false);
  }

  useEffect(() => {
    cargarCursos();
  }, [refreshKey]);

  // --- Crear Curso ---
  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        anio: anio,
        division: division,
        cantidad_alumnos: parseInt(cantidadAlumnos)
      };

      await apiFetch('/api/cursos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast.success("¡Curso agregado con éxito!");
      // Resetear a valores por defecto
      setAnio("1° Año");
      setDivision("A");
      setCantidadAlumnos(30);

      if (onDatosCambiados) onDatosCambiados();

    } catch (error) {
      if (error.status === 409) {
        toast.error(`Error: Ya existe el curso ${anio} división ${division}.`);
      } else {
        toast.error(`Error al guardar: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // --- Borrar Curso ---
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
      await apiFetch(`/api/cursos/${cursoToDelete.id}`, { method: 'DELETE' });
      toast.success(`Curso eliminado.`);
      if (onDatosCambiados) onDatosCambiados();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error(`Error al borrar: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Editar Curso ---
  const handleShowEditModal = (curso) => {
    setCursoToEdit(curso);
    setEditAnio(curso.anio);
    setEditDivision(curso.division);
    setEditCantidad(curso.cantidad_alumnos);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setCursoToEdit(null);
  };

  const handleSaveChanges = async () => {
    if (!cursoToEdit) return;
    setIsUpdating(true);
    try {
      const payload = {
        anio: editAnio,
        division: editDivision,
        cantidad_alumnos: parseInt(editCantidad)
      };

      await apiFetch(`/api/cursos/${cursoToEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      toast.success(`Curso actualizado correctamente.`);
      if (onDatosCambiados) onDatosCambiados();
      handleCloseEditModal();
    } catch (error) {
      toast.error(`Error al modificar: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="mt-3 shadow-sm border-0" style={{ width: '100%', maxWidth: '500px' }}>
      <Card.Body>
        <Card.Title className="mb-3">Gestión de Cursos</Card.Title>
        
        {/* Formulario de Creación (Compacto) */}
        <Form onSubmit={handleSubmit} className="mb-4 p-3 bg-light rounded">
          <h6 className="text-muted mb-3">Nuevo Curso</h6>
          <Row className="g-2">
            <Col xs={5}>
              <Form.Group controlId="formAnio">
                <Form.Label style={{fontSize: '0.85rem'}}>Año</Form.Label>
                <Form.Select 
                  value={anio} 
                  onChange={(e) => setAnio(e.target.value)}
                  disabled={isLoading}
                  size="sm"
                >
                  {OPCIONES_ANIO.map(op => <option key={op} value={op}>{op}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={3}>
              <Form.Group controlId="formDiv">
                <Form.Label style={{fontSize: '0.85rem'}}>Div.</Form.Label>
                <Form.Select 
                  value={division} 
                  onChange={(e) => setDivision(e.target.value)} 
                  disabled={isLoading}
                  size="sm"
                >
                  {OPCIONES_DIVISION.map(op => <option key={op} value={op}>{op}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={4}>
              <Form.Group controlId="formCupo">
                <Form.Label style={{fontSize: '0.85rem'}}>Alumnos</Form.Label>
                <Form.Control 
                  type="number" 
                  value={cantidadAlumnos} 
                  onChange={(e) => setCantidadAlumnos(e.target.value)} 
                  disabled={isLoading}
                  size="sm"
                  min="1"
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-grid mt-3">
            <Button variant="primary" type="submit" disabled={isLoading} size="sm">
              {isLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Crear Curso'}
            </Button>
          </div>
        </Form>

        <h6 className="mt-4 text-muted">Listado de Cursos</h6>
        {isListLoading ? (
          <div className="text-center py-3"><Spinner animation="border" size="sm"/></div>
        ) : (
          <ListGroup variant="flush">
            {cursos.length === 0 && <div className="text-center text-muted small">No hay cursos cargados.</div>}
            
            {cursos.map(curso => (
              <ListGroup.Item key={curso.id} className="d-flex justify-content-between align-items-center py-2 px-0">
                <div>
                  {/* Usamos nombre_display que viene del backend o lo armamos */}
                  <div className="fw-bold text-dark">
                    {curso.nombre_display || `${curso.anio} "${curso.division}"`}
                  </div>
                  <small className="text-muted">
                    <i className="bi bi-people-fill me-1"></i>
                    {curso.cantidad_alumnos} alumnos
                  </small>
                </div>
                
                <ButtonGroup size="sm">
                  <Button variant="link" className="text-primary p-1" onClick={() => handleShowEditModal(curso)}>
                    ✏️
                  </Button>
                  <Button variant="link" className="text-danger p-1" onClick={() => handleShowDeleteModal(curso)}>
                    🗑️
                  </Button>
                </ButtonGroup>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>

      {/* Modal Borrar */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered size="sm">
        <Modal.Body className="text-center pt-4">
          <p>¿Borrar <strong>{cursoToDelete?.nombre_display}</strong>?</p>
          <div className="d-flex justify-content-center gap-2 mt-3">
            <Button variant="secondary" size="sm" onClick={handleCloseDeleteModal} disabled={isDeleting}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Borrando...' : 'Sí, Borrar'}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Modal Editar (Actualizado Fase 1) */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Curso</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col>
                <Form.Label>Año</Form.Label>
                <Form.Select value={editAnio} onChange={(e) => setEditAnio(e.target.value)}>
                   {OPCIONES_ANIO.map(op => <option key={op} value={op}>{op}</option>)}
                </Form.Select>
              </Col>
              <Col>
                <Form.Label>División</Form.Label>
                <Form.Select value={editDivision} onChange={(e) => setEditDivision(e.target.value)}>
                   {OPCIONES_DIVISION.map(op => <option key={op} value={op}>{op}</option>)}
                </Form.Select>
              </Col>
            </Row>
            <Form.Group>
              <Form.Label>Cantidad de Alumnos</Form.Label>
              <Form.Control 
                type="number" 
                value={editCantidad} 
                onChange={(e) => setEditCantidad(e.target.value)} 
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isUpdating}>
            {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

    </Card>
  );
}

export default GestionCursos;