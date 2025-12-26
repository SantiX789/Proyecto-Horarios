import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORAS_DISPLAY = [
  "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40", "12:20", 
  "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",            
  "17:40", "18:20", "19:00", "19:40", "20:20", "21:00", "21:40", "22:20"   
];

function GestionProfesores({ refreshKey, onDatosCambiados }) {
  const [profesores, setProfesores] = useState([]);
  
  // Estados del Formulario
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [color, setColor] = useState("#0d9488");
  const [disponibles, setDisponibles] = useState(new Set()); 
  
  // Estado para controlar EDICIÓN
  const [editandoId, setEditandoId] = useState(null); // Si es null, estamos creando. Si tiene ID, estamos editando.

  useEffect(() => { cargarProfesores(); }, [refreshKey]);

  async function cargarProfesores() {
    try {
      const data = await apiFetch('/api/profesores');
      setProfesores(data);
    } catch (error) { console.error(error); }
  }

  // --- LOGICA DE EDICIÓN ---
  const empezarEdicion = (profe) => {
      setEditandoId(profe.id);
      setNombre(profe.nombre);
      setDni(profe.dni || "");
      setColor(profe.color || "#0d9488");
      
      // Convertimos la lista de disponibilidad (array) a un Set para la grilla
      const dispoSet = new Set(profe.disponibilidad || []);
      setDisponibles(dispoSet);
      
      // Hacemos scroll hacia arriba para que vea el formulario
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.info(`📝 Editando a ${profe.nombre}`);
  };

  const cancelarEdicion = () => {
      setEditandoId(null);
      setNombre("");
      setDni("");
      setColor("#0d9488");
      setDisponibles(new Set());
  };

  // --- LÓGICA DE GRILLA ---
  const toggleCell = (dia, hora) => {
    const key = `${dia}-${hora}`;
    const nuevosDisponibles = new Set(disponibles);
    if (nuevosDisponibles.has(key)) nuevosDisponibles.delete(key);
    else nuevosDisponibles.add(key);
    setDisponibles(nuevosDisponibles);
  };

  const toggleDiaEntero = (dia) => {
    const nuevosDisponibles = new Set(disponibles);
    const todosLosBloques = HORAS_DISPLAY.map(h => `${dia}-${h}`);
    const diaCompleto = todosLosBloques.every(key => nuevosDisponibles.has(key));

    if (diaCompleto) todosLosBloques.forEach(key => nuevosDisponibles.delete(key));
    else todosLosBloques.forEach(key => nuevosDisponibles.add(key));
    
    setDisponibles(nuevosDisponibles);
  };

  // --- GUARDAR / ACTUALIZAR ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return toast.warning("Falta el nombre");
    const disponibilidadLista = Array.from(disponibles);

    if (disponibilidadLista.length === 0) {
        if(!window.confirm("Advertencia: No has marcado disponibilidad. ¿Guardar igual?")) return;
    }

    try {
      const payload = { nombre, dni: dni || "", disponibilidad: disponibilidadLista, color };
      
      if (editandoId) {
          // MODO ACTUALIZAR (PUT)
          await apiFetch(`/api/profesores/${editandoId}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
          });
          toast.success("✅ Profesor actualizado correctamente");
      } else {
          // MODO CREAR (POST)
          await apiFetch('/api/profesores', {
              method: 'POST',
              body: JSON.stringify(payload)
          });
          toast.success("✅ Profesor creado correctamente");
      }

      // Limpiar todo
      cancelarEdicion();
      onDatosCambiados(); 
      cargarProfesores();

    } catch (error) { toast.error(error.message); }
  };

  const handleBorrar = async (id) => {
    if (!window.confirm("¿Estás seguro de borrar este profesor?")) return;
    try {
      await apiFetch(`/api/profesores/${id}`, { method: 'DELETE' });
      toast.success("🗑️ Eliminado");
      onDatosCambiados(); cargarProfesores();
    } catch (error) { toast.error("Error al borrar"); }
  };

  // --- GENERAR PDF DOCENTE ---
  const handleImprimirPDF = async (profe) => {
    toast.info(`Generando horario...`);
    try {
        const horario = await apiFetch(`/api/horarios/profesor/${profe.id}`);
        let institucion = { nombre: "Cronos", logo: null };
        try {
            const config = await apiFetch('/api/config/institucion');
            if(config) { institucion.nombre = config.nombre || "Cronos"; institucion.logo = config.logo_base64; }
        } catch(e){}

        const doc = new jsPDF();
        if (institucion.logo) doc.addImage(institucion.logo, 'PNG', 14, 10, 20, 20);
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text(institucion.nombre.toUpperCase(), 40, 20);
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text("Horario Docente Individual - 2025", 40, 27);
        doc.setFontSize(14); doc.setTextColor(13, 148, 136); 
        doc.text(`Docente: ${profe.nombre}`, 14, 40);
        
        const body = HORAS_DISPLAY.map(hora => {
            const row = [hora];
            DIAS.forEach(dia => {
                const celda = horario[hora] && horario[hora][dia];
                row.push(celda ? celda.texto : ""); 
            });
            return row;
        });

        autoTable(doc, {
            startY: 50,
            head: [['Hora', ...DIAS]],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] },
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 20 } }
        });
        doc.save(`Horario_${profe.nombre}.pdf`);
        toast.success("📄 PDF Descargado");
    } catch (error) { toast.error("Error al generar PDF."); }
  };

  return (
    <div className="card-custom border-0 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded-3">
        <h4 className="m-0 fw-bold text-teal"><i className="fa-solid fa-chalkboard-user me-2"></i>Gestión de Profesores</h4>
        <span className="badge bg-teal text-white rounded-pill px-3 py-2 shadow-sm" style={{backgroundColor: '#0d9488'}}>
            {profesores.length} Docentes
        </span>
      </div>

      <div className={`p-4 rounded-3 border mb-4 shadow-sm ${editandoId ? 'bg-warning-subtle' : 'bg-white'}`} 
           style={{transition: 'background-color 0.3s'}}>
        
        <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
            <h5 className={`m-0 ${editandoId ? 'text-dark fw-bold' : 'text-secondary'}`}>
                {editandoId ? `✏️ Editando a: ${nombre}` : 'Registrar Nuevo Docente'}
            </h5>
            {editandoId && (
                <button className="btn btn-sm btn-outline-danger" onClick={cancelarEdicion}>
                    <i className="fa-solid fa-xmark me-1"></i> Cancelar Edición
                </button>
            )}
        </div>
        
        <div className="row g-3 mb-4">
            <div className="col-md-5">
                <label className="label-custom small fw-bold text-muted">Nombre Completo</label>
                <input className="form-control text-uppercase" placeholder="Ej: ROBERTO GOMEZ" value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())} />
            </div>
            <div className="col-md-3">
                <label className="label-custom small fw-bold text-muted">DNI / Legajo</label>
                <input className="form-control" placeholder="12345678" value={dni} onChange={e => setDni(e.target.value)} />
            </div>
            <div className="col-md-2">
                <label className="label-custom small fw-bold text-muted">Color</label>
                <input type="color" className="form-control form-control-color w-100" value={color} onChange={e => setColor(e.target.value)} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
                <button 
                    className={`btn w-100 fw-bold text-white shadow-sm`} 
                    onClick={handleSubmit} 
                    style={{ backgroundColor: editandoId ? '#f59e0b' : '#0d9488', borderColor: editandoId ? '#d97706' : '#0f766e' }}
                >
                    {editandoId ? <><i className="fa-solid fa-rotate me-2"></i> Actualizar</> : <><i className="fa-solid fa-plus me-2"></i> Guardar</>}
                </button>
            </div>
        </div>

        {/* GRILLA DISPONIBILIDAD */}
        <div className="mt-2 border rounded overflow-hidden bg-white"> 
            <div className="d-flex justify-content-between align-items-center bg-light px-3 py-2 border-bottom">
                <label className="label-custom m-0 fw-bold small text-muted"><i className="fa-regular fa-clock me-1"></i> Disponibilidad</label>
                <div className="small">
                    <span className="me-3"><i className="fa-solid fa-square text-success"></i> Disp.</span>
                    <span className="text-muted"><i className="fa-solid fa-square text-light border"></i> No Disp.</span>
                </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '300px', overflowX: 'auto' }}>
                <table className="table table-bordered text-center mb-0" style={{ minWidth: '600px', fontSize: '0.85rem' }}>
                    <thead className="table-light sticky-top" style={{zIndex: 10}}>
                        <tr>
                            <th style={{ width: '80px' }}>HORA</th>
                            {DIAS.map(d => <th key={d} onClick={() => toggleDiaEntero(d)} className="pointer-hover text-teal" style={{cursor:'pointer'}}>{d.toUpperCase()}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {HORAS_DISPLAY.map(hora => (
                            <tr key={hora}>
                                <td className="fw-bold text-muted bg-light align-middle">{hora}</td>
                                {DIAS.map(dia => (
                                    <td key={dia} onClick={() => toggleCell(dia, hora)} style={{
                                        cursor: 'pointer', height: '30px', 
                                        backgroundColor: disponibles.has(`${dia}-${hora}`) ? '#dcfce7' : 'white'
                                    }}>
                                        {disponibles.has(`${dia}-${hora}`) && <i className="fa-solid fa-check text-success"></i>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      <h5 className="text-secondary mb-3 ms-1">Docentes Activos</h5>
      <div className="border rounded-3 bg-white shadow-sm overflow-hidden">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
                <tr>
                    <th className="ps-4">NOMBRE</th>
                    <th>COLOR</th>
                    <th className="text-end pe-4">ACCIONES</th>
                </tr>
            </thead>
            <tbody>
                {profesores.map(p => (
                    <tr key={p.id} className={editandoId === p.id ? "table-warning" : ""}>
                        <td className="fw-bold text-dark text-uppercase ps-4">
                            {p.nombre} <span className="text-muted small fw-normal ms-2">{p.dni ? `(${p.dni})` : ""}</span>
                        </td>
                        <td>
                            <span className="badge rounded-pill border shadow-sm" style={{backgroundColor: p.color || '#0d9488', color: '#fff'}}>
                                {p.color || '#0d9488'}
                            </span>
                        </td>
                        <td className="text-end pe-4">
                            {/* BOTÓN PDF */}
                            <button className="btn btn-sm btn-outline-secondary me-2" title="Descargar Horario" onClick={() => handleImprimirPDF(p)}>
                                <i className="fa-solid fa-print"></i>
                            </button>

                            {/* BOTÓN EDITAR (NUEVO) */}
                            <button className="btn btn-sm btn-outline-primary me-2" title="Editar Datos" onClick={() => empezarEdicion(p)}>
                                <i className="fa-solid fa-pen"></i>
                            </button>

                            {/* BOTÓN RESET CLAVE */}
                            <button className="btn btn-outline-warning btn-sm me-2" title="Reset Clave a 1234" onClick={async () => {
                                if(window.confirm(`¿Resetear clave de ${p.nombre}?`)) {
                                    try { await apiFetch(`/api/admin/reset-password/${p.nombre}`, { method: 'POST' }); toast.success("Clave: 1234"); } 
                                    catch(e) { toast.error("Error"); }
                                }
                            }}><i className="fa-solid fa-key"></i></button>
                            
                            {/* BOTÓN BORRAR */}
                            <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleBorrar(p.id)}><i className="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                ))}
                {profesores.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-muted">No hay docentes cargados.</td></tr>}
            </tbody>
          </table>
      </div>
    </div>
  );
}

export default GestionProfesores;