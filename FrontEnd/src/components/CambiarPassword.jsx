import React, { useState } from 'react';
import { apiFetch } from '../apiService';
import { toast } from 'react-toastify';

function CambiarPassword() {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Un solo estado para destapar los 3 campos a la vez
  const [mostrarTodo, setMostrarTodo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) return toast.warning("Las contraseñas nuevas no coinciden");
    if (newPass.length < 4) return toast.warning("La contraseña es muy corta");

    setLoading(true);
    try {
        await apiFetch('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ current_password: currentPass, new_password: newPass })
        });
        toast.success("🔐 ¡Contraseña actualizada!");
        setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } catch (error) {
        toast.error(error.message || "Error al cambiar contraseña");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="card-custom border shadow-sm p-4 mx-auto" style={{maxWidth: '500px'}}>
        <div className="text-center mb-4">
            <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{width: '60px', height: '60px'}}>
                <i className="fa-solid fa-lock fa-xl text-teal"></i>
            </div>
            <h5 className="fw-bold text-dark">Seguridad de la Cuenta</h5>
        </div>

        <form onSubmit={handleSubmit}>
            {/* BOTÓN TOGGLE GLOBAL */}
            <div className="d-flex justify-content-end mb-2">
                <button type="button" className="btn btn-sm btn-link text-decoration-none text-muted" onClick={() => setMostrarTodo(!mostrarTodo)}>
                    <i className={`fa-solid ${mostrarTodo ? 'fa-eye-slash' : 'fa-eye'} me-1`}></i> 
                    {mostrarTodo ? 'Ocultar' : 'Mostrar'} caracteres
                </button>
            </div>

            <div className="mb-3">
                <label className="form-label small fw-bold text-muted">Contraseña Actual</label>
                <input 
                    type={mostrarTodo ? "text" : "password"} 
                    className="form-control" 
                    value={currentPass} onChange={e => setCurrentPass(e.target.value)} required 
                />
            </div>
            
            <div className="mb-3">
                <label className="form-label small fw-bold text-muted">Nueva Contraseña</label>
                <input 
                    type={mostrarTodo ? "text" : "password"} 
                    className="form-control" 
                    value={newPass} onChange={e => setNewPass(e.target.value)} required 
                />
            </div>

            <div className="mb-4">
                <label className="form-label small fw-bold text-muted">Confirmar Nueva</label>
                <input 
                    type={mostrarTodo ? "text" : "password"} 
                    className="form-control" 
                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required 
                />
            </div>

            <button type="submit" className="btn w-100 text-white fw-bold shadow-sm" style={{backgroundColor: '#0d9488'}} disabled={loading}>
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : "ACTUALIZAR CONTRASEÑA"}
            </button>
        </form>
    </div>
  );
}

export default CambiarPassword;