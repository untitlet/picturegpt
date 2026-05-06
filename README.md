# 🤖 Bitrix24 AI Image Generator

**Production-ready fullstack приложение для генерации изображений с интеграцией в Bitrix24 CRM и использованием OpenRouter API**

## 🚀 Быстрый старт

```bash
# 1. Копирование переменных окружения
cp .env.example .env

# 2. Редактирование .env (укажите OPENROUTER_API_KEY и ENCRYPTION_KEY)
# ENCRYPTION_KEY=$(openssl rand -hex 32)

# 3. Запуск всех сервисов
docker-compose up -d

# 4. Проверка статусов
docker-compose ps
```

### С вебхук-туннелем (для тестирования Bitrix24)
```bash
# Вариант A: Cloudflare Tunnel
docker-compose --profile webhook-test up -d

# Вариант B: Автоматическая настройка через скрипт
./scripts/setup-webhook-tunnel.sh
```

## 📦 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Compose                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)  →  Nginx  →  Backend (Fastify)           │
│       :80                :80          :3000                  │
│                                                        │
│  Worker (BullMQ)  ←  Redis  →  PostgreSQL                 │
│       :3000              :6379       :5432                  │
│                                                        │
│  MinIO (S3)  ←→  Prometheus  ←→  Grafana                  │
│    :9000/:9001      :9090           :3001                  │
│                                                        │
│  Cloudflare Tunnel (optional, profile: webhook-test)        │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Сервисы

| Сервис | URL | Описание |
|--------|-----|----------|
| **Frontend** | http://localhost:80 | React SPA (Bitrix24 style UI) |
| **API** | http://localhost:3000 | Fastify REST API |
| **Grafana** | http://localhost:3001 | Мониторинг и дашборды (admin/admin) |
| **Prometheus** | http://localhost:9090 | Сбор метрик |
| **MinIO Console** | http://localhost:9001 | S3 хранилище (minio_admin/minio_secure_password_change_me) |

## 📡 API Endpoints

### OpenRouter
```bash
# Все модели с ценами и лимитами
curl http://localhost:80/api/openrouter/models

# Только image-модели
curl http://localhost:80/api/openrouter/models/image

# Vision модели для пресетов
curl http://localhost:80/api/openrouter/models/vision
```

### Settings
```bash
# Получить настройки
curl http://localhost:80/api/settings

# Обновить настройки
curl -X PUT http://localhost:80/api/settings \
  -H "Content-Type: application/json" \
  -d '{"openrouter_api_key": "sk-..."}'

# Тест S3 подключения
curl -X POST http://localhost:80/api/settings/s3/test

# Загрузить поля Bitrix24
curl http://localhost:80/api/settings/bitrix/fields
```

### Generation
```bash
# Создать задачу генерации
curl -X POST http://localhost:80/api/generation \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Beautiful landscape",
    "model": "black-forest-labs/flux-1.1-pro",
    "width": 1024,
    "height": 1024
  }'

# SSE статус задачи
curl -N http://localhost:80/api/generation/{jobId}/stream
```

### Bitrix Webhooks
```bash
# Обработчик вебхуков
curl -X POST http://localhost:80/api/bitrix/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "onCrmDealUpdate", "data": {...}}'
```

## 🎯 Основные возможности

### ✅ Фаза 1: Инфраструктура
- Docker Compose с 10 сервисами
- S3-compatible хранилище (MinIO)
- Мониторинг (Prometheus + Grafana)
- Асинхронная обработка (BullMQ + Redis)

### ✅ Фаза 2: UX/UI
- Bitrix24 Style UI (top navigation, без левой колонки)
- Сравнение изображений (side-by-side/grid)
- Визуальный конструктор пресетов
- Контекстная помощь (панель справа)

### ✅ Фаза 3: Bitrix24 Integration
- Вебхуки для событий CRM
- Работа со смарт-процессами
- Загрузка файлов в Bitrix Disk
- Мульти-портальные настройки
- Выбор поля типа FILE для изображений

### ✅ Фаза 4: Advanced AI
- Модерация контента
- Апскейлинг изображений (2x-4x)
- A/B тестирование моделей
- OpenRouter adapter с ценами и лимитами

### ✅ Фаза 5: Безопасность
- AES-256-GCM шифрование токенов
- RBAC (admin/manager/viewer)
- Rate limiting
- Zod валидация

## 📚 Документация

| Документ | Описание |
|----------|----------|
| [QUICK_START.md](QUICK_START.md) | Быстрый старт за 5 минут |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Итоговая сводка реализации |
| [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md) | Полный чеклист тестирования |
| [docs/WEBHOOK_TESTING.md](docs/WEBHOOK_TESTING.md) | Настройка вебхуков Bitrix24 |
| [docs/CATALOG.md](docs/CATALOG.md) | Каталог всех функций |
| [docs/UI_DESIGN.md](docs/UI_DESIGN.md) | Дизайн-система и макеты |

## 🔒 Безопасность

1. **Шифрование**: Все секреты шифруются AES-256-GCM перед сохранением в БД
2. **RBAC**: Три роли с разными уровнями доступа
3. **Rate Limiting**: 100 запросов/мин на IP
4. **Валидация**: Zod схемы для всех входных данных
5. **CSP/Headers**: Helmet middleware

## 🧪 Тестирование

```bash
# Backend unit tests
cd backend && npm run test

# Frontend E2E tests
cd frontend && npm run test:e2e

# Health check
curl http://localhost:80/health

# API metrics
curl http://localhost:3000/metrics
```

Полный чеклист: [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md)

## 🛠️ Разработка

```bash
# Локальный запуск бэкенда
cd backend
npm install
npm run dev

# Локальный запуск фронтенда
cd frontend
npm install
npm run dev

# Применение миграций БД
npx prisma migrate dev
```

## 📊 Мониторинг

### Prometheus Metrics
- `http_requests_total` - HTTP запросы
- `ai_jobs_processed_total` - Обработанные AI задачи
- `ai_generation_duration_seconds` - Длительность генерации
- `s3_uploads_total` - Загрузки в S3

### Grafana Dashboards
Откройте http://localhost:3001 → Dashboards:
- AI Generator Overview
- Jobs Processing
- Error Rates
- S3 Operations

## 🔧 Troubleshooting

```bash
# Просмотр логов
docker-compose logs -f api
docker-compose logs -f worker

# Перезапуск сервиса
docker-compose restart api

# Полная очистка и перезапуск
docker-compose down -v && docker-compose up -d

# Проверка подключения к БД
docker exec ai_generator_db pg_isready

# Проверка очередей Redis
docker exec -it ai_generator_redis redis-cli
> LLEN ai:generate
```

## 📋 Требования

- Docker 20+ и Docker Compose 2.0+
- Node.js 20+ (для разработки)
- OpenRouter API key
- Bitrix24 аккаунт (опционально)

## 📄 Лицензия

MIT

---

**🎉 Проект готов к использованию!**

Следуйте [QUICK_START.md](QUICK_START.md) для запуска.
Полная документация в папке [docs/](docs/).
