import type { DocPage } from "./docs-types";

export const DOCS: DocPage[] = [
  {
    "slug": "getting-started",
    "title": "Boshlash",
    "description": "storagedb nima ekanini, loyiha qanday yaratilishini, API bilan qanday ishlanishini o'rganib oling. Self-hosted Supabase muqobili — Postgres, REST API, Auth, Storage, Realtime va Dashboard.",
    "sections": [
      {
        "heading": "storagedb nima?",
        "body": [
          "storagedb — noldan yozilgan, self-hosted Supabase muqobili. Bitta serverda ko'p loyihaga xizmat qiladi: har loyiha alohida Postgres bazasida joylashadi. Siz faqat VPS puli to'lasiz, bulutga obuna puli yo'q.",
          "Asosiy xususiyatlar:",
          "- Multi-tenancy: har loyiha = kuchli izolyatsiya bilan alohida `proj_<ref>` bazasi",
          "- REST API: avtomatik CRUD, filtrlar, RLS (Row Level Security)",
          "- Auth: signup/login/JWT/password reset",
          "- Storage: fayl saqlash, public/private access, signed URL",
          "- Realtime: WebSocket orqali jadval o'zgarishlarini tinglash",
          "- Dashboard (Studio): Next.js'da yozilgan, loyihalar, jadvallar, foydalanuvchilar boshqarish"
        ]
      },
      {
        "heading": "Loyiha yaratish",
        "body": [
          "storagedb'da loyiha yaratishning ikki yo'li bor: Dashboard orqali yoki API orqali.",
          "API orqali loyiha yaratganda, server sizga `anon_key` (ommaviy, RLS qo'llaniladi) va `service_key` (maxfiy, RLS chetlab o'tadi) qaytaradi. Bu kalitlarni xavfsiz saqlang — ularni yo'qotib qo'ysangiz, `x-admin-token` yoki login bilan API'ga murojaat qilib yangi kalitlarni oling.",
          "Loyiha yaratilgandan so'ng, uning API URL'i `https://storage.identify.uz/v1/<REF>` bo'ladi (BASE = https://storage.identify.uz)."
        ],
        "examples": [
          {
            "title": "POST /admin/projects (API orqali loyiha yaratish)",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/admin/projects \\\n  -H 'Content-Type: application/json' \\\n  -H 'x-admin-token: <ADMIN_TOKEN>' \\\n  -d '{\"name\":\"Mening app'm\"}'\n\n# Javob:\n{\n  \"ref\": \"proj_abc123xyz\",\n  \"name\": \"Mening app'm\",\n  \"anon_key\": \"eyJhbGc...\",\n  \"service_key\": \"eyJhbGc...\",\n  \"api_url\": \"/v1/proj_abc123xyz\"\n}"
          }
        ]
      },
      {
        "heading": "API URL va kalitlar",
        "body": [
          "Har loyihaning API URL'i: `https://storage.identify.uz/v1/<REF>`",
          "Bu URL'ni API sarlavhalarida amal qilish uchun:",
          "- `apikey` sarlavhasida kalit yuboring (curl: `-H \"apikey: <KEY>\"`)",
          "- SDK'da client yaratganda URL va kalit bilan initialize qiling",
          "anon_key va service_key farqi:",
          "- anon_key: ommaviy kalit, client-side ishlatiladi, RLS siyosatlari qo'llaniladi (faqat o'zining ma'lumotlarini ko'radi)",
          "- service_key: maxfiy kalit, backend'da ishlatiladi, RLS chetlab o'tadi (admin operatsiyalari uchun)"
        ]
      },
      {
        "heading": "Birinchi so'rov: curl bilan REST API",
        "body": [
          "Loyihada jadval yaratganingizdan so'ng, REST API orqali ma'lumot olish oson:",
          "REST so'rovlari PostgREST uslubida: GET/POST/PATCH/DELETE.",
          "Filtrlar: `?column=eq.value` (teng), `gt` (katta), `lt` (kichik), `like` (mos), `in.(a,b)` (ro'yxatda) va boshqalar.",
          "RLS avtomatik qo'llaniladi — anon_key bilan so'rov qilsangiz, faqat o'zining ma'lumotlarini olasiz."
        ],
        "examples": [
          {
            "title": "GET - jadvaldan o'qish",
            "lang": "bash",
            "code": "curl \"https://storage.identify.uz/v1/proj_abc123xyz/rest/v1/todos?select=id,title,done\" \\\n  -H \"apikey: <ANON_KEY>\"\n\n# Javob:\n[\n  {\"id\": 1, \"title\": \"Dars o'qish\", \"done\": false},\n  {\"id\": 2, \"title\": \"Kod yozish\", \"done\": true}\n]"
          },
          {
            "title": "POST - yangi qator qo'shish",
            "lang": "bash",
            "code": "curl -X POST \"https://storage.identify.uz/v1/proj_abc123xyz/rest/v1/todos\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"title\":\"Shoppingga borish\",\"done\":false}'\n\n# Javob: yoyilgan qator\n{\"id\": 3, \"title\": \"Shoppingga borish\", \"done\": false}"
          },
          {
            "title": "PATCH - qatorni tahrirlash",
            "lang": "bash",
            "code": "curl -X PATCH \"https://storage.identify.uz/v1/proj_abc123xyz/rest/v1/todos?id=eq.1\" \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"done\":true}'"
          },
          {
            "title": "DELETE - qatorni o'chirish",
            "lang": "bash",
            "code": "curl -X DELETE \"https://storage.identify.uz/v1/proj_abc123xyz/rest/v1/todos?id=eq.1\" \\\n  -H \"apikey: <ANON_KEY>\""
          }
        ]
      },
      {
        "heading": "SDK o'rnatish va ishlatish",
        "body": [
          "Node.js, React, Vue yoki har qanday JavaScript muhitida, `@storagedb/client` SDK'ni o'rnatib ishlatishingiz mumkin.",
          "SDK supabase-js'ga o'xshaydi — `createClient(apiUrl, apiKey)` bilan client yaratib, `from()`, `insert()`, `select()` va h.k. metodlardan foydalanasiz.",
          "SDK shuningdek authentication, storage, realtime va RPC (Postgres funksiyalari) imkoniyatlarini taqdim etadi."
        ],
        "examples": [
          {
            "title": "npm o'rnatish",
            "lang": "bash",
            "code": "npm install @storagedb/client"
          },
          {
            "title": "Client yaratish va SELECT",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/proj_abc123xyz\",\n  \"<ANON_KEY>\"\n);\n\n// Jadvaldagi barcha qatorlarni olish\nconst { data, error } = await db.from(\"todos\").select(\"*\");\nif (error) console.error(error);\nelse console.log(data); // [{ id: 1, ... }, ...]"
          },
          {
            "title": "INSERT - ma'lumot qo'shish",
            "lang": "ts",
            "code": "const { data, error } = await db.from(\"todos\").insert({\n  title: \"Yangi vazifa\",\n  done: false\n});\n\nif (!error) console.log(\"Qo'shildi:\", data);"
          },
          {
            "title": "Filtrlar va ordering",
            "lang": "ts",
            "code": "// Faqat bajarilmagan vazifalarni, keyin ID bo'yicha tartiblash\nconst { data } = await db\n  .from(\"todos\")\n  .select(\"*\")\n  .eq(\"done\", false)\n  .order(\"id\", { ascending: false })\n  .limit(10);"
          },
          {
            "title": "UPDATE va DELETE",
            "lang": "ts",
            "code": "// Yangilash\nawait db.from(\"todos\")\n  .update({ done: true })\n  .eq(\"id\", 1);\n\n// O'chirish\nawait db.from(\"todos\")\n  .delete()\n  .eq(\"id\", 1);"
          }
        ]
      },
      {
        "heading": "Auth, Storage, Realtime — qisqa namunalar",
        "body": [
          "storagedb faqat REST API bilan cheklanmaydi. Shuningdek authentication, fayl saqlash va real-time o'zgarish notifikatsiyalarini ta'minlaydi.",
          "AUTH: foydalanuvchilar ro'yxatdan o'tadi, login qiladi, JWT token oladi. RLS qaidalar `auth.uid()` yordamida aniqlanadi.",
          "STORAGE: fayllar saqlash, public/private access, signed URL (vaqtli havola).",
          "REALTIME: WebSocket orqali jadval o'zgarishlarini real vaqtda tinglash."
        ],
        "examples": [
          {
            "title": "Auth - signup va login (SDK)",
            "lang": "ts",
            "code": "// Ro'yxatdan o'tish\nconst { data, error } = await db.auth.signUp({\n  email: \"user@example.com\",\n  password: \"secure123\"\n});\n\n// Login\nconst { data: session } = await db.auth.signInWithPassword({\n  email: \"user@example.com\",\n  password: \"secure123\"\n});\n// session.access_token — keyingi so'rovlarda ishlating"
          },
          {
            "title": "Storage - fayl yuklash (curl)",
            "lang": "bash",
            "code": "# Avval bucket yarating\ncurl -X POST \"https://storage.identify.uz/v1/proj_abc123xyz/storage/v1/bucket\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"id\":\"rasmlar\",\"public\":true}'\n\n# Keyin fayl yuboring\ncurl -X POST \"https://storage.identify.uz/v1/proj_abc123xyz/storage/v1/object/rasmlar/mening-rasm.jpg\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  --data-binary @mening-rasm.jpg\n\n# Public URL: https://storage.identify.uz/v1/proj_abc123xyz/storage/v1/public/rasmlar/mening-rasm.jpg"
          },
          {
            "title": "Realtime - jadval o'zgarishlarini tinglash (SDK)",
            "lang": "ts",
            "code": "// Kanal yaratib, INSERT hodisalarini obuna qiling\nconst channel = db.channel(\"todos\")\n  .on(\"INSERT\", (payload) => {\n    console.log(\"Yangi vazifa:\", payload.record);\n  })\n  .on(\"UPDATE\", (payload) => {\n    console.log(\"Yangilandi:\", payload.record);\n  })\n  .subscribe();\n\n// So'rovning oxiridagi olib tashlash uchun\nawait channel.unsubscribe();"
          }
        ]
      }
    ]
  },
  {
    "slug": "rest",
    "title": "REST API",
    "description": "storagedb REST API — PostgREST uslubidagi avtomatik CRUD, filtrlar, RLS va embedded joins. Har so'rov loyihaning database'ining RLS siyosatlarini avtomatik qo'llaydi.",
    "sections": [
      {
        "heading": "Asosiy API Yo'li",
        "body": [
          "storagedb REST API PostgREST standartini tadbiq etadi. Har jadvalni avtomatik REST CRUD endpointi orqali boshqara olasiz.",
          "API URL formati: `BASE/v1/<REF>/rest/v1/<TABLE>`, bu yerda:",
          "— `BASE` = asosiy server (masalan `https://storage.identify.uz`)",
          "— `<REF>` = loyiha identifikatoriñiz (loyihani yaratganda beriladi)",
          "— `<TABLE>` = Postgres jadval nomi",
          "Barcha so'rovlar tranzaksiyada bajariladi: rol o'rnatiladi, JWT claim'lari tayyyorlansa, keyin Postgres RLS avtomatik nazorat qiladi.",
          "Kalitlar `apikey:` header'ida yuboriladi. `anon_key` = ommaviy (client-side), `service_key` = xizmat uchun (RLS'ni chetlab o'tadi)."
        ]
      },
      {
        "heading": "GET — So'rovlar va Filtrlar",
        "body": [
          "Jadvaldagi qatorlarni o'qiydi. Select parametri siz hamma ustunlarni qaytaradi.",
          "— `select=col1,col2` — ma'lum ustunlar (vergul bilan ajratilgan). `*` yoki bo'sh = hamma ustun.",
          "— Filtrlar: `?ustun=op.qiymat` formatida. Operatorlar: `eq` (teng), `neq` (teng emas), `gt` (katta), `gte` (katta yoki teng), `lt` (kichik), `lte` (kichik yoki teng), `like` (shablon, `*` = `%`), `ilike` (case-insensitive), `in.(a,b,c)` (ro'yxatdan), `is.null` / `is.true` / `is.false`.",
          "— JSON ustunlar: `?meta->>author=eq.Ali` (JSON path → matn).",
          "— Full-text qidiruv: `?body=fts.olma` (to_tsquery), `?body=plfts.olma boshqa` (plainto_tsquery), `?body=wfts.olma` (websearch_to_tsquery).",
          "— Inkor: `?views=not.gt.10` (NOT views > 10).",
          "— OR gruhlari: `?or=(age.gt.18,age.lt.5)` (age > 18 OR age < 5).",
          "— Tartiblash: `?order=id.asc,name.desc` (bir yoki ko'p ustun, `.asc` / `.desc`).",
          "— Pagination: `?limit=10&offset=20` (40-49 qatorlar).",
          "— Hisoblash: `?count=exact` (aniq jami) yoki `?count=estimated` (pg_class'dan tez estimat). Status 206 bo'lsa, hamma natijavta, 200 bo'lsa, limit ostida. Javob `Content-Range: START-END/TOTAL` header'i bilan keladi."
        ],
        "examples": [
          {
            "lang": "bash",
            "title": "Asosiy SELECT",
            "code": "curl \"https://storage.identify.uz/v1/<REF>/rest/v1/todos?select=id,title,done\" \\\n  -H \"apikey: <ANON_KEY>\""
          },
          {
            "lang": "bash",
            "title": "Filtrlar",
            "code": "# id > 5 va done = false\ncurl \"https://storage.identify.uz/v1/<REF>/rest/v1/todos?id=gt.5&done=is.false&order=id.desc&limit=10\" \\\n  -H \"apikey: <ANON_KEY>\""
          },
          {
            "lang": "bash",
            "title": "Hisoblash + Pagination",
            "code": "curl -D - \"https://storage.identify.uz/v1/<REF>/rest/v1/todos?limit=20&count=exact\" \\\n  -H \"apikey: <ANON_KEY>\"\n# Response header: Content-Range: 0-19/145"
          },
          {
            "lang": "bash",
            "title": "Full-text qidiruv",
            "code": "curl \"https://storage.identify.uz/v1/<REF>/rest/v1/articles?body=wfts.python%20tutorial\" \\\n  -H \"apikey: <ANON_KEY>\""
          },
          {
            "lang": "ts",
            "title": "SDK: SELECT",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\"https://storage.identify.uz/v1/<REF>\", \"<ANON_KEY>\");\n\nconst { data, count } = await db.from(\"todos\")\n  .select(\"id,title,done\", { count: \"exact\" })\n  .eq(\"done\", false)\n  .order(\"id\", { ascending: false })\n  .limit(10);"
          }
        ]
      },
      {
        "heading": "POST — Inserting",
        "body": [
          "Jadvallarga yangi qatorlar qo'shadi. Body JSON: bitta obyekt yoki massiv.",
          "— Hozirda `Prefer: return=representation` avtomatik qo'llaniladi, shuning uchun yaratilgan qatorlar qaytaradi.",
          "— Masallar: unique constraint (409), foreign key (409), not-null violation (400), check constraint (400)."
        ],
        "examples": [
          {
            "lang": "bash",
            "title": "Bitta qator qo'shish",
            "code": "curl -X POST \"https://storage.identify.uz/v1/<REF>/rest/v1/todos\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"title\":\"Buyurtma qilish\",\"done\":false}'\n# Status: 201, Body: [{\"id\":123,\"title\":\"Buyurtma qilish\",\"done\":false}]"
          },
          {
            "lang": "bash",
            "title": "Ko'p qatorlar qo'shish",
            "code": "curl -X POST \"https://storage.identify.uz/v1/<REF>/rest/v1/todos\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '[{\"title\":\"Vazifa 1\"},{\"title\":\"Vazifa 2\"}]'"
          },
          {
            "lang": "ts",
            "title": "SDK: INSERT",
            "code": "const { data, error } = await db.from(\"todos\")\n  .insert({ title: \"Yangi mexnat\", done: false });\n\nif (error) console.error(error);\nelse console.log(\"Yaratildi:\", data);"
          }
        ]
      },
      {
        "heading": "PATCH/PUT — Update",
        "body": [
          "Mavjud qatorlarni yangilaydi. URL'da filtrlar orqali qaysi qatorlarni o'zgartirasligini belgilayin.",
          "— Body: JSON obyekt (qaysi ustunlarni o'zgartirasligini).",
          "— Masalniki Filter kerak: `?id=eq.5` (id=5 bo'lgan qatorni yangilash).",
          "— Hozir `Prefer: return=representation` avtomatik, shuning uchun yangilangan qatorlar qaytaradi."
        ],
        "examples": [
          {
            "lang": "bash",
            "title": "Bitta qatorni yangilash",
            "code": "curl -X PATCH \"https://storage.identify.uz/v1/<REF>/rest/v1/todos?id=eq.123\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"done\":true}'"
          },
          {
            "lang": "bash",
            "title": "Ko'p qatorni yangilash",
            "code": "curl -X PATCH \"https://storage.identify.uz/v1/<REF>/rest/v1/todos?user_id=eq.42&done=is.false\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"done\":true,\"updated_at\":\"2025-06-05T10:30:00Z\"}'"
          },
          {
            "lang": "ts",
            "title": "SDK: UPDATE",
            "code": "const { data } = await db.from(\"todos\")\n  .update({ done: true, updated_at: new Date().toISOString() })\n  .eq(\"id\", 123);"
          }
        ]
      },
      {
        "heading": "DELETE — O'chirish",
        "body": [
          "Qatorlarni o'chiradi. PATCH kabi filtrlar ishlaydi.",
          "— Hozir `Prefer: return=representation` avtomatik, shuning uchun o'chirilgan qatorlar qaytaradi.",
          "— Ehtiyot: filtr yo'q bo'lsa, **hamma jadvali o'chiriladi**."
        ],
        "examples": [
          {
            "lang": "bash",
            "title": "Bitta qator o'chirish",
            "code": "curl -X DELETE \"https://storage.identify.uz/v1/<REF>/rest/v1/todos?id=eq.123\" \\\n  -H \"apikey: <SERVICE_KEY>\""
          },
          {
            "lang": "bash",
            "title": "Shartli o'chirish",
            "code": "curl -X DELETE \"https://storage.identify.uz/v1/<REF>/rest/v1/todos?user_id=eq.42&done=is.true\" \\\n  -H \"apikey: <SERVICE_KEY>\""
          },
          {
            "lang": "ts",
            "title": "SDK: DELETE",
            "code": "const { data } = await db.from(\"todos\")\n  .delete()\n  .eq(\"id\", 123);"
          }
        ]
      },
      {
        "heading": "Embedded Joins (Foreign Keys)",
        "body": [
          "SELECT'da bog'liq jadvallarni aniqlash kerak. `select=*,related_table(*)` — FK orqali biriktirilgan qatorlarni JSON sifatida qo'shadi.",
          "— To-one: bir qatar. Masalan, `books.select='*,author(id,name)'` — har kitob bilan muallif maʼlumotlari.",
          "— To-many: qatorlar massivi. Masalan, `users.select='*,posts(*)'` — har foydalanuvchi bilan barcha postlari.",
          "— Sistem FK'ni introspeksiya qiladi. Base jadvalning FKsi → one; reverse FK → many."
        ],
        "examples": [
          {
            "lang": "bash",
            "title": "Kitoblar + Mualliflar (to-one)",
            "code": "curl \"https://storage.identify.uz/v1/<REF>/rest/v1/books?select=*,author(id,name,email)\" \\\n  -H \"apikey: <ANON_KEY>\"\n# Response: [{\"id\":1,\"title\":\"...\",\"author\":{\"id\":5,\"name\":\"Ali\",\"email\":\"...\"}}]"
          },
          {
            "lang": "bash",
            "title": "Foydalanuvchilar + Postlar (to-many)",
            "code": "curl \"https://storage.identify.uz/v1/<REF>/rest/v1/users?select=id,email,posts(id,title)\" \\\n  -H \"apikey: <ANON_KEY>\"\n# Response: [{\"id\":1,\"email\":\"...\",\"posts\":[{\"id\":10,\"title\":\"...\"},{\"id\":11,\"title\":\"...\"}]}]"
          },
          {
            "lang": "ts",
            "title": "SDK: Embedded joins",
            "code": "const { data } = await db.from(\"books\")\n  .select(\"*,author(name,email)\")\n  .eq(\"author_id\", 5);"
          }
        ]
      },
      {
        "heading": "RPC — Postgres Funksiyalari",
        "body": [
          "Postgres'da yozilgan funksiyalarni chaqirish. Rol va JWT claim'lari shu sozlanadi, shuning uchun `auth.uid()` va `auth.role()` qayd etiladi.",
          "— Endpoint: `POST /v1/<REF>/rest/v1/rpc/<fn>`.",
          "— Body: JSON `{param1: val1, param2: val2}` — nomlangan parametrlar.",
          "— Skalyar qaytarish (1 qator, 1 ustun) → qiymatni to'g'ridan-to'g'ri qaytaradi. Aks holda → qatorlar massivi."
        ],
        "examples": [
          {
            "lang": "bash",
            "title": "Oddiy RPC (skalyar qaytarish)",
            "code": "curl -X POST \"https://storage.identify.uz/v1/<REF>/rest/v1/rpc/add_numbers\" \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"a\":5,\"b\":7}'\n# Response: 12"
          },
          {
            "lang": "bash",
            "title": "RLS bilan RPC",
            "code": "curl -X POST \"https://storage.identify.uz/v1/<REF>/rest/v1/rpc/get_user_posts\" \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H \"Authorization: Bearer <JWT>\" \\\n  -d '{}'\n# auth.uid() foydalanuvchining JWT'sidan olinadi → RLS avtomatik qo'llanadi"
          },
          {
            "lang": "ts",
            "title": "SDK: RPC",
            "code": "const { data, error } = await db.rpc(\"add_numbers\", { a: 10, b: 20 });\nif (!error) console.log(data); // 30"
          }
        ]
      },
      {
        "heading": "RLS (Row-Level Security) — Avtomatik Himoya",
        "body": [
          "Har so'rov RLS siyosatlari bilan amalga oshiriladi. Sistem barcha so'rovda:",
          "— Rol o'rnatadi (`anon`, `authenticated`, yoki `service_role`).",
          "— JWT claim'larini Postgres `request.jwt.claims` o'zgaruvchisiga qo'yadi.",
          "— Faqat `service_role` RLS'ni chetlab o'tadi (BYPASSRLS).",
          "— Masalan, `create policy 'users_own' on todos for select using (auth.uid() = user_id)` — foydalanuvchi faqat o'z todosu'ni ko'radi.",
          "— `anon_key` dan kelib chiqqan so'rovlar `anon` rolida bajariladi → RLS siyosatlariga asosiy cheklovlar."
        ]
      },
      {
        "heading": "Error Kodlari",
        "body": [
          "Postgres xato kodlari HTTP statusga aylantiriladi:",
          "— 400: Syntax error, undefined column, invalid type cast, not-null violation, check constraint.",
          "— 403: insufficient_privilege (RLS — qo'llab-quvvatlanish yo'q)",
          "— 404: undefined_table.",
          "— 409: unique_violation, foreign_key_violation.",
          "— 405: qo'llab-quvvatlanmaydigan HTTP metod.",
          "— 500: Noma'lum xato."
        ],
        "examples": [
          {
            "lang": "json",
            "title": "Error javob",
            "code": "{\"message\":\"permission denied for schema public\",\"code\":\"42501\"}"
          }
        ]
      },
      {
        "heading": "API Dokumentatsiya va Swagger",
        "body": [
          "storagedb OpenAPI spetsifikatsiyasini avtomatik yaratadi. Har loyiha uchun Swagger UI mavjud.",
          "— OpenAPI JSON: `GET /v1/<REF>/openapi.json?apikey=<anon_key>`.",
          "— Swagger UI: `/v1/<REF>/docs?apikey=<anon_key>` — interaktiv, sinovga tayyor."
        ]
      }
    ]
  },
  {
    "slug": "rpc",
    "title": "RPC (Postgres funksiyalar)",
    "description": "Postgres funksiyalarini chaqirish orqali custom biznes logikasini bajarish. RLS va autentifikatsiya bilan ishlaydi, skalyar yoki SETOF qaytaruvchi funksiyalarni qo'llaydi.",
    "sections": [
      {
        "heading": "RPC asoslari",
        "body": [
          "RPC (Remote Procedure Call) — bu Postgres funksiyalarini HTTP orqali chaqirish imkoniyati. storagedb SQL Editor'da yaratgan funksiyani `POST /v1/<REF>/rest/v1/rpc/<fn_name>` orqali chaqirish mumkin.",
          "HTTP so'rov bajarilganda:",
          "1. `SET LOCAL ROLE <anon|authenticated|service_role>` — foydalanuvchining roli o'rnatiladi (RLS qoidalari ushbu rol ostida ishlaydi).",
          "2. `set_config('request.jwt.claims', <jwt>, true)` — JWT claim'lari session'ga o'rnatiladi, shuning uchun `auth.uid()` va boshqa auth funksiyalari ishlaydi.",
          "3. Postgres funksiyasi bajariladi. Skalyar qaytaruvchi (bitta qiymat) to'g'ridan-to'g'ri qaytariladi; SETOF yoki table qaytaruvchi funksiya massiv qaytaradi.",
          "Funksiyani avval SQL Editor'da `CREATE FUNCTION` yoki meta/query bilan yaratish kerak."
        ],
        "examples": []
      },
      {
        "heading": "Postgres funksiyasi yaratish",
        "body": [
          "storagedb'dagi SQL Editor orqali funksiya yarating. Quyida o'z schema'sida simple qoshish funksiyasi:",
          "Bu funksiya `public` schema'sida bo'ladi va uning parametrlar nomasi o'zgaruvchining nomi bilan mos kelib turadi (RPC POST body'dagi key'lar)."
        ],
        "examples": [
          {
            "title": "SQL: Simple qoshish funksiyasi",
            "lang": "sql",
            "code": "CREATE FUNCTION public.qoshish(a int, b int) RETURNS int AS $$\nBEGIN\n  RETURN a + b;\nEND;\n$$ LANGUAGE plpgsql;\n\n-- Yoki immutable (pure function):\nCREATE FUNCTION public.ko_payti(x int, y int) RETURNS int IMMUTABLE AS $$\n  SELECT x * y;\n$$ LANGUAGE sql;"
          }
        ]
      },
      {
        "heading": "RPC: curl orqali chaqirish",
        "body": [
          "POST so'rovni `/rest/v1/rpc/<fn_name>` ga yuboring. JSON body'dagi kalitlar funksiyaning parameter nomlari bo'lishi kerak.",
          "Header'ga `apikey: <ANON_KEY>` yoki `apikey: <SERVICE_KEY>` qo'shing.",
          "Skalyar funksiyalar (1 qiymat qaytaruvchi) qiymatni to'g'ridan-to'g'ri qaytaradi. SETOF funksiyalar massiv qaytaradi."
        ],
        "examples": [
          {
            "title": "curl: qoshish funksiyasini chaqirish",
            "lang": "bash",
            "code": "curl -X POST \\\n  https://storage.identify.uz/v1/<REF>/rest/v1/rpc/qoshish \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H \"content-type: application/json\" \\\n  -d '{\"a\": 5, \"b\": 7}'\n\n# Natija (skalyar):\n# 12"
          },
          {
            "title": "curl: ko_payti (ko'paytirish)",
            "lang": "bash",
            "code": "curl -X POST \\\n  https://storage.identify.uz/v1/<REF>/rest/v1/rpc/ko_payti \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"content-type: application/json\" \\\n  -d '{\"x\": 3, \"y\": 4}'\n\n# Natija:\n# 12"
          }
        ]
      },
      {
        "heading": "RPC: Client SDK bilan chaqirish",
        "body": [
          "storagedb Client SDK'sida `db.rpc(fnName, args)` metodini ishlating. U Promise qaytaradi `{ data, error }` strukturi bilan.",
          "TypeScript'da generik `T` bilan qaytaruvchi tip belgilang."
        ],
        "examples": [
          {
            "title": "TypeScript: SDK bilan rpc chaqirish",
            "lang": "ts",
            "code": "import { createClient } from '@storagedb/client';\n\nconst db = createClient(\n  'https://storage.identify.uz/v1/<REF>',\n  '<ANON_KEY>'\n);\n\n// Skalyar qaytar (number)\nconst { data, error } = await db.rpc<number>('qoshish', { a: 5, b: 7 });\nif (error) {\n  console.error('RPC xatosi:', error.message);\n} else {\n  console.log('Natija:', data); // 12\n}"
          },
          {
            "title": "TypeScript: JSON parametr",
            "lang": "ts",
            "code": "// Postgres funksiya JSON parametrni qabul qiladi:\n// CREATE FUNCTION public.save_metadata(user_id text, meta jsonb) RETURNS text ...\n\nconst { data, error } = await db.rpc<string>('save_metadata', {\n  user_id: 'abc123',\n  meta: { color: 'blue', size: 'large' } // JSON\n});\n\nif (!error) console.log('Saqlandi:', data);"
          }
        ]
      },
      {
        "heading": "RLC va autentifikatsiya",
        "body": [
          "RPC chaqiruvi **RLS (Row-Level Security)** qoidalariga bo'ysinadi. Rol o'rnatiladi (anon_key uchun `anon`, service_key uchun `service_role`), JWT claim'lari session'ga o'rnatiladi.",
          "`service_key` RLS ni chetlab o'tadi; barcha jadval va ustunlarga kirish mumkin.",
          "`anon_key` foydalanuvchi identity'si bilan ishlaydi — JWT claim'lardagi `auth.uid()` mavjud bo'ladi va RLS qoidalari nazorat qiladi.",
          "Funksiya ichida `auth.uid()` funksiyasini ishlating: `SELECT auth.uid()` — hozirgi foydalanuvchining UUID'sini qaytaradi."
        ],
        "examples": [
          {
            "title": "SQL: RLS bilan funksiya",
            "lang": "sql",
            "code": "-- Shaxsiy ma'lumotlar jadvali (RLS bilan himoyalangan)\nCREATE TABLE public.user_profile (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id uuid REFERENCES auth.users(id),\n  name text,\n  bio text,\n  UNIQUE(user_id)\n);\n\nALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"Foydalanuvchilar o'z profilini o'qishi\" ON public.user_profile\n  FOR SELECT USING (user_id = auth.uid());\n\n-- RPC funksiyasi: foydalanuvchi o'z profilini yangilashi\nCREATE FUNCTION public.update_my_profile(new_name text, new_bio text) RETURNS jsonb AS $$\nDECLARE\n  updated_row jsonb;\nBEGIN\n  UPDATE public.user_profile\n  SET name = new_name, bio = new_bio\n  WHERE user_id = auth.uid()\n  RETURNING row_to_json(user_profile.*) INTO updated_row;\n  \n  RETURN updated_row;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;"
          },
          {
            "title": "TypeScript: RLS bilan rpc",
            "lang": "ts",
            "code": "// anon_key ishlatib (autentifikatsiyalangan foydalanuvchi)\nconst { data, error } = await db.rpc<any>('update_my_profile', {\n  new_name: 'Shohjahon',\n  new_bio: 'O'zbek dasturchisi'\n});\n\nif (error) {\n  // RLS ni polatka qilgan bo'lsa (masalan, bu profil o'zimning emas)\n  console.error('Kirishga taqiq:', error.message);\n} else {\n  console.log('Profil yangilandi:', data);\n}"
          }
        ]
      },
      {
        "heading": "SETOF va massiv qaytarish",
        "body": [
          "Agar funksiya `SETOF <type>` yoki `TABLE(...)` qaytarsa, RPC natija massiv bo'ladi.",
          "SETOF scalar tiplar (masalan `SETOF text`) massivga aylanadi.",
          "SETOF composite tiplar (masalan `SETOF user_profile`) nesnalar massiviga aylanadi."
        ],
        "examples": [
          {
            "title": "SQL: SETOF bilan funksiya",
            "lang": "sql",
            "code": "-- Barcha blog postlarini tag bo'yicha filtrlash\nCREATE FUNCTION public.posts_by_tag(tag_name text) \nRETURNS TABLE(id uuid, title text, body text) AS $$\nBEGIN\n  RETURN QUERY\n  SELECT p.id, p.title, p.body\n  FROM public.blog_posts p\n  JOIN public.post_tags pt ON p.id = pt.post_id\n  WHERE pt.tag = tag_name;\nEND;\n$$ LANGUAGE plpgsql;"
          },
          {
            "title": "TypeScript: SETOF natijasi",
            "lang": "ts",
            "code": "interface BlogPost {\n  id: string;\n  title: string;\n  body: string;\n}\n\nconst { data, error } = await db.rpc<BlogPost[]>('posts_by_tag', {\n  tag_name: 'o\\'zbek'\n});\n\nif (!error && Array.isArray(data)) {\n  data.forEach(post => {\n    console.log(post.title); // \"O'zbekcha IT faqtlari\", ...\n  });\n}"
          }
        ]
      }
    ]
  },
  {
    "slug": "auth",
    "title": "Authentication",
    "description": "Ro'yxatdan o'tish, kirish, tokenlar bilan ishlash va foydalanuvchilarni boshqarish. Email tasdiqlash, parol tiklash va RLS roli asosidagi kirish.",
    "sections": [
      {
        "heading": "Asosiy Tushunchalar",
        "body": [
          "StorageDB Supabase-ga o'xshash JWT-based autentifikatsiyadan foydalanadi. Har bir loyiha o'zining `jwtSecret`'i bilan ta'minlanadi va shu orqali tokenlar imzolangan.",
          "Ikkita API kalit turi mavjud: `anon_key` (ommaviy, client-side) va `service_key` (maxfiy, server-side). Service kalit RLS shurutlarini chetlab o'tadi, admin operatsiyalar uchun zarur.",
          "Autentifikatsiya `apikey` headerda yoki `Authorization: Bearer` formatida token bilan yuboriladi. Access token 1 soat amal qiladi va `refresh_token` bilan yangilansa bo'ladi."
        ]
      },
      {
        "heading": "Ro'yxatdan O'tish",
        "body": [
          "Yangi foydalanuvchi `POST /v1/<REF>/auth/v1/signup` orqali ro'yxatdan o'tadi. Email va kamida 6 belgili parol talab qilinadi.",
          "Agar `AUTH_AUTOCONFIRM=true` bo'lsa, email darhol tasdiqlanadi va sessiya beriladi. Aks holda tasdiqlash havolasi email'ga yuboriladi, `session` esa `null` bo'ladi.",
          "Response'da `user` va `session` (agar tasdiqlansa) qaytariladi. `user_metadata` isteghna orqali qo'shimcha ma'lumot saqlanadi."
        ],
        "examples": [
          {
            "title": "cURL - ro'yxatdan o'tish",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/auth/v1/signup \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"email\": \"user@example.com\",\n    \"password\": \"MySecurePassword123\",\n    \"data\": {\n      \"full_name\": \"John Doe\"\n    }\n  }'"
          },
          {
            "title": "SDK - ro'yxatdan o'tish",
            "lang": "ts",
            "code": "import { createClient } from '@storagedb/client';\n\nconst db = createClient('https://storage.identify.uz/v1/<REF>', '<ANON_KEY>');\n\nconst { data, error } = await db.auth.signUp({\n  email: 'user@example.com',\n  password: 'MySecurePassword123',\n  data: { full_name: 'John Doe' }\n});\n\nif (error) console.error('Xatolik:', error.message);\nelse console.log('Foydalanuvchi yaratildi:', data.user.id);"
          }
        ]
      },
      {
        "heading": "Kirish va Tokenlar",
        "body": [
          "Email va parol bilan kirish `POST /v1/<REF>/auth/v1/token?grant_type=password` orqali amalga oshiriladi. Email tasdiqlanmagan bo'lsa yoki akkaunt bloklangan bo'lsa, kirish rad etiladi.",
          "Muvaffaqiyatli kirishda `access_token`, `refresh_token`, `expires_in` (3600 sekund) va `user` ma'lumoti qaytariladi.",
          "Access token 1 soat amal qiladi va `refresh_token` bilan yangilansa bo'ladi: `grant_type=refresh_token` query parametri bilan yangi sessiya olinadi. Eski refresh token bekor qilinadi (rotatsiya).",
          "Har bir so'rovda `Authorization: Bearer <access_token>` yoki `apikey: <access_token>` header bilan token yuboriladi."
        ],
        "examples": [
          {
            "title": "cURL - kirish (password grant)",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/auth/v1/token?grant_type=password \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"email\": \"user@example.com\",\n    \"password\": \"MySecurePassword123\"\n  }'"
          },
          {
            "title": "cURL - sessiyani yangilash (refresh token)",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/auth/v1/token?grant_type=refresh_token \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"refresh_token\": \"<REFRESH_TOKEN>\"\n  }'"
          },
          {
            "title": "SDK - kirish va sessiya boshqaruvi",
            "lang": "ts",
            "code": "import { createClient } from '@storagedb/client';\n\nconst db = createClient('https://storage.identify.uz/v1/<REF>', '<ANON_KEY>');\n\n// Kirish\nconst { data: session, error } = await db.auth.signInWithPassword({\n  email: 'user@example.com',\n  password: 'MySecurePassword123'\n});\n\nif (session) {\n  console.log('Access token:', session.access_token);\n  // Access token avtomatik ravishda keyingi so'rovlarda foydalaniladi\n}\n\n// Sessiyani yangilash\nconst { data: newSession } = await db.auth.refreshSession();\nconsole.log('Yangi access token:', newSession?.access_token);"
          }
        ]
      },
      {
        "heading": "Email Tasdiqlash va Parol Tiklash",
        "body": [
          "Ro'yxatdan o'tishda email tasdiqlash kerak bo'lsa, tasdiqlash havolasi email'ga yuboriladi. Havola `GET /v1/<REF>/auth/v1/verify?token=<TOKEN>&type=signup` formatida.",
          "Foydalanuvchi havolaga kirganida `token` email'ga tasdiqlanadi va sessiya beriladi. Bundan keyin email'ga kirish mumkin.",
          "Parolni unutgan foydalanuvchi `POST /v1/<REF>/auth/v1/recover` orqali tiklash so'rovi jo'natadi (email mavjud bo'lsa havola yuboriladi, yo'q bo'lsa jim qoladi).",
          "Recovery havola `GET /v1/<REF>/auth/v1/verify?token=<TOKEN>&type=recovery` ga borib, foydalanuvchi `POST /v1/<REF>/auth/v1/reset` bilan yangi parol o'rnatadi. Recovery token 1 soat amal qiladi.",
          "Parol yangilanganida barcha eski refresh tokenlar bekor qilinadi (barcha qurilmalardan chiqish)."
        ],
        "examples": [
          {
            "title": "cURL - parolni tiklash so'rovi",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/auth/v1/recover \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"email\": \"user@example.com\"\n  }'\n# Response: { \"message\": \"Agar email mavjud bo'lsa, havola yuborildi\" }"
          },
          {
            "title": "cURL - yangi parol o'rnatish",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/auth/v1/reset \\\n  -H \"apikey: <ANON_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"token\": \"<RECOVERY_TOKEN>\",\n    \"password\": \"NewPassword123\"\n  }'\n# Response: { \"message\": \"Parol yangilandi\" }"
          },
          {
            "title": "SDK - parol tiklash",
            "lang": "ts",
            "code": "import { createClient } from '@storagedb/client';\n\nconst db = createClient('https://storage.identify.uz/v1/<REF>', '<ANON_KEY>');\n\n// Tiklash havolasini yuborish\nconst { error: recoverError } = await db.auth.resetPasswordForEmail('user@example.com');\n\nif (!recoverError) {\n  console.log('Tiklash havolasi email'ga yuborildi');\n}"
          }
        ]
      },
      {
        "heading": "Joriy Foydalanuvchi va Chiqish",
        "body": [
          "Access token bilan `GET /v1/<REF>/auth/v1/user` so'rovi jo'natib joriy foydalanuvchi haqida ma'lumot olsa bo'ladi.",
          "Chiqish uchun `POST /v1/<REF>/auth/v1/logout` chaqiriladi. Bu barcha refresh tokenlarni bekor qiladi va 204 javob qaytaradi.",
          "Client-side'da `db.auth.signOut()` chaqirish sessiyani tozalaydi va server'da logout amalga oshadi (xato bo'lsa ham, sessiya tozalanadi)."
        ],
        "examples": [
          {
            "title": "cURL - joriy foydalanuvchi",
            "lang": "bash",
            "code": "curl -X GET https://storage.identify.uz/v1/<REF>/auth/v1/user \\\n  -H \"Authorization: Bearer <ACCESS_TOKEN>\""
          },
          {
            "title": "cURL - chiqish",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/auth/v1/logout \\\n  -H \"Authorization: Bearer <ACCESS_TOKEN>\""
          },
          {
            "title": "SDK - joriy foydalanuvchi va chiqish",
            "lang": "ts",
            "code": "import { createClient } from '@storagedb/client';\n\nconst db = createClient('https://storage.identify.uz/v1/<REF>', '<ANON_KEY>');\n\n// Joriy foydalanuvchi\nconst { data: user, error } = await db.auth.getUser();\nif (user) {\n  console.log('Foydalanuvchi ID:', user.id);\n  console.log('Email:', user.email);\n}\n\n// Chiqish\nconst { error: signOutError } = await db.auth.signOut();\nif (!signOutError) {\n  console.log('Muvaffaqiyatli chiqildi');\n}"
          }
        ]
      },
      {
        "heading": "Admin Operatsiyalari",
        "body": [
          "Admin operatsiyalar `service_key` bilan bajariladi (apikey header'da JWT sifatida). Ular RLS shurutlarini chetlab o'tadi va foydalanuvchilarni to'liq boshqarish imkonini beradi.",
          "Foydalanuvchilar ro'yxati: `GET /v1/<REF>/auth/v1/admin/users?limit=100&offset=0`. Pagination'i limit va offset bilan boshqarsa bo'ladi.",
          "Yangi foydalanuvchi yaratish: `POST /v1/<REF>/auth/v1/admin/users` bilan email, parol va isteghna metadata beriladi. Email darhol tasdiqlanadi.",
          "Foydalanuvchini yangilash: `PUT /v1/<REF>/auth/v1/admin/users/:id` orqali parol, ban holati yoki metadata o'zgartiriladi. `banned: true` bu akkauntni 100 yil bloklaydi.",
          "Foydalanuvchini o'chirish: `DELETE /v1/<REF>/auth/v1/admin/users/:id`."
        ],
        "examples": [
          {
            "title": "cURL - foydalanuvchilar ro'yxati",
            "lang": "bash",
            "code": "curl -X GET 'https://storage.identify.uz/v1/<REF>/auth/v1/admin/users?limit=10&offset=0' \\\n  -H \"apikey: <SERVICE_KEY>\""
          },
          {
            "title": "cURL - yangi foydalanuvchi yaratish",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/auth/v1/admin/users \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"email\": \"admin-created@example.com\",\n    \"password\": \"SecurePassword123\",\n    \"user_metadata\": {\n      \"role\": \"moderator\"\n    }\n  }'"
          },
          {
            "title": "cURL - foydalanuvchini bloklash",
            "lang": "bash",
            "code": "curl -X PUT https://storage.identify.uz/v1/<REF>/auth/v1/admin/users/<USER_ID> \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"banned\": true\n  }'"
          },
          {
            "title": "SDK - admin amallar",
            "lang": "ts",
            "code": "import { createClient } from '@storagedb/client';\n\n// Service key bilan client yaratish\nconst db = createClient('https://storage.identify.uz/v1/<REF>', '<SERVICE_KEY>');\n\n// Foydalanuvchilar ro'yxati\nconst { data: users, error: listError } = await db.auth.admin.listUsers();\n\n// Yangi foydalanuvchi\nconst { data: newUser } = await db.auth.admin.createUser({\n  email: 'admin@example.com',\n  password: 'AdminPassword123',\n  user_metadata: { role: 'admin' }\n});\n\n// Foydalanuvchini yangilash\nconst { data: updated } = await db.auth.admin.updateUserById('<USER_ID>', {\n  password: 'NewPassword123',\n  banned: false,\n  user_metadata: { role: 'user' }\n});\n\n// Foydalanuvchini o'chirish\nconst { error: deleteError } = await db.auth.admin.deleteUser('<USER_ID>');"
          }
        ]
      },
      {
        "heading": "RLS va Rollari",
        "body": [
          "StorageDB PostgreSQL RLS (Row Level Security) foydalanadi. Har bir so'rov JWT'dagi `role` claim'iga muvofiq amalga oshiriladi.",
          "Uchta rol mavjud: `anon` (tasdiqlanmagan), `authenticated` (tasdiqlangan), `service_role` (admin, RLS chetlab o'tadi).",
          "Access token JWT'da rol avtomatik ravishda `authenticated` bo'ladi. Admin amallar uchun service_key ishlatiladi (JWT sifatida, `role: service_role`).",
          "RLS policy'larda `auth.uid()` funksiyasi foydalanuvchi ID'sini qaytaradi. Masalan, storage policy: `owner_id = auth.uid()` o'sha foydalanuvchiga tegishli fayllarni filtr qiladi.",
          "Client-side authenticated so'rovda access token avtomatik ravishda apikey sifatida yuboriladi (SDK tomonidan)."
        ]
      }
    ]
  },
  {
    "slug": "storage",
    "title": "Storage",
    "description": "Fayllar saqlashni boshqarish — bucketlar, yuklash, yuklab olish, o'chirish, signed URL bilan vaqtinchalik kirish. Public va private bucketlar qo'llab-quvvatlanadi. REST API va SDK orqali.",
    "sections": [
      {
        "heading": "Bucketlar yaratish",
        "body": [
          "Loyiha uchun fayl saqlash depolorini (bucket) yaratish `service_key` bilan amalga oshiriladi. Bucket `public:true` bo'lsa, autentifikatsiyasiz fayllarni yuklab olish mumkin.",
          "Bucket identifikatori alfanumerik, dash va nuqta bilan boshlash kerak. Misol: `rasmlar`, `media-2024`, `data_v1.0`."
        ],
        "examples": [
          {
            "title": "Bucket yaratish — curl",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/storage/v1/bucket \\\n  -H 'Content-Type: application/json' \\\n  -H 'apikey: <SERVICE_KEY>' \\\n  -d '{\n    \"id\": \"rasmlar\",\n    \"public\": true\n  }'"
          },
          {
            "title": "Bucket yaratish — TypeScript SDK",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/<REF>\",\n  \"<SERVICE_KEY>\"\n);\n\nconst bucket = await db.storage.createBucket(\"rasmlar\", {\n  public: true\n});\nconsole.log(bucket); // { id: \"rasmlar\", public: true }"
          }
        ]
      },
      {
        "heading": "Bucketlar ro'yxati",
        "body": [
          "Loyihaning barcha bucketlarini ro'yxatini olish uchun GET so'rovi yuboriladi. Barcha rol (anon, authenticated, service_role) bu so'rovni yuborishga ruxsat.",
          "Qavs orasida har bir bucket `id` va `public` xususiyatlari qaytadi."
        ],
        "examples": [
          {
            "title": "Bucketlar ro'yxati — curl",
            "lang": "bash",
            "code": "curl https://storage.identify.uz/v1/<REF>/storage/v1/bucket \\\n  -H 'apikey: <ANON_KEY>'"
          },
          {
            "title": "Bucketlar ro'yxati — TypeScript SDK",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/<REF>\",\n  \"<ANON_KEY>\"\n);\n\nconst buckets = await db.storage.listBuckets();\nconsole.log(buckets);\n// [\n//   { id: \"rasmlar\", public: true },\n//   { id: \"hujjatlar\", public: false }\n// ]"
          }
        ]
      },
      {
        "heading": "Fayllarni yuklash",
        "body": [
          "Faylni bucketga yuklash uchun POST so'rovi `apikey` headerida `anon` yoki `service_role` bilan yuboriladi. Yo'l (path) uchinchi qismda belgilanadi: `/storage/v1/object/<bucket>/<path>`.",
          "Fayl natijalari oldingi bo'lsa yangilanadi (update), yo'q bo'lsa yangi qo'shiladi. `Content-Type` avtomatik saqlanadi. Fayl xom (binary) tana sifatida yuboriladi — JSON emas."
        ],
        "examples": [
          {
            "title": "Fayl yuklash — curl",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/storage/v1/object/rasmlar/avatar.png \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'Content-Type: image/png' \\\n  --data-binary @avatar.png"
          },
          {
            "title": "Fayl yuklash — TypeScript SDK",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/<REF>\",\n  \"<ANON_KEY>\"\n);\n\n// Browser'da File orqali\nconst file = new File([...], \"avatar.png\", { type: \"image/png\" });\nconst result = await db.storage\n  .from(\"rasmlar\")\n  .upload(\"avatar.png\", file, { contentType: \"image/png\" });\n\nconsole.log(result);\n// { Key: \"rasmlar/avatar.png\", bucket_id: \"rasmlar\", name: \"avatar.png\", ... }"
          }
        ]
      },
      {
        "heading": "Fayllarni yuklab olish",
        "body": [
          "Private (maxfiy) bucketdagi fayllarni yuklab olish uchun autentifikatsiya kerak — `apikey` headerida `anon_key` yoki `service_key`. Public bucketdagi fayllarni hech kim autentifikatsiyasiz yuklab olishi mumkin.",
          "Maxfiy fayl: `/storage/v1/object/<bucket>/<path>` (JWT bilan). Public fayl: `/storage/v1/public/<bucket>/<path>` (JWT siz). Response Headers'da `Content-Type` qaytadi."
        ],
        "examples": [
          {
            "title": "Private fayl yuklab olish — curl",
            "lang": "bash",
            "code": "curl https://storage.identify.uz/v1/<REF>/storage/v1/object/rasmlar/avatar.png \\\n  -H 'apikey: <ANON_KEY>' \\\n  -o avatar.png"
          },
          {
            "title": "Public fayl yuklab olish — curl (JWT siz)",
            "lang": "bash",
            "code": "curl https://storage.identify.uz/v1/<REF>/storage/v1/public/rasmlar/rasm.jpg \\\n  -o rasm.jpg"
          },
          {
            "title": "Fayl yuklab olish — TypeScript SDK",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/<REF>\",\n  \"<ANON_KEY>\"\n);\n\n// Private fayl yuklab olish (autentifikatsiya bilan)\nconst { data, error } = await db.storage\n  .from(\"rasmlar\")\n  .download(\"avatar.png\");\n\nif (data) {\n  const url = URL.createObjectURL(data);\n  console.log(\"Fayl URL:\", url);\n}"
          }
        ]
      },
      {
        "heading": "Fayllarni o'chirish",
        "body": [
          "Faylni bucketdan o'chirish DELETE so'rovi orqali amalga oshiriladi. O'chirish uchun faylni saqlagan foydalanuvchi yoki `service_role` ruxsati kerak.",
          "Yo'l belgilanadi: `/storage/v1/object/<bucket>/<path>`. Muvaqqiyatli o'chirish holida HTTP 204 (No Content) qaytadi."
        ],
        "examples": [
          {
            "title": "Fayl o'chirish — curl",
            "lang": "bash",
            "code": "curl -X DELETE https://storage.identify.uz/v1/<REF>/storage/v1/object/rasmlar/avatar.png \\\n  -H 'apikey: <ANON_KEY>'"
          },
          {
            "title": "Fayl o'chirish — TypeScript SDK",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/<REF>\",\n  \"<ANON_KEY>\"\n);\n\nconst { error } = await db.storage\n  .from(\"rasmlar\")\n  .remove([\"avatar.png\"]);\n\nif (error) {\n  console.error(\"O'chirish xatosi:\", error.message);\n} else {\n  console.log(\"Fayl o'chirildi\");\n}"
          }
        ]
      },
      {
        "heading": "Signed URL — vaqtinchalik kirish",
        "body": [
          "Private faylga vaqtinchalik link yaratish uchun signed URL ishlatiladi. Havolaning muddati belgilansa (masalan, 1 soat), o'sha vaqtdan so'ng token ishlamaydi.",
          "Signed URL yaratish `/storage/v1/object/sign/<bucket>/<path>` POST so'rovi bilan bo'ladi, `expiresIn` (soniyalarda) ko'rsatiladi. Natijada `signedUrl` (to'liq URL + token) qaytadi. Qabul qiluvchi autentifikatsiyasiz shu URL orqali faylni yuklab olishi mumkin."
        ],
        "examples": [
          {
            "title": "Signed URL yaratish — curl",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/storage/v1/object/sign/rasmlar/avatar.png \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    \"expiresIn\": 3600\n  }'\n\n# Natija:\n# {\n#   \"signedUrl\": \"https://storage.identify.uz/v1/<REF>/storage/v1/signed/rasmlar/avatar.png?token=1698765432.a1b2c3d4e5f6g7h8...\",\n#   \"token\": \"1698765432.a1b2c3d4e5f6g7h8...\",\n#   \"expiresAt\": 1698765432\n# }"
          },
          {
            "title": "Signed URL orqali fayl yuklab olish",
            "lang": "bash",
            "code": "# Signed URL avtomatik token bilan, autentifikatsiyasiz ishlatiladi\ncurl 'https://storage.identify.uz/v1/<REF>/storage/v1/signed/rasmlar/avatar.png?token=1698765432.a1b2c3d4e5f6g7h8...' \\\n  -o avatar.png"
          },
          {
            "title": "Signed URL yaratish — TypeScript SDK",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/<REF>\",\n  \"<ANON_KEY>\"\n);\n\n// 1 soat uchun signed URL yaratish\nconst { data, error } = await db.storage\n  .from(\"rasmlar\")\n  .createSignedUrl(\"avatar.png\", 3600);\n\nif (data) {\n  console.log(\"Signed URL:\", data.signedUrl);\n  // Boshqa odam shu URL orqali fayl yuklab olishi mumkin (1 soat ichida)\n} else if (error) {\n  console.error(\"Xato:\", error.message);\n}"
          }
        ]
      },
      {
        "heading": "Public URL orqali birlamchi kirish",
        "body": [
          "Agar bucket `public: true` bo'lsa, fayl to'g'ridan-to'g'ri `/storage/v1/public/<bucket>/<path>` yo'li orqali autentifikatsiyasiz yuklab olinishi mumkin.",
          "Bu usuli sharh (permanent) havolalar, o'quvchi (read-only) kontenti (suratlar, PDF va h.k.) uchun qulay. Private bucketdagi fayllarni public URL orqali yuklab olib bo'lmaydi — signed URL yoki autentifikatsiyalashgan download kerak."
        ],
        "examples": [
          {
            "title": "Public URL (to'g'ridan-to'g'ri)",
            "lang": "bash",
            "code": "# Public bucket yaratish\ncurl -X POST https://storage.identify.uz/v1/<REF>/storage/v1/bucket \\\n  -H 'apikey: <SERVICE_KEY>' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"id\": \"media\", \"public\": true}'\n\n# Fayl yuklash\ncurl -X POST https://storage.identify.uz/v1/<REF>/storage/v1/object/media/banner.jpg \\\n  -H 'apikey: <SERVICE_KEY>' \\\n  --data-binary @banner.jpg\n\n# Public URL (autentifikatsiyasiz ham ishlatilishi mumkin)\nhttps://storage.identify.uz/v1/<REF>/storage/v1/public/media/banner.jpg"
          },
          {
            "title": "Public URL — TypeScript SDK",
            "lang": "ts",
            "code": "import { createClient } from \"@storagedb/client\";\n\nconst db = createClient(\n  \"https://storage.identify.uz/v1/<REF>\",\n  \"<SERVICE_KEY>\"\n);\n\n// Public bucket yaratish\nawait db.storage.createBucket(\"media\", { public: true });\n\n// Fayl yuklash\nawait db.storage.from(\"media\").upload(\"banner.jpg\", file);\n\n// Public URL olish (o'ziga xos funksiya)\nconst publicUrl = db.storage\n  .from(\"media\")\n  .getPublicUrl(\"banner.jpg\");\n\nconsole.log(publicUrl.data.publicUrl);\n// https://storage.identify.uz/v1/<REF>/storage/v1/public/media/banner.jpg"
          }
        ]
      }
    ]
  },
  {
    "slug": "realtime",
    "title": "Realtime",
    "description": "StorageDB Realtime - PostgreSQL o'zgarishlarini, mijozlar orasidagi xabar almashishni va foydalanuvchi holatini real vaqtda kuzatish.",
    "sections": [
      {
        "heading": "Kirish",
        "body": [
          "Realtime funksiyasi PostgreSQL ma'lumotlar bazasidagi o'zgarishlarni, broadcast xabarlarini va foydalanuvchilar holati (presence) haqida ma'lumotni real vaqtda olish imkoniyatini beradi.",
          "Uchtа asosiy turdagi voqealar mavjud: (1) Postgres Changes — jadvallar o'zgarishi uchun, RLS hurmat qilinadi; (2) Broadcast — mijozlar orasidagi bevosita xabar almashishi; (3) Presence — qaysi foydalanuvchilar faol ekanligini kuzatish."
        ]
      },
      {
        "heading": "WebSocket Ulanish",
        "body": [
          "Realtime xizmatiga WebSocket orqali ulanish kerak. URLda project reference (`<REF>`) va API key (`<ANON_KEY>` yoki `<SERVICE_KEY>`) o'tkaziladi.",
          "Ulanishdan so'ng server `ready` xabari yuboradi, shunda siz `subscribe`, `join`, va boshqa komandalarni yuborshingiz mumkin."
        ],
        "examples": [
          {
            "title": "WebSocket URL tuzish",
            "lang": "bash",
            "code": "wss://storage.identify.uz/v1/<REF>/realtime/v1/websocket?apikey=<ANON_KEY>"
          },
          {
            "title": "TypeScript SDK orqali ulanish",
            "lang": "ts",
            "code": "import StorageDB from '@storagedb/client';\n\nconst db = new StorageDB({\n  url: 'https://storage.identify.uz',\n  apiKey: '<ANON_KEY>',\n  ref: '<REF>',\n});\n\nconst channel = db.channel('my-channel');\nchannel.subscribe();"
          }
        ]
      },
      {
        "heading": "Postgres Changes",
        "body": [
          "Jadvaldagi INSERT, UPDATE, yoki DELETE operatsiyalarini kuzatish uchun avval SQL'da `realtime.enable('jadvalnomi')` chaqiring, keyin WebSocket'da o'sha jadvalgа `subscribe` qiling.",
          "RLS (Row Level Security) siyosatlari hurmat qilinadi — har foydalanuvchi faqat o'ziga ko'rinishi mumkin bo'lgan qatorlarni oladi. Service role esa barcha qatorlarni oladi.",
          "UPDATE va DELETE voqealarida `old_record` (eski qiymatlar) keladi, lekin RLS ostidagi foydalanuvchilar uchun faqat primary key ustunlari jo'natiladi (ma'lumot sirraligi uchun)."
        ],
        "examples": [
          {
            "title": "Jadvalni Realtime-ga tayyorlash (SQL)",
            "lang": "sql",
            "code": "-- Service role sifatida bajariladi\nSELECT realtime.enable('todos');"
          },
          {
            "title": "curl orqali subscribe",
            "lang": "bash",
            "code": "wscat -c 'wss://storage.identify.uz/v1/<REF>/realtime/v1/websocket?apikey=<ANON_KEY>'\n\n# Ulanishdan so'ng, quyidagini yuboring:\n{\"type\": \"subscribe\", \"table\": \"todos\"}\n\n# Javob:\n{\"type\": \"subscribed\", \"table\": \"todos\"}\n\n# INSERT voqeasini olish:\n{\"type\": \"change\", \"event\": \"INSERT\", \"table\": \"todos\", \"record\": {\"id\": 1, \"title\": \"Task 1\"}}"
          },
          {
            "title": "TypeScript SDK orqali Postgres Changes",
            "lang": "ts",
            "code": "const channel = db.channel('todos')\n  .on('INSERT', (payload) => {\n    console.log('Yangi qator qo\\'shildi:', payload.record);\n  })\n  .on('UPDATE', (payload) => {\n    console.log('Qator yangilandi:', payload.record);\n    console.log('Eski qiymatlar:', payload.old_record);\n  })\n  .on('DELETE', (payload) => {\n    console.log('Qator o\\'chirildi (PK):', payload.old_record);\n  })\n  .on('*', (payload) => {\n    // Barcha o'zgarishlar\n    console.log('O\\'zgarish:', payload.event);\n  })\n  .subscribe();"
          }
        ]
      },
      {
        "heading": "Broadcast — Mijozlar Orasidagi Xabarlar",
        "body": [
          "Broadcast xizmatida ma'lumotlar bazasi bilan bog'lanmagan holda, foydalanuvchilar bir-biriga xabar yuborishlari mumkin (masalan, o'yinchililar o'rtasida, real vaqtda kursorlari ko'rsatish uchun).",
          "Topic'ga `join` qiling, keyin `broadcast` buyrug'i bilan xabar yuboring. Bir xil topic'dagi boshqa foydalanuvchilar bu xabarni oladi.",
          "Broadcast serverda saqlanmaydi — faqat faol ulanishlargа jo'natiladi."
        ],
        "examples": [
          {
            "title": "curl orqali broadcast",
            "lang": "bash",
            "code": "# Ulanish va topic'ga qo'shilish\nwscat -c 'wss://storage.identify.uz/v1/<REF>/realtime/v1/websocket?apikey=<ANON_KEY>'\n\n{\"type\": \"join\", \"topic\": \"gaming-room\"}\n# Javob:\n{\"type\": \"joined\", \"topic\": \"gaming-room\"}\n\n# Xabar yuborish\n{\"type\": \"broadcast\", \"topic\": \"gaming-room\", \"event\": \"cursor_move\", \"payload\": {\"x\": 100, \"y\": 200}}\n\n# Boshqa mijozlar quyidagini oladi:\n{\"type\": \"broadcast\", \"topic\": \"gaming-room\", \"event\": \"cursor_move\", \"payload\": {\"x\": 100, \"y\": 200}}"
          },
          {
            "title": "TypeScript SDK orqali Broadcast",
            "lang": "ts",
            "code": "const channel = db.channel('gaming-room')\n  .onBroadcast('cursor_move', (message) => {\n    console.log('Boshqa foydalanuvchi kursori:', message.payload);\n  })\n  .subscribe();\n\n// Xabar yuborish\nchannel.send('cursor_move', { x: 100, y: 200 });\nchannel.send('player_action', { action: 'jump' });"
          }
        ]
      },
      {
        "heading": "Presence — Kim Onlayn",
        "body": [
          "Presence orqali foydalanuvchilar o'zlarining holatini (status, ma'lumot) tarqata oladi va boshqalarning holatlarini kuzata oladi.",
          "`track(state)` bilan o'z holatni belgilang, `presenceState()` orqali boshqalarning holatlarini oling. Bir key uchun bir nechta state bo'lishi mumkin (masalan, bir foydalanuvchi bir nechta tabdan ulanishi).",
          "Foydalanuvchi jo'nalganda avtomatik ravishda `presence_leave` xabari jo'natiladi."
        ],
        "examples": [
          {
            "title": "curl orqali Presence",
            "lang": "bash",
            "code": "# Ulanish\nwscat -c 'wss://storage.identify.uz/v1/<REF>/realtime/v1/websocket?apikey=<ANON_KEY>'\n\n# Topic'ga qo'shilish\n{\"type\": \"join\", \"topic\": \"chatroom\"}\n\n# O'z holatni belgilash\n{\"type\": \"presence_track\", \"topic\": \"chatroom\", \"key\": \"user-123\", \"state\": {\"username\": \"Ali\", \"status\": \"online\"}}\n\n# Javob (barcha foydalanuvchilar):\n{\"type\": \"presence_sync\", \"topic\": \"chatroom\", \"state\": {\"user-123\": [{\"username\": \"Ali\", \"status\": \"online\"}]}}\n\n# Boshqa foydalanuvchi kelmasa:\n{\"type\": \"presence_join\", \"topic\": \"chatroom\", \"key\": \"user-456\", \"state\": {\"username\": \"Bob\"}}"
          },
          {
            "title": "TypeScript SDK orqali Presence",
            "lang": "ts",
            "code": "const channel = db.channel('chatroom')\n  .onPresenceSync(() => {\n    const state = channel.presenceState();\n    console.log('Onlayn foydalanuvchilar:', state);\n    // state: { 'user-123': [{username: 'Ali', status: 'online'}] }\n  })\n  .onPresenceJoin((event) => {\n    console.log('Yangi foydalanuvchi:', event.key, event.state);\n  })\n  .onPresenceLeave((event) => {\n    console.log('Foydalanuvchi ketdi:', event.key);\n  })\n  .subscribe();\n\n// O'z holatni belgilash\nchannel.track({ username: 'Ali', status: 'online' });\n\n// Holatni yangilash (track qayta chaqirish)\nsetTimeout(() => {\n  channel.track({ username: 'Ali', status: 'idle' });\n}, 5000);\n\n// Holatni olib tashlash\nchannel.untrack();"
          }
        ]
      },
      {
        "heading": "RLS va Xavfsizlik",
        "body": [
          "Postgres Changes avtomatik ravishda RLS siyosatlarini hurmat qiladi. Anon key (ochiq) ishlatuvchi faqat o'ziga ko'rinishi mumkin bo'lgan qatorlarni oladi.",
          "Service key (maxfiy) rola `BYPASSRLS` ni qo'lladi, shuning uchun barcha qatorlarni oladi.",
          "Har voqea har obunachi uchun alohida tekshiriladi. DELETE voqeasida qator yo'qolgan bo'lgani sababli faqat primary key ustunlari jo'natiladi."
        ]
      }
    ]
  },
  {
    "slug": "sdk",
    "title": "Client SDK (@storagedb/client)",
    "description": "Rasmiy JavaScript/TypeScript SDK storagedb-ga ulanish, ma'lumotlar bazasi operatsiyalari, autentifikatsiya, storage, va realtime funksiyalari uchun.",
    "sections": [
      {
        "heading": "O'rnatish va Boshlang'ich sozlama",
        "body": [
          "StorageDB client SDK `@storagedb/client` npm paketidagi barcha zarorat qiladigan funksiyalarni taqdim etadi. Loyihangizga qo'shing:",
          "npm i @storagedb/client",
          "Client yaratish uchun `createClient()` funksiyasini ishlating. U Supabase-js ga o'xshaydi. Api URL va API kalit (anon yoki service) zarur:",
          "TypeScript/JavaScript: const { createClient } = require('@storagedb/client'); const db = createClient('https://storage.identify.uz/v1/<REF>', '<ANON_KEY>');",
          "Barcha amallar promise-based. Natija { data, error, ... } qaytaradi. Tizimsiz xatolarni boshqarish uchun har doim error ni tekshiring."
        ],
        "examples": [
          {
            "lang": "ts",
            "title": "Asosiy setup",
            "code": "import { createClient } from '@storagedb/client';\n\nconst db = createClient(\n  'https://storage.identify.uz/v1/my-project-ref',\n  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // anon_key\n);\n\n// Endi siz db.from(), db.auth, db.storage ishlatishingiz mumkin."
          },
          {
            "lang": "bash",
            "title": "curl bilan service API-ga ulanish",
            "code": "curl -X GET 'https://storage.identify.uz/v1/my-ref/rest/v1/todos?select=*' \\\n  -H 'apikey: service_key_value' \\\n  -H 'authorization: Bearer service_key_value'"
          }
        ]
      },
      {
        "heading": "Jadval so'rovlari (Database Queries)",
        "body": [
          "StorageDB barcha jadvallar bilan PostgREST uslubida ishlashni qo'llab-quvvatlaydi. `db.from('table_name')` orqali QueryBuilder olasiz. U select, insert, update, delete amallarini qo'llab-quvvatlaydi.",
          "SELECT: .select('*|col1,col2,...', { count: 'exact'|'estimated' })",
          "INSERT: .insert(data) — bir yoki ko'p qatorlarni qo'shadi.",
          "UPDATE: .update(changes) — WHERE shartiga mos qatorlarni o'zgartiradi.",
          "DELETE: .delete() — qatorlarni o'chiradi.",
          "UPSERT: .upsert(data) — mavjud bo'lsa yangilaydi, yo'q bo'lsa qo'shadi.",
          "Filtrlar: .eq(), .neq(), .gt(), .gte(), .lt(), .lte(), .like(), .ilike(), .in(), .is(), .not(), .or(), .textSearch()",
          "Tartib va sahifalash: .order('col', { ascending: false }), .limit(n), .range(from, to), .single()"
        ],
        "examples": [
          {
            "lang": "ts",
            "title": "SELECT — ro'yxat olish",
            "code": "const { data: todos, error, count } = await db\n  .from('todos')\n  .select('*, author(*)', { count: 'exact' })\n  .eq('done', false)\n  .order('id', { ascending: false })\n  .limit(20);\n\nif (error) console.error('Xato:', error.message);\nelse console.log(`${count} adaslash topildi:`, todos);"
          },
          {
            "lang": "bash",
            "title": "SELECT — curl bilan",
            "code": "curl -X GET 'https://storage.identify.uz/v1/my-ref/rest/v1/todos?select=*%2Cauthor(*)&done=eq.false&order=id.desc&limit=20&count=exact' \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'authorization: Bearer <ANON_KEY>'"
          },
          {
            "lang": "ts",
            "title": "INSERT — yangi qator qo'shish",
            "code": "const { data: newTodo, error } = await db\n  .from('todos')\n  .insert({\n    title: 'Dars yozish',\n    done: false,\n    user_id: 'usr_123'\n  })\n  .single(); // bitta qator qaytaradi\n\nif (error) console.error('Qo\\'shish xatosi:', error.message);\nelse console.log('Qo\\'shildi:', newTodo);"
          },
          {
            "lang": "bash",
            "title": "INSERT — curl bilan",
            "code": "curl -X POST 'https://storage.identify.uz/v1/my-ref/rest/v1/todos' \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'content-type: application/json' \\\n  -H 'prefer: return=representation' \\\n  -d '{\"title\":\"Dars yozish\",\"done\":false,\"user_id\":\"usr_123\"}'"
          },
          {
            "lang": "ts",
            "title": "UPDATE — mavjud qatorni o'zgartirish",
            "code": "const { data: updated, error } = await db\n  .from('todos')\n  .update({ done: true, updated_at: new Date() })\n  .eq('id', 42)\n  .single();\n\nif (error) console.error('Update xatosi:', error.message);\nelse console.log('O\\'zgartirildi:', updated);"
          },
          {
            "lang": "ts",
            "title": "UPSERT — qo'shish yoki yangilash",
            "code": "const { data: result, error } = await db\n  .from('users')\n  .upsert({\n    id: 'usr_123',\n    email: 'user@example.com',\n    name: 'Ali'\n  })\n  .single();\n\nif (error) console.error('Upsert xatosi:', error.message);\nelse console.log('Natija:', result);"
          },
          {
            "lang": "ts",
            "title": "Murakkab filtrlar",
            "code": "// Bir nechta shartlar bilan qidiruv\nconst { data, error } = await db\n  .from('posts')\n  .select('*')\n  .gte('created_at', '2024-01-01')\n  .lt('created_at', '2025-01-01')\n  .ilike('title', '%O\\'zbek%') // katalog-siz\n  .in('status', ['draft', 'published'])\n  .eq('author_id', 'usr_42')\n  .order('created_at', { ascending: false });\n\nconsole.log(`${data?.length} post topildi`);"
          },
          {
            "lang": "ts",
            "title": "Full-text search",
            "code": "// Postgres full-text search\nconst { data: results, error } = await db\n  .from('articles')\n  .select('id, title, body')\n  .textSearch('body', 'database search query', { type: 'websearch' })\n  .limit(10);\n\nif (error) console.error('Qidiruv xatosi:', error.message);\nelse console.log('Natijalar:', results);"
          }
        ]
      },
      {
        "heading": "Autentifikatsiya (Auth)",
        "body": [
          "StorageDB o'z authentication xizmati bilan birga keladi. `db.auth` orqali sign up, sign in, sign out, parol tiklash va admin amallarini bajarishingiz mumkin.",
          "signUp: yangi foydalanuvchi ro'yxatdan o'tkazadi. Session yo'q bo'lishi mumkin (email tasdiqlash shart bo'lsa).",
          "signInWithPassword: emailu va parol bilan kirish.",
          "refreshSession: refresh token orqali access token yangilash.",
          "signOut: chiqish va sessiyani tozalash.",
          "getUser: joriy foydalanuvchining ma'lumotlarini olish (access token kerak).",
          "resetPasswordForEmail: parol tiklovchi link yuborish.",
          "admin.* — service_key bilan faqat admin amallar (foydalanuvchilar bo'yicha)."
        ],
        "examples": [
          {
            "lang": "ts",
            "title": "Sign Up — ro'yxatdan o'tish",
            "code": "const { data, error } = await db.auth.signUp({\n  email: 'newuser@example.com',\n  password: 'SecurePassword123',\n  data: {\n    full_name: 'Ali Karimov',\n    avatar_url: 'https://example.com/avatar.jpg'\n  }\n});\n\nif (error) {\n  console.error('Ro\\'yxatdan o\\'tish xatosi:', error.message);\n} else {\n  console.log('Yangi foydalanuvchi:', data.user);\n  console.log('Sessiya:', data.session); // null bo'lishi mumkin\n}"
          },
          {
            "lang": "bash",
            "title": "Sign Up — curl bilan",
            "code": "curl -X POST 'https://storage.identify.uz/v1/my-ref/auth/v1/signup' \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'content-type: application/json' \\\n  -d '{\n    \"email\": \"newuser@example.com\",\n    \"password\": \"SecurePassword123\",\n    \"data\": {\"full_name\": \"Ali Karimov\"}\n  }'"
          },
          {
            "lang": "ts",
            "title": "Sign In — kirish",
            "code": "const { data: session, error } = await db.auth.signInWithPassword({\n  email: 'user@example.com',\n  password: 'UserPassword123'\n});\n\nif (error) {\n  console.error('Kirish xatosi:', error.message);\n} else {\n  console.log('Access token:', session.access_token);\n  console.log('Foydalanuvchi:', session.user);\n  // Sessiya avtomatik saqlanadi\n}"
          },
          {
            "lang": "bash",
            "title": "Sign In — curl bilan",
            "code": "curl -X POST 'https://storage.identify.uz/v1/my-ref/auth/v1/token?grant_type=password' \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'content-type: application/json' \\\n  -d '{\n    \"email\": \"user@example.com\",\n    \"password\": \"UserPassword123\"\n  }'"
          },
          {
            "lang": "ts",
            "title": "Get User — joriy foydalanuvchi",
            "code": "const { data: user, error } = await db.auth.getUser();\n\nif (error) {\n  console.error('Foydalanuvchini olishda xato:', error.message);\n} else if (user) {\n  console.log('Foydalanuvchi ID:', user.id);\n  console.log('Email:', user.email);\n  console.log('Metadata:', user.user_metadata);\n}"
          },
          {
            "lang": "ts",
            "title": "Refresh Session — tokeni yangilash",
            "code": "const { data: newSession, error } = await db.auth.refreshSession();\n\nif (error) {\n  console.error('Yangilash xatosi:', error.message);\n} else {\n  console.log('Yangi access token:', newSession.access_token);\n  // Avtomatik saqlandi\n}"
          },
          {
            "lang": "ts",
            "title": "Sign Out — chiqish",
            "code": "const { error } = await db.auth.signOut();\n\nif (error) {\n  console.error('Chiqish xatosi:', error.message);\n} else {\n  console.log('Sessiya to\\'g\\'ri tuhtatildi');\n  // Foydalanuvchi bilan bog'langan barcha tokenlar bekor qilindi\n}"
          },
          {
            "lang": "ts",
            "title": "Reset Password — parolni tiklash",
            "code": "const { error } = await db.auth.resetPasswordForEmail('user@example.com');\n\nif (error) {\n  console.error('Reset link yuborishda xato:', error.message);\n} else {\n  console.log('Reset link foydalanuvchi emailiga yuborildi');\n}"
          },
          {
            "lang": "ts",
            "title": "Admin: foydalanuvchilar ro'yxati (service_key orqali)",
            "code": "// Service key bilan yaratilgan client kerak\nconst adminDb = createClient('https://...', 'service_key_value');\n\nconst { data: users, error } = await adminDb.auth.admin.listUsers();\n\nif (error) {\n  console.error('Admin xatosi:', error.message);\n} else {\n  console.log('Jami foydalanuvchilar:', users.length);\n  users.forEach(u => console.log(`- ${u.email}`));\n}"
          }
        ]
      },
      {
        "heading": "Storage (Fayllar)",
        "body": [
          "StorageDB storage xizmati S3-ga o'xshash API taqdim etadi. Bucket yaratish, fayllarni yuklash/yuklab olish, public URL olish, va signed URL yaratish mumkin.",
          "db.storage.from(bucket_name) — bucket API olish.",
          "bucket.upload(path, data, opts) — faylni yuklash.",
          "bucket.download(path) — faylni yuklab olish.",
          "bucket.remove(path) — faylni o'chirish.",
          "bucket.getPublicUrl(path) — public bucket uchun to'g'ridan-to'g'ri URL.",
          "bucket.createSignedUrl(path, expiresIn) — vaqtli ro'yxatdan o'tgan URL (private bucket uchun).",
          "db.storage.createBucket(id, opts) — yangi bucket yaratish (admin)."
        ],
        "examples": [
          {
            "lang": "ts",
            "title": "Faylni yuklash",
            "code": "const fileData = new Blob(['Fayl mazmuni'], { type: 'text/plain' });\n\nconst { data, error } = await db.storage\n  .from('my-bucket')\n  .upload('users/user123/avatar.jpg', fileData, {\n    contentType: 'image/jpeg'\n  });\n\nif (error) {\n  console.error('Upload xatosi:', error.message);\n} else {\n  console.log('Yuklandi:', data.Key); // 'users/user123/avatar.jpg'\n}"
          },
          {
            "lang": "bash",
            "title": "Faylni yuklash — curl bilan",
            "code": "curl -X POST 'https://storage.identify.uz/v1/my-ref/storage/v1/object/my-bucket/users/avatar.jpg' \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'content-type: image/jpeg' \\\n  --data-binary @/path/to/avatar.jpg"
          },
          {
            "lang": "ts",
            "title": "Faylni yuklab olish",
            "code": "const { data: blob, error } = await db.storage\n  .from('my-bucket')\n  .download('users/user123/avatar.jpg');\n\nif (error) {\n  console.error('Download xatosi:', error.message);\n} else {\n  // blob `Blob` tipida\n  const url = URL.createObjectURL(blob);\n  console.log('Fayl hazirlandi:', url);\n}"
          },
          {
            "lang": "ts",
            "title": "Public bucket URL",
            "code": "const { publicUrl } = db.storage\n  .from('public-files')\n  .getPublicUrl('documents/report.pdf');\n\nconsole.log('Ochiq URL:', publicUrl);\n// https://storage.identify.uz/v1/my-ref/storage/v1/public/public-files/documents/report.pdf"
          },
          {
            "lang": "ts",
            "title": "Signed URL yaratish (private bucket)",
            "code": "const { data, error } = await db.storage\n  .from('private-bucket')\n  .createSignedUrl('secure-docs/contract.pdf', 3600); // 1 soat\n\nif (error) {\n  console.error('Signed URL xatosi:', error.message);\n} else {\n  console.log('Imzolangan URL:', data.signedUrl);\n  // Bu URL 1 soat davomida yaroqli\n}"
          },
          {
            "lang": "bash",
            "title": "Signed URL yaratish — curl bilan",
            "code": "curl -X POST 'https://storage.identify.uz/v1/my-ref/storage/v1/object/sign/private-bucket/secure-docs/contract.pdf' \\\n  -H 'apikey: <SERVICE_KEY>' \\\n  -H 'content-type: application/json' \\\n  -d '{\"expiresIn\": 3600}'"
          },
          {
            "lang": "ts",
            "title": "Faylni o'chirish",
            "code": "const { error } = await db.storage\n  .from('my-bucket')\n  .remove('users/user123/old-avatar.jpg');\n\nif (error) {\n  console.error('O\\'chirish xatosi:', error.message);\n} else {\n  console.log('Fayl o\\'chirildi');\n}"
          },
          {
            "lang": "ts",
            "title": "Yangi bucket yaratish (admin)",
            "code": "const adminDb = createClient('https://...', 'service_key_value');\n\nconst { data, error } = await adminDb.storage.createBucket('new-bucket', {\n  public: false // Private bucket\n});\n\nif (error) {\n  console.error('Bucket yaratish xatosi:', error.message);\n} else {\n  console.log('Bucket yaratildi:', data.id);\n}"
          }
        ]
      },
      {
        "heading": "RPC (Postgres funksiyalari)",
        "body": [
          "StorageDB bazasida yaratilgan Postgres funksiyalari (stored procedures, functions) RPC orqali chaqiriladi.",
          "db.rpc(function_name, args) — funksiyani chaqirish.",
          "args — funksiya parametrlari (object).",
          "Natija { data, error } qaytaradi. data ning tipi funksiya qaytaradigan qiymati bilan bog'liq."
        ],
        "examples": [
          {
            "lang": "ts",
            "title": "RPC funksiyasini chaqirish",
            "code": "const { data: result, error } = await db.rpc('calculate_total', {\n  user_id: 'usr_123',\n  month: 'January'\n});\n\nif (error) {\n  console.error('RPC xatosi:', error.message);\n} else {\n  console.log('Natija:', result); // server tomondan qaytarilgan qiymat\n}"
          },
          {
            "lang": "bash",
            "title": "RPC — curl bilan",
            "code": "curl -X POST 'https://storage.identify.uz/v1/my-ref/rest/v1/rpc/calculate_total' \\\n  -H 'apikey: <ANON_KEY>' \\\n  -H 'content-type: application/json' \\\n  -d '{\"user_id\": \"usr_123\", \"month\": \"January\"}'"
          },
          {
            "lang": "ts",
            "title": "RPC qatorlarni qaytarsa",
            "code": "interface UserStats {\n  count: number;\n  average_age: number;\n  last_login: string;\n}\n\nconst { data: stats, error } = await db.rpc<UserStats>('get_user_stats', {\n  department: 'sales'\n});\n\nif (error) {\n  console.error('Stats xatosi:', error.message);\n} else {\n  console.log(`${stats?.count} foydalanuvchi, O'rta yosh: ${stats?.average_age}`);\n}"
          }
        ]
      },
      {
        "heading": "Realtime (Websocket subscription)",
        "body": [
          "StorageDB realtime xizmati PostgreSQL o'zgarishlari, broadcast xabarlari, va presence (kimlar onlayn ekanini) qo'llab-quvvatlaydi.",
          "db.channel(name) — kanal yaratish.",
          "on(event, callback) — Postgres change events: INSERT, UPDATE, DELETE, yoki '*'.",
          "onBroadcast(event, callback) — custom broadcast xabarlari.",
          "onPresenceSync(cb) — presence state yangilanishi.",
          "onPresenceJoin(cb) — foydalanuvchi online bo'lsa.",
          "onPresenceLeave(cb) — foydalanuvchi offline bo'lsa.",
          "subscribe(onStatus?) — WebSocket ulanishni boshlash.",
          "send(event, payload) — topic'ga broadcast yuborish.",
          "track(state) — o'z presence holatini belgilash.",
          "unsubscribe() — disconnectni to'xtatish."
        ],
        "examples": [
          {
            "lang": "ts",
            "title": "Postgres o'zgarishlari kuzatish",
            "code": "const channel = db.channel('todos')\n  .on('INSERT', (payload) => {\n    console.log('Yangi todo qo\\'shildi:', payload.record);\n  })\n  .on('UPDATE', (payload) => {\n    console.log('Todo o\\'zgartirildi:', payload.record);\n    console.log('Eski qiymat:', payload.old_record);\n  })\n  .on('DELETE', (payload) => {\n    console.log('Todo o\\'chirildi, ID:', payload.record?.id);\n  })\n  .subscribe((status) => {\n    console.log('Kanal holati:', status); // 'SUBSCRIBED' yoki 'ERROR'\n  });\n\n// Chiqish uchun:\n// channel.unsubscribe();"
          },
          {
            "lang": "ts",
            "title": "Broadcast xabarlari (mijoz ↔ mijoz)",
            "code": "const room = db.channel('collaboration-room')\n  .onBroadcast('cursor', (message) => {\n    console.log(`Foydalanuvchi kursorin pozitsiyasi:`, message.payload);\n  })\n  .subscribe();\n\n// Xabar yuborish\nroom.send('cursor', { x: 150, y: 200, user_id: 'usr_42' });"
          },
          {
            "lang": "ts",
            "title": "Presence — kimlar onlayn",
            "code": "const chat = db.channel('chat-room')\n  .onPresenceSync(() => {\n    const state = chat.presenceState();\n    console.log('Onlayn foydalanuvchilar:', state);\n  })\n  .onPresenceJoin((event) => {\n    console.log(`${event.key} online bo'ldi`, event.state);\n  })\n  .onPresenceLeave((event) => {\n    console.log(`${event.key} offline bo'ldi`);\n  })\n  .subscribe();\n\n// O'z holatini belgilash\nchat.track({\n  user_id: 'usr_123',\n  name: 'Ali',\n  status: 'typing'\n});\n\n// O'z holatini yangilash\nchat.track({ user_id: 'usr_123', name: 'Ali', status: 'away' });\n\n// Chiqish\nchat.untrack();"
          }
        ]
      },
      {
        "heading": "Xatolar boshqarish va TypeScript",
        "body": [
          "Barcha SDK operatsiyalari { data, error } formatda qaytaradi. Xatolarni har doim tekshiring.",
          "error null bo'lsa, operatsiya muvaffaqiyatli. Aks holda error.message xatoning tafsilotini o'z ichiga oladi.",
          "QueryResult<T> turini import qilib, select, insert, update, delete amallarining turini belgilashingiz mumkin.",
          "TypeScript barcha callback va parameter turlarni avtomatik bilan tekshiradi.",
          "Service key maxfiy — server tomonda yoki environment variable sifatida saqlang. Anon key brauzer qatlamida foydalanishga xavfsiz."
        ],
        "examples": [
          {
            "lang": "ts",
            "title": "Xatoni to'g'ri boshqarish",
            "code": "const { data, error, count } = await db\n  .from('posts')\n  .select('*', { count: 'exact' })\n  .eq('status', 'published');\n\nif (error) {\n  console.error('Query xatosi:', error.message);\n  console.error('Kod:', error.code); // 'PGRST...' yoki boshqa\n} else if (data) {\n  console.log(`${count || 0} published post topildi`);\n  data.forEach(post => console.log(`- ${post.title}`));\n} else {\n  console.log('Ma\\'lumot yo\\'q');\n}"
          },
          {
            "lang": "ts",
            "title": "TypeScript turlar",
            "code": "interface Todo {\n  id: number;\n  title: string;\n  done: boolean;\n  created_at: string;\n  user_id: string;\n}\n\n// Strongly typed query\nconst { data: todos, error } = await db\n  .from<Todo>('todos')\n  .select('*')\n  .eq('user_id', 'usr_123');\n\nif (!error && todos) {\n  // TypeScript biladi todos Todo[] ekanini\n  todos.forEach(todo => {\n    console.log(`✓ ${todo.title}`);\n  });\n}"
          },
          {
            "lang": "ts",
            "title": "Environment variables (Next.js misoli)",
            "code": "// .env.local\n// NEXT_PUBLIC_API_URL=https://storage.identify.uz/v1/my-ref\n// NEXT_PUBLIC_ANON_KEY=eyJ...\n// SERVICE_KEY=eyJ... (server tomonda faqat)\n\n// lib/db.ts\nimport { createClient } from '@storagedb/client';\n\nconst apiUrl = process.env.NEXT_PUBLIC_API_URL || '';\nconst key = typeof window === 'undefined'\n  ? process.env.SERVICE_KEY || process.env.NEXT_PUBLIC_ANON_KEY || ''\n  : process.env.NEXT_PUBLIC_ANON_KEY || '';\n\nexport const db = createClient(apiUrl, key);"
          }
        ]
      }
    ]
  },
  {
    "slug": "meta",
    "title": "Meta / DDL (jadval yaratish)",
    "description": "Jadval yaratish va boshqa DDL (CREATE/ALTER/DROP) hamda ixtiyoriy SQL'ni API orqali bajarish. Bu management operatsiyasi — faqat service_key bilan ishlaydi, anon_key bilan emas.",
    "sections": [
      {
        "heading": "Data-plane vs management",
        "body": [
          "storagedb'da `anon_key` va `service_key` — DATA uchun (REST `/rest/v1/...`): qator o'qish, qo'shish, yangilash. Lekin jadval YARATISH (DDL) — bu boshqa, kuchliroq operatsiya.",
          "DDL uchun alohida endpoint bor: `POST /v1/<REF>/meta/query` — ixtiyoriy SQL bajaradi (CREATE TABLE, ALTER, CREATE FUNCTION, index, policy…).",
          "MUHIM: bu endpoint **faqat `service_key`** bilan ishlaydi. `anon_key` bilan so'rov 403 qaytaradi (`meta/query uchun service_role kerak`) — ommaviy client jadvalni yaratib/o'zgartirib yubora olmasligi kerak. Shuning uchun `service_key`'ni faqat backend'da ishlating, brauzerga chiqarmang."
        ]
      },
      {
        "heading": "SDK: db.meta.query()",
        "body": [
          "`@storagedb/client` SDK'sida `db.meta.query(sql)` metodi mavjud. U `{ data, error }` qaytaradi: SELECT bo'lsa `data` — qatorlar massivi; DDL bo'lsa `data` — bo'sh massiv (`[]`).",
          "Client'ni `service_key` bilan yarating (faqat server tomonda)."
        ],
        "examples": [
          {
            "title": "Jadval yaratish (DDL)",
            "lang": "ts",
            "code": "import { createClient } from '@storagedb/client';\n\n// faqat backend'da — service_key brauzerga chiqmasin\nconst db = createClient(\n  'https://storage.identify.uz/v1/<REF>',\n  process.env.SERVICE_KEY!\n);\n\nconst { error } = await db.meta.query(`\n  create table public.todos (\n    id bigint generated always as identity primary key,\n    title text not null,\n    done boolean default false,\n    created_at timestamptz default now()\n  )\n`);\n\nif (error) console.error('DDL xatosi:', error.message);\nelse console.log('Jadval yaratildi');"
          },
          {
            "title": "SELECT — natija data'da",
            "lang": "ts",
            "code": "const { data, error } = await db.meta.query<{ count: number }>(\n  'select count(*)::int as count from public.todos'\n);\n\nif (!error) console.log('Qatorlar:', data?.[0]?.count);"
          },
          {
            "title": "RLS bilan birga (tavsiya etiladi)",
            "lang": "ts",
            "code": "// Jadval yaratgandan keyin RLS yoqing va siyosat qo'shing\nawait db.meta.query(`\n  alter table public.todos enable row level security;\n  create policy \"own todos\" on public.todos\n    for all to authenticated\n    using (owner = auth.uid()) with check (owner = auth.uid());\n`);"
          }
        ]
      },
      {
        "heading": "curl orqali",
        "body": [
          "SDK'siz, to'g'ridan-to'g'ri ham chaqirsa bo'ladi. Body `{ \"query\": \"<SQL>\" }`, header `apikey: <SERVICE_KEY>`. Javob: muvaffaqiyatda `{ \"rows\": [...] }`, xatoda `{ \"error\": \"...\" }` (HTTP 400)."
        ],
        "examples": [
          {
            "title": "curl: CREATE TABLE",
            "lang": "bash",
            "code": "curl -X POST https://storage.identify.uz/v1/<REF>/meta/query \\\n  -H \"apikey: <SERVICE_KEY>\" \\\n  -H \"content-type: application/json\" \\\n  -d '{\"query\":\"create table public.todos (id bigint generated always as identity primary key, title text not null)\"}'\n\n# Javob: {\"rows\":[]}"
          }
        ]
      },
      {
        "heading": "Eslatmalar va cheklovlar",
        "body": [
          "— Avto-schema YO'Q: bo'lmagan jadvalga `insert` qilsangiz, u o'zi yaralmaydi (REST → 404). Postgres aniq `CREATE TABLE` talab qiladi.",
          "— `anon_key` bilan ishlamaydi (403) — ataylab. Faqat `service_key`.",
          "— So'rov tranzaksiyada `service_role` ostida va `STATEMENT_TIMEOUT_MS` (default 15s) bilan bajariladi.",
          "— Dashboard'dagi SQL Editor va Table Editor ham aynan shu endpoint orqali ishlaydi."
        ]
      }
    ]
  }
];

export const DOC_NAV: { slug: string; title: string }[] = [
  {
    "slug": "getting-started",
    "title": "Boshlash"
  },
  {
    "slug": "rest",
    "title": "REST API"
  },
  {
    "slug": "rpc",
    "title": "RPC (Postgres funksiyalar)"
  },
  {
    "slug": "auth",
    "title": "Authentication"
  },
  {
    "slug": "storage",
    "title": "Storage"
  },
  {
    "slug": "realtime",
    "title": "Realtime"
  },
  {
    "slug": "sdk",
    "title": "Client SDK (@storagedb/client)"
  },
  {
    "slug": "meta",
    "title": "Meta / DDL (jadval yaratish)"
  }
];

export function getDoc(slug: string): DocPage | undefined {
  return DOCS.find((d) => d.slug === slug);
}
