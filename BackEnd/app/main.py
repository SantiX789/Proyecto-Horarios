import json
import uuid
from fastapi import FastAPI, Response, Depends, HTTPException, status
from fastapi import BackgroundTasks, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Set
import openpyxl
from io import BytesIO
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import app.seguridad as seguridad
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import SessionLocal, get_db, crear_tablas
from app.database import (
    SessionLocal, engine, Base, get_db, crear_tablas,
    ProfesorDB, MateriaDB, CursoDB, AulaDB, RequisitoDB, AsignacionDB, UsuarioDB,
    ConfiguracionDB
)

# --- Configuración Inicial ---
app = FastAPI()
crear_tablas() # Crear tablas si no existen
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# --- Middleware de CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos Pydantic (Sin cambios) ---
class Profesor(BaseModel):
    id: Optional[str] = None
    nombre: str
    disponibilidad: List[str]

class ReporteCargaHoraria(BaseModel):
    nombre_profesor: str
    horas_asignadas: int

class Aula(BaseModel):
    id: Optional[str] = None
    nombre: str
    tipo: Optional[str] = "Normal"

class AulaUpdate(BaseModel):
    nombre: str
    tipo: Optional[str] = "Normal"    

class Materia(BaseModel):
    id: Optional[str] = None
    nombre: str

class Curso(BaseModel):
    id: Optional[str] = None
    nombre: str

class Requisito(BaseModel):
    id: Optional[str] = None
    curso_id: str
    materia_id: str
    horas_semanales: int
    tipo_aula_requerida: Optional[str] = "Normal"

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

class CursoUpdate(BaseModel):
    nombre: str

class MateriaUpdate(BaseModel):
    nombre: str

class ProfesorUpdate(BaseModel):
    nombre: str
    disponibilidad: List[str]

class Preferencias(BaseModel):
     almuerzo_slots: List[str] = []

# --- Funciones Auxiliares (Cálculo de hora) ---
def calcular_hora_rango(hora_inicio: str) -> Optional[str]:
    try:
        minutos = int(hora_inicio[3:])
        hora = int(hora_inicio[:2])
        hora_fin_min = (minutos + 40) % 60
        hora_fin_hr = hora + (minutos + 40) // 60
        return f"{hora_inicio} a {hora_fin_hr:02d}:{hora_fin_min:02d}"
    except Exception:
        return None

