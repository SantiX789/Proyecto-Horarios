# BackEnd/app/main.py (FASE 3 - ALGORITMO INTELIGENTE)

import json
import uuid
from fastapi import FastAPI, Response, Depends, HTTPException, status
from fastapi import BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Set
import openpyxl
from io import BytesIO
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import app.seguridad as seguridad
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import (
    SessionLocal, engine, Base, get_db, crear_tablas,
    ProfesorDB, MateriaDB, CursoDB, AulaDB, RequisitoDB, AsignacionDB, UsuarioDB,
    ConfiguracionDB
)

# --- Configuración Inicial ---
app = FastAPI()
crear_tablas() 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos Pydantic ---
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
    capacidad: int = 30 

class AulaUpdate(BaseModel):
    nombre: str
    tipo: Optional[str] = "Normal"
    capacidad: int = 30

class Materia(BaseModel):
    id: Optional[str] = None
    nombre: str

class Curso(BaseModel):
    id: Optional[str] = None
    anio: str
    division: str
    cantidad_alumnos: int = 30
    nombre_display: Optional[str] = None 

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
    must_change_password: bool = False
    rol: str = "admin"

class UsuarioRegistro(BaseModel):
    username: str
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

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
    anio: str
    division: str
    cantidad_alumnos: int

class MateriaUpdate(BaseModel):
    nombre: str

class ProfesorUpdate(BaseModel):
    nombre: str
    disponibilidad: List[str]

class Preferencias(BaseModel):
     almuerzo_slots: List[str] = []

class BusquedaSuplente(BaseModel):
    dia: str
    hora_inicio: str # Ej: "07:00"     

# --- Funciones Auxiliares ---
def calcular_hora_rango(hora_inicio: str) -> Optional[str]:
    try:
        minutos = int(hora_inicio[3:])
        hora = int(hora_inicio[:2])
        hora_fin_min = (minutos + 40) % 60
        hora_fin_hr = hora + (minutos + 40) // 60
        return f"{hora_inicio} a {hora_fin_hr:02d}:{hora_fin_min:02d}"
    except Exception:
        return None

# --- Dependencias de Autenticación ---
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = seguridad.verificar_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "username": payload.get("sub"), 
        "rol": payload.get("rol", "admin"),
        "force_change_password": payload.get("force_change_password", False)
    }

def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol admin")
    return current_user

def estan_horarios_publicados(db: Session) -> bool:
    config = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "horarios_publicados").first()
    if not config: return False 
    return config.value_json == "true"

# --- LÓGICA DEL SOLVER INTELIGENTE (FASE 3) ---

def _is_prof_and_curso_available(dia: str, hora_rango: str, profesor_id: str, curso_id: str, horario_ocupado: dict) -> bool:
    asignaciones_en_slot = horario_ocupado.get((dia, hora_rango), [])
    for ocupacion in asignaciones_en_slot:
        if ocupacion["curso_id"] == curso_id: return False # Curso ya tiene clase a esa hora
        if ocupacion["profesor_id"] == profesor_id: return False # Profe ocupado
    return True

def _find_available_aula(dia: str, hora_rango: str, tipo_req: str, min_capacidad: int, aulas_disponibles: list, horario_ocupado: dict):
    # Filtramos aulas ocupadas en ese horario
    asignaciones_en_slot = horario_ocupado.get((dia, hora_rango), [])
    aulas_ocupadas_ids = {ocupacion["aula_id"] for ocupacion in asignaciones_en_slot}
    
    for aula in aulas_disponibles:
        # 1. Regla de Ocupación
        if aula["id"] in aulas_ocupadas_ids: continue
        
        # 2. Regla de Tipo (Ej: Si pide Lab, solo Lab. Si pide Normal, prefiere Normal pero podría usar otra si somos flexibles, aquí seremos estrictos)
        if aula["tipo"] != tipo_req: continue
        
        # 3. Regla de Capacidad (FASE 3)
        if aula["capacidad"] < min_capacidad: continue
        
        return aula 
    return None

