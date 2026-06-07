type Prose = Record<string, { title: string; description: string; sections: { heading: string; body: string[] }[] }>;

export const EN: Prose = {
  "sdk": {
    title: "Client SDK (@storagedb/client)",
    description: "The official JavaScript/TypeScript SDK for connecting to storagedb, performing database operations, authentication, storage, and realtime functionality.",
    sections: [
      {
        heading: "Installation and Initial Setup",
        body: [
          "The StorageDB client SDK provides all the functions you need in the `@storagedb/client` npm package. Add it to your project:",
          "npm i @storagedb/client",
          "Use the `createClient()` function to create a client. It is similar to supabase-js. An API URL and an API key (anon or service) are required:",
          "TypeScript/JavaScript: const { createClient } = require('@storagedb/client'); const db = createClient('https://storage.identify.uz/v1/<REF>', '<ANON_KEY>');",
          "All operations are promise-based. The result returns { data, error, ... }. Always check error for non-exceptional error handling."
        ]
      },
      {
        heading: "Database Queries",
        body: [
          "StorageDB supports working with all tables in the PostgREST style. Through `db.from('table_name')` you get a QueryBuilder. It supports select, insert, update, and delete operations.",
          "SELECT: .select('*|col1,col2,...', { count: 'exact'|'estimated' })",
          "INSERT: .insert(data) — adds one or more rows.",
          "UPDATE: .update(changes) — modifies rows matching the WHERE condition.",
          "DELETE: .delete() — deletes rows.",
          "UPSERT: .upsert(data) — updates if it exists, inserts if it does not.",
          "Filters: .eq(), .neq(), .gt(), .gte(), .lt(), .lte(), .like(), .ilike(), .in(), .is(), .not(), .or(), .textSearch()",
          "Ordering and pagination: .order('col', { ascending: false }), .limit(n), .range(from, to), .single()"
        ]
      },
      {
        heading: "Authentication (Auth)",
        body: [
          "StorageDB comes with its own authentication service. Through `db.auth` you can perform sign up, sign in, sign out, password reset, and admin operations.",
          "signUp: registers a new user. There may be no session (if email confirmation is required).",
          "signInWithPassword: log in with email and password.",
          "refreshSession: refresh the access token using a refresh token.",
          "signOut: log out and clear the session.",
          "getUser: get the current user's data (requires an access token).",
          "resetPasswordForEmail: send a password reset link.",
          "admin.* — admin-only operations (over users) with service_key."
        ]
      },
      {
        heading: "Storage (Files)",
        body: [
          "The StorageDB storage service provides an S3-like API. You can create buckets, upload/download files, get public URLs, and create signed URLs.",
          "db.storage.from(bucket_name) — get the bucket API.",
          "bucket.upload(path, data, opts) — upload a file.",
          "bucket.download(path) — download a file.",
          "bucket.remove(path) — delete a file.",
          "bucket.getPublicUrl(path) — a direct URL for a public bucket.",
          "bucket.createSignedUrl(path, expiresIn) — a time-limited signed URL (for a private bucket).",
          "db.storage.createBucket(id, opts) — create a new bucket (admin)."
        ]
      },
      {
        heading: "RPC (Postgres functions)",
        body: [
          "Postgres functions (stored procedures, functions) created in the storagedb database are invoked through RPC.",
          "db.rpc(function_name, args) — call a function.",
          "args — function parameters (object).",
          "The result returns { data, error }. The type of data depends on the value the function returns."
        ]
      },
      {
        heading: "Realtime (Websocket subscription)",
        body: [
          "The StorageDB realtime service supports PostgreSQL changes, broadcast messages, and presence (who is online).",
          "db.channel(name) — create a channel.",
          "on(event, callback) — Postgres change events: INSERT, UPDATE, DELETE, or '*'.",
          "onBroadcast(event, callback) — custom broadcast messages.",
          "onPresenceSync(cb) — presence state update.",
          "onPresenceJoin(cb) — when a user comes online.",
          "onPresenceLeave(cb) — when a user goes offline.",
          "subscribe(onStatus?) — start the WebSocket connection.",
          "send(event, payload) — send a broadcast to the topic.",
          "track(state) — set your own presence state.",
          "unsubscribe() — stop the disconnect."
        ]
      },
      {
        heading: "Error handling and TypeScript",
        body: [
          "All SDK operations return in the { data, error } format. Always check for errors.",
          "If error is null, the operation succeeded. Otherwise error.message contains the details of the error.",
          "By importing the QueryResult<T> type, you can specify the type of select, insert, update, and delete operations.",
          "TypeScript automatically checks all callback and parameter types.",
          "The service key is secret — keep it on the server side or as an environment variable. The anon key is safe to use in the browser layer."
        ]
      }
    ]
  },
  "meta": {
    title: "Meta / DDL (creating tables)",
    description: "Create tables and run other DDL (CREATE/ALTER/DROP) as well as arbitrary SQL through the API. This is a management operation — it works only with service_key, not with anon_key.",
    sections: [
      {
        heading: "Data-plane vs management",
        body: [
          "In storagedb, `anon_key` and `service_key` are for DATA (REST `/rest/v1/...`): reading, inserting, and updating rows. But CREATING tables (DDL) is a different, more powerful operation.",
          "There is a separate endpoint for DDL: `POST /v1/<REF>/meta/query` — it runs arbitrary SQL (CREATE TABLE, ALTER, CREATE FUNCTION, index, policy…).",
          "IMPORTANT: this endpoint works **only with `service_key`**. A request with `anon_key` returns 403 (`service_role is required for meta/query`) — a public client must not be able to create or modify tables. For that reason, use `service_key` only on the backend and never expose it to the browser."
        ]
      },
      {
        heading: "SDK: db.meta.query()",
        body: [
          "The `@storagedb/client` SDK provides a `db.meta.query(sql)` method. It returns `{ data, error }`: for SELECT, `data` is an array of rows; for DDL, `data` is an empty array (`[]`).",
          "Create the client with `service_key` (server-side only)."
        ]
      },
      {
        heading: "Via curl",
        body: [
          "You can also call it directly, without the SDK. The body is `{ \"query\": \"<SQL>\" }` and the header is `apikey: <SERVICE_KEY>`. Response: on success `{ \"rows\": [...] }`, on error `{ \"error\": \"...\" }` (HTTP 400)."
        ]
      },
      {
        heading: "Notes and limitations",
        body: [
          "— No auto-schema: if you `insert` into a non-existent table, it will not be created on its own (REST → 404). Postgres requires an explicit `CREATE TABLE`.",
          "— Does not work with `anon_key` (403) — intentionally. Only `service_key`.",
          "— The query runs inside a transaction under `service_role` and with `STATEMENT_TIMEOUT_MS` (default 15s).",
          "— The SQL Editor and Table Editor in the Dashboard also work through this exact endpoint."
        ]
      }
    ]
  }
};

