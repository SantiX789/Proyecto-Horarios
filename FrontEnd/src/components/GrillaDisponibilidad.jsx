// frontend/src/components/GrillaDisponibilidad.jsx
import React from 'react';
import { Table } from 'react-bootstrap';

// Constantes
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
    "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
    "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
    "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
    "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
    "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
];
const HORARIOS_INICIO = [ // El ID se basa en la hora de inicio
    "07:00", "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40",
    "12:20", "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",
    "17:40", "18:20", "19:00", "19:40" // Asegúrate de incluir todas las horas de inicio
];

// 1. Recibimos los props 'selectedSlots' y 'onSlotClick' del padre
function GrillaDisponibilidad({ selectedSlots, onSlotClick }) {
  
  return (
    <Table bordered hover responsive size="sm" className="mt-3">
      <thead>
        <tr className="text-center">
          <th>Hora</th>
          {DIAS.map(dia => <th key={dia}>{dia}</th>)}
        </tr>
      </thead>
      <tbody>
        {HORARIOS_RANGOS.map((rango, index) => {
          const horaInicio = HORARIOS_INICIO[index];
          // Manejar posible desajuste de longitud
          if (!horaInicio) return null; 
          
          return (
            <tr key={rango}>
              <td>{rango}</td>
              {DIAS.map(dia => {
                const slotId = `${dia}-${horaInicio}`;
                const isSelected = selectedSlots && selectedSlots.has(slotId); // Chequeo de seguridad

                return (
                  <td 
                    key={dia} 
                    className="text-center align-middle"
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#a0c4ff' : 'white' // Azul si está seleccionado
                    }}
                    // 2. Llamamos a la función del padre al hacer clic
                    onClick={() => onSlotClick(slotId)}
                  >
                    {/* No hay nada adentro, solo la celda clickable */}
                  </td>
                )
              })}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export default GrillaDisponibilidad;