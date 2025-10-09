/**
 * Script de prueba básico para Zendesk (sin canal de WhatsApp)
 * 
 * Este script prueba solo las funcionalidades básicas que no requieren
 * tener el canal de WhatsApp configurado en Zendesk:
 * - Crear tickets
 * - Agregar comentarios
 * - Obtener información de tickets
 * - Actualizar estado de tickets
 * 
 * Uso:
 *   1. Configura tus variables de entorno en .env
 *   2. Ejecuta: npx ts-node test-zendesk-basic.ts
 */

import { ConfigService } from '@nestjs/config';
import { ZendeskService } from './src/integration/zendesk/zendesk.service';
import { ProcessedMessage } from './src/common/interfaces/message.interface';
import { AITicketResponse } from './src/integration/zendesk/zendesk.interfaces';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testZendeskBasic() {
  console.log('🧪 PRUEBAS BÁSICAS DE ZENDESK (Sin canal WhatsApp)');
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
  } else {
    console.log('\n✅ Credenciales configuradas correctamente');
    console.log(`   URL de Zendesk: https://${subdomain}.zendesk.com`);
  }
  
  console.log('\n' + '═'.repeat(60));
  
  let createdTicketId: string | null = null;
  
  try {
    // Test 1: Crear un ticket
    console.log('\n📝 TEST 1: Crear Ticket');
    console.log('─'.repeat(60));
    
    const testMessage: ProcessedMessage = {
      id: `test-basic-${Date.now()}`,
      from: 'test-user@example.com', // Usar email en lugar de WhatsApp
      to: 'support@tu-empresa.com',
      body: 'Este es un ticket de prueba creado por el sistema de IA.\n\nPrueba de funcionalidades básicas:\n- Crear ticket ✓\n- Agregar comentarios (siguiente paso)\n- Obtener información (siguiente paso)\n- Actualizar estado (siguiente paso)',
      timestamp: new Date(),
      classification: {
        category: 'support',
        confidence: 0.95,
        tags: ['test', 'automated', 'integration-test'],
        requiresHumanAgent: false,
        suggestedActions: ['verify_integration'],
      },
      sentiment: 'neutral',
      priority: 'low',
      profileName: 'Test User (Automated)',
    };
    
    const testAIResponse: AITicketResponse = {
      message: 'Ticket de prueba para verificar la integración básica con Zendesk.',
      ticketPriority: 'low',
      ticketTags: ['test', 'automated', 'no-whatsapp'],
    };
    
    console.log('   📤 Creando ticket...');
    console.log(`   📋 Subject: ${testMessage.body.substring(0, 50)}...`);
    console.log(`   🏷️  Priority: ${testAIResponse.ticketPriority}`);
    console.log(`   🏷️  Tags: ${testAIResponse.ticketTags?.join(', ')}`);
    
    createdTicketId = await zendeskService.createTicket(testMessage, testAIResponse);
    
    console.log(`   ✅ Ticket creado exitosamente!`);
    console.log(`   🎫 Ticket ID: ${createdTicketId}`);
    
    if (subdomain && createdTicketId !== 'TEST_TICKET_12345') {
      console.log(`   🔗 URL: https://${subdomain}.zendesk.com/agent/tickets/${createdTicketId}`);
    }
    
    // Test 2: Agregar comentario público
    console.log('\n💬 TEST 2: Agregar Comentario Público');
    console.log('─'.repeat(60));
    
    const publicComment = `Comentario público de prueba agregado en: ${new Date().toLocaleString('es-ES')}

Este es un comentario público que sería visible para el cliente.

✅ Funcionalidades probadas hasta ahora:
- Creación de ticket
- Agregar comentario público`;
    
    console.log(`   💬 Agregando comentario público al ticket ${createdTicketId}...`);
    await zendeskService.addCommentToTicket(
      createdTicketId,
      publicComment,
      true // público
    );
    console.log('   ✅ Comentario público agregado exitosamente');
    
    // Test 3: Agregar comentario privado (nota interna)
    console.log('\n🔒 TEST 3: Agregar Comentario Privado (Nota Interna)');
    console.log('─'.repeat(60));
    
    const privateComment = `[NOTA INTERNA - Solo visible para agentes]

Comentario privado agregado en: ${new Date().toLocaleString('es-ES')}

Este comentario NO es visible para el cliente.
Útil para notas internas del equipo de soporte.`;
    
    console.log(`   🔒 Agregando comentario privado al ticket ${createdTicketId}...`);
    await zendeskService.addCommentToTicket(
      createdTicketId,
      privateComment,
      false // privado
    );
    console.log('   ✅ Comentario privado agregado exitosamente');
    
    // Test 4: Obtener información del ticket
    console.log('\n🔍 TEST 4: Obtener Información del Ticket');
    console.log('─'.repeat(60));
    
    console.log(`   📥 Obteniendo información del ticket ${createdTicketId}...`);
    const ticket = await zendeskService.getTicketById(createdTicketId);
    
    console.log('   ✅ Información obtenida exitosamente:');
    console.log(`      🎫 ID: ${ticket.id}`);
    console.log(`      📝 Subject: ${ticket.subject}`);
    console.log(`      📊 Status: ${ticket.status}`);
    console.log(`      ⚡ Priority: ${ticket.priority}`);
    console.log(`      🏷️  Tags: ${ticket.tags.join(', ')}`);
    console.log(`      📅 Created: ${new Date(ticket.created_at).toLocaleString('es-ES')}`);
    console.log(`      📅 Updated: ${new Date(ticket.updated_at).toLocaleString('es-ES')}`);
    
    // Test 5: Actualizar estado del ticket
    console.log('\n🔄 TEST 5: Actualizar Estado del Ticket');
    console.log('─'.repeat(60));
    
    console.log(`   📝 Actualizando ticket ${createdTicketId} a "open"...`);
    await zendeskService.updateTicketStatus(createdTicketId, 'open');
    console.log('   ✅ Estado actualizado a "open"');
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`   ⏸️  Actualizando ticket ${createdTicketId} a "pending"...`);
    await zendeskService.updateTicketStatus(createdTicketId, 'pending');
    console.log('   ✅ Estado actualizado a "pending"');
    
    console.log('\n   ℹ️  Nota: No se actualiza a "solved" porque requiere campo obligatorio "Tipo de cliente"');
    
    // Resumen final
    console.log('\n' + '═'.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS BÁSICAS COMPLETADAS EXITOSAMENTE');
    console.log('═'.repeat(60));
    
    console.log(`\n📊 Resumen de Operaciones:`);
    console.log(`   ✅ Ticket creado: ${createdTicketId}`);
    console.log(`   ✅ Comentarios agregados: 2 (1 público, 1 privado)`);
    console.log(`   ✅ Información obtenida correctamente`);
    console.log(`   ✅ Estados actualizados: new → open → pending`);
    
    if (subdomain && createdTicketId !== 'TEST_TICKET_12345') {
      console.log(`\n🔗 Verifica el ticket en Zendesk:`);
      console.log(`   https://${subdomain}.zendesk.com/agent/tickets/${createdTicketId}`);
    }
    
    console.log('\n✨ La integración básica con Zendesk está funcionando correctamente');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Verifica el ticket en tu dashboard de Zendesk');
    console.log('   2. Revisa los comentarios (público y privado)');
    console.log('   3. Una vez configures el canal de WhatsApp, prueba el flujo completo');
    console.log('');
    
  } catch (error: any) {
    console.log('\n❌ ERROR EN LAS PRUEBAS:');
    console.log(`   ${error.message}`);
    
    if (error.response) {
      console.log('\n📋 Respuesta del servidor:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    if (error.stack) {
      console.log('\n📋 Stack trace:');
      console.log(error.stack);
    }
    
    console.log('\n💡 Posibles soluciones:');
    console.log('   1. Verifica que las credenciales en .env sean correctas');
    console.log('   2. Verifica que el API token tenga los permisos necesarios:');
    console.log('      - Lectura de tickets');
    console.log('      - Escritura de tickets');
    console.log('      - Creación de tickets');
    console.log('   3. Verifica que el subdomain sea correcto (sin .zendesk.com)');
    console.log('   4. Verifica tu conexión a internet');
    console.log('   5. Verifica que el email sea el del usuario que creó el token');
    
    process.exit(1);
  }
}

// Ejecutar pruebas
console.log('\n');
testZendeskBasic()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  });

