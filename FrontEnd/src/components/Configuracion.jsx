import { apiFetch } from '../apiService';
import { toast } from 'react-toastify';

function Configuracion() {
    const handleReset = async () => {
        if(!confirm("⚠️ ¿ESTÁS SEGURO?\nEsto borrará TODOS los horarios generados.\nNo borra profesores ni cursos.")) return;
        try {
            await apiFetch('/api/admin/reset-horarios', { method: 'DELETE' });
            toast.success("Horarios eliminados correctamente.");
        } catch(e) { toast.error("Error al resetear."); }
    };

    return (
        <div>
            <p className="text-muted small">Acciones de mantenimiento del sistema.</p>
            <button className="btn btn-outline-danger btn-sm w-100 text-start" onClick={handleReset}>
                <i className="fa-solid fa-triangle-exclamation me-2"></i> Borrar todos los horarios generados
            </button>
        </div>
    );
}
export default Configuracion;