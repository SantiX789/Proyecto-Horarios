// frontend/src/components/Login.jsx
import { useState } from 'react';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
// (No necesitamos apiFetch aquí porque el login usa un formato especial)

const API_URL = "http://127.0.0.1:8000";

// 1. AÑADIMOS la prop 'onSwitchToRegister'
function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    // ... (El código de handleSubmit no cambia en nada) ...
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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("¡Bienvenido!");
        onLoginSuccess(data.access_token);
      } else {
        setError(data.detail || "Error al iniciar sesión.");
      }
    } catch (err) {
      setError("Error de red. ¿El backend está funcionando?");
    }
    setIsLoading(false);
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Card style={{ width: '400px' }} className="shadow-sm">
        <Card.Body>
          <Card.Title as="h2" className="text-center mb-4">Iniciar Sesión</Card.Title>
          <Form onSubmit={handleSubmit}>
            {/* ... (los Form.Group de usuario y pass no cambian) ... */}
            <Form.Group className="mb-3" controlId="login-username">
              <Form.Label>Nombre de Usuario:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="login-password">
              <Form.Label>Contraseña:</Form.Label>
              <Form.Control
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </Form.Group>
            
            {error && <Alert variant="danger">{error}</Alert>}

            <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
              {/* ... (el spinner no cambia) ... */}
              {isLoading ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : (
                'Ingresar'
              )}
            </Button>
          </Form>

          {/* 2. AÑADIMOS esta sección */}
          <hr />
          <div className="text-center">
            <Button variant="link" onClick={onSwitchToRegister}>
              ¿No tienes cuenta? Regístrate aquí
            </Button>
          </div>
          
        </Card.Body>
      </Card>
    </div>
  );
}

export default Login;