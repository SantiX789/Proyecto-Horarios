// FrontEnd/src/components/GestionAulas.jsx (Versión con Capacidad)
import { useState, useEffect } from 'react';
import { Table, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GestionAulas({ refreshKey, onDatosCambiados }) {
  const [aulas, setAulas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Estados del Formulario
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("Normal");
  const [capacidad, setCapacidad] = useState(30); // <--- NUEVO CAMPO
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    cargarAulas();
  }, [refreshKey]);

  async function cargarAulas() {
    try {
      const data = await apiFetch('/api/aulas');
      setAulas(data);
    } catch (error) {
      console.error("Error cargando aulas:", error);
    }
  }

  const handleShow = (aula = null) => {
    if (aula) {
      setEditingId(aula.id);
      setNombre(aula.nombre);
      setTipo(aula.tipo || "Normal");
      setCapacidad(aula.capacidad || 30); // Cargar capacidad existente
    } else {
      setEditingId(null);
      setNombre("");
      setTipo("Normal");
      setCapacidad(30); // Valor por defecto
    }
    setShowModal(true);
  };

  const handleClose = () => setShowModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const payload = { 
        nombre, 
        tipo,
        capacidad: parseInt(capacidad) // Asegurar que sea número
    };

    try {
      if (editingId) {
        await apiFetch(`/api/aulas/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success("Aula actualizada");
      } else {
        await apiFetch('/api/aulas', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success("Aula creada");
      }
      handleClose();
      cargarAulas();
      if (onDatosCambiados) onDatosCambiados();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar este aula?")) return;
    try {
      await apiFetch(`/api/aulas/${id}`, { method: 'DELETE' });
      toast.success("Aula eliminada");
      cargarAulas();
      if (onDatosCambiados) onDatosCambiados();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">🏫 Aulas Disponibles</h5>
        <Button variant="primary" size="sm" onClick={() => handleShow()}>
          + Nueva Aula
        </Button>
      </div>
      <div className="card-body p-0">
        <Table striped hover responsive className="mb-0 text-center">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Capacidad</th> {/* Columna Nueva */}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {aulas.map((a) => (
              <tr key={a.id}>
                <td>{a.nombre}</td>
                <td>
                    <span className={`badge ${a.tipo === 'Normal' ? 'bg-secondary' : 'bg-info'}`}>
                        {a.tipo}
                    </span>
                </td>
                <td>
                    <strong>{a.capacidad}</strong> alumnos
                </td>
                <td>
                  <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShow(a)}>
                    ✏️
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(a.id)}>
                    🗑️
                  </Button>
                </td>
              </tr>
            ))}
            {aulas.length === 0 && (
              <tr>
                <td colSpan="4" className="text-muted py-3">No hay aulas cargadas.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Modal Crear/Editar */}
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Editar Aula' : 'Nueva Aula'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del Aula</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Ej: Aula 101, Laboratorio B..." 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tipo de Aula</Form.Label>
              <Form.Select 
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="Normal">Normal (Pizarrón y pupitres)</option>
                <option value="Laboratorio">Laboratorio / Informática</option>
                <option value="Taller">Taller / Arte</option>
                <option value="Gimnasio">Gimnasio / Patio</option>
              </Form.Select>
            </Form.Group>

            {/* --- AQUÍ ESTÁ EL CAMPO QUE FALTABA --- */}
            <Form.Group className="mb-3">
              <Form.Label>Capacidad Máxima (Alumnos)</Form.Label>
              <Form.Control 
                type="number" 
                min="1"
                placeholder="Ej: 30"
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                El sistema evitará asignar cursos con más alumnos que este número.
              </Form.Text>
            </Form.Group>

          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" animation="border"/> : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default GestionAulas;