# --- (NUEVO) Dependencias de Autenticación con Roles ---

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decodifica el token, verifica el usuario y devuelve el payload (dict).
    """
    payload = seguridad.verificar_token(token) # <-- payload es un dict
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Asumimos 'admin' si el rol no está en el token (para tokens antiguos)
    return {"username": payload.get("sub"), "rol": payload.get("rol", "admin")}

def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    """
    Verifica que el usuario actual sea 'admin'.
    Si no lo es, lanza un error HTTP 403 Forbidden.
    """
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador para esta acción."
        )
    return current_user

# --- Funciones del Solver (sin cambios) ---
def _is_prof_and_curso_available(
    dia: str, hora_rango: str, profesor_id: str, curso_id: str, horario_ocupado: Dict[tuple[str, str], List[Dict]]
) -> bool:
    ocupaciones_en_slot = horario_ocupado.get((dia, hora_rango), [])
    for ocupacion in ocupaciones_en_slot:
        if ocupacion["curso_id"] == curso_id: return False
        if ocupacion["profesor_id"] == profesor_id: return False
    return True

def _find_available_aula(
    dia: str, hora_rango: str, tipo_aula_req: str, aulas_disponibles: List[Dict], horario_ocupado: Dict[tuple[str, str], List[Dict]]
) -> Optional[str]:
    aulas_ocupadas_en_slot = {
        ocupacion["aula_id"] for ocupacion in horario_ocupado.get((dia, hora_rango), []) 
        if ocupacion.get("aula_id")
    }
    for aula in aulas_disponibles:
        if aula["tipo"] == tipo_aula_req and aula["id"] not in aulas_ocupadas_en_slot:
            return aula["id"]
    return None

def _solve_recursive(
    requisitos_a_asignar: List[Dict],
    profesores_map: Dict,
    aulas_por_tipo: Dict[str, List[Dict]],
    curso_id: str,
    db: Session,
    horario_ocupado: Dict[tuple[str, str], List[Dict]],
    current_schedule: List[AsignacionDB],
    almuerzo_slots_set: Set[str]
) -> Optional[List[AsignacionDB]]:
    if not requisitos_a_asignar: return current_schedule
    current_req = requisitos_a_asignar[0]
    remaining_reqs = requisitos_a_asignar[1:]
    profesor_id = current_req["prof_id"]
    horas_necesarias = current_req["horas_necesarias"]
    tipo_aula_req = current_req["tipo_aula_requerida"]
    prof_data = profesores_map.get(profesor_id)
    if not prof_data: return None
    available_slots_set = prof_data.get("disponibilidad_set", set())
    slots_preferidos = []
    slots_no_preferidos = []
    for slot_id in available_slots_set:
        if slot_id in almuerzo_slots_set:
            slots_no_preferidos.append(slot_id)
        else:
            slots_preferidos.append(slot_id)
    slots_preferidos.sort()
    slots_no_preferidos.sort()
    aulas_disponibles_para_tipo = aulas_por_tipo.get(tipo_aula_req, [])
    def _assign_hours_recursive(
        hours_left_to_assign: int,
        slots_preferidos_try: List[str], 
        slots_no_preferidos_try: List[str],
        schedule_so_far: List[AsignacionDB]
    ) -> Optional[List[AsignacionDB]]:
        if hours_left_to_assign == 0:
            result = _solve_recursive(
                remaining_reqs, profesores_map, aulas_por_tipo, curso_id, db, 
                horario_ocupado, schedule_so_far, almuerzo_slots_set
            )
            return result if result else None
        if not slots_preferidos_try and not slots_no_preferidos_try: 
            return None
        if slots_preferidos_try:
            slot_id = slots_preferidos_try[0]
            remaining_preferidos = slots_preferidos_try[1:]
            remaining_no_preferidos = slots_no_preferidos_try
        else:
            slot_id = slots_no_preferidos_try[0]
            remaining_preferidos = []
            remaining_no_preferidos = slots_no_preferidos_try[1:]
        try:
            dia, hora_inicio = slot_id.split('-')
            hora_rango = calcular_hora_rango(hora_inicio)
            if not hora_rango: raise ValueError("Formato inválido")
        except ValueError:
            return _assign_hours_recursive(
                hours_left_to_assign, remaining_preferidos, remaining_no_preferidos, schedule_so_far
            )
        if _is_prof_and_curso_available(dia, hora_rango, profesor_id, curso_id, horario_ocupado):
            aula_id_encontrada = _find_available_aula(dia, hora_rango, tipo_aula_req, aulas_disponibles_para_tipo, horario_ocupado)
            if aula_id_encontrada:
                new_asignacion_obj = AsignacionDB(
                    id=f"a-{uuid.uuid4()}", curso_id=curso_id, profesor_id=profesor_id,
                    materia_id=current_req["materia_id"],
                    dia=dia, hora_rango=hora_rango,
                    aula_id=aula_id_encontrada
                )
                horario_ocupado.setdefault((dia, hora_rango), []).append({
                    "curso_id": curso_id, "profesor_id": profesor_id, "aula_id": aula_id_encontrada
                })
                result = _assign_hours_recursive(
                    hours_left_to_assign - 1,
                    remaining_preferidos,
                    remaining_no_preferidos,
                    schedule_so_far + [new_asignacion_obj]
                )
                if result: return result
                horario_ocupado[(dia, hora_rango)].pop()
        result_skipping_slot = _assign_hours_recursive(
            hours_left_to_assign, remaining_preferidos, remaining_no_preferidos, schedule_so_far
        )
        if result_skipping_slot: return result_skipping_slot
        return None
    solution_preferida = _assign_hours_recursive(
        horas_necesarias, slots_preferidos, [], current_schedule
    )
    if solution_preferida:
        return solution_preferida
    solution_completa = _assign_hours_recursive(
        horas_necesarias, slots_preferidos, slots_no_preferidos, current_schedule
    )
    return solution_completa

def _run_solver_task(request: SolverRequest, username: str):
    print(f"--- [TASK INICIADA] Empezando a generar horario para curso {request.curso_id} (Usuario: {username}) ---")
    db: Session = SessionLocal()
    try:
        db.query(AsignacionDB).filter(AsignacionDB.curso_id == request.curso_id).delete()
        db.commit()
        profesores_db = db.query(ProfesorDB).all()
        profesores_map = {}
        for p in profesores_db:
            try: disponibilidad_set = set(json.loads(p.disponibilidad_json or '[]'))
            except json.JSONDecodeError: disponibilidad_set = set()
            profesores_map[p.id] = {"id": p.id, "nombre": p.nombre, "disponibilidad_set": disponibilidad_set}
        aulas_db = db.query(AulaDB).all()
        aulas_por_tipo: Dict[str, List[Dict]] = {}
        for a in aulas_db:
            aula_data = {"id": a.id, "nombre": a.nombre, "tipo": a.tipo}
            aulas_por_tipo.setdefault(a.tipo, []).append(aula_data)
        config_db = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "preferencias_horarios").first()
        almuerzo_slots_set = set()
        if config_db:
            try: almuerzo_slots_set = set(json.loads(config_db.value_json).get("almuerzo_slots", []))
            except json.JSONDecodeError: pass
        req_ids_solicitados = [asign.requisito_id for asign in request.asignaciones]
        requisitos_db = db.query(RequisitoDB).filter(RequisitoDB.curso_id == request.curso_id, RequisitoDB.id.in_(req_ids_solicitados)).all()
        requisitos_map = {r.id: r for r in requisitos_db}
        requisitos_a_asignar = []
        for asign_request in request.asignaciones:
            req = requisitos_map.get(asign_request.requisito_id)
            if req:
                requisitos_a_asignar.append({
                    "req_id": req.id, "prof_id": asign_request.profesor_id,
                    "horas_necesarias": req.horas_semanales, "materia_id": req.materia_id,
                    "tipo_aula_requerida": req.tipo_aula_requerida
                })
        horario_ocupado_inicial: Dict[tuple[str, str], List[Dict]] = {}
        asignaciones_externas = db.query(AsignacionDB).filter(AsignacionDB.curso_id != request.curso_id).all()
        for a in asignaciones_externas:
            horario_ocupado_inicial.setdefault((a.dia, a.hora_rango), []).append({
                "curso_id": a.curso_id, "profesor_id": a.profesor_id, "aula_id": a.aula_id
            })
        solution_objects = _solve_recursive(
            requisitos_a_asignar=requisitos_a_asignar,
            profesores_map=profesores_map,
            aulas_por_tipo=aulas_por_tipo,
            curso_id=request.curso_id,
            db=db,
            horario_ocupado=horario_ocupado_inicial.copy(),
            current_schedule=[],
            almuerzo_slots_set=almuerzo_slots_set
        )
        if solution_objects:
            db.add_all(solution_objects)
            db.commit()
            print(f"--- [TASK OK] Horario para {request.curso_id} generado con éxito. ---")
        else:
            print(f"--- [TASK FALLÓ] No se encontró solución para {request.curso_id}. ---")
    except Exception as e:
        db.rollback()
        print(f"--- [TASK ERROR] Falló la generación de horario para {request.curso_id}: {e} ---")
    finally:
        db.close()

# --- Endpoints de Gestión (CRUD) ---
# La mayoría de endpoints ahora dependen de get_current_admin_user

@app.post("/api/generar-horario-completo", status_code=status.HTTP_202_ACCEPTED)
def generar_horario_completo_async(
    request: SolverRequest,
    background_tasks: BackgroundTasks,
    # --- CAMBIO AQUÍ ---
    current_user: dict = Depends(get_current_admin_user)
):
    background_tasks.add_task(
        _run_solver_task,
        request=request,
        username=current_user["username"]
    )
    return {"mensaje": "¡Generación de horario iniciada! Esto puede tardar unos segundos. Podrás ver el resultado en la pestaña 'Visualizar' cuando termine."}


# --- Endpoints de Profesores ---

@app.get("/api/profesores", response_model=List[Profesor])
def obtener_profesores(
    # Todos pueden ver la lista de profesores
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    profesores_db = db.query(ProfesorDB).all()
    profesores_list = []
    for prof_db in profesores_db:
        try:
            disponibilidad_list = json.loads(prof_db.disponibilidad_json or '[]')
        except json.JSONDecodeError:
            disponibilidad_list = []
        profesores_list.append(
            Profesor(id=prof_db.id, nombre=prof_db.nombre, disponibilidad=disponibilidad_list)
        )
    return profesores_list

@app.post("/api/profesores", response_model=Profesor, status_code=status.HTTP_201_CREATED)
def agregar_profesor(
    profesor: Profesor, 
    # --- CAMBIO AQUÍ ---
    current_user: dict = Depends(get_current_admin_user), 
    db: Session = Depends(get_db)
):
    # --- LÓGICA DE ROLES AÑADIDA ---
    # Verificar si ya existe un profesor O un usuario con ese nombre
    profesor_existente = db.query(ProfesorDB).filter(ProfesorDB.nombre == profesor.nombre).first()
    usuario_existente = db.query(UsuarioDB).filter(UsuarioDB.username == profesor.nombre).first()
    if profesor_existente or usuario_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un profesor o usuario con ese nombre")
    
    # 1. Crear el ProfesorDB
    profesor_id = f"p-{uuid.uuid4()}"
    disponibilidad_str = json.dumps(profesor.disponibilidad)
    db_profesor = ProfesorDB(id=profesor_id, nombre=profesor.nombre, disponibilidad_json=disponibilidad_str)
    
    # 2. Crear el UsuarioDB (profesor)
    # Usamos "1234" como contraseña por defecto
    default_password = "1234" 
    hashed_password = seguridad.hashear_password(default_password)
    db_usuario_profesor = UsuarioDB(
        username=profesor.nombre, 
        hashed_password=hashed_password, 
        rol="profesor" # <-- ROL PROFESOR
    )
    
    db.add(db_profesor)
    db.add(db_usuario_profesor)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear profesor y usuario: {e}")

    db.refresh(db_profesor)
    return Profesor(
        id=db_profesor.id, nombre=db_profesor.nombre,
        disponibilidad=json.loads(db_profesor.disponibilidad_json or '[]')
    )

@app.delete("/api/profesores/{profesor_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_profesor(
    profesor_id: str, 
    # --- CAMBIO AQUÍ ---
    current_user: dict = Depends(get_current_admin_user), 
    db: Session = Depends(get_db)
):
    profesor_db = db.query(ProfesorDB).filter(ProfesorDB.id == profesor_id).first()
    if not profesor_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")
    
    asignaciones_dependientes = db.query(AsignacionDB).filter(AsignacionDB.profesor_id == profesor_id).count()
    if asignaciones_dependientes > 0:
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"No se puede borrar: {asignaciones_dependientes} clases asignadas.")
    
    # --- LÓGICA DE ROLES AÑADIDA ---
    # Encontrar y borrar el usuario vinculado
    usuario_db = db.query(UsuarioDB).filter(UsuarioDB.username == profesor_db.nombre).first()
    
    db.delete(profesor_db)
    if usuario_db:
        db.delete(usuario_db) # Borramos también al usuario
    
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.put("/api/profesores/{profesor_id}", response_model=Profesor)
def modificar_profesor(
    profesor_id: str, 
    profesor_update: ProfesorUpdate, 
    # --- CAMBIO AQUÍ ---
    current_user: dict = Depends(get_current_admin_user), 
    db: Session = Depends(get_db)
):
    profesor_db = db.query(ProfesorDB).filter(ProfesorDB.id == profesor_id).first()
    if not profesor_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")

    # --- LÓGICA DE ROLES AÑADIDA ---
    nombre_antiguo = profesor_db.nombre
    nombre_nuevo = profesor_update.nombre

    # Si el nombre cambió, hay que actualizar AMBAS tablas
    if nombre_antiguo != nombre_nuevo:
        # Verificar que el NUEVO nombre no esté en uso
        profesor_existente = db.query(ProfesorDB).filter(ProfesorDB.nombre == nombre_nuevo, ProfesorDB.id != profesor_id).first()
        usuario_existente = db.query(UsuarioDB).filter(UsuarioDB.username == nombre_nuevo).first()
        if profesor_existente or usuario_existente:
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El nuevo nombre ya está en uso por otro profesor o usuario")

        # Encontrar usuario antiguo y actualizar su username
        usuario_db = db.query(UsuarioDB).filter(UsuarioDB.username == nombre_antiguo).first()
        if usuario_db:
            usuario_db.username = nombre_nuevo
        
        profesor_db.nombre = nombre_nuevo

    # Actualizar disponibilidad (esto no cambia)
    profesor_db.disponibilidad_json = json.dumps(profesor_update.disponibilidad)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar: {e}")
    
    db.refresh(profesor_db)
    return Profesor(
        id=profesor_db.id, nombre=profesor_db.nombre,
        disponibilidad=json.loads(profesor_db.disponibilidad_json or '[]')
    )


# --- Endpoints de Materias (Protegidos) ---

@app.get("/api/materias", response_model=List[Materia])
def obtener_materias(
    current_user: dict = Depends(get_current_user), # Todos pueden ver
    db: Session = Depends(get_db)
):
    materias_db = db.query(MateriaDB).all()
    return [Materia(id=m.id, nombre=m.nombre) for m in materias_db]

@app.post("/api/materias", response_model=Materia, status_code=status.HTTP_201_CREATED)
def agregar_materia(
    materia: Materia, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    db_materia_existente = db.query(MateriaDB).filter(MateriaDB.nombre == materia.nombre).first()
    if db_materia_existente: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe materia con ese nombre")
    materia_id = f"m-{uuid.uuid4()}"
    db_materia = MateriaDB(id=materia_id, nombre=materia.nombre)
    db.add(db_materia)
    db.commit()
    db.refresh(db_materia)
    return Materia(id=db_materia.id, nombre=db_materia.nombre)

@app.delete("/api/materias/{materia_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_materia(
    materia_id: str, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    materia_db = db.query(MateriaDB).filter(MateriaDB.id == materia_id).first()
    if not materia_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    requisitos_dependientes = db.query(RequisitoDB).filter(RequisitoDB.materia_id == materia_id).count()
    asignaciones_dependientes = db.query(AsignacionDB).filter(AsignacionDB.materia_id == materia_id).count()
    if requisitos_dependientes > 0 or asignaciones_dependientes > 0:
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"No se puede borrar: usada por {requisitos_dependientes} req. y/o {asignaciones_dependientes} horarios.")
    db.delete(materia_db)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.put("/api/materias/{materia_id}", response_model=Materia)
def modificar_materia(
    materia_id: str, 
    materia_update: MateriaUpdate, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    materia_db = db.query(MateriaDB).filter(MateriaDB.id == materia_id).first()
    if not materia_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    nuevo_nombre = materia_update.nombre
    materia_existente_mismo_nombre = db.query(MateriaDB).filter(MateriaDB.nombre == nuevo_nombre, MateriaDB.id != materia_id).first()
    if materia_existente_mismo_nombre: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otra materia con ese nombre")
    materia_db.nombre = nuevo_nombre
    db.commit()
    db.refresh(materia_db)
    return Materia(id=materia_db.id, nombre=materia_db.nombre)

# --- Endpoints de Cursos (Protegidos) ---

@app.get("/api/cursos", response_model=List[Curso])
def obtener_cursos(
    current_user: dict = Depends(get_current_user), # Todos pueden ver
    db: Session = Depends(get_db)
):
    cursos_db = db.query(CursoDB).all()
    return [Curso(id=c.id, nombre=c.nombre) for c in cursos_db]

@app.post("/api/cursos", response_model=Curso, status_code=status.HTTP_201_CREATED)
def agregar_curso(
    curso: Curso, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    db_curso_existente = db.query(CursoDB).filter(CursoDB.nombre == curso.nombre).first()
    if db_curso_existente: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe curso con ese nombre")
    curso_id = f"c-{uuid.uuid4()}"
    db_curso = CursoDB(id=curso_id, nombre=curso.nombre)
    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)
    return Curso(id=db_curso.id, nombre=db_curso.nombre)

@app.delete("/api/cursos/{curso_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_curso(
    curso_id: str, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    curso_db = db.query(CursoDB).filter(CursoDB.id == curso_id).first()
    if not curso_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    # TODO: Validar dependencias (requisitos, asignaciones)
    db.delete(curso_db)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.put("/api/cursos/{curso_id}", response_model=Curso)
def modificar_curso(
    curso_id: str, 
    curso_update: CursoUpdate, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    curso_db = db.query(CursoDB).filter(CursoDB.id == curso_id).first()
    if not curso_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    nuevo_nombre = curso_update.nombre
    curso_existente_mismo_nombre = db.query(CursoDB).filter(CursoDB.nombre == nuevo_nombre, CursoDB.id != curso_id).first()
    if curso_existente_mismo_nombre: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otro curso con ese nombre")
    curso_db.nombre = nuevo_nombre
    db.commit()
    db.refresh(curso_db)
    return Curso(id=curso_db.id, nombre=curso_db.nombre)

# --- Endpoints de Aulas (Protegidos) ---

@app.get("/api/aulas", response_model=List[Aula])
def obtener_aulas(
    current_user: dict = Depends(get_current_user), # Todos pueden ver
    db: Session = Depends(get_db)
):
    aulas_db = db.query(AulaDB).order_by(AulaDB.nombre).all()
    return [Aula(id=a.id, nombre=a.nombre, tipo=a.tipo) for a in aulas_db]


@app.post("/api/aulas", response_model=Aula, status_code=status.HTTP_201_CREATED)
def agregar_aula(
    aula: Aula, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    aula_existente = db.query(AulaDB).filter(AulaDB.nombre == aula.nombre).first()
    if aula_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un aula con ese nombre")
    aula_id = f"a-{uuid.uuid4()}"
    db_aula = AulaDB(id=aula_id, nombre=aula.nombre, tipo=aula.tipo)
    db.add(db_aula)
    db.commit()
    db.refresh(db_aula)
    return Aula(id=db_aula.id, nombre=db_aula.nombre, tipo=db_aula.tipo)


@app.put("/api/aulas/{aula_id}", response_model=Aula)
def modificar_aula(
    aula_id: str, 
    aula_update: AulaUpdate, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    aula_db = db.query(AulaDB).filter(AulaDB.id == aula_id).first()
    if not aula_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    nuevo_nombre = aula_update.nombre
    aula_existente_mismo_nombre = db.query(AulaDB).filter(AulaDB.nombre == nuevo_nombre, AulaDB.id != aula_id).first()
    if aula_existente_mismo_nombre:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otra aula con ese nombre")
    aula_db.nombre = aula_update.nombre
    aula_db.tipo = aula_update.tipo
    db.commit()
    db.refresh(aula_db)
    return Aula(id=aula_db.id, nombre=aula_db.nombre, tipo=aula_db.tipo)


@app.delete("/api/aulas/{aula_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_aula(
    aula_id: str, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    aula_db = db.query(AulaDB).filter(AulaDB.id == aula_id).first()
    if not aula_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    asignaciones_dependientes = db.query(AsignacionDB).filter(AsignacionDB.aula_id == aula_id).count()
    if asignaciones_dependientes > 0:
         raise HTTPException(
             status_code=status.HTTP_409_CONFLICT,
             detail=f"No se puede borrar el aula porque está siendo usada por {asignaciones_dependientes} clases."
         )
    db.delete(aula_db)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Endpoints de Preferencias y Requisitos (Protegidos) ---

@app.get("/api/preferencias", response_model=Preferencias)
def obtener_preferencias(
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    config_db = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "preferencias_horarios").first()
    if not config_db:
        return Preferencias(almuerzo_slots=[])
    try:
        data = json.loads(config_db.value_json)
        return Preferencias(**data)
    except json.JSONDecodeError:
        return Preferencias(almuerzo_slots=[])

@app.put("/api/preferencias", response_model=Preferencias)
def guardar_preferencias(
    preferencias: Preferencias, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    config_db = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "preferencias_horarios").first()
    if not config_db:
        config_db = ConfiguracionDB(key="preferencias_horarios")
        db.add(config_db)
    config_db.value_json = preferencias.model_dump_json()
    try:
        db.commit()
        db.refresh(config_db)
        return preferencias
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar preferencias: {e}")

@app.get("/api/requisitos/{curso_id}", response_model=List[dict])
def obtener_requisitos(
    curso_id: str, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    requisitos_db = db.query(RequisitoDB).options(joinedload(RequisitoDB.materia)).filter(RequisitoDB.curso_id == curso_id).all()
    requisitos_list = []
    for req_db in requisitos_db:
        requisitos_list.append({
            "id": req_db.id,
            "curso_id": req_db.curso_id,
            "materia_id": req_db.materia_id,
            "horas_semanales": req_db.horas_semanales,
            "materia_nombre": req_db.materia.nombre if req_db.materia else "???",
            "tipo_aula_requerida": req_db.tipo_aula_requerida
        })
    return requisitos_list

@app.post("/api/requisitos", response_model=Requisito, status_code=status.HTTP_201_CREATED)
def agregar_requisito(
    requisito: Requisito, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    db_requisito = RequisitoDB(
        id=f"r-{uuid.uuid4()}",
        curso_id=requisito.curso_id,
        materia_id=requisito.materia_id,
        horas_semanales=requisito.horas_semanales,
        tipo_aula_requerida=requisito.tipo_aula_requerida
    )
    db.add(db_requisito)
    db.commit()
    db.refresh(db_requisito)
    return Requisito(
        id=db_requisito.id,
        curso_id=db_requisito.curso_id,
        materia_id=db_requisito.materia_id,
        horas_semanales=db_requisito.horas_semanales,
        tipo_aula_requerida=db_requisito.tipo_aula_requerida
    )

# --- Endpoint de Vista de Horario (Admin) ---
@app.get("/api/horarios/{curso_nombre}", response_model=Dict[str, Dict[str, dict]])
def obtener_horario_curso(
    curso_nombre: str, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    curso_db = db.query(CursoDB).filter(CursoDB.nombre == curso_nombre).first()
    if not curso_db: return {}
    curso_id = curso_db.id

    asignaciones_db = db.query(AsignacionDB)\
                        .options(
                            joinedload(AsignacionDB.profesor),
                            joinedload(AsignacionDB.materia),
                            joinedload(AsignacionDB.aula)
                        )\
                        .filter(AsignacionDB.curso_id == curso_id)\
                        .all()

    horario_vista = {}
    for asignacion in asignaciones_db:
        hora_rango = asignacion.hora_rango
        dia = asignacion.dia
        prof_nombre = asignacion.profesor.nombre if asignacion.profesor else "??"
        mat_nombre = asignacion.materia.nombre if asignacion.materia else "??"
        aula_nombre = asignacion.aula.nombre if asignacion.aula else "Sin Aula"
        texto_celda = f"{prof_nombre} ({mat_nombre})"
        asignacion_data = {
            "text": texto_celda,
            "id": asignacion.id,
            "aula_nombre": aula_nombre
        }
        horario_vista.setdefault(hora_rango, {})[dia] = asignacion_data
    return horario_vista

# --- (NUEVO) Endpoint para el Horario del Profesor ---
@app.get("/api/horarios/mi-horario", response_model=Dict[str, Dict[str, dict]])
def obtener_mi_horario(
    current_user: dict = Depends(get_current_user), # Cualquier usuario logueado
    db: Session = Depends(get_db)
):
    """
    Obtiene el horario específico del profesor que está logueado.
    Asume que el 'username' del usuario es igual al 'nombre' del profesor.
    """
    
    # 1. Buscar el ID del profesor basado en el nombre de usuario
    profesor_db = db.query(ProfesorDB).filter(ProfesorDB.nombre == current_user["username"]).first()
    
    if not profesor_db:
        # Si no hay profesor (p.ej. es un admin), devuelve horario vacío
        return {} 
    
    profesor_id = profesor_db.id

    # 2. Buscar asignaciones SÓLO de ese profesor
    asignaciones_db = db.query(AsignacionDB)\
                        .options(
                            joinedload(AsignacionDB.curso), 
                            joinedload(AsignacionDB.materia),
                            joinedload(AsignacionDB.aula)
                        )\
                        .filter(AsignacionDB.profesor_id == profesor_id)\
                        .all()

    horario_vista = {}
    for asignacion in asignaciones_db:
        hora_rango = asignacion.hora_rango
        dia = asignacion.dia
        
        # Mostramos el curso y la materia
        curso_nombre = asignacion.curso.nombre if asignacion.curso else "??"
        mat_nombre = asignacion.materia.nombre if asignacion.materia else "??"
        aula_nombre = asignacion.aula.nombre if asignacion.aula else "Sin Aula"
        
        texto_celda = f"{curso_nombre} ({mat_nombre})"
        
        horario_vista.setdefault(hora_rango, {})[dia] = {
            "text": texto_celda,
            "id": asignacion.id,
            "aula_nombre": aula_nombre
        }

    return horario_vista


# --- Endpoints de Autenticación ---
@app.post("/api/register", response_model=Usuario, status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: UsuarioRegistro, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario. Por defecto, el primer usuario
    o cualquier usuario registrado por esta vía será 'admin'.
    Los usuarios 'profesor' se crean al crear un Profesor.
    """
    usuario_existente = db.query(UsuarioDB).filter(UsuarioDB.username == usuario.username).first()
    if usuario_existente: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de usuario ya existe")
    
    hashed_password = seguridad.hashear_password(usuario.password)
    
    # El 'rol' por defecto es 'admin' (definido en database.py)
    nuevo_usuario_db_obj = UsuarioDB(username=usuario.username, hashed_password=hashed_password)
    
    db.add(nuevo_usuario_db_obj)
    db.commit()
    return Usuario(username=usuario.username)

