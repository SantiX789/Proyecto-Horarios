import json
import uuid  # 1. Importamos uuid para generar IDs únicos
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import openpyxl
from io import BytesIO

app = FastAPI()

# --- Configuración de CORS (Sin cambios) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Lógica de Base de Datos (Sin cambios) ---
DB_FILE = "horarios_db.json"

def leer_db():
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Asegurarse de que todas las claves existan
            keys = ["profesores", "materias", "cursos", "requisitos_curso", "horarios_generados"]
            for key in keys:
                if key not in data:
                    data[key] = []
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        # Si el archivo no existe o está vacío, retorna la estructura base
        return {
            "profesores": [],
            "materias": [],
            "cursos": [],
            "requisitos_curso": [],
            "horarios_generados": []
        }

def guardar_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

# --- 2. Nuevos Modelos de Datos (Pydantic) ---
# Esto define qué datos esperamos del frontend

class Profesor(BaseModel):
    nombre: str
    disponibilidad: List[str]  # Lista de "Dia-HoraInicio", ej: "Lunes-07:00"

class Materia(BaseModel):
    nombre: str

class Curso(BaseModel):
    nombre: str

class Requisito(BaseModel):
    curso_id: str      # ej: "c-1234"
    materia_id: str    # ej: "m-5678"
    horas_semanales: int


# --- 3. Nuevos Endpoints de "Gestión" (CRUD) ---
# Estos endpoints manejarán tu "Cuadro 1: Profesores" y "Cuadro 2: Cursos y Materias"

# --- PROFESORES (Cuadro 1) ---
@app.get("/api/profesores")
def obtener_profesores():
    db = leer_db()
    return db["profesores"]

@app.post("/api/profesores")
def agregar_profesor(profesor: Profesor):
    db = leer_db()
    nuevo_profesor = profesor.dict()
    nuevo_profesor["id"] = f"p-{uuid.uuid4()}" # Crea ID único, ej: "p-a1b2c3d4"
    db["profesores"].append(nuevo_profesor)
    guardar_db(db)
    return {"mensaje": "Profesor agregado", "id": nuevo_profesor["id"]}

# --- MATERIAS ---
@app.get("/api/materias")
def obtener_materias():
    db = leer_db()
    return db["materias"]

@app.post("/api/materias")
def agregar_materia(materia: Materia):
    db = leer_db()
    nueva_materia = materia.dict()
    nueva_materia["id"] = f"m-{uuid.uuid4()}"
    db["materias"].append(nueva_materia)
    guardar_db(db)
    return {"mensaje": "Materia agregada", "id": nueva_materia["id"]}

# --- CURSOS ---
@app.get("/api/cursos")
def obtener_cursos():
    db = leer_db()
    return db["cursos"]

@app.post("/api/cursos")
def agregar_curso(curso: Curso):
    db = leer_db()
    nuevo_curso = curso.dict()
    nuevo_curso["id"] = f"c-{uuid.uuid4()}"
    db["cursos"].append(nuevo_curso)
    guardar_db(db)
    return {"mensaje": "Curso agregado", "id": nuevo_curso["id"]}

# --- REQUISITOS (Cuadro 2) ---
@app.get("/api/requisitos/{curso_id}")
def obtener_requisitos(curso_id: str):
    db = leer_db()
    # Encontrar los requisitos para ese curso
    reqs_del_curso = [req for req in db["requisitos_curso"] if req["curso_id"] == curso_id]
    
    # Enriquecer los datos con los nombres para el frontend
    materias_map = {m["id"]: m["nombre"] for m in db["materias"]}
    
    for req in reqs_del_curso:
        req["materia_nombre"] = materias_map.get(req["materia_id"], "Materia Desconocida")
        
    return reqs_del_curso

@app.post("/api/requisitos")
def agregar_requisito(requisito: Requisito):
    db = leer_db()
    nuevo_req = requisito.dict()
    nuevo_req["id"] = f"r-{uuid.uuid4()}"
    db["requisitos_curso"].append(nuevo_req)
    guardar_db(db)
    return {"mensaje": "Requisito agregado", "id": nuevo_req["id"]}


# --- 4. Endpoint de VISTA (Para tu TablaHorario.jsx) ---
# Este es el endpoint MODIFICADO. Lee la nueva estructura pero
# la devuelve en el formato que tu `TablaHorario.jsx` espera.