export const RU: Prose = {
  "sdk": {
    title: "Клиентский SDK (@storagedb/client)",
    description: "Официальный JavaScript/TypeScript SDK для подключения к storagedb, операций с базой данных, аутентификации, storage и realtime-функциональности.",
    sections: [
      {
        heading: "Установка и первоначальная настройка",
        body: [
          "Клиентский SDK StorageDB предоставляет все необходимые функции в npm-пакете `@storagedb/client`. Добавьте его в свой проект:",
          "npm i @storagedb/client",
          "Для создания клиента используйте функцию `createClient()`. Она похожа на supabase-js. Требуются API URL и API-ключ (anon или service):",
          "TypeScript/JavaScript: const { createClient } = require('@storagedb/client'); const db = createClient('https://storage.identify.uz/v1/<REF>', '<ANON_KEY>');",
          "Все операции основаны на промисах. Результат возвращает { data, error, ... }. Для обработки ошибок без исключений всегда проверяйте error."
        ]
      },
      {
        heading: "Запросы к таблицам (Database Queries)",
        body: [
          "StorageDB поддерживает работу со всеми таблицами в стиле PostgREST. Через `db.from('table_name')` вы получаете QueryBuilder. Он поддерживает операции select, insert, update и delete.",
          "SELECT: .select('*|col1,col2,...', { count: 'exact'|'estimated' })",
          "INSERT: .insert(data) — добавляет одну или несколько строк.",
          "UPDATE: .update(changes) — изменяет строки, соответствующие условию WHERE.",
          "DELETE: .delete() — удаляет строки.",
          "UPSERT: .upsert(data) — обновляет, если запись существует, и добавляет, если её нет.",
          "Фильтры: .eq(), .neq(), .gt(), .gte(), .lt(), .lte(), .like(), .ilike(), .in(), .is(), .not(), .or(), .textSearch()",
          "Сортировка и пагинация: .order('col', { ascending: false }), .limit(n), .range(from, to), .single()"
        ]
      },
      {
        heading: "Аутентификация (Auth)",
        body: [
          "StorageDB поставляется с собственным сервисом аутентификации. Через `db.auth` вы можете выполнять регистрацию, вход, выход, сброс пароля и админ-операции.",
          "signUp: регистрирует нового пользователя. Сессии может не быть (если требуется подтверждение email).",
          "signInWithPassword: вход по email и паролю.",
          "refreshSession: обновление access-токена с помощью refresh-токена.",
          "signOut: выход и очистка сессии.",
          "getUser: получение данных текущего пользователя (нужен access-токен).",
          "resetPasswordForEmail: отправка ссылки для сброса пароля.",
          "admin.* — операции, доступные только администратору (над пользователями), с service_key."
        ]
      },
      {
        heading: "Storage (Файлы)",
        body: [
          "Сервис storage в StorageDB предоставляет API, похожий на S3. Можно создавать бакеты, загружать/скачивать файлы, получать public URL и создавать signed URL.",
          "db.storage.from(bucket_name) — получить API бакета.",
          "bucket.upload(path, data, opts) — загрузить файл.",
          "bucket.download(path) — скачать файл.",
          "bucket.remove(path) — удалить файл.",
          "bucket.getPublicUrl(path) — прямой URL для публичного бакета.",
          "bucket.createSignedUrl(path, expiresIn) — временный подписанный URL (для приватного бакета).",
          "db.storage.createBucket(id, opts) — создать новый бакет (admin)."
        ]
      },
      {
        heading: "RPC (функции Postgres)",
        body: [
          "Функции Postgres (хранимые процедуры, функции), созданные в базе storagedb, вызываются через RPC.",
          "db.rpc(function_name, args) — вызвать функцию.",
          "args — параметры функции (объект).",
          "Результат возвращает { data, error }. Тип data зависит от значения, которое возвращает функция."
        ]
      },
      {
        heading: "Realtime (подписка через Websocket)",
        body: [
          "Сервис realtime в StorageDB поддерживает изменения PostgreSQL, broadcast-сообщения и presence (кто онлайн).",
          "db.channel(name) — создать канал.",
          "on(event, callback) — события изменений Postgres: INSERT, UPDATE, DELETE или '*'.",
          "onBroadcast(event, callback) — пользовательские broadcast-сообщения.",
          "onPresenceSync(cb) — обновление состояния presence.",
          "onPresenceJoin(cb) — когда пользователь выходит онлайн.",
          "onPresenceLeave(cb) — когда пользователь уходит офлайн.",
          "subscribe(onStatus?) — начать WebSocket-подключение.",
          "send(event, payload) — отправить broadcast в topic.",
          "track(state) — задать собственное состояние presence.",
          "unsubscribe() — остановить отключение."
        ]
      },
      {
        heading: "Обработка ошибок и TypeScript",
        body: [
          "Все операции SDK возвращают результат в формате { data, error }. Всегда проверяйте ошибки.",
          "Если error равен null, операция прошла успешно. В противном случае error.message содержит подробности ошибки.",
          "Импортировав тип QueryResult<T>, вы можете задать тип операций select, insert, update и delete.",
          "TypeScript автоматически проверяет типы всех колбэков и параметров.",
          "Service key секретен — храните его на стороне сервера или как переменную окружения. Anon key безопасно использовать на уровне браузера."
        ]
      }
    ]
  },
  "meta": {
    title: "Meta / DDL (создание таблиц)",
    description: "Создание таблиц и выполнение другого DDL (CREATE/ALTER/DROP), а также произвольного SQL через API. Это операция управления — работает только с service_key, но не с anon_key.",
    sections: [
      {
        heading: "Data-plane против management",
        body: [
          "В storagedb `anon_key` и `service_key` предназначены для ДАННЫХ (REST `/rest/v1/...`): чтение, добавление и обновление строк. Но СОЗДАНИЕ таблиц (DDL) — это другая, более мощная операция.",
          "Для DDL есть отдельный endpoint: `POST /v1/<REF>/meta/query` — он выполняет произвольный SQL (CREATE TABLE, ALTER, CREATE FUNCTION, index, policy…).",
          "ВАЖНО: этот endpoint работает **только с `service_key`**. Запрос с `anon_key` возвращает 403 (`для meta/query требуется service_role`) — публичный клиент не должен иметь возможности создавать или изменять таблицы. Поэтому используйте `service_key` только на бэкенде и не выводите его в браузер."
        ]
      },
      {
        heading: "SDK: db.meta.query()",
        body: [
          "В SDK `@storagedb/client` есть метод `db.meta.query(sql)`. Он возвращает `{ data, error }`: для SELECT `data` — массив строк; для DDL `data` — пустой массив (`[]`).",
          "Создавайте клиент с `service_key` (только на стороне сервера)."
        ]
      },
      {
        heading: "Через curl",
        body: [
          "Его можно вызвать и напрямую, без SDK. Тело — `{ \"query\": \"<SQL>\" }`, заголовок — `apikey: <SERVICE_KEY>`. Ответ: при успехе `{ \"rows\": [...] }`, при ошибке `{ \"error\": \"...\" }` (HTTP 400)."
        ]
      },
      {
        heading: "Примечания и ограничения",
        body: [
          "— Авто-схемы НЕТ: если вы сделаете `insert` в несуществующую таблицу, она не создастся сама (REST → 404). Postgres требует явного `CREATE TABLE`.",
          "— Не работает с `anon_key` (403) — намеренно. Только `service_key`.",
          "— Запрос выполняется внутри транзакции под `service_role` и с `STATEMENT_TIMEOUT_MS` (по умолчанию 15с).",
          "— SQL Editor и Table Editor в Dashboard также работают через этот же endpoint."
        ]
      }
    ]
  }
};
