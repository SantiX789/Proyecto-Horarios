import json
import uuid
from fastapi import FastAPI, Response, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Set # Import Set
import openpyxl
from io import BytesIO
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import app.seguridad as seguridad

# --- Configuración Inicial ---
app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# --- Middleware de CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Lógica de Base de Datos ---
DB_FILE = "horarios_db.json"

def leer_db():
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            keys = ["profesores", "materias", "cursos", "requisitos_curso", "horarios_generados", "usuarios"]
            for key in keys:
                data.setdefault(key, []) # Usar setdefault es más conciso
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        return {key: [] for key in ["profesores", "materias", "cursos", "requisitos_curso", "horarios_generados", "usuarios"]}

def guardar_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

# --- Modelos Pydantic ---
class Profesor(BaseModel):
    nombre: str
    disponibilidad: List[str]

class Materia(BaseModel):
    nombre: str

class Curso(BaseModel):
    nombre: str

class Requisito(BaseModel):
    curso_id: str
    materia_id: str
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

class AsignacionSolver(BaseModel):
    requisito_id: str
    profesor_id: str

class SolverRequest(BaseModel):
    curso_id: str
    asignaciones: List[AsignacionSolver]

class AsignacionUpdate(BaseModel):
    dia: str
    hora_rango: str

# --- Funciones Auxiliares ---
def get_current_user(token: str = Depends(oauth2_scheme)):
    username = seguridad.verificar_token(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"username": username}

# Función para calcular hora_rango desde hora_inicio (evita repetir código)
def calcular_hora_rango(hora_inicio: str) -> Optional[str]:
    try:
        minutos = int(hora_inicio[3:])
        hora = int(hora_inicio[:2])
        hora_fin_min = (minutos + 40) % 60
        hora_fin_hr = hora + (minutos + 40) // 60
        return f"{hora_inicio} a {hora_fin_hr:02d}:{hora_fin_min:02d}"
    except Exception:
        return None

# --- Endpoints de Gestión (CRUD) ---
@app.get("/api/profesores", response_model=List[dict])
def obtener_profesores(current_user: dict = Depends(get_current_user)):
    db = leer_db()
    return db["profesores"]

