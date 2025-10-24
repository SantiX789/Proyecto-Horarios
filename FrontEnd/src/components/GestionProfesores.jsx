// frontend/src/components/GestionProfesores.jsx (Refactorizado)
import { useState } from 'react';
import GrillaDisponibilidad from './GrillaDisponibilidad';
import { Form, Button, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

// 1. Importamos el servicio
import { apiFetch } from '../apiService';

function GestionProfesores({ onDatosCambiados }) {
  const [nombreProfesor, setNombreProfesor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set());

  const handleSlotClick = (slotId) => {
    setSelectedSlots(prevSlots => {
      const newSlots = new Set(prevSlots);
      if (newSlots.has(slotId)) {
        newSlots.delete(slotId);
      } else {
        newSlots.add(slotId);
      }
      return newSlots;
    });
  };

  function leerDisponibilidad() {
    return Array.from(selectedSlots);
  }
  
  function limpiarGrilla() {
    setSelectedSlots(new Set());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombreProfesor) {
      toast.warn("Por favor, ingresa un nombre para el profesor.");
      return;
    }
    const disponibilidad = leerDisponibilidad();
    if (disponibilidad.length === 0) {
      toast.warn("Por favor, selecciona al menos un bloque de disponibilidad.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const profesorData = { nombre: nombreProfesor, disponibilidad: disponibilidad };
      
      // 2. Usamos apiFetch
      await apiFetch('/api/profesores', {
        method: 'POST',
        body: JSON.stringify(profesorData)
      });

      toast.success("¡Profesor guardado con éxito!");
      setNombreProfesor("");
      limpiarGrilla();
      if (onDatosCambiados) onDatosCambiados();
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    }
    
    setIsLoading(false);
  }

  return (
    <Card className="mt-3 shadow-sm border-0">
      <Card.Body>
        <Card.Title>Gestión de Profesores (Cuadro 1)</Card.Title>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="nombre-profesor-form">
            <Form.Label>Nombre del Profesor:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Nombre Apellido"
              value={nombreProfesor}
              onChange={(e) => setNombreProfesor(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
          
          <p>Selecciona la disponibilidad horaria del profesor (haz clic en las celdas):</p>
          
          <GrillaDisponibilidad 
            selectedSlots={selectedSlots}
            onSlotClick={handleSlotClick}
          />
          
          <Button variant="primary" type="submit" disabled={isLoading} className="mt-3">
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" />
                <span className="ms-1">Guardando...</span>
              </>
            ) : (
              'Guardar Profesor'
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default GestionProfesores;