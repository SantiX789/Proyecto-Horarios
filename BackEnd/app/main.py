import json
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware  # 1. La importación
from pydantic import BaseModel
from typing import List, Dict, Optional
import openpyxl
from io import BytesIO

app = FastAPI()

# --- Configuración de CORS ---
# Permite que tu frontend (ej. localhost:3000) hable con tu backend (ej. localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todos los orígenes (para pruebas)
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (GET, POST, DELETE)
    allow_headers=["*"],  # Permite todos los headers
)

# --- Nuestra "Base de Datos" (reemplaza a localStorage) ---
DB_FILE = "horarios_db.json"

def leer_db():
    """Lee la base de datos JSON. Reemplaza a cargarHorarios()"""
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}  # Devuelve un diccionario vacío si el archivo no existe

def guardar_db(data):
    """Guarda en la base de datos JSON. Reemplaza a guardarHorarios()"""
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

# --- Modelos de Datos (qué datos esperamos recibir) ---
# Esto define la estructura del JSON que el frontend nos enviará
class AsignacionRequest(BaseModel):
    curso: str
    profesor: str
    materia: str
    horasSemanales: int
    disponibilidad: List[str]  # Ej: ["Lunes-07:00", "Martes-09:40"]

# --- API Endpoints (las URLs que usará el frontend) ---

@app.get("/api/horarios/{curso}")
def obtener_horario_curso(curso: str):
    """
    Reemplaza la parte de 'cargarHorarios' que busca un curso específico.
    """
    db = leer_db()
    return db.get(curso, {})

@app.get("/api/profesores/{curso}")
def obtener_profesores_curso(curso: str):
    """
    Reemplaza la lógica de 'actualizarProfesoresPorCurso'.
    """
    db = leer_db()
    profesores_del_curso = set()
    
    if curso in db:
        for hora_data in db[curso].values():
            for asignacion in hora_data.values():
                # Asumimos formato "Profesor (Materia)"
                profesor = asignacion.split(" (")[0]
                profesores_del_curso.add(profesor)
                
    return list(profesores_del_curso)

@app.post("/api/horarios")
def generar_horario_api(request: AsignacionRequest):
    """
    Esta es la nueva función 'generarHorario'.
    Toma los datos del frontend, procesa la lógica y guarda en la DB.
    """
    db = leer_db()
    curso = request.curso
    profesor = request.profesor
    materia = request.materia
    horas_totales = request.horasSemanales
    disponibilidad = request.disponibilidad  # Lista de "Dia-Hora" ej: "Lunes-07:00"

    if curso not in db:
        db[curso] = {}

    horas_asignadas = 0
    asignacion_texto = f"{profesor} ({materia})"

    # Lógica principal (movida de JavaScript a Python)
    for slot in disponibilidad:
        if horas_asignadas >= horas_totales:
            break
        
        try:
            dia, hora_inicio = slot.split("-")
            hora_rango = f"{hora_inicio} a {hora_inicio[:2]}:{(int(hora_inicio[3:]) + 40) % 60:02d}"
            if hora_inicio == "19:40": hora_rango = "19:40 a 20:20" # Pequeña corrección de lógica de 40min
            if hora_inicio == "09:40": hora_rango = "09:40 a 10:20"
            # ... (se necesitarían más correcciones para todas las horas)
            # Para simplificar, vamos a asumir que el frontend envía el rango completo
            # *** MEJORA: El frontend debería enviar el rango "07:00 a 07:40"
            # Pero para este ejemplo, usaremos la disponibilidad como ID
            
            # Vamos a ajustar la lógica: el frontend enviará "Dia" y "HoraRango"
            # Por ahora, asumiré que la 'disponibilidad' es una lista de IDs como "Lunes-07:00"
            # Y que los rangos de 'horarios' en JS coinciden
            
            # *** Lógica simplificada: asumimos que el frontend envía los rangos exactos ***
            # La lógica real de asignación de horas puede ser más compleja
            
            # Busquemos el rango de hora correcto basado en la hora de inicio
            # (Tu JS original no envía el rango, envía la hora de inicio ej: "07:00")
            # Vamos a simularlo
            
            hora_inicio_str = slot.split('-')[1] # ej: "07:00"
            dia_str = slot.split('-')[0] # ej: "Lunes"
            
            # Tu lista de horarios original
            horarios_js = [
                "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
                "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
                "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
                "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
                "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
            ]
            
            # Encontrar el rango de hora que coincide con la hora de inicio
            hora_rango_encontrado = None
            for hr in horarios_js:
                if hr.startswith(hora_inicio_str):
                    hora_rango_encontrado = hr
                    break
            
            if hora_rango_encontrado:
                if hora_rango_encontrado not in db[curso]:
                    db[curso][hora_rango_encontrado] = {}
                
                # Verificar si la celda ya está ocupada
                if dia_str not in db[curso][hora_rango_encontrado]:
                    db[curso][hora_rango_encontrado][dia_str] = asignacion_texto
                    horas_asignadas += 1

        except Exception as e:
            # Si algo sale mal (ej. el formato "Dia-Hora" es incorrecto),
            # imprimimos un error en la consola y continuamos con el siguiente slot.
            print(f"ADVERTENCIA: Error procesando slot '{slot}'. Error: {e}")
            continue

    guardar_db(db)
    
    faltantes = horas_totales - horas_asignadas
    return {
        "mensaje": f"Horario generado. Asignadas: {horas_asignadas}. Faltantes: {faltantes}",
        "faltantes": faltantes
    }