def _solve_recursive(requisitos_a_asignar, profesores_map, aulas_por_tipo, curso_id, min_capacidad_curso, db, horario_ocupado, current_schedule, almuerzo_slots_set):
    if not requisitos_a_asignar:
        return current_schedule

    # Tomamos el requisito más difícil primero (el que pide más horas o aulas especiales)
    # (Para simplificar, tomamos el primero de la lista, pero podríamos ordenar la lista antes)
    current_req = requisitos_a_asignar[0]
    remaining_reqs = requisitos_a_asignar[1:]

    profesor_id = current_req["prof_id"]
    horas_necesarias = current_req["horas_necesarias"]
    tipo_aula_req = current_req["tipo_aula_requerida"]

    prof_data = profesores_map.get(profesor_id)
    if not prof_data: return None # Profe no existe o sin disponibilidad
    
    available_slots_set = prof_data.get("disponibilidad_set", set())
    
    # Clasificar slots: Preferidos vs No Preferidos (Almuerzo)
    slots_preferidos = []
    slots_no_preferidos = [] # Almuerzos o horarios feos

    for slot_id in available_slots_set:
        if slot_id in almuerzo_slots_set:
            slots_no_preferidos.append(slot_id)
        else:
            slots_preferidos.append(slot_id)
            
    slots_preferidos.sort()
    slots_no_preferidos.sort()
    
    # Obtenemos TODAS las aulas disponibles en el sistema (luego filtraremos por tipo y capacidad dentro de find)
    # Optimización: Solo pasar las aulas que coinciden con el tipo para no iterar de más
    aulas_candidatas = aulas_por_tipo.get(tipo_aula_req, [])

    def _assign_hours_recursive(hours_left, slots_pref, slots_no_pref, schedule):
        if hours_left == 0:
            # Requisito completado, pasamos al siguiente
            return _solve_recursive(remaining_reqs, profesores_map, aulas_por_tipo, curso_id, min_capacidad_curso, db, horario_ocupado, schedule, almuerzo_slots_set)

        if not slots_pref and not slots_no_pref:
            return None # No hay más huecos para este profe
        
        # Intentamos usar slots preferidos primero
        usando_preferido = True
        if slots_pref:
            slot_id = slots_pref[0]
            rem_pref = slots_pref[1:]
            rem_no_pref = slots_no_pref
        else:
            usando_preferido = False
            slot_id = slots_no_pref[0]
            rem_pref = []
            rem_no_pref = slots_no_pref[1:]
            
        try:
            dia, hora_inicio = slot_id.split('-')
            hora_rango = calcular_hora_rango(hora_inicio)
            if not hora_rango: raise ValueError
        except:
             # Slot inválido, saltamos
             return _assign_hours_recursive(hours_left, rem_pref, rem_no_pref, schedule)

        # Verificaciones
        if _is_prof_and_curso_available(dia, hora_rango, profesor_id, curso_id, horario_ocupado):
            
            # FASE 3: Búsqueda de aula con Capacidad y Tipo
            aula_obj = _find_available_aula(dia, hora_rango, tipo_aula_req, min_capacidad_curso, aulas_candidatas, horario_ocupado)
            
            if aula_obj: 
                # Asignar
                new_asignacion = AsignacionDB(
                    id=f"a-{uuid.uuid4()}",
                    curso_id=curso_id,
                    profesor_id=profesor_id,
                    materia_id=current_req["materia_id"],
                    dia=dia,
                    hora_rango=hora_rango,
                    aula_id=aula_obj["id"]
                )
                
                # Marcar ocupado
                horario_ocupado.setdefault((dia, hora_rango), []).append({
                    "curso_id": curso_id, 
                    "profesor_id": profesor_id, 
                    "aula_id": aula_obj["id"]
                })
                
                # Recurso
                res = _assign_hours_recursive(hours_left - 1, rem_pref, rem_no_pref, schedule + [new_asignacion])
                if res: return res
                
                # Backtrack (Deshacer)
                horario_ocupado[(dia, hora_rango)].pop()
                
        # Si no pudimos asignar en este slot, probamos el siguiente (saltamos este slot)
        return _assign_hours_recursive(hours_left, rem_pref, rem_no_pref, schedule)

    # Iniciamos intento de asignar las N horas de esta materia
    return _assign_hours_recursive(horas_necesarias, slots_preferidos, slots_no_preferidos, current_schedule)

