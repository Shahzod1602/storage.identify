type Prose = Record<string, { title: string; description: string; sections: { heading: string; body: string[] }[] }>;

export const EN: Prose = {
  "rpc": {
    title: "RPC (Postgres functions)",
    description: "Run custom business logic by calling Postgres functions. Works with RLS and authentication, and supports functions that return scalar or SETOF values.",
    sections: [
      {
        heading: "RPC basics",
        body: [
          "RPC (Remote Procedure Call) is the ability to call Postgres functions over HTTP. A function you create in the storagedb SQL Editor can be called via `POST /v1/<REF>/rest/v1/rpc/<fn_name>`.",
          "When the HTTP request runs:",
          "1. `SET LOCAL ROLE <anon|authenticated|service_role>` — the user's role is set (RLS rules run under this role).",
          "2. `set_config('request.jwt.claims', <jwt>, true)` — the JWT claims are set on the session, so `auth.uid()` and other auth functions work.",
          "3. The Postgres function runs. A scalar-returning function (a single value) is returned directly; a SETOF or table-returning function returns an array.",
          "The function must first be created in the SQL Editor with `CREATE FUNCTION` or via meta/query."
        ]
      },
      {
        heading: "Creating a Postgres function",
        body: [
          "Create the function through the SQL Editor in storagedb. Below is a simple addition function in your own schema:",
          "This function lives in the `public` schema, and its parameter names match the variable names (the keys in the RPC POST body)."
        ]
      },
      {
        heading: "RPC: calling via curl",
        body: [
          "Send a POST request to `/rest/v1/rpc/<fn_name>`. The keys in the JSON body must be the function's parameter names.",
          "Add `apikey: <ANON_KEY>` or `apikey: <SERVICE_KEY>` to the headers.",
          "Scalar functions (returning a single value) return the value directly. SETOF functions return an array."
        ]
      },
      {
        heading: "RPC: calling with the Client SDK",
        body: [
          "In the storagedb Client SDK, use the `db.rpc(fnName, args)` method. It returns a Promise with a `{ data, error }` structure.",
          "In TypeScript, specify the return type with the generic `T`."
        ]
      },
      {
        heading: "RLS and authentication",
        body: [
          "An RPC call obeys **RLS (Row-Level Security)** rules. The role is set (`anon` for anon_key, `service_role` for service_key) and the JWT claims are set on the session.",
          "`service_key` bypasses RLS; all tables and columns are accessible.",
          "`anon_key` works with the user's identity — `auth.uid()` from the JWT claims is available and RLS rules are enforced.",
          "Inside the function, use the `auth.uid()` function: `SELECT auth.uid()` returns the UUID of the current user."
        ]
      },
      {
        heading: "Returning SETOF and arrays",
        body: [
          "If a function returns `SETOF <type>` or `TABLE(...)`, the RPC result is an array.",
          "SETOF scalar types (for example `SETOF text`) become an array.",
          "SETOF composite types (for example `SETOF user_profile`) become an array of objects."
        ]
      }
    ]
  },
  "auth": {
    title: "Authentication",
    description: "Sign-up, sign-in, working with tokens, and managing users. Email confirmation, password recovery, and RLS-role-based access.",
    sections: [
      {
        heading: "Core Concepts",
        body: [
          "storagedb uses Supabase-like JWT-based authentication. Each project is provisioned with its own `jwtSecret`, and tokens are signed with it.",
          "There are two types of API key: `anon_key` (public, client-side) and `service_key` (secret, server-side). The service key bypasses RLS constraints and is required for admin operations.",
          "Authentication is sent with a token in the `apikey` header or in the `Authorization: Bearer` format. The access token is valid for 1 hour and can be renewed with the `refresh_token`."
        ]
      },
      {
        heading: "Sign-up",
        body: [
          "A new user signs up via `POST /v1/<REF>/auth/v1/signup`. An email and a password of at least 6 characters are required.",
          "If `AUTH_AUTOCONFIRM=true`, the email is confirmed immediately and a session is issued. Otherwise a confirmation link is sent to the email, and `session` is `null`.",
          "The response returns `user` and `session` (if confirmed). Additional data is stored via `user_metadata`."
        ]
      },
      {
        heading: "Sign-in and Tokens",
        body: [
          "Signing in with email and password is done via `POST /v1/<REF>/auth/v1/token?grant_type=password`. If the email is not confirmed or the account is blocked, sign-in is rejected.",
          "On a successful sign-in, `access_token`, `refresh_token`, `expires_in` (3600 seconds), and the `user` data are returned.",
          "The access token is valid for 1 hour and can be renewed with the `refresh_token`: a new session is obtained with the `grant_type=refresh_token` query parameter. The old refresh token is revoked (rotation).",
          "On each request, the token is sent with the `Authorization: Bearer <access_token>` or `apikey: <access_token>` header."
        ]
      },
      {
        heading: "Email Confirmation and Password Recovery",
        body: [
          "If email confirmation is required on sign-up, a confirmation link is sent to the email. The link is in the format `GET /v1/<REF>/auth/v1/verify?token=<TOKEN>&type=signup`.",
          "When the user opens the link, the `token` confirms the email and a session is issued. After this, sign-in becomes possible.",
          "A user who has forgotten their password sends a recovery request via `POST /v1/<REF>/auth/v1/recover` (if the email exists, a link is sent; if not, it stays silent).",
          "The recovery link goes to `GET /v1/<REF>/auth/v1/verify?token=<TOKEN>&type=recovery`, and the user sets a new password with `POST /v1/<REF>/auth/v1/reset`. The recovery token is valid for 1 hour.",
          "When the password is changed, all old refresh tokens are revoked (sign-out from all devices)."
        ]
      },
      {
        heading: "Current User and Sign-out",
        body: [
          "With an access token, you can send a `GET /v1/<REF>/auth/v1/user` request to get information about the current user.",
          "To sign out, call `POST /v1/<REF>/auth/v1/logout`. This revokes all refresh tokens and returns a 204 response.",
          "On the client side, calling `db.auth.signOut()` clears the session and performs a logout on the server (even if it errors, the session is cleared)."
        ]
      },
      {
        heading: "Admin Operations",
        body: [
          "Admin operations are performed with the `service_key` (as a JWT in the apikey header). They bypass RLS constraints and allow full management of users.",
          "List users: `GET /v1/<REF>/auth/v1/admin/users?limit=100&offset=0`. Pagination can be controlled with limit and offset.",
          "Create a new user: with `POST /v1/<REF>/auth/v1/admin/users`, provide an email, a password, and optional metadata. The email is confirmed immediately.",
          "Update a user: via `PUT /v1/<REF>/auth/v1/admin/users/:id`, change the password, ban status, or metadata. `banned: true` blocks the account for 100 years.",
          "Delete a user: `DELETE /v1/<REF>/auth/v1/admin/users/:id`."
        ]
      },
      {
        heading: "RLS and Roles",
        body: [
          "storagedb uses PostgreSQL RLS (Row Level Security). Each request is executed according to the `role` claim in the JWT.",
          "There are three roles: `anon` (unauthenticated), `authenticated` (authenticated), `service_role` (admin, bypasses RLS).",
          "In an access token JWT, the role is automatically `authenticated`. For admin operations, the service_key is used (as a JWT, with `role: service_role`).",
          "In RLS policies, the `auth.uid()` function returns the user's ID. For example, the storage policy `owner_id = auth.uid()` filters the files belonging to that user.",
          "On a client-side authenticated request, the access token is automatically sent as the apikey (by the SDK)."
        ]
      }
    ]
  }
};

