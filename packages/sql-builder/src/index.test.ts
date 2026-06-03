import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSelect,
  buildInsert,
  buildUpdate,
  buildDelete,
  parseFilters,
  parseOrder,
  quoteIdent,
  QueryError,
} from "./index.js";

test("buildSelect: oddiy *", () => {
  const q = buildSelect({
    schema: "public",
    table: "users",
    filters: [],
    order: [],
  });
  assert.equal(q.text, 'select * from "public"."users"');
  assert.deepEqual(q.params, []);
});

test("buildSelect: filtrlar parametrlanadi", () => {
  const q = buildSelect({
    schema: "public",
    table: "users",
    select: "id,name",
    filters: [
      { column: "age", op: "gt", value: "18" },
      { column: "name", op: "ilike", value: "*john*" },
    ],
    order: [{ column: "id", dir: "desc" }],
    limit: 10,
  });
  assert.equal(
    q.text,
    'select "id", "name" from "public"."users" where "age" > $1 and "name" ilike $2 order by "id" desc limit $3',
  );
  assert.deepEqual(q.params, ["18", "%john%", 10]);
});

test("buildSelect: in va is operatorlari", () => {
  const q = buildSelect({
    schema: "public",
    table: "t",
    filters: [
      { column: "id", op: "in", value: "(1,2,3)" },
      { column: "deleted_at", op: "is", value: "null" },
    ],
    order: [],
  });
  assert.equal(
    q.text,
    'select * from "public"."t" where "id" in ($1, $2, $3) and "deleted_at" is null',
  );
  assert.deepEqual(q.params, ["1", "2", "3"]);
});

test("SQL-injection: qiymat hech qachon matnga kirmaydi", () => {
  const q = buildSelect({
    schema: "public",
    table: "users",
    filters: [{ column: "name", op: "eq", value: "'; drop table users; --" }],
    order: [],
  });
  // Xavfli matn faqat parametrda, SQL matnida emas.
  assert.ok(!q.text.includes("drop table"));
  assert.deepEqual(q.params, ["'; drop table users; --"]);
});

test("quoteIdent: qo'shtirnoq qochiriladi", () => {
  assert.equal(quoteIdent('we"ird'), '"we""ird"');
});

test("buildInsert: ko'p qator", () => {
  const q = buildInsert({
    schema: "public",
    table: "todos",
    rows: [
      { title: "a", done: false },
      { title: "b", done: true },
    ],
    returning: true,
  });
  assert.equal(
    q.text,
    'insert into "public"."todos" ("title", "done") values ($1, $2), ($3, $4) returning *',
  );
  assert.deepEqual(q.params, ["a", false, "b", true]);
});

test("buildUpdate: set keyin where parametrlari tartibda", () => {
  const q = buildUpdate({
    schema: "public",
    table: "todos",
    set: { title: "yangi" },
    filters: [{ column: "id", op: "eq", value: "7" }],
    returning: true,
  });
  assert.equal(
    q.text,
    'update "public"."todos" set "title" = $1 where "id" = $2 returning *',
  );
  assert.deepEqual(q.params, ["yangi", "7"]);
});

test("buildDelete: where bilan", () => {
  const q = buildDelete({
    schema: "public",
    table: "todos",
    filters: [{ column: "id", op: "eq", value: "7" }],
    returning: true,
  });
  assert.equal(
    q.text,
    'delete from "public"."todos" where "id" = $1 returning *',
  );
});

test("parseFilters: reserved kalitlarni o'tkazib yuboradi", () => {
  const f = parseFilters({ select: "*", id: "eq.5", limit: "10" });
  assert.deepEqual(f, [{ column: "id", op: "eq", value: "5" }]);
});

test("parseFilters: noto'g'ri format xato beradi", () => {
  assert.throws(() => parseFilters({ id: "5" }), QueryError);
});

test("parseOrder", () => {
  assert.deepEqual(parseOrder("a.desc,b"), [
    { column: "a", dir: "desc" },
    { column: "b", dir: "asc" },
  ]);
});
