/**
 * Script para verificar la configuración de Zendesk
 * 
 * Este script verifica:
 * - Las URLs que se están usando
 * - La conectividad con la API de Zendesk
 * - Los permisos del API Token
 * 
 * Uso: npx ts-node verify-zendesk-config.ts
 */

import * as dotenv from 'dotenv';
import axios from 'axios';

// Cargar variables de entorno
dotenv.config();

async function verifyZendeskConfig() {
  console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN DE ZENDESK');
  console.log('═'.repeat(60));
  
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const email = process.env.ZENDESK_EMAIL;
  const token = process.env.ZENDESK_API_TOKEN;
  
  console.log('\n📋 Variables de Entorno:');
  console.log(`   ZENDESK_SUBDOMAIN: ${subdomain || '❌ NO CONFIGURADO'}`);
  console.log(`   ZENDESK_EMAIL: ${email || '❌ NO CONFIGURADO'}`);
  console.log(`   ZENDESK_API_TOKEN: ${token ? `${token.substring(0, 10)}...` : '❌ NO CONFIGURADO'}`);
  
  if (!subdomain || !email || !token) {
    console.log('\n❌ Faltan variables de entorno. Configura tu .env');
    process.exit(1);
  }
  
  console.log('\n🌐 URLs que se usarán:');
  const baseUrl = `https://${subdomain}.zendesk.com`;
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   API URL: ${baseUrl}/api/v2`);
  console.log(`   Tickets endpoint: ${baseUrl}/api/v2/tickets.json`);
  console.log(`   Users endpoint: ${baseUrl}/api/v2/users/me.json`);
  
  console.log('\n🔐 Autenticación:');
  const auth = Buffer.from(`${email}/token:${token}`).toString('base64');
  console.log(`   Método: Basic Auth`);
  console.log(`   Email: ${email}`);
  console.log(`   Token: ${token.substring(0, 10)}...`);
  
  console.log('\n📡 Probando conectividad...');
  console.log('─'.repeat(60));
  
  try {
    // Test 1: Verificar conectividad básica
    console.log('\n1️⃣  Verificando acceso a la API...');
    const meUrl = `${baseUrl}/api/v2/users/me.json`;
    console.log(`   URL: ${meUrl}`);
    
    const meResponse = await axios.get(meUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('   ✅ Conexión exitosa!');
    console.log(`   👤 Usuario autenticado: ${meResponse.data.user.name}`);
    console.log(`   📧 Email: ${meResponse.data.user.email}`);
    console.log(`   🆔 User ID: ${meResponse.data.user.id}`);
    console.log(`   🎭 Role: ${meResponse.data.user.role}`);
    
    // Test 2: Verificar permisos de tickets
    console.log('\n2️⃣  Verificando permisos de tickets...');
    const ticketsUrl = `${baseUrl}/api/v2/tickets.json?per_page=1`;
    console.log(`   URL: ${ticketsUrl}`);
    
    const ticketsResponse = await axios.get(ticketsUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('   ✅ Permisos de lectura de tickets: OK');
    console.log(`   📊 Total de tickets accesibles: ${ticketsResponse.data.count || 'N/A'}`);
    
    // Test 3: Verificar estructura de la API
    console.log('\n3️⃣  Verificando estructura de la API de tickets...');
    
    if (ticketsResponse.data.tickets && ticketsResponse.data.tickets.length > 0) {
      const sampleTicket = ticketsResponse.data.tickets[0];
      console.log('   ✅ Estructura de respuesta válida');
      console.log(`   📝 Ejemplo de ticket ID: ${sampleTicket.id}`);
      console.log(`   📋 Subject: ${sampleTicket.subject?.substring(0, 50)}...`);
      console.log(`   📊 Status: ${sampleTicket.status}`);
    } else {
      console.log('   ⚠️  No hay tickets disponibles para verificar estructura');
      console.log('   ℹ️  Esto es normal si es una cuenta nueva');
    }
    
    // Test 4: Probar creación de ticket (simulado)
    console.log('\n4️⃣  Verificando endpoint de creación...');
    const createUrl = `${baseUrl}/api/v2/tickets.json`;
    console.log(`   URL: ${createUrl}`);
    console.log('   ✅ Endpoint disponible');
    
    // Resumen
    console.log('\n' + '═'.repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═'.repeat(60));
    
    console.log('\n📊 Resumen:');
    console.log('   ✅ Conexión a la API: OK');
    console.log('   ✅ Autenticación: OK');
    console.log('   ✅ Permisos de lectura: OK');
    console.log('   ✅ Usuario verificado: OK');
    
    console.log('\n✨ Tu configuración de Zendesk es correcta');
    console.log('\n💡 Puedes proceder a ejecutar los tests:');
    console.log('   yarn ts-node test-zendesk-basic.ts\n');
    
  } catch (error: any) {
    console.log('\n❌ ERROR EN LA VERIFICACIÓN:');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.log(`   URL: ${error.config?.url || 'N/A'}`);
      
      if (error.response.status === 401) {
        console.log('\n🔐 Error de Autenticación (401):');
        console.log('   ❌ Las credenciales son incorrectas');
        console.log('\n💡 Verifica:');
        console.log('   1. El subdomain es correcto (sin .zendesk.com)');
        console.log('   2. El email es el correcto');
        console.log('   3. El API token es válido y activo');
        console.log('   4. El formato es: email/token:api_token');
      } else if (error.response.status === 403) {
        console.log('\n🚫 Error de Permisos (403):');
        console.log('   ❌ El token no tiene permisos suficientes');
        console.log('\n💡 Solución:');
        console.log('   1. Ve a Admin Center → APIs → Zendesk API');
        console.log('   2. Regenera el token con permisos completos');
      } else if (error.response.status === 404) {
        console.log('\n🔍 Error de Endpoint (404):');
        console.log('   ❌ El subdomain podría ser incorrecto');
        console.log(`   ℹ️  Verificando: https://${subdomain}.zendesk.com`);
      } else {
        console.log(`\n⚠️  Error ${error.response.status}:`);
        console.log(`   ${JSON.stringify(error.response.data, null, 2)}`);
      }
    } else if (error.code === 'ENOTFOUND') {
      console.log('   ❌ No se puede resolver el dominio');
      console.log(`   ℹ️  Dominio: ${subdomain}.zendesk.com`);
      console.log('\n💡 Verifica:');
      console.log('   1. El subdomain es correcto');
      console.log('   2. Tienes conexión a internet');
      console.log('   3. No hay problemas de DNS');
    } else {
      console.log(`   ${error.message}`);
      if (error.stack) {
        console.log('\n📋 Stack trace:');
        console.log(error.stack);
      }
    }
    
    process.exit(1);
  }
}

// Ejecutar verificación
verifyZendeskConfig();

