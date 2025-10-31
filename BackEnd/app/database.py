# BackEnd/app/database.py

from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Table, Text # Import Text for JSON-like storage
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from sqlalchemy.dialects.sqlite import JSON # Import JSON type specifically for SQLite if needed, or use Text

# --- Configuración de la Base de Datos ---
DATABASE_URL = "sqlite:///./horarios.db" # Nombre del archivo de la base de datos

# El "motor" de la base de datos
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} # Necesario para SQLite con FastAPI
)

# Creador de sesiones (para interactuar con la DB)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para nuestros modelos (tablas)
Base = declarative_base()

# --- Modelos SQLAlchemy (Tablas) ---

# Tabla de asociación para la disponibilidad (muchos a muchos implícita, pero la guardaremos como JSON/Text)
# SQLAlchemy no maneja bien listas simples directamente en columnas estándar.
# Usaremos Text y serializaremos/deserializaremos JSON.

class ProfesorDB(Base):
    __tablename__ = "profesores"
    id = Column(String, primary_key=True, index=True) # Usaremos los UUIDs como strings
    nombre = Column(String, index=True)
    # Guardaremos la lista de disponibilidad como un string JSON
    disponibilidad_json = Column(Text, default='[]') 

    # Relación (inversa): Qué asignaciones tiene este profesor
    asignaciones = relationship("AsignacionDB", back_populates="profesor")

class MateriaDB(Base):
    __tablename__ = "materias"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) # Nombre único

    # Relación (inversa): En qué requisitos aparece esta materia
    requisitos = relationship("RequisitoDB", back_populates="materia")
    # Relación (inversa): En qué asignaciones generadas aparece esta materia
    asignaciones = relationship("AsignacionDB", back_populates="materia")


class CursoDB(Base):
    __tablename__ = "cursos"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) # Nombre único

    # Relación (inversa): Qué requisitos tiene este curso
    requisitos = relationship("RequisitoDB", back_populates="curso")
    # Relación (inversa): Qué asignaciones generadas tiene este curso
    asignaciones = relationship("AsignacionDB", back_populates="curso")

# ... (en BackEnd/app/database.py)
# ... (después de la clase CursoDB)

class AulaDB(Base):
    __tablename__ = "aulas"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) # ej: "Aula 101", "Laboratorio"
    tipo = Column(String, index=True, default="Normal") # ej: "Normal", "Laboratorio", "Gimnasio"

    # Relación (inversa): Qué asignaciones tiene esta aula
    asignaciones = relationship("AsignacionDB", back_populates="aula")

class RequisitoDB(Base):
    __tablename__ = "requisitos_curso"
    id = Column(String, primary_key=True, index=True)
    horas_semanales = Column(Integer)

    # Claves foráneas y relaciones (muchos a uno)
    curso_id = Column(String, ForeignKey("cursos.id"))
    materia_id = Column(String, ForeignKey("materias.id"))

    # --- ¡ESTA LÍNEA FALTABA! ---
    tipo_aula_requerida = Column(String, default="Normal") 

    curso = relationship("CursoDB", back_populates="requisitos")
    materia = relationship("MateriaDB", back_populates="requisitos")

class AsignacionDB(Base):
 __tablename__ = "horarios_generados"
 id = Column(String, primary_key=True, index=True)
 dia = Column(String)
 hora_rango = Column(String)

 # Claves foráneas y relaciones (muchos a uno)
 curso_id = Column(String, ForeignKey("cursos.id"))
 materia_id = Column(String, ForeignKey("materias.id"))
 profesor_id = Column(String, ForeignKey("profesores.id"))

 curso = relationship("CursoDB", back_populates="asignaciones")
 materia = relationship("MateriaDB", back_populates="asignaciones")
 profesor = relationship("ProfesorDB", back_populates="asignaciones")
 aula = relationship("AulaDB", back_populates="asignaciones") # <-- ¡LÍNEA AÑADIDA!

class UsuarioDB(Base):
    __tablename__ = "usuarios"
    username = Column(String, primary_key=True, index=True) # Usamos username como ID
    hashed_password = Column(String)


# --- Función para Crear las Tablas ---
def crear_tablas():
    Base.metadata.create_all(bind=engine)

# --- Función para obtener una sesión de DB (Dependencia para FastAPI) ---
def get_db():
    db = SessionLocal()
    try:
        yield db # Proporciona la sesión al endpoint
    finally:
        db.close() # Cierra la sesión al terminar