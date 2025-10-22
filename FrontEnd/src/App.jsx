// frontend/src/App.jsx
import { useState } from 'react'
import FormularioAsignacion from './components/FormularioAsignacion'
import GrillaDisponibilidad from './components/GrillaDisponibilidad'
import TablaHorario from './components/TablaHorario'
import PanelAdmin from './components/PanelAdmin'

// 1. Mueve tu lógica de 'generarHorario' y 'actualizarVista' aquí,
//    ya que 'App' es el componente "padre" de todos.

function App() {
  
  // 1. El 'curso' seleccionado vive aquí, en el componente padre.
  const [curso, setCurso] = useState("1A"); // Valor inicial

  // 2. Esta es la "llave" mágica. Es un contador.
  //    Cuando 'Formulario' o 'PanelAdmin' cambian datos,
  //    incrementamos este contador.
  //    'TablaHorario' y 'PanelAdmin' "escucharán" este cambio y
  //    se recargarán solos.
  const [refreshKey, setRefreshKey] = useState(0);

  // 3. Creamos una función para que los hijos llamen
  //    cuando necesiten refrescar los datos.
  function handleDatosCambiados() {
    setRefreshKey(key => key + 1); // Incrementa la llave
  }
  
  return (
    <div className="container">
      <h2>Formulario para asignar horarios</h2>

      {/* Le pasamos el 'curso' actual, la función para setear el curso,
        y la función para avisar que refresque.
      */}
      <FormularioAsignacion 
        curso={curso} 
        setCurso={setCurso} 
        onHorarioGenerado={handleDatosCambiados} 
      />
      
      {/* Este componente es el único que NO necesita props
        (por ahora).
      */}
      <GrillaDisponibilidad />
      
      {/* Le pasamos el 'curso' actual y la 'llave' de refresco.
        Cada vez que la 'llave' cambie, este componente 
        se recargará automáticamente (gracias al useEffect que escribimos).
      */}
      <TablaHorario 
        curso={curso} 
        refreshKey={refreshKey} 
      />

      {/* Le pasamos el 'curso' actual y la función para que
        pueda avisar cuando borra algo.
      */}
      <PanelAdmin 
        curso={curso} 
        onDatosCambiados={handleDatosCambiados} 
        refreshKey={refreshKey}
      />
    </div>
  )
}

export default App