import json
import uuid  # 1. Importamos uuid para generar IDs únicos
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import openpyxl
from io import BytesIO
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import app.seguridad as seguridad


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# 2. Función de dependencia para obtener el usuario actual
def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependencia que se ejecuta en cada endpoint protegido.
    Verifica el token y devuelve los datos del usuario.
    """
    username = seguridad.verificar_token(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Podríamos buscar al usuario en la DB, pero por ahora
    # solo devolver el username es suficiente.
    return {"username": username}
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
            
            # ¡AÑADIMOS "usuarios" A ESTA LISTA!
            keys = ["profesores", "materias", "cursos", "requisitos_curso", "horarios_generados", "usuarios"]
            
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
            "horarios_generados": [],
            "usuarios": []  # ¡La añadimos aquí también!
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

class Usuario(BaseModel):
    username: str

class UsuarioEnDB(Usuario):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UsuarioRegistro(BaseModel):
    username: str
    password: str

# --- 3. Nuevos Endpoints de "Gestión" (CRUD) ---
# Estos endpoints manejarán tu "Cuadro 1: Profesores" y "Cuadro 2: Cursos y Materias"


@app.get("/api/profesores")
def obtener_profesores(current_user: dict = Depends(get_current_user)):
    db = leer_db()
    return db.get("profesores", [])

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

# --- 5. Endpoints de Autenticación (Login / Registro) ---

@app.post("/api/register", response_model=Usuario)
def registrar_usuario(usuario: UsuarioRegistro):
    db = leer_db()
    
    # Verificar si el usuario ya existe
    for u in db["usuarios"]:
        if u["username"] == usuario.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de usuario ya existe"
            )
            
    # Crear el nuevo usuario
    hashed_password = seguridad.hashear_password(usuario.password)
    nuevo_usuario_db = UsuarioEnDB(
        username=usuario.username, 
        hashed_password=hashed_password
    )
    
    db["usuarios"].append(nuevo_usuario_db.dict())
    guardar_db(db)
    
    return Usuario(username=usuario.username)


# OAuth2PasswordRequestForm es un formulario especial de FastAPI
# que espera 'username' y 'password'
@app.post("/api/login", response_model=Token)
def login_para_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = leer_db()
    
    # 1. Buscar al usuario
    usuario_encontrado = None
    for u in db["usuarios"]:
        if u["username"] == form_data.username:
            usuario_encontrado = u
            break
            
    # 2. Verificar al usuario y la contraseña
    if not usuario_encontrado or not seguridad.verificar_password(form_data.password, u["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Crear el token si todo es correcto
    access_token = seguridad.crear_access_token(
        data={"sub": usuario_encontrado["username"]}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

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

# ... (cerca de tus otros modelos Pydantic)
# --- Modelos para el Solver ---
class AsignacionSolver(BaseModel):
    requisito_id: str
    profesor_id: str

class SolverRequest(BaseModel):
    curso_id: str
    asignaciones: List[AsignacionSolver] # Lista de {req_id, prof_id}

# --- Función Auxiliar para el Solver Backtracking ---

def _is_slot_available(dia: str, hora_rango: str, profesor_id: str, curso_id: str, current_schedule: List[Dict]) -> bool:
    """Verifica si un hueco específico está libre para el profesor Y el curso."""
    for asignacion in current_schedule:
        if asignacion["dia"] == dia and asignacion["hora_rango"] == hora_rango:
            # Verificar conflicto del curso (otra materia en el mismo hueco)
            if asignacion["curso_id"] == curso_id:
                return False
            # Verificar conflicto del profesor (mismo profesor en otro curso)
            if asignacion["profesor_id"] == profesor_id:
                return False
    return True

def _solve_recursive(
    requisitos_a_asignar: List[Dict], # Lista de {req_id, prof_id, horas_necesarias, materia_id}
    profesores_map: Dict,            # {prof_id: datos_prof_con_set_disponibilidad}
    curso_id: str,                   # ID del curso que estamos programando
    current_schedule: List[Dict]     # El horario construido hasta ahora [{dia, hora_rango, prof_id, ...}]
) -> Optional[List[Dict]]:
    """
    Función recursiva de backtracking para encontrar un horario válido.
    Devuelve el horario completo si se encuentra, si no, None.
    """
    # Caso Base 1: ¡Éxito! Todos los requisitos asignados.
    if not requisitos_a_asignar:
        return current_schedule

    # Obtener el requisito actual a asignar (el primero)
    current_req = requisitos_a_asignar[0]
    remaining_reqs = requisitos_a_asignar[1:] # El resto de los requisitos

    profesor_id = current_req["prof_id"]
    horas_necesarias = current_req["horas_necesarias"]
    prof_data = profesores_map.get(profesor_id)

    if not prof_data: # No debería pasar si los datos están limpios
        return None # No se puede resolver si el profesor no existe

    # Convertir disponibilidad a lista y ordenar para consistencia (opcional pero útil)
    available_slots = sorted(list(prof_data["disponibilidad"]))

    # --- Paso Recursivo: Intentar asignar 'horas_necesarias' huecos ---
    
    # Necesitamos encontrar combinaciones de N huecos disponibles
    # Esto requiere un enfoque más complejo que la simple iteración.
    # Podemos usar itertools.combinations o escribir otro helper recursivo.
    # Por simplicidad aquí, intentemos primero un enfoque iterativo simplificado,
    # aunque podría no encontrar todas las soluciones para casos complejos.
    
    # Intentemos asignar una hora a la vez recursivamente.
    
    def _assign_hours_recursive(hours_left_to_assign: int, slots_to_try: List[str], schedule_so_far: List[Dict]) -> Optional[List[Dict]]:
        # Caso base: Todas las horas para este requisito asignadas
        if hours_left_to_assign == 0:
            # Ahora intenta asignar el *siguiente* requisito
            result = _solve_recursive(remaining_reqs, profesores_map, curso_id, schedule_so_far)
            if result:
                return result # ¡Solución encontrada! Pásala hacia arriba.
            else:
                return None # Este camino llevó a un callejón sin salida para requisitos posteriores.

        # Si no quedan más huecos para probar, pero quedan horas, este camino falló.
        if not slots_to_try:
            return None

        # Prueba el primer hueco disponible
        slot = slots_to_try[0]
        remaining_slots = slots_to_try[1:]
        
        try:
            dia, hora_inicio = slot.split('-')
            # Cálculo básico de tiempo (reemplazar con función robusta si es necesario)
            minutos = int(hora_inicio[3:])
            hora = int(hora_inicio[:2])
            hora_fin_min = (minutos + 40) % 60
            hora_fin_hr = hora + (minutos + 40) // 60
            hora_rango = f"{hora_inicio} a {hora_fin_hr:02d}:{hora_fin_min:02d}"
        except Exception:
            # Salta huecos inválidos
             return _assign_hours_recursive(hours_left_to_assign, remaining_slots, schedule_so_far)


        # *** Verificar Restricciones ***
        if _is_slot_available(dia, hora_rango, profesor_id, curso_id, schedule_so_far):
            # Si está disponible, "haz el movimiento": Añade al horario
            new_asignacion = {
                "id": f"a-{uuid.uuid4()}", # Generar ID aquí o quizás después
                "curso_id": curso_id,
                "profesor_id": profesor_id,
                "materia_id": current_req["materia_id"],
                "dia": dia,
                "hora_rango": hora_rango
            }
            
            # Recurre: Intenta asignar las horas restantes con este hueco elegido
            result = _assign_hours_recursive(hours_left_to_assign - 1, remaining_slots, schedule_so_far + [new_asignacion])
            
            # Si la llamada recursiva encontró una solución, ¡devuélvela!
            if result:
                return result

            # Si no, "deshaz el movimiento" (backtrack) - hecho implícitamente al no retornar 'result'
            # y continuar a la siguiente posibilidad.

        # *** Prueba la siguiente posibilidad ***
        # Salta el hueco actual e intenta asignar las horas usando el resto de los huecos
        result_skipping_slot = _assign_hours_recursive(hours_left_to_assign, remaining_slots, schedule_so_far)
        if result_skipping_slot:
            return result_skipping_slot

        # Si ni usar el hueco ni saltarlo funcionó, este camino falla.
        return None

    # Inicia la recursión interna para el requisito actual
    return _assign_hours_recursive(horas_necesarias, available_slots, current_schedule)


# --- El Endpoint Principal del Solver (Modificado) ---
@app.post("/api/generar-horario-completo", tags=["Solver"]) # Añadido tags para Swagger UI
def generar_horario_completo(request: SolverRequest):
    db = leer_db()
    
    # 1. Limpiar horario anterior para este curso
    db["horarios_generados"] = [
        h for h in db.get("horarios_generados", []) 
        if h["curso_id"] != request.curso_id
    ]
    
    # 2. Preparar datos para el solver
    profesores_map = {p["id"]: {**p, "disponibilidad": set(p.get("disponibilidad", []))} 
                      for p in db.get("profesores", [])}
    requisitos_map = {r["id"]: r for r in db.get("requisitos_curso", [])}
    materias_map = {m["id"]: m for m in db.get("materias", [])} # Necesario para materia_id

    # Construir la lista de requisitos a asignar para esta petición específica
    requisitos_a_asignar = []
    for asign_request in request.asignaciones:
        req = requisitos_map.get(asign_request.requisito_id)
        if req and req["curso_id"] == request.curso_id:
            requisitos_a_asignar.append({
                "req_id": req["id"],
                "prof_id": asign_request.profesor_id,
                "horas_necesarias": req["horas_semanales"],
                "materia_id": req["materia_id"] # Pasar materia_id
            })

    # Obtener horario existente (para verificar conflictos entre todos los cursos)
    initial_schedule = db["horarios_generados"] # Empezar con asignaciones de otros cursos

    # 3. Llamar a la función recursiva del solver
    solution = _solve_recursive(
        requisitos_a_asignar=requisitos_a_asignar,
        profesores_map=profesores_map,
        curso_id=request.curso_id,
        current_schedule=initial_schedule # Pasar horario existente
    )

    # 4. Procesar el resultado
    if solution:
        # Filtrar las asignaciones iniciales (de otros cursos)
        new_assignments = [a for a in solution if a not in initial_schedule]
        
        # Añadir las nuevas asignaciones encontradas a la lista de la base de datos
        db["horarios_generados"].extend(new_assignments)
        guardar_db(db)
        
        # Verificar si todas las horas solicitadas fueron asignadas (control)
        assigned_count = len(new_assignments)
        total_requested_hours = sum(r["horas_necesarias"] for r in requisitos_a_asignar)
        
        if assigned_count < total_requested_hours:
             faltantes = total_requested_hours - assigned_count
             return {
                "mensaje": f"Solución encontrada, pero incompleta. Faltaron {faltantes} horas por asignar (posiblemente por slots insuficientes o conflictos irresolubles).",
                "faltantes_total": faltantes
             }
        else:
             return {
                "mensaje": "¡Horario completo generado con éxito usando backtracking!",
                "faltantes_total": 0
             }
    else:
        # No se encontró solución
        guardar_db(db) # Guardar DB para persistir el horario limpiado
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, # 409 Conflicto es apropiado
            detail="No se pudo encontrar un horario válido con las restricciones dadas."
        )

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