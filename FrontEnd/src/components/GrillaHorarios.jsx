import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../apiService';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';

// --- NUEVAS IMPORTACIONES PARA PDF ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const HORAS = [
  "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40", "12:20",
  "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",
  "17:40", "18:20", "19:00", "19:40", "20:20", "21:00", "21:40", "22:20"
];

function GrillaHorarios({ refreshKey }) {
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState(""); 
  const [horarios, setHorarios] = useState({}); 
  const [draggedId, setDraggedId] = useState(null);
  
  const grillaRef = useRef(null);

  useEffect(() => { cargarCursos(); }, [refreshKey]);
  useEffect(() => { if (cursoId) cargarHorariosCurso(cursoId); }, [cursoId, refreshKey]);

  async function cargarCursos() {
    try {
      const data = await apiFetch('/api/cursos');
      const ordenados = data.sort((a, b) => a.anio.localeCompare(b.anio) || a.division.localeCompare(b.division));
      setCursos(ordenados);
      if (ordenados.length > 0) setCursoId(ordenados[0].id);
    } catch (error) { console.error(error); }
  }

  async function cargarHorariosCurso(id) {
    try {
      const data = await apiFetch(`/api/horarios/${id}`);
      setHorarios(data || {});
    } catch (error) { console.error(error); }
  }

  const getCelda = (dia, hora) => {
    if (horarios[hora] && horarios[hora][dia]) return horarios[hora][dia];
    return null;
  };

  // --- DRAG & DROP ---
  const handleDragStart = (e, asignacionId) => {
    setDraggedId(asignacionId);
    e.dataTransfer.setData("text/plain", asignacionId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  
  const handleDrop = async (e, nuevoDia, nuevaHora) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    try {
        const respuesta = await apiFetch('/api/horarios/mover', {
            method: 'POST',
            body: JSON.stringify({ asignacion_id: id, nuevo_dia: nuevoDia, nueva_hora: nuevaHora })
        });
        if (respuesta.mensaje.includes("Swap")) toast.info("🔄 Intercambio realizado");
        else toast.success("✅ Horario movido");
        cargarHorariosCurso(cursoId);
    } catch (error) { 
        console.error("Conflicto:", error);
        alert(`⛔ NO SE PUEDE MOVER:\n\n${error.message}`);
        cargarHorariosCurso(cursoId);
    } finally { setDraggedId(null); }
  };

  // --- EXPORTAR IMAGEN (Captura rápida) ---
  const handleExportarImagen = () => {
    if (!grillaRef.current) return;
    toast.info("Generando imagen...");
    html2canvas(grillaRef.current, { scale: 2, backgroundColor: "#F4F7F6" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Horario_${cursoId}.png`;
        link.href = canvas.toDataURL();
        link.click();
        toast.success("Imagen descargada");
    });
  };

  // --- EXPORTAR PDF OFICIAL (A4) ---
  const handleExportarPDF = async () => {
    toast.info("Generando documento oficial...");
    
    // 1. Obtener Datos del Curso
    const cursoActual = cursos.find(c => c.id === cursoId);
    const nombreCurso = cursoActual ? `${cursoActual.anio} "${cursoActual.division}"` : "Curso";

    // 2. Obtener Identidad (Logo y Nombre)
    let institucion = { nombre: "Cronos", logo: null };
    try {
        const data = await apiFetch('/api/config/institucion');
        if (data) {
            institucion.nombre = data.nombre || "Cronos";
            institucion.logo = data.logo_base64;
        }
    } catch (e) { console.error("No se pudo cargar identidad", e); }

    // 3. Crear PDF
    const doc = new jsPDF();

    // -- Encabezado --
    if (institucion.logo) {
        try {
            // x=14, y=10, w=20, h=20
            doc.addImage(institucion.logo, 'PNG', 14, 10, 20, 20);
        } catch (err) { console.error("Error cargando logo en PDF", err); }
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(institucion.nombre.toUpperCase(), 40, 20); // Nombre del colegio
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Horario de Clases - Ciclo Lectivo 2025", 40, 27);

    // -- Datos del Curso --
    doc.setFontSize(14);
    doc.setTextColor(13, 148, 136); // Color Teal
    doc.text(`Curso: ${nombreCurso}`, 14, 40);
    doc.setTextColor(0, 0, 0); // Volver a negro

    // -- Armar Tabla de Datos --
    const tableBody = HORAS.map(hora => {
        const row = [hora];
        DIAS.forEach(dia => {
            const celda = getCelda(dia, hora);
            if (celda) {
                // Formato: MATERIA (Profe)
                row.push(`${celda.materia_nombre}\n(${celda.profesor_nombre})`);
            } else {
                row.push("");
            }
        });
        return row;
    });

    // -- Generar Tabla --
    autoTable(doc, {
        startY: 45,
        head: [['Hora', ...DIAS]],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: [13, 148, 136], // Teal
            halign: 'center',
            valign: 'middle'
        },
        styles: {
            fontSize: 8,
            cellPadding: 2,
            valign: 'middle',
            halign: 'center',
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 20 } // Columna Hora más angosta
        }
    });

    // -- Pie de Página (Firmas) --
    const finalY = doc.lastAutoTable.finalY || 150;
    
    // Línea de firma
    doc.setLineWidth(0.5);
    doc.line(130, finalY + 40, 190, finalY + 40);
    
    doc.setFontSize(10);
    doc.text("Firma Dirección / Secretaría", 135, finalY + 45);
    
    // Fecha de impresión
    const fechaHoy = new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generado el ${fechaHoy} por Sistema Cronos`, 14, 285); // Abajo de todo

    // 4. Descargar
    doc.save(`Horario_Oficial_${nombreCurso}.pdf`);
    toast.success("📄 PDF generado exitosamente");
  };

  return (
    <div className="card-custom border-0 shadow-sm" style={{background: 'transparent', boxShadow: 'none'}}>
      
      {/* --- CONTROLES SUPERIORES --- */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 bg-white p-3 rounded-4 shadow-sm">
        <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-secondary" style={{fontSize: '0.9rem'}}>VISUALIZAR CURSO:</span>
            <select 
                className="form-select form-select-sm fw-bold text-teal" 
                style={{ width: '200px', borderColor: '#66B2B2', color: '#2C7A7B' }}
                value={cursoId}
                onChange={(e) => setCursoId(e.target.value)}
            >
                {cursos.map(c => <option key={c.id} value={c.id}>{c.anio} "{c.division}"</option>)}
            </select>
            <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => cargarHorariosCurso(cursoId)}>
                <i className="fa-solid fa-arrows-rotate"></i>
            </button>
        </div>

        <div className="d-flex gap-2">
            {/* BOTÓN FOTO */}
            <button className="btn btn-outline-teal btn-sm" onClick={handleExportarImagen}>
                <i className="fa-solid fa-camera me-2"></i> Foto
            </button>
            
            {/* BOTÓN PDF OFICIAL (NUEVO) */}
            <button className="btn btn-danger btn-sm text-white shadow-sm" onClick={handleExportarPDF} style={{backgroundColor: '#dc3545', borderColor: '#dc3545'}}>
                <i className="fa-solid fa-file-pdf me-2"></i> PDF Oficial
            </button>
        </div>
      </div>

      {/* --- GRILLA VISUAL --- */}
      <div className="timetable-container" ref={grillaRef}>
        
        <h3 className="text-center mb-4" style={{color: '#2C3E50', fontWeight: '800', letterSpacing: '-1px'}}>
            GRILLA DE HORARIOS
        </h3>

        <div className="schedule-grid">
            {/* Headers */}
            <div className="sch-header time-col">HORA</div>
            {DIAS.map(dia => (
                <div key={dia} className="sch-header day-col">{dia}</div>
            ))}

            {/* Cuerpo */}
            {HORAS.map((hora) => (
                <React.Fragment key={hora}> 
                    <div className="sch-cell sch-hour">{hora}</div>
                    {DIAS.map(dia => {
                        const clase = getCelda(dia, hora);
                        return (
                            <div 
                                key={`${dia}-${hora}`} 
                                className="sch-cell"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, dia, hora)}
                            >
                                {clase ? (
                                    <div 
                                        className="class-block"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, clase.id)}
                                        style={{ 
                                            opacity: draggedId === clase.id ? 0.5 : 1,
                                            borderColor: clase.color_materia || '#66B2B2',
                                            borderLeftColor: clase.color_materia || '#66B2B2'
                                        }}
                                    >
                                        <div className="subject-text" style={{color: clase.color_materia || '#2C7A7B'}}>
                                            {clase.materia_nombre}
                                        </div>
                                        <div className="profesor-text">
                                            {clase.profesor_nombre}
                                        </div>
                                        {clase.aula_nombre && (
                                            <div className="aula-badge">
                                                <i className="fa-solid fa-location-dot me-1"></i>
                                                {clase.aula_nombre}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
      </div>
      
      <div className="text-center mt-3 text-muted small">
         <i className="fa-solid fa-hand-pointer me-1"></i> Arrastra y suelta para organizar.
      </div>
    </div>
  );
}

export default GrillaHorarios;