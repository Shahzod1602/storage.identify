type Prose = Record<string, { title: string; description: string; sections: { heading: string; body: string[] }[] }>;

export const EN: Prose = {
  "getting-started": {
    title: "Getting Started",
    description: "Learn what storagedb is, how a project is created, and how to work with the API. A self-hosted Supabase alternative — Postgres, REST API, Auth, Storage, Realtime, and a Dashboard.",
    sections: [
      {
        heading: "What is storagedb?",
        body: [
          "storagedb is a self-hosted Supabase alternative written from scratch. A single server serves many projects: each project lives in its own Postgres database. You only pay for the VPS — there is no cloud subscription fee.",
          "Key features:",
          "- Multi-tenancy: each project = a separate `proj_<ref>` database with strong isolation",
          "- REST API: automatic CRUD, filters, RLS (Row Level Security)",
          "- Auth: signup/login/JWT/password reset",
          "- Storage: file storage, public/private access, signed URLs",
          "- Realtime: listen to table changes over WebSocket",
          "- Dashboard (Studio): written in Next.js, manages projects, tables, and users"
        ]
      },
      {
        heading: "Creating a project",
        body: [
          "There are two ways to create a project in storagedb: through the Dashboard or through the API.",
          "When you create a project via the API, the server returns an `anon_key` (public, RLS is applied) and a `service_key` (secret, bypasses RLS). Store these keys securely — if you lose them, request new keys by calling the API with an `x-admin-token` or by logging in.",
          "Once the project is created, its API URL becomes `https://storage.identify.uz/v1/<REF>` (BASE = https://storage.identify.uz)."
        ]
      },
      {
        heading: "API URL and keys",
        body: [
          "Each project's API URL is: `https://storage.identify.uz/v1/<REF>`",
          "To use this URL in your API headers:",
          "- Send the key in the `apikey` header (curl: `-H \"apikey: <KEY>\"`)",
          "- In the SDK, initialize the client with the URL and key",
          "Difference between anon_key and service_key:",
          "- anon_key: public key, used client-side, RLS policies are applied (sees only its own data)",
          "- service_key: secret key, used on the backend, bypasses RLS (for admin operations)"
        ]
      },
      {
        heading: "First request: REST API with curl",
        body: [
          "Once you have created a table in your project, fetching data via the REST API is easy:",
          "REST requests follow the PostgREST style: GET/POST/PATCH/DELETE.",
          "Filters: `?column=eq.value` (equals), `gt` (greater than), `lt` (less than), `like` (match), `in.(a,b)` (in list), and others.",
          "RLS is applied automatically — if you make a request with the anon_key, you only get your own data."
        ]
      },
      {
        heading: "Installing and using the SDK",
        body: [
          "In Node.js, React, Vue, or any JavaScript environment, you can install and use the `@storagedb/client` SDK.",
          "The SDK is similar to supabase-js — you create a client with `createClient(apiUrl, apiKey)` and use methods like `from()`, `insert()`, `select()`, and so on.",
          "The SDK also provides authentication, storage, realtime, and RPC (Postgres functions) capabilities."
        ]
      },
      {
        heading: "Auth, Storage, Realtime — quick examples",
        body: [
          "storagedb is not limited to the REST API alone. It also provides authentication, file storage, and real-time change notifications.",
          "AUTH: users sign up, log in, and receive a JWT token. RLS rules are defined using `auth.uid()`.",
          "STORAGE: file storage, public/private access, signed URLs (time-limited links).",
          "REALTIME: listen to table changes in real time over WebSocket."
        ]
      }
    ]
  },
  "rest": {
    title: "REST API",
    description: "The storagedb REST API — PostgREST-style automatic CRUD, filters, RLS, and embedded joins. Every request automatically applies the RLS policies of the project's database.",
    sections: [
      {
        heading: "Main API Path",
        body: [
          "The storagedb REST API implements the PostgREST standard. You can manage every table automatically through a REST CRUD endpoint.",
          "API URL format: `BASE/v1/<REF>/rest/v1/<TABLE>`, where:",
          "— `BASE` = the main server (for example `https://storage.identify.uz`)",
          "— `<REF>` = your project identifier (provided when the project is created)",
          "— `<TABLE>` = the Postgres table name",
          "All requests run inside a transaction: the role is set, JWT claims are prepared, and then Postgres RLS automatically enforces access control.",
          "Keys are sent in the `apikey:` header. `anon_key` = public (client-side), `service_key` = for service use (bypasses RLS)."
        ]
      },
      {
        heading: "GET — Queries and Filters",
        body: [
          "Reads rows from a table. Without a select parameter it returns all columns.",
          "— `select=col1,col2` — specific columns (comma-separated). `*` or empty = all columns.",
          "— Filters: in the `?column=op.value` format. Operators: `eq` (equal), `neq` (not equal), `gt` (greater than), `gte` (greater than or equal), `lt` (less than), `lte` (less than or equal), `like` (pattern, `*` = `%`), `ilike` (case-insensitive), `in.(a,b,c)` (in a list), `is.null` / `is.true` / `is.false`.",
          "— JSON columns: `?meta->>author=eq.Ali` (JSON path → text).",
          "— Full-text search: `?body=fts.olma` (to_tsquery), `?body=plfts.olma boshqa` (plainto_tsquery), `?body=wfts.olma` (websearch_to_tsquery).",
          "— Negation: `?views=not.gt.10` (NOT views > 10).",
          "— OR groups: `?or=(age.gt.18,age.lt.5)` (age > 18 OR age < 5).",
          "— Ordering: `?order=id.asc,name.desc` (one or more columns, `.asc` / `.desc`).",
          "— Pagination: `?limit=10&offset=20` (rows 40–49).",
          "— Counting: `?count=exact` (exact total) or `?count=estimated` (fast estimate from pg_class). If the status is 206, the result is partial; if 200, it is within the limit. The response comes with a `Content-Range: START-END/TOTAL` header."
        ]
      },
      {
        heading: "POST — Inserting",
        body: [
          "Adds new rows to tables. The body is JSON: a single object or an array.",
          "— Currently `Prefer: return=representation` is applied automatically, so the created rows are returned.",
          "— Example errors: unique constraint (409), foreign key (409), not-null violation (400), check constraint (400)."
        ]
      },
      {
        heading: "PATCH/PUT — Update",
        body: [
          "Updates existing rows. Use filters in the URL to specify which rows to change.",
          "— Body: a JSON object (which columns to change).",
          "— For example, a filter is required: `?id=eq.5` (update the row where id=5).",
          "— Currently `Prefer: return=representation` is automatic, so the updated rows are returned."
        ]
      },
      {
        heading: "DELETE — Removing",
        body: [
          "Deletes rows. Filters work the same as with PATCH.",
          "— Currently `Prefer: return=representation` is automatic, so the deleted rows are returned.",
          "— Caution: if there is no filter, **the entire table is deleted**."
        ]
      },
      {
        heading: "Embedded Joins (Foreign Keys)",
        body: [
          "In a SELECT you specify related tables. `select=*,related_table(*)` — adds rows linked via a FK as JSON.",
          "— To-one: a single row. For example, `books.select='*,author(id,name)'` — each book together with the author's data.",
          "— To-many: an array of rows. For example, `users.select='*,posts(*)'` — each user together with all of their posts.",
          "— The system introspects the FKs. A FK on the base table → one; a reverse FK → many."
        ]
      },
      {
        heading: "RPC — Postgres Functions",
        body: [
          "Calls functions written in Postgres. The role and JWT claims are set here, so `auth.uid()` and `auth.role()` are recorded.",
          "— Endpoint: `POST /v1/<REF>/rest/v1/rpc/<fn>`.",
          "— Body: JSON `{param1: val1, param2: val2}` — named parameters.",
          "— Scalar return (1 row, 1 column) → returns the value directly. Otherwise → an array of rows."
        ]
      },
      {
        heading: "RLS (Row-Level Security) — Automatic Protection",
        body: [
          "Every request is executed with RLS policies. On every request the system:",
          "— Sets the role (`anon`, `authenticated`, or `service_role`).",
          "— Puts the JWT claims into the Postgres `request.jwt.claims` variable.",
          "— Only `service_role` bypasses RLS (BYPASSRLS).",
          "— For example, `create policy 'users_own' on todos for select using (auth.uid() = user_id)` — a user sees only their own todos.",
          "— Requests originating from the `anon_key` run with the `anon` role → core restrictions from the RLS policies apply."
        ]
      },
      {
        heading: "Error Codes",
        body: [
          "Postgres error codes are translated into HTTP statuses:",
          "— 400: Syntax error, undefined column, invalid type cast, not-null violation, check constraint.",
          "— 403: insufficient_privilege (RLS — not supported)",
          "— 404: undefined_table.",
          "— 409: unique_violation, foreign_key_violation.",
          "— 405: unsupported HTTP method.",
          "— 500: Unknown error."
        ]
      },
      {
        heading: "API Documentation and Swagger",
        body: [
          "storagedb automatically generates an OpenAPI specification. A Swagger UI is available for each project.",
          "— OpenAPI JSON: `GET /v1/<REF>/openapi.json?apikey=<anon_key>`.",
          "— Swagger UI: `/v1/<REF>/docs?apikey=<anon_key>` — interactive and ready to test."
        ]
      }
    ]
  }
};

