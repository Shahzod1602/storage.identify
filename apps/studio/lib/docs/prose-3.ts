type Prose = Record<string, { title: string; description: string; sections: { heading: string; body: string[] }[] }>;

export const EN: Prose = {
  "storage": {
    title: "Storage",
    description: "Manage file storage — buckets, upload, download, delete, and temporary access via signed URL. Both public and private buckets are supported. Through the REST API and SDK.",
    sections: [
      {
        heading: "Creating buckets",
        body: [
          "Creating a file storage bucket for your project is done with the `service_key`. If a bucket has `public:true`, files can be downloaded without authentication.",
          "The bucket identifier must start with an alphanumeric character, a dash, or a dot. Examples: `rasmlar`, `media-2024`, `data_v1.0`."
        ]
      },
      {
        heading: "Listing buckets",
        body: [
          "To get a list of all of the project's buckets, send a GET request. Every role (anon, authenticated, service_role) is allowed to make this request.",
          "For each bucket, the `id` and `public` properties are returned."
        ]
      },
      {
        heading: "Uploading files",
        body: [
          "To upload a file to a bucket, send a POST request with `anon` or `service_role` in the `apikey` header. The path is specified in the third segment: `/storage/v1/object/<bucket>/<path>`.",
          "If a file already exists it is updated (update); if not, a new one is added. The `Content-Type` is preserved automatically. The file is sent as a raw (binary) body — not JSON."
        ]
      },
      {
        heading: "Downloading files",
        body: [
          "Downloading files from a private bucket requires authentication — the `anon_key` or `service_key` in the `apikey` header. Files in a public bucket can be downloaded by anyone without authentication.",
          "Private file: `/storage/v1/object/<bucket>/<path>` (with a JWT). Public file: `/storage/v1/public/<bucket>/<path>` (without a JWT). The `Content-Type` is returned in the response headers."
        ]
      },
      {
        heading: "Deleting files",
        body: [
          "Deleting a file from a bucket is done with a DELETE request. To delete, you need either the user who stored the file or the `service_role` permission.",
          "The path is specified as: `/storage/v1/object/<bucket>/<path>`. On a successful delete, HTTP 204 (No Content) is returned."
        ]
      },
      {
        heading: "Signed URL — temporary access",
        body: [
          "A signed URL is used to create a temporary link to a private file. If an expiry is set for the link (for example, 1 hour), the token stops working after that time.",
          "Creating a signed URL is done with a POST request to `/storage/v1/object/sign/<bucket>/<path>`, with `expiresIn` (in seconds) specified. In response, a `signedUrl` (the full URL + token) is returned. The recipient can download the file via this URL without authentication."
        ]
      },
      {
        heading: "Primary access via public URL",
        body: [
          "If a bucket has `public: true`, the file can be downloaded directly via the `/storage/v1/public/<bucket>/<path>` path without authentication.",
          "This approach is convenient for permanent links and read-only content (images, PDFs, etc.). Files in a private bucket cannot be downloaded via a public URL — a signed URL or an authenticated download is required."
        ]
      }
    ]
  },
  "realtime": {
    title: "Realtime",
    description: "StorageDB Realtime — track PostgreSQL changes, message exchange between clients, and user state in real time.",
    sections: [
      {
        heading: "Introduction",
        body: [
          "The Realtime feature lets you receive changes in the PostgreSQL database, broadcast messages, and information about user state (presence) in real time.",
          "There are three main types of events: (1) Postgres Changes — for table changes, with RLS respected; (2) Broadcast — direct message exchange between clients; (3) Presence — tracking which users are active."
        ]
      },
      {
        heading: "WebSocket Connection",
        body: [
          "You need to connect to the Realtime service over WebSocket. The project reference (`<REF>`) and an API key (`<ANON_KEY>` or `<SERVICE_KEY>`) are passed in the URL.",
          "After connecting, the server sends a `ready` message, at which point you can send `subscribe`, `join`, and other commands."
        ]
      },
      {
        heading: "Postgres Changes",
        body: [
          "To track INSERT, UPDATE, or DELETE operations on a table, first call `realtime.enable('jadvalnomi')` in SQL, then `subscribe` to that table over WebSocket.",
          "RLS (Row Level Security) policies are respected — each user only receives the rows they are allowed to see. The service role, on the other hand, receives all rows.",
          "On UPDATE and DELETE events, `old_record` (the old values) is included, but for users under RLS only the primary key columns are sent (to keep data confidential)."
        ]
      },
      {
        heading: "Broadcast — Messages Between Clients",
        body: [
          "With the Broadcast service, users can send messages to one another without any connection to the database (for example, between players, to show cursors in real time).",
          "`join` a topic, then send a message with the `broadcast` command. Other users on the same topic receive this message.",
          "Broadcast is not stored on the server — it is only sent to active connections."
        ]
      },
      {
        heading: "Presence — Who Is Online",
        body: [
          "Through Presence, users can broadcast their own state (status, data) and track the states of others.",
          "Set your own state with `track(state)`, and get others' states via `presenceState()`. There can be multiple states for a single key (for example, one user connecting from multiple tabs).",
          "When a user disconnects, a `presence_leave` message is sent automatically."
        ]
      },
      {
        heading: "RLS and Security",
        body: [
          "Postgres Changes automatically respects RLS policies. A user using the anon key (public) only receives the rows they are allowed to see.",
          "The service key (secret) role applies `BYPASSRLS`, so it receives all rows.",
          "Each event is checked separately for each subscriber. On a DELETE event, since the row no longer exists, only the primary key columns are sent."
        ]
      }
    ]
  }
};

