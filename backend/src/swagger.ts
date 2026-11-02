import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, getSchemaPath } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { ErrorResponseDto } from './common/dto/error-response.dto.js';

const DESCRIPTION = `
REST API for the HaiSan Express seafood marketplace.

**Base path:** every route starts with \`/api\`.

**Authentication:** sign in with \`POST /api/auth/login\`, then send the returned token as
\`Authorization: Bearer <accessToken>\`. Use the **Authorize** button to try protected routes;
the token is kept when the page reloads.

**Errors:** failures return \`{ statusCode, message, error }\`. \`message\` is a readable
Vietnamese sentence; validation errors (400) return one message per invalid field.

**Money and dates:** prices are integers in VND; dates are ISO 8601 strings.
`.trim();

/** Tags in the order they appear, with a one-line description each. */
const TAGS: Array<[name: string, description: string]> = [
  ['Auth', 'Register, sign in and read the signed-in user.'],
  ['Products', 'Product listing with filters and facets, and product detail.'],
  ['Categories', 'Seafood categories and the products in each.'],
  ['Regions', 'Fishing grounds where vendors currently sell.'],
  ['Cart', 'Shopping cart.'],
  ['Account', "The signed-in user's profile, password and address book."],
  ['Account reviews', 'Reviews of items from delivered orders, including photo uploads.'],
];

/** Every documented 4xx/5xx response gets the shared error body schema. */
function attachErrorSchema(document: OpenAPIObject): void {
  for (const operations of Object.values(document.paths)) {
    for (const operation of Object.values(operations)) {
      const responses = (operation as { responses?: Record<string, { content?: unknown }> }).responses;
      for (const [status, response] of Object.entries(responses ?? {})) {
        if (Number(status) >= 400 && !response.content) {
          response.content = { 'application/json': { schema: { $ref: getSchemaPath(ErrorResponseDto) } } };
        }
      }
    }
  }
}

/**
 * Serves Swagger UI at /api/docs and the raw OpenAPI document at /api/docs-json.
 * No server list is set, so "Try it out" calls whichever host serves the docs.
 */
export function setupApiDocs(app: INestApplication): void {
  const builder = new DocumentBuilder()
    .setTitle('HaiSan Express API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  for (const [name, description] of TAGS) builder.addTag(name, description);

  const document = SwaggerModule.createDocument(app, builder.build(), { extraModels: [ErrorResponseDto] });
  attachErrorSchema(document);

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'HaiSan Express API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 0,
    },
  });
}
