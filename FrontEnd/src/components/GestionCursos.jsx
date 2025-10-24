// frontend/src/components/GestionCursos.jsx (Corregido)

// 1. Solo importamos lo que SÍ usamos:
import { useState, useEffect } from 'react';
import { Form, Button, ListGroup, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

// 2. NO hay imports de TablaHorario, PanelAdmin, etc.

const API_URL = "http://127.0.0.1:8000";

function GestionCursos({ refreshKey }) {
  const [cursos, setCursos] = useState([]);
  const [nombreCurso, setNombreCurso] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);

  async function cargarCursos() {
    setIsListLoading(true);
    try {
      // Reemplazamos fetch por apiFetch
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
      // Reemplazamos fetch por apiFetch
      await apiFetch('/api/cursos', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreCurso.toUpperCase() }) // (Tu lógica de mayúsculas)
      });
      
      toast.success("¡Curso agregado con éxito!");
      setNombreCurso("");
      cargarCursos();
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    }
    
    setIsLoading(false);
  }

  // El resto del código es el mismo...
  return (
    <Card style={{ width: '100%', maxWidth: '400px' }}>
      <Card.Body>
        <Card.Title>Gestión de Cursos</Card.Title>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="nombre-curso-form">
            <Form.Label>Nombre del Curso:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: 1A"
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
          <ListGroup variant="flush">
            {cursos.length === 0 && <ListGroup.Item>No hay cursos creados.</ListGroup.Item>}
            {cursos.map(curso => (
              <ListGroup.Item key={curso.id} className="text-center">
                {curso.nombre}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}

export default GestionCursos;