# 🧪 Тестирование приложения

## ✅ Чеклист полного тестирования

### 1. Инфраструктура

#### Запуск всех сервисов
```bash
# Базовый запуск
docker-compose up -d

# С вебхук-туннелем (Cloudflare)
docker-compose --profile webhook-test up -d

# Проверка статусов
docker-compose ps
```

**Ожидаемый результат:**
- ✅ postgres: healthy
- ✅ redis: healthy
- ✅ minio: healthy
- ✅ api: running
- ✅ worker: running
- ✅ frontend: running
- ✅ nginx: running
- ✅ prometheus: running
- ✅ grafana: running
- ⚠️ cloudflared: running (только с профилем webhook-test)

---

### 2. API Endpoints

#### Health Check
```bash
curl http://localhost:80/health
curl http://localhost:80/ready
```

**Ожидаемый ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "s3": "connected"
  }
}
```

#### Metrics (Prometheus)
```bash
curl http://localhost:3000/metrics
```

**Ожидаемые метрики:**
- `http_requests_total`
- `ai_jobs_processed_total`
- `ai_jobs_failed_total`
- `ai_generation_duration_seconds`
- `s3_uploads_total`

---

### 3. OpenRouter Integration

#### Получение списка моделей
```bash
curl http://localhost:80/api/openrouter/models | jq
```

**Проверка:**
- ✅ Возвращается массив моделей
- ✅ Каждая модель имеет: `id`, `name`, `pricing`, `context_length`
- ✅ Есть image-модели (для генерации)
- ✅ Есть vision-модели (для пресетов)

#### Фильтрация моделей
```bash
# Только image-модели
curl http://localhost:80/api/openrouter/models/image

# Только vision-модели
curl http://localhost:80/api/openrouter/models/vision
```

**Ожидаемый результат:**
- Image модели: `black-forest-labs/flux-1.1-pro`, `stabilityai/stable-diffusion-3.5`
- Vision модели: `openai/gpt-4-vision-preview`, `anthropic/claude-3-opus`

---

### 4. S3/MinIO Storage

#### Проверка подключения
```bash
curl -X POST http://localhost:80/api/settings/s3/test \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "message": "S3 connection successful",
  "bucket": "bx-images",
  "endpoint": "http://minio:9000"
}
```

#### Загрузка тестового файла
```bash
# Создание тестового изображения
convert -size 100x100 xc:red test.png

# Загрузка через API
curl -X POST http://localhost:80/api/upload \
  -F "file=@test.png"
```

**Проверка в MinIO Console:**
1. Откройте http://localhost:9001
2. Логин: `minio_admin`, Пароль: `minio_secure_password_change_me`
3. Перейдите в бакет `bx-images`
4. ✅ Файл должен отображаться

---

### 5. Bitrix24 Integration

#### Тест вебхука (локально)
```bash
curl -X POST http://localhost:80/api/bitrix/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "onCrmDealUpdate",
    "data": {
      "FIELDS": {
        "ID": "123",
        "TITLE": "Тестовая сделка",
        "UF_CRM_IMAGE": ["12345"]
      }
    }
  }'
```

**Ожидаемый результат:**
- ✅ Логирование в `docker logs ai_generator_api`
- ✅ Обработка события воркером
- ✅ Статус 200 OK

#### Тест с туннелем (ngrok/cloudflared)
```bash
# 1. Запуск туннеля
./scripts/setup-webhook-tunnel.sh

# 2. Скопируйте URL из вывода (например: https://abc123.ngrok.io)

# 3. Настройте Bitrix24:
#    - Разработка → Локальные приложения
#    - URL обработчика: https://abc123.ngrok.io/api/bitrix/webhook

# 4. Обновите сделку в Bitrix24

# 5. Проверьте логи
docker logs ai_generator_api -f
```

---

### 6. AI Generation Flow

#### Создание задачи генерации
```bash
curl -X POST http://localhost:80/api/generation \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful landscape with mountains",
    "negative_prompt": "blurry, low quality",
    "model": "black-forest-labs/flux-1.1-pro",
    "width": 1024,
    "height": 1024,
    "quality": 8
  }'
```

**Ожидаемый ответ:**
```json
{
  "jobId": "uuid-here",
  "status": "queued",
  "estimatedTime": 30
}
```

#### Проверка статуса (SSE)
```bash
curl -N http://localhost:80/api/generation/{jobId}/stream
```

**Ожидаемые события:**
```
event: status
data: {"status": "processing", "progress": 0.3}

