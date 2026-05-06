#!/bin/bash

# 🚀 Quick Start Script for Webhook Testing
# Автоматическая настройка туннеля для тестирования вебхуков Bitrix24

set -e

echo "🔧 Настройка туннеля для вебхуков Bitrix24"
echo "=========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка установленных инструментов
check_installation() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓$1 установлен${NC}"
        return 0
    else
        echo -e "${YELLOW}✗$1 не установлен${NC}"
        return 1
    fi
}

# Меню выбора инструмента
show_menu() {
    echo ""
    echo "Выберите инструмент для создания туннеля:"
    echo "1) Ngrok (рекомендуется для быстрого старта)"
    echo "2) Cloudflare Tunnel (для постоянного использования)"
    echo "3) LocalXpose (бесплатная альтернатива)"
    echo "4) Выход"
    echo ""
    read -p "Ваш выбор [1-4]: " choice
}

# Установка ngrok
install_ngrok() {
    echo ""
    echo "📦 Установка ngrok..."
    
    case "$(uname -s)" in
        Darwin*)
            if command -v brew &> /dev/null; then
                brew install ngrok
            else
                echo -e "${RED}Error: Homebrew не установлен. Установите его с https://brew.sh${NC}"
                exit 1
            fi
            ;;
        Linux*)
            if command -v snap &> /dev/null; then
                sudo snap install ngrok
            else
                echo "Скачивание ngrok..."
                wget https://ngrok-agent.s3.amazonaws.com/ngrok.asc
                sudo sh -c 'cat ngrok.asc > /etc/apt/trusted.gpg.d/ngrok.asc'
                echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
                sudo apt update
                sudo apt install ngrok
                rm ngrok.asc
            fi
            ;;
        *)
            echo -e "${RED}Ваша ОС не поддерживается автоматически. Установите ngrok вручную: https://ngrok.com/download${NC}"
            exit 1
            ;;
    esac
}

# Запуск ngrok
start_ngrok() {
    echo ""
    echo "🌐 Запуск ngrok туннеля на порт 80..."
    echo ""
    echo -e "${YELLOW}ВАЖНО:${NC} Скопируйте URL из вывода ngrok (например: https://abc123.ngrok.io)"
    echo ""
    
    # Проверка наличия токена
    if [ ! -f ~/.config/ngrok/ngrok.yml ]; then
        echo -e "${YELLOW}Ngrok не настроен. Выполните:${NC}"
        echo "  ngrok config add-authtoken YOUR_TOKEN"
        echo ""
        read -p "Нажмите Enter после настройки..."
    fi
    
    # Запуск в фоне
    ngrok http 80 --host-header=nginx > /tmp/ngrok.log 2>&1 &
    NGROK_PID=$!
    
    echo "Ngrok запущен с PID: $NGROK_PID"
    echo ""
    echo "Для просмотра логов: tail -f /tmp/ngrok.log"
    echo "Для остановки: kill $NGROK_PID"
    echo ""
    
    # Ожидание получения URL
    sleep 3
    
    if command -v jq &> /dev/null; then
        PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
        if [ "$PUBLIC_URL" != "null" ] && [ -n "$PUBLIC_URL" ]; then
            echo -e "${GREEN}✓ Публичный URL: $PUBLIC_URL${NC}"
            echo ""
            echo "📝 Добавьте этот URL в настройки Bitrix24:"
            echo "   Webhook URL: ${PUBLIC_URL}/api/bitrix/webhook"
            echo ""
            
            # Сохранение в .env
            echo "CLOUDFLARE_TUNNEL_TOKEN=" > .env.tmp
            echo "NGROK_DOMAIN=${PUBLIC_URL#https://}" >> .env.tmp
            
            echo -e "${YELLOW}💡 Хотите сохранить настройки в .env?${NC}"
            read -p "Сохранить? (y/n): " save_choice
            if [ "$save_choice" = "y" ]; then
                cat .env.tmp >> .env
                echo -e "${GREEN}✓ Настройки сохранены${NC}"
            fi
            rm -f .env.tmp
        fi
    else
        echo -e "${YELLOW}Установите jq для автоматического получения URL: sudo apt install jq || brew install jq${NC}"
        echo "Откройте http://localhost:4040 в браузере чтобы увидеть URL"
    fi
}

