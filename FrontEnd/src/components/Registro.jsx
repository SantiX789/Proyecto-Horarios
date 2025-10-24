// frontend/src/components/Registro.jsx
import { useState } from 'react';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';

// 1. Importamos nuestro servicio de API
import { apiFetch } from '../apiService';

// Recibe una prop para volver al login
function Registro({ onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Por favor, completa ambos campos.");
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    
    setIsLoading(true);

    try {
      // 2. Llamamos al endpoint de registro
      const data = await apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      // 3. ¡Éxito!
      toast.success(`¡Usuario "${data.username}" creado! Ahora puedes iniciar sesión.`);
      onSwitchToLogin(); // Volvemos al login automáticamente

    } catch (err) {
      // 4. Manejo de errores (ej: "usuario ya existe")
      setError(err.message || "Error al registrarse.");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Card style={{ width: '400px' }} className="shadow-sm">
        <Card.Body>
          <Card.Title as="h2" className="text-center mb-4">Crear Cuenta</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="register-username">
              <Form.Label>Nombre de Usuario:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="register-password">
              <Form.Label>Contraseña:</Form.Label>
              <Form.Control
                type="password"
                placeholder="Contraseña (mín. 4 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </Form.Group>
            
            {error && <Alert variant="danger">{error}</Alert>}

            <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
              {isLoading ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : (
                'Registrarse'
              )}
            </Button>
          </Form>

          <hr />
          
          <div className="text-center">
            {/* 5. Botón para volver al login */}
            <Button variant="link" onClick={onSwitchToLogin}>
              ¿Ya tienes cuenta? Inicia sesión
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Registro;