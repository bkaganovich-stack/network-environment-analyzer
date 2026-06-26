# 📡 Сетевой Радар / Network Radar

[Русский](#русский) | [English](#english)

---

## Русский

Локальный агент для диагностики Wi-Fi, анализа радиоэфира и проверки параметров безопасности роутера. Считывает радиоэфир вашего компьютера, выявляет взаимные помехи от соседей, проверяет настройки безопасности роутера и формирует список персональных рекомендаций с точными путями настроек в административной панели вашей модели роутера.

### ✨ Основные возможности
* **Интеллектуальное автоопределение**: автоматически распознает бренд и прошивку роутера по заголовкам HTTP/UPnP.
* **Поддержка популярных брендов**: Keenetic (KeeneticOS), OpenWrt (LuCI), ASUS (ASUSWRT), FRITZ!Box (FRITZ!OS), Xiaomi (MiWiFi), Huawei, D-Link, Tenda, TP-Link.
* **Анализ радиоэфира на уровне ОС**: считывает реальную загруженность Wi-Fi каналов и радиоокружение.
* **Адаптивные пути настроек**: для каждого предупреждения показывает путь к нужной кнопке в вашей прошивке (например, `Advanced Settings -> Wireless -> General -> Control Channel` для ASUS).
* **Удобный выход**: кнопка «Выйти» в веб-интерфейсе останавливает сервер и завершает работу процесса в консоли.

### 🚀 Быстрый запуск одной командой

Для запуска требуется установленный **Node.js** (версии 18 и выше) и **Git**. Откройте терминал и выполните:

```bash
npx --force github:bkaganovich-stack/network-environment-analyzer
```

*(Если автоматический запуск не поддерживается вашей версией npm, выполните: `npx -p github:bkaganovich-stack/network-environment-analyzer router-radar`)*

После запуска в вашем браузере автоматически откроется страница `http://localhost:3001`. Для выхода просто нажмите кнопку **«Выйти»** в верхнем правом углу веб-интерфейса.

### 🔍 Устранение неполадок

#### ❌ Ошибка «выполнение сценариев отключено в этой системе...» (Windows PowerShell)
* **Причина:** Политика безопасности PowerShell блокирует запуск внешних скриптов.
* **Решение:** Используйте `npx.cmd` вместо `npx`:
  ```powershell
  npx.cmd --force github:bkaganovich-stack/network-environment-analyzer
  ```
  Или временно разрешите скрипты для текущей сессии:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
  ```

#### ❌ Ошибка `ENOENT: spawn git`
* **Причина:** В системе не установлен Git, необходимый npm для скачивания кода напрямую из репозитория.
* **Решение:** Установите Git с сайта [git-scm.com](https://git-scm.com/) (для Windows) или через менеджер пакетов (`sudo apt install git` для Ubuntu/Debian).

---

## English

A local agent for Wi-Fi environment and router security diagnostics. It scans neighboring wireless networks to detect channel congestion, validates router security configurations, and generates a personalized list of recommendations complete with exact paths inside the admin panel of your specific router model.

### ✨ Key Features
* **Smart Auto-detection**: automatically resolves router brand and firmware based on HTTP/UPnP headers.
* **Supports Popular Brands**: Keenetic (KeeneticOS), OpenWrt (LuCI), ASUS (ASUSWRT), FRITZ!Box (FRITZ!OS), Xiaomi (MiWiFi), Huawei, D-Link, Tenda, TP-Link.
* **OS-Level Wi-Fi Scan**: reads live Wi-Fi channel congestion directly from the host operating system.
* **Adaptive Settings Paths**: shows exact navigation path for your specific router model (e.g. `Advanced Settings -> Wireless -> General -> Control Channel` for ASUS).
* **Graceful Exit**: the "Exit" button in the web UI stops the local server and terminates the CLI wrapper cleanly.

### 🚀 Quick Start (Single Command)

Requires **Node.js** (v18+) and **Git** installed on your machine. Open your terminal and run:

```bash
npx --force github:bkaganovich-stack/network-environment-analyzer
```

*(If auto-run is not supported by your npm version, use: `npx -p github:bkaganovich-stack/network-environment-analyzer router-radar`)*

This command will automatically open `http://localhost:3001` in your default browser. To stop the analyzer, click the **"Exit"** button in the top-right corner of the web UI.

### 🔍 Troubleshooting

#### ❌ Script execution is disabled on this system (Windows PowerShell)
* **Reason:** PowerShell execution policy restricts running downloaded scripts.
* **Solution:** Call `npx.cmd` instead of `npx`:
  ```powershell
  npx.cmd --force github:bkaganovich-stack/network-environment-analyzer
  ```
  Or temporarily bypass execution policy for the current session:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
  ```

#### ❌ Error `ENOENT: spawn git`
* **Reason:** Git is not installed or not added to your system PATH.
* **Solution:** Install Git from [git-scm.com](https://git-scm.com/) (Windows) or use your package manager (e.g., `sudo apt install git` on Ubuntu).
