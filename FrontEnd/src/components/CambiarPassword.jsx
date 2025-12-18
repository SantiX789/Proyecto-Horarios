// FrontEnd/src/components/CambiarPassword.jsx
import { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiFetch } from '../apiService';

function CambiarPassword() {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPass.length < 4) {
      toast.warn("La nueva contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (newPass !== confirmPass) {
      toast.warn("Las contraseñas nuevas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      // Llamamos al nuevo endpoint de Fase 2
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPass,
          new_password: newPass
        })
      });

      toast.success("¡Contraseña actualizada! Por favor ingresa nuevamente.");
      
      // Limpiamos sesión para obligar a reloguear limpio
      localStorage.clear();
      navigate('/'); // Volver al login

    } catch (error) {
      toast.error(error.message || "Error al cambiar contraseña.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <Card className="shadow p-4" style={{ width: '400px' }}>
        <Card.Body>
          <div className="text-center mb-4">
            <h3>🔐 Seguridad</h3>
            <p className="text-muted">Es tu primer ingreso o tu clave ha expirado. Debes cambiarla para continuar.</p>
          </div>
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Contraseña Actual</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Ej: 1234"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nueva Contraseña</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Mínimo 4 caracteres"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirmar Nueva</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Repite la nueva contraseña"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required 
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button variant="primary" type="submit" disabled={isLoading}>
                {isLoading ? <Spinner size="sm" animation="border"/> : "Actualizar Contraseña"}
              </Button>
              <Button variant="link" className="text-muted" onClick={() => { localStorage.clear(); navigate('/'); }}>
                Cancelar / Salir
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

export default CambiarPassword;