export const RU: Prose = {
  "rpc": {
    title: "RPC (функции Postgres)",
    description: "Выполнение пользовательской бизнес-логики через вызов функций Postgres. Работает с RLS и аутентификацией, поддерживает функции, возвращающие скалярные значения или SETOF.",
    sections: [
      {
        heading: "Основы RPC",
        body: [
          "RPC (Remote Procedure Call) — это возможность вызывать функции Postgres по HTTP. Функцию, созданную в SQL Editor storagedb, можно вызвать через `POST /v1/<REF>/rest/v1/rpc/<fn_name>`.",
          "При выполнении HTTP-запроса:",
          "1. `SET LOCAL ROLE <anon|authenticated|service_role>` — устанавливается роль пользователя (правила RLS работают под этой ролью).",
          "2. `set_config('request.jwt.claims', <jwt>, true)` — claim'ы JWT устанавливаются в сессию, поэтому `auth.uid()` и другие функции аутентификации работают.",
          "3. Выполняется функция Postgres. Функция, возвращающая скаляр (одно значение), возвращается напрямую; функция, возвращающая SETOF или таблицу, возвращает массив.",
          "Функцию нужно сначала создать в SQL Editor с помощью `CREATE FUNCTION` или через meta/query."
        ]
      },
      {
        heading: "Создание функции Postgres",
        body: [
          "Создайте функцию через SQL Editor в storagedb. Ниже — простая функция сложения в собственной схеме:",
          "Эта функция находится в схеме `public`, а имена её параметров совпадают с именами переменных (ключами в теле POST-запроса RPC)."
        ]
      },
      {
        heading: "RPC: вызов через curl",
        body: [
          "Отправьте POST-запрос на `/rest/v1/rpc/<fn_name>`. Ключи в JSON-теле должны быть именами параметров функции.",
          "Добавьте в заголовки `apikey: <ANON_KEY>` или `apikey: <SERVICE_KEY>`.",
          "Скалярные функции (возвращающие одно значение) возвращают значение напрямую. Функции SETOF возвращают массив."
        ]
      },
      {
        heading: "RPC: вызов через Client SDK",
        body: [
          "В Client SDK storagedb используйте метод `db.rpc(fnName, args)`. Он возвращает Promise со структурой `{ data, error }`.",
          "В TypeScript укажите возвращаемый тип через дженерик `T`."
        ]
      },
      {
        heading: "RLS и аутентификация",
        body: [
          "Вызов RPC подчиняется правилам **RLS (Row-Level Security)**. Устанавливается роль (`anon` для anon_key, `service_role` для service_key), а claim'ы JWT устанавливаются в сессию.",
          "`service_key` обходит RLS; доступны все таблицы и столбцы.",
          "`anon_key` работает с идентичностью пользователя — `auth.uid()` из claim'ов JWT доступен, и правила RLS контролируют доступ.",
          "Внутри функции используйте функцию `auth.uid()`: `SELECT auth.uid()` возвращает UUID текущего пользователя."
        ]
      },
      {
        heading: "Возврат SETOF и массивов",
        body: [
          "Если функция возвращает `SETOF <type>` или `TABLE(...)`, результат RPC будет массивом.",
          "Скалярные типы SETOF (например `SETOF text`) превращаются в массив.",
          "Составные типы SETOF (например `SETOF user_profile`) превращаются в массив объектов."
        ]
      }
    ]
  },
  "auth": {
    title: "Аутентификация",
    description: "Регистрация, вход, работа с токенами и управление пользователями. Подтверждение email, восстановление пароля и доступ на основе роли RLS.",
    sections: [
      {
        heading: "Основные понятия",
        body: [
          "storagedb использует JWT-аутентификацию, похожую на Supabase. Каждый проект обеспечивается собственным `jwtSecret`, и токены подписываются с его помощью.",
          "Существует два типа API-ключей: `anon_key` (публичный, на стороне клиента) и `service_key` (секретный, на стороне сервера). Service-ключ обходит ограничения RLS и необходим для административных операций.",
          "Аутентификация передаётся с токеном в заголовке `apikey` или в формате `Authorization: Bearer`. Access token действует 1 час и может быть обновлён с помощью `refresh_token`."
        ]
      },
      {
        heading: "Регистрация",
        body: [
          "Новый пользователь регистрируется через `POST /v1/<REF>/auth/v1/signup`. Требуются email и пароль не менее 6 символов.",
          "Если `AUTH_AUTOCONFIRM=true`, email подтверждается сразу и выдаётся сессия. В противном случае ссылка для подтверждения отправляется на email, а `session` будет `null`.",
          "В ответе возвращаются `user` и `session` (если подтверждено). Дополнительные данные сохраняются через `user_metadata`."
        ]
      },
      {
        heading: "Вход и токены",
        body: [
          "Вход по email и паролю выполняется через `POST /v1/<REF>/auth/v1/token?grant_type=password`. Если email не подтверждён или аккаунт заблокирован, вход отклоняется.",
          "При успешном входе возвращаются `access_token`, `refresh_token`, `expires_in` (3600 секунд) и данные `user`.",
          "Access token действует 1 час и может быть обновлён с помощью `refresh_token`: новая сессия получается с query-параметром `grant_type=refresh_token`. Старый refresh token аннулируется (ротация).",
          "В каждом запросе токен передаётся с заголовком `Authorization: Bearer <access_token>` или `apikey: <access_token>`."
        ]
      },
      {
        heading: "Подтверждение email и восстановление пароля",
        body: [
          "Если при регистрации требуется подтверждение email, ссылка для подтверждения отправляется на email. Ссылка имеет формат `GET /v1/<REF>/auth/v1/verify?token=<TOKEN>&type=signup`.",
          "Когда пользователь переходит по ссылке, `token` подтверждает email и выдаётся сессия. После этого вход становится возможен.",
          "Пользователь, забывший пароль, отправляет запрос на восстановление через `POST /v1/<REF>/auth/v1/recover` (если email существует, отправляется ссылка; если нет — остаётся без ответа).",
          "Ссылка восстановления ведёт на `GET /v1/<REF>/auth/v1/verify?token=<TOKEN>&type=recovery`, и пользователь устанавливает новый пароль через `POST /v1/<REF>/auth/v1/reset`. Recovery token действует 1 час.",
          "При смене пароля все старые refresh-токены аннулируются (выход со всех устройств)."
        ]
      },
      {
        heading: "Текущий пользователь и выход",
        body: [
          "С access token'ом можно отправить запрос `GET /v1/<REF>/auth/v1/user` и получить информацию о текущем пользователе.",
          "Для выхода вызывается `POST /v1/<REF>/auth/v1/logout`. Это аннулирует все refresh-токены и возвращает ответ 204.",
          "На стороне клиента вызов `db.auth.signOut()` очищает сессию и выполняет выход на сервере (даже при ошибке сессия очищается)."
        ]
      },
      {
        heading: "Административные операции",
        body: [
          "Административные операции выполняются с `service_key` (как JWT в заголовке apikey). Они обходят ограничения RLS и позволяют полностью управлять пользователями.",
          "Список пользователей: `GET /v1/<REF>/auth/v1/admin/users?limit=100&offset=0`. Пагинацией можно управлять с помощью limit и offset.",
          "Создание нового пользователя: через `POST /v1/<REF>/auth/v1/admin/users` передаются email, пароль и опциональные метаданные. Email подтверждается сразу.",
          "Обновление пользователя: через `PUT /v1/<REF>/auth/v1/admin/users/:id` изменяются пароль, статус блокировки или метаданные. `banned: true` блокирует аккаунт на 100 лет.",
          "Удаление пользователя: `DELETE /v1/<REF>/auth/v1/admin/users/:id`."
        ]
      },
      {
        heading: "RLS и роли",
        body: [
          "storagedb использует PostgreSQL RLS (Row Level Security). Каждый запрос выполняется в соответствии с claim'ом `role` в JWT.",
          "Существует три роли: `anon` (неаутентифицированный), `authenticated` (аутентифицированный), `service_role` (админ, обходит RLS).",
          "В JWT access token'а роль автоматически становится `authenticated`. Для административных действий используется service_key (как JWT, с `role: service_role`).",
          "В политиках RLS функция `auth.uid()` возвращает ID пользователя. Например, политика storage `owner_id = auth.uid()` фильтрует файлы, принадлежащие этому пользователю.",
          "При аутентифицированном запросе на стороне клиента access token автоматически отправляется как apikey (силами SDK)."
        ]
      }
    ]
  }
};
