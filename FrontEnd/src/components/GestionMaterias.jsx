// frontend/src/components/GestionMaterias.jsx (Refactorizado)
import { useState, useEffect } from 'react';
import { Form, Button, ListGroup, Card, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';

// 1. Importamos el servicio
import { apiFetch } from '../apiService';

const API_URL = "http://127.0.0.1:8000"; // (apiService ya lo usa, pero lo dejamos por si acaso)

function GestionMaterias({ refreshKey }) {
  const [materias, setMaterias] = useState([]);
  const [nombreMateria, setNombreMateria] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);

  async function cargarMaterias() {
    setIsListLoading(true);
    try {
      // 2. Usamos apiFetch
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
      // 3. Usamos apiFetch
      await apiFetch('/api/materias', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreMateria.toUpperCase() })
      });

      toast.success("¡Materia agregada con éxito!");
      setNombreMateria("");
      cargarMaterias();
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    }
    setIsLoading(false);
  }

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
                className="mb-2 p-3 border rounded shadow-sm d-flex justify-content-center align-items-center"
              >
                <span className="fw-bold me-3">{materia.nombre}</span>
                <Badge bg="info">Materia</Badge>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}

export default GestionMaterias;