// FrontEnd/src/components/BuscadorSuplentes.jsx
import { useState } from 'react';
import { Card, Form, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORAS_INICIO = [
  "07:00", "07:40", "08:20", "09:00", "09:40", "10:20", 
  "11:00", "11:40", "12:20", "13:00", "13:40", "14:20", 
  "15:00", "15:40", "16:20", "17:00", "17:40", "18:20", "19:00"
];

function BuscadorSuplentes() {
  const [dia, setDia] = useState("Lunes");
  const [hora, setHora] = useState("07:00");
  const [resultados, setResultados] = useState([]);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBuscar = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResultados([]);
    setBusquedaRealizada(false);

    try {
      const data = await apiFetch('/api/profesores/buscar-suplentes', {
        method: 'POST',
        body: JSON.stringify({ dia, hora_inicio: hora })
      });
      setResultados(data);
      setBusquedaRealizada(true);
    } catch (error) {
      toast.error("Error al buscar suplentes");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3 container" style={{ maxWidth: '600px' }}>
      <Card className="shadow-sm border-primary">
        <Card.Header className="bg-primary text-white fw-bold">
            🕵️‍♂️ Buscador de Suplentes
        </Card.Header>
        <Card.Body>
          <p className="text-muted small">
            Encuentra profesores que tienen disponibilidad y no están dando clase en el horario seleccionado.
          </p>
          
          <Form onSubmit={handleBuscar} className="d-flex gap-2 align-items-end">
            <Form.Group className="flex-grow-1">
                <Form.Label fw-bold>Día</Form.Label>
                <Form.Select value={dia} onChange={(e) => setDia(e.target.value)}>
                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                </Form.Select>
            </Form.Group>

            <Form.Group className="flex-grow-1">
                <Form.Label fw-bold>Hora de Inicio</Form.Label>
                <Form.Select value={hora} onChange={(e) => setHora(e.target.value)}>
                    {HORAS_INICIO.map(h => <option key={h} value={h}>{h}</option>)}
                </Form.Select>
            </Form.Group>

            <Button variant="primary" type="submit" disabled={isLoading} style={{ minWidth: '100px' }}>
                {isLoading ? <Spinner size="sm"/> : '🔍 Buscar'}
            </Button>
          </Form>

          <hr />

          {busquedaRealizada && (
            <div>
                <h6 className="text-secondary mb-3">
                    Resultados para <strong>{dia} {hora}hs</strong>:
                </h6>
                
                {resultados.length > 0 ? (
                    <ListGroup>
                        {resultados.map(p => (
                            <ListGroup.Item key={p.id} className="d-flex justify-content-between align-items-center">
                                <span className="fw-bold">👤 {p.nombre}</span>
                                <Badge bg="success" pill>Disponible</Badge>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                ) : (
                    <div className="alert alert-warning text-center">
                        😔 Nadie disponible en este horario.
                    </div>
                )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default BuscadorSuplentes;