@app.get("/api/horarios/{curso_nombre}")
def obtener_horario_curso(curso_nombre: str):
    db = leer_db()
    
    # 1. Encontrar el ID del curso usando su nombre (ej. "1A")
    curso_id = None
    for c in db["cursos"]:
        if c["nombre"] == curso_nombre:
            curso_id = c["id"]
            break
            
    if not curso_id:
        return {} # Si el curso no existe, devuelve un horario vacío

    # 2. Crear "mapas" de búsqueda para los nombres (más eficiente)
    profesores_map = {p["id"]: p["nombre"] for p in db["profesores"]}
    materias_map = {m["id"]: m["nombre"] for m in db["materias"]}

    # 3. Construir la "estructura de vista" que el frontend espera
    # (El formato `[hora][dia] = "Profesor (Materia)"`)
    horario_vista = {}
    
    for asignacion in db["horarios_generados"]:
        if asignacion["curso_id"] == curso_id:
            
            hora_rango = asignacion["hora_rango"]
            dia = asignacion["dia"]
            
            # Formatear el string "Profesor (Materia)"
            prof_nombre = profesores_map.get(asignacion["profesor_id"], "??")
            mat_nombre = materias_map.get(asignacion["materia_id"], "??")
            texto_celda = f"{prof_nombre} ({mat_nombre})"
            
            # Crear los diccionarios anidados
            if hora_rango not in horario_vista:
                horario_vista[hora_rango] = {}
            
            horario_vista[hora_rango][dia] = texto_celda

    return horario_vista

# ... (después de tus otros endpoints)

@app.delete("/api/horarios/{curso_nombre}")
def borrar_horarios_curso(curso_nombre: str):
    db = leer_db()
    
    # 1. Encontrar el ID del curso a partir de su nombre
    curso_id = None
    for c in db.get("cursos", []):
        if c["nombre"] == curso_nombre:
            curso_id = c["id"]
            break
    
    if not curso_id:
        return {"mensaje": "Curso no encontrado."}
    
    # 2. Filtrar la lista, quedándonos solo con los horarios
    #    que NO son de este curso.
    horarios_original_count = len(db["horarios_generados"])
    db["horarios_generados"] = [
        h for h in db["horarios_generados"] 
        if h["curso_id"] != curso_id
    ]
    horarios_final_count = len(db["horarios_generados"])
    
    guardar_db(db)
    
    eliminados = horarios_original_count - horarios_final_count
    return {"mensaje": f"Horarios del curso {curso_nombre} borrados. {eliminados} asignaciones eliminadas."}

# ... (Después de tus otros endpoints)
# ... (Necesitarás from pydantic import BaseModel, List, etc., que ya tienes)

# --- 7. Modelos de Datos para el "Solver" ---
# Esto es lo que el frontend nos enviará

class AsignacionSolver(BaseModel):
    requisito_id: str  # El ID del requisito (ej. "r-123", que es "Matemática 5hs")
    profesor_id: str   # El ID del profesor asignado (ej. "p-456")

class SolverRequest(BaseModel):
    curso_id: str      # El ID del curso para el que generamos
    asignaciones: List[AsignacionSolver] # La lista de asignaciones


