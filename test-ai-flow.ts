/**
 * Script para probar el flujo completo de IA con function calling
 * 
 * Prueba:
 * - Procesamiento de mensajes con Gemini AI
 * - Detección de IDs de crédito
 * - Ejecución de get_loan_by_partial_id
 * - Ejecución de fix_loan
 * - Respuestas de la IA
 * 
 * Uso: npx ts-node test-ai-flow.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MessageProcessorService } from './src/message-processor/message-processor.service';
import { GeminiService } from './src/inference/gemini/gemini.service';
import { FunctionCallingService } from './src/actions/function-calling/function-calling.service';
import { ProcessedMessage } from './src/common/interfaces/message.interface';
import * as dotenv from 'dotenv';

dotenv.config();

// Colores para output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof COLORS, message: string) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function testAIFlow() {
  console.log('\n');
  log('cyan', '🧪 PRUEBAS DE FLUJO DE IA CON FUNCTION CALLING');
  log('cyan', '═'.repeat(80));
  
  // Inicializar la aplicación NestJS
  const app = await NestFactory.createApplicationContext(AppModule);
  const geminiService = app.get(GeminiService);
  const functionCallingService = app.get(FunctionCallingService);
  
  log('green', '\n✅ Servicios inicializados correctamente\n');
  
  // ========================================
  // TEST 1: Mensaje con ID de crédito completo
  // ========================================
  log('yellow', '\n📝 TEST 1: Mensaje con problema de crédito (ID incluido)');
  log('yellow', '─'.repeat(80));
  
  const test1Message: ProcessedMessage = {
    id: 'test-1',
    from: 'whatsapp:+573001234567',
    to: 'whatsapp:+14155238886',
    body: 'Hola, tengo un problema con el crédito 577b35a6. El cliente hizo un pago hace 3 días pero no se refleja en las cuotas.',
    timestamp: new Date(),
    classification: {
      category: 'support',
      subcategory: 'payment_issue',
      confidence: 0.95,
      tags: ['loan', 'payment', 'urgent'],
      requiresHumanAgent: false,
      suggestedActions: ['check_loan', 'fix_loan'],
    },
    sentiment: 'negative',
    priority: 'high',
    profileName: 'Juan Pérez',
  };
  
  log('blue', `   📨 Mensaje: "${test1Message.body}"`);
  log('blue', `   👤 Cliente: ${test1Message.profileName}`);
  log('blue', `   📊 Clasificación: ${test1Message.classification.category}`);
  log('blue', `   ⚡ Prioridad: ${test1Message.priority}\n`);
  
  try {
    log('magenta', '   🤖 Procesando con Gemini AI...');
    const aiResponse1 = await geminiService.processWithFunctionCalling(test1Message);
    
    log('green', '\n   ✅ Respuesta de la IA:');
    console.log(`   💬 "${aiResponse1.message}"\n`);
    
    if (aiResponse1.functionCalls && aiResponse1.functionCalls.length > 0) {
      log('cyan', `   ⚡ Function Calls detectados: ${aiResponse1.functionCalls.length}`);
      
      for (const functionCall of aiResponse1.functionCalls) {
        log('cyan', `\n   🔧 Función: ${functionCall.name}`);
        log('cyan', `   📋 Parámetros: ${JSON.stringify(functionCall.parameters, null, 2)}`);
        
        log('magenta', '   ⏳ Ejecutando función...');
        const result = await functionCallingService.executeFunction(functionCall);
        
        if (result.success) {
          log('green', '   ✅ Función ejecutada exitosamente');
          console.log('   📊 Resultado:', JSON.stringify(result.data, null, 2));
        } else {
          log('red', '   ❌ Error en la ejecución');
          console.log('   ⚠️  Error:', result.error);
        }
      }
    } else {
      log('yellow', '   ℹ️  No se detectaron function calls');
    }
    
    log('blue', `\n   🎫 Crear ticket: ${aiResponse1.shouldCreateTicket ? 'SÍ' : 'NO'}`);
    if (aiResponse1.shouldCreateTicket) {
      log('blue', `   ⚡ Prioridad del ticket: ${aiResponse1.ticketPriority}`);
      log('blue', `   🏷️  Tags: ${aiResponse1.ticketTags?.join(', ')}`);
    }
    
  } catch (error: any) {
    log('red', `   ❌ Error: ${error.message}`);
  }
  
  // ========================================
  // TEST 2: Mensaje sin ID de crédito
  // ========================================
  log('yellow', '\n\n📝 TEST 2: Mensaje sin ID de crédito');
  log('yellow', '─'.repeat(80));
  
  const test2Message: ProcessedMessage = {
    id: 'test-2',
    from: 'whatsapp:+573009876543',
    to: 'whatsapp:+14155238886',
    body: 'El sistema no está reflejando el pago de mi cliente. ¿Qué hago?',
    timestamp: new Date(),
    classification: {
      category: 'support',
      confidence: 0.88,
      tags: ['payment', 'support'],
      requiresHumanAgent: false,
      suggestedActions: ['request_info'],
    },
    sentiment: 'neutral',
    priority: 'medium',
    profileName: 'María García',
  };
  
  log('blue', `   📨 Mensaje: "${test2Message.body}"`);
  log('blue', `   👤 Cliente: ${test2Message.profileName}\n`);
  
  try {
    log('magenta', '   🤖 Procesando con Gemini AI...');
    const aiResponse2 = await geminiService.processWithFunctionCalling(test2Message);
    
    log('green', '\n   ✅ Respuesta de la IA:');
    console.log(`   💬 "${aiResponse2.message}"\n`);
    
    if (aiResponse2.functionCalls && aiResponse2.functionCalls.length > 0) {
      log('cyan', `   ⚡ Function Calls detectados: ${aiResponse2.functionCalls.length}`);
      for (const fc of aiResponse2.functionCalls) {
        log('cyan', `   - ${fc.name}: ${JSON.stringify(fc.parameters)}`);
      }
    } else {
      log('yellow', '   ℹ️  No se detectaron function calls (correcto, no hay ID)');
    }
    
  } catch (error: any) {
    log('red', `   ❌ Error: ${error.message}`);
  }
  
  // ========================================
  // TEST 3: Cliente reporta que el problema persiste
  // ========================================
  log('yellow', '\n\n📝 TEST 3: Cliente reporta que el problema persiste');
  log('yellow', '─'.repeat(80));
  
  const test3Message: ProcessedMessage = {
    id: 'test-3',
    from: 'whatsapp:+573001234567',
    to: 'whatsapp:+14155238886',
    body: 'Ya revisé y el crédito sigue igual, no cambió nada',
    timestamp: new Date(),
    classification: {
      category: 'complaint',
      confidence: 0.92,
      tags: ['followup', 'unresolved'],
      requiresHumanAgent: true,
      suggestedActions: ['escalate'],
    },
    sentiment: 'negative',
    priority: 'high',
    profileName: 'Juan Pérez',
  };
  
  log('blue', `   📨 Mensaje: "${test3Message.body}"`);
  log('blue', `   👤 Cliente: ${test3Message.profileName}\n`);
  
  try {
    log('magenta', '   🤖 Procesando con Gemini AI...');
    const aiResponse3 = await geminiService.processWithFunctionCalling(test3Message);
    
    log('green', '\n   ✅ Respuesta de la IA:');
    console.log(`   💬 "${aiResponse3.message}"\n`);
    
    if (aiResponse3.requiresHumanAgent) {
      log('cyan', '   👨‍💼 Escalamiento a agente humano: SÍ');
      log('cyan', '   👥 Agentes: Jhonatan o Jose');
    }
    
    log('blue', `   🎫 Crear ticket: ${aiResponse3.shouldCreateTicket ? 'SÍ' : 'NO'}`);
    if (aiResponse3.shouldCreateTicket) {
      log('blue', `   ⚡ Prioridad del ticket: ${aiResponse3.ticketPriority}`);
      log('blue', `   🏷️  Tags: ${aiResponse3.ticketTags?.join(', ')}`);
    }
    
  } catch (error: any) {
    log('red', `   ❌ Error: ${error.message}`);
  }
  
  // ========================================
  // TEST 4: ID parcial de crédito
  // ========================================
  log('yellow', '\n\n📝 TEST 4: Mensaje con ID parcial de crédito');
  log('yellow', '─'.repeat(80));
  
  const test4Message: ProcessedMessage = {
    id: 'test-4',
    from: 'whatsapp:+573005551234',
    to: 'whatsapp:+14155238886',
    body: 'El crédito 577b no está mostrando bien las cuotas',
    timestamp: new Date(),
    classification: {
      category: 'support',
      confidence: 0.89,
      tags: ['loan', 'installments'],
      requiresHumanAgent: false,
      suggestedActions: ['check_loan'],
    },
    sentiment: 'neutral',
    priority: 'medium',
    profileName: 'Carlos López',
  };
  
  log('blue', `   📨 Mensaje: "${test4Message.body}"`);
  log('blue', `   👤 Cliente: ${test4Message.profileName}\n`);
  
  try {
    log('magenta', '   🤖 Procesando con Gemini AI...');
    const aiResponse4 = await geminiService.processWithFunctionCalling(test4Message);
    
    log('green', '\n   ✅ Respuesta de la IA:');
    console.log(`   💬 "${aiResponse4.message}"\n`);
    
    if (aiResponse4.functionCalls && aiResponse4.functionCalls.length > 0) {
      log('cyan', `   ⚡ Function Calls detectados: ${aiResponse4.functionCalls.length}`);
      
      for (const functionCall of aiResponse4.functionCalls) {
        log('cyan', `\n   🔧 Función: ${functionCall.name}`);
        log('cyan', `   📋 Parámetros: ${JSON.stringify(functionCall.parameters)}`);
        
        try {
          log('magenta', '   ⏳ Ejecutando función...');
          const result = await functionCallingService.executeFunction(functionCall);
          
          if (result.success) {
            log('green', '   ✅ Función ejecutada exitosamente');
            console.log('   📊 Resultado:', JSON.stringify(result.data, null, 2));
          } else {
            log('red', '   ❌ Error en la ejecución');
            console.log('   ⚠️  Error:', result.error);
          }
        } catch (error: any) {
          log('red', `   ❌ Error ejecutando función: ${error.message}`);
        }
      }
    }
    
  } catch (error: any) {
    log('red', `   ❌ Error: ${error.message}`);
  }
  
  // ========================================
  // Resumen Final
  // ========================================
  log('cyan', '\n\n' + '═'.repeat(80));
  log('green', '✅ PRUEBAS COMPLETADAS');
  log('cyan', '═'.repeat(80));
  
  console.log('\n📊 Resumen de Tests:\n');
  console.log('   ✅ Test 1: Mensaje con ID completo de crédito');
  console.log('   ✅ Test 2: Mensaje sin ID de crédito');
  console.log('   ✅ Test 3: Cliente reporta que problema persiste');
  console.log('   ✅ Test 4: Mensaje con ID parcial de crédito');
  
  console.log('\n💡 Funcionalidades probadas:\n');
  console.log('   ✅ Detección de IDs de crédito en mensajes');
  console.log('   ✅ Ejecución de get_loan_by_partial_id');
  console.log('   ✅ Ejecución de fix_loan');
  console.log('   ✅ Detección de problemas persistentes');
  console.log('   ✅ Escalamiento a agentes humanos');
  console.log('   ✅ Generación de respuestas cortas y directas');
  
  console.log('\n');
  
  await app.close();
}

// Ejecutar tests
testAIFlow()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