def _run_solver_task(request: SolverRequest, username: str):
    print(f"--- [TASK FASE 3] Generando para {request.curso_id} ---")
    db: Session = SessionLocal()
    try:
        # 1. Limpiar horarios anteriores del curso
        db.query(AsignacionDB).filter(AsignacionDB.curso_id == request.curso_id).delete()
        db.commit()
        
        # 2. Datos del Curso (Importante para capacidad)
        curso_db = db.query(CursoDB).filter(CursoDB.id == request.curso_id).first()
        min_capacidad = curso_db.cantidad_alumnos if curso_db else 0
        print(f"   > Alumnos: {min_capacidad}")

        # 3. Cargar Profesores y Disponibilidad
        profesores_db = db.query(ProfesorDB).all()
        profesores_map = {}
        for p in profesores_db:
            try: disp = set(json.loads(p.disponibilidad_json or '[]'))
            except: disp = set()
            profesores_map[p.id] = {"id": p.id, "disponibilidad_set": disp}
            
        # 4. Cargar Aulas (y agruparlas para búsqueda rápida)
        aulas_db = db.query(AulaDB).all()
        aulas_por_tipo: Dict[str, List[Dict]] = {}
        for a in aulas_db:
            aulas_por_tipo.setdefault(a.tipo, []).append({
                "id": a.id, "tipo": a.tipo, "capacidad": a.capacidad
            })
            
        # 5. Cargar Preferencias (Almuerzos)
        config_db = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "preferencias_horarios").first()
        almuerzo_slots = set(json.loads(config_db.value_json).get("almuerzo_slots", [])) if config_db else set()
            
        # 6. Preparar Requisitos
        req_ids = [a.requisito_id for a in request.asignaciones]
        reqs_db = db.query(RequisitoDB).filter(RequisitoDB.curso_id == request.curso_id, RequisitoDB.id.in_(req_ids)).all()
        req_map = {r.id: r for r in reqs_db}
        
        reqs_a_asignar = []
        for ar in request.asignaciones:
            r = req_map.get(ar.requisito_id)
            if r: 
                reqs_a_asignar.append({
                    "req_id": r.id, 
                    "prof_id": ar.profesor_id, 
                    "horas_necesarias": r.horas_semanales, 
                    "materia_id": r.materia_id, 
                    "tipo_aula_requerida": r.tipo_aula_requerida
                })
        
        # Ordenar requisitos: Primero los que piden aulas especiales (ej: Laboratorio), luego Normales
        # Esto ayuda a que no se llenen los slots con materias normales antes de ubicar las difíciles
        reqs_a_asignar.sort(key=lambda x: 0 if x["tipo_aula_requerida"] != "Normal" else 1)

        # 7. Mapa de Ocupación Global (Otros cursos)
        horario_ocupado = {}
        for a in db.query(AsignacionDB).filter(AsignacionDB.curso_id != request.curso_id).all():
            horario_ocupado.setdefault((a.dia, a.hora_rango), []).append({
                "curso_id": a.curso_id, "profesor_id": a.profesor_id, "aula_id": a.aula_id
            })
            
        # 8. EJECUTAR SOLVER
        sol = _solve_recursive(reqs_a_asignar, profesores_map, aulas_por_tipo, request.curso_id, min_capacidad, db, horario_ocupado, [], almuerzo_slots)
        
        if sol:
            db.add_all(sol); db.commit()
            print("--- [TASK] Éxito: Horario Generado ---")
        else:
            print("--- [TASK] Fallo: No se encontró solución ---")
    except Exception as e:
        db.rollback(); print(f"--- [TASK ERROR] {e} ---")
    finally:
        db.close()

# --- Endpoints ---

@app.post("/api/generar-horario-completo", status_code=200)
def generar_horario_completo_sync(req: SolverRequest, user: dict = Depends(get_current_admin_user)):
    """
    Versión Sincrónica corregida.
    """
    # CORRECCIÓN: Aquí pasamos 'req' (que es como llamamos a la variable arriba)
    _run_solver_task(req, user["username"])
    
    return {"mensaje": "Horario generado y guardado exitosamente."}

