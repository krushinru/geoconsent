# 🍪 GeoConsent

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-c8f135?style=flat-square" alt="version"/>
  <img src="https://img.shields.io/badge/license-MIT-c8f135?style=flat-square" alt="license"/>
  <img src="https://img.shields.io/badge/dependencies-0-c8f135?style=flat-square" alt="zero dependencies"/>
  <img src="https://img.shields.io/badge/size-~7kb-c8f135?style=flat-square" alt="size"/>
</p>

<p align="center">
  <b>RU</b> · <a href="#english">EN</a>
</p>

---

Умная библиотека cookie-уведомлений, которая автоматически определяет регион пользователя и показывает соответствующее сообщение — по требованиям **152-ФЗ** для России, **GDPR** для Европы, **CCPA** для США. Один файл, ноль зависимостей.

```html
<!-- Всё, что нужно для подключения -->
<script src="cookie-consent.js"></script>
```

---

## Содержание

- [Как это работает](#как-это-работает)
- [Быстрый старт](#быстрый-старт)
- [Конфигурация](#конфигурация)
- [Публичное API](#публичное-api)
- [Регионы и сообщения](#регионы-и-сообщения)
- [Автопринятие](#автопринятие)
- [Кастомизация текстов](#кастомизация-текстов)
- [Демо-конструктор](#демо-конструктор)
- [События](#события)
- [Правовой контекст](#правовой-контекст)
- [Лицензия](#лицензия)

---

## Как это работает

```
Пользователь заходит на сайт
        │
        ▼
Уже отвечал? ──да──▶ ничего не показываем
        │
       нет
        │
        ▼
Запрос к ipapi.co (IP-геолокация)
        │
   ┌────┴────┐
успех      ошибка
   │           │
   ▼           ▼
Страна      Timezone
по IP       по Intl API
   │           │
   └────┬──────┘
        │
        ▼
  Определяем регион:
  RU/СНГ → 152-ФЗ баннер
  EU/EEA  → GDPR баннер
  US/CA   → CCPA баннер
  CN      → китайский баннер
  other   → дефолтный баннер
        │
        ▼
Показываем через 800мс
(плавная анимация снизу)
```

Ответ пользователя сохраняется в `localStorage` (фоллбэк — в `cookie`) и остаётся на **год**. Повторный показ не происходит.

---

## Быстрый старт

### Минимальное подключение

```html
<script src="cookie-consent.js"></script>
```

Всё. Библиотека определит регион и покажет нужный баннер сама.

### С кастомным конфигом

Объект `window.GeoConsentConfig` нужно объявить **до** подключения скрипта:

```html
<script>
  window.GeoConsentConfig = {
    autoHide:    5000,           // автопринятие через 5 секунд
    theme:       'light',        // светлая тема
    accentColor: '#ff6b2b',      // оранжевый акцент
    position:    'bottom-left',  // левый нижний угол
    privacyUrl:  '/privacy',     // ссылка на политику
  };
</script>
<script src="cookie-consent.js"></script>
```

---

## Конфигурация

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `autoHide` | `false \| true \| number` | `null` | Автопринятие: `false` — выкл, `true` — дефолт региона, число — задержка в мс |
| `theme` | `'dark' \| 'light'` | `'dark'` | Цветовая схема |
| `accentColor` | `string` | `'#c8f135'` | Акцентный цвет (любой CSS HEX). Цвет текста на кнопке подбирается автоматически |
| `position` | `string` | `'bottom-right'` | Позиция: `'bottom-right'`, `'bottom-left'`, `'bottom-center'` |
| `privacyUrl` | `string` | `'/privacy'` | URL страницы политики конфиденциальности |
| `messages` | `object` | `{}` | Переопределение текстов по регионам (см. ниже) |

---

## Публичное API

После подключения скрипта доступен глобальный объект `window.GeoConsent`:

```js
// Принудительно показать баннер для конкретного региона (удобно для тестов)
GeoConsent.show('eu');
GeoConsent.show('ru');
GeoConsent.show('us');

// Сбросить сохранённый ответ (баннер покажется снова при следующем init)
GeoConsent.reset();

// Получить сохранённый ответ пользователя
var answer = GeoConsent.getAnswer();
// → { choice: "accepted", ts: 1709123456789 }
// → null, если пользователь ещё не отвечал

// Определить регион без показа баннера
GeoConsent.detectRegion().then(function(region) {
  console.log(region); // 'ru' | 'eu' | 'us' | 'cn' | 'default'
});

// Обновить конфиг в рантайме (до следующего show)
GeoConsent.configure({
  accentColor: '#00d4ff',
  theme: 'light',
});

// Запустить вручную (если автозапуск не нужен — см. ниже)
GeoConsent.init();
```

### Отключение автозапуска

Если нужно управлять моментом показа самостоятельно, добавьте флаг до подключения скрипта:

```html
<script>
  window.GeoConsentConfig = { autoInit: false };
</script>
<script src="cookie-consent.js"></script>

<script>
  // Например, показываем только после загрузки CMP или A/B-теста
  someAsyncSetup().then(function() {
    GeoConsent.init();
  });
</script>
```

---

## Регионы и сообщения

| Регион | Охватываемые страны | Тип баннера | Автопринятие |
|---|---|---|---|
| `ru` | Россия, Беларусь, Казахстан, Узбекистан и ещё 8 стран | Простое уведомление (152-ФЗ) | 8 сек |
| `eu` | 30 стран ЕС + ЕЭЗ + Великобритания | GDPR с кнопкой «Только необходимые» | Нет |
| `us` | США, Канада | CCPA с кнопкой «Do Not Sell My Info» | Нет |
| `cn` | Китай | Простое уведомление (на китайском) | 8 сек |
| `default` | Все остальные | Нейтральный английский | Нет |

### Определение региона

Приоритет: **IP-геолокация** (через `ipapi.co`) → **часовой пояс** (`Intl.DateTimeFormat`) → дефолт.

Фоллбэк по часовому поясу покрывает ~50 таймзон и не требует сети — определение всегда происходит мгновенно, даже если `ipapi.co` недоступен.

---

## Автопринятие

Автопринятие означает, что баннер закроется автоматически через заданное время, если пользователь не нажал ни одну кнопку. Ответ будет сохранён как `"auto-accepted"`.

```js
window.GeoConsentConfig = {
  autoHide: false,    // полностью отключить для всех регионов
  autoHide: true,     // включить с дефолтной задержкой каждого региона
  autoHide: 10000,    // включить с задержкой 10 секунд для всех регионов
};
```

> **Правовое замечание.** Автопринятие формально противоречит принципу «конкретного и сознательного согласия» 152-ФЗ и GDPR, если куки содержат персональные данные. Для RU-региона риски практически нулевые (штрафы РКН невысоки, прецедентов за куки-баннеры почти нет). Для EU-региона автопринятие по умолчанию **отключено** — не включайте его без консультации с юристом.

---

## Кастомизация текстов

Любой регион можно полностью переопределить через `messages`:

```js
window.GeoConsentConfig = {
  messages: {
    ru: {
      title:      'Мы используем cookies',
      message:    'Чтобы сайт работал лучше. <a href="/privacy">Подробнее</a>.',
      btnAccept:  'Ок, понятно',
      btnDecline: 'Нет, спасибо',  // null — скрыть кнопку отказа
    },
    eu: {
      btnAccept: 'Accept all cookies',
    },
  }
};
```

Можно переопределять как все поля сразу, так и только отдельные — остальные возьмутся из дефолтов.

В полях `message` и `detail` поддерживается HTML и плейсхолдер `{privacyUrl}`, который автоматически заменяется на значение из конфига:

```js
message: 'Подробности в <a href="{privacyUrl}">политике</a>.'
```

---

## Демо-конструктор

В комплекте идёт файл `cookie-consent-demo.html` — визуальный конструктор кода вставки.

**Что умеет:**
- Мгновенное превью баннера в мок-браузере при любом изменении настроек
- Переключение между регионами для проверки текстов
- Включение/выключение автопринятия + слайдер задержки
- Выбор темы (светлая/тёмная)
- 6 цветовых пресетов + color picker + ввод HEX вручную
- 3 позиции расположения
- Ввод URL политики конфиденциальности
- Автогенерация кода вставки с кнопкой «Копировать»

Открыть локально: просто откройте `cookie-consent-demo.html` в браузере. Оба файла должны лежать рядом.

---

## События

Библиотека диспатчит кастомное событие на `window` при любом ответе пользователя:

```js
window.addEventListener('geoconsent:answer', function(event) {
  console.log(event.detail.choice);
  // 'accepted'       — нажал основную кнопку
  // 'declined'       — нажал кнопку отказа
  // 'auto-accepted'  — баннер закрылся по таймеру
});
```

Используйте это событие для интеграции с аналитикой или для управления загрузкой трекеров:

```js
window.addEventListener('geoconsent:answer', function(e) {
  if (e.detail.choice === 'accepted') {
    // Загружаем Google Analytics, пиксели и т.д.
    loadAnalytics();
  }
});
```

---

## Правовой контекст

| Регион | Регулятор | Требование | Риск автопринятия |
|---|---|---|---|
| 🇷🇺 Россия | РКН, 152-ФЗ | Уведомление об обработке ПДн | Низкий (штрафы до 300к ₽, прецедентов мало) |
| 🇪🇺 Европа | DPA, GDPR | Явное информированное согласие | Высокий (до 4% от оборота) |
| 🇺🇸 США | FTC, CCPA | Уведомление + право на отказ от продажи данных | Средний (зависит от штата) |
| 🇨🇳 Китай | CAC, PIPL | Уведомление | Низкий |

Библиотека предоставляет техническую реализацию — юридическую ответственность несёт владелец сайта. При обработке персональных данных граждан ЕС рекомендуется консультация с юристом.

---

## Лицензия

MIT © 2026

---
---

<a name="english"></a>

# 🍪 GeoConsent

<p align="center">
  <a href="#-geoconsent">RU</a> · <b>EN</b>
</p>

A smart cookie consent library that automatically detects the user's region and shows the appropriate notice — following **Russian 152-FZ** requirements, **GDPR** for Europe, and **CCPA** for the US. Single file, zero dependencies.

```html
<!-- Everything you need -->
<script src="cookie-consent.js"></script>
```

---

## Table of Contents

- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Public API](#public-api)
- [Regions & messages](#regions--messages)
- [Auto-hide](#auto-hide)
- [Customizing texts](#customizing-texts)
- [Visual constructor](#visual-constructor)
- [Events](#events)
- [Legal context](#legal-context)
- [License](#license-1)

---

## How it works

```
User visits the site
        │
        ▼
Already answered? ──yes──▶ show nothing
        │
        no
        │
        ▼
Fetch ipapi.co (IP geolocation)
        │
   ┌────┴────┐
success    error
   │           │
   ▼           ▼
Country     Timezone
by IP       via Intl API
   │           │
   └────┬──────┘
        │
        ▼
  Resolve region:
  RU/CIS  → 152-FZ banner
  EU/EEA  → GDPR banner
  US/CA   → CCPA banner
  CN      → Chinese banner
  other   → default banner
        │
        ▼
Show after 800ms delay
(smooth slide-up animation)
```

The user's answer is saved in `localStorage` (cookie fallback) and persists for **one year**. The banner will not appear again.

---

## Quick start

### Minimal setup

```html
<script src="cookie-consent.js"></script>
```

That's it. The library detects the region and shows the right banner automatically.

### With custom configuration

Declare `window.GeoConsentConfig` **before** the script tag:

```html
<script>
  window.GeoConsentConfig = {
    autoHide:    5000,           // auto-accept after 5 seconds
    theme:       'light',        // light theme
    accentColor: '#ff6b2b',      // orange accent
    position:    'bottom-left',  // bottom-left corner
    privacyUrl:  '/privacy',     // privacy policy URL
  };
</script>
<script src="cookie-consent.js"></script>
```

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `autoHide` | `false \| true \| number` | `null` | Auto-accept: `false` — off, `true` — region default delay, number — delay in ms |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color scheme |
| `accentColor` | `string` | `'#c8f135'` | Accent color (any CSS hex). Button text color is chosen automatically based on contrast |
| `position` | `string` | `'bottom-right'` | Position: `'bottom-right'`, `'bottom-left'`, `'bottom-center'` |
| `privacyUrl` | `string` | `'/privacy'` | Privacy policy page URL |
| `messages` | `object` | `{}` | Override texts per region (see below) |

---

## Public API

After the script loads, `window.GeoConsent` is available globally:

```js
// Force-show a banner for a specific region (great for testing)
GeoConsent.show('eu');
GeoConsent.show('ru');
GeoConsent.show('us');

// Reset the stored answer (banner will show again on next init)
GeoConsent.reset();

// Get the stored user answer
var answer = GeoConsent.getAnswer();
// → { choice: "accepted", ts: 1709123456789 }
// → null if the user hasn't answered yet

// Detect region without showing the banner
GeoConsent.detectRegion().then(function(region) {
  console.log(region); // 'ru' | 'eu' | 'us' | 'cn' | 'default'
});

// Update config at runtime (takes effect on next show)
GeoConsent.configure({
  accentColor: '#00d4ff',
  theme: 'light',
});

// Trigger manually (if you disabled auto-init)
GeoConsent.init();
```

### Disabling auto-init

If you need to control when the banner appears:

```html
<script>
  window.GeoConsentConfig = { autoInit: false };
</script>
<script src="cookie-consent.js"></script>

<script>
  // Show only after your own async setup is done
  someAsyncSetup().then(function() {
    GeoConsent.init();
  });
</script>
```

---

## Regions & messages

| Region | Countries | Banner type | Auto-hide |
|---|---|---|---|
| `ru` | Russia, Belarus, Kazakhstan, Uzbekistan and 8 more | Simple notice (152-FZ) | 8 sec |
| `eu` | 30 EU + EEA + UK | GDPR with "Necessary only" button | Off |
| `us` | USA, Canada | CCPA with "Do Not Sell My Info" | Off |
| `cn` | China | Simple notice (in Chinese) | 8 sec |
| `default` | Everyone else | Neutral English | Off |

### Region detection priority

**IP geolocation** (`ipapi.co`) → **timezone** (`Intl.DateTimeFormat`) → default.

The timezone fallback covers ~50 timezones and requires no network — detection always works instantly, even when `ipapi.co` is unreachable.

---

## Auto-hide

Auto-hide closes the banner automatically after a delay if the user takes no action. The answer is stored as `"auto-accepted"`.

```js
window.GeoConsentConfig = {
  autoHide: false,    // disable for all regions
  autoHide: true,     // enable with each region's default delay
  autoHide: 10000,    // enable with a 10-second delay for all regions
};
```

> **Legal note.** Auto-accepting is technically at odds with the "specific and informed consent" principle of GDPR if cookies contain personal data. For the EU region, auto-hide is **disabled by default** — don't enable it without consulting a lawyer.

---

## Customizing texts

Any region can be fully overridden via the `messages` config:

```js
window.GeoConsentConfig = {
  messages: {
    ru: {
      title:      'Мы используем cookies',
      message:    'Чтобы сайт работал лучше. <a href="/privacy">Подробнее</a>.',
      btnAccept:  'Ок, понятно',
      btnDecline: 'Нет, спасибо',  // null — hides the decline button
    },
    eu: {
      // Only override what you need — defaults fill in the rest
      btnAccept: 'Accept all cookies',
    },
  }
};
```

The `message` and `detail` fields support HTML and the `{privacyUrl}` placeholder, which is automatically replaced with your configured URL:

```js
message: 'Details in our <a href="{privacyUrl}">privacy policy</a>.'
```

---

## Visual constructor

The package includes `cookie-consent-demo.html` — a visual code generator.

**Features:**
- Instant live preview inside a mock browser on every change
- Switch between regions to check the copy
- Toggle auto-hide + delay slider
- Dark / light theme switch
- 6 accent color presets + color picker + manual HEX input
- 3 position options
- Privacy policy URL input
- Auto-generated embed code with a one-click copy button

To use it locally, open `cookie-consent-demo.html` in a browser. Both files should be in the same folder.

---

## Events

The library fires a custom event on `window` on every user response:

```js
window.addEventListener('geoconsent:answer', function(event) {
  console.log(event.detail.choice);
  // 'accepted'       — clicked the primary button
  // 'declined'       — clicked the decline button
  // 'auto-accepted'  — banner closed by timer
});
```

Use this to conditionally load trackers:

```js
window.addEventListener('geoconsent:answer', function(e) {
  if (e.detail.choice === 'accepted') {
    loadGoogleAnalytics();
    loadMetaPixel();
  }
});
```

---

## Legal context

| Region | Regulator | Requirement | Auto-accept risk |
|---|---|---|---|
| 🇷🇺 Russia | Roskomnadzor, 152-FZ | Notification of personal data processing | Low (fines up to ~$3k, almost no precedents for cookie banners) |
| 🇪🇺 Europe | DPAs, GDPR | Explicit informed consent | High (up to 4% of global turnover) |
| 🇺🇸 USA | FTC, CCPA | Notice + right to opt out of data sale | Medium (varies by state) |
| 🇨🇳 China | CAC, PIPL | Notification | Low |

This library provides a technical implementation — legal responsibility lies with the website owner. If you process personal data of EU residents, consulting a lawyer is strongly recommended.

---

## License

MIT © 2026
