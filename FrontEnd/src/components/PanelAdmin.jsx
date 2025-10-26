// frontend/src/components/PanelAdmin.jsx (Refactorizado)
import { useState } from 'react';
import { Button, Card, Spinner, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';
const TOKEN_KEY = "proyecto_horarios_token"; // La misma clave que en App.jsx

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

  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

async function handleDescargarExcel() {
    setIsDownloadingExcel(true); // Activar spinner
    toast.info("Preparando descarga de Excel...");

    try { // Apertura del TRY
      const response = await fetch(`${API_URL}/api/export/excel`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        }
      });

      if (!response.ok) {
        let errorDetail = "Error al descargar";
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || errorDetail;
        } catch (e) { /* No hacer nada si no es JSON */ }

        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          window.location.reload();
          throw new Error("Sesión expirada.");
        }
        throw new Error(errorDetail);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'Horarios_Cursos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("¡Excel descargado!");

    } catch (error) { // Apertura del CATCH (justo después del cierre del TRY)
      toast.error(`Error al descargar Excel: ${error.message}`);
      console.error("Error descarga Excel:", error);
    } finally { // Apertura del FINALLY
      setIsDownloadingExcel(false); // Desactivar spinner
    } // Cierre del FINALLY
  } // Cierre de la función handleDescargarExcel

  
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

      <Button
        variant="success"
        onClick={handleDescargarExcel}
        disabled={isDownloadingExcel} // <-- Añade disabled
      >
        {/* Añade el spinner */}
        {isDownloadingExcel ? (
            <>
                <Spinner as="span" animation="border" size="sm" />
                <span className="ms-1">Descargando...</span>
            </>
        ) : (
            'Descargar Excel'
        )}
      </Button>

        </ButtonGroup>
      </Card.Body>
    </Card>
  )
}
export default PanelAdmin;