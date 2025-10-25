// frontend/src/apiService.js

const API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "proyecto_horarios_token";

// 1. Definimos una clase de Error personalizada
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // Guardamos el status code
  }
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const config = { ...options, headers };

  let response; // La definimos fuera para poder usarla en el catch

  try {
    response = await fetch(`${API_URL}${endpoint}`, config);

    // Manejo de errores 401 (Token inválido) - sigue igual
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();
      // 2. Lanzamos nuestro error personalizado
      throw new ApiError("Sesión expirada. Por favor, inicia sesión.", 401);
    }

    // Manejo de respuestas sin contenido (ej. DELETE 204) - sigue igual
    if (response.status === 204) {
      return { success: true };
    }

    // Intentamos leer el JSON, incluso si hay error (puede tener 'detail')
    const data = await response.json().catch(() => ({ detail: "Respuesta no es JSON" }));

    // Manejo de otros errores (4xx, 5xx)
    if (!response.ok) {
        // 3. Lanzamos nuestro error personalizado con el status y el detail
        throw new ApiError(data.detail || `Error HTTP ${response.status}`, response.status);
    }

    // ¡Éxito!
    return data;

  } catch (err) {
    // 4. Si ya es un ApiError (lanzado arriba), lo re-lanzamos tal cual.
    if (err instanceof ApiError) {
      console.error(`API Error ${err.status}:`, err.message);
      throw err;
    } 
    // Si es un error de red (fetch falló completamente)
    else {
      console.error("Network Error:", err);
      // Lanzamos un ApiError genérico para consistencia
      throw new ApiError("Error de red o el servidor no responde.", 0); // Status 0 para errores de red
    }
  }
}