@app.post("/api/profesores/buscar-suplentes")
def buscar_suplentes(req: BusquedaSuplente, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    """Encuentra profesores libres en un horario específico."""
    
    # 1. Calculamos qué bloque horario es (Ej: "07:00" -> "07:00 a 07:40")
    hora_rango = calcular_hora_rango(req.hora_inicio)
    if not hora_rango:
        raise HTTPException(400, "Hora inválida")
    
    # 2. Armamos el código del slot (Ej: "Lunes-07:00")
    slot_buscado = f"{req.dia}-{req.hora_inicio}"
    
    # 3. Traemos todos los profesores
    profesores = db.query(ProfesorDB).all()
    
    # 4. Buscamos quiénes están ocupados dando clase a esa hora
    ocupados = db.query(AsignacionDB.profesor_id).filter(
        AsignacionDB.dia == req.dia,
        AsignacionDB.hora_rango == hora_rango
    ).all()
    ids_ocupados = {ocup.profesor_id for ocup in ocupados}
    
    disponibles = []
    for p in profesores:
        try:
            disp_set = set(json.loads(p.disponibilidad_json or '[]'))
        except:
            disp_set = set()
            
        # CONDICIÓN A: El profe debe tener disponibilidad (verde)
        if slot_buscado in disp_set:
            # CONDICIÓN B: El profe NO debe estar dando clase en otro lado
            if p.id not in ids_ocupados:
                disponibles.append({"id": p.id, "nombre": p.nombre})
                
    return disponibles

@app.post("/api/auth/change-password")
def cambiar_password(data: PasswordChangeRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_db = db.query(UsuarioDB).filter(UsuarioDB.username == current_user["username"]).first()
    if not user_db: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not seguridad.verificar_password(data.current_password, user_db.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 4 caracteres")
    user_db.hashed_password = seguridad.hashear_password(data.new_password)
    user_db.force_change_password = False 
    db.commit()
    return {"mensaje": "Contraseña actualizada correctamente"}

@app.get("/api/config/publicacion-status")
def get_publicacion_status(db: Session = Depends(get_db)):
    return {"publicado": estan_horarios_publicados(db)}

@app.post("/api/config/publicacion-status")
def set_publicacion_status(publicado: bool, user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    conf = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "horarios_publicados").first()
    if not conf:
        conf = ConfiguracionDB(key="horarios_publicados")
        db.add(conf)
    conf.value_json = "true" if publicado else "false"
    db.commit()
    return {"mensaje": "Estado actualizado", "publicado": publicado}

# --- Preferencias (Almuerzo) ---
@app.post("/api/config/preferencias")
def guardar_preferencias(prefs: Preferencias, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    conf = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "preferencias_horarios").first()
    if not conf:
        conf = ConfiguracionDB(key="preferencias_horarios")
        db.add(conf)
    data = {"almuerzo_slots": prefs.almuerzo_slots}
    conf.value_json = json.dumps(data)
    db.commit()
    return {"mensaje": "Preferencias guardadas"}

@app.get("/api/config/preferencias")
def obtener_preferencias(db: Session = Depends(get_db)):
    conf = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == "preferencias_horarios").first()
    if not conf: return {"almuerzo_slots": []}
    try: return json.loads(conf.value_json)
    except: return {"almuerzo_slots": []}

# --- Login / Register ---
@app.post("/api/register", response_model=Usuario, status_code=201)
def registrar_usuario(u: UsuarioRegistro, db: Session = Depends(get_db)):
    if db.query(UsuarioDB).filter(UsuarioDB.username == u.username).first():
        raise HTTPException(status_code=400, detail="Usuario existe")
    hashed = seguridad.hashear_password(u.password)
    db.add(UsuarioDB(username=u.username, hashed_password=hashed)); db.commit()
    return Usuario(username=u.username)

@app.post("/api/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UsuarioDB).filter(UsuarioDB.username == form.username).first()
    if not user or not seguridad.verificar_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token_data = {"sub": user.username, "rol": user.rol, "force_change_password": user.force_change_password}
    token = seguridad.crear_access_token(token_data)
    return {"access_token": token, "token_type": "bearer", "must_change_password": user.force_change_password, "rol": user.rol}

# --- Horarios (Vista Profe) ---
@app.get("/api/horarios/mi-horario", response_model=List[Dict])
def obtener_mi_horario(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    es_admin = current_user["rol"] == "admin"
    esta_publicado = estan_horarios_publicados(db)
    if not es_admin and not esta_publicado: return []
    username = current_user["username"]
    prof = db.query(ProfesorDB).filter(ProfesorDB.nombre == username).first()
    if not prof: return []
    asignaciones = db.query(AsignacionDB).options(joinedload(AsignacionDB.curso), joinedload(AsignacionDB.materia), joinedload(AsignacionDB.aula)).filter(AsignacionDB.profesor_id == prof.id).all()
    resp = []
    for a in asignaciones:
        resp.append({
            "id": a.id, "dia": a.dia, "hora_rango": a.hora_rango,
            "materia": a.materia.nombre if a.materia else "??",
            "curso": a.curso.nombre_completo if a.curso else "??",
            "aula": a.aula.nombre if a.aula else "Sin Aula",
            "color": "#3498db"
        })
    return resp

# --- CRUD Básico ---
@app.get("/api/profesores", response_model=List[Profesor])
def obtener_profesores(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return [Profesor(id=p.id, nombre=p.nombre, disponibilidad=json.loads(p.disponibilidad_json or '[]')) for p in db.query(ProfesorDB).all()]

@app.post("/api/profesores", response_model=Profesor, status_code=201)
def agregar_profesor(p: Profesor, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    if db.query(ProfesorDB).filter(ProfesorDB.nombre == p.nombre).first(): raise HTTPException(409, "Existe")
    pid = f"p-{uuid.uuid4()}"
    db.add(ProfesorDB(id=pid, nombre=p.nombre, disponibilidad_json=json.dumps(p.disponibilidad)))
    # Crear usuario asociado
    if not db.query(UsuarioDB).filter(UsuarioDB.username == p.nombre).first():
        db.add(UsuarioDB(username=p.nombre, hashed_password=seguridad.hashear_password("1234"), rol="profesor", force_change_password=True))
    db.commit()
    return Profesor(id=pid, nombre=p.nombre, disponibilidad=p.disponibilidad)

@app.delete("/api/profesores/{pid}", status_code=204)
def borrar_profesor(pid: str, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    p = db.query(ProfesorDB).filter(ProfesorDB.id == pid).first()
    if not p: raise HTTPException(404)
    if db.query(AsignacionDB).filter(AsignacionDB.profesor_id == pid).count(): raise HTTPException(409, "Tiene clases")
    u_db = db.query(UsuarioDB).filter(UsuarioDB.username == p.nombre).first()
    db.delete(p)
    if u_db: db.delete(u_db)
    db.commit()
    return Response(status_code=204)

@app.put("/api/profesores/{pid}", response_model=Profesor)
def mod_profesor(pid: str, pup: ProfesorUpdate, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    p = db.query(ProfesorDB).filter(ProfesorDB.id == pid).first()
    if not p: raise HTTPException(404)
    if p.nombre != pup.nombre:
        if db.query(ProfesorDB).filter(ProfesorDB.nombre == pup.nombre).first(): raise HTTPException(409, "Nombre ocupado")
        udb = db.query(UsuarioDB).filter(UsuarioDB.username == p.nombre).first()
        if udb: udb.username = pup.nombre
        p.nombre = pup.nombre
    p.disponibilidad_json = json.dumps(pup.disponibilidad)
    db.commit(); db.refresh(p)
    return Profesor(id=p.id, nombre=p.nombre, disponibilidad=json.loads(p.disponibilidad_json))

@app.get("/api/materias", response_model=List[Materia])
def get_materias(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return [Materia(id=m.id, nombre=m.nombre) for m in db.query(MateriaDB).all()]

@app.delete("/api/admin/reset-horarios", status_code=200)
def reset_assignments(db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    """Elimina TODAS las asignaciones de horarios (limpieza masiva)."""
    db.query(AsignacionDB).delete()
    db.commit()
    return {"mensaje": "Se han eliminado todos los horarios generados."}

@app.post("/api/materias", response_model=Materia)
def add_materia(m: Materia, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    if db.query(MateriaDB).filter(MateriaDB.nombre == m.nombre).first(): raise HTTPException(409)
    nm = MateriaDB(id=f"m-{uuid.uuid4()}", nombre=m.nombre)
    db.add(nm); db.commit(); db.refresh(nm)
    return Materia(id=nm.id, nombre=nm.nombre)

@app.delete("/api/materias/{mid}", status_code=204)
def del_materia(mid: str, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    if db.query(RequisitoDB).filter(RequisitoDB.materia_id == mid).count(): raise HTTPException(409, "En uso")
    db.query(MateriaDB).filter(MateriaDB.id == mid).delete(); db.commit()
    return Response(status_code=204)

@app.get("/api/cursos", response_model=List[Curso])
def get_cursos(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return [Curso(id=c.id, anio=c.anio, division=c.division, cantidad_alumnos=c.cantidad_alumnos, nombre_display=c.nombre_completo) for c in db.query(CursoDB).all()]

@app.post("/api/cursos", response_model=Curso)
def add_curso(c: Curso, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    if db.query(CursoDB).filter(CursoDB.anio == c.anio, CursoDB.division == c.division).first(): raise HTTPException(409)
    nc = CursoDB(id=f"c-{uuid.uuid4()}", anio=c.anio, division=c.division, cantidad_alumnos=c.cantidad_alumnos)
    db.add(nc); db.commit(); db.refresh(nc)
    return Curso(id=nc.id, anio=nc.anio, division=nc.division, cantidad_alumnos=nc.cantidad_alumnos, nombre_display=nc.nombre_completo)

@app.delete("/api/cursos/{cid}", status_code=204)
def del_curso(cid: str, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    db.query(CursoDB).filter(CursoDB.id == cid).delete(); db.commit()
    return Response(status_code=204)

@app.put("/api/cursos/{cid}", response_model=Curso)
def mod_curso(cid: str, cup: CursoUpdate, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    c = db.query(CursoDB).filter(CursoDB.id == cid).first()
    if not c: raise HTTPException(404)
    c.anio = cup.anio; c.division = cup.division; c.cantidad_alumnos = cup.cantidad_alumnos
    db.commit(); db.refresh(c)
    return Curso(id=c.id, anio=c.anio, division=c.division, cantidad_alumnos=c.cantidad_alumnos, nombre_display=c.nombre_completo)

@app.get("/api/aulas", response_model=List[Aula])
def get_aulas(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return [Aula(id=a.id, nombre=a.nombre, tipo=a.tipo, capacidad=a.capacidad) for a in db.query(AulaDB).all()]

@app.post("/api/aulas", response_model=Aula)
def add_aula(a: Aula, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    if db.query(AulaDB).filter(AulaDB.nombre == a.nombre).first(): raise HTTPException(409)
    na = AulaDB(id=f"a-{uuid.uuid4()}", nombre=a.nombre, tipo=a.tipo, capacidad=a.capacidad)
    db.add(na); db.commit(); db.refresh(na)
    return Aula(id=na.id, nombre=na.nombre, tipo=na.tipo, capacidad=na.capacidad)

@app.put("/api/aulas/{aid}", response_model=Aula)
def mod_aula(aid: str, aup: AulaUpdate, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    a = db.query(AulaDB).filter(AulaDB.id == aid).first()
    if not a: raise HTTPException(404)
    a.nombre = aup.nombre; a.tipo = aup.tipo; a.capacidad = aup.capacidad
    db.commit(); db.refresh(a)
    return Aula(id=a.id, nombre=a.nombre, tipo=a.tipo, capacidad=a.capacidad)

@app.delete("/api/aulas/{aid}", status_code=204)
def del_aula(aid: str, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    if db.query(AsignacionDB).filter(AsignacionDB.aula_id == aid).count(): raise HTTPException(409, "En uso")
    db.query(AulaDB).filter(AulaDB.id == aid).delete(); db.commit()
    return Response(status_code=204)

@app.get("/api/requisitos/{cid}", response_model=List[dict])
def get_reqs(cid: str, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    return [{"id": r.id, "curso_id": r.curso_id, "materia_id": r.materia_id, "horas_semanales": r.horas_semanales, "tipo_aula_requerida": r.tipo_aula_requerida, "materia_nombre": r.materia.nombre if r.materia else "??"} for r in db.query(RequisitoDB).options(joinedload(RequisitoDB.materia)).filter(RequisitoDB.curso_id == cid).all()]

@app.post("/api/requisitos", response_model=Requisito)
def add_req(r: Requisito, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    nr = RequisitoDB(id=f"r-{uuid.uuid4()}", curso_id=r.curso_id, materia_id=r.materia_id, horas_semanales=r.horas_semanales, tipo_aula_requerida=r.tipo_aula_requerida)
    db.add(nr); db.commit(); db.refresh(nr)
    return Requisito(id=nr.id, curso_id=nr.curso_id, materia_id=nr.materia_id, horas_semanales=nr.horas_semanales, tipo_aula_requerida=nr.tipo_aula_requerida)

@app.get("/api/horarios/{cid}", response_model=Dict[str, Dict[str, dict]])
def get_horario_curso(cid: str, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    asigs = db.query(AsignacionDB).options(joinedload(AsignacionDB.profesor), joinedload(AsignacionDB.materia), joinedload(AsignacionDB.aula)).filter(AsignacionDB.curso_id == cid).all()
    vista = {}
    for a in asigs:
        vista.setdefault(a.hora_rango, {})[a.dia] = {"text": f"{a.profesor.nombre if a.profesor else '??'} ({a.materia.nombre if a.materia else '??'})", "id": a.id, "aula_nombre": a.aula.nombre if a.aula else "Sin Aula"}
    return vista

@app.delete("/api/horarios/{cid}", status_code=200)
def del_horario_curso(cid: str, db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    db.query(AsignacionDB).filter(AsignacionDB.curso_id == cid).delete()
    db.commit()
    return {"mensaje": "Horarios borrados"}

@app.get("/api/reportes/carga-horaria-profesor", response_model=List[ReporteCargaHoraria])
def reporte_carga(db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    res = db.query(ProfesorDB.nombre, func.count(AsignacionDB.id).label("cnt")).join(AsignacionDB, ProfesorDB.id == AsignacionDB.profesor_id, isouter=True).group_by(ProfesorDB.nombre).order_by(func.count(AsignacionDB.id).desc()).all()
    return [ReporteCargaHoraria(nombre_profesor=n, horas_asignadas=c) for n, c in res]

@app.get("/api/export/excel")
def export_excel(db: Session = Depends(get_db), u=Depends(get_current_admin_user)):
    wb = openpyxl.Workbook(); 
    if "Sheet" in wb.sheetnames: wb.remove(wb["Sheet"])
    cursos = db.query(CursoDB).all()
    asigs = db.query(AsignacionDB).options(joinedload(AsignacionDB.profesor), joinedload(AsignacionDB.materia), joinedload(AsignacionDB.aula)).all()
    horarios = ["07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40", "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20", "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00", "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40", "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"]
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    
    for c in cursos:
        ws = wb.create_sheet(f"{c.nombre_completo}"[:30])
        ws.append(['Hora'] + dias)
        for cell in ws[1]: cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF"); cell.fill = openpyxl.styles.PatternFill("solid", fgColor="1D72B8")
        vista = {}
        for a in asigs:
            if a.curso_id == c.id:
                prof = a.profesor.nombre if a.profesor else "??"
                mat = a.materia.nombre if a.materia else "??"
                aula = f"\n[{a.aula.nombre}]" if a.aula else ""
                vista.setdefault(a.hora_rango, {})[a.dia] = f"{prof} ({mat}){aula}"
        for h in horarios:
            ws.append([h] + [vista.get(h, {}).get(d, "") for d in dias])
        ws.column_dimensions['A'].width = 15
        for col in ['B','C','D','E','F']: ws.column_dimensions[col].width = 25
        
    buf = BytesIO(); wb.save(buf); buf.seek(0)
    return Response(content=buf.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=Horarios.xlsx"})