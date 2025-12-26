import { useState, useEffect } from 'react';
import { apiFetch } from '../apiService';
import { toast } from 'react-toastify';

const HORAS = ["12:20", "13:00", "13:40"]; // Horarios típicos de almuerzo

function GestionPreferencias() {
    const [slots, setSlots] = useState([]);

    useEffect(() => {
        apiFetch('/api/config/preferencias').then(d => setSlots(d.almuerzo_slots || []));
    }, []);

    const toggle = (h) => {
        const nuevos = slots.includes(h) ? slots.filter(x => x !== h) : [...slots, h];
        setSlots(nuevos);
    };

    const guardar = async () => {
        await apiFetch('/api/config/preferencias', { method: 'POST', body: JSON.stringify({ almuerzo_slots: slots }) });
        toast.success("Preferencias guardadas");
    };

    return (
        <div>
            <p className="text-muted small">Selecciona los horarios donde PREFIERES que no haya clases (Almuerzo).</p>
            <div className="d-flex gap-2 mb-3">
                {HORAS.map(h => (
                    <button key={h} className={`btn btn-sm ${slots.includes(h) ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => toggle(h)}>
                        {h} {slots.includes(h) ? '(Bloqueado)' : ''}
                    </button>
                ))}
            </div>
            <button className="btn-teal btn-sm" onClick={guardar}>Guardar Configuración</button>
        </div>
    );
}
export default GestionPreferencias;