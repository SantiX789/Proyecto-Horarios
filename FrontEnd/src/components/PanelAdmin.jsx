// frontend/src/components/PanelAdmin.jsx (Refactorizado)
import { useState } from 'react';
import { Button, Card, Spinner, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';

// 1. Importamos el servicio
import { apiFetch } from '../apiService';

const API_URL = "http://127.0.0.1:8000"; // (Solo lo usamos para el Excel)

function PanelAdmin( { curso, onDatosCambiados } ) {
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
      // 2. Usamos apiFetch
      const result = await apiFetch(`/api/horarios/${curso}`, { 
        method: 'DELETE' 
      });

      toast.success(result.mensaje);
      onDatosCambiados();
    } catch (error) {
      toast.error(`Error al borrar: ${error.message}`);
    }
    setIsDeleting(false);
  }

  function handleDescargarExcel() {
    toast.info("Preparando descarga de Excel...");
    // 3. El Excel no usa apiFetch porque es una descarga de archivo
    // y no devuelve JSON. Lo dejamos como está.
    window.location.href = `${API_URL}/api/export/excel`;
  }
  
  return (
    <Card className="mt-3 shadow-sm border-0">
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