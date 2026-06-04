import { getProjectPool } from "@storagedb/db";
import type { Project } from "@storagedb/types";

// Schema introspeksiya + OpenAPI spec + TypeScript tip generatsiyasi.

interface Column {
  name: string;
  udt: string;
  nullable: boolean;
}
interface Table {
  name: string;
  columns: Column[];
}

/** public schema'dagi jadval va ustunlarni introspeksiya qiladi. */
export async function introspectSchema(project: Project): Promise<Table[]> {
  const pool = getProjectPool(project);
  const rows = (await pool.begin(async (tx) => {
    await tx.unsafe(`set local role "service_role"`);
    return tx.unsafe(
      `select c.table_name, c.column_name, c.udt_name, c.is_nullable
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
       where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
       order by c.table_name, c.ordinal_position`,
    );
  })) as {
    table_name: string;
    column_name: string;
    udt_name: string;
    is_nullable: string;
  }[];

  const byTable = new Map<string, Table>();
  for (const r of rows) {
    let t = byTable.get(r.table_name);
    if (!t) {
      t = { name: r.table_name, columns: [] };
      byTable.set(r.table_name, t);
    }
    t.columns.push({
      name: r.column_name,
      udt: r.udt_name,
      nullable: r.is_nullable === "YES",
    });
  }
  return [...byTable.values()];
}

function udtToTs(udt: string): string {
  if (/^(int2|int4|int8|float4|float8|numeric)$/.test(udt)) return "number";
  if (udt === "bool") return "boolean";
  if (udt === "json" || udt === "jsonb") return "Record<string, unknown>";
  if (udt.startsWith("_")) return "unknown[]";
  return "string"; // text/varchar/uuid/timestamptz/date/...
}

function udtToOpenApi(udt: string): Record<string, unknown> {
  if (/^(int2|int4|int8)$/.test(udt)) return { type: "integer" };
  if (/^(float4|float8|numeric)$/.test(udt)) return { type: "number" };
  if (udt === "bool") return { type: "boolean" };
  if (udt === "json" || udt === "jsonb") return { type: "object" };
  if (udt.startsWith("_")) return { type: "array", items: {} };
  if (udt === "timestamptz" || udt === "timestamp")
    return { type: "string", format: "date-time" };
  if (udt === "uuid") return { type: "string", format: "uuid" };
  return { type: "string" };
}

function pascal(name: string): string {
  return name
    .split(/[_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

/** Schema'dan TypeScript tiplar generatsiya qiladi. */
export function generateTypes(tables: Table[]): string {
  const lines: string[] = ["// storagedb avtomatik generatsiya qilingan tiplar"];
  for (const t of tables) {
    lines.push(`export interface ${pascal(t.name)} {`);
    for (const c of t.columns) {
      const ts = udtToTs(c.udt) + (c.nullable ? " | null" : "");
      lines.push(`  ${c.name}: ${ts};`);
    }
    lines.push("}", "");
  }
  lines.push("export interface Database {");
  for (const t of tables) lines.push(`  ${t.name}: ${pascal(t.name)};`);
  lines.push("}", "");
  return lines.join("\n");
}

/** Schema'dan OpenAPI 3.0 spec quradi. */
export function buildOpenApi(
  tables: Table[],
  ref: string,
  serverUrl: string,
): Record<string, unknown> {
  const paths: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};

  for (const t of tables) {
    const props: Record<string, unknown> = {};
    for (const c of t.columns) props[c.name] = udtToOpenApi(c.udt);
    schemas[t.name] = { type: "object", properties: props };

    const ref$ = { $ref: `#/components/schemas/${t.name}` };
    paths[`/${t.name}`] = {
      get: {
        summary: `${t.name} ro'yxati`,
        parameters: [
          { name: "select", in: "query", schema: { type: "string" } },
          { name: "order", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "array", items: ref$ },
              },
            },
          },
        },
      },
      post: {
        summary: `${t.name}'ga qo'shish`,
        requestBody: { content: { "application/json": { schema: ref$ } } },
        responses: { "201": { description: "Yaratildi" } },
      },
      patch: {
        summary: `${t.name}'ni yangilash`,
        requestBody: { content: { "application/json": { schema: ref$ } } },
        responses: { "200": { description: "Yangilandi" } },
      },
      delete: {
        summary: `${t.name}'dan o'chirish`,
        responses: { "200": { description: "O'chirildi" } },
      },
    };
  }

  return {
    openapi: "3.0.0",
    info: { title: `storagedb API — ${ref}`, version: "1.0.0" },
    servers: [{ url: serverUrl }],
    components: {
      schemas,
      securitySchemes: {
        apikey: { type: "apiKey", in: "header", name: "apikey" },
      },
    },
    security: [{ apikey: [] }],
    paths,
  };
}

/** Swagger UI HTML (CDN'dan yuklanadi). */
export function swaggerHtml(specUrl: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>storagedb API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body><div id="swagger"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({ url: ${JSON.stringify(specUrl)}, dom_id: "#swagger" });
</script></body></html>`;
}
