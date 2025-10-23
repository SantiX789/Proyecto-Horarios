// frontend/src/components/GeneradorHorario.jsx (Refactorizado)
import { useState, useEffect } from 'react';

// 1. Importamos los componentes
import { Form, Button, Card, Spinner, ListGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';

const API_URL = "http://127.0.0.1:8000";

function GeneradorHorario({ refreshKey, onDatosCambiados }) {
  // Datos maestros
  const [cursos, setCursos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  
  // Selección actual
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [requisitos, setRequisitos] = useState([]);
  
  // Estado de las asignaciones: { requisito_id: profesor_id }
  const [asignaciones, setAsignaciones] = useState({});

  // 2. Estados de Carga (UX)
  const [isDataLoading, setIsDataLoading] = useState(false); // Para los <select>
  const [isReqLoading, setIsReqLoading] = useState(false);   // Para la lista de requisitos
  const [isSubmitting, setIsSubmitting] = useState(false); // Para el botón de "Generar"

  // Cargar Cursos y Profesores (datos maestros)
  async function cargarDatosMaestros() {
    setIsDataLoading(true);
    try {
      const [cursosRes, profRes] = await Promise.all([
        fetch(`${API_URL}/api/cursos`),
        fetch(`${API_URL}/api/profesores`)
      ]);
      if (cursosRes.ok && profRes.ok) {
        setCursos(await cursosRes.json());
        setProfesores(await profRes.json());
      } else {
        toast.error("Error al cargar datos maestros (cursos o profesores).");
      }
    } catch (error) {
      toast.error("Error de red cargando datos maestros.");
    }
    setIsDataLoading(false);
  }

  // Cargar Requisitos del curso seleccionado
  async function cargarRequisitos(cursoId) {
    if (!cursoId) {
      setRequisitos([]);
      setAsignaciones({});
      return;
    }
    setIsReqLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/requisitos/${cursoId}`);
      if (res.ok) {
        const data = await res.json();
        setRequisitos(data);
        setAsignaciones({}); // Limpiamos asignaciones viejas
      } else {
        toast.error("Error al cargar requisitos del curso.");
      }
    } catch (error) {
      toast.error("Error de red cargando requisitos.");
    }
    setIsReqLoading(false);
  }

  // Cargar datos maestros al inicio y con refreshKey
  useEffect(() => {
    cargarDatosMaestros();
  }, [refreshKey]);

  // Cargar requisitos cuando el curso cambia
  useEffect(() => {
    cargarRequisitos(cursoSeleccionado);
  }, [cursoSeleccionado]); // Solo depende del curso

  // Función para actualizar una asignación
  function handleAsignacionChange(requisitoId, profesorId) {
    setAsignaciones(prev => ({
      ...prev,
      [requisitoId]: profesorId
    }));
  }

  // ¡El envío al "Solver"!
  async function handleGenerarHorario() {
    if (!cursoSeleccionado) {
      toast.warn("Selecciona un curso.");
      return;
    }
    
    const asignacionesArray = Object.keys(asignaciones).map(reqId => ({
      requisito_id: reqId,
      profesor_id: asignaciones[reqId]
    })).filter(a => a.profesor_id); // Filtramos los que no tienen profesor

    if (asignacionesArray.length === 0) {
      toast.warn("Asigna al menos un profesor a una materia.");
      return;
    }
    
    if (asignacionesArray.length < requisitos.length) {
      if (!confirm("No has asignado profesores a todas las materias. ¿Deseas continuar igualmente?")) {
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const solverRequest = {
        curso_id: cursoSeleccionado,
        asignaciones: asignacionesArray
      };

      const response = await fetch(`${API_URL}/api/generar-horario-completo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solverRequest)
      });
      
      const result = await response.json();
      
      if (result.faltantes_total > 0) {
        toast.warn(result.mensaje); // Mensaje de advertencia
      } else {
        toast.success(result.mensaje); // Mensaje de éxito
      }
      
      onDatosCambiados(); // ¡Avisamos a App.jsx para que TablaHorario se refresque!

    } catch (error) {
      toast.error("Error de red al generar el horario.");
    }
    
    setIsSubmitting(false);
  }

  // 3. Usamos los nuevos componentes de React-Bootstrap
  return (
    <Card border="primary"> {/* Le damos un borde azul para destacarlo */}
      <Card.Header as="h3">Generador de Horarios</Card.Header>
      <Card.Body>
        <Form>
          <Form.Group className="mb-3" controlId="gen-curso">
            <Form.Label>Selecciona un Curso para Generar:</Form.Label>
            {isDataLoading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <Form.Select 
                value={cursoSeleccionado}
                onChange={(e) => setCursoSeleccionado(e.target.value)}
              >
                <option value="">-- Seleccionar Curso --</option>
                {cursos.map(curso => (
                  <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        </Form>
        
        <hr />

        <Card.Title>Asignar Profesores a Materias:</Card.Title>
        {isReqLoading ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : (
          <ListGroup variant="flush">
            {requisitos.length === 0 && !cursoSeleccionado && 
              <ListGroup.Item>Selecciona un curso para ver sus requisitos.</ListGroup.Item>
            }
            {requisitos.length === 0 && cursoSeleccionado && 
              <ListGroup.Item>Este curso no tiene requisitos. Cárgalos en la Pestaña 1.</ListGroup.Item>
            }
            
            {requisitos.map(req => (
              <ListGroup.Item key={req.id}>
                <Row>
                  <Col md={6} className="d-flex align-items-center">
                    <span>
                      {req.materia_nombre}
                      <span className="text-muted ms-2">({req.horas_semanales} horas)</span>
                    </span>
                  </Col>
                  <Col md={6}>
                    <Form.Select 
                      value={asignaciones[req.id] || ""}
                      onChange={(e) => handleAsignacionChange(req.id, e.target.value)}
                      disabled={isDataLoading}
                    >
                      <option value="">-- Asignar Profesor --</option>
                      {profesores.map(prof => (
                        <option key={prof.id} value={prof.id}>{prof.nombre}</option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        {requisitos.length > 0 && (
          <Button 
            variant="primary"
            size="lg"
            onClick={handleGenerarHorario} 
            disabled={isSubmitting || isReqLoading || isDataLoading}
            className="mt-3 w-100"
          >
            {isSubmitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              'Generar Horario Completo'
            )}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

export default GeneradorHorario;