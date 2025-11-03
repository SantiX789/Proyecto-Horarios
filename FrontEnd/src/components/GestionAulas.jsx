// frontend/src/components/GestionAulas.jsx
import React, { useState, useEffect } from 'react';
import { Form, Button, ListGroup, Card, Spinner, Modal, InputGroup, ButtonGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

// Tipos de aula predefinidos
const TIPOS_AULA = ["Normal", "Laboratorio", "Gimnasio", "Sala de Informática", "Taller", "Otro"];

function GestionAulas({ refreshKey, onDatosCambiados }) {
  // Estados para lista y formulario de añadir
  const [aulas, setAulas] = useState([]);
  const [nombreAula, setNombreAula] = useState("");
  const [tipoAula, setTipoAula] = useState(TIPOS_AULA[0]); // Default "Normal"
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);

  // Estados para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aulaToDelete, setAulaToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [aulaToEdit, setAulaToEdit] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState(TIPOS_AULA[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- Carga de Aulas ---
  async function cargarAulas() {
    setIsListLoading(true);
    try {
      const data = await apiFetch('/api/aulas');
      setAulas(data);
    } catch (error) {
      toast.error(`Error al cargar aulas: ${error.message}`);
    }
    setIsListLoading(false);
  }

  useEffect(() => {
    cargarAulas();
  }, [refreshKey]);

  // --- Lógica Formulario Añadir ---
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!nombreAula || !tipoAula) {
      toast.warn("Completa todos los campos.");
      return;
    }
    setIsLoading(true);
    try {
      await apiFetch('/api/aulas', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreAula, tipo: tipoAula })
      });
      toast.success("¡Aula guardada!");
      setNombreAula("");
      setTipoAula(TIPOS_AULA[0]);
      if (onDatosCambiados) onDatosCambiados();
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lógica Borrar ---
  const handleShowDeleteModal = (aula) => { setAulaToDelete(aula); setShowDeleteModal(true); };
  const handleCloseDeleteModal = () => { setShowDeleteModal(false); setAulaToDelete(null); };
  const handleConfirmDelete = async () => {
    if (!aulaToDelete) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/aulas/${aulaToDelete.id}`, { method: 'DELETE' });
      toast.success(`¡Aula "${aulaToDelete.nombre}" borrada!`);
      if (onDatosCambiados) onDatosCambiados();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error(`Error al borrar: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Lógica Editar ---
  const handleShowEditModal = (aula) => {
    setAulaToEdit(aula);
    setEditNombre(aula.nombre);
    setEditTipo(aula.tipo);
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => { setShowEditModal(false); setAulaToEdit(null); };
  const handleSaveChanges = async () => {
    if (!aulaToEdit || !editNombre || !editTipo) {
      toast.warn("El nombre y tipo no pueden estar vacíos.");
      return;
    }
    if (editNombre === aulaToEdit.nombre && editTipo === aulaToEdit.tipo) {
      toast.info("No se realizaron cambios.");
      handleCloseEditModal();
      return;
    }
    setIsUpdating(true);
    try {
      await apiFetch(`/api/aulas/${aulaToEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: editNombre, tipo: editTipo })
      });
      toast.success(`¡Aula "${aulaToEdit.nombre}" actualizada!`);
      if (onDatosCambiados) onDatosCambiados();
      handleCloseEditModal();
    } catch (error) {
      toast.error(`Error al modificar: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Renderizado ---
  return (
    <Card className="mt-3 shadow-sm border-0" style={{ width: '100%', maxWidth: '400px' }}>
      <Card.Body>
        <Card.Title>Gestión de Aulas</Card.Title>
       
        <Form onSubmit={handleAddSubmit}>

          
          <Row className="align-items-baseline">

            
            <Col md={7}>
              <Form.Group className="mb-3" controlId="nombre-aula-form">
                <Form.Label>Nombre del Aula</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Aula 101, Laboratorio"
                  value={nombreAula}
                  onChange={(e) => setNombreAula(e.target.value)}
                  disabled={isLoading}
                />
              </Form.Group>
            </Col>

            
            <Col md={5}>
              <Form.Group className="mb-3" controlId="tipo-aula-form">
                <Form.Label>Tipo</Form.Label>
                <Form.Select
                  value={tipoAula}
                  onChange={(e) => setTipoAula(e.target.value)}
                  disabled={isLoading}
                >
                  {TIPOS_AULA.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

          </Row> 

          
          <Button variant="primary" type="submit" disabled={isLoading} className="w-100">
            {isLoading ? <Spinner size="sm" /> : 'Guardar Aula'}
          </Button>
        </Form>

        {/* Lista de Aulas Existentes */}
        <h4 className="mt-4">Aulas Existentes:</h4>
        {isListLoading ? (
          <div className="text-center"><Spinner /></div>
        ) : (
          <ListGroup>
            {aulas.length === 0 && <ListGroup.Item>No hay aulas creadas.</ListGroup.Item>}
            {aulas.map(aula => (
              <ListGroup.Item key={aula.id} className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="fw-bold me-2">{aula.nombre}</span>
                  <small className="text-muted">({aula.tipo})</small>
                </div>
                <ButtonGroup size="sm">
                  <Button variant="outline-primary" onClick={() => handleShowEditModal(aula)} title="Editar">✏️</Button>
                  <Button variant="outline-danger" onClick={() => handleShowDeleteModal(aula)} title="Borrar">🗑️</Button>
                </ButtonGroup>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>

      {/* --- Modales (Borrar y Editar) --- */}
      {/* Modal Borrar */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered size="sm">
        <Modal.Header closeButton><Modal.Title>Confirmar Borrado</Modal.Title></Modal.Header>
        <Modal.Body>
          ¿Seguro que quieres borrar el aula **"{aulaToDelete?.nombre}"**?
          {/* Advertencia si está en uso */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting}>Cancelar</Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>{isDeleting ? <Spinner size="sm" /> : 'Borrar'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Editar */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Modificar Aula</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="edit-aula-nombre">
            <Form.Label>Nombre:</Form.Label>
            <Form.Control type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} disabled={isUpdating} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="edit-aula-tipo">
            <Form.Label>Tipo:</Form.Label>
            <Form.Select value={editTipo} onChange={(e) => setEditTipo(e.target.value)} disabled={isUpdating}>
              {TIPOS_AULA.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal} disabled={isUpdating}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isUpdating || !editNombre}>
            {isUpdating ? <Spinner size="sm" /> : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}

export default GestionAulas;