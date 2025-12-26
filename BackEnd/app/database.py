# BackEnd/app/database.py

from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Table, Text, Boolean
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
    dni = Column(String, nullable=True)
    disponibilidad_json = Column(Text, default='[]')
    
    # --- NUEVO CAMPO ---
    color = Column(String, default="#0d9488") # Color por defecto (Teal)

    asignaciones = relationship("AsignacionDB", back_populates="profesor")
    requisitos = relationship("RequisitoDB", back_populates="profesor")

class MateriaDB(Base):
    __tablename__ = "materias"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True) 
    color_hex = Column(String, default="#0d9488") # <--- NUEVO (Para los colores de la grilla)
    
    requisitos = relationship("RequisitoDB", back_populates="materia")
    asignaciones = relationship("AsignacionDB", back_populates="materia")

class CursoDB(Base):
    __tablename__ = "cursos"
    id = Column(String, primary_key=True, index=True)
    anio = Column(String, index=True)       
    division = Column(String, index=True)   
    cantidad_alumnos = Column(Integer, default=30) 
    turno = Column(String, default="Mañana") # <--- NUEVO (Por si faltaba)
    
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
    requisitos_preferidos = relationship("RequisitoDB", back_populates="aula_preferida")

class RequisitoDB(Base):
    __tablename__ = "requisitos_curso"
    id = Column(String, primary_key=True, index=True)
    horas_semanales = Column(Integer)
    
    curso_id = Column(String, ForeignKey("cursos.id"))
    materia_id = Column(String, ForeignKey("materias.id"))
    
    # --- CAMPOS NUEVOS IMPORTANTES ---
    profesor_id = Column(String, ForeignKey("profesores.id"), nullable=True)
    aula_preferida_id = Column(String, ForeignKey("aulas.id"), nullable=True)
    # ---------------------------------

    curso = relationship("CursoDB", back_populates="requisitos")
    materia = relationship("MateriaDB", back_populates="requisitos")
    profesor = relationship("ProfesorDB", back_populates="requisitos") # <--- NUEVO
    aula_preferida = relationship("AulaDB", back_populates="requisitos_preferidos") # <--- NUEVO

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
    force_change_password = Column(Boolean, default=True) 

class ConfiguracionDB(Base):
    __tablename__ = "configuraciones"
    
    # La "key" será el nombre de la configuración (ej: "institucion_nombre")
    key = Column(String, primary_key=True, index=True)
    
    # IMPORTANTE: Usamos 'Text' para que entre el código gigante de la imagen
    value_json = Column(Text)

# --- Funciones Base ---
def crear_tablas():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()