event: status
data: {"status": "processing", "progress": 0.7}

event: complete
data: {"status": "completed", "imageUrl": "https://..."}
```

#### Проверка воркера
```bash
docker logs ai_generator_worker -f
```

**Ожидаемые логи:**
```
[INFO] Job uuid-here started
[INFO] Calling OpenRouter API...
[INFO] Image generated successfully
[INFO] Uploaded to S3: bx-images/uuid-here.png
[INFO] Job uuid-here completed
```

---

### 7. Frontend UI

#### Вкладка "Создание"
1. Откройте http://localhost:80
2. Перейдите на вкладку **Создание**
3. ✅ Загрузка изображений (Drag & Drop)
4. ✅ Выбор пресета из списка
5. ✅ Редактирование промта
6. ✅ Настройка разрешения и качества
7. ✅ Кнопка "Генерировать" активна при заполненных полях
8. ✅ Отображение прогресса генерации
9. ✅ Галерея результатов

#### Вкладка "Пресеты"
1. ✅ Кнопка "Создать из фото"
2. ✅ Загрузка референса
3. ✅ Генерация промта через vision-модель
4. ✅ Сохранение пресета
5. ✅ Редактирование/удаление пресетов

#### Вкладка "Настройки"
1. ✅ 5 вкладок настроек (AI, Хранилище, Bitrix, Вывод, Сессия)
2. ✅ Тест подключения S3
3. ✅ Загрузка полей Bitrix24
4. ✅ Toggle "Использовать изображение из CRM"
5. ✅ Сохранение настроек

#### Контекстная помощь
1. ✅ Кнопка ❓ в шапке
2. ✅ Панель выезжает справа
3. ✅ Авто-выбор раздела по активной вкладке
4. ✅ Поиск по темам
5. ✅ Аккордеон тем

---

### 8. Безопасность

#### RBAC Middleware
```bash
# Без токена
curl http://localhost:80/api/settings
# Ожидаемо: 401 Unauthorized

# С токеном viewer
curl -H "Authorization: Bearer viewer_token" http://localhost:80/api/settings
# Ожидаемо: 200 OK (только чтение)

# С токеном admin
curl -H "Authorization: Bearer admin_token" -X PUT http://localhost:80/api/settings
# Ожидаемо: 200 OK (полный доступ)
```

#### Rate Limiting
```bash
# 100 запросов подряд
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:80/health
done
```

**Ожидаемый результат:**
- Первые 100 запросов: 200
- Следующие 5 запросов: 429 Too Many Requests

#### Шифрование данных
```bash
# Проверка в БД
docker exec -it ai_generator_db psql -U aiuser -d aigenerator \
  -c "SELECT key, value FROM app_settings WHERE key = 'openrouter_api_key';"
```

**Ожидаемый результат:**
- ✅ Значение зашифровано (не plain text)
- ✅ Длина соответствует AES-256-GCM

---

### 9. Мониторинг

#### Prometheus Metrics
1. Откройте http://localhost:9090
2. Введите запрос: `ai_jobs_processed_total`
3. ✅ Должны отображаться метрики

#### Grafana Dashboards
1. Откройте http://localhost:3001
2. Логин: `admin`, Пароль: `admin`
3. Перейдите в Dashboards
4. ✅ Дашборд "AI Generator Metrics"
5. ✅ Графики: Jobs, Duration, Errors, S3 Uploads

#### MinIO Console
1. Откройте http://localhost:9001
2. Логин: `minio_admin`, Пароль: `minio_secure_password_change_me`
3. ✅ Бакет `bx-images` существует
4. ✅ Файлы загружаются после генерации

---

### 10. E2E Сценарии

#### Сценарий 1: Полная генерация
```
1. Пользователь загружает референс
2. Выбирает пресет
3. Редактирует промт
4. Нажимает "Генерировать"
5. Наблюдает прогресс в реальном времени
6. Получает результат в галерее
7. Кликает для редактирования
8. Применяет изменения
9. Сохраняет в Bitrix24
```

**Критерии успеха:**
- ✅ Все шаги выполняются без ошибок
- ✅ UI не блокируется во время генерации
- ✅ Изображение сохраняется в S3
- ✅ FILE_ID создается в Bitrix Disk
- ✅ Сущность Bitrix обновляется

#### Сценарий 2: Создание пресета
```
1. Пользователь загружает фото
2. Нажимает "Создать пресет из фото"
3. Vision-модель анализирует изображение
4. Генерируется детальный промт
5. Пользователь редактирует название
6. Сохраняет пресет
7. Пресет появляется в списке
```

#### Сценарий 3: Настройка Bitrix
```
1. Пользователь переходит в Настройки → Bitrix24
2. Выбирает сущность "Сделка"
3. Загружается список полей
4. Выбирает поле типа "Файл"
5. Включает toggle "Использовать изображение из CRM"
6. Сохраняет настройки
7. Тестирует подключение
```

---

### 11. Производительность

#### Load Testing (Apache Bench)
```bash
# 1000 запросов, 10 одновременных
ab -n 1000 -c 10 http://localhost:80/health
```

**Ожидаемые результаты:**
- Requests per second: >100
- Time per request: <50ms
- Failed requests: 0

#### Стресс-тест очередей
```bash
# Отправка 50 задач генерации
for i in {1..50}; do
  curl -X POST http://localhost:80/api/generation \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"Test $i\", \"model\": \"flux\"}" &
