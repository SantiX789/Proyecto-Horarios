from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext

# --- CONFIGURACIÓN ---
# Clave fija para que no se cierren las sesiones al reiniciar
SECRET_KEY = "MI_PALABRA_SECRETA_SUPER_SEGURA_CRONOS_2025" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 Horas

# Contexto para hashear contraseñas (usamos bcrypt que es estándar)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- FUNCIONES DE CONTRASEÑA ---

def verificar_password(plain_password, hashed_password):
    """Compara una contraseña plana con una hasheada."""
    return pwd_context.verify(plain_password, hashed_password)

def hashear_password(password):
    """Convierte una contraseña plana en un hash seguro."""
    return pwd_context.hash(password)

# --- FUNCIONES DE TOKEN (JWT) ---

def crear_token_acceso(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Genera el token JWT. 
    Nota: El nombre de la función coincide con main.py (crear_token_acceso)
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verificar_token(token: str) -> Optional[Dict]:
    """
    Decodifica y valida el token. Devuelve los datos (payload) o None si falló.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None