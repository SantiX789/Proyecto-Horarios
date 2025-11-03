// frontend/src/components/GestionPreferencias.jsx
import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';
import GrillaDisponibilidad from './GrillaDisponibilidad'; // ¡Reutilizamos la grilla!

function GestionPreferencias({ refreshKey }) {
  // Estado para los slots seleccionados (los que marcamos como almuerzo)
  const [almuerzoSlots, setAlmuerzoSlots] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Cargar las preferencias guardadas al montar
  async function cargarPreferencias() {
    setIsLoading(true);
    try {
      // Llamamos al endpoint GET que creamos
      const data = await apiFetch('/api/preferencias');
      // Convertimos la lista de IDs (ej: ["Lunes-12:20"]) en un Set
      setAlmuerzoSlots(new Set(data.almuerzo_slots || []));
    } catch (error) {
      toast.error(`Error al cargar preferencias: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Cargar al montar y cuando refreshKey cambie (por si otra cosa las afecta)
  useEffect(() => {
    cargarPreferencias();
  }, [refreshKey]);

  // 2. Handler para cuando se hace clic en una celda de la grilla
  const handleSlotClick = (slotId) => {
    setAlmuerzoSlots(prevSlots => {
      const newSlots = new Set(prevSlots);
      if (newSlots.has(slotId)) {
        newSlots.delete(slotId); // Si ya estaba, lo quita
      } else {
        newSlots.add(slotId); // Si no estaba, lo añade
      }
      return newSlots;
    });
  };

  // 3. Handler para guardar los cambios
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Convertimos el Set de vuelta a un array para enviarlo como JSON
      const preferenciasData = {
        almuerzo_slots: Array.from(almuerzoSlots)
      };
      
      // Llamamos al endpoint PUT que creamos
      await apiFetch('/api/preferencias', {
        method: 'PUT',
        body: JSON.stringify(preferenciasData)
      });
      
      toast.success("¡Preferencias de almuerzo guardadas!");
    } catch (error) {
      toast.error(`Error al guardar preferencias: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Renderizado ---
  return (
    <Card className="mt-3 shadow-sm border-0">
      <Card.Body>
        <Card.Title>Gestión de Horarios Preferentes (Almuerzo)</Card.Title>
        <Card.Text>
          Selecciona los bloques horarios que el sistema debe **evitar** usar (ej. hora de almuerzo).
          <br/>
          <small className="text-muted">
            El sistema solo usará estos huecos si es la única forma de completar el horario.
          </small>
        </Card.Text>

        {isLoading ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : (
          // 4. Reutilizamos la grilla, pasándole los slots de almuerzo
          <GrillaDisponibilidad
            selectedSlots={almuerzoSlots}
            onSlotClick={handleSlotClick}
          />
        )}
        
        <Button 
          variant="primary" 
          onClick={handleSaveChanges} 
          disabled={isLoading || isSaving}
          className="mt-3 w-100"
        >
          {isSaving ? <Spinner as="span" animation="border" size="sm" /> : 'Guardar Preferencias de Almuerzo'}
        </Button>

      </Card.Body>
    </Card>
  );
}

export default GestionPreferencias;