@app.post("/api/login", response_model=Token)
def login_para_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario_encontrado_db = db.query(UsuarioDB).filter(UsuarioDB.username == form_data.username).first()
    if not usuario_encontrado_db or not seguridad.verificar_password(form_data.password, usuario_encontrado_db.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nombre de usuario o contraseña incorrectos", headers={"WWW-Authenticate": "Bearer"})
    
    # --- CAMBIO AQUÍ ---
    # Crear el payload con 'sub' (username) y 'rol'
    token_data = {
        "sub": usuario_encontrado_db.username,
        "rol": usuario_encontrado_db.rol 
    }
    access_token = seguridad.crear_access_token(data=token_data)
    # --- FIN CAMBIO ---
    
    return {"access_token": access_token, "token_type": "bearer"}


# --- Endpoints de Administración de Horarios (Protegidos) ---
@app.delete("/api/horarios/{curso_nombre}", status_code=status.HTTP_200_OK)
def borrar_horarios_curso(
    curso_nombre: str, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    curso_db = db.query(CursoDB).filter(CursoDB.nombre == curso_nombre).first()
    if not curso_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    curso_id = curso_db.id
    asignaciones_a_borrar = db.query(AsignacionDB).filter(AsignacionDB.curso_id == curso_id).all()
    eliminados = len(asignaciones_a_borrar)
    if eliminados > 0:
        for asign in asignaciones_a_borrar: db.delete(asign)
        try: db.commit()
        except Exception as e: db.rollback(); raise HTTPException(status_code=500, detail=f"Error al borrar horarios: {e}")
    return {"mensaje": f"Horarios del curso {curso_nombre} borrados. {eliminados} asignaciones eliminadas."}


@app.get("/api/asignaciones/{asignacion_id}/slots-disponibles", response_model=List[Dict])
def obtener_slots_disponibles_para_asignacion(
    asignacion_id: str, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    asignacion_actual = db.query(AsignacionDB).filter(AsignacionDB.id == asignacion_id).first()
    if not asignacion_actual: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")
    profesor_id = asignacion_actual.profesor_id
    curso_id = asignacion_actual.curso_id
    profesor_db = db.query(ProfesorDB).filter(ProfesorDB.id == profesor_id).first()
    if not profesor_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor asociado no encontrado")
    try: disponibilidad_general = set(json.loads(profesor_db.disponibilidad_json or '[]'))
    except json.JSONDecodeError: disponibilidad_general = set()
    if not disponibilidad_general: return []
    todas_las_asignaciones = db.query(AsignacionDB).filter(AsignacionDB.id != asignacion_id).all()
    horario_ocupado: Dict[tuple[str, str], Dict[str, str]] = {}
    for a in todas_las_asignaciones: 
        horario_ocupado[(a.dia, a.hora_rango)] = {"curso_id": a.curso_id, "profesor_id": a.profesor_id, "aula_id": a.aula_id}
    
    # (Necesitamos TODAS las aulas para verificar disponibilidad)
    aulas_db = db.query(AulaDB).all()
    aulas_por_tipo: Dict[str, List[Dict]] = {}
    for a in aulas_db:
        aulas_por_tipo.setdefault(a.tipo, []).append({"id": a.id, "nombre": a.nombre, "tipo": a.tipo})

    # (Necesitamos el tipo de aula que requiere esta asignación)
    requisito_db = db.query(RequisitoDB).filter(RequisitoDB.curso_id == curso_id, RequisitoDB.materia_id == asignacion_actual.materia_id).first()
    tipo_aula_req = requisito_db.tipo_aula_requerida if requisito_db else "Normal"

    slots_formateados = []
    for slot_id in sorted(list(disponibilidad_general)):
        try:
            dia_slot, hora_inicio_slot = slot_id.split('-')
            hora_rango_slot = calcular_hora_rango(hora_inicio_slot)
            if not hora_rango_slot: continue

            # Verificar Profe y Curso
            prof_y_curso_libres = _is_prof_and_curso_available(dia_slot, hora_rango_slot, profesor_id, curso_id, horario_ocupado)
            
            # Verificar Aula
            aula_libre = _find_available_aula(dia_slot, hora_rango_slot, tipo_aula_req, aulas_por_tipo.get(tipo_aula_req, []), horario_ocupado)

            if prof_y_curso_libres and aula_libre:
                slots_formateados.append({"dia": dia_slot, "hora_inicio": hora_inicio_slot, "hora_rango": hora_rango_slot})
        except ValueError: continue
    return slots_formateados


@app.get("/api/reportes/carga-horaria-profesor", response_model=List[ReporteCargaHoraria])
def reporte_carga_horaria(
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    resultados_db = db.query(
            ProfesorDB.nombre,
            func.count(AsignacionDB.id).label("horas_asignadas")
        )\
        .join(AsignacionDB, ProfesorDB.id == AsignacionDB.profesor_id, isouter=True)\
        .group_by(ProfesorDB.nombre)\
        .order_by(func.count(AsignacionDB.id).desc())\
        .all()
    reporte = [
        ReporteCargaHoraria(nombre_profesor=nombre, horas_asignadas=conteo)
        for nombre, conteo in resultados_db
    ]
    return reporte


@app.put("/api/asignaciones/{asignacion_id}", status_code=status.HTTP_200_OK)
def actualizar_asignacion(
    asignacion_id: str, 
    update_data: AsignacionUpdate, 
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
     asignacion_db = db.query(AsignacionDB).filter(AsignacionDB.id == asignacion_id).first()
     if not asignacion_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")
     
     nuevo_dia = update_data.dia
     nueva_hora_rango = update_data.hora_rango
     profesor_id = asignacion_db.profesor_id
     curso_id = asignacion_db.curso_id

     # (Verificación de conflicto de aula es más compleja, la omitimos en la edición manual por ahora)
     # (El check de slots-disponibles ya debería haber prevenido esto)
     conflicto = db.query(AsignacionDB).filter(
         AsignacionDB.id != asignacion_id, 
         AsignacionDB.dia == nuevo_dia, 
         AsignacionDB.hora_rango == nueva_hora_rango,
         ((AsignacionDB.curso_id == curso_id) | (AsignacionDB.profesor_id == profesor_id))
     ).first()
     
     if conflicto:
        tipo_conflicto = "curso" if conflicto.curso_id == curso_id else "profesor"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El nuevo horario seleccionado ya está ocupado (conflicto de {tipo_conflicto}).")
     
     asignacion_db.dia = nuevo_dia
     asignacion_db.hora_rango = nueva_hora_rango
     db.commit()
     return {"mensaje": "Asignación actualizada correctamente"}

# --- Endpoint de Exportar a Excel (Protegido) ---
@app.get("/api/export/excel")
def crear_excel_api(
    current_user: dict = Depends(get_current_admin_user), # Admin
    db: Session = Depends(get_db)
):
    wb = openpyxl.Workbook()
    if "Sheet" in wb.sheetnames: wb.remove(wb["Sheet"])
    cursos_db = db.query(CursoDB).order_by(CursoDB.nombre).all()
    asignaciones_db = db.query(AsignacionDB).options(joinedload(AsignacionDB.profesor), joinedload(AsignacionDB.materia), joinedload(AsignacionDB.aula)).all() # <-- AÑADIDO AULA
    horarios = [
        "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40", "09:40 a 10:20", "10:20 a 11:00",
        "11:00 a 11:40", "11:40 a 12:20", "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
        "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40", "17:40 a 18:20", "18:20 a 19:00",
        "19:00 a 19:40"
    ]
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    for curso in cursos_db:
        curso_id = curso.id; curso_nombre = curso.nombre
        ws = wb.create_sheet(f"Horario {curso_nombre}")
        ws.append(['Hora'] + dias)
        for cell in ws[1]: cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF"); cell.fill = openpyxl.styles.PatternFill("solid", fgColor="1D72B8")
        horario_vista_curso = {}
        for asignacion in asignaciones_db:
            if asignacion.curso_id == curso_id:
                hora = asignacion.hora_rango; dia = asignacion.dia
                prof_nombre = asignacion.profesor.nombre if asignacion.profesor else "??"
                mat_nombre = asignacion.materia.nombre if asignacion.materia else "??"
                aula_nombre = asignacion.aula.nombre if asignacion.aula else "" # <-- AÑADIDO AULA
                
                texto_celda = f"{prof_nombre} ({mat_nombre})"
                if aula_nombre:
                    texto_celda += f"\n[{aula_nombre}]" # <-- AÑADIDO AULA

                horario_vista_curso.setdefault(hora, {})[dia] = texto_celda
        for hora in horarios:
            fila = [hora] + [horario_vista_curso.get(hora, {}).get(dia, "") for dia in dias]
            ws.append(fila)
        ws.column_dimensions['A'].width = 15
        for col in ['B', 'C', 'D', 'E', 'F']: ws.column_dimensions[col].width = 30
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=Horarios_Cursos.xlsx"})
