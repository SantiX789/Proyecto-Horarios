import { useState } from 'react';
import { apiFetch } from '../apiService';
import { toast } from 'react-toastify';

function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // NUEVO: Estado para ver/ocultar contraseña
  const [verPassword, setVerPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        await apiFetch('/api/register', {
          method: 'POST',
          body: JSON.stringify({ username, password, role: 'admin' }) 
        });
        toast.success("¡Usuario creado! Ahora inicia sesión.");
        setIsRegistering(false); 
        setPassword(""); 
      } else {
        const data = await apiFetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username, password })
        });
        
        localStorage.setItem('proyecto_horarios_token', data.access_token);
        localStorage.setItem('proyecto_horarios_role', data.role);
        localStorage.setItem('proyecto_horarios_user', username);

        toast.success(`¡Bienvenido, ${username}!`);
        onLogin(data.role, username);
      }
    } catch (error) {
      console.error(error);
      toast.error(isRegistering ? "Error al registrarse (¿Ya existe?)" : "Usuario o clave incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" 
         style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)' }}>
      
      <div className="card border-0 shadow-lg p-4 animate-fade-in" style={{ width: '100%', maxWidth: '400px', borderRadius: '20px' }}>
        <div className="card-body">
          {/* Encabezado */}
          <div className="text-center mb-4">
            <div className="bg-teal-light d-inline-flex align-items-center justify-content-center rounded-circle mb-3" 
                 style={{ width: '70px', height: '70px', backgroundColor: '#ccfbf1' }}>
              <i className={`fa-solid ${isRegistering ? 'fa-user-plus' : 'fa-shapes'} fa-2x text-teal`} style={{ color: '#0d9488' }}></i>
            </div>
            <h3 className="fw-bold text-secondary">{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h3>
            <p className="text-muted small">Sistema de Gestión de Horarios</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="fw-bold small text-muted mb-1">USUARIO</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                    <i className="fa-solid fa-user text-muted"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control bg-light border-start-0 ps-0" 
                  placeholder="Tu nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toUpperCase())} 
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="fw-bold small text-muted mb-1">CONTRASEÑA</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                    <i className="fa-solid fa-lock text-muted"></i>
                </span>
                {/* AQUÍ ESTÁ LA MAGIA DEL OJO */}
                <input 
                  type={verPassword ? "text" : "password"}  // <--- Cambia dinámicamente
                  className="form-control bg-light border-start-0 border-end-0 ps-0" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                    type="button"
                    className="btn btn-light border border-start-0 text-muted"
                    onClick={() => setVerPassword(!verPassword)}
                    tabIndex="-1"
                >
                    <i className={`fa-solid ${verPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button 
                type="submit" 
                className="btn w-100 py-2 fw-bold shadow-sm mb-3 text-white"
                style={{ backgroundColor: '#0d9488', borderColor: '#0f766e' }}
                disabled={loading}
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : (isRegistering ? "REGISTRARSE" : "INGRESAR")}
            </button>
          </form>

          <div className="text-center border-top pt-3">
            <span className="text-muted small me-2">
                {isRegistering ? "¿Ya tienes cuenta?" : "¿No tienes usuario?"}
            </span>
            <button 
                className="btn btn-link text-teal p-0 fw-bold text-decoration-none" 
                style={{color: '#0d9488'}}
                onClick={() => {
                    setIsRegistering(!isRegistering);
                    setUsername("");
                    setPassword("");
                }}
            >
                {isRegistering ? "Inicia Sesión" : "Crear Cuenta"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;