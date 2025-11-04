// frontend/src/components/PanelAdmin.jsx (Corregido)
import { useState } from 'react';
import { Button, Card, Spinner, ButtonGroup, DropdownButton, Dropdown } from 'react-bootstrap';
import { toast } from 'react-toastify';
// CORRECCIÓN: Se añade la extensión .js para resolver la ruta
import { apiFetch } from '../apiService.js'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Importar autoTable como default

const TOKEN_KEY = "proyecto_horarios_token";
const API_URL = "http://127.0.0.1:8000";

// (Constantes para la tabla del PDF)
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
  "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
  "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
  "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
  "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
  "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];


function PanelAdmin({ curso, onDatosCambiados }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // Un solo estado para descargas

  // (La función handleBorrarHorarios no cambia)
  async function handleBorrarHorarios() {
    if (!curso) {
      toast.warn("Por favor, selecciona un curso primero.");
      return;
    }
    // Usamos window.confirm en lugar de confirm
    if (!window.confirm(`¿Estás seguro de que quieres borrar todos los horarios del curso ${curso}?`)) {
      return;
    }
    setIsDeleting(true);
    try {
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

  // (La función handleDescargarExcel no cambia)
  async function handleDescargarExcel() {
    setIsDownloading(true);
    toast.info("Preparando descarga de Excel...");
    try {
      const response = await fetch(`${API_URL}/api/export/excel`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
      });
      if (!response.ok) {
        let errorDetail = "Error al descargar";
        try { const errorJson = await response.json(); errorDetail = errorJson.detail || errorDetail; } catch (e) {}
        if (response.status === 401) { localStorage.removeItem(TOKEN_KEY); window.location.reload(); }
        throw new Error(errorDetail);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none'; a.href = url; a.download = 'Horarios_Cursos.xlsx';
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
      toast.success("¡Excel descargado!");
    } catch (error) {
      toast.error(`Error al descargar Excel: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  }

  // 3. FUNCIÓN PDF (Corregida)
  async function handleDescargarPDF() {
    if (!curso) {
      toast.warn("Por favor, selecciona un curso para descargar su PDF.");
      return;
      // El código muerto que tenías aquí fue eliminado
    }
    
    setIsDownloading(true);
    toast.info(`Generando PDF para ${curso}...`);
    
    try {
      // A. Obtenemos los datos del horario para ESE curso
      const horarioData = await apiFetch(`/api/horarios/${curso}`);
      
      // B. Inicializamos el PDF
      const doc = new jsPDF({
        orientation: 'landscape', // Hoja horizontal
        unit: 'px', // Usar píxeles para el tamaño
        format: 'a4'
      });

      // C. Creamos el cuerpo de la tabla (header y body)
      const head = [['Hora', ...DIAS]];
      const body = HORARIOS_RANGOS.map(horaRango => {
        const fila = [horaRango];
        DIAS.forEach(dia => {
          const asignacion = horarioData[horaRango]?.[dia];
          if (asignacion) {
            // Dividimos en dos líneas: Materia/Profe y Aula
            const textoPrincipal = asignacion.text || "Asignado";
            const aula = asignacion.aula_nombre || "Sin Aula";
            fila.push(`${textoPrincipal}\n${aula}`); // \n crea una nueva línea
          } else {
            fila.push(""); // Celda vacía
          }
        });
        return fila;
      });

      // D. Añadimos el título
      doc.setFontSize(18);
      doc.text(`Horario del Curso: ${curso}`, 40, 30);

      // E. Generamos la tabla automática (CORRECCIÓN: Se llama a autoTable)
      autoTable(doc, {
        startY: 40, // Dónde empezar la tabla (después del título)
        head: head,
        body: body,
        theme: 'grid', // Estilo de la tabla
        headStyles: {
          fillColor: [29, 114, 184] // Color azul (RGB)
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: 'linebreak' // Asegura que el \n funcione
        },
        columnStyles: {
          0: { cellWidth: 70 } // Columna de hora más ancha
        }
      });

      // F. Guardamos el archivo
      doc.save(`Horario_${curso}.pdf`);
      toast.success("¡PDF generado!");

    } catch (error) {
      toast.error(`Error al generar PDF: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Card className="mt-3 shadow-sm border-0">
      <Card.Body>
        <Card.Title>Acciones Administrativas</Card.Title>
        <div className="d-flex gap-2 w-100">
          {/* Botón de Borrar (sigue igual) */}
          <Button 
            variant="danger" 
            onClick={handleBorrarHorarios}
            disabled={isDeleting || !curso}
            className="flex-grow-1"
          >
            {isDeleting ? <Spinner as="span" animation="border" size="sm" /> : 'Borrar Horarios del Curso'}
          </Button>

          {/* 4. Dropdown (sigue igual) */}
          <DropdownButton
            as={ButtonGroup}
            variant="success"
            title={
              isDownloading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" />
                  <span className="ms-1">Generando...</span>
                </>
              ) : (
                'Descargar Horario'
              )
            }
            id="dropdown-descargas"
            disabled={isDownloading}
          >
            <Dropdown.Item eventKey="1" onClick={handleDescargarExcel}>
              Descargar como Excel (Todos)
            </Dropdown.Item>
            <Dropdown.Item eventKey="2" onClick={handleDescargarPDF} disabled={!curso}>
              Exportar como PDF (Curso actual)
            </Dropdown.Item>
          </DropdownButton>
        </div>
      </Card.Body>
    </Card>
  );
}

export default PanelAdmin;