# --- 7. El Endpoint "Solver" (El Cerebro) ---
@app.post("/api/generar-horario-completo")
def generar_horario_completo(request: SolverRequest):
    db = leer_db()
    
    # 1. Limpiar el horario ANTERIOR para este curso
    # Filtramos la lista, quedándonos solo con los horarios que NO son de este curso
    db["horarios_generados"] = [
        h for h in db.get("horarios_generados", []) 
        if h["curso_id"] != request.curso_id
    ]
    
    # 2. Cargar todos los datos maestros en diccionarios para fácil acceso
    profesores_map = {p["id"]: p for p in db.get("profesores", [])}
    requisitos_map = {r["id"]: r for r in db.get("requisitos_curso", [])}

    # 3. El Algoritmo de Asignación (Constraint Satisfaction)
    # Esta es la lógica central.
    
    horas_faltantes_total = 0
    
    # Iteramos por cada asignación que nos mandó el usuario
    for asign in request.asignaciones:
        prof = profesores_map.get(asign.profesor_id)
        req = requisitos_map.get(asign.requisito_id)
        
        # Si el profesor o el requisito no existen (datos corruptos?), saltamos
        if not prof or not req:
            continue
            
        horas_a_asignar = req["horas_semanales"]
        horas_asignadas = 0
        
        # Usamos un `set` para la disponibilidad. Es más rápido
        # y nos permite "quitar" slots ya usados por este mismo profesor.
        disponibilidad_prof = set(prof["disponibilidad"]) # ej: {"Lunes-07:00", "Martes-09:00", ...}

        # Iteramos por los slots disponibles del profesor
        for slot in disponibilidad_prof: # ej: "Lunes-07:00"
            if horas_asignadas >= horas_a_asignar:
                break # Ya asignamos todas las horas para esta materia
                
            dia, hora_inicio = slot.split('-')
            
            # (Aquí debes tener una lógica para convertir hora_inicio a hora_rango)
            # (Por ahora, usamos una lógica simple. Esto debería ser una función)
            try:
                minutos = int(hora_inicio[3:])
                hora = int(hora_inicio[:2])
                hora_fin_min = (minutos + 40) % 60
                hora_fin_hr = hora + (minutos + 40) // 60
                hora_rango_encontrado = f"{hora_inicio} a {hora_fin_hr:02d}:{hora_fin_min:02d}"
            except Exception:
                hora_rango_encontrado = f"{hora_inicio} a ??:??" # Fallback
            
            # --- ¡VERIFICACIÓN DE COLISIONES! ---
            # ¡Esta es la lógica clave que faltaba en tu versión original!
            celda_ocupada = False
            for h in db["horarios_generados"]:
                # 1. ¿Está el CURSO ocupado a esa hora? (otra materia)
                if h["curso_id"] == request.curso_id and h["dia"] == dia and h["hora_rango"] == hora_rango_encontrado:
                    celda_ocupada = True
                    break
                # 2. ¿Está el PROFESOR ocupado a esa hora? (en otro curso)
                if h["profesor_id"] == prof["id"] and h["dia"] == dia and h["hora_rango"] == hora_rango_encontrado:
                    celda_ocupada = True
                    break
            
            # --- FIN DE VERIFICACIÓN ---

            if not celda_ocupada:
                # ¡LIBRE! Asignamos la hora.
                nueva_asignacion = {
                    "id": f"a-{uuid.uuid4()}",
                    "curso_id": request.curso_id,
                    "profesor_id": prof["id"],
                    "materia_id": req["materia_id"],
                    "dia": dia,
                    "hora_rango": hora_rango_encontrado
                }
                db["horarios_generados"].append(nueva_asignacion)
                horas_asignadas += 1
        
        # Contamos cuántas horas no pudimos asignar
        horas_faltantes_total += (horas_a_asignar - horas_asignadas)

    # 4. Guardamos la base de datos con el nuevo horario generado
    guardar_db(db)
    
    if horas_faltantes_total > 0:
        return {
            "mensaje": f"Horario generado con advertencias. Faltaron {horas_faltantes_total} horas por asignar.",
            "faltantes_total": horas_faltantes_total
        }
    else:
        return {
            "mensaje": "¡Horario completo generado con éxito!",
            "faltantes_total": 0
        }

# ... (El resto de tu main.py, como /api/export/excel)

@app.get("/api/export/excel")
def crear_excel_api():
    db = leer_db()
    wb = openpyxl.Workbook()
    
    if "Sheet" in wb.sheetnames:
        wb.remove(wb["Sheet"])
    
    # Mapas de IDs a Nombres
    profesores_map = {p["id"]: p["nombre"] for p in db["profesores"]}
    materias_map = {m["id"]: m["nombre"] for m in db["materias"]}

    # Rangos de horarios (deberían estar en la DB o en un config)
    horarios = [
        "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
        "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
        "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
        "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
        "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
    ]
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

    # Crear una hoja por cada curso en la DB
    for curso in db["cursos"]:
        curso_id = curso["id"]
        curso_nombre = curso["nombre"]
        
        ws = wb.create_sheet(f"Horario {curso_nombre}")
        ws.append(['Hora'] + dias)
        
        # Estilo de encabezado
        for cell in ws[1]:
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill("solid", fgColor="1D72B8")

        # Construir una grilla de vista para este curso
        horario_vista_curso = {}
        for asignacion in db["horarios_generados"]:
            if asignacion["curso_id"] == curso_id:
                hora = asignacion["hora_rango"]
                dia = asignacion["dia"]
                prof_nombre = profesores_map.get(asignacion["profesor_id"], "??")
                mat_nombre = materias_map.get(asignacion["materia_id"], "??")
                texto_celda = f"{prof_nombre} ({mat_nombre})"
                
                if hora not in horario_vista_curso:
                    horario_vista_curso[hora] = {}
                horario_vista_curso[hora][dia] = texto_celda

        # Llenar la hoja
        for hora in horarios:
            fila = [hora]
            for dia in dias:
                asignacion_texto = horario_vista_curso.get(hora, {}).get(dia, "")
                fila.append(asignacion_texto)
            ws.append(fila)
        
        # Ancho de columnas
        ws.column_dimensions['A'].width = 15
        for col in ['B', 'C', 'D', 'E', 'F']:
            ws.column_dimensions[col].width = 30

    # Guardar en buffer y devolver
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Horarios_Cursos.xlsx"}
    )