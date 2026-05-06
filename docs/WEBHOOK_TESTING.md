# 🌐 Настройка вебхуков Bitrix24 для локального тестирования

## Проблема
Bitrix24 не может отправить вебхук на `http://localhost:80` или `http://host.docker.internal`. Для получения вебхуков нужен публичный HTTPS URL.

## Решение: Cloudflare Tunnel

### Вариант 1: Cloudflare Tunnel (Рекомендуется)

#### Шаг 1: Установка cloudflared локально (опционально для теста)
```bash
# macOS
brew install cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Windows (Chocolatey)
choco install cloudflared
```

#### Шаг 2: Создание туннеля
```bash
# Авторизация в Cloudflare
cloudflared tunnel login

# Создание туннеля
cloudflared tunnel create bx-ai-tunnel

# Сохраните ID туннеля из вывода (например: 170536ed-9d52-4e68-8f5b-8c8f8e8e8e8e)
```

#### Шаг 3: Настройка маршрута
```bash
# Маршрутизация на nginx (порт 80)
cloudflared tunnel route dns bx-ai-tunnel bx-ai-test.yourdomain.com

# Или используйте quick tunnel для временного URL
cloudflared tunnel --url http://localhost:80
```

#### Шаг 4: Получение токена
```bash
# Генерация токена для Docker
cloudflared tunnel token --cred-file /tmp/cred.json bx-ai-tunnel

# Скопируйте токен из файла /tmp/cred.json
cat /tmp/cred.json | jq -r '.credentials'
```

#### Шаг 5: Запуск с туннелем
```bash
# В .env добавьте:
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi... (ваш токен)

# Запуск с профилем webhook-test
docker-compose --profile webhook-test up -d
```

### Вариант 2: Ngrok (Альтернатива)

#### Шаг 1: Установка ngrok
```bash
# macOS
brew install ngrok

# Linux
snap install ngrok

# Регистрация и получение токена на https://ngrok.com
```

#### Шаг 2: Запуск ngrok
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN

# Туннель на порт nginx
ngrok http 80 --host-header=nginx
```

Вы получите URL вида: `https://abc123.ngrok.io`

#### Шаг 3: Обновление настроек Bitrix24
В настройках приложения Bitrix24 укажите:
```
Webhook URL: https://abc123.ngrok.io/api/bitrix/webhook
```

### Вариант 3: LocalXpose / Serveo (Бесплатные альтернативы)

```bash
# LocalXpose
loclx tunnel http --to localhost:80

# Serveo (без установки)
ssh -R 80:localhost:80 serveo.net
```

## 🔧 Настройка Bitrix24 Webhook

### Шаг 1: Регистрация локального приложения
1. Зайдите в Bitrix24 → Разработка → Другие настройки → Локальные приложения
2. Создать приложение
3. Тип: "Сервер"
4. Обработчики событий:
   - `ONCRMDEALADD`
   - `ONCRMDEALUPDATE`
   - `ONCRMCOMPANYADD`
   - `ONCRMCATEGORYSTATUSCHANGE` (для смарт-процессов)

### Шаг 2: Настройка вебхука
```
URL обработчика: https://your-tunnel-url.ngrok.io/api/bitrix/webhook
```

### Шаг 3: Проверка подписки
```bash
#curl запрос для проверки
curl -X POST https://your-bitrix-portal.bitrix24.ru/rest/1/YOUR_WEBHOOK/event/onCrmDealUpdate.json \
  -d '{
    "handler": "https://your-tunnel-url.ngrok.io/api/bitrix/webhook",
    "event": "onCrmDealUpdate"
  }'
```

## 📝 Файлы конфигурации

### docker-compose.override.yml (для разработки)
```yaml
version: '3.8'

services:
  cloudflared:
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    volumes:
      - ./cloudflared/config.yml:/etc/cloudflared/config.yml:ro
```

### cloudflared/config.yml
```yaml
tunnel: bx-ai-tunnel
credentials-file: /etc/cloudflared/cred.json

ingress:
  - hostname: bx-ai-test.yourdomain.com
    service: http://nginx:80
  
  - service: http_status:404
```

## 🧪 Тестирование вебхуков

### 1. Логирование входящих запросов
```bash
# Просмотр логов cloudflared
docker logs ai_generator_cloudflared -f

# Просмотр логов API
docker logs ai_generator_api -f
```

### 2. Отправка тестового вебхука
```bash
# Создайте файл test-webhook.json
{
  "event": "onCrmDealUpdate",
  "data": {
    "FIELDS": {
      "ID": "123",
      "TITLE": "Тестовая сделка",
      "UF_CRM_IMAGE": ["12345"]
    }
  }
}

# Отправка через curl
curl -X POST http://localhost:80/api/bitrix/webhook \
  -H "Content-Type: application/json" \
  -d @test-webhook.json
```

### 3. Мониторинг очередей
```bash
# Подключение к Redis
docker exec -it ai_generator_redis redis-cli

# Просмотр очереди
LRANGE ai:generate 0 -1
```

## 🔒 Безопасность

### Проверка подписи вебхука
Все вебхуки должны проверяться по секретному ключу:

```typescript
// backend/src/middleware/webhook-auth.middleware.ts
import { verifyWebhookSignature } from '../services/bitrix/webhooks/signature';

app.post('/api/bitrix/webhook', 
  verifyWebhookSignature(process.env.BITRIX_WEBHOOK_SECRET),
  webhookHandler
);
```

### Ограничение доступа
```nginx
# nginx/nginx.conf
location /api/bitrix/webhook {
  limit_req zone=webhook_limit burst=10 nodelay;
  
  # Разрешить только IP Bitrix24
  allow 185.166.208.0/22;
  allow 193.106.92.0/22;
  deny all;
  
  proxy_pass http://api:3000;
}
```

## 📊 Диагностика

### Чеклист проблем
| Проблема | Решение |
|----------|---------|
| Вебхуки не приходят | Проверьте URL в Bitrix24, убедитесь что туннель активен |
| Ошибки SSL | Используйте HTTPS URL от ngrok/cloudflared |
| Таймауты | Увеличьте таймаут в настройках Bitrix24 |
| Дубликаты событий | Реализуйте идемпотентность по ID события |

### Полезные команды
```bash
# Перезапуск туннеля
docker-compose --profile webhook-test restart cloudflared

# Проверка статуса туннеля
docker exec ai_generator_cloudflared cloudflared tunnel info bx-ai-tunnel

# Тест доступности
curl -I https://your-tunnel-url.ngrok.io/health
```

## 🎯 Готовые решения

### Quick Start для тестирования
```bash
# 1. Запуск ngrok в отдельном терминале
ngrok http 80

# 2. Копирование URL из вывода (например: https://abc123.ngrok.io)

# 3. Настройка Bitrix24:
#    - URL обработчика: https://abc123.ngrok.io/api/bitrix/webhook

# 4. Тестовое событие в Bitrix24:
#    - Обновите любую сделку
#    - Проверьте логи: docker logs ai_generator_api -f
```

## 📚 Ссылки
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/)
- [Ngrok Documentation](https://ngrok.com/docs)
- [Bitrix24 Webhooks](https://dev.bitrix24.ru/article/webhooks)
- [Bitrix24 Events](https://dev.bitrix24.ru/article/sobytiya)
