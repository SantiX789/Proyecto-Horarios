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

class ProfesorDB(Base):
    __tablename__ = "profesores"
    id = Column(String, primary_key=True, index=True) # Usaremos los UUIDs como strings
    nombre = Column(String, unique=True, index=True) # <-- AÑADIDO: unique=True
    disponibilidad_json = Column(Text, default='[]') 
    asignaciones = relationship("AsignacionDB", back_populates="profesor")

class MateriaDB(Base):
    __tablename__ = "materias"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) 
    requisitos = relationship("RequisitoDB", back_populates="materia")
    asignaciones = relationship("AsignacionDB", back_populates="materia")


class CursoDB(Base):
    __tablename__ = "cursos"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) 
    requisitos = relationship("RequisitoDB", back_populates="curso")
    asignaciones = relationship("AsignacionDB", back_populates="curso")

class AulaDB(Base):
    __tablename__ = "aulas"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) 
    tipo = Column(String, index=True, default="Normal") 
    asignaciones = relationship("AsignacionDB", back_populates="aula")

class RequisitoDB(Base):
    __tablename__ = "requisitos_curso"
    id = Column(String, primary_key=True, index=True)
    horas_semanales = Column(Integer)
    curso_id = Column(String, ForeignKey("cursos.id"))
    materia_id = Column(String, ForeignKey("materias.id"))
    tipo_aula_requerida = Column(String, default="Normal") 
    curso = relationship("CursoDB", back_populates="requisitos")
    materia = relationship("MateriaDB", back_populates="requisitos")

class AsignacionDB(Base):
    __tablename__ = "horarios_generados"
    id = Column(String, primary_key=True, index=True)
    dia = Column(String)
    hora_rango = Column(String)
    curso_id = Column(String, ForeignKey("cursos.id"))
    materia_id = Column(String, ForeignKey("materias.id"))
    profesor_id = Column(String, ForeignKey("profesores.id"))
    aula_id = Column(String, ForeignKey("aulas.id"), nullable=True) 
    aula = relationship("AulaDB", back_populates="asignaciones")
    curso = relationship("CursoDB", back_populates="asignaciones")
    materia = relationship("MateriaDB", back_populates="asignaciones")
    profesor = relationship("ProfesorDB", back_populates="asignaciones")

class UsuarioDB(Base):
    __tablename__ = "usuarios"
    username = Column(String, primary_key=True, index=True) # Usamos username como ID
    hashed_password = Column(String)
    # --- CAMBIO AQUÍ ---
    rol = Column(String, default="admin") # ej: "admin", "profesor"

class ConfiguracionDB(Base):
    __tablename__ = "configuracion"
    key = Column(String, primary_key=True, index=True)
    value_json = Column(Text, default='{}')


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