// frontend/src/components/GestionMaterias.jsx (Refactorizado)
import { useState, useEffect } from 'react';

// 1. Importamos los componentes de Bootstrap y Toastify
import { Form, Button, ListGroup, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

const API_URL = "http://127.0.0.1:8000";

function GestionMaterias({ refreshKey }) {
  const [materias, setMaterias] = useState([]);
  const [nombreMateria, setNombreMateria] = useState("");

  // 2. Estados de carga (UX)
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);

  async function cargarMaterias() {
    setIsListLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/materias`);
      if (response.ok) {
        setMaterias(await response.json());
      } else {
        toast.error("Error al cargar lista de materias.");
      }
    } catch (error) {
      toast.error("Error de red al cargar materias.");
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
      const response = await fetch(`${API_URL}/api/materias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreMateria })
      });

      if (response.ok) {
        toast.success("¡Materia agregada con éxito!");
        setNombreMateria("");
        cargarMaterias();
      } else {
        toast.error("Error al guardar la materia.");
      }
    } catch (error) {
      toast.error("Error de red al guardar la materia.");
    }
    
    setIsLoading(false);
  }

  // 3. Usamos los nuevos componentes de React-Bootstrap
  return (
    <Card style={{ width: '100%', maxWidth: '400px' }}>
      <Card.Body>
        <Card.Title>Gestión de Materias</Card.Title>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="nombre-materia-form">
            <Form.Label>Nombre de la Materia:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Matemática"
              value={nombreMateria}
              onChange={(e) => setNombreMateria(e.target.value)}
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
          <ListGroup variant="flush">
            {materias.length === 0 && <ListGroup.Item>No hay materias creadas.</ListGroup.Item>}
            {materias.map(materia => (
              <ListGroup.Item key={materia.id}>
                {materia.nombre}
                <span className="text-muted ms-2" style={{fontSize: '0.8em'}}>(ID: {materia.id})</span>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}

export default GestionMaterias;