export const RU: Prose = {
  "storage": {
    title: "Storage",
    description: "Управление файловым хранилищем — bucket'ы, загрузка, скачивание, удаление, временный доступ через signed URL. Поддерживаются public и private bucket'ы. Через REST API и SDK.",
    sections: [
      {
        heading: "Создание bucket'ов",
        body: [
          "Создание bucket'а файлового хранилища для проекта выполняется с помощью `service_key`. Если у bucket'а `public:true`, файлы можно скачивать без аутентификации.",
          "Идентификатор bucket'а должен начинаться с буквенно-цифрового символа, дефиса или точки. Пример: `rasmlar`, `media-2024`, `data_v1.0`."
        ]
      },
      {
        heading: "Список bucket'ов",
        body: [
          "Чтобы получить список всех bucket'ов проекта, отправляется GET-запрос. Все роли (anon, authenticated, service_role) имеют право отправлять этот запрос.",
          "Для каждого bucket'а возвращаются свойства `id` и `public`."
        ]
      },
      {
        heading: "Загрузка файлов",
        body: [
          "Чтобы загрузить файл в bucket, отправляется POST-запрос с `anon` или `service_role` в заголовке `apikey`. Путь (path) указывается в третьем сегменте: `/storage/v1/object/<bucket>/<path>`.",
          "Если файл уже существует, он обновляется (update); если нет — добавляется новый. `Content-Type` сохраняется автоматически. Файл отправляется как сырое (binary) тело — не JSON."
        ]
      },
      {
        heading: "Скачивание файлов",
        body: [
          "Для скачивания файлов из private (приватного) bucket'а требуется аутентификация — `anon_key` или `service_key` в заголовке `apikey`. Файлы из public bucket'а может скачать кто угодно без аутентификации.",
          "Приватный файл: `/storage/v1/object/<bucket>/<path>` (с JWT). Публичный файл: `/storage/v1/public/<bucket>/<path>` (без JWT). В заголовках ответа возвращается `Content-Type`."
        ]
      },
      {
        heading: "Удаление файлов",
        body: [
          "Удаление файла из bucket'а выполняется через DELETE-запрос. Для удаления нужны права пользователя, который сохранил файл, либо `service_role`.",
          "Путь указывается так: `/storage/v1/object/<bucket>/<path>`. При успешном удалении возвращается HTTP 204 (No Content)."
        ]
      },
      {
        heading: "Signed URL — временный доступ",
        body: [
          "Для создания временной ссылки на приватный файл используется signed URL. Если для ссылки задан срок действия (например, 1 час), после этого времени токен перестаёт работать.",
          "Создание signed URL выполняется POST-запросом на `/storage/v1/object/sign/<bucket>/<path>`, с указанием `expiresIn` (в секундах). В результате возвращается `signedUrl` (полный URL + токен). Получатель может скачать файл по этому URL без аутентификации."
        ]
      },
      {
        heading: "Первичный доступ через public URL",
        body: [
          "Если у bucket'а `public: true`, файл можно скачать напрямую по пути `/storage/v1/public/<bucket>/<path>` без аутентификации.",
          "Этот способ удобен для постоянных (permanent) ссылок и контента только для чтения (read-only) — изображений, PDF и т. д. Файлы из private bucket'а нельзя скачать по public URL — нужен signed URL или аутентифицированное скачивание."
        ]
      }
    ]
  },
  "realtime": {
    title: "Realtime",
    description: "StorageDB Realtime — отслеживание изменений PostgreSQL, обмен сообщениями между клиентами и состояния пользователей в реальном времени.",
    sections: [
      {
        heading: "Введение",
        body: [
          "Функция Realtime даёт возможность в реальном времени получать изменения в базе данных PostgreSQL, broadcast-сообщения и информацию о состоянии пользователей (presence).",
          "Существует три основных типа событий: (1) Postgres Changes — для изменений в таблицах, RLS соблюдается; (2) Broadcast — прямой обмен сообщениями между клиентами; (3) Presence — отслеживание того, какие пользователи активны."
        ]
      },
      {
        heading: "WebSocket-подключение",
        body: [
          "К сервису Realtime нужно подключаться через WebSocket. В URL передаются project reference (`<REF>`) и API key (`<ANON_KEY>` или `<SERVICE_KEY>`).",
          "После подключения сервер отправляет сообщение `ready`, после чего вы можете отправлять команды `subscribe`, `join` и другие."
        ]
      },
      {
        heading: "Postgres Changes",
        body: [
          "Чтобы отслеживать операции INSERT, UPDATE или DELETE в таблице, сначала вызовите `realtime.enable('jadvalnomi')` в SQL, затем выполните `subscribe` на эту таблицу через WebSocket.",
          "Политики RLS (Row Level Security) соблюдаются — каждый пользователь получает только те строки, которые ему разрешено видеть. Service role же получает все строки.",
          "В событиях UPDATE и DELETE приходит `old_record` (старые значения), но для пользователей под RLS отправляются только столбцы primary key (ради конфиденциальности данных)."
        ]
      },
      {
        heading: "Broadcast — сообщения между клиентами",
        body: [
          "В сервисе Broadcast пользователи могут отправлять сообщения друг другу без связи с базой данных (например, между игроками, для показа курсоров в реальном времени).",
          "Выполните `join` к topic'у, затем отправьте сообщение командой `broadcast`. Другие пользователи в том же topic'е получают это сообщение.",
          "Broadcast не сохраняется на сервере — он отправляется только активным подключениям."
        ]
      },
      {
        heading: "Presence — кто онлайн",
        body: [
          "Через Presence пользователи могут транслировать своё состояние (статус, данные) и отслеживать состояния других.",
          "Задайте своё состояние с помощью `track(state)`, а состояния других получайте через `presenceState()`. Для одного key может быть несколько состояний (например, один пользователь подключается из нескольких вкладок).",
          "Когда пользователь отключается, автоматически отправляется сообщение `presence_leave`."
        ]
      },
      {
        heading: "RLS и безопасность",
        body: [
          "Postgres Changes автоматически соблюдает политики RLS. Пользователь, использующий anon key (открытый), получает только те строки, которые ему разрешено видеть.",
          "Роль service key (секретный) применяет `BYPASSRLS`, поэтому получает все строки.",
          "Каждое событие проверяется отдельно для каждого подписчика. В событии DELETE, поскольку строка уже исчезла, отправляются только столбцы primary key."
        ]
      }
    ]
  }
};
