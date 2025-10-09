#!/bin/bash

# Script para probar webhooks de Zendesk WhatsApp
# Uso: ./test-zendesk-webhook.sh [ejemplo_numero] [url_opcional]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL por defecto (puede ser sobreescrita)
URL="${2:-http://localhost:3000/webhook/zendesk/whatsapp}"

# Función para imprimir encabezados
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}    ${YELLOW}Test de Webhook Zendesk WhatsApp${NC}                         ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Función para probar un webhook
test_webhook() {
    local example_name=$1
    local payload=$2
    
    echo -e "${GREEN}➜${NC} Probando: ${YELLOW}${example_name}${NC}"
    echo -e "${BLUE}URL:${NC} ${URL}"
    echo ""
    echo -e "${BLUE}Payload:${NC}"
    echo "${payload}" | jq '.' 2>/dev/null || echo "${payload}"
    echo ""
    echo -e "${BLUE}Enviando request...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${URL}" \
        -H "Content-Type: application/json" \
        -d "${payload}")
    
    http_code=$(echo "${response}" | tail -n1)
    body=$(echo "${response}" | sed '$d')
    
    echo ""
    if [ "${http_code}" -eq 200 ]; then
        echo -e "${GREEN}✓ Success (${http_code})${NC}"
        echo -e "${BLUE}Response:${NC} ${body}"
    else
        echo -e "${RED}✗ Failed (${http_code})${NC}"
        echo -e "${RED}Response:${NC} ${body}"
    fi
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Verificar que curl y jq estén instalados
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl no está instalado${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Advertencia: jq no está instalado. El formato JSON no será bonito.${NC}"
fi

print_header

# Ejemplos de payloads
case "${1:-1}" in
    1|all)
        if [ "$1" = "1" ]; then
            echo -e "${YELLOW}Ejemplo 1: Mensaje básico de WhatsApp${NC}"
            echo ""
        fi
        
        payload1='{
          "id": "12345",
          "type": "ticket_comment",
          "ticket_id": "12345",
          "message": "Hola, necesito ayuda con mi crédito 577b35a6",
          "via": {
            "channel": "whatsapp",
            "source": {
              "from": {
                "phone": "+573001234567",
                "name": "Juan Pérez"
              }
            }
          },
          "author": {
            "id": "67890",
            "name": "Juan Pérez",
            "role": "end_user"
          }
        }'
        
        test_webhook "Mensaje básico" "$payload1"
        
        if [ "$1" = "1" ]; then
            exit 0
        fi
        ;&
    
    2)
        echo -e "${YELLOW}Ejemplo 2: Queja urgente${NC}"
        echo ""
        
        payload2='{
          "id": "12346",
          "type": "ticket_comment",
          "ticket_id": "12346",
          "message": "¡Esto es inaceptable! Llevo 3 días esperando una respuesta y nadie me contesta. Quiero hablar con un supervisor AHORA.",
          "via": {
            "channel": "whatsapp",
            "source": {
              "from": {
                "phone": "+573009876543",
                "name": "María García"
              }
            }
          },
          "author": {
            "id": "67891",
            "name": "María García",
            "role": "end_user"
          }
        }'
        
        test_webhook "Queja urgente" "$payload2"
        
        if [ "$1" = "2" ]; then
            exit 0
        fi
        ;&
    
    3)
        echo -e "${YELLOW}Ejemplo 3: Consulta de ventas${NC}"
        echo ""
        
        payload3='{
          "id": "12347",
          "type": "ticket_comment",
          "ticket_id": "12347",
          "message": "Buenas tardes, estoy interesado en solicitar un crédito. ¿Qué requisitos necesito y cuánto tiempo demora la aprobación?",
          "via": {
            "channel": "whatsapp",
            "source": {
              "from": {
                "phone": "+573005551234",
                "name": "Carlos Rodríguez"
              }
            }
          },
          "author": {
            "id": "67892",
            "name": "Carlos Rodríguez",
            "role": "end_user"
          }
        }'
        
        test_webhook "Consulta de ventas" "$payload3"
        
        if [ "$1" = "3" ]; then
            exit 0
        fi
        ;&
    
    4)
        echo -e "${YELLOW}Ejemplo 4: Problema con préstamo${NC}"
        echo ""
        
        payload4='{
          "id": "12349",
          "type": "ticket_comment",
          "ticket_id": "12349",
          "message": "Buenos días, tengo un problema con mi crédito ID 577b35a6. Hice un pago hace 3 días pero todavía no se refleja en mis cuotas. ¿Pueden ayudarme?",
          "via": {
            "channel": "whatsapp",
            "source": {
              "from": {
                "phone": "+573001112222",
                "name": "Ana Martínez"
              }
            }
          },
          "author": {
            "id": "67893",
            "name": "Ana Martínez",
            "role": "end_user"
          }
        }'
        
        test_webhook "Problema con préstamo" "$payload4"
        
        if [ "$1" = "4" ]; then
            exit 0
        fi
        ;&
    
    5)
        echo -e "${YELLOW}Ejemplo 5: Solicitud de cita${NC}"
        echo ""
        
        payload5='{
          "id": "12350",
          "type": "ticket_comment",
          "ticket_id": "12350",
          "message": "Hola, quisiera agendar una cita para el próximo martes 15 de octubre a las 3pm para hablar sobre opciones de crédito. ¿Es posible?",
          "via": {
            "channel": "whatsapp",
            "source": {
              "from": {
                "phone": "+573003334444",
                "name": "Luis Gómez"
              }
            }
          },
          "author": {
            "id": "67894",
            "name": "Luis Gómez",
            "role": "end_user"
          }
        }'
        
        test_webhook "Solicitud de cita" "$payload5"
        
        if [ "$1" = "5" ]; then
            exit 0
        fi
        ;;
    
    *)
        echo -e "${RED}Uso: $0 [1-5|all] [url_opcional]${NC}"
        echo ""
        echo "Ejemplos disponibles:"
        echo "  1 - Mensaje básico de WhatsApp"
        echo "  2 - Queja urgente"
        echo "  3 - Consulta de ventas"
        echo "  4 - Problema con préstamo"
        echo "  5 - Solicitud de cita"
        echo "  all - Ejecutar todos los ejemplos"
        echo ""
        echo "URL por defecto: http://localhost:3000/webhook/zendesk/whatsapp"
        exit 1
        ;;
esac

echo -e "${GREEN}✓ Pruebas completadas${NC}"

