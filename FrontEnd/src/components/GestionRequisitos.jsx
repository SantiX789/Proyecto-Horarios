// frontend/src/components/GestionRequisitos.jsx (Refactorizado)
import { useState, useEffect } from 'react';

// 1. Importamos los componentes
import { Form, Button, Card, Spinner, ListGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';

const API_URL = "http://127.0.0.1:8000";

function GestionRequisitos({ refreshKey, onDatosCambiados }) {
  // Listas para los dropdowns
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  
  // Datos del formulario
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [horas, setHoras] = useState("");

  // Lista de requisitos existentes
  const [requisitosDelCurso, setRequisitosDelCurso] = useState([]);

  // 2. Estados de Carga (UX)
  const [isDataLoading, setIsDataLoading] = useState(false); // Para los <select>
  const [isReqLoading, setIsReqLoading] = useState(false);   // Para la lista de requisitos
  const [isSubmitting, setIsSubmitting] = useState(false); // Para el botón de guardar

  // Cargar Cursos y Materias para los menús <select>
  async function cargarDatosMaestros() {
    setIsDataLoading(true);
    try {
      const [cursosRes, materiasRes] = await Promise.all([
        fetch(`${API_URL}/api/cursos`),
        fetch(`${API_URL}/api/materias`)
      ]);
      
      const cursosData = await cursosRes.json();
      const materiasData = await materiasRes.json();

      setCursos(cursosData);
      setMaterias(materiasData);

      if (cursosData.length > 0) setCursoSeleccionado(cursosData[0].id);
      if (materiasData.length > 0) setMateriaSeleccionada(materiasData[0].id);

    } catch (error) {
      toast.error("Error cargando cursos o materias.");
    }
    setIsDataLoading(false);
  }

  // Cargar los requisitos existentes para el curso seleccionado
  async function cargarRequisitosDelCurso(cursoId) {
    if (!cursoId) {
      setRequisitosDelCurso([]);
      return;
    }
    setIsReqLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/requisitos/${cursoId}`);
      const data = await response.json();
      setRequisitosDelCurso(data);
    } catch (error)
 {
      toast.error("Error cargando requisitos del curso.");
    }
    setIsReqLoading(false);
  }

  // Efecto para cargar Cursos y Materias
  useEffect(() => {
    cargarDatosMaestros();
  }, [refreshKey]); // Recarga si la data maestra cambia

  // Efecto para cargar Requisitos
  useEffect(() => {
    cargarRequisitosDelCurso(cursoSeleccionado);
  }, [cursoSeleccionado, refreshKey]);

  // Manejar el envío del formulario
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
        horas_semanales: parseInt(horas, 10)
      };

      const response = await fetch(`${API_URL}/api/requisitos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requisitoData)
      });

      if (response.ok) {
        toast.success("¡Requisito guardado!");
        setHoras(""); // Limpia el input de horas
        cargarRequisitosDelCurso(cursoSeleccionado); // Refresca la lista
        if (onDatosCambiados) onDatosCambiados();
      } else {
        toast.error("Error al guardar el requisito.");
      }
    } catch (error) {
      toast.error("Error de red al guardar el requisito.");
    }
    
    setIsSubmitting(false);
  }

  // 3. Usamos los nuevos componentes de React-Bootstrap
  return (
    <Card className="mt-3">
      <Card.Body>
        <Card.Title>Gestión de Requisitos</Card.Title>
        <Form onSubmit={handleSubmit}>
          {isDataLoading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : (
            <Row className="mb-3">
              <Form.Group as={Col} controlId="req-curso">
                <Form.Label>Curso:</Form.Label>
                <Form.Select 
                  value={cursoSeleccionado}
                  onChange={(e) => setCursoSeleccionado(e.target.value)}
                  disabled={isSubmitting}
                >
                  {cursos.map(curso => (
                    <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group as={Col} controlId="req-materia">
                <Form.Label>Materia:</Form.Label>
                <Form.Select 
                  value={materiaSeleccionada}
                  onChange={(e) => setMateriaSeleccionada(e.target.value)}
                  disabled={isSubmitting}
                >
                  {materias.map(materia => (
                    <option key={materia.id} value={materia.id}>{materia.nombre}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group as={Col} controlId="req-horas">
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
            {requisitosDelCurso.length === 0 && <ListGroup.Item>Este curso no tiene requisitos.</ListGroup.Item>}
            {requisitosDelCurso.map(req => (
              <ListGroup.Item key={req.id}>
                {req.materia_nombre}
                <span className="text-muted ms-2">({req.horas_semanales} horas)</span>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}

export default GestionRequisitos;