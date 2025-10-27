import json
import uuid
from fastapi import FastAPI, Response, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Set
import openpyxl
from io import BytesIO
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import app.seguridad as seguridad
from sqlalchemy.orm import Session, joinedload
from app.database import (
    SessionLocal, engine, Base, get_db, crear_tablas,
    ProfesorDB, MateriaDB, CursoDB, RequisitoDB, AsignacionDB, UsuarioDB
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

# --- Modelos Pydantic (TODOS DEFINIDOS AQUÍ PRIMERO) ---
class Profesor(BaseModel):
    id: Optional[str] = None
    nombre: str
    disponibilidad: List[str]

class Materia(BaseModel):
    id: Optional[str] = None
    nombre: str

class Curso(BaseModel):
    id: Optional[str] = None
    nombre: str

class Requisito(BaseModel):
    id: Optional[str] = None # Añadido por consistencia
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

class CursoUpdate(BaseModel):
    nombre: str

class MateriaUpdate(BaseModel):
    nombre: str

class ProfesorUpdate(BaseModel):
    nombre: str
    disponibilidad: List[str]

# --- Funciones Auxiliares (DEFINIDAS AQUÍ) ---
def get_current_user(token: str = Depends(oauth2_scheme)):
    username = seguridad.verificar_token(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"username": username}

def calcular_hora_rango(hora_inicio: str) -> Optional[str]:
    try:
        minutos = int(hora_inicio[3:])
        hora = int(hora_inicio[:2])
        hora_fin_min = (minutos + 40) % 60
        hora_fin_hr = hora + (minutos + 40) // 60
        return f"{hora_inicio} a {hora_fin_hr:02d}:{hora_fin_min:02d}"
    except Exception:
        return None

# Funciones auxiliares del Solver (Definidas ANTES de usarlas en el endpoint)
def _is_slot_available(
    dia: str, hora_rango: str, profesor_id: str, curso_id: str, db: Session, current_schedule_ids: Set[str]
) -> bool:
    conflicto_db = db.query(AsignacionDB)\
                     .filter(
                         AsignacionDB.dia == dia,
                         AsignacionDB.hora_rango == hora_rango,
                         ((AsignacionDB.curso_id == curso_id) | (AsignacionDB.profesor_id == profesor_id)),
                         ~AsignacionDB.id.in_(current_schedule_ids)
                     ).first()
    return not bool(conflicto_db) # Devuelve True si NO hay conflicto

def _solve_recursive(
    requisitos_a_asignar: List[Dict], profesores_map: Dict, curso_id: str, db: Session, current_schedule: List[AsignacionDB]
) -> Optional[List[AsignacionDB]]:
    if not requisitos_a_asignar: return current_schedule

    current_req = requisitos_a_asignar[0]
    remaining_reqs = requisitos_a_asignar[1:]
    profesor_id = current_req["prof_id"]
    horas_necesarias = current_req["horas_necesarias"]
    prof_data = profesores_map.get(profesor_id)
    if not prof_data: return None

    available_slots = sorted(list(prof_data.get("disponibilidad_set", set()))) # Usar .get con default

    current_schedule_ids = {asign.id for asign in current_schedule if asign.id}

    def _assign_hours_recursive(
        hours_left_to_assign: int, slots_to_try: List[str], schedule_so_far: List[AsignacionDB]
    ) -> Optional[List[AsignacionDB]]:
        if hours_left_to_assign == 0:
            result = _solve_recursive(remaining_reqs, profesores_map, curso_id, db, schedule_so_far)
            return result if result else None
        if not slots_to_try: return None

        slot_id = slots_to_try[0]
        remaining_slots = slots_to_try[1:]

        try:
            dia, hora_inicio = slot_id.split('-')
            hora_rango = calcular_hora_rango(hora_inicio)
            if not hora_rango: raise ValueError("Formato inválido")
        except ValueError:
            return _assign_hours_recursive(hours_left_to_assign, remaining_slots, schedule_so_far)

        current_step_ids = {asign.id for asign in schedule_so_far if asign.id}
        if _is_slot_available(dia, hora_rango, profesor_id, curso_id, db, current_step_ids):
            new_asignacion_obj = AsignacionDB(
                id=f"a-{uuid.uuid4()}", curso_id=curso_id, profesor_id=profesor_id,
                materia_id=current_req["materia_id"], dia=dia, hora_rango=hora_rango
            )
            result = _assign_hours_recursive(hours_left_to_assign - 1, remaining_slots, schedule_so_far + [new_asignacion_obj])
            if result: return result

        result_skipping_slot = _assign_hours_recursive(hours_left_to_assign, remaining_slots, schedule_so_far)
        if result_skipping_slot: return result_skipping_slot

        return None

    return _assign_hours_recursive(horas_necesarias, available_slots, current_schedule)


# --- Endpoints de la API (AHORA SÍ PUEDEN USAR LAS DEFINICIONES ANTERIORES) ---

# --- Endpoints de Gestión (CRUD) ---
@app.get("/api/profesores", response_model=List[Profesor])
def obtener_profesores(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
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
def agregar_profesor(profesor: Profesor, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    profesor_id = f"p-{uuid.uuid4()}"
    disponibilidad_str = json.dumps(profesor.disponibilidad)
    db_profesor = ProfesorDB(id=profesor_id, nombre=profesor.nombre, disponibilidad_json=disponibilidad_str)
    db.add(db_profesor)
    db.commit()
    db.refresh(db_profesor)
    return Profesor(
        id=db_profesor.id, nombre=db_profesor.nombre,
        disponibilidad=json.loads(db_profesor.disponibilidad_json or '[]')
    )

@app.delete("/api/profesores/{profesor_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_profesor(profesor_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    profesor_db = db.query(ProfesorDB).filter(ProfesorDB.id == profesor_id).first()
    if not profesor_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")
    asignaciones_dependientes = db.query(AsignacionDB).filter(AsignacionDB.profesor_id == profesor_id).count()
    if asignaciones_dependientes > 0:
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"No se puede borrar: {asignaciones_dependientes} clases asignadas.")
    db.delete(profesor_db)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.put("/api/profesores/{profesor_id}", response_model=Profesor)
def modificar_profesor(profesor_id: str, profesor_update: ProfesorUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    profesor_db = db.query(ProfesorDB).filter(ProfesorDB.id == profesor_id).first()
    if not profesor_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")
    profesor_db.nombre = profesor_update.nombre
    profesor_db.disponibilidad_json = json.dumps(profesor_update.disponibilidad)
    db.commit()
    db.refresh(profesor_db)
    return Profesor(
        id=profesor_db.id, nombre=profesor_db.nombre,
        disponibilidad=json.loads(profesor_db.disponibilidad_json or '[]')
    )


@app.get("/api/materias", response_model=List[Materia])
def obtener_materias(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    materias_db = db.query(MateriaDB).all()
    return [Materia(id=m.id, nombre=m.nombre) for m in materias_db]

@app.post("/api/materias", response_model=Materia, status_code=status.HTTP_201_CREATED)
def agregar_materia(materia: Materia, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db_materia_existente = db.query(MateriaDB).filter(MateriaDB.nombre == materia.nombre).first()
    if db_materia_existente: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe materia con ese nombre")
    materia_id = f"m-{uuid.uuid4()}"
    db_materia = MateriaDB(id=materia_id, nombre=materia.nombre)
    db.add(db_materia)
    db.commit()
    db.refresh(db_materia)
    return Materia(id=db_materia.id, nombre=db_materia.nombre)

@app.delete("/api/materias/{materia_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_materia(materia_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
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
def modificar_materia(materia_id: str, materia_update: MateriaUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    materia_db = db.query(MateriaDB).filter(MateriaDB.id == materia_id).first()
    if not materia_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    nuevo_nombre = materia_update.nombre
    materia_existente_mismo_nombre = db.query(MateriaDB).filter(MateriaDB.nombre == nuevo_nombre, MateriaDB.id != materia_id).first()
    if materia_existente_mismo_nombre: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otra materia con ese nombre")
    materia_db.nombre = nuevo_nombre
    db.commit()
    db.refresh(materia_db)
    return Materia(id=materia_db.id, nombre=materia_db.nombre)


@app.get("/api/cursos", response_model=List[Curso])
def obtener_cursos(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    cursos_db = db.query(CursoDB).all()
    return [Curso(id=c.id, nombre=c.nombre) for c in cursos_db]

@app.post("/api/cursos", response_model=Curso, status_code=status.HTTP_201_CREATED)
def agregar_curso(curso: Curso, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db_curso_existente = db.query(CursoDB).filter(CursoDB.nombre == curso.nombre).first()
    if db_curso_existente: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe curso con ese nombre")
    curso_id = f"c-{uuid.uuid4()}"
    db_curso = CursoDB(id=curso_id, nombre=curso.nombre)
    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)
    return Curso(id=db_curso.id, nombre=db_curso.nombre)

@app.delete("/api/cursos/{curso_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_curso(curso_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    curso_db = db.query(CursoDB).filter(CursoDB.id == curso_id).first()
    if not curso_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    # TODO: Validar dependencias (requisitos, asignaciones)
    db.delete(curso_db)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.put("/api/cursos/{curso_id}", response_model=Curso)
def modificar_curso(curso_id: str, curso_update: CursoUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    curso_db = db.query(CursoDB).filter(CursoDB.id == curso_id).first()
    if not curso_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    nuevo_nombre = curso_update.nombre
    curso_existente_mismo_nombre = db.query(CursoDB).filter(CursoDB.nombre == nuevo_nombre, CursoDB.id != curso_id).first()
    if curso_existente_mismo_nombre: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otro curso con ese nombre")
    curso_db.nombre = nuevo_nombre
    db.commit()
    db.refresh(curso_db)
    return Curso(id=curso_db.id, nombre=curso_db.nombre)


@app.get("/api/requisitos/{curso_id}", response_model=List[dict])
def obtener_requisitos(curso_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    requisitos_db = db.query(RequisitoDB)\
                      .options(joinedload(RequisitoDB.materia))\
                      .filter(RequisitoDB.curso_id == curso_id)\
                      .all()
    requisitos_list = []
    for req_db in requisitos_db:
        requisitos_list.append({
            "id": req_db.id, "curso_id": req_db.curso_id, "materia_id": req_db.materia_id,
            "horas_semanales": req_db.horas_semanales,
            "materia_nombre": req_db.materia.nombre if req_db.materia else "???"
        })
    return requisitos_list

@app.post("/api/requisitos", response_model=Requisito, status_code=status.HTTP_201_CREATED)
def agregar_requisito(requisito: Requisito, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    curso_existe = db.query(CursoDB).filter(CursoDB.id == requisito.curso_id).first()
    if not curso_existe: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Curso {requisito.curso_id} no encontrado")
    materia_existe = db.query(MateriaDB).filter(MateriaDB.id == requisito.materia_id).first()
    if not materia_existe: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Materia {requisito.materia_id} no encontrada")
    requisito_id = f"r-{uuid.uuid4()}"
    db_requisito = RequisitoDB(
        id=requisito_id, curso_id=requisito.curso_id, materia_id=requisito.materia_id,
        horas_semanales=requisito.horas_semanales
    )
    db.add(db_requisito)
    db.commit()
    db.refresh(db_requisito)
    return Requisito(
        id=db_requisito.id, curso_id=db_requisito.curso_id, materia_id=db_requisito.materia_id,
        horas_semanales=db_requisito.horas_semanales
    )

# --- Endpoint de Vista de Horario ---
@app.get("/api/horarios/{curso_nombre}", response_model=Dict[str, Dict[str, dict]])
def obtener_horario_curso(curso_nombre: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (código sin cambios) ...
    curso_db = db.query(CursoDB).filter(CursoDB.nombre == curso_nombre).first()
    if not curso_db: return {}
    curso_id = curso_db.id
    asignaciones_db = db.query(AsignacionDB)\
                        .options(joinedload(AsignacionDB.profesor), joinedload(AsignacionDB.materia))\
                        .filter(AsignacionDB.curso_id == curso_id).all()
    horario_vista = {}
    for asignacion in asignaciones_db:
        hora_rango = asignacion.hora_rango
        dia = asignacion.dia
        prof_nombre = asignacion.profesor.nombre if asignacion.profesor else "??"
        mat_nombre = asignacion.materia.nombre if asignacion.materia else "??"
        texto_celda = f"{prof_nombre} ({mat_nombre})"
        asignacion_data = {"text": texto_celda, "id": asignacion.id}
        horario_vista.setdefault(hora_rango, {})[dia] = asignacion_data
    return horario_vista


# --- Endpoints de Autenticación ---
@app.post("/api/register", response_model=Usuario, status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: UsuarioRegistro, db: Session = Depends(get_db)):
    # ... (código sin cambios) ...
    usuario_existente = db.query(UsuarioDB).filter(UsuarioDB.username == usuario.username).first()
    if usuario_existente: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de usuario ya existe")
    hashed_password = seguridad.hashear_password(usuario.password)
    nuevo_usuario_db_obj = UsuarioDB(username=usuario.username, hashed_password=hashed_password)
    db.add(nuevo_usuario_db_obj)
    db.commit()
    return Usuario(username=usuario.username)

@app.post("/api/login", response_model=Token)
def login_para_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # ... (código sin cambios) ...
    usuario_encontrado_db = db.query(UsuarioDB).filter(UsuarioDB.username == form_data.username).first()
    if not usuario_encontrado_db or not seguridad.verificar_password(form_data.password, usuario_encontrado_db.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nombre de usuario o contraseña incorrectos", headers={"WWW-Authenticate": "Bearer"})
    access_token = seguridad.crear_access_token(data={"sub": usuario_encontrado_db.username})
    return {"access_token": access_token, "token_type": "bearer"}


# --- Endpoint de Borrado de Horarios ---
@app.delete("/api/horarios/{curso_nombre}", status_code=status.HTTP_200_OK)
def borrar_horarios_curso(curso_nombre: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (código sin cambios) ...
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


# --- Endpoints de Edición Manual ---
@app.get("/api/asignaciones/{asignacion_id}/slots-disponibles", response_model=List[Dict])
def obtener_slots_disponibles_para_asignacion(asignacion_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (código sin cambios) ...
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
    for a in todas_las_asignaciones: horario_ocupado[(a.dia, a.hora_rango)] = {"curso_id": a.curso_id, "profesor_id": a.profesor_id}
    slots_formateados = []
    for slot_id in sorted(list(disponibilidad_general)):
        try:
            dia_slot, hora_inicio_slot = slot_id.split('-')
            hora_rango_slot = calcular_hora_rango(hora_inicio_slot)
            if not hora_rango_slot: continue
            slot_libre_para_mover = True
            ocupacion = horario_ocupado.get((dia_slot, hora_rango_slot))
            if ocupacion:
                if ocupacion["curso_id"] == curso_id: slot_libre_para_mover = False
                if ocupacion["profesor_id"] == profesor_id: slot_libre_para_mover = False
            if slot_libre_para_mover:
                slots_formateados.append({"dia": dia_slot, "hora_inicio": hora_inicio_slot, "hora_rango": hora_rango_slot})
        except ValueError: continue
    return slots_formateados


@app.put("/api/asignaciones/{asignacion_id}", status_code=status.HTTP_200_OK)
def actualizar_asignacion(asignacion_id: str, update_data: AsignacionUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (código sin cambios) ...
     asignacion_db = db.query(AsignacionDB).filter(AsignacionDB.id == asignacion_id).first()
     if not asignacion_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")
     nuevo_dia = update_data.dia
     nueva_hora_rango = update_data.hora_rango
     profesor_id = asignacion_db.profesor_id
     curso_id = asignacion_db.curso_id
     conflicto = db.query(AsignacionDB).filter(
         AsignacionDB.id != asignacion_id, AsignacionDB.dia == nuevo_dia, AsignacionDB.hora_rango == nueva_hora_rango,
         ((AsignacionDB.curso_id == curso_id) | (AsignacionDB.profesor_id == profesor_id))
     ).first()
     if conflicto:
        tipo_conflicto = "curso" if conflicto.curso_id == curso_id else "profesor"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El nuevo horario seleccionado ya está ocupado (conflicto de {tipo_conflicto}).")
     asignacion_db.dia = nuevo_dia
     asignacion_db.hora_rango = nueva_hora_rango
     db.commit()
     return {"mensaje": "Asignación actualizada correctamente"}

# --- Endpoint del Solver Backtracking ---
@app.post("/api/generar-horario-completo", tags=["Solver"])
def generar_horario_completo(request: SolverRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (código sin cambios, incluyendo _is_slot_available y _solve_recursive que deben estar definidos ANTES) ...
    # ... (El código completo del solver va aquí) ...
     db.query(AsignacionDB).filter(AsignacionDB.curso_id == request.curso_id).delete()
     try: db.commit()
     except Exception as e: db.rollback(); raise HTTPException(status_code=500, detail=f"Error al limpiar horario anterior: {e}")
     profesores_db = db.query(ProfesorDB).all()
     profesores_map = {}
     for p in profesores_db:
         try: disponibilidad_set = set(json.loads(p.disponibilidad_json or '[]'))
         except json.JSONDecodeError: disponibilidad_set = set()
         profesores_map[p.id] = {"id": p.id, "nombre": p.nombre, "disponibilidad_set": disponibilidad_set}
     req_ids_solicitados = [asign.requisito_id for asign in request.asignaciones]
     requisitos_db = db.query(RequisitoDB).filter(RequisitoDB.curso_id == request.curso_id, RequisitoDB.id.in_(req_ids_solicitados)).all()
     requisitos_map = {r.id: r for r in requisitos_db}
     requisitos_a_asignar = []
     profesores_solicitados = set()
     for asign_request in request.asignaciones:
         req = requisitos_map.get(asign_request.requisito_id)
         if req and req.curso_id == request.curso_id:
             requisitos_a_asignar.append({"req_id": req.id, "prof_id": asign_request.profesor_id, "horas_necesarias": req.horas_semanales, "materia_id": req.materia_id})
             profesores_solicitados.add(asign_request.profesor_id)
     for prof_id in profesores_solicitados:
         if prof_id not in profesores_map: raise HTTPException(status_code=404, detail=f"Profesor {prof_id} no encontrado.")
     initial_schedule_objects = []
     solution_objects = _solve_recursive(requisitos_a_asignar, profesores_map, request.curso_id, db, initial_schedule_objects)
     if solution_objects:
         new_assignments_db = solution_objects
         try: db.add_all(new_assignments_db); db.commit()
         except Exception as e: db.rollback(); raise HTTPException(status_code=500, detail=f"Error al guardar horario: {e}")
         assigned_count = len(new_assignments_db)
         total_requested_hours = sum(r["horas_necesarias"] for r in requisitos_a_asignar)
         faltantes = total_requested_hours - assigned_count
         if faltantes > 0: return {"mensaje": f"Solución encontrada (DB), incompleta. Faltaron {faltantes} horas.", "faltantes_total": faltantes}
         else: return {"mensaje": "¡Horario completo generado (DB)!","faltantes_total": 0}
     else:
         # No commit needed as nothing was added, rollback happened if delete failed
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se pudo encontrar un horario válido (DB).")


# --- Endpoint de Exportar a Excel ---
@app.get("/api/export/excel")
def crear_excel_api(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (código sin cambios) ...
    wb = openpyxl.Workbook()
    if "Sheet" in wb.sheetnames: wb.remove(wb["Sheet"])
    cursos_db = db.query(CursoDB).order_by(CursoDB.nombre).all()
    asignaciones_db = db.query(AsignacionDB).options(joinedload(AsignacionDB.profesor), joinedload(AsignacionDB.materia)).all()
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
                texto_celda = f"{prof_nombre} ({mat_nombre})"
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