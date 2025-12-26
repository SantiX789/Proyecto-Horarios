import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GestionRequisitos({ refreshKey, onDatosCambiados }) {
  const [requisitos, setRequisitos] = useState([]);
  
  // Listas para los desplegables
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [aulas, setAulas] = useState([]);

  // Formulario
  const [cursoId, setCursoId] = useState("");
  const [materiaId, setMateriaId] = useState("");
  const [profesorId, setProfesorId] = useState("");
  const [aulaId, setAulaId] = useState(""); 
  const [horas, setHoras] = useState(4);

  useEffect(() => {
    cargarDatosIndependientes();
  }, [refreshKey]);

  async function cargarDatosIndependientes() {
    console.log("🔄 Iniciando carga de datos para Relaciones...");

    // 1. Cursos
    try {
        const data = await apiFetch('/api/cursos');
        console.log("✅ Cursos cargados:", data); // Mira la consola para ver si esto trae datos
        setCursos(data || []);
    } catch (e) { console.error("❌ Error cargando cursos:", e); }

    // 2. Materias
    try {
        const data = await apiFetch('/api/materias');
        console.log("✅ Materias cargadas:", data);
        setMaterias(data || []);
    } catch (e) { console.error("❌ Error cargando materias:", e); }

    // 3. Profesores
    try {
        const data = await apiFetch('/api/profesores');
        console.log("✅ Profesores cargados:", data);
        setProfesores(data || []);
    } catch (e) { console.error("❌ Error cargando profesores:", e); }

    // 4. Aulas
    try {
        const data = await apiFetch('/api/aulas');
        setAulas(data || []);
    } catch (e) { console.error("❌ Error cargando aulas:", e); }

    // 5. Relaciones (Aquí es donde tenías el Error 405)
    try {
        const data = await apiFetch('/api/requisitos');
        setRequisitos(data || []);
    } catch (e) { 
        console.warn("⚠️ No se pudo cargar la lista de relaciones (Posiblemente falta el endpoint GET en el backend).", e);
        // No hacemos nada, dejamos la lista vacía para que no rompa la pantalla
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cursoId || !materiaId || !profesorId) {
        return toast.warning("Faltan datos: Curso, Materia o Profesor");
    }

    try {
      // CORRECCIÓN IMPORTANTE: Quitamos parseInt() en los IDs.
      // Enviamos el string directo porque tu backend espera "valid string".
      const payload = {
          curso_id: cursoId,       // Sin parseInt
          materia_id: materiaId,   // Sin parseInt
          profesor_id: profesorId, // Sin parseInt
          aula_preferida_id: aulaId ? aulaId : null,
          horas_semanales: parseInt(horas) // Las horas sí son números
      };

      console.log("Enviando Payload:", payload);

      await apiFetch('/api/requisitos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      toast.success("Asignación creada");
      
      // Limpiamos
      setMateriaId(""); 
      setProfesorId("");
      onDatosCambiados();
      
      // Intentamos recargar la lista (si el backend lo permite)
      try {
        const data = await apiFetch('/api/requisitos');
        setRequisitos(data || []);
      } catch(e) { /* Ignoramos error de lectura */ }

    } catch (error) {
        console.error(error);
        toast.error("Error al guardar: " + error.message);
    }
  };

  const handleBorrar = async (id) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    try {
      await apiFetch(`/api/requisitos/${id}`, { method: 'DELETE' });
      toast.success("Eliminado");
      onDatosCambiados();
      // Recargar lista si es posible
      try {
         const data = await apiFetch('/api/requisitos');
         setRequisitos(data || []);
      } catch(e) {}
    } catch (error) {
      toast.error("Error al borrar");
    }
  };

  const totalHoras = requisitos.reduce((acc, curr) => acc + (curr.horas_semanales || 0), 0);

  return (
    <div className="card-custom" style={{ borderLeft: '5px solid var(--primary)' }}>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h3 className="m-0 text-primary">🔗 Asignación Docente</h3>
            <p className="text-muted small m-0">Vincula Curso + Materia + Profesor.</p>
        </div>
        <div className="text-end">
            <span className="d-block text-muted small">Horas Totales</span>
            <span className="fs-5 fw-bold text-dark">{totalHoras} hs</span>
        </div>
      </div>

      {/* --- FORMULARIO --- */}
      <div className="p-3 bg-light border rounded-3 mb-4">
        <label className="fw-bold text-primary small mb-2 d-block">NUEVA ASIGNACIÓN</label>
        
        <form onSubmit={handleSubmit} className="row g-2 align-items-end">
            
            {/* 1. CURSO */}
            <div className="col-md-3">
                <label className="small fw-bold text-muted">Curso</label>
                <select className="form-select" value={cursoId} onChange={e => setCursoId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {cursos.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.anio} "{c.division}" {c.cantidad_alumnos ? `(${c.cantidad_alumnos} al.)` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* 2. MATERIA */}
            <div className="col-md-3">
                <label className="small fw-bold text-muted">Materia</label>
                <select className="form-select" value={materiaId} onChange={e => setMateriaId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {materias.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                </select>
            </div>

            {/* 3. PROFESOR */}
            <div className="col-md-3">
                <label className="small fw-bold text-muted">Profesor</label>
                <select className="form-select" value={profesorId} onChange={e => setProfesorId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {profesores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            {/* 4. AULA */}
            <div className="col-md-2">
                <label className="small fw-bold text-muted">Aula (Opc.)</label>
                <select className="form-select" value={aulaId} onChange={e => setAulaId(e.target.value)}>
                    <option value="">Indistinto</option>
                    {aulas.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre} (Cap: {a.capacidad})</option>
                    ))}
                </select>
            </div>

            {/* 5. HS Y BOTÓN */}
            <div className="col-md-1">
                <label className="small fw-bold text-muted">Hs</label>
                <input 
                    type="number" className="form-control text-center px-1" 
                    value={horas} onChange={e => setHoras(e.target.value)} 
                    min="1" max="10"
                />
            </div>
            
            <div className="col-12 mt-3 text-end">
                 <button type="submit" className="btn-teal px-4">
                    <i className="fa-solid fa-plus me-2"></i> Asignar
                </button>
            </div>
        </form>
      </div>

      {/* --- TABLA --- */}
      <div className="table-responsive border rounded-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="table table-hover mb-0">
            <thead className="table-light sticky-top">
                <tr>
                    <th className="ps-3">CURSO</th>
                    <th>MATERIA</th>
                    <th>DOCENTE</th>
                    <th>AULA</th>
                    <th>HS</th>
                    <th className="text-end pe-3"></th>
                </tr>
            </thead>
            <tbody>
                {requisitos.map(r => {
                    const colorMateria = r.materia_color || '#cccccc'; 
                    return (
                        <tr key={r.id}>
                            <td className="ps-3 fw-bold text-dark">{r.curso_anio} "{r.curso_division}"</td>
                            
                            <td>
                                <div className="d-flex align-items-center gap-2">
                                    <div style={{
                                        width: '10px', height: '10px', 
                                        borderRadius: '50%', backgroundColor: colorMateria,
                                        border: '1px solid rgba(0,0,0,0.1)'
                                    }}></div>
                                    <span className="fw-bold text-uppercase text-secondary" style={{fontSize: '0.9rem'}}>
                                        {r.materia_nombre}
                                    </span>
                                </div>
                            </td>

                            <td className="text-primary fw-bold">
                                {r.profesor_nombre}
                            </td>

                            <td className="small fst-italic text-muted">
                                {r.aula_nombre ? r.aula_nombre : '-'}
                            </td>
                            
                            <td>
                                <span className="badge bg-white text-dark border">
                                    {r.horas_semanales}
                                </span>
                            </td>

                            <td className="text-end pe-3">
                                <button 
                                    className="btn btn-outline-danger btn-sm border-0"
                                    onClick={() => handleBorrar(r.id)}
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    );
                })}
                {requisitos.length === 0 && (
                    <tr><td colSpan="6" className="text-center text-muted p-5">
                        {/* Mensaje amigable si no carga */}
                        No hay asignaciones cargadas o no se pudo conectar con la lista.
                    </td></tr>
                )}
            </tbody>
        </table>
      </div>

    </div>
  );
}

export default GestionRequisitos;