@app.post("/api/profesores", status_code=status.HTTP_201_CREATED)
def agregar_profesor(profesor: Profesor, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    nuevo_profesor = profesor.dict()
    nuevo_profesor["id"] = f"p-{uuid.uuid4()}"
    db["profesores"].append(nuevo_profesor)
    guardar_db(db)
    return nuevo_profesor # Devolver el objeto creado es más RESTful

# ... (Endpoints GET/POST para Materias y Cursos - sin cambios significativos) ...
@app.get("/api/materias", response_model=List[dict])
def obtener_materias(current_user: dict = Depends(get_current_user)):
    db = leer_db()
    return db["materias"]

@app.post("/api/materias", status_code=status.HTTP_201_CREATED)
def agregar_materia(materia: Materia, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    nueva_materia = materia.dict()
    nueva_materia["id"] = f"m-{uuid.uuid4()}"
    db["materias"].append(nueva_materia)
    guardar_db(db)
    return nueva_materia

@app.get("/api/cursos", response_model=List[dict])
def obtener_cursos(current_user: dict = Depends(get_current_user)):
    db = leer_db()
    return db["cursos"]

@app.post("/api/cursos", status_code=status.HTTP_201_CREATED)
def agregar_curso(curso: Curso, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    nuevo_curso = curso.dict()
    nuevo_curso["id"] = f"c-{uuid.uuid4()}"
    db["cursos"].append(nuevo_curso)
    guardar_db(db)
    return nuevo_curso

@app.get("/api/requisitos/{curso_id}", response_model=List[dict])
def obtener_requisitos(curso_id: str, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    reqs_del_curso = [req for req in db["requisitos_curso"] if req["curso_id"] == curso_id]
    materias_map = {m["id"]: m["nombre"] for m in db["materias"]}
    for req in reqs_del_curso:
        req["materia_nombre"] = materias_map.get(req["materia_id"], "???")
    return reqs_del_curso

@app.post("/api/requisitos", status_code=status.HTTP_201_CREATED)
def agregar_requisito(requisito: Requisito, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    # Validar que curso_id y materia_id existen podría ser buena idea
    nuevo_req = requisito.dict()
    nuevo_req["id"] = f"r-{uuid.uuid4()}"
    db["requisitos_curso"].append(nuevo_req)
    guardar_db(db)
    return nuevo_req

# --- Endpoint de Vista de Horario ---
@app.get("/api/horarios/{curso_nombre}", response_model=Dict[str, Dict[str, dict]])
def obtener_horario_curso(curso_nombre: str, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    curso_id = next((c["id"] for c in db["cursos"] if c["nombre"] == curso_nombre), None)
    if not curso_id: return {}

    profesores_map = {p["id"]: p["nombre"] for p in db["profesores"]}
    materias_map = {m["id"]: m["nombre"] for m in db["materias"]}
    horario_vista = {}

    for asignacion in db["horarios_generados"]:
        if asignacion["curso_id"] == curso_id:
            hora_rango = asignacion["hora_rango"]
            dia = asignacion["dia"]
            prof_nombre = profesores_map.get(asignacion["profesor_id"], "??")
            mat_nombre = materias_map.get(asignacion["materia_id"], "??")
            texto_celda = f"{prof_nombre} ({mat_nombre})"
            asignacion_data = {"text": texto_celda, "id": asignacion["id"]}

            horario_vista.setdefault(hora_rango, {})[dia] = asignacion_data

    return horario_vista

# --- Endpoints de Autenticación ---
@app.post("/api/register", response_model=Usuario, status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: UsuarioRegistro):
    db = leer_db()
    if any(u["username"] == usuario.username for u in db["usuarios"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de usuario ya existe")

    hashed_password = seguridad.hashear_password(usuario.password)
    nuevo_usuario_db = UsuarioEnDB(username=usuario.username, hashed_password=hashed_password)
    db["usuarios"].append(nuevo_usuario_db.dict())
    guardar_db(db)
    return Usuario(username=usuario.username)

@app.post("/api/login", response_model=Token)
def login_para_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = leer_db()
    usuario_encontrado = next((u for u in db["usuarios"] if u["username"] == form_data.username), None)

    if not usuario_encontrado or not seguridad.verificar_password(form_data.password, usuario_encontrado["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = seguridad.crear_access_token(data={"sub": usuario_encontrado["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Endpoint de Borrado de Horarios ---
@app.delete("/api/horarios/{curso_nombre}", status_code=status.HTTP_200_OK)
def borrar_horarios_curso(curso_nombre: str, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    curso_id = next((c["id"] for c in db["cursos"] if c["nombre"] == curso_nombre), None)
    if not curso_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    horarios_original_count = len(db["horarios_generados"])
    db["horarios_generados"] = [h for h in db["horarios_generados"] if h["curso_id"] != curso_id]
    eliminados = horarios_original_count - len(db["horarios_generados"])
    guardar_db(db)
    return {"mensaje": f"Horarios del curso {curso_nombre} borrados. {eliminados} asignaciones eliminadas."}

# --- Endpoints de Edición Manual ---

# ¡VERSIÓN CORREGIDA Y LIMPIA!
@app.get("/api/asignaciones/{asignacion_id}/slots-disponibles", response_model=List[Dict])
def obtener_slots_disponibles_para_asignacion(asignacion_id: str, current_user: dict = Depends(get_current_user)):
    db = leer_db()

    asignacion_actual = next((a for a in db["horarios_generados"] if a["id"] == asignacion_id), None)
    if not asignacion_actual:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")

    profesor_id = asignacion_actual["profesor_id"]
    curso_id = asignacion_actual["curso_id"]

    profesor_data = next((p for p in db["profesores"] if p["id"] == profesor_id), None)
    if not profesor_data or "disponibilidad" not in profesor_data:
        return []

    disponibilidad_general = set(profesor_data.get("disponibilidad", [])) # Dia-HoraInicio
    
    # Construir un mapa de todos los slots ocupados (dia -> hora_rango -> {curso_id, profesor_id})
    # Esto es más eficiente para buscar conflictos
    horario_ocupado: Dict[str, Dict[str, Dict[str, str]]] = {}
    for a in db["horarios_generados"]:
         if a["id"] == asignacion_id: # Ignorar la que movemos
             continue
         horario_ocupado.setdefault(a["dia"], {}).setdefault(a["hora_rango"], {"curso_id": a["curso_id"], "profesor_id": a["profesor_id"]})

    slots_formateados = []
    for slot_id in sorted(list(disponibilidad_general)): # Iterar por Dia-HoraInicio
        hora_rango_slot = calcular_hora_rango(slot_id.split('-')[1])
        dia_slot = slot_id.split('-')[0]

        if not hora_rango_slot: continue # Ignorar slots mal formateados

        # Verificar si el slot (dia, hora_rango) está libre
        slot_libre_para_mover = True
        ocupacion = horario_ocupado.get(dia_slot, {}).get(hora_rango_slot)
        if ocupacion:
            # Conflicto de curso?
            if ocupacion["curso_id"] == curso_id:
                slot_libre_para_mover = False
            # Conflicto de profesor?
            if ocupacion["profesor_id"] == profesor_id:
                slot_libre_para_mover = False

        if slot_libre_para_mover:
            slots_formateados.append({
                "dia": dia_slot,
                "hora_inicio": slot_id.split('-')[1],
                "hora_rango": hora_rango_slot
            })

    return slots_formateados

@app.put("/api/asignaciones/{asignacion_id}", status_code=status.HTTP_200_OK)
def actualizar_asignacion(asignacion_id: str, update_data: AsignacionUpdate, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    asignacion_index = next((i for i, a in enumerate(db["horarios_generados"]) if a["id"] == asignacion_id), -1)

    if asignacion_index == -1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")

    asignacion_encontrada = db["horarios_generados"][asignacion_index]
    nuevo_dia = update_data.dia
    nueva_hora_rango = update_data.hora_rango
    profesor_id = asignacion_encontrada["profesor_id"]
    curso_id = asignacion_encontrada["curso_id"]

    # Verificar si el NUEVO slot está disponible
    slot_libre = True
    for i, a in enumerate(db["horarios_generados"]):
        if i == asignacion_index: continue
        if a["dia"] == nuevo_dia and a["hora_rango"] == nueva_hora_rango:
            if a["curso_id"] == curso_id or a["profesor_id"] == profesor_id:
                slot_libre = False
                break
    if not slot_libre:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El nuevo horario seleccionado ya está ocupado.")

    # Actualizar y guardar
    db["horarios_generados"][asignacion_index]["dia"] = nuevo_dia
    db["horarios_generados"][asignacion_index]["hora_rango"] = nueva_hora_rango
    guardar_db(db)
    return {"mensaje": "Asignación actualizada correctamente"}


# --- Endpoint del Solver Backtracking ---
# (Aquí va el código completo de _is_slot_available, _solve_recursive y generar_horario_completo
# que te pasé en la respuesta anterior. Asegúrate de copiarlo todo, incluyendo los modelos
# AsignacionSolver y SolverRequest si los borraste por error.)

def _is_slot_available(dia: str, hora_rango: str, profesor_id: str, curso_id: str, current_schedule: List[Dict]) -> bool:
    """Verifica si un hueco específico está libre para el profesor Y el curso."""
    for asignacion in current_schedule:
        if asignacion["dia"] == dia and asignacion["hora_rango"] == hora_rango:
            if asignacion["curso_id"] == curso_id: return False
            if asignacion["profesor_id"] == profesor_id: return False
    return True

def _solve_recursive(
    requisitos_a_asignar: List[Dict], profesores_map: Dict, curso_id: str, current_schedule: List[Dict]
) -> Optional[List[Dict]]:
    if not requisitos_a_asignar: return current_schedule

    current_req = requisitos_a_asignar[0]
    remaining_reqs = requisitos_a_asignar[1:]
    profesor_id = current_req["prof_id"]
    horas_necesarias = current_req["horas_necesarias"]
    prof_data = profesores_map.get(profesor_id)
    if not prof_data: return None

    available_slots = sorted(list(prof_data["disponibilidad"])) # Dia-HoraInicio

    def _assign_hours_recursive(hours_left_to_assign: int, slots_to_try: List[str], schedule_so_far: List[Dict]) -> Optional[List[Dict]]:
        if hours_left_to_assign == 0:
            result = _solve_recursive(remaining_reqs, profesores_map, curso_id, schedule_so_far)
            return result if result else None
        if not slots_to_try: return None

        slot = slots_to_try[0]
        remaining_slots = slots_to_try[1:]
        hora_inicio = slot.split('-')[1]
        dia = slot.split('-')[0]
        hora_rango = calcular_hora_rango(hora_inicio)

        if hora_rango and _is_slot_available(dia, hora_rango, profesor_id, curso_id, schedule_so_far):
            new_asignacion = {
                "id": f"a-{uuid.uuid4()}", "curso_id": curso_id, "profesor_id": profesor_id,
                "materia_id": current_req["materia_id"], "dia": dia, "hora_rango": hora_rango
            }
            result = _assign_hours_recursive(hours_left_to_assign - 1, remaining_slots, schedule_so_far + [new_asignacion])
            if result: return result

        result_skipping_slot = _assign_hours_recursive(hours_left_to_assign, remaining_slots, schedule_so_far)
        if result_skipping_slot: return result_skipping_slot

        return None

    return _assign_hours_recursive(horas_necesarias, available_slots, current_schedule)

@app.post("/api/generar-horario-completo", tags=["Solver"])
def generar_horario_completo(request: SolverRequest, current_user: dict = Depends(get_current_user)):
    db = leer_db()
    db["horarios_generados"] = [h for h in db.get("horarios_generados", []) if h["curso_id"] != request.curso_id]

    profesores_map = {p["id"]: {**p, "disponibilidad": set(p.get("disponibilidad", []))} for p in db.get("profesores", [])}
    requisitos_map = {r["id"]: r for r in db.get("requisitos_curso", [])}
    materias_map = {m["id"]: m for m in db.get("materias", [])}

    requisitos_a_asignar = []
    for asign_request in request.asignaciones:
        req = requisitos_map.get(asign_request.requisito_id)
        if req and req["curso_id"] == request.curso_id:
            requisitos_a_asignar.append({
                "req_id": req["id"], "prof_id": asign_request.profesor_id,
                "horas_necesarias": req["horas_semanales"], "materia_id": req["materia_id"]
            })

    initial_schedule = db["horarios_generados"]
    solution = _solve_recursive(requisitos_a_asignar, profesores_map, request.curso_id, initial_schedule)

    if solution:
        new_assignments = [a for a in solution if a not in initial_schedule]
        db["horarios_generados"].extend(new_assignments)
        guardar_db(db)
        assigned_count = len(new_assignments)
        total_requested_hours = sum(r["horas_necesarias"] for r in requisitos_a_asignar)
        faltantes = total_requested_hours - assigned_count
        if faltantes > 0:
            return {"mensaje": f"Solución encontrada, pero incompleta. Faltaron {faltantes} horas.", "faltantes_total": faltantes}
        else:
            return {"mensaje": "¡Horario completo generado con éxito (backtracking)!", "faltantes_total": 0}
    else:
        guardar_db(db)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se pudo encontrar un horario válido.")


# --- Endpoint de Exportar a Excel ---
@app.get("/api/export/excel")
def crear_excel_api(current_user: dict = Depends(get_current_user)):
    db = leer_db()
    wb = openpyxl.Workbook()
    if "Sheet" in wb.sheetnames: wb.remove(wb["Sheet"])

    profesores_map = {p["id"]: p["nombre"] for p in db["profesores"]}
    materias_map = {m["id"]: m["nombre"] for m in db["materias"]}
    horarios = [ # Idealmente, esto debería ser configurable o derivado de los datos
        "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
        "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
        "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
        "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
        "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
    ]
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

    for curso in db["cursos"]:
        curso_id = curso["id"]
        curso_nombre = curso["nombre"]
        ws = wb.create_sheet(f"Horario {curso_nombre}")
        ws.append(['Hora'] + dias)

        for cell in ws[1]:
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill("solid", fgColor="1D72B8")

        horario_vista_curso = {}
        for asignacion in db["horarios_generados"]:
            if asignacion["curso_id"] == curso_id:
                hora = asignacion["hora_rango"]
                dia = asignacion["dia"]
                prof_nombre = profesores_map.get(asignacion["profesor_id"], "??")
                mat_nombre = materias_map.get(asignacion["materia_id"], "??")
                texto_celda = f"{prof_nombre} ({mat_nombre})"
                horario_vista_curso.setdefault(hora, {})[dia] = texto_celda

        for hora in horarios:
            fila = [hora] + [horario_vista_curso.get(hora, {}).get(dia, "") for dia in dias]
            ws.append(fila)

        ws.column_dimensions['A'].width = 15
        for col in ['B', 'C', 'D', 'E', 'F']:
            ws.column_dimensions[col].width = 30

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Horarios_Cursos.xlsx"}
    )