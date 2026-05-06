# 🚀 Быстрый старт

## 1. Предварительные требования

- Docker 20+ и Docker Compose 2.0+
- Node.js 20+ (для локальной разработки)
- Git

## 2. Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd bx-ai-generator

# Копирование переменных окружения
cp .env.example .env

# Генерация ключа шифрования (Linux/Mac)
openssl rand -hex 32 >> .env

# Или вручную отредактируйте .env:
# ENCRYPTION_KEY=<your-32-character-secret-key>
# OPENROUTER_API_KEY=<your-openrouter-api-key>
```

## 3. Запуск

### Базовый запуск (все сервисы)
```bash
docker-compose up -d
```

### С вебхук-туннелем (для тестирования Bitrix24)
```bash
# Вариант A: Cloudflare Tunnel
docker-compose --profile webhook-test up -d

# Вариант B: Ngrok (отдельно)
./scripts/setup-webhook-tunnel.sh
```

## 4. Проверка работы

```bash
# Статус сервисов
docker-compose ps

# Health check
curl http://localhost:80/health

# API Metrics
curl http://localhost:3000/metrics
```

## 5. Доступ к сервисам

| Сервис | URL | Логин/Пароль |
|--------|-----|--------------|
| **Frontend** | http://localhost:80 | - |
| **API** | http://localhost:3000 | - |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **MinIO Console** | http://localhost:9001 | minio_admin / minio_secure_password_change_me |

## 6. Первоначальная настройка

### 6.1 Настройка OpenRouter
1. Откройте http://localhost:80/settings
2. Вкладка "AI Модели"
3. Введите ваш `OPENROUTER_API_KEY`
4. Нажмите "Сохранить"
5. Выберите модели для генерации, пресетов и редактирования

### 6.2 Настройка S3 (опционально)
1. Вкладка "Хранилище"
2. Включите "Использовать S3"
3. Укажите параметры (или используйте MinIO по умолчанию)
4. Нажмите "Тест подключения"

### 6.3 Настройка Bitrix24
1. Вкладка "Bitrix24"
2. Выберите сущность (Сделка, Компания, Контакт)
3. Загрузите поля
4. Выберите поле типа "Файл" для изображений
5. Включите "Использовать изображение из CRM" (опционально)
6. Сохраните и протестируйте

## 7. Тестирование вебхуков Bitrix24

### Вариант A: Автоматическая настройка
```bash
./scripts/setup-webhook-tunnel.sh
```

### Вариант B: Ручная настройка (ngrok)
```bash
# Установка ngrok
brew install ngrok  # macOS
snap install ngrok  # Linux

# Запуск
ngrok http 80 --host-header=nginx

# Скопируйте URL из вывода (например: https://abc123.ngrok.io)
```

### Настройка в Bitrix24
1. Зайдите в Bitrix24 → Разработка → Локальные приложения
2. Создайте приложение типа "Сервер"
3. Укажите URL обработчика: `https://your-url.ngrok.io/api/bitrix/webhook`
4. Выберите события: `ONCRMDEALUPDATE`, `ONCRMCOMPANYADD`, и т.д.
5. Сохраните

### Проверка
1. Обновите сделку в Bitrix24
2. Проверьте логи: `docker logs ai_generator_api -f`

## 8. Основные команды

```bash
# Просмотр логов
docker-compose logs -f api
docker-compose logs -f worker

# Перезапуск сервиса
docker-compose restart api

# Остановка
docker-compose down

# Полная очистка (с удалением данных)
docker-compose down -v

# Обновление образов
docker-compose pull
docker-compose up -d --build
```

## 9. Решение проблем

### Сервис не запускается
```bash
# Проверка логов
docker-compose logs <service-name>

# Проверка переменных окружения
docker-compose exec api env | grep KEY
```

### Ошибки подключения к БД
```bash
# Проверка здоровья PostgreSQL
docker-compose exec postgres pg_isready

# Перезапуск БД
docker-compose restart postgres
```

### Вебхуки не приходят
```bash
# Проверка туннеля
docker-compose logs cloudflared

# Тест локального вебхука
curl -X POST http://localhost:80/api/bitrix/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

## 10. Следующие шаги

- 📖 [Полное руководство по тестированию](docs/TESTING_CHECKLIST.md)
- 🔗 [Настройка вебхуков](docs/WEBHOOK_TESTING.md)
- 📚 [Каталог функций](docs/CATALOG.md)
- 🏗️ [Архитектура](docs/ARCHITECTURE.md)

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте [чеклист тестирования](docs/TESTING_CHECKLIST.md)
2. Изучите логи сервисов
3. Убедитесь что все переменные окружения настроены
4. Проверьте подключение к внешним API (OpenRouter, Bitrix24)
