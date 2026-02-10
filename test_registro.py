#!/usr/bin/env python3
"""
Script para probar el flujo de registro y verificación
Ejecutar: python test_registro.py
"""

import requests
import json
import time

BASE_URL = "http://localhost:3000"

def test_registro():
    """Prueba el endpoint de registro"""
    print("\n" + "="*60)
    print("TEST 1: Registro de nuevo usuario")
    print("="*60)
    
    datos = {
        "nombre": "Test User",
        "correo": f"test.{int(time.time())}@example.com",
        "password": "123456",
        "rol": "estudiante"
    }
    
    print(f"\n📝 Enviando datos: {json.dumps(datos, indent=2)}")
    
    try:
        response = requests.post(f"{BASE_URL}/api/usuarios", json=datos)
        print(f"\n📬 Status Code: {response.status_code}")
        print(f"📬 Headers: {dict(response.headers)}")
        print(f"📬 Response: {response.text}")
        
        data = response.json()
        print(f"📬 JSON: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ Registro exitoso!")
            return datos["correo"]
        else:
            print(f"\n❌ Registro falló con status {response.status_code}")
            return None
            
    except Exception as e:
        print(f"\n⚠️ Error: {e}")
        return None

def test_verificar(correo, codigo="123456"):
    """Prueba el endpoint de verificación"""
    print("\n" + "="*60)
    print("TEST 2: Verificación de código")
    print("="*60)
    
    datos = {
        "correo": correo,
        "codigo": codigo
    }
    
    print(f"\n🔐 Enviando datos: {json.dumps(datos, indent=2)}")
    
    try:
        response = requests.post(f"{BASE_URL}/api/verificar", json=datos)
        print(f"\n📬 Status Code: {response.status_code}")
        print(f"📬 Response: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Verificación exitosa!")
            return True
        else:
            print(f"\n❌ Verificación falló")
            return False
            
    except Exception as e:
        print(f"\n⚠️ Error: {e}")
        return False

def test_login(correo, password):
    """Prueba el login"""
    print("\n" + "="*60)
    print("TEST 3: Login")
    print("="*60)
    
    datos = {
        "correo": correo,
        "password": password
    }
    
    print(f"\n👤 Intentando login: {correo}")
    
    try:
        response = requests.post(f"{BASE_URL}/api/login", json=datos)
        print(f"\n📬 Status Code: {response.status_code}")
        print(f"📬 Response: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Login exitoso!")
            return True
        else:
            print(f"\n⚠️ Login bloqueado (cuenta no verificada)")
            return False
            
    except Exception as e:
        print(f"\n⚠️ Error: {e}")
        return False

if __name__ == "__main__":
    print("\n🚀 PRUEBA DE FLUJO DE REGISTRO\n")
    
    # Test 1: Registro
    correo = test_registro()
    
    if correo:
        # Test 2: Login sin verificar (debe fallar)
        test_login(correo, "123456")
        
        # Test 3: Verificar (necesitas el código real de la BD)
        print("\n📌 NOTA: Para verificar, obtén el código de la BD:")
        print(f"   SELECT codigo_verificacion FROM usuarios WHERE correo = '{correo}'")

