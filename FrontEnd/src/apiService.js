// frontend/src/apiService.js

const API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "proyecto_horarios_token";

/**
 * Nuestro "wrapper" de fetch. Se encarga de:
 * 1. Añadir el Content-Type: application/json por defecto.
 * 2. Coger el token del localStorage y añadirlo al header 'Authorization'.
 * 3. Centralizar el manejo de errores 401 (Token expirado/inválido).
 * 4. Convertir la respuesta a JSON y lanzar un error si la API falla.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  // 1. Configurar headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 2. Añadir el token si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    // 3. Hacer la llamada
    const response = await fetch(`${API_URL}${endpoint}`, config);

    // 4. Manejo de errores 401 (Token inválido)
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY); // Borramos el token malo
      window.location.reload(); // Recargamos la app, forzando el Login
      throw new Error("Sesión expirada. Por favor, inicia sesión.");
    }

    // 5. Manejo de respuestas sin contenido (ej. un DELETE)
    if (response.status === 204) {
      return { success: true }; // O simplemente null
    }

    // 6. Convertir respuesta a JSON
    const data = await response.json();

    // 7. Manejo de otros errores (400, 500, etc.)
    if (!response.ok) {
      throw new Error(data.detail || "Ocurrió un error en la API");
    }

    // 8. ¡Éxito!
    return data;

  } catch (err) {
    // Errores de red o los 'throw' de arriba
    console.error("Error en apiFetch:", err);
    throw err; // Re-lanzamos el error para que el componente lo atrape
  }
}