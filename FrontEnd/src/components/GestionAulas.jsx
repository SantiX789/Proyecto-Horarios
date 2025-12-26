import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GestionAulas({ refreshKey, onDatosCambiados }) {
  const [aulas, setAulas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState("");

  useEffect(() => {
    cargarAulas();
  }, [refreshKey]);

  async function cargarAulas() {
    try {
      const data = await apiFetch('/api/aulas');
      setAulas(data);
    } catch (error) {
      console.error(error);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return toast.warning("Falta el nombre");

    try {
      await apiFetch('/api/aulas', {
        method: 'POST',
        body: JSON.stringify({ 
            nombre, 
            capacidad: parseInt(capacidad) || 30 // Default 30 si no pone nada
        })
      });
      toast.success("Aula creada");
      setNombre("");
      setCapacidad("");
      onDatosCambiados();
      cargarAulas();
    } catch (error) {
      toast.error("Error al guardar");
    }
  };

  const handleBorrar = async (id) => {
    if (!confirm("¿Borrar aula?")) return;
    try {
      await apiFetch(`/api/aulas/${id}`, { method: 'DELETE' });
      toast.success("Eliminada");
      onDatosCambiados();
      cargarAulas();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="card-custom h-100">
      <h3 className="text-primary mb-0">🏫 Infraestructura</h3>
      <p className="text-muted small mb-4">Gestiona los espacios físicos disponibles.</p>

      {/* INPUTS DE CARGA */}
      <form onSubmit={handleSubmit} className="d-flex gap-2 mb-4 align-items-center">
        <input 
            className="form-control"
            placeholder="Nombre (Ej: Lab. Informática)"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={{flex: 2}}
        />
        <input 
            type="number"
            className="form-control"
            placeholder="Cap."
            value={capacidad}
            onChange={e => setCapacidad(e.target.value)}
            style={{flex: 1}}
        />
        <button type="submit" className="btn-teal btn-sm px-3">
            <i className="fa-solid fa-plus"></i>
        </button>
      </form>

      {/* TABLA */}
      <div className="table-responsive border rounded-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        <table className="table table-hover mb-0">
            <thead className="table-light sticky-top">
                <tr>
                    <th className="ps-3">ESPACIO</th>
                    <th className="text-center">CAPACIDAD</th>
                    <th className="text-end pe-3"></th>
                </tr>
            </thead>
            <tbody>
                {aulas.map(a => (
                    <tr key={a.id}>
                        <td className="ps-3 fw-bold text-dark">{a.nombre}</td>
                        <td className="text-center">
                            <span className="badge bg-secondary-subtle text-dark rounded-pill">
                                <i className="fa-solid fa-users me-1"></i> {a.capacidad}
                            </span>
                        </td>
                        <td className="text-end pe-3">
                            <button 
                                className="btn btn-outline-danger btn-sm border-0"
                                onClick={() => handleBorrar(a.id)}
                            >
                                <i className="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                ))}
                {aulas.length === 0 && (
                    <tr><td colSpan="3" className="text-center text-muted p-3">Sin aulas cargadas</td></tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestionAulas;