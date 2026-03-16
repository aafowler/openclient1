# OpenAPI Specification Reference

## Specification Links

- **OpenAPI 3.0**: https://swagger.io/specification/
- **OpenAPI 3.1**: https://spec.openapis.org/oas/v3.1.0
- **Swagger 2.0**: https://swagger.io/specification/v2/

## Version Differences

**Swagger 2.0** is the older format. Key structural differences from OpenAPI 3.x:
- Uses `swagger: "2.0"` instead of `openapi: "3.x.x"`
- Server info is split across `host`, `basePath`, and `schemes` (3.x uses a `servers` array)
- Request bodies are defined as `body` parameters (3.x uses a dedicated `requestBody` field)
- Schemas live under `definitions` (3.x uses `components/schemas`)

**OpenAPI 3.0** introduced `components`, `requestBody`, `servers`, and `callbacks`.

**OpenAPI 3.1** aligns the schema object with JSON Schema draft 2020-12 and adds `webhooks`.

## Top-Level Structure (OpenAPI 3.x)

| Field          | Required | Description                                       |
|----------------|----------|---------------------------------------------------|
| `openapi`      | Yes      | Version string (e.g., `"3.0.0"`)                  |
| `info`         | Yes      | API title, version, description, contact, license |
| `servers`      | No       | Array of server URLs the API is hosted at         |
| `paths`        | Yes*     | API endpoints — keyed by path, then HTTP method   |
| `components`   | No       | Reusable schemas, parameters, responses, etc.     |
| `security`     | No       | Global security requirements                      |
| `tags`         | No       | Tag definitions for grouping endpoints            |
| `externalDocs` | No       | Link to external documentation                    |

*In 3.1+, the spec must contain at least one of `paths`, `webhooks`, or `components`.

## Common Objects

**Info Object**: `title` (required), `version` (required), `description`, `termsOfService`, `contact`, `license`

**Server Object**: `url` (required), `description`, `variables`

**Path Item**: Contains operations keyed by HTTP method (`get`, `post`, `put`, `delete`, `patch`, `options`, `head`, `trace`), plus shared `parameters`, `summary`, and `description`.

**Operation Object**: `summary`, `description`, `operationId`, `tags`, `parameters`, `requestBody`, `responses` (required), `security`, `deprecated`

**Parameter Object**: `name` (required), `in` (required — `query`, `path`, `header`, or `cookie`), `required`, `description`, `schema`

**Schema Object**: Follows JSON Schema. Common fields: `type`, `properties`, `items`, `required`, `enum`, `format`, `description`, `example`

## Useful Tools

- **Swagger Editor**: https://editor.swagger.io/ — browser-based spec editor with live validation
- **Swagger Validator**: https://validator.swagger.io/ — online validation API
- **Petstore Example Spec**: https://petstore3.swagger.io/api/v3/openapi.json — classic test spec