@app.delete("/api/horarios/{curso}")
def borrar_horarios_api(curso: str):
    """Reemplaza a borrarHorarios()"""
    db = leer_db()
    if curso in db:
        del db[curso]
        guardar_db(db)
        return {"mensaje": f"Horarios del curso {curso} borrados."}
    return {"mensaje": "Curso no encontrado."}

@app.delete("/api/profesor/{curso}/{profesor_nombre}")
def borrar_profesor_api(curso: str, profesor_nombre: str):
    """Reemplaza a borrarProfesor()"""
    db = leer_db()
    if curso not in db:
        return {"mensaje": "Curso no encontrado."}

    eliminado = False
    # Iterar y eliminar al profesor
    for hora, dias in db[curso].items():
        # Copiamos las keys para poder modificar el diccionario mientras iteramos
        for dia in list(dias.keys()): 
            if db[curso][hora][dia].startswith(profesor_nombre):
                del db[curso][hora][dia]
                eliminado = True
    
    guardar_db(db)
    if eliminado:
        return {"mensaje": f"Profesor {profesor_nombre} eliminado del curso {curso}."}
    else:
        return {"mensaje": "Profesor no encontrado en este curso."}


@app.get("/api/export/excel")
def crear_excel_api():
    """Reemplaza a crearExcel() - ¡Mucho más potente en Python!"""
    db = leer_db()
    wb = openpyxl.Workbook()
    
    # Eliminar la hoja por defecto
    if "Sheet" in wb.sheetnames:
        wb.remove(wb["Sheet"])
        
    cursos = [
        "1A", "1B", "2A", "2B", "3A", "3B",
        "4Construccion", "4Electronica", "5Construccion", "5Electronica",
        "6Construccion", "6Electronica"
    ]
    
    horarios = [
        "07:00 a 07:40", "07:40 a 08:20", "08:20 a 09:00", "09:00 a 09:40",
        "09:40 a 10:20", "10:20 a 11:00", "11:00 a 11:40", "11:40 a 12:20",
        "12:20 a 13:00", "13:00 a 13:40", "13:40 a 14:20", "14:20 a 15:00",
        "15:00 a 15:40", "15:40 a 16:20", "16:20 a 17:00", "17:00 a 17:40",
        "17:40 a 18:20", "18:20 a 19:00", "19:00 a 19:40"
    ]
    
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

    for curso in cursos:
        ws = wb.create_sheet(f"Horario {curso}")
        
       
        ws.append(['Hora'] + dias)
        
       
        for cell in ws[1]:
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill("solid", fgColor="1D72B8")

        
        for hora in horarios:
            fila = [hora]
            for dia in dias:
                asignacion = db.get(curso, {}).get(hora, {}).get(dia, "")
                fila.append(asignacion)
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