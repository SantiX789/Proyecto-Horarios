// frontend/src/components/GeneradorHorario.jsx (Corregido)
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
    // 1. VALIDACIÓN y PREPARACIÓN - Ahora DENTRO de la función
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

    if (asignacionesArray.length < requisitos.length) {
      if (!confirm("No has asignado profesores a todas las materias. ¿Deseas continuar igualmente?")) {
        return;
      }
    }

    const solverRequest = {
      curso_id: cursoSeleccionado,
      asignaciones: asignacionesArray
    };

    // 2. Ejecución de la llamada a la API
    setIsSubmitting(true);
    try {
      const result = await apiFetch('/api/generar-horario-completo', {
        method: 'POST',
        body: JSON.stringify(solverRequest)
      });

      if (result.faltantes_total > 0) {
        toast.warn(result.mensaje);
      } else {
        toast.success(result.mensaje);
      }
      onDatosCambiados();

    } catch (error) {
      // Manejo de errores (como lo teníamos antes)
      if (error.status === 409) {
        toast.error(`No se pudo generar: ${error.message}`);
      } else if (error.status === 401) {
        toast.error("Error de autenticación. Intenta iniciar sesión de nuevo.");
      } else {
        toast.error(`Error inesperado (${error.status || 'Red'}): ${error.message}`);
      }
      console.error("Detalle completo del error:", error);
    } finally {
      // 3. Aseguramos que el spinner se desactive SIEMPRE
      setIsSubmitting(false);
    }
  } // <-- Llave de cierre de handleGenerarHorario

  // --- Renderizado del Componente ---
  return (
    <Card border="primary">
      <Card.Header as="h3">Generador de Horarios (Cuadro 3)</Card.Header>
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
  ); // <-- Cierre del return

} // <-- Cierre de la función GeneradorHorario

export default GeneradorHorario; // <-- Exportación