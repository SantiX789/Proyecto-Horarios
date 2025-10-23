// frontend/src/components/GeneradorHorario.jsx
import { useState, useEffect } from 'react';

const API_URL = "http://127.0.0.1:8000";

function GeneradorHorario({ refreshKey, onDatosCambiados }) {
  // Datos maestros
  const [cursos, setCursos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  
  // Selección actual
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [requisitos, setRequisitos] = useState([]);
  
  // El "estado" de las asignaciones: guardamos { requisito_id: profesor_id }
  const [asignaciones, setAsignaciones] = useState({});

  // 1. Cargar Cursos y Profesores (datos maestros)
  async function cargarDatosMaestros() {
    try {
      const [cursosRes, profRes] = await Promise.all([
        fetch(`${API_URL}/api/cursos`),
        fetch(`${API_URL}/api/profesores`)
      ]);
      setCursos(await cursosRes.json());
      setProfesores(await profRes.json());
    } catch (error) {
      console.error("Error cargando datos maestros:", error);
    }
  }

  // 2. Cargar Requisitos del curso seleccionado
  async function cargarRequisitos(cursoId) {
    if (!cursoId) {
      setRequisitos([]);
      setAsignaciones({});
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/requisitos/${cursoId}`);
      const data = await res.json();
      setRequisitos(data);
      // Limpiamos asignaciones viejas al cambiar de curso
      setAsignaciones({});
    } catch (error) {
      console.error("Error cargando requisitos:", error);
    }
  }

  // 3. Cargar datos maestros al inicio y con refreshKey
  useEffect(() => {
    cargarDatosMaestros();
  }, [refreshKey]);

  // 4. Cargar requisitos cuando el curso cambia
  useEffect(() => {
    cargarRequisitos(cursoSeleccionado);
  }, [cursoSeleccionado]);

  // 5. Función para actualizar una asignación
  function handleAsignacionChange(requisitoId, profesorId) {
    setAsignaciones(prev => ({
      ...prev,
      [requisitoId]: profesorId
    }));
  }

  // 6. ¡El envío al "Solver"!
  async function handleGenerarHorario() {
    if (!cursoSeleccionado) {
      alert("Selecciona un curso.");
      return;
    }
    
    // Convertir el objeto {reqId: profId} en el array [{reqId, profId}, ...]
    const asignacionesArray = Object.keys(asignaciones).map(reqId => ({
      requisito_id: reqId,
      profesor_id: asignaciones[reqId]
    })).filter(a => a.profesor_id); // Filtramos los que no tienen profesor

    if (asignacionesArray.length === 0) {
      alert("Asigna al menos un profesor a una materia.");
      return;
    }
    
    if (asignacionesArray.length < requisitos.length) {
      if (!confirm("No has asignado profesores a todas las materias. ¿Deseas continuar igualmente?")) {
        return;
      }
    }

    const solverRequest = {
      curso_id: cursoSeleccionado,
      asignaciones: asignacionesArray
    };

    // 7. Llamamos al nuevo endpoint del "Solver"
    const response = await fetch(`${API_URL}/api/generar-horario-completo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solverRequest)
    });
    
    const result = await response.json();
    alert(result.mensaje);
    
    // ¡Avisamos a App.jsx para que TablaHorario se refresque!
    onDatosCambiados();
  }

  return (
    <div style={{ border: '2px solid blue', padding: '10px', margin: '10px 0' }}>
      <h2>Generador de Horarios (Cuadro 3)</h2>
      
      {/* 1. Seleccionar Curso */}
      <label htmlFor="gen-curso">Selecciona un Curso para Generar:</label>
      <select 
        id="gen-curso"
        value={cursoSeleccionado}
        onChange={(e) => setCursoSeleccionado(e.target.value)}
      >
        <option value="">-- Seleccionar Curso --</option>
        {cursos.map(curso => (
          <option key={curso.id} value={curso.id}>{curso.nombre}</option>
        ))}
      </select>

      {/* 2. Lista de Requisitos y Asignación */}
      <div style={{ marginTop: '15px' }}>
        <h4>Asignar Profesores a Materias:</h4>
        {requisitos.length === 0 && cursoSeleccionado && <p>Cargando requisitos...</p>}
        {requisitos.length === 0 && !cursoSeleccionado && <p>Selecciona un curso para ver sus requisitos.</p>}
        
        {requisitos.map(req => (
          <div key={req.id} style={{ marginBottom: '10px' }}>
            <span>
              {req.materia_nombre} ({req.horas_semanales} horas)
            </span>
            <select 
              value={asignaciones[req.id] || ""}
              onChange={(e) => handleAsignacionChange(req.id, e.target.value)}
              style={{ marginLeft: '10px' }}
            >
              <option value="">-- Asignar Profesor --</option>
              {profesores.map(prof => (
                <option key={prof.id} value={prof.id}>{prof.nombre}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* 3. Botón de Generar */}
      {requisitos.length > 0 && (
        <button 
          onClick={handleGenerarHorario} 
          style={{ marginTop: '10px', backgroundColor: 'blue', color: 'white' }}
        >
          Generar Horario Completo
        </button>
      )}
    </div>
  );
}

export default GeneradorHorario;