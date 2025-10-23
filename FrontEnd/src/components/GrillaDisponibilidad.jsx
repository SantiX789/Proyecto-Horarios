// frontend/src/components/GrillaDisponibilidad.jsx (Refactorizado con Celdas Clickables)
import React from 'react';
import { Table } from 'react-bootstrap';

// ... (las constantes DIAS, HORARIOS_RANGOS, HORARIOS_INICIO no cambian)
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_RANGOS = [
    "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
    "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
    "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
    "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
    "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40" 
];
const HORARIOS_INICIO = [
    "07:00", "07:40", "08:20", "09:00", "09:40", "10:20", "11:00", "11:40",
    "12:20", "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00",
    "17:40", "18:20", "19:00"
];

// 1. Recibimos los props del padre (GestionProfesores)
function GrillaDisponibilidad({ selectedSlots, onSlotClick }) {
  
  return (
    <Table bordered hover responsive size="sm" className="mt-3">
      <thead>
        {/* ... (el <thead> no cambia) ... */}
        <tr className="text-center">
          <th>Hora</th>
          {DIAS.map(dia => <th key={dia}>{dia}</th>)}
        </tr>
      </thead>
      <tbody>
        {HORARIOS_RANGOS.map((rango, index) => {
          const horaInicio = HORARIOS_INICIO[index];
          return (
            <tr key={rango}>
              <td>{rango}</td>
              {DIAS.map(dia => {
                // 2. Creamos el ID único para este slot
                const slotId = `${dia}-${horaInicio}`;
                // 3. Verificamos si este slot está en el Set del padre
                const isSelected = selectedSlots.has(slotId);

                return (
                  <td 
                    key={dia} 
                    className="text-center align-middle"
                    // 4. Aplicamos el color si está seleccionado
                    style={{ 
                      cursor: 'pointer', // Cambia el mouse a "manito"
                      backgroundColor: isSelected ? '#97bdfcff' : 'white' // Azul claro si está seleccionado
                    }}
                    // 5. Llamamos a la función del padre al hacer clic
                    onClick={() => onSlotClick(slotId)}
                  >
                    {/* Ya no hay checkbox, solo la celda clickable */}
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