// frontend/src/components/GestionRequisitos.jsx
import { useState, useEffect } from 'react';
import { Form, Button, Card, Spinner, ListGroup, Row, Col, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

const TIPOS_AULA = ["Normal", "Laboratorio", "Gimnasio", "Sala de Informática", "Taller", "Otro"];

function GestionRequisitos({ refreshKey, onDatosCambiados }) {
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [horas, setHoras] = useState("");
  const [tipoAulaReq, setTipoAulaReq] = useState(TIPOS_AULA[0]);
  const [requisitosDelCurso, setRequisitosDelCurso] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isReqLoading, setIsReqLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function cargarDatosMaestros() {
    setIsDataLoading(true);
    try {
      const [cursosData, materiasData] = await Promise.all([
        apiFetch('/api/cursos'),
        apiFetch('/api/materias')
      ]);

      setCursos(cursosData);
      setMaterias(materiasData);

      if (cursosData.length > 0) setCursoSeleccionado(cursosData[0].id);
      if (materiasData.length > 0) setMateriaSeleccionada(materiasData[0].id);

    } catch (error) {
      toast.error(`Error cargando datos: ${error.message}`);
    }
    setIsDataLoading(false);
  }

  async function cargarRequisitosDelCurso(cursoId) {
    if (!cursoId) {
      setRequisitosDelCurso([]);
      return;
    }
    setIsReqLoading(true);
    try {
      const data = await apiFetch(`/api/requisitos/${cursoId}`);
      setRequisitosDelCurso(data);
    } catch (error) {
      toast.error(`Error cargando requisitos: ${error.message}`);
    }
    setIsReqLoading(false);
  }

  useEffect(() => {
    cargarDatosMaestros();
  }, [refreshKey]);

  useEffect(() => {
    if (cursoSeleccionado) {
      cargarRequisitosDelCurso(cursoSeleccionado);
    }
  }, [cursoSeleccionado, refreshKey]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cursoSeleccionado || !materiaSeleccionada || !horas) {
      toast.warn("Por favor, completa todos los campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const requisitoData = {
        curso_id: cursoSeleccionado,
        materia_id: materiaSeleccionada,
        horas_semanales: parseInt(horas, 10),
        tipo_aula_requerida: tipoAulaReq
      };

      await apiFetch('/api/requisitos', {
        method: 'POST',
        body: JSON.stringify(requisitoData)
      });

      toast.success("¡Requisito guardado!");
      setHoras("");
      setTipoAulaReq(TIPOS_AULA[0]);
      cargarRequisitosDelCurso(cursoSeleccionado);
      if (onDatosCambiados) onDatosCambiados();
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper para mostrar nombre bonito
  const getNombreCurso = (c) => c.nombre_display || `${c.anio} "${c.division}"`;

  return (
    <Card className="mt-3 shadow-sm border-0">
      <Card.Body>
        <Card.Title>Gestión de Requisitos</Card.Title>
        <Form onSubmit={handleSubmit}>
          {isDataLoading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : (
            <Row className="mb-3 align-items-baseline">
              
              <Form.Group as={Col} md={3} controlId="req-curso">
                <Form.Label>Curso:</Form.Label>
                <Form.Select
                  value={cursoSeleccionado}
                  onChange={(e) => setCursoSeleccionado(e.target.value)}
                  disabled={isSubmitting || isDataLoading}
                >
                  <option value="">-- Seleccionar Curso --</option>
                  {cursos.map(curso => (
                    <option key={curso.id} value={curso.id}>
                      {getNombreCurso(curso)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group as={Col} md={3} controlId="req-materia">
                <Form.Label>Materia:</Form.Label>
                <Form.Select
                  value={materiaSeleccionada}
                  onChange={(e) => setMateriaSeleccionada(e.target.value)}
                  disabled={isSubmitting || isDataLoading}
                >
                   <option value="">-- Seleccionar Materia --</option>
                  {materias.map(materia => (
                    <option key={materia.id} value={materia.id}>{materia.nombre}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              
              <Form.Group as={Col} md={3} controlId="req-tipo-aula">
                <Form.Label>Tipo de Aula Req.:</Form.Label>
                <Form.Select
                  value={tipoAulaReq}
                  onChange={(e) => setTipoAulaReq(e.target.value)}
                  disabled={isSubmitting || isDataLoading}
                >
                  {TIPOS_AULA.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group as={Col} md={3} controlId="req-horas">
                <Form.Label>Horas Semanales:</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="Ej: 5"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  disabled={isSubmitting}
                />
              </Form.Group>
            </Row>
          )}

          <Button variant="primary" type="submit" disabled={isDataLoading || isSubmitting}>
            {isSubmitting ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              'Guardar Requisito'
            )}
          </Button>
        </Form>

        <h4 className="mt-4">Requisitos Actuales para el Curso:</h4>
        {isReqLoading ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : (
          <ListGroup variant="flush">
            {requisitosDelCurso.length === 0 && <ListGroup.Item>Este curso no tiene requisitos cargados.</ListGroup.Item>}
            {requisitosDelCurso.map(req => (
              <ListGroup.Item key={req.id}>
                <strong>{req.materia_nombre}</strong>
                <span className="text-muted ms-2">({req.horas_semanales} horas)</span>
                {req.tipo_aula_requerida && req.tipo_aula_requerida !== "Normal" && (
                  <Badge bg="info" className="ms-2">{req.tipo_aula_requerida}</Badge>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}

export default GestionRequisitos;