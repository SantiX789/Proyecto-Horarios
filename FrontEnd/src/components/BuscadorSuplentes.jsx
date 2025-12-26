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
    <div className="mt-2 container" style={{ maxWidth: '100%' }}>
      {/* Quitamos la Card de Bootstrap para que se integre mejor en tu Dashboard */}
      <div className="bg-white">
          <Form onSubmit={handleBuscar} className="row g-3 align-items-end">
            
            <div className="col-md-5">
                {/* CORRECCIÓN AQUÍ: className en lugar de atributo suelto */}
                <Form.Label className="fw-bold text-secondary small text-uppercase">Día</Form.Label>
                <Form.Select className="form-select" value={dia} onChange={(e) => setDia(e.target.value)}>
                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                </Form.Select>
            </div>

            <div className="col-md-5">
                {/* CORRECCIÓN AQUÍ TAMBIÉN */}
                <Form.Label className="fw-bold text-secondary small text-uppercase">Hora de Inicio</Form.Label>
                <Form.Select className="form-select" value={hora} onChange={(e) => setHora(e.target.value)}>
                    {HORAS_INICIO.map(h => <option key={h} value={h}>{h}</option>)}
                </Form.Select>
            </div>

            <div className="col-md-2">
                {/* Usamos tu clase btn-teal para consistencia visual */}
                <button 
                    className="btn btn-teal w-100" 
                    type="submit" 
                    disabled={isLoading}
                >
                    {isLoading ? <Spinner animation="border" size="sm"/> : <span><i className="fa-solid fa-magnifying-glass me-2"></i>Buscar</span>}
                </button>
            </div>
          </Form>

          {busquedaRealizada && (
            <div className="mt-4 animate-fade-in">
                <h6 className="text-secondary mb-3 fw-bold small text-uppercase">
                    <i className="fa-solid fa-list-check me-2"></i>Resultados para {dia} {hora}hs
                </h6>
                
                {resultados.length > 0 ? (
                    <ListGroup variant="flush" className="border rounded">
                        {resultados.map(p => (
                            <ListGroup.Item key={p.id} className="d-flex justify-content-between align-items-center p-3">
                                <div>
                                    <span className="fw-bold text-dark d-block">{p.nombre}</span>
                                    <span className="small text-muted">Legajo/DNI: {p.dni || '-'}</span>
                                </div>
                                <Badge bg="success" className="px-3 py-2 rounded-pill">
                                    <i className="fa-solid fa-check me-1"></i> Disponible
                                </Badge>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                ) : (
                    <div className="alert alert-warning border-0 d-flex align-items-center" role="alert">
                        <i className="fa-solid fa-triangle-exclamation me-2 fa-lg"></i>
                        <div>
                            <strong>Sin resultados.</strong> No hay profesores disponibles en este horario.
                        </div>
                    </div>
                )}
            </div>
          )}
      </div>
    </div>
  );
}

export default BuscadorSuplentes;