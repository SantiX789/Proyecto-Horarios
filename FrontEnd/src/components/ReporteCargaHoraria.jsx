// frontend/src/components/ReporteCargaHoraria.jsx
import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

// Recibe refreshKey para saber cuándo recargar
function ReporteCargaHoraria({ refreshKey }) {
  const [data, setData] = useState([]); // [{ nombre_profesor: "...", horas_asignadas: 0 }]
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar los datos del reporte
  async function cargarReporte() {
    setIsLoading(true);
    setError("");
    try {
      const reporteData = await apiFetch('/api/reportes/carga-horaria-profesor');
      setData(reporteData);
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar el reporte: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Cargar al montar y cuando refreshKey cambie
  useEffect(() => {
    cargarReporte();
  }, [refreshKey]);

  // Renderizado
  if (isLoading) {
    return (
      <div className="text-center mt-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando reporte...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-3">Error: {error}</Alert>;
  }

  return (
    <Card className="mt-3 shadow-sm border-0">
      <Card.Body>
        <Card.Title>Reporte: Carga Horaria por Profesor</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          Total de horas (bloques de 40 min) asignadas a cada profesor en todos los cursos.
        </Card.Subtitle>
        <Table striped bordered hover responsive size="sm" className="mt-3">
          <thead className="table-primary">
            <tr>
              <th>#</th>
              <th>Nombre del Profesor</th>
              <th>Horas Asignadas</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center">No hay datos para mostrar.</td>
              </tr>
            )}
            {data.map((profesor, index) => (
              <tr key={profesor.nombre_profesor}>
                <td>{index + 1}</td>
                <td>{profesor.nombre_profesor}</td>
                <td>{profesor.horas_asignadas}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

export default ReporteCargaHoraria;