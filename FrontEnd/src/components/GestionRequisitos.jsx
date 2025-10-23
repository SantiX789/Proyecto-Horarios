// frontend/src/components/GestionRequisitos.jsx
import { useState, useEffect } from 'react';

const API_URL = "http://127.0.0.1:8000";

function GestionRequisitos({ refreshKey, onDatosCambiados }) {
  // Listas para los dropdowns
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  
  // Datos del formulario
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [horas, setHoras] = useState("");

  // Lista de requisitos existentes para el curso seleccionado
  const [requisitosDelCurso, setRequisitosDelCurso] = useState([]);

  // 1. Cargar Cursos y Materias para los menús <select>
  async function cargarDatosMaestros() {
    try {
      const [cursosRes, materiasRes] = await Promise.all([
        fetch(`${API_URL}/api/cursos`),
        fetch(`${API_URL}/api/materias`)
      ]);
      
      const cursosData = await cursosRes.json();
      const materiasData = await materiasRes.json();

      setCursos(cursosData);
      setMaterias(materiasData);

      // Si hay cursos, seleccionar el primero por defecto
      if (cursosData.length > 0) {
        setCursoSeleccionado(cursosData[0].id);
      }
      if (materiasData.length > 0) {
        setMateriaSeleccionada(materiasData[0].id);
      }
    } catch (error) {
      console.error("Error cargando datos maestros:", error);
    }
  }

  // 2. Cargar los requisitos existentes para el curso seleccionado
  async function cargarRequisitosDelCurso(cursoId) {
    if (!cursoId) {
      setRequisitosDelCurso([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/requisitos/${cursoId}`);
      const data = await response.json();
      setRequisitosDelCurso(data);
    } catch (error) {
      console.error("Error cargando requisitos:", error);
    }
  }

  // 3. Efecto para cargar Cursos y Materias (al inicio y con refreshKey)
  useEffect(() => {
    cargarDatosMaestros();
  }, [refreshKey]);

  // 4. Efecto para cargar Requisitos (cuando cambia el curso seleccionado)
  useEffect(() => {
    cargarRequisitosDelCurso(cursoSeleccionado);
  }, [cursoSeleccionado, refreshKey]); // También refresca si los datos cambian

  // 5. Manejar el envío del formulario
  async function handleSubmit(e) {
    e.preventDefault();
    if (!cursoSeleccionado || !materiaSeleccionada || !horas) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    const requisitoData = {
      curso_id: cursoSeleccionado,
      materia_id: materiaSeleccionada,
      horas_semanales: parseInt(horas, 10)
    };

    await fetch(`${API_URL}/api/requisitos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requisitoData)
    });

    alert("Requisito guardado");
    setHoras(""); // Limpia el input de horas
    
    // Refresca la lista de requisitos para el curso actual
    cargarRequisitosDelCurso(cursoSeleccionado);
    
    // Avisa a App.jsx (por si acaso)
    if (onDatosCambiados) {
      onDatosCambiados();
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
      <h3>Gestión de Requisitos (Cuadro 2)</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="req-curso">Curso:</label>
          <select 
            id="req-curso"
            value={cursoSeleccionado}
            onChange={(e) => setCursoSeleccionado(e.target.value)}
          >
            {cursos.map(curso => (
              <option key={curso.id} value={curso.id}>{curso.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="req-materia">Materia:</label>
          <select 
            id="req-materia"
            value={materiaSeleccionada}
            onChange={(e) => setMateriaSeleccionada(e.target.value)}
          >
            {materias.map(materia => (
              <option key={materia.id} value={materia.id}>{materia.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="req-horas">Horas Semanales:</label>
          <input
            type="number"
            id="req-horas"
            min="1"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
          />
        </div>
        
        <button type="submit">Guardar Requisito</button>
      </form>

      <h4>Requisitos Actuales para el Curso:</h4>
      <ul>
        {requisitosDelCurso.map(req => (
          <li key={req.id}>
            {req.materia_nombre} ({req.horas_semanales} horas)
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GestionRequisitos;