export const RU: Prose = {
  "getting-started": {
    title: "Начало работы",
    description: "Узнайте, что такое storagedb, как создаётся проект и как работать с API. Self-hosted-альтернатива Supabase — Postgres, REST API, Auth, Storage, Realtime и Dashboard.",
    sections: [
      {
        heading: "Что такое storagedb?",
        body: [
          "storagedb — это self-hosted-альтернатива Supabase, написанная с нуля. Один сервер обслуживает множество проектов: каждый проект размещается в собственной базе данных Postgres. Вы платите только за VPS — никакой платы за облачную подписку нет.",
          "Основные возможности:",
          "- Мультитенантность: каждый проект = отдельная база `proj_<ref>` со строгой изоляцией",
          "- REST API: автоматический CRUD, фильтры, RLS (Row Level Security)",
          "- Auth: регистрация/вход/JWT/сброс пароля",
          "- Storage: хранение файлов, public/private-доступ, signed URL",
          "- Realtime: прослушивание изменений таблиц через WebSocket",
          "- Dashboard (Studio): написан на Next.js, управляет проектами, таблицами и пользователями"
        ]
      },
      {
        heading: "Создание проекта",
        body: [
          "В storagedb есть два способа создать проект: через Dashboard или через API.",
          "При создании проекта через API сервер возвращает `anon_key` (публичный, применяется RLS) и `service_key` (секретный, обходит RLS). Храните эти ключи в безопасности — если вы их потеряете, получите новые ключи, обратившись к API с `x-admin-token` или через вход в систему.",
          "После создания проекта его API URL становится `https://storage.identify.uz/v1/<REF>` (BASE = https://storage.identify.uz)."
        ]
      },
      {
        heading: "API URL и ключи",
        body: [
          "API URL каждого проекта: `https://storage.identify.uz/v1/<REF>`",
          "Чтобы использовать этот URL в заголовках API:",
          "- Отправляйте ключ в заголовке `apikey` (curl: `-H \"apikey: <KEY>\"`)",
          "- В SDK при создании клиента инициализируйте его с URL и ключом",
          "Разница между anon_key и service_key:",
          "- anon_key: публичный ключ, используется на стороне клиента, применяются политики RLS (видит только свои данные)",
          "- service_key: секретный ключ, используется на бэкенде, обходит RLS (для административных операций)"
        ]
      },
      {
        heading: "Первый запрос: REST API с curl",
        body: [
          "После того как вы создали таблицу в проекте, получать данные через REST API легко:",
          "REST-запросы выполнены в стиле PostgREST: GET/POST/PATCH/DELETE.",
          "Фильтры: `?column=eq.value` (равно), `gt` (больше), `lt` (меньше), `like` (совпадение), `in.(a,b)` (в списке) и другие.",
          "RLS применяется автоматически — если вы делаете запрос с anon_key, вы получаете только свои данные."
        ]
      },
      {
        heading: "Установка и использование SDK",
        body: [
          "В Node.js, React, Vue или любой среде JavaScript вы можете установить и использовать SDK `@storagedb/client`.",
          "SDK похож на supabase-js — вы создаёте клиент с помощью `createClient(apiUrl, apiKey)` и используете методы `from()`, `insert()`, `select()` и так далее.",
          "SDK также предоставляет возможности аутентификации, storage, realtime и RPC (функции Postgres)."
        ]
      },
      {
        heading: "Auth, Storage, Realtime — краткие примеры",
        body: [
          "storagedb не ограничивается только REST API. Он также обеспечивает аутентификацию, хранение файлов и уведомления об изменениях в реальном времени.",
          "AUTH: пользователи регистрируются, входят в систему и получают JWT-токен. Правила RLS определяются с помощью `auth.uid()`.",
          "STORAGE: хранение файлов, public/private-доступ, signed URL (ссылка с ограниченным сроком действия).",
          "REALTIME: прослушивание изменений таблиц в реальном времени через WebSocket."
        ]
      }
    ]
  },
  "rest": {
    title: "REST API",
    description: "REST API storagedb — автоматический CRUD в стиле PostgREST, фильтры, RLS и embedded joins. Каждый запрос автоматически применяет политики RLS базы данных проекта.",
    sections: [
      {
        heading: "Основной путь API",
        body: [
          "REST API storagedb реализует стандарт PostgREST. Каждой таблицей можно управлять автоматически через REST CRUD-эндпоинт.",
          "Формат API URL: `BASE/v1/<REF>/rest/v1/<TABLE>`, где:",
          "— `BASE` = основной сервер (например `https://storage.identify.uz`)",
          "— `<REF>` = идентификатор вашего проекта (выдаётся при создании проекта)",
          "— `<TABLE>` = имя таблицы Postgres",
          "Все запросы выполняются в транзакции: устанавливается роль, подготавливаются JWT claims, после чего Postgres RLS автоматически контролирует доступ.",
          "Ключи отправляются в заголовке `apikey:`. `anon_key` = публичный (на стороне клиента), `service_key` = для служебного использования (обходит RLS)."
        ]
      },
      {
        heading: "GET — Запросы и фильтры",
        body: [
          "Читает строки из таблицы. Без параметра select возвращаются все столбцы.",
          "— `select=col1,col2` — определённые столбцы (через запятую). `*` или пусто = все столбцы.",
          "— Фильтры: в формате `?column=op.value`. Операторы: `eq` (равно), `neq` (не равно), `gt` (больше), `gte` (больше или равно), `lt` (меньше), `lte` (меньше или равно), `like` (шаблон, `*` = `%`), `ilike` (без учёта регистра), `in.(a,b,c)` (из списка), `is.null` / `is.true` / `is.false`.",
          "— JSON-столбцы: `?meta->>author=eq.Ali` (JSON path → текст).",
          "— Полнотекстовый поиск: `?body=fts.olma` (to_tsquery), `?body=plfts.olma boshqa` (plainto_tsquery), `?body=wfts.olma` (websearch_to_tsquery).",
          "— Отрицание: `?views=not.gt.10` (NOT views > 10).",
          "— OR-группы: `?or=(age.gt.18,age.lt.5)` (age > 18 OR age < 5).",
          "— Сортировка: `?order=id.asc,name.desc` (один или несколько столбцов, `.asc` / `.desc`).",
          "— Пагинация: `?limit=10&offset=20` (строки 40–49).",
          "— Подсчёт: `?count=exact` (точное общее число) или `?count=estimated` (быстрая оценка из pg_class). Если статус 206 — результат частичный; если 200 — он в пределах лимита. Ответ приходит с заголовком `Content-Range: START-END/TOTAL`."
        ]
      },
      {
        heading: "POST — Вставка",
        body: [
          "Добавляет новые строки в таблицы. Тело — JSON: один объект или массив.",
          "— В настоящее время `Prefer: return=representation` применяется автоматически, поэтому созданные строки возвращаются.",
          "— Примеры ошибок: unique constraint (409), foreign key (409), not-null violation (400), check constraint (400)."
        ]
      },
      {
        heading: "PATCH/PUT — Обновление",
        body: [
          "Обновляет существующие строки. С помощью фильтров в URL укажите, какие строки изменить.",
          "— Тело: JSON-объект (какие столбцы изменить).",
          "— Например, требуется фильтр: `?id=eq.5` (обновить строку, где id=5).",
          "— В настоящее время `Prefer: return=representation` применяется автоматически, поэтому обновлённые строки возвращаются."
        ]
      },
      {
        heading: "DELETE — Удаление",
        body: [
          "Удаляет строки. Фильтры работают так же, как в PATCH.",
          "— В настоящее время `Prefer: return=representation` применяется автоматически, поэтому удалённые строки возвращаются.",
          "— Осторожно: если фильтра нет, **удаляется вся таблица**."
        ]
      },
      {
        heading: "Embedded Joins (внешние ключи)",
        body: [
          "В SELECT нужно указать связанные таблицы. `select=*,related_table(*)` — добавляет строки, связанные через FK, в виде JSON.",
          "— To-one: одна строка. Например, `books.select='*,author(id,name)'` — каждая книга вместе с данными автора.",
          "— To-many: массив строк. Например, `users.select='*,posts(*)'` — каждый пользователь вместе со всеми его постами.",
          "— Система выполняет интроспекцию FK. FK базовой таблицы → one; обратный FK → many."
        ]
      },
      {
        heading: "RPC — функции Postgres",
        body: [
          "Вызов функций, написанных на Postgres. Здесь устанавливаются роль и JWT claims, поэтому `auth.uid()` и `auth.role()` фиксируются.",
          "— Эндпоинт: `POST /v1/<REF>/rest/v1/rpc/<fn>`.",
          "— Тело: JSON `{param1: val1, param2: val2}` — именованные параметры.",
          "— Скалярный возврат (1 строка, 1 столбец) → возвращает значение напрямую. Иначе → массив строк."
        ]
      },
      {
        heading: "RLS (Row-Level Security) — автоматическая защита",
        body: [
          "Каждый запрос выполняется с политиками RLS. При каждом запросе система:",
          "— Устанавливает роль (`anon`, `authenticated` или `service_role`).",
          "— Помещает JWT claims в переменную Postgres `request.jwt.claims`.",
          "— Только `service_role` обходит RLS (BYPASSRLS).",
          "— Например, `create policy 'users_own' on todos for select using (auth.uid() = user_id)` — пользователь видит только свои todos.",
          "— Запросы, исходящие от `anon_key`, выполняются с ролью `anon` → применяются основные ограничения из политик RLS."
        ]
      },
      {
        heading: "Коды ошибок",
        body: [
          "Коды ошибок Postgres преобразуются в HTTP-статусы:",
          "— 400: Syntax error, undefined column, invalid type cast, not-null violation, check constraint.",
          "— 403: insufficient_privilege (RLS — не поддерживается)",
          "— 404: undefined_table.",
          "— 409: unique_violation, foreign_key_violation.",
          "— 405: неподдерживаемый HTTP-метод.",
          "— 500: Неизвестная ошибка."
        ]
      },
      {
        heading: "Документация API и Swagger",
        body: [
          "storagedb автоматически генерирует спецификацию OpenAPI. Для каждого проекта доступен Swagger UI.",
          "— OpenAPI JSON: `GET /v1/<REF>/openapi.json?apikey=<anon_key>`.",
          "— Swagger UI: `/v1/<REF>/docs?apikey=<anon_key>` — интерактивный, готов к тестированию."
        ]
      }
    ]
  }
};
