/**
 * Script de prueba manual para Zendesk
 * 
 * Este script te permite probar la integración con Zendesk usando credenciales reales
 * 
 * Uso:
 *   1. Configura tus variables de entorno en .env
 *   2. Ejecuta: npx ts-node test-zendesk-manual.ts
 */

import { ConfigService } from '@nestjs/config';
import { ZendeskService } from './src/integration/zendesk/zendesk.service';
import { ProcessedMessage } from './src/common/interfaces/message.interface';
import { AITicketResponse } from './src/integration/zendesk/zendesk.interfaces';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testZendeskIntegration() {
  console.log('🧪 INICIANDO PRUEBAS MANUALES DE ZENDESK');
  console.log('═'.repeat(60));
  
  // Configurar servicio
  const configService = new ConfigService();
  const zendeskService = new ZendeskService(configService);
  
  // Verificar credenciales
  const subdomain = configService.get('ZENDESK_SUBDOMAIN');
  const email = configService.get('ZENDESK_EMAIL');
  const token = configService.get('ZENDESK_API_TOKEN');
  
  console.log('\n📋 Verificando credenciales...');
  console.log(`   Subdomain: ${subdomain || '❌ NO CONFIGURADO'}`);
  console.log(`   Email: ${email || '❌ NO CONFIGURADO'}`);
  console.log(`   API Token: ${token ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
  
  if (!subdomain || !email || !token) {
    console.log('\n⚠️  Modo Testing Activado (sin credenciales reales)');
    console.log('   Configura las variables en .env para pruebas reales\n');
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Test 1: Crear un ticket
  console.log('\n📝 TEST 1: Crear Ticket de Prueba');
  console.log('─'.repeat(60));
  
  try {
    const testMessage: ProcessedMessage = {
      id: `test-${Date.now()}`,
      from: 'whatsapp:+573001234567',
      to: 'whatsapp:+14155238886',
      body: 'Este es un mensaje de prueba del sistema de IA. Por favor ignorar.',
      timestamp: new Date(),
      classification: {
        category: 'support',
        confidence: 0.95,
        tags: ['test', 'automated', 'ai'],
        requiresHumanAgent: false,
        suggestedActions: ['verify_integration'],
      },
      sentiment: 'neutral',
      priority: 'low',
      profileName: 'Test User',
    };
    
    const testAIResponse: AITicketResponse = {
      message: 'Este es un ticket de prueba creado automáticamente por el sistema.',
      ticketPriority: 'low',
      ticketTags: ['test', 'automated'],
    };
    
    console.log('   Creando ticket...');
    const ticketId = await zendeskService.createTicket(testMessage, testAIResponse);
    console.log(`   ✅ Ticket creado exitosamente: ${ticketId}`);
    
    // Test 2: Agregar comentario al ticket
    console.log('\n💬 TEST 2: Agregar Comentario al Ticket');
    console.log('─'.repeat(60));
    
    console.log(`   Agregando comentario al ticket ${ticketId}...`);
    await zendeskService.addCommentToTicket(
      ticketId,
      'Este es un comentario de prueba agregado automáticamente.',
      true
    );
    console.log('   ✅ Comentario agregado exitosamente');
    
    // Test 3: Responder como si fuera WhatsApp
    console.log('\n📱 TEST 3: Responder vía WhatsApp');
    console.log('─'.repeat(60));
    
    console.log(`   Respondiendo al ticket ${ticketId}...`);
    await zendeskService.respondToWhatsAppMessage(
      ticketId,
      '¡Hola! Esta es una respuesta de prueba del sistema de IA. Todo está funcionando correctamente.'
    );
    console.log('   ✅ Respuesta enviada exitosamente');
    
    // Test 4: Obtener información del ticket
    console.log('\n🔍 TEST 4: Obtener Información del Ticket');
    console.log('─'.repeat(60));
    
    console.log(`   Obteniendo ticket ${ticketId}...`);
    const ticket = await zendeskService.getTicketById(ticketId);
    console.log('   ✅ Ticket obtenido exitosamente:');
    console.log(`      - ID: ${ticket.id}`);
    console.log(`      - Subject: ${ticket.subject}`);
    console.log(`      - Status: ${ticket.status}`);
    console.log(`      - Priority: ${ticket.priority}`);
    console.log(`      - Tags: ${ticket.tags.join(', ')}`);
    
    // Test 5: Actualizar estado del ticket
    console.log('\n🔄 TEST 5: Actualizar Estado del Ticket');
    console.log('─'.repeat(60));
    
    console.log(`   Marcando ticket ${ticketId} como resuelto...`);
    await zendeskService.updateTicketStatus(ticketId, 'solved');
    console.log('   ✅ Estado actualizado a "solved"');
    
    // Test 6: Buscar tickets por teléfono
    console.log('\n🔎 TEST 6: Buscar Tickets por Teléfono');
    console.log('─'.repeat(60));
    
    const phoneNumber = '+573001234567';
    console.log(`   Buscando tickets para ${phoneNumber}...`);
    const tickets = await zendeskService.searchTicketsByPhoneNumber(phoneNumber);
    console.log(`   ✅ Encontrados ${tickets.length} tickets`);
    
    if (tickets.length > 0) {
      console.log('   Primeros 3 resultados:');
      tickets.slice(0, 3).forEach((t: any, i: number) => {
        console.log(`      ${i + 1}. ID: ${t.id} - ${t.subject}`);
      });
    }
    
    // Resumen final
    console.log('\n' + '═'.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log(`\n📊 Resumen:`);
    console.log(`   - Ticket de prueba creado: ${ticketId}`);
    console.log(`   - Comentarios agregados: 2`);
    console.log(`   - Estado final: solved`);
    console.log(`   - Tickets encontrados por teléfono: ${tickets.length}`);
    console.log('\n✨ La integración con Zendesk está funcionando correctamente\n');
    
  } catch (error: any) {
    console.log('\n❌ ERROR EN LAS PRUEBAS:');
    console.log(`   ${error.message}`);
    
    if (error.stack) {
      console.log('\n📋 Stack trace:');
      console.log(error.stack);
    }
    
    console.log('\n💡 Posibles soluciones:');
    console.log('   1. Verifica que las credenciales en .env sean correctas');
    console.log('   2. Verifica que el API token tenga los permisos necesarios');
    console.log('   3. Verifica que el subdomain sea correcto');
    console.log('   4. Verifica tu conexión a internet');
    
    process.exit(1);
  }
}

// Ejecutar pruebas
testZendeskIntegration().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

