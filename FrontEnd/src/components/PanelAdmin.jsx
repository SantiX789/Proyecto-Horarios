// frontend/src/components/PanelAdmin.jsx (Refactorizado)
import { useState } from 'react';
// 1. Importamos los componentes
import { Button, Card, Spinner, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';

const API_URL = "http://127.0.0.1:8000";

function PanelAdmin( { curso, onDatosCambiados } ) {
  // 2. Estado de carga (UX)
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleBorrarHorarios() {
    if (!curso) {
      toast.warn("Por favor, selecciona un curso primero.");
      return;
    }
    if (!confirm(`¿Estás seguro de que quieres borrar todos los horarios del curso ${curso}?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/horarios/${curso}`, { method: 'DELETE' });
      const result = await response.json();

      if (response.ok) {
        toast.success(result.mensaje);
        onDatosCambiados(); // Avisamos a App.jsx
      } else {
        toast.error(result.mensaje);
      }
    } catch (error) {
      toast.error("Error de red al borrar el horario.");
    }
    setIsDeleting(false);
  }

  function handleDescargarExcel() {
    // Esta acción es una descarga directa, no necesita spinner
    toast.info("Preparando descarga de Excel...");
    window.location.href = `${API_URL}/api/export/excel`;
  }
  
  // 3. Usamos los nuevos componentes
  return (
    <Card className="mt-3">
      <Card.Body>
        <Card.Title>Acciones Administrativas</Card.Title>
        <ButtonGroup className="w-100">
          <Button 
            variant="danger" 
            onClick={handleBorrarHorarios}
            disabled={isDeleting || !curso}
          >
            {isDeleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" />
                <span className="ms-1">Borrando...</span>
              </>
            ) : (
              'Borrar Horarios del Curso'
            )}
          </Button>
          
          <Button variant="success" onClick={handleDescargarExcel}>
            Descargar Excel
          </Button>
        </ButtonGroup>
      </Card.Body>
    </Card>
  )
}

export default PanelAdmin;