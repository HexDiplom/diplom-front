# Фронтенд

## Стек разработки

- [NodeJS 24](https://nodejs.org/) - JavaScript рантайм
- [pnpm](https://pnpm.io/) - Пакетный медежер для NodeJS- 
- [TypeScript](https://www.typescriptlang.org/) - Основной язык разработки выбранный для фронтенда
- [Vite](https://vite.dev/) - Инструмент для сборки и разработки веб приложений на TypeScript
- [React](https://react.dev/) - Библиотека (Фреймворк) для создания пользовательский интерфейсов с реактивным обновлением
- [TanStack Query](https://tanstack.com/query/latest) - Библиотека для сохранения состояний после получения данных с сервера
- [react-router](https://reactrouter.com/) - Библиотека для React для создания навигации у одностраничных (SPA) приложений на React
- [TailwindCSS](https://tailwindcss.com/) - CSS Фреймворк упрощающий работу со стилями
- [shadcn/ui](https://ui.shadcn.com/) - Бесплатная библиотке компонентов для React

## Установка и запуск

1. Убедитесь что у вас включен pnpm

```bash
pnpm -v # 11.0.9
```

Если pnpm выключен, включите corepack, он должен быть предустановлен вместе с NodeJS, после включения corepack pnpm должен заработать

```bash
corepack enable pnpm
```

Если corepack не включается, проверьте установлена ли нода

```bash
node -v # v24.15.0
```

или установить node через fnm (можно поверх системной node)
```bash
# Download and install fnm:
curl -o- https://fnm.vercel.app/install | bash

# Download and install Node.js:
fnm install 24

# Use Node 24
fnm use 24

# Verify the Node.js version:
node -v # Should print "v24.15.0".

# Download and install pnpm:
corepack enable pnpm

# Verify pnpm version:
pnpm -v
```

2. Установите зависимости

```bash
pnpm install
```
3. Скопируйте .env.example в .env, при необходимости можно поменять значение.

```bash
cp .env.example .env
```

4. Запустите проект

```bash
pnpm run dev
```

## Полезно

```bash
pnpm run dev # запуск проекта
pnpm add имя_пакета # Добавить новый npm пакет
pnpx shadcn@latest add имя_компонента # Добавить новый компонент shadcn/ui
pnpm run build # собрать проект для прода
pnpm run preview # запустить собранный проект в режиме preview (близкое к проду)
```
