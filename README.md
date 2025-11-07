# Фронтенд

## Стек разработки

- [TypeScript](https://www.typescriptlang.org/) - Основной язык разработки выбранный для фронтенда
- [ReactJS](https://react.dev/) - Библиотека (Фреймворк) для создания пользовательский интерфейсов с реактивным обновлением
- [react-router](https://reactrouter.com/) - Библиотека для React для создания навигации у одностраничных (SPA) приложений
- [TailwindCSS](https://tailwindcss.com/) - CSS Фреймворк упрощающий работу со стилями
- [Axios](https://axios-http.com/docs/intro) - HTTP клиент для обращения к API
- [Vite](https://vite.dev/) - Инструмент для сборки и разработки веб приложений на TypeScript
- [Vitest](https://vitest.dev/) - Фреймворк для тестирования TypeScript
- [Playwright](https://playwright.dev/) - Фреймворк для e2e тестов
- [Biome](https://biomejs.dev/) - Современный форматтер и линтер
- [Husky](https://typicode.github.io/husky/) - Автоматический запуск линтера перед коммитами

## Установка и запуск

1. Склонировать репозиторий

```bash
git clone git@github.com:HexDiplom/diplom-front.git # Необходимо сгенерировать предварительно SSH-ключ и добавить его на GitHub
```

2. Установить зависимости

```bash
npm i
```

3. Запустить сервер

```bash
npm run dev # Сервер будет запушен по адресу http://localhost:5173/
```

## Полезные команды

```bash
npm run test     # Запуск тестов Vitest
npm run test-ct  # Запуск тестов Playwright
npm run lint     # Проверка линтера
npm run lint:fix # Проверка и автоматический фикс линтера
npm run format   # Авто-форматирование
```