# Настройка Cloudflare Tunnel
setup_cloudflared() {
    echo ""
    echo "☁️  Настройка Cloudflare Tunnel..."
    echo ""
    
    if ! check_installation cloudflared; then
        echo "Установка cloudflared..."
        case "$(uname -s)" in
            Darwin*)
                brew install cloudflared
                ;;
            Linux*)
                wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
                chmod +x cloudflared-linux-amd64
                sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
                ;;
        esac
    fi
    
    echo ""
    echo "1. Авторизация в Cloudflare..."
    cloudflared tunnel login
    
    echo ""
    echo "2. Создание туннеля..."
    read -p "Введите имя туннеля [bx-ai-tunnel]: " tunnel_name
    tunnel_name=${tunnel_name:-bx-ai-tunnel}
    
    cloudflared tunnel create $tunnel_name
    
    echo ""
    echo "3. Получение токена..."
    cloudflared tunnel token --cred-file /tmp/cred.json $tunnel_name
    
    echo ""
    echo -e "${GREEN}✓ Туннель создан${NC}"
    echo ""
    echo "📝 Добавьте токен в .env:"
    echo "   CLOUDFLARE_TUNNEL_TOKEN=$(cat /tmp/cred.json | grep -o '"credentials"[^,]*' | cut -d'"' -f4)"
    echo ""
    echo "4. Запуск через Docker Compose:"
    echo "   docker-compose --profile webhook-test up -d"
}

# Установка LocalXpose
install_localxpose() {
    echo ""
    echo "📦 Установка LocalXpose..."
    
    case "$(uname -s)" in
        Darwin*)
            brew install localxpose
            ;;
        Linux*)
            wget https://api.localxpose.io/api/v2/downloads/loclx-linux-amd64.zip
            unzip loclx-linux-amd64.zip
            sudo mv loclx /usr/local/bin/
            rm loclx-linux-amd64.zip
            ;;
    esac
    
    echo ""
    echo "Регистрация в LocalXpose..."
    loclx account register
}

# Запуск LocalXpose
start_localxpose() {
    echo ""
    echo "🌐 Запуск LocalXpose туннеля..."
    
    if [ ! -f ~/.loclx/loclx.key ]; then
        echo -e "${YELLOW}LocalXpose не авторизован. Выполните:${NC}"
        echo "  loclx account login"
        echo ""
        read -p "Нажмите Enter после авторизации..."
    fi
    
    loclx tunnel http --to localhost:80 &
    LOCX_PID=$!
    
    echo ""
    echo "LocalXpose запущен с PID: $LOCX_PID"
    echo "Откройте https://localxpose.io/dashboard для просмотра URL"
}

# Основная логика
main() {
    show_menu
    
    case $choice in
        1)
            if ! check_installation ngrok; then
                read -p "Установить ngrok? (y/n): " install_choice
                if [ "$install_choice" = "y" ]; then
                    install_ngrok
                else
                    echo "Установите ngrok вручную: https://ngrok.com/download"
                    exit 1
                fi
            fi
            start_ngrok
            ;;
        2)
            setup_cloudflared
            ;;
        3)
            if ! check_installation loclx; then
                read -p "Установить LocalXpose? (y/n): " install_choice
                if [ "$install_choice" = "y" ]; then
                    install_localxpose
                else
                    echo "Установите LocalXpose вручную: https://localxpose.io"
                    exit 1
                fi
            fi
            start_localxpose
            ;;
        4)
            echo "Выход"
            exit 0
            ;;
        *)
            echo "Неверный выбор"
            exit 1
            ;;
    esac
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✓ Настройка завершена!${NC}"
    echo ""
    echo "📚 Следующие шаги:"
    echo "1. Скопируйте публичный URL"
    echo "2. Зайдите в Bitrix24 → Разработка → Локальные приложения"
    echo "3. Создайте или отредактируйте приложение"
    echo "4. Укажите URL обработчика: YOUR_URL/api/bitrix/webhook"
    echo "5. Выберите события: ONCRMDEALUPDATE, ONCRMCOMPANYADD, и т.д."
    echo "6. Сохраните и протестируйте обновление сделки"
    echo ""
    echo "📖 Подробная документация: docs/WEBHOOK_TESTING.md"
    echo ""
}

# Запуск
main
