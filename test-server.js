#!/usr/bin/env node
/**
 * Script de prueba rápida para verificar que el servidor está funcionando
 * Ejecutar: node test-server.js
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET'
};

console.log('🚀 Verificando servidor en http://localhost:3000...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Servidor está funcionando correctamente');
      console.log('📊 Response:', data);
    } else {
      console.log('⚠️ Servidor responde pero con status:', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.log('❌ No se puede conectar a localhost:3000');
    console.log('⚙️ Asegúrate de que el servidor está ejecutándose:');
    console.log('   node server.js');
  } else {
    console.log('❌ Error:', error.message);
  }
  process.exit(1);
});

req.end();