done

# Мониторинг очереди
watch 'docker exec ai_generator_redis redis-cli LLEN ai:generate'
```

**Ожидаемое поведение:**
- ✅ Задачи добавляются в очередь
- ✅ Worker обрабатывает параллельно (CONCURRENCY=2)
- ✅ Нет потери задач
- ✅ Graceful degradation при перегрузке

---

### 12. Диагностика проблем

#### Чеклист проблем

| Проблема | Команда диагностики | Решение |
|----------|-------------------|---------|
| API не отвечает | `docker logs ai_generator_api` | Перезапустить контейнер |
| Воркер не работает | `docker logs ai_generator_worker` | Проверить REDIS_URL |
| S3 ошибки | `docker logs ai_generator_minio` | Проверить credentials |
| Вебхуки не приходят | `docker logs ai_generator_cloudflared` | Проверить токен туннеля |
| БД недоступна | `docker exec ai_generator_db pg_isready` | Проверить healthcheck |
| Frontend пустой | `docker logs ai_generator_nginx` | Проверить VITE_API_URL |

#### Полезные команды

```bash
# Просмотр всех логов
docker-compose logs -f

# Рестарт конкретного сервиса
docker-compose restart api

# Очистка и пересоздание
docker-compose down -v && docker-compose up -d

# Вход в контейнер
docker exec -it ai_generator_api sh

# Проверка переменных окружения
docker exec ai_generator_api env | grep OPENROUTER

# Мониторинг Redis очередей
docker exec -it ai_generator_redis redis-cli
> KEYS *
> LLEN ai:generate
> LRANGE ai:generate 0 -1
```

---

### 13. Автоматические тесты

#### Unit Tests
```bash
cd backend
npm run test
```

**Покрытие:**
- ✅ OpenRouter адаптер
- ✅ S3 сервис
- ✅ Шифрование
- ✅ Модерация контента
- ✅ A/B тестирование

#### E2E Tests (Playwright)
```bash
cd frontend
npm run test:e2e
```

**Сценарии:**
- ✅ Регистрация пользователя
- ✅ Создание генерации
- ✅ Управление пресетами
- ✅ Настройка Bitrix интеграции

---

## 📊 Итоговый чеклист готовности

- [ ] Все сервисы запускаются `docker-compose up -d`
- [ ] Health check возвращает 200 OK
- [ ] OpenRouter модели загружаются с ценами
- [ ] S3 загрузка работает
- [ ] Bitrix вебхуки принимаются
- [ ] Генерация изображений работает
- [ ] Frontend UI функционален
- [ ] Помощь открывается контекстно
- [ ] Настройки сохраняются
- [ ] Метрики собираются
- [ ] Безопасность (RBAC, Rate Limit, Encryption) работает
- [ ] Документация актуальна

## 📚 Дополнительная документация

- [`docs/WEBHOOK_TESTING.md`](docs/WEBHOOK_TESTING.md) - Настройка вебхуков
- [`docs/CATALOG.md`](docs/CATALOG.md) - Каталог функций
- [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) - Итоги реализации
- [`QUICK_START.md`](QUICK_START.md) - Быстрый старт
