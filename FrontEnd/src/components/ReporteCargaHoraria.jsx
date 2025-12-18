// FrontEnd/src/components/ReporteCargaHoraria.jsx
import { useState, useEffect } from 'react';
import { Card, Table, ProgressBar, Badge } from 'react-bootstrap';
import { apiFetch } from '../apiService';
import { Bar } from 'react-chartjs-2'; // Opcional, pero usaremos barras simples de HTML primero
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Registramos componentes de gráficos (por si queremos expandir luego)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ReporteCargaHoraria({ refreshKey }) {
  const [reporte, setReporte] = useState([]);

  useEffect(() => {
    cargarReporte();
  }, [refreshKey]);

  async function cargarReporte() {
    try {
      // Este endpoint ya lo creamos en el backend en la fase anterior
      const data = await apiFetch('/api/reportes/carga-horaria-profesor');
      setReporte(data);
    } catch (error) {
      console.error("Error cargando reporte:", error);
    }
  }

  // Calculamos el máximo para la barra de progreso (ej: el que más trabaja tiene 20 hs)
  const maxHoras = reporte.reduce((acc, curr) => Math.max(acc, curr.horas_asignadas), 0) || 1;

  return (
    <div className="mt-3">
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white fw-bold">
            📊 Reporte de Carga Horaria Docente
        </Card.Header>
        <Card.Body>
          <p className="text-muted">
            Visualiza rápidamente cuántas horas cátedra tiene asignadas cada profesor en el horario actual.
          </p>

          <Table hover responsive size="sm">
            <thead className="table-light">
              <tr>
                <th style={{width: '30%'}}>Profesor</th>
                <th style={{width: '15%'}} className="text-center">Horas Asignadas</th>
                <th>Gráfico de Carga</th>
              </tr>
            </thead>
            <tbody>
              {reporte.map((item, index) => (
                <tr key={index}>
                  <td className="fw-bold">{item.nombre_profesor}</td>
                  <td className="text-center">
                    <Badge bg={item.horas_asignadas > 0 ? "success" : "secondary"} pill style={{fontSize: '0.9em'}}>
                        {item.horas_asignadas} hs
                    </Badge>
                  </td>
                  <td className="align-middle">
                    <ProgressBar 
                        now={(item.horas_asignadas / maxHoras) * 100} 
                        variant={item.horas_asignadas > 15 ? "warning" : "info"}
                        style={{height: '10px'}}
                    />
                  </td>
                </tr>
              ))}
              {reporte.length === 0 && (
                <tr>
                    <td colSpan="3" className="text-center py-4 text-muted">
                        No hay horarios generados todavía.
                    </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}

export default ReporteCargaHoraria;