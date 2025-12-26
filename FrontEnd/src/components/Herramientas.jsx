import React, { useState, useEffect } from 'react';
import { apiFetch } from '../apiService';
import { toast } from 'react-toastify';

// Sub-componentes
import BuscadorSuplentes from './BuscadorSuplentes';
import Configuracion from './Configuracion';
import GestionPreferencias from './GestionPreferencias';
import ReporteCargaHoraria from './ReporteCargaHoraria';

function Herramientas() {
  // --- ESTADO PARA LA IDENTIDAD INSTITUCIONAL ---
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Cargar configuración al iniciar
  useEffect(() => { cargarConfig(); }, []);

  const cargarConfig = async () => {
    try {
      const data = await apiFetch('/api/config/institucion');
      if (data) {
        setNombre(data.nombre || "");
        setDireccion(data.direccion || "");
        if (data.logo_base64) setLogoPreview(data.logo_base64);
      }
    } catch (error) { console.error(error); }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error("El logo es muy pesado (Max 2MB)"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result);
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const guardarConfig = async (e) => {
    e.preventDefault();
    setLoadingConfig(true);
    try {
        await apiFetch('/api/config/institucion', {
            method: 'POST',
            body: JSON.stringify({ nombre, direccion, logo_base64: logoBase64 })
        });
        toast.success("✅ Identidad guardada correctamente");
        window.location.reload(); 
    } catch (error) { toast.error("Error: " + error.message); } 
    finally { setLoadingConfig(false); }
  };

  return (
    <div className="container-fluid p-0">
      
      {/* --- CABECERA --- */}
      <div className="d-flex align-items-center mb-4">
        <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-teal">
            <i className="fa-solid fa-screwdriver-wrench fa-xl" style={{color: '#0d9488'}}></i>
        </div>
        <div>
            <h3 className="m-0 fw-bold" style={{color: 'var(--text-main, #334155)'}}>Herramientas & Configuración</h3>
            <p className="text-muted m-0 small">Utilidades del sistema y mantenimiento.</p>
        </div>
      </div>

      <div className="row g-4">
        
        {/* === COLUMNA IZQUIERDA (Principal) === */}
        <div className="col-lg-7">
            
            {/* 1. IDENTIDAD INSTITUCIONAL (DISEÑO LIMPIO) */}
            <div className="card-custom border-0 shadow-sm mb-4" style={{borderLeft: '5px solid #0d9488'}}>
                <div className="d-flex align-items-center mb-3">
                    <i className="fa-solid fa-school me-2 text-teal" style={{color: '#0d9488'}}></i>
                    <h5 className="m-0 fw-bold">Identidad Institucional</h5>
                </div>
                
                <div className="bg-light p-3 rounded-3 border">
                    <form onSubmit={guardarConfig}>
                        <div className="row align-items-center">
                            
                            {/* Lado Izquierdo: Logo */}
                            <div className="col-md-3 text-center mb-3 mb-md-0">
                                <div className="border rounded-circle d-flex align-items-center justify-content-center mx-auto position-relative overflow-hidden bg-white shadow-sm" 
                                     style={{width: '90px', height: '90px', border: '2px solid #e2e8f0'}}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                                    ) : (
                                        <i className="fa-solid fa-image text-muted fa-2x"></i>
                                    )}
                                </div>
                                <label className="btn btn-sm btn-outline-secondary mt-2 w-100" style={{fontSize: '0.8rem'}}>
                                    <i className="fa-solid fa-camera me-1"></i> Cambiar
                                    <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                                </label>
                            </div>

                            {/* Lado Derecho: Inputs + Botón */}
                            <div className="col-md-9">
                                <div className="mb-2">
                                    <label className="form-label small fw-bold text-muted mb-1">Nombre del Establecimiento</label>
                                    <input type="text" className="form-control" placeholder="Ej: Escuela Melipal" 
                                        value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted mb-1">Dirección / Localidad</label>
                                    <input type="text" className="form-control" placeholder="Ej: Calle Plaza 123" 
                                        value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                                </div>
                                
                                {/* BOTÓN DE GUARDAR (VISIBLE) */}
                                <div className="d-grid">
                                    <button 
                                        type="submit" 
                                        className="btn text-white fw-bold shadow-sm" 
                                        style={{ backgroundColor: '#0d9488', borderColor: '#0f766e' }}
                                        disabled={loadingConfig}
                                    >
                                        {loadingConfig ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-floppy-disk me-2"></i> GUARDAR CAMBIOS</>}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </form>
                </div>
            </div>
            
            {/* 2. BUSCADOR DE SUPLENTES */}
            <div className="card-custom border-0 shadow-sm mb-4">
                <div className="d-flex align-items-center mb-3">
                    <i className="fa-solid fa-magnifying-glass me-2 text-primary"></i>
                    <h5 className="m-0 fw-bold">Buscador de Suplentes</h5>
                </div>
                <div className="bg-light p-3 rounded-3 border">
                    <BuscadorSuplentes />
                </div>
            </div>

            {/* 3. REPORTES */}
            <div className="card-custom">
                <div className="d-flex align-items-center mb-3">
                    <i className="fa-solid fa-chart-pie me-2 text-purple" style={{color: '#6f42c1'}}></i>
                    <h5 className="m-0 fw-bold">Reporte de Carga Horaria</h5>
                </div>
                <ReporteCargaHoraria />
            </div>
        </div>

        {/* === COLUMNA DERECHA (Secundaria) === */}
        <div className="col-lg-5">
            
            {/* 4. PREFERENCIAS (Almuerzo) */}
            <div className="card-custom mb-4">
                <div className="d-flex align-items-center mb-3">
                    <i className="fa-solid fa-utensils me-2 text-warning"></i>
                    <h5 className="m-0 fw-bold">Preferencias Globales</h5>
                </div>
                <div className="alert alert-light border small text-muted">
                    <i className="fa-solid fa-circle-info me-1"></i>
                    Define los horarios donde prefieres <b>evitar clases</b>.
                </div>
                <GestionPreferencias />
            </div>

            {/* 5. MANTENIMIENTO (Danger Zone) */}
            <div className="card-custom mb-4" style={{borderColor: '#fecaca', backgroundColor: '#fff5f5'}}>
                <div className="d-flex align-items-center mb-3 text-danger">
                    <i className="fa-solid fa-triangle-exclamation me-2"></i>
                    <h5 className="m-0 fw-bold">Zona de Peligro</h5>
                </div>
                <p className="small text-danger opacity-75">
                    Las acciones aquí son irreversibles.
                </p>
                <Configuracion />
            </div>

            {/* 6. INFO DOCENTES */}
            <div className="card-custom text-white p-4 shadow" style={{background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'}}>
                <h5 className="fw-bold mb-2"><i className="fa-solid fa-user-lock me-2"></i>Portal Docente</h5>
                <p className="small opacity-75 mb-0">
                    Recuerda que los profesores pueden ingresar con su usuario y contraseña para ver sus propios horarios.
                </p>
            </div>

        </div>
      </div>
    </div>
  );
}

export default Herramientas;