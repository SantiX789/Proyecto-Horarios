import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function Configuracion() {
  const [publicado, setPublicado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    cargarEstado();
  }, []);

  async function cargarEstado() {
    try {
      const data = await apiFetch('/api/config/publicacion-status');
      setPublicado(data.publicado);
    } catch (error) {
      console.error(error);
    }
  }

  const togglePublicacion = async () => {
    const nuevoEstado = !publicado;
    setPublicado(nuevoEstado); // UI Optimista
    try {
      await apiFetch(`/api/config/publicacion-status?publicado=${nuevoEstado}`, {
        method: 'POST'
      });
      if (nuevoEstado) toast.success("✅ Horarios PUBLICADOS (Visibles para profesores)");
      else toast.info("🔒 Horarios OCULTOS (Modo Borrador)");
    } catch (error) {
      setPublicado(!nuevoEstado); // Revertir si falla
      toast.error("Error al cambiar estado");
    }
  };

  const handleResetHorarios = async () => {
    setIsLoading(true);
    try {
      await apiFetch('/api/admin/reset-horarios', { method: 'DELETE' });
      toast.success("🗑️ Se han eliminado todos los horarios.");
      setShowModal(false);
    } catch (error) {
      toast.error("Error al resetear horarios.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-4 text-secondary">⚙️ Configuración del Sistema</h3>

      {/* TARJETA 1: VISIBILIDAD */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white fw-bold">
          👁️ Visibilidad de Horarios
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-1">Estado: {publicado ? <span className="text-success fw-bold">PÚBLICO</span> : <span className="text-danger fw-bold">PRIVADO</span>}</h5>
              <p className="text-muted mb-0 small">
                Si está <strong>Privado</strong>, los profesores verán su grilla vacía aunque existan datos.
                Úsalo mientras generas y ajustas los horarios.
              </p>
            </div>
            <Form.Check 
              type="switch"
              id="custom-switch"
              style={{ fontSize: '1.5rem' }}
              checked={publicado}
              onChange={togglePublicacion}
            />
          </div>
        </Card.Body>
      </Card>

      {/* TARJETA 2: ZONA DE PELIGRO */}
      <Card className="shadow-sm border-danger">
        <Card.Header className="bg-danger text-white fw-bold">
          ☢️ Zona de Peligro
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <strong>Atención:</strong> Estas acciones son destructivas y no se pueden deshacer.
          </Alert>
          
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
            <div>
              <strong>Limpiar Grilla de Horarios</strong>
              <p className="text-muted mb-0 small">
                Elimina todas las asignaciones generadas. Mantiene profesores, materias y aulas intactos.
                Útil para empezar un nuevo cuatrimestre.
              </p>
            </div>
            <Button variant="outline-danger" onClick={() => setShowModal(true)}>
              🗑️ Eliminar Todos los Horarios
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* MODAL CONFIRMACIÓN */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>¿Estás seguro?</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <h4>⚠️ Vas a borrar TODOS los horarios</h4>
          <p className="text-muted">
            Esta acción dejará todas las grillas en blanco.<br/>
            Los cursos, profesores y materias <strong>NO</strong> se borrarán.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleResetHorarios} disabled={isLoading}>
            {isLoading ? <Spinner size="sm"/> : 'Sí, Borrar Todo'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Configuracion;