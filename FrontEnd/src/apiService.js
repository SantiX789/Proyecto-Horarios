// FrontEnd/src/apiService.js

// URL Base (Asegúrate que coincida con tu backend, usualmente puerto 8000)
const API_URL = 'http://127.0.0.1:8000'; 

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('proyecto_horarios_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Si la respuesta es un error (400, 422, 500...)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Si es error de validación (422), suele venir en 'detail'
      if (response.status === 422) {
         console.error("Error de Validación (422):", errorData);
         // Intentamos formatear el mensaje para que sea legible
         let mensaje = "Error en los datos enviados:\n";
         if (Array.isArray(errorData.detail)) {
             errorData.detail.forEach(err => {
                 mensaje += `- Campo '${err.loc[1]}': ${err.msg}\n`;
             });
         } else {
             mensaje += JSON.stringify(errorData);
         }
         throw new Error(mensaje);
      }

      throw new Error(errorData.detail || errorData.message || `Error ${response.status}`);
    }

    // Si no hay contenido (204 No Content), retornamos null
    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}