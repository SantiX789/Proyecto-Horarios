import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function GestionCursos({ refreshKey, onDatosCambiados }) {
  const [cursos, setCursos] = useState([]);
  
  // Estados del formulario
  const [anio, setAnio] = useState("1° Año");
  const [division, setDivision] = useState("");
  const [turno, setTurno] = useState("Mañana");
  const [cantidadAlumnos, setCantidadAlumnos] = useState(30); // Nuevo Campo (Default 30)

  const opcionesAnio = ["1° Año", "2° Año", "3° Año", "4° Año", "5° Año", "6° Año"];

  useEffect(() => {
    cargarCursos();
  }, [refreshKey]);

  async function cargarCursos() {
    try {
      const data = await apiFetch('/api/cursos');
      // Ordenar: Primero por Año, luego por División
      const ordenados = data.sort((a, b) => {
        if (a.anio === b.anio) return a.division.localeCompare(b.division);
        return a.anio.localeCompare(b.anio);
      });
      setCursos(ordenados);
    } catch (error) {
      console.error(error);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!division) return toast.warning("Falta la división");

    try {
      await apiFetch('/api/cursos', {
        method: 'POST',
        body: JSON.stringify({ 
            anio, 
            division, 
            turno,
            cantidad_alumnos: parseInt(cantidadAlumnos) // Enviamos el nuevo dato
        })
      });
      toast.success("Curso creado");
      setDivision(""); 
      setCantidadAlumnos(30); // Reset a valor por defecto
      onDatosCambiados();
      cargarCursos();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    }
  };

  const handleBorrar = async (id) => {
    if (!confirm("¿Borrar este curso? Se borrarán sus horarios asociados.")) return;
    try {
      await apiFetch(`/api/cursos/${id}`, { method: 'DELETE' });
      toast.success("Eliminado");
      onDatosCambiados();
      cargarCursos();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="grid-2">
      
      {/* --- COLUMNA IZQUIERDA: FORMULARIO --- */}
      <div className="card-custom h-100">
        <h3 className="text-primary mb-4">Crear Curso</h3>
        
        <form onSubmit={handleSubmit}>
            <div className="row mb-3">
                <div className="col-md-6">
                    <label className="label-custom">Año / Nivel</label>
                    <select 
                        className="form-select" 
                        value={anio} 
                        onChange={e => setAnio(e.target.value)}
                    >
                        {opcionesAnio.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                </div>
                <div className="col-md-6">
                    <label className="label-custom">División</label>
                    <input 
                        className="form-control text-uppercase" 
                        placeholder="Ej: A, B" 
                        value={division}
                        onChange={e => setDivision(e.target.value.toUpperCase())}
                        maxLength={5}
                    />
                </div>
            </div>

            {/* NUEVO CAMPO: CANTIDAD DE ALUMNOS */}
            <div className="mb-3">
                <label className="label-custom">Cant. Alumnos</label>
                <input 
                    type="number"
                    className="form-control" 
                    placeholder="Ej: 30" 
                    value={cantidadAlumnos}
                    onChange={e => setCantidadAlumnos(e.target.value)}
                    min="1" max="100"
                />
            </div>

            <div className="mb-4">
              <label className="label-custom mb-2">Turno</label>
              <div className="d-flex gap-3">
                <div className="form-check">
                    <input 
                        className="form-check-input" type="radio" name="turno" id="t-manana"
                        checked={turno === "Mañana"} onChange={() => setTurno("Mañana")}
                    />
                    <label className="form-check-label" htmlFor="t-manana">Mañana</label>
                </div>
                <div className="form-check">
                    <input 
                        className="form-check-input" type="radio" name="turno" id="t-tarde"
                        checked={turno === "Tarde"} onChange={() => setTurno("Tarde")}
                    />
                    <label className="form-check-label" htmlFor="t-tarde">Tarde</label>
                </div>
                <div className="form-check">
                    <input 
                        className="form-check-input" type="radio" name="turno" id="t-vesp"
                        checked={turno === "Vespertino"} onChange={() => setTurno("Vespertino")}
                    />
                    <label className="form-check-label" htmlFor="t-vesp">Vesp.</label>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-teal w-100 py-2">
              <i className="fa-solid fa-plus me-2"></i> Crear Curso
            </button>
        </form>
      </div>

      {/* --- COLUMNA DERECHA: TABLA --- */}
      <div className="card-custom h-100">
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="text-secondary m-0">Cursos Cargados</h3>
            <span className="badge bg-secondary-subtle text-secondary rounded-pill">
                {cursos.length} Total
            </span>
        </div>

        <div className="table-responsive border rounded-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table table-hover mb-0">
                <thead className="table-light sticky-top">
                    <tr>
                        <th className="ps-3">CURSO</th>
                        <th className="text-center">ALUMNOS</th>
                        <th>TURNO</th>
                        <th className="text-end pe-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {cursos.map(c => (
                        <tr key={c.id}>
                            <td className="ps-3 fw-bold text-dark align-middle">
                                {c.anio} "{c.division}"
                            </td>
                            <td className="text-center align-middle">
                                <span className="badge bg-light text-dark border rounded-pill">
                                    <i className="fa-solid fa-users me-1"></i>
                                    {/* Mostramos el dato si existe, si no un guion */}
                                    {c.cantidad_alumnos || '-'} 
                                </span>
                            </td>
                            <td className="align-middle">
                                <span className={`badge ${
                                    c.turno === 'Mañana' ? 'bg-warning-subtle text-warning-emphasis' : 
                                    c.turno === 'Tarde' ? 'bg-info-subtle text-info-emphasis' : 
                                    'bg-dark-subtle text-dark-emphasis'
                                }`}>
                                    {c.turno}
                                </span>
                            </td>
                            <td className="text-end pe-3 align-middle">
                                <button 
                                    className="btn btn-outline-danger btn-sm border-0"
                                    onClick={() => handleBorrar(c.id)}
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {cursos.length === 0 && (
                        <tr><td colSpan="4" className="text-center text-muted p-4">No hay cursos creados</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
}

export default GestionCursos;