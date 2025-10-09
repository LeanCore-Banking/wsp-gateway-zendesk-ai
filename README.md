<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Gateway de WhatsApp con IA integrada para Zendesk. Sistema inteligente de procesamiento de mensajes que utiliza Gemini AI para análisis, clasificación y respuestas automáticas con capacidad de function-calling.

### Características Principales

- 🤖 **IA Integrada**: Procesamiento inteligente con Google Gemini AI
- 📊 **Clasificación Automática**: Categorización de mensajes (soporte, ventas, quejas, etc.)
- ⚡ **Function Calling**: Ejecución automática de acciones según el contexto
- 🔄 **Integración Bidireccional**: Soporte para Twilio y Zendesk WhatsApp
- 🎫 **Gestión de Tickets**: Creación y actualización automática en Zendesk
- 📝 **Logging Detallado**: Trazabilidad completa de cada mensaje procesado
- 🧪 **Modo Testing**: Funciona sin credenciales para desarrollo

### Flujos Soportados

#### Flujo 1: Twilio → Servidor → IA → Zendesk
```
WhatsApp → Twilio → Nuestro Servidor → Gemini AI → Zendesk
```

#### Flujo 2: Zendesk WhatsApp → Servidor → IA → Respuesta
```
WhatsApp → Zendesk → Nuestro Servidor → Gemini AI → Zendesk → WhatsApp
```

## Documentación

- 📚 [Integración WhatsApp con Zendesk](./ZENDESK_WHATSAPP_INTEGRATION.md) - Guía completa de configuración
- 🧪 [Testing WhatsApp Flow](./TESTING_WHATSAPP_FLOW.md) - Cómo probar el flujo de WhatsApp

## Project setup

```bash
# Instalar dependencias
$ yarn install

# Configurar variables de entorno
$ cp .env.example .env
# Editar .env con tus credenciales
```

### Variables de Entorno Requeridas

```bash
# Gemini AI
GEMINI_API_KEY=tu-api-key

# Zendesk
ZENDESK_SUBDOMAIN=tu-empresa
ZENDESK_EMAIL=tu-email@empresa.com
ZENDESK_API_TOKEN=tu-token-api

# Twilio (opcional)
TWILIO_ACCOUNT_SID=tu-account-sid
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# MongoDB (para function calling)
MONGODB_URI=mongodb://localhost:27017/tu-base-datos

# APIs Externas (opcional)
EXTERNAL_API_BASE_URL=https://api.tu-sistema.com
EXTERNAL_API_KEY=tu-api-key
```

## Compile and run the project

```bash
# development
$ yarn start

# watch mode (recomendado para desarrollo)
$ yarn start:dev

# production mode
$ yarn build
$ yarn start:prod
```

## Endpoints Disponibles

### Webhooks

- `POST /webhook/twilio/whatsapp` - Recibe mensajes desde Twilio
- `POST /webhook/zendesk/ticket` - Recibe eventos de tickets de Zendesk
- `POST /webhook/zendesk/whatsapp` - Recibe mensajes de WhatsApp desde Zendesk
- `POST /webhook/test` - Endpoint de testing

### Ejemplo de Uso

```bash
# Probar el endpoint de Zendesk WhatsApp
curl -X POST http://localhost:3000/webhook/zendesk/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "id": "12345",
    "type": "ticket_comment",
    "message": "Hola, necesito ayuda",
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
      "role": "end_user"
    }
  }'
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
