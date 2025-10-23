// frontend/src/components/GestionProfesores.jsx (Refactorizado con Celdas Clickables)
import { useState } from 'react';
import GrillaDisponibilidad from './GrillaDisponibilidad';
import { Form, Button, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

const API_URL = "http://127.0.0.1:8000";

function GestionProfesores({ onDatosCambiados }) {
  const [nombreProfesor, setNombreProfesor] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. ¡NUEVO ESTADO! Aquí guardamos los slots seleccionados.
  // Usamos un Set para performance.
  const [selectedSlots, setSelectedSlots] = useState(new Set());

  // 2. NUEVA FUNCIÓN: Se la pasamos a la grilla "hija"
  // Se ejecuta CADA VEZ que el usuario hace clic en una celda.
  const handleSlotClick = (slotId) => {
    // Creamos una nueva copia del Set para que React detecte el cambio
    setSelectedSlots(prevSlots => {
      const newSlots = new Set(prevSlots);
      if (newSlots.has(slotId)) {
        newSlots.delete(slotId); // Si ya estaba, lo quita
      } else {
        newSlots.add(slotId); // Si no estaba, lo añade
      }
      return newSlots;
    });
  };

  // 3. Lógica de "leer" actualizada: ahora lee del estado.
  function leerDisponibilidad() {
    return Array.from(selectedSlots); // Convierte el Set en un Array
  }
  
  // 4. Lógica de "limpiar" actualizada: ahora limpia el estado.
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
      const response = await fetch(`${API_URL}/api/profesores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profesorData)
      });

      if (response.ok) {
        toast.success("¡Profesor guardado con éxito!");
        setNombreProfesor("");
        limpiarGrilla();
        if (onDatosCambiados) onDatosCambiados();
      } else {
        toast.error("Error al guardar el profesor.");
      }
    } catch (error) {
      toast.error("Error de red al guardar el profesor.");
    }
    
    setIsLoading(false);
  }

  return (
    <Card className="mt-3">
      <Card.Body>
        <Card.Title>Gestión de Profesores</Card.Title>
        <Form onSubmit={handleSubmit}>
          {/* ... (el Form.Group del nombre no cambia) ... */}
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
          
          {/* 5. Pasamos el estado y la función handler a la grilla */}
          <GrillaDisponibilidad 
            selectedSlots={selectedSlots}
            onSlotClick={handleSlotClick}
          />
          
          {/* ... (el Button de guardar no cambia) ... */}
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