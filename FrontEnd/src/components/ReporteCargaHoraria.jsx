import { useState, useEffect } from 'react';
import { apiFetch } from '../apiService';

function ReporteCargaHoraria() {
    const [datos, setDatos] = useState([]);

    useEffect(() => {
        apiFetch('/api/reportes/carga-horaria-profesor').then(d => setDatos(d));
    }, []);

    return (
        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
            <table className="table table-sm table-bordered mb-0" style={{fontSize: '0.85rem'}}>
                <thead className="table-light"><tr><th>Docente</th><th>Hs Asignadas</th></tr></thead>
                <tbody>
                    {datos.map((d, i) => (
                        <tr key={i}><td>{d.nombre_profesor}</td><td className="fw-bold text-center">{d.horas_asignadas}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export default ReporteCargaHoraria;