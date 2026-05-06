# Тестирование и Валидация Функционала

## 1. Проверка OpenRouter API Integration

### 1.1 Получение списка моделей с ценами и лимитами

```bash
# Получить все модели
curl http://localhost:3000/api/openrouter/models | jq

# Получить только image-модели
curl http://localhost:3000/api/openrouter/models/image | jq

# Получить vision-модели для создания пресетов
curl http://localhost:3000/api/openrouter/models/vision | jq

# Принудительно обновить кэш
curl "http://localhost:3000/api/openrouter/models?refresh=true" | jq
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stabilityai/stable-diffusion-xl",
      "name": "Stable Diffusion XL",
      "context_length": 4096,
      "pricing": {
        "prompt": "0.0001",
        "completion": "0.0001",
        "image": "0.002"
      },
      "top_provider": {
        "max_completion_tokens": null,
        "is_moderated": false
      },
      "architecture": {
        "modality": "image",
        "tokenizer": "unknown"
      }
    }
  ],
  "cached": false
}
```

### 1.2 Проверка кэширования

```bash
# Первый запрос (не кэш)
curl http://localhost:3000/api/openrouter/models | jq '.cached'
# Ожидается: false

# Второй запрос (< 5 минут)
curl http://localhost:3000/api/openrouter/models | jq '.cached'
# Ожидается: true
```

## 2. Тестирование Безопасности

### 2.1 RBAC Middleware

```bash
# Доступ без роли (по умолчанию viewer)
curl http://localhost:3000/api/presets
# Ожидается: успех (viewer имеет presets:read)

# Попытка удаления с ролью viewer
curl -X DELETE http://localhost:3000/api/presets/uuid \
  -H "x-user-role: viewer"
# Ожидается: 403 Forbidden

# Удаление с ролью admin
curl -X DELETE http://localhost:3000/api/presets/uuid \
  -H "x-user-role: admin"
# Ожидается: успех
```

### 2.2 Rate Limiting

```bash
# Быстрые запросы к генерации (лимит 10/мин)
for i in {1..15}; do
  curl -w "%{http_code}\n" -o /dev/null \
    -X POST http://localhost:3000/api/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}'
done
# Ожидается: первые 10 - 200, следующие - 429 Too Many Requests
```

### 2.3 Модерация Контента

```bash
# Запрос с запрещённым контентом
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"violence and gore explicit content"}'
# Ожидается: 400 Bad Request с ошибкой модерации
```

## 3. Тестирование Bitrix24 Integration

### 3.1 Смарт-процессы

```bash
# Получить типы смарт-процессов
curl http://localhost:3000/api/bitrix/smart-processes \
  -H "Authorization: Bearer YOUR_BITRIX_TOKEN"

# Получить поля конкретного процесса
curl http://localhost:3000/api/bitrix/smart-processes/123/fields

# Загрузить изображения в смарт-процесс
curl -X POST http://localhost:3000/api/bitrix/smart-processes/123/456/images \
  -H "Content-Type: application/json" \
  -d '{
    "fieldCode": "UF_CRM_IMAGE",
    "imageUrls": ["https://example.com/image.png"]
  }'
```

### 3.2 Вебхуки

```bash
# Отправка тестового вебхука
curl -X POST http://localhost:3000/api/bitrix/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EVENT": "ON_CRMD_ENTITY_UPDATE",
    "DATA": {
      "ID": 123,
      "ENTITY_TYPE_ID": "DEAL"
    }
  }'
# Ожидается: {"success": true}
```

## 4. Тестирование Advanced AI Features

### 4.1 Апскейлинг

```bash
curl -X POST http://localhost:3000/api/upscale \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "your-job-uuid",
    "scale": 2
  }'
# Ожидается: ссылка на upscaled изображение
```

### 4.2 A/B Тестирование

```bash
curl -X POST http://localhost:3000/api/ab-test \
  -H "Content-Type: application/json" \
  -d '{
    "variants": [
      {
        "model": "stabilityai/stable-diffusion-xl",
        "prompt": "cyberpunk city",
        "parameters": {"width": 1024, "height": 1024}
      },
      {
        "model": "midjourney/midjourney-v5",
        "prompt": "cyberpunk city",
        "parameters": {"width": 1024, "height": 1024}
      }
    ]
  }'
# Ожидается: результаты сравнения с метриками
```

## 5. Мониторинг и Метрики

### 5.1 Prometheus Metrics

```bash
# Проверка метрик приложения
curl http://localhost:3000/metrics

# Основные метрики:
# - ai_jobs_processed_total
# - ai_jobs_failed_total
# - ai_generation_duration_seconds
# - s3_uploads_total
# - http_request_duration_seconds
```

### 5.2 Grafana Dashboards

Откройте http://localhost:3001 и используйте логин/пароль из docker-compose

## 6. E2E Сценарии

### Сценарий 1: Полный цикл генерации

1. Получить список моделей: `GET /api/openrouter/models/image`
2. Создать пресет: `POST /api/presets`
3. Запустить генерацию: `POST /api/generate`
4. Проверить статус: `GET /api/generations/:id`
5. Скачать результат из S3

### Сценарий 2: Создание пресета из изображения

1. Загрузить референс: `POST /api/upload`
2. Анализировать: `POST /api/analyze` (vision модель)
3. Сохранить пресет: `POST /api/presets`

### Сценарий 3: Сохранение в Bitrix24

1. Сгенерировать изображение
2. Выбрать сущность Bitrix
3. Загрузить в Disk: `POST /api/bitrix/.../images`
4. Проверить в CRM

## 7. Проверка Типизации TypeScript

```bash
cd /workspace/backend
npx tsc --noEmit
# Ожидается: 0 ошибок

cd /workspace/frontend
npx tsc --noEmit
# Ожидается: 0 ошибок
```

## 8. Load Testing (опционально)

```bash
# Установка k6
npm install -g k6

# Запуск теста
k6 run load-test.js
```

## Чеклист готовности

- [ ] OpenRouter API возвращает модели с ценами
- [ ] Кэширование работает (5 минут)
- [ ] RBAC ограничивает доступ по ролям
- [ ] Rate limiting блокирует превышение лимита
- [ ] Модерация отклоняет запрещённый контент
- [ ] Bitrix вебхуки обрабатываются
- [ ] Смарт-процессы поддерживаются
- [ ] Апскейлинг работает
- [ ] A/B тесты возвращают результаты
- [ ] Метрики видны в Prometheus
- [ ] TypeScript компилируется без ошибок
