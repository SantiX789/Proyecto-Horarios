// FrontEnd/src/components/GestionPreferencias.jsx
import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

const HORARIOS = [
  "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
  "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
  "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
  "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
  "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function GestionPreferencias({ refreshKey }) {
  const [almuerzoSlots, setAlmuerzoSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar preferencias al iniciar
  useEffect(() => {
    cargarPreferencias();
  }, [refreshKey]);

  async function cargarPreferencias() {
    try {
      const data = await apiFetch('/api/config/preferencias');
      if (data.almuerzo_slots) {
        setAlmuerzoSlots(data.almuerzo_slots);
      }
    } catch (error) {
      console.error("Error cargando preferencias:", error);
    }
  }

  const toggleSlot = (dia, hora) => {
    const slotId = `${dia}-${hora}`; // Formato: "Lunes-12:20 a 13:00"
    if (almuerzoSlots.includes(slotId)) {
      setAlmuerzoSlots(almuerzoSlots.filter(s => s !== slotId));
    } else {
      setAlmuerzoSlots([...almuerzoSlots, slotId]);
    }
  };

  const guardarCambios = async () => {
    setIsLoading(true);
    try {
      await apiFetch('/api/config/preferencias', {
        method: 'POST',
        body: JSON.stringify({ almuerzo_slots: almuerzoSlots })
      });
      toast.success("Horarios de almuerzo actualizados. El generador intentará evitarlos.");
    } catch (error) {
      toast.error("Error al guardar preferencias.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-warning text-dark fw-bold">
        🍽️ Gestión de Almuerzos (Franjas a Evitar)
      </Card.Header>
      <Card.Body>
        <p className="text-muted small">
          Selecciona los casilleros que corresponden al recreo o almuerzo general. 
          El algoritmo intentará NO asignar clases en estos horarios.
        </p>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table table-bordered table-sm text-center" style={{ fontSize: '0.8rem' }}>
            <thead className="table-light sticky-top">
                <tr>
                <th>Hora / Día</th>
                {DIAS.map(d => <th key={d}>{d}</th>)}
                </tr>
            </thead>
            <tbody>
                {HORARIOS.map(hora => (
                <tr key={hora}>
                    <td className="fw-bold bg-light">{hora}</td>
                    {DIAS.map(dia => {
                    const isActive = almuerzoSlots.includes(`${dia}-${hora}`);
                    return (
                        <td 
                        key={`${dia}-${hora}`} 
                        className={isActive ? "bg-danger" : ""}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleSlot(dia, hora)}
                        >
                        {isActive ? "ALMUERZO" : "-"}
                        </td>
                    );
                    })}
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        <div className="d-grid mt-3">
            <Button variant="primary" onClick={guardarCambios} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Configuración de Almuerzos"}
            </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default GestionPreferencias;