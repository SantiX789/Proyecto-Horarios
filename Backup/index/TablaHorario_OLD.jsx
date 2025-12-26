// FrontEnd/src/components/TablaHorario.jsx (Versión WhatsApp Ready 📸)
import { useState, useEffect } from 'react';
import { Table, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { apiFetch } from '../../FrontEnd/src/apiService';
import { toast } from 'react-toastify';

// Librerías de Exportación
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas'; // <--- NUEVA IMPORTACIÓN

const HORARIOS = [
  "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
  "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
  "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
  "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
  "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function TablaHorario({ userRole, refreshKey }) {
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [horarioData, setHorarioData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userRole === 'admin') {
        cargarCursos();
    } else {
        cargarMiHorarioProfesor();
    }
  }, [refreshKey, userRole]);

  useEffect(() => {
    if (cursoSeleccionado && userRole === 'admin') {
      cargarHorarioCurso(cursoSeleccionado);
    }
  }, [cursoSeleccionado, refreshKey]);

  async function cargarCursos() {
    try {
      const data = await apiFetch('/api/cursos');
      setCursos(data);
      if (data.length > 0) setCursoSeleccionado(data[0].id);
    } catch (error) {
      console.error(error);
    }
  }

  async function cargarHorarioCurso(id) {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/horarios/${id}`);
      setHorarioData(data);
    } catch (error) {
      console.error(error);
      setHorarioData({});
    } finally {
      setLoading(false);
    }
  }

  async function cargarMiHorarioProfesor() {
      setLoading(true);
      try {
          const listaClases = await apiFetch('/api/horarios/mi-horario');
          const grilla = {};
          listaClases.forEach(clase => {
              if (!grilla[clase.hora_rango]) grilla[clase.hora_rango] = {};
              grilla[clase.hora_rango][clase.dia] = {
                  text: `${clase.curso} (${clase.materia})`,
                  aula_nombre: clase.aula,
                  color: clase.color
              };
          });
          setHorarioData(grilla);
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  }

  // --- EXPORTAR PDF ---
  const exportarPDF = () => {
    const doc = new jsPDF();
    const titulo = userRole === 'admin' 
        ? `Horario - ${cursos.find(c => c.id === cursoSeleccionado)?.nombre_display || 'Curso'}`
        : 'Mi Horario Docente';

    doc.text(titulo, 14, 20);
    const tableBody = HORARIOS.map(hora => {
        const row = [hora];
        DIAS.forEach(dia => {
            const cellData = horarioData[hora]?.[dia];
            row.push(cellData ? `${cellData.text}\n[${cellData.aula_nombre}]` : "-");
        });
        return row;
    });

    doc.autoTable({
        head: [['Hora', ...DIAS]],
        body: tableBody,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185] }
    });
    doc.save('horario.pdf');
  };

  // --- EXPORTAR EXCEL ---
  const exportarExcel = async () => {
      try {
        const token = localStorage.getItem('proyecto_horarios_token');
        const response = await fetch('http://127.0.0.1:8000/api/export/excel', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "Horarios_Completo.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Excel descargado correctamente");
        } else {
            toast.error("Error descargando Excel");
        }
      } catch (error) {
          toast.error("Error de conexión");
      }
  };

  // --- NUEVO: EXPORTAR IMAGEN (WHATSAPP) ---
  const exportarImagen = async () => {
    const elemento = document.getElementById('tabla-captura'); // Buscamos la tabla por ID
    if (!elemento) return;

    try {
        toast.info("Generando imagen...");
        const canvas = await html2canvas(elemento, { scale: 2 }); // Scale 2 mejora la calidad
        const image = canvas.toDataURL("image/png");
        
        const link = document.createElement('a');
        link.href = image;
        link.download = `Horario_${new Date().toLocaleDateString().replace(/\//g, '-')}.png`;
        link.click();
        toast.success("Imagen descargada 📸");
    } catch (error) {
        console.error("Error imagen:", error);
        toast.error("No se pudo generar la imagen");
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h5 className="mb-0">📅 Visualizador de Horarios</h5>
        
        {userRole === 'admin' && (
             <Form.Select 
                style={{width: 'auto', minWidth: '200px'}}
                value={cursoSeleccionado} 
                onChange={(e) => setCursoSeleccionado(e.target.value)}
             >
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre_display}</option>)}
             </Form.Select>
        )}

        {/* BOTONERA DE EXPORTACIÓN */}
        <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={exportarImagen}>
                📸 Imagen (WhatsApp)
            </Button>
            <Button variant="outline-danger" size="sm" onClick={exportarPDF}>
                📄 PDF
            </Button>
            {userRole === 'admin' && (
                <Button variant="outline-success" size="sm" onClick={exportarExcel}>
                    📊 Excel
                </Button>
            )}
        </div>
      </div>

      <div className="card-body p-0 table-responsive">
        {loading ? (
            <div className="text-center p-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Cargando grilla...</p>
            </div>
        ) : (
            /* AGREGAMOS EL ID AQUÍ PARA LA FOTO */
            <div id="tabla-captura" className="bg-white p-2">
                <h5 className="text-center text-primary mb-3 d-none d-print-block">Horario Escolar</h5>
                <Table bordered hover className="mb-0 text-center" style={{fontSize: '0.85rem'}}>
                <thead className="table-dark">
                    <tr>
                    <th style={{width: '10%'}}>Hora</th>
                    {DIAS.map(d => <th key={d} style={{width: '18%'}}>{d}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {HORARIOS.map((hora) => (
                    <tr key={hora}>
                        <td className="fw-bold bg-light align-middle">{hora}</td>
                        {DIAS.map((dia) => {
                        const info = horarioData[hora]?.[dia];
                        return (
                            <td key={dia} className="align-middle" style={{height: '50px'}}>
                            {info ? (
                                <div className="d-flex flex-col align-items-center justify-content-center">
                                    <div className="fw-bold text-primary">{info.text}</div>
                                    <Badge bg="secondary" className="mt-1" style={{fontSize: '0.7em'}}>
                                        {info.aula_nombre}
                                    </Badge>
                                </div>
                            ) : (
                                <span className="text-muted small">-</span>
                            )}
                            </td>
                        );
                        })}
                    </tr>
                    ))}
                </tbody>
                </Table>
                <div className="text-end mt-2 text-muted small fst-italic">
                    Generado con CronosApp
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default TablaHorario;