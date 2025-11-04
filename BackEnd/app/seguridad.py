import json
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict # <-- AÑADIDO Dict


# Cambiamos a sha256_crypt, que es nativo de passlib y no usa la librería bcrypt externa
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# --- 2. Configuración de JWT (Tokens) ---
SECRET_KEY = "tu-llave-secreta-super-larga-y-aleatoria-aqui"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # El token durará 1 día

# --- 3. Funciones de Contraseña ---
def verificar_password(plain_password, hashed_password):
    """Compara una contraseña en texto plano con una hasheada."""
    return pwd_context.verify(plain_password, hashed_password)

def hashear_password(password):
    """Hashea una contraseña en texto plano."""
    return pwd_context.hash(password)

# --- 4. Funciones de Token (JWT) ---
def crear_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Crea un nuevo token JWT.
    'data' ahora debe ser un dict como: {"sub": "username", "rol": "admin"}
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- CAMBIO AQUÍ ---
def verificar_token(token: str) -> Optional[Dict]: # <-- CAMBIO: de str a Dict
    """
    Verifica un token. Si es válido, devuelve el payload (dict).
    Si no es válido, devuelve None.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # "sub" es el "subject" (sujeto) del token, que usaremos para el username
        username: str = payload.get("sub")
        if username is None:
            return None
        return payload # <-- CAMBIO: devolver todo el payload
    except JWTError:
        # Si el token es inválido (expirado, firma incorrecta, etc.)
        return None