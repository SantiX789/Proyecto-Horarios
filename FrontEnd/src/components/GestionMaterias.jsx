import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GestionMaterias({ refreshKey, onDatosCambiados }) {
  const [materias, setMaterias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#0d9488"); // Color por defecto (Teal)

  useEffect(() => {
    cargarMaterias();
  }, [refreshKey]);

  async function cargarMaterias() {
    try {
      const data = await apiFetch('/api/materias');
      setMaterias(data);
    } catch (error) { console.error(error); }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return toast.warning("Escribe un nombre");
    try {
      // Ahora enviamos el color seleccionado
      await apiFetch('/api/materias', {
        method: 'POST',
        body: JSON.stringify({ nombre, color_hex: color }) 
      });
      toast.success("Materia creada");
      setNombre("");
      setColor("#0d9488");
      onDatosCambiados();
      cargarMaterias();
    } catch (error) { toast.error("Error al guardar"); }
  };

  const handleBorrar = async (id) => {
    if (!confirm("¿Borrar materia?")) return;
    try {
      await apiFetch(`/api/materias/${id}`, { method: 'DELETE' });
      toast.success("Eliminada");
      onDatosCambiados();
      cargarMaterias();
    } catch (error) { toast.error("No se puede borrar (está en uso)"); }
  };

  return (
    <div className="card-custom">
      <h3 className="text-primary mb-4">Materias</h3>
      
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="d-flex gap-2 mb-4 align-items-end">
        <div style={{ flex: 1 }}>
            <label className="label-custom">Nombre</label>
            <input 
                className="form-control text-uppercase" 
                value={nombre} 
                onChange={e => setNombre(e.target.value.toUpperCase())}
                placeholder="Ej: MATEMÁTICA"
            />
        </div>
        <div>
            <label className="label-custom">Color</label>
            <input 
                type="color" 
                className="form-control form-control-color" 
                value={color}
                onChange={e => setColor(e.target.value)}
                title="Elegir color para la grilla"
            />
        </div>
        <button type="submit" className="btn-teal">
            <i className="fa-solid fa-plus"></i>
        </button>
      </form>

      {/* Lista */}
      <div className="table-responsive border rounded-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <table className="table table-hover mb-0">
            <thead className="table-light sticky-top">
                <tr>
                    <th className="ps-3">MATERIA</th>
                    <th className="text-end pe-3">ACCIONES</th>
                </tr>
            </thead>
            <tbody>
                {materias.map(m => (
                    <tr key={m.id}>
                        <td className="ps-3 align-middle">
                            <div className="d-flex align-items-center gap-2">
                                <div style={{
                                    width: '15px', height: '15px', 
                                    borderRadius: '4px', backgroundColor: m.color_hex || '#ccc'
                                }}></div>
                                <span className="fw-bold text-dark">{m.nombre}</span>
                            </div>
                        </td>
                        <td className="text-end pe-3">
                            <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleBorrar(m.id)}>
                                <i className="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestionMaterias;