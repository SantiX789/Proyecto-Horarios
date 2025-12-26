import React, { useState, useEffect } from 'react';
import { apiFetch } from '../apiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Paleta de colores profesional para los cursos
const COLORS = [
  '#0d9488', // Teal (Color Principal)
  '#2563eb', // Blue
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#ea580c', // Orange
  '#65a30d', // Lime
  '#0891b2', // Cyan
  '#be185d', // Rose
];

function Dashboard() {
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState("TODOS");
  
  // Estados para métricas
  const [stats, setStats] = useState({ profesores: 0, materias: 0, cursos: 0, aulas: 0 });
  const [cargaHoraria, setCargaHoraria] = useState([]);
  const [alumnosData, setAlumnosData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Efecto: Cuando cambia el filtro, recalculamos los datos
  useEffect(() => {
    if (cursos.length > 0) {
        if (cursoSeleccionado === "TODOS") {
            cargarDatosGlobales();
        } else {
            cargarDatosCurso(cursoSeleccionado);
        }
    }
  }, [cursoSeleccionado, cursos]); // Dependencias

  const cargarDatosIniciales = async () => {
    try {
      const dataCursos = await apiFetch('/api/cursos');
      // Ordenamos para que el dropdown se vea lindo
      const cursosOrdenados = dataCursos.sort((a, b) => a.anio.localeCompare(b.anio) || a.division.localeCompare(b.division));
      setCursos(cursosOrdenados);
      
      // La primera carga es global
      await cargarDatosGlobales(cursosOrdenados);
    } catch (error) { console.error(error); }
  };

  const cargarDatosGlobales = async (cursosList = cursos) => {
    setLoading(true);
    try {
      const p = await apiFetch('/api/profesores');
      const m = await apiFetch('/api/materias');
      const a = await apiFetch('/api/aulas');
      
      // 1. KPIs Globales
      setStats({ 
          profesores: p.length, 
          materias: m.length, 
          cursos: cursosList.length, 
          aulas: a.length 
      });

      // 2. Gráfico Barras (Top Profes Global)
      // Este endpoint YA TRAE LOS COLORES desde el backend
      const reporte = await apiFetch('/api/reportes/carga-horaria-profesor');
      setCargaHoraria(reporte.slice(0, 7));

      // 3. Gráfico Torta (Alumnos por Curso Específico)
      const dataTortas = cursosList.map(c => ({
          name: `${c.anio} "${c.division}"`,
          value: c.cantidad_alumnos
      }));
      setAlumnosData(dataTortas);

    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const cargarDatosCurso = async (cursoId) => {
    setLoading(true);
    try {
        // Obtenemos el horario específico de ese curso
        const horario = await apiFetch(`/api/horarios/${cursoId}`);
        // Obtenemos info del curso para saber cant. alumnos
        const cursoInfo = cursos.find(c => c.id === cursoId);

        // --- CORRECCIÓN: TRAEMOS LOS PROFES PARA SABER SUS COLORES ---
        const listaProfesores = await apiFetch('/api/profesores');
        
        // --- CÁLCULOS LOCALES (Front-End Magic) ---
        
        // 1. Profesores Únicos en este curso
        const profesSet = new Set();
        const materiasSet = new Set();
        const aulasSet = new Set();
        const cargaProfeLocal = {};

        // Recorremos la grilla del curso
        Object.values(horario).forEach(diaData => {
            Object.values(diaData).forEach(bloque => {
                // bloque tiene: { profesor_nombre, materia_nombre, aula_nombre ... }
                if (bloque.profesor_nombre !== "Sin Profe") {
                    profesSet.add(bloque.profesor_nombre);
                    // Contamos horas para el gráfico de barras local
                    cargaProfeLocal[bloque.profesor_nombre] = (cargaProfeLocal[bloque.profesor_nombre] || 0) + 1;
                }
                if (bloque.materia_nombre !== "??") materiasSet.add(bloque.materia_nombre);
                if (bloque.aula_nombre && bloque.aula_nombre !== "Sin Aula") aulasSet.add(bloque.aula_nombre);
            });
        });

        // 2. Actualizar KPIs
        setStats({
            profesores: profesSet.size,
            materias: materiasSet.size,
            cursos: 1, // Estamos viendo 1 curso
            aulas: aulasSet.size
        });

        // 3. Actualizar Gráfico Barras (Solo profes de este curso)
        const dataBarras = Object.keys(cargaProfeLocal).map(nombre => {
            // BUSCAMOS EL COLOR DEL PROFESOR EN LA LISTA QUE TRAJIMOS
            const infoProfe = listaProfesores.find(p => p.nombre === nombre);
            return {
                nombre_profesor: nombre,
                horas_asignadas: cargaProfeLocal[nombre],
                color: infoProfe ? infoProfe.color : "#0d9488" // <--- ¡AQUÍ ESTÁ EL ARREGLO!
            };
        }).sort((a, b) => b.horas_asignadas - a.horas_asignadas).slice(0, 7);
        
        setCargaHoraria(dataBarras);

        // 4. Gráfico Torta
        setAlumnosData([{
            name: `${cursoInfo.anio} "${cursoInfo.division}"`,
            value: cursoInfo.cantidad_alumnos
        }]);

    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  if (loading && cursos.length === 0) return <div className="p-5 text-center text-muted">Cargando métricas...</div>;

  return (
    <div className="container-fluid p-0 animate-fade-in">
      
      {/* --- CABECERA CON FILTRO --- */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 className="fw-bold text-dark m-0">
                {cursoSeleccionado === "TODOS" ? "Visión Global" : "Visión Detallada del Curso"}
            </h4>
            <p className="text-muted small m-0">
                {cursoSeleccionado === "TODOS" 
                    ? "Métricas generales de toda la institución." 
                    : "Analizando profesores y carga horaria específica de este curso."}
            </p>
        </div>
        
        {/* DROPDOWN DE FILTRO */}
        <div className="d-flex align-items-center gap-2">
            <span className="fw-bold text-secondary small"><i className="fa-solid fa-filter me-1"></i> Filtrar:</span>
            <select 
                className="form-select form-select-sm fw-bold shadow-sm" 
                style={{width: '200px', borderColor: '#0d9488', color: '#0f766e'}}
                value={cursoSeleccionado}
                onChange={(e) => setCursoSeleccionado(e.target.value)}
            >
                <option value="TODOS">🏫 Todo el Colegio</option>
                <hr />
                {cursos.map(c => (
                    <option key={c.id} value={c.id}>
                        {c.anio} "{c.division}"
                    </option>
                ))}
            </select>
        </div>
      </div>

      {/* --- SECCIÓN 1: TARJETAS KPI (Se actualizan solas) --- */}
      <div className="row g-3 mb-4">
        <KpiCard icon="fa-chalkboard-user" title={cursoSeleccionado === "TODOS" ? "Total Profesores" : "Docentes del Curso"} value={stats.profesores} color="teal" />
        <KpiCard icon="fa-book" title={cursoSeleccionado === "TODOS" ? "Total Materias" : "Materias Dadas"} value={stats.materias} color="primary" />
        <KpiCard icon="fa-users" title={cursoSeleccionado === "TODOS" ? "Total Cursos" : "Alumnos"} value={cursoSeleccionado === "TODOS" ? stats.cursos : alumnosData[0]?.value || 0} color="purple" />
        <KpiCard icon="fa-school" title={cursoSeleccionado === "TODOS" ? "Total Aulas" : "Aulas Usadas"} value={stats.aulas} color="orange" />
      </div>

      <div className="row g-4">
        {/* --- SECCIÓN 2: GRÁFICO DE BARRAS (Dinámico y con COLOR) --- */}
        <div className="col-lg-8">
            <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold text-dark">
                        <i className="fa-solid fa-chart-column me-2 text-teal"></i> 
                        {cursoSeleccionado === "TODOS" ? "Top Docentes (Global)" : "Carga Horaria en este Curso"}
                    </h5>
                    {cursoSeleccionado !== "TODOS" && <span className="badge bg-teal-light text-teal">Filtrado</span>}
                </div>
                <div className="card-body" style={{ height: '350px' }}>
                    {cargaHoraria.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cargaHoraria} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="nombre_profesor" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip cursor={{fill: '#f0fdfa'}} />
                                <Bar dataKey="horas_asignadas" name="Módulos" radius={[0, 10, 10, 0]} barSize={20}>
                                    {/* --- AQUI USAMOS EL COLOR DE CADA BARRA --- */}
                                    {cargaHoraria.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || "#0d9488"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                            Sin datos asignados aún.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- SECCIÓN 3: GRÁFICO DE TORTA (Colorido) --- */}
        <div className="col-lg-4">
            <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3">
                    <h5 className="mb-0 fw-bold text-dark"><i className="fa-solid fa-chart-pie me-2 text-purple"></i> Alumnado</h5>
                </div>
                <div className="card-body d-flex flex-column justify-content-center align-items-center" style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={alumnosData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {alumnosData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            {cursoSeleccionado === "TODOS" && <Legend />}
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="small text-muted mt-2 text-center">
                        {cursoSeleccionado === "TODOS" 
                            ? "Distribución por Curso y División." 
                            : "Alumnos en este curso actual."}
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
}

// Componente KpiCard (Sin cambios)
function KpiCard({ icon, title, value, color }) {
    const colorMap = {
        teal: { bg: '#e6fffa', text: '#0d9488' },
        primary: { bg: '#e0f2fe', text: '#0284c7' },
        purple: { bg: '#f3e8ff', text: '#9333ea' },
        orange: { bg: '#ffedd5', text: '#ea580c' }
    };
    const theme = colorMap[color] || colorMap.teal;

    return (
        <div className="col-md-3 col-6">
            <div className="p-3 border rounded-4 shadow-sm h-100 d-flex align-items-center justify-content-between bg-white card-hover-effect">
                <div>
                    <div className="text-muted small fw-bold text-uppercase mb-1">{title}</div>
                    <div className="h3 mb-0 fw-bold text-dark">{value}</div>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                     style={{ width: '50px', height: '50px', backgroundColor: theme.bg, color: theme.text }}>
                    <i className={`fa-solid ${icon} fa-lg`}></i>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;