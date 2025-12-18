// FrontEnd/src/components/Login.jsx (Versión Final Router)
import { useState } from 'react';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom'; // Importamos el hook de navegación

const API_URL = "http://127.0.0.1:8000";

// Ya no necesitamos recibir onSwitchToRegister
function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate(); // Hook para movernos de página

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Por favor, completa ambos campos.");
      return;
    }

    setIsLoading(true);
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('proyecto_horarios_token', data.access_token);
        localStorage.setItem('user_role', data.rol);
        onLoginSuccess(data.rol);

        if (data.must_change_password) {
          toast.info("Por seguridad, debes cambiar tu contraseña.");
          navigate('/cambiar-password');
        } else {
          toast.success("¡Bienvenido!");
          if (data.rol === 'admin') navigate('/admin');
          else navigate('/mis-horarios');
        }
      } else {
        setError(data.detail || "Error al iniciar sesión.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Card style={{ width: '400px' }} className="shadow-sm">
        <Card.Body>
          <Card.Title as="h2" className="text-center mb-4">Iniciar Sesión</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Usuario:</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contraseña:</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </Form.Group>
            
            {error && <Alert variant="danger">{error}</Alert>}

            <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
              {isLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Ingresar'}
            </Button>
          </Form>

          <hr />
          <div className="text-center">
            {/* AQUÍ ESTABA EL ERROR: Ahora usamos navigate directamente */}
            <Button variant="link" onClick={() => navigate('/registro')}>
              ¿No tienes cuenta? Regístrate aquí
            </Button>
          </div>
          
        </Card.Body>
      </Card>
    </div>
  );
}

export default Login;