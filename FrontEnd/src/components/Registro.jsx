// FrontEnd/src/components/Registro.jsx
import { useState } from 'react';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const API_URL = "http://127.0.0.1:8000";

function Registro() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Completa todos los campos.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("¡Usuario creado con éxito! Ahora inicia sesión.");
        navigate('/'); // Volver al Login automáticamente
      } else {
        setError(data.detail || "Error al registrarse.");
      }
    } catch (err) {
      setError("Error de conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#e9ecef' }}>
      <Card style={{ width: '400px' }} className="shadow">
        <Card.Body>
          <Card.Title as="h2" className="text-center mb-4">Crear Cuenta</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Elige un Usuario:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Elige una Contraseña:</Form.Label>
              <Form.Control
                type="password"
                placeholder="Mínimo 4 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
            
            {error && <Alert variant="danger">{error}</Alert>}

            <Button variant="success" type="submit" className="w-100" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" animation="border"/> : 'Registrarme'}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Button variant="link" onClick={() => navigate('/')}>
              Volver al Login
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Registro;