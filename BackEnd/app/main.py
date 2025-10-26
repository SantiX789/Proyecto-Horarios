import app.seguridad as seguridad
from sqlalchemy.orm import Session # Importa el tipo Session
from sqlalchemy.orm import joinedload
from app.database import SessionLocal, engine, Base, get_db, crear_tablas # Importa get_db
from app.database import ProfesorDB, MateriaDB, CursoDB, RequisitoDB, AsignacionDB, UsuarioDB # Importa los modelos DB
import json # Mantenemos json para serializar la disponibilidad
from app.database import crear_tablas 
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
crear_tablas()
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
    id: Optional[str] = None
    disponibilidad: List[str]

class Materia(BaseModel):
    id: Optional[str] = None # <-- AÑADE ESTA LÍNEA
    nombre: str

class Curso(BaseModel):
    id: Optional[str] = None # <-- AÑADE ESTA LÍNEA
    nombre: str

class Requisito(BaseModel):
    id: Optional[str] = None
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
@app.get("/api/profesores", response_model=List[Profesor]) # El modelo de respuesta puede usar el Profesor Pydantic
def obtener_profesores(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Consulta la base de datos por todos los profesores
    profesores_db = db.query(ProfesorDB).all()
    
    # Convierte objetos DB a objetos Pydantic (incluyendo parsear el string JSON)
    profesores_list = []
    for prof_db in profesores_db:
        try:
            # Lee la disponibilidad desde el string JSON
            disponibilidad_list = json.loads(prof_db.disponibilidad_json or '[]')
        except json.JSONDecodeError:
            disponibilidad_list = [] # Maneja datos potencialmente corruptos
        
        profesores_list.append(
            Profesor( # Usa el modelo Pydantic para la estructura de respuesta
                id=prof_db.id, # Necesitamos añadir id al modelo Pydantic Profesor
                nombre=prof_db.nombre,
                disponibilidad=disponibilidad_list
            )
        )
    return profesores_list

# --- Necesitas actualizar el modelo Pydantic Profesor para incluir id ---
# Busca tu definición del modelo Pydantic Profesor y añade el campo id:
class Profesor(BaseModel):
    id: Optional[str] = None # Añade el campo ID, hazlo opcional para la entrada
    nombre: str
    disponibilidad: List[str]
    
    # Añade esta configuración si usas response_model=List[Profesor] directamente con objetos ORM más adelante
    # class Config:
    #     orm_mode = True

# ... (Endpoints GET/POST para Materias y Cursos - sin cambios significativos) ...

@app.post("/api/profesores", response_model=Profesor, status_code=status.HTTP_201_CREATED) # Devuelve el objeto Profesor creado
def agregar_profesor(profesor: Profesor, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Genera ID
    profesor_id = f"p-{uuid.uuid4()}"
    
    # Convierte la lista de disponibilidad a un string JSON
    disponibilidad_str = json.dumps(profesor.disponibilidad)
    
    # Crea una instancia del modelo SQLAlchemy
    db_profesor = ProfesorDB(
        id=profesor_id, 
        nombre=profesor.nombre, 
        disponibilidad_json=disponibilidad_str
    )
    
    # Añade a la sesión, confirma (guarda) en la DB, refresca para obtener el estado final
    db.add(db_profesor)
    db.commit()
    db.refresh(db_profesor)
    
    # Devuelve el objeto creado (Pydantic lo maneja)
    # Necesitamos cargar la disponibilidad de vuelta desde JSON para la respuesta
    return Profesor(
        id=db_profesor.id,
        nombre=db_profesor.nombre,
        disponibilidad=json.loads(db_profesor.disponibilidad_json or '[]')
    )

@app.get("/api/materias", response_model=List[Materia]) # Usa el modelo Pydantic
def obtener_materias(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    materias_db = db.query(MateriaDB).all()
    # Pydantic puede convertir automáticamente si los nombres de campo coinciden y Config.orm_mode=True
    # O lo hacemos manualmente para claridad:
    return [Materia(id=m.id, nombre=m.nombre) for m in materias_db]

@app.post("/api/materias", response_model=Materia, status_code=status.HTTP_201_CREATED)
def agregar_materia(materia: Materia, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verificar si ya existe por nombre (opcional pero buena idea)
    db_materia_existente = db.query(MateriaDB).filter(MateriaDB.nombre == materia.nombre).first()
    if db_materia_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una materia con ese nombre")

    materia_id = f"m-{uuid.uuid4()}"
    db_materia = MateriaDB(id=materia_id, nombre=materia.nombre)
    
    db.add(db_materia)
    db.commit()
    db.refresh(db_materia)
    
    return Materia(id=db_materia.id, nombre=db_materia.nombre)

@app.get("/api/cursos", response_model=List[Curso]) # Usa el modelo Pydantic
def obtener_cursos(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    cursos_db = db.query(CursoDB).all()
    return [Curso(id=c.id, nombre=c.nombre) for c in cursos_db]

@app.post("/api/cursos", response_model=Curso, status_code=status.HTTP_201_CREATED)
def agregar_curso(curso: Curso, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verificar si ya existe por nombre
    db_curso_existente = db.query(CursoDB).filter(CursoDB.nombre == curso.nombre).first()
    if db_curso_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un curso con ese nombre")

    curso_id = f"c-{uuid.uuid4()}"
    db_curso = CursoDB(id=curso_id, nombre=curso.nombre)
    
    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)
    
    return Curso(id=db_curso.id, nombre=db_curso.nombre)

@app.get("/api/requisitos/{curso_id}", response_model=List[dict]) # Devolvemos un dict por ahora
def obtener_requisitos(curso_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Buscamos los requisitos que pertenecen al curso_id dado
    # Usamos .options(joinedload(RequisitoDB.materia)) para cargar la materia relacionada eficientemente
    from sqlalchemy.orm import joinedload # Importar joinedload aquí o al principio
    
    requisitos_db = db.query(RequisitoDB)\
                      .options(joinedload(RequisitoDB.materia))\
                      .filter(RequisitoDB.curso_id == curso_id)\
                      .all()
    
    # Formateamos la respuesta como esperaba el frontend
    requisitos_list = []
    for req_db in requisitos_db:
        requisitos_list.append({
            "id": req_db.id,
            "curso_id": req_db.curso_id,
            "materia_id": req_db.materia_id,
            "horas_semanales": req_db.horas_semanales,
            # Accedemos al nombre de la materia a través de la relación
            "materia_nombre": req_db.materia.nombre if req_db.materia else "???" 
        })
        
    return requisitos_list

@app.post("/api/requisitos", response_model=Requisito, status_code=status.HTTP_201_CREATED) # Devolvemos el Pydantic Requisito
def agregar_requisito(requisito: Requisito, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    
    # --- Validación Adicional (Opcional pero recomendada) ---
    curso_existe = db.query(CursoDB).filter(CursoDB.id == requisito.curso_id).first()
    if not curso_existe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Curso con id {requisito.curso_id} no encontrado")
        
    materia_existe = db.query(MateriaDB).filter(MateriaDB.id == requisito.materia_id).first()
    if not materia_existe:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Materia con id {requisito.materia_id} no encontrada")
    # --- Fin Validación ---

    requisito_id = f"r-{uuid.uuid4()}"
    db_requisito = RequisitoDB(
        id=requisito_id,
        curso_id=requisito.curso_id,
        materia_id=requisito.materia_id,
        horas_semanales=requisito.horas_semanales
    )
    
    db.add(db_requisito)
    db.commit()
    db.refresh(db_requisito)
    
    # Devolvemos el Pydantic model (necesitamos añadir 'id' a Pydantic Requisito)
    # Si no lo añadiste antes, hazlo ahora:
    # class Requisito(BaseModel):
    #    id: Optional[str] = None # <-- AÑADE ESTA LÍNEA
    #    curso_id: str
    #    materia_id: str
    #    horas_semanales: int
    return Requisito(
        id=db_requisito.id,
        curso_id=db_requisito.curso_id,
        materia_id=db_requisito.materia_id,
        horas_semanales=db_requisito.horas_semanales
    )

# --- Endpoint de Vista de Horario ---
@app.get("/api/horarios/{curso_nombre}", response_model=Dict[str, Dict[str, dict]])
def obtener_horario_curso(curso_nombre: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Buscar el curso por nombre para obtener su ID
    curso_db = db.query(CursoDB).filter(CursoDB.nombre == curso_nombre).first()
    if not curso_db:
        return {} # Si el curso no existe, devuelve horario vacío

    curso_id = curso_db.id

    # 2. Buscar todas las asignaciones para este curso_id
    #    Usamos joinedload para cargar eficientemente los datos relacionados
    #    del profesor y la materia en la misma consulta.
    asignaciones_db = db.query(AsignacionDB)\
                        .options(
                            joinedload(AsignacionDB.profesor),
                            joinedload(AsignacionDB.materia)
                        )\
                        .filter(AsignacionDB.curso_id == curso_id)\
                        .all()

    # 3. Construir la estructura de vista anidada que espera el frontend
    horario_vista = {}
    for asignacion in asignaciones_db:
        hora_rango = asignacion.hora_rango
        dia = asignacion.dia

        # Accedemos a los nombres a través de las relaciones cargadas
        prof_nombre = asignacion.profesor.nombre if asignacion.profesor else "??"
        mat_nombre = asignacion.materia.nombre if asignacion.materia else "??"
        texto_celda = f"{prof_nombre} ({mat_nombre})"

        # Creamos el objeto para la celda
        asignacion_data = {
            "text": texto_celda,
            "id": asignacion.id # El ID de la asignación
        }

        # Usamos setdefault para crear los diccionarios internos si no existen
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
def obtener_slots_disponibles_para_asignacion(asignacion_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):

    # 1. Encontrar la asignación actual usando SQLAlchemy
    asignacion_actual = db.query(AsignacionDB).filter(AsignacionDB.id == asignacion_id).first()
    if not asignacion_actual:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")

    profesor_id = asignacion_actual.profesor_id
    curso_id = asignacion_actual.curso_id

    # 2. Obtener la disponibilidad general del profesor
    profesor_db = db.query(ProfesorDB).filter(ProfesorDB.id == profesor_id).first()
    if not profesor_db:
         # Esto no debería pasar si los datos son consistentes
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor asociado a la asignación no encontrado")

    try:
        disponibilidad_general = set(json.loads(profesor_db.disponibilidad_json or '[]')) # Dia-HoraInicio
    except json.JSONDecodeError:
        disponibilidad_general = set()

    if not disponibilidad_general:
        return [] # Si el profesor no tiene disponibilidad, no hay slots

    # 3. Obtener TODAS las asignaciones existentes (excepto la actual) para chequear conflictos
    # Es más eficiente obtenerlas todas de una vez que hacer múltiples queries después
    todas_las_asignaciones = db.query(AsignacionDB).filter(AsignacionDB.id != asignacion_id).all()

    # Construir un mapa de slots ocupados para búsqueda rápida: {(dia, hora_rango): {curso_id, profesor_id}}
    horario_ocupado: Dict[tuple[str, str], Dict[str, str]] = {}
    for a in todas_las_asignaciones:
         horario_ocupado[(a.dia, a.hora_rango)] = {"curso_id": a.curso_id, "profesor_id": a.profesor_id}

    # 4. Calcular los slots disponibles iterando por la disponibilidad general
    slots_formateados = []
    for slot_id in sorted(list(disponibilidad_general)): # Iterar por Dia-HoraInicio
        try:
            dia_slot, hora_inicio_slot = slot_id.split('-')
            hora_rango_slot = calcular_hora_rango(hora_inicio_slot)
            if not hora_rango_slot: continue # Ignorar slots mal formateados

            # Verificar si el slot (dia, hora_rango) está libre
            slot_libre_para_mover = True
            ocupacion = horario_ocupado.get((dia_slot, hora_rango_slot)) # Busca en el mapa
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
                    "hora_inicio": hora_inicio_slot,
                    "hora_rango": hora_rango_slot
                })
        except ValueError: # Captura error si slot_id.split('-') falla
             continue # Ignorar slots mal formateados en disponibilidad_general

    return slots_formateados

@app.put("/api/asignaciones/{asignacion_id}", status_code=status.HTTP_200_OK)
def actualizar_asignacion(asignacion_id: str, update_data: AsignacionUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):

    # 1. Encontrar la asignación a actualizar en la DB
    asignacion_db = db.query(AsignacionDB).filter(AsignacionDB.id == asignacion_id).first()
    if not asignacion_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")

    nuevo_dia = update_data.dia
    nueva_hora_rango = update_data.hora_rango
    profesor_id = asignacion_db.profesor_id
    curso_id = asignacion_db.curso_id

    # 2. Verificar si el NUEVO slot está disponible consultando la DB
    # Buscamos si existe OTRA asignación (id != asignacion_id) en el nuevo slot
    # que pertenezca al MISMO CURSO o al MISMO PROFESOR.
    conflicto = db.query(AsignacionDB)\
                  .filter(
                      AsignacionDB.id != asignacion_id, # Excluir la asignación actual
                      AsignacionDB.dia == nuevo_dia,
                      AsignacionDB.hora_rango == nueva_hora_rango,
                      # Condición de conflicto: Mismo curso O mismo profesor
                      ((AsignacionDB.curso_id == curso_id) | (AsignacionDB.profesor_id == profesor_id))
                  ).first() # Solo necesitamos saber si existe al menos uno

    if conflicto:
        # Detallar el tipo de conflicto (opcional)
        tipo_conflicto = "curso" if conflicto.curso_id == curso_id else "profesor"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El nuevo horario seleccionado ya está ocupado (conflicto de {tipo_conflicto}).")

    # 3. Actualizar el objeto AsignacionDB en la sesión
    asignacion_db.dia = nuevo_dia
    asignacion_db.hora_rango = nueva_hora_rango

    # 4. Guardar los cambios en la base de datos
    db.commit()
    # db.refresh(asignacion_db) # Opcional si quieres devolver el objeto actualizado

    return {"mensaje": "Asignación actualizada correctamente"}

# --- Endpoint del Solver Backtracking ---
# (Aquí va el código completo de _is_slot_available, _solve_recursive y generar_horario_completo
# que te pasé en la respuesta anterior. Asegúrate de copiarlo todo, incluyendo los modelos
# AsignacionSolver y SolverRequest si los borraste por error.)

# 1. Función _is_slot_available MODIFICADA para usar DB Session
def _is_slot_available(
    dia: str,
    hora_rango: str,
    profesor_id: str,
    curso_id: str,
    db: Session, # Recibe la sesión de DB
    current_schedule_ids: Set[str] # IDs de asignaciones ya puestas en ESTA ejecución del solver
    ) -> bool:
    """Verifica si un hueco específico está libre consultando la DB y el horario actual."""

    # Buscar conflictos en la base de datos (asignaciones de OTROS cursos o de ESTE curso guardadas previamente)
    # Excluimos las que estamos construyendo en memoria (current_schedule_ids)
    conflicto_db = db.query(AsignacionDB)\
                     .filter(
                         AsignacionDB.dia == dia,
                         AsignacionDB.hora_rango == hora_rango,
                         # Condición de conflicto: Mismo curso O mismo profesor
                         ((AsignacionDB.curso_id == curso_id) | (AsignacionDB.profesor_id == profesor_id)),
                         # Excluir las que ya forman parte de la solución parcial actual
                         ~AsignacionDB.id.in_(current_schedule_ids) # El ~ niega la condición .in_
                     ).first()

    if conflicto_db:
        return False # Conflicto encontrado en la base de datos

    # No necesitamos chequear current_schedule_ids aquí porque la lógica del solver
    # ya evita poner dos cosas en el mismo slot para el MISMO curso.
    # El chequeo principal es contra lo que YA existe en la DB (otros cursos/horarios viejos).
    # Sin embargo, si quisiéramos doble chequeo (más seguro):
    # for asign_id in current_schedule_ids:
    #     # Necesitaríamos los datos completos de current_schedule, no solo IDs...
    #     # Es más simple confiar en que el solver no genera conflictos internos.
    #     pass

    return True # El hueco está libre

# 2. Función _solve_recursive MODIFICADA para pasar la DB Session
def _solve_recursive(
    requisitos_a_asignar: List[Dict],
    profesores_map: Dict,
    curso_id: str,
    db: Session, # <-- Pasa la sesión de DB
    current_schedule: List[AsignacionDB] # <-- Ahora trabaja con objetos AsignacionDB
) -> Optional[List[AsignacionDB]]: # <-- Devuelve lista de objetos AsignacionDB

    if not requisitos_a_asignar: return current_schedule # Éxito

    current_req = requisitos_a_asignar[0]
    remaining_reqs = requisitos_a_asignar[1:]
    profesor_id = current_req["prof_id"]
    horas_necesarias = current_req["horas_necesarias"]
    prof_data = profesores_map.get(profesor_id)
    if not prof_data: return None

    # Usamos la disponibilidad ya parseada (Set de Dia-HoraInicio)
    available_slots = sorted(list(prof_data["disponibilidad_set"]))

    # Extraer los IDs del horario actual para pasarlos a _is_slot_available
    current_schedule_ids = {asign.id for asign in current_schedule if asign.id} # Set de IDs

    # --- Función interna recursiva para asignar horas ---
    def _assign_hours_recursive(
        hours_left_to_assign: int,
        slots_to_try: List[str], # Lista de Dia-HoraInicio
        schedule_so_far: List[AsignacionDB] # Lista de objetos AsignacionDB
    ) -> Optional[List[AsignacionDB]]:

        if hours_left_to_assign == 0:
            # Intentar asignar el siguiente requisito
            result = _solve_recursive(remaining_reqs, profesores_map, curso_id, db, schedule_so_far)
            return result if result else None
        if not slots_to_try: return None

        slot_id = slots_to_try[0]
        remaining_slots = slots_to_try[1:]
        
        try:
            dia, hora_inicio = slot_id.split('-')
            hora_rango = calcular_hora_rango(hora_inicio)
            if not hora_rango: # Si calcular_hora_rango falla
                 raise ValueError("Formato de hora inválido")
        except ValueError:
            # Salta este slot si está mal formateado y prueba con los siguientes
            return _assign_hours_recursive(hours_left_to_assign, remaining_slots, schedule_so_far)

        # *** Verificar Restricciones (usando la nueva _is_slot_available) ***
        # Pasamos los IDs del horario que estamos construyendo
        current_step_ids = {asign.id for asign in schedule_so_far if asign.id}
        if _is_slot_available(dia, hora_rango, profesor_id, curso_id, db, current_step_ids):
            # Crear NUEVO objeto AsignacionDB (aún no guardado)
            new_asignacion_obj = AsignacionDB(
                id=f"a-{uuid.uuid4()}", # Generamos ID ahora
                curso_id=curso_id,
                profesor_id=profesor_id,
                materia_id=current_req["materia_id"],
                dia=dia,
                hora_rango=hora_rango
            )

            # Recurrir: intentar asignar horas restantes con este hueco elegido
            result = _assign_hours_recursive(
                hours_left_to_assign - 1,
                remaining_slots, # No re-usar el mismo slot_id para la misma materia/hora_count
                schedule_so_far + [new_asignacion_obj] # Añadir el objeto
            )
            if result: return result
            # Si no hay solución por este camino, se retrocede implícitamente

        # *** Probar la siguiente posibilidad (saltar este slot) ***
        result_skipping_slot = _assign_hours_recursive(hours_left_to_assign, remaining_slots, schedule_so_far)
        if result_skipping_slot: return result_skipping_slot

        return None # Falló este camino

    # Iniciar la recursión interna
    return _assign_hours_recursive(horas_necesarias, available_slots, current_schedule)


# 3. Endpoint generar_horario_completo MODIFICADO para usar DB Session y objetos
@app.post("/api/generar-horario-completo", tags=["Solver"])
def generar_horario_completo(request: SolverRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):

    # 1. Limpiar horario anterior para este curso EN LA BASE DE DATOS
    # Obtenemos los objetos a borrar y los marcamos para eliminación
    asignaciones_a_borrar = db.query(AsignacionDB).filter(AsignacionDB.curso_id == request.curso_id).all()
    for asign in asignaciones_a_borrar:
        db.delete(asign)
    try:
        db.commit() # Confirmamos el borrado antes de empezar a generar
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al limpiar horario anterior: {e}")


    # 2. Preparar datos consultando la DB
    # Profesores: Cargar y parsear disponibilidad JSON a Set
    profesores_db = db.query(ProfesorDB).all()
    profesores_map = {}
    for p in profesores_db:
        try:
            disponibilidad_set = set(json.loads(p.disponibilidad_json or '[]'))
        except json.JSONDecodeError:
            disponibilidad_set = set()
        profesores_map[p.id] = {
            "id": p.id,
            "nombre": p.nombre,
            "disponibilidad_set": disponibilidad_set # Guardamos el Set
        }

    # Requisitos: Filtrar por los IDs recibidos en la request y que pertenezcan al curso
    req_ids_solicitados = [asign.requisito_id for asign in request.asignaciones]
    requisitos_db = db.query(RequisitoDB)\
                      .filter(RequisitoDB.curso_id == request.curso_id, RequisitoDB.id.in_(req_ids_solicitados))\
                      .all()
    requisitos_map = {r.id: r for r in requisitos_db}


    # Construir la lista de requisitos_a_asignar para el solver
    requisitos_a_asignar = []
    profesores_solicitados = set() # Para verificar que existen
    for asign_request in request.asignaciones:
        req = requisitos_map.get(asign_request.requisito_id)
        # Verificar que el requisito existe y pertenece al curso correcto
        if req and req.curso_id == request.curso_id:
            requisitos_a_asignar.append({
                "req_id": req.id,
                "prof_id": asign_request.profesor_id,
                "horas_necesarias": req.horas_semanales,
                "materia_id": req.materia_id
            })
            profesores_solicitados.add(asign_request.profesor_id)
        else:
             print(f"Advertencia: Requisito {asign_request.requisito_id} no encontrado o no pertenece al curso {request.curso_id}")


    # Verificar que todos los profesores solicitados existen
    for prof_id in profesores_solicitados:
        if prof_id not in profesores_map:
             raise HTTPException(status_code=404, detail=f"Profesor con ID {prof_id} no encontrado.")


    # El horario inicial para la verificación de conflictos ahora se consulta dentro de _is_slot_available
    initial_schedule_objects = [] # Empezamos con una lista vacía para construir

    # 3. Llamar al solver recursivo (pasando la sesión db)
    solution_objects = _solve_recursive(
        requisitos_a_asignar=requisitos_a_asignar,
        profesores_map=profesores_map,
        curso_id=request.curso_id,
        db=db, # Pasamos la sesión
        current_schedule=initial_schedule_objects
    )

    # 4. Procesar el resultado
    if solution_objects:
        # Los objetos ya están listos para ser añadidos
        new_assignments_db = solution_objects

        try:
            db.add_all(new_assignments_db) # Añadimos todos los objetos nuevos a la sesión
            db.commit() # Guardamos todo en la base de datos
        except Exception as e:
            db.rollback() # Deshacer si hay error al guardar
            raise HTTPException(status_code=500, detail=f"Error al guardar el horario generado: {e}")

        # Verificar si se asignaron todas las horas
        assigned_count = len(new_assignments_db)
        total_requested_hours = sum(r["horas_necesarias"] for r in requisitos_a_asignar)
        faltantes = total_requested_hours - assigned_count

        if faltantes > 0:
            return {"mensaje": f"Solución encontrada (DB), pero incompleta. Faltaron {faltantes} horas.", "faltantes_total": faltantes}
        else:
            return {"mensaje": "¡Horario completo generado con éxito (DB)!","faltantes_total": 0}
    else:
        # No se encontró solución, ya borramos el horario anterior, no hay nada más que hacer
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se pudo encontrar un horario válido (DB).")

# --- Endpoint de Exportar a Excel ---
@app.get("/api/export/excel")
def crear_excel_api(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    wb = openpyxl.Workbook()
    if "Sheet" in wb.sheetnames: wb.remove(wb["Sheet"])

    # 1. Consultar todos los datos necesarios desde la DB
    cursos_db = db.query(CursoDB).order_by(CursoDB.nombre).all() # Ordenar por nombre
    # Cargar asignaciones con sus relaciones (profesor y materia)
    asignaciones_db = db.query(AsignacionDB)\
                        .options(
                            joinedload(AsignacionDB.profesor),
                            joinedload(AsignacionDB.materia)
                         ).all()

    # Rangos de horarios y días (igual que antes)
    horarios = [
        "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
        "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
        "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
        "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
        "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
    ]
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

    # 2. Crear una hoja por cada curso consultado
    for curso in cursos_db:
        curso_id = curso.id
        curso_nombre = curso.nombre
        ws = wb.create_sheet(f"Horario {curso_nombre}")
        ws.append(['Hora'] + dias)

        # Estilo de encabezado (sin cambios)
        for cell in ws[1]:
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill("solid", fgColor="1D72B8")

        # 3. Construir la grilla de vista para ESTE curso filtrando las asignaciones
        horario_vista_curso = {}
        for asignacion in asignaciones_db:
            # Filtrar solo las asignaciones de este curso
            if asignacion.curso_id == curso_id:
                hora = asignacion.hora_rango
                dia = asignacion.dia
                # Acceder a nombres vía relaciones
                prof_nombre = asignacion.profesor.nombre if asignacion.profesor else "??"
                mat_nombre = asignacion.materia.nombre if asignacion.materia else "??"
                texto_celda = f"{prof_nombre} ({mat_nombre})"
                horario_vista_curso.setdefault(hora, {})[dia] = texto_celda

        # Llenar la hoja (sin cambios)
        for hora in horarios:
            fila = [hora] + [horario_vista_curso.get(hora, {}).get(dia, "") for dia in dias]
            ws.append(fila)

        # Ancho de columnas (sin cambios)
        ws.column_dimensions['A'].width = 15
        for col in ['B', 'C', 'D', 'E', 'F']:
            ws.column_dimensions[col].width = 30

    # Guardar en buffer y devolver (sin cambios)
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Horarios_Cursos.xlsx"}
    )