// frontend/src/components/GeneradorHorario.jsx (CORREGIDO FASE 1)
import { useState, useEffect } from 'react';
import { Form, Button, Card, Spinner, ListGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GeneradorHorario({ refreshKey, onDatosCambiados }) {
  // --- Estados ---
  const [cursos, setCursos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [requisitos, setRequisitos] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isReqLoading, setIsReqLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Funciones de Carga ---
  async function cargarDatosMaestros() {
    setIsDataLoading(true);
    try {
      const [cursosData, profData] = await Promise.all([
        apiFetch('/api/cursos'),
        apiFetch('/api/profesores')
      ]);
      setCursos(cursosData);
      setProfesores(profData);
    } catch (error) {
      toast.error(`Error cargando datos maestros: ${error.message}`);
    }
    setIsDataLoading(false);
  }

  async function cargarRequisitos(cursoId) {
    if (!cursoId) {
      setRequisitos([]);
      setAsignaciones({});
      return;
    }
    setIsReqLoading(true);
    try {
      const data = await apiFetch(`/api/requisitos/${cursoId}`);
      setRequisitos(data);
      setAsignaciones({});
    } catch (error) {
      toast.error(`Error cargando requisitos: ${error.message}`);
    }
    setIsReqLoading(false);
  }

  // --- Efectos ---
  useEffect(() => {
    cargarDatosMaestros();
  }, [refreshKey]);

  useEffect(() => {
    cargarRequisitos(cursoSeleccionado);
  }, [cursoSeleccionado]);

  // --- Handlers ---
  function handleAsignacionChange(requisitoId, profesorId) {
    setAsignaciones(prev => ({
      ...prev,
      [requisitoId]: profesorId
    }));
  }

  async function handleGenerarHorario() {
    // 1. VALIDACIÓN
    if (!cursoSeleccionado) {
      toast.warn("Selecciona un curso.");
      return;
    }

    const asignacionesArray = Object.keys(asignaciones).map(reqId => ({
      requisito_id: reqId,
      profesor_id: asignaciones[reqId]
    })).filter(a => a.profesor_id);

    if (asignacionesArray.length === 0) {
      toast.warn("Asigna al menos un profesor a una materia.");
      return;
    }

    // Advertencia si faltan profes (opcional)
    if (asignacionesArray.length < requisitos.length) {
      if (!confirm("No has asignado profesores a todas las materias. ¿Deseas continuar igualmente?")) {
        return;
      }
    }

    const solverRequest = {
      curso_id: cursoSeleccionado,
      asignaciones: asignacionesArray
    };

    // 2. Ejecución
    setIsSubmitting(true);
    try {
      // Llamamos al endpoint (ahora asíncrono)
      const result = await apiFetch('/api/generar-horario-completo', {
        method: 'POST',
        body: JSON.stringify(solverRequest)
      });

      toast.success(result.mensaje);

    } catch (error) {
      if (error.status === 409) {
        toast.error(`No se pudo generar: ${error.message}`);
      } else if (error.status === 401) {
        toast.error("Error de autenticación. Intenta iniciar sesión de nuevo.");
      } else {
        toast.error(`Error inesperado: ${error.message}`);
      }
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Helper para mostrar nombre (CORRECCIÓN CLAVE) ---
  const getNombreCurso = (c) => c.nombre_display || `${c.anio} "${c.division}"`;

  // --- Renderizado del Componente ---
  return (
    <Card border="primary" className="mt-3 shadow-sm border-0">
      <Card.Header as="h5">Generador de Horarios</Card.Header>
      <Card.Body>
        <Form>
          <Form.Group className="mb-3" controlId="gen-curso">
            <Form.Label>Selecciona un Curso para Generar:</Form.Label>
            {isDataLoading ? (
              <Spinner animation="border" size="sm" className="ms-2" />
            ) : (
              <Form.Select
                value={cursoSeleccionado}
                onChange={(e) => setCursoSeleccionado(e.target.value)}
              >
                <option value="">-- Seleccionar Curso --</option>
                {/* AQUÍ ESTABA EL ERROR: Ahora usamos getNombreCurso */}
                {cursos.map(curso => (
                  <option key={curso.id} value={curso.id}>
                    {getNombreCurso(curso)}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        </Form>

        <hr />

        <h6 className="mb-3">Asignar Profesores a Materias:</h6>
        {isReqLoading ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : (
          <ListGroup variant="flush">
            {requisitos.length === 0 && !cursoSeleccionado &&
              <ListGroup.Item className="text-muted fst-italic">Selecciona un curso primero.</ListGroup.Item>
            }
            {requisitos.length === 0 && cursoSeleccionado &&
              <ListGroup.Item className="text-muted">Este curso no tiene requisitos cargados.</ListGroup.Item>
            }

            {requisitos.map(req => (
              <ListGroup.Item key={req.id}>
                <Row>
                  <Col md={6} className="d-flex align-items-center">
                    <div>
                      <strong>{req.materia_nombre}</strong>
                      <span className="text-muted ms-2 small">({req.horas_semanales} hs)</span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <Form.Select
                      size="sm"
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
            variant="success"
            size="lg"
            onClick={handleGenerarHorario}
            disabled={isSubmitting || isReqLoading || isDataLoading}
            className="mt-4 w-100"
          >
            {isSubmitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Generando...
              </>
            ) : (
              '⚡ Generar Horario Completo'
            )}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

export default GeneradorHorario;