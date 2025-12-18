# BackEnd/app/database.py

from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Table, Text, Boolean # <-- AÑADIDO: Boolean
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from sqlalchemy.ext.hybrid import hybrid_property

# --- Configuración de la Base de Datos ---
DATABASE_URL = "sqlite:///./horarios.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- Modelos SQLAlchemy (Tablas) ---

class ProfesorDB(Base):
    __tablename__ = "profesores"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)
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
    anio = Column(String, index=True)       
    division = Column(String, index=True)   
    cantidad_alumnos = Column(Integer, default=30) 
    
    requisitos = relationship("RequisitoDB", back_populates="curso")
    asignaciones = relationship("AsignacionDB", back_populates="curso")

    @hybrid_property
    def nombre_completo(self):
        return f"{self.anio} '{self.division}'"

class AulaDB(Base):
    __tablename__ = "aulas"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) 
    tipo = Column(String, index=True, default="Normal")
    capacidad = Column(Integer, default=30) 

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
    username = Column(String, primary_key=True, index=True)
    hashed_password = Column(String)
    rol = Column(String, default="admin")
    
    # --- CAMBIOS FASE 2: Seguridad ---
    # Si es True, el usuario DEBE cambiar su clave antes de hacer nada más.
    force_change_password = Column(Boolean, default=True) 

class ConfiguracionDB(Base):
    __tablename__ = "configuracion"
    key = Column(String, primary_key=True, index=True)
    value_json = Column(Text, default='{}')

# --- Funciones Base ---
def crear_tablas():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()