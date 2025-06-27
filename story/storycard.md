# Story card 1

## 标题

为 home 页面添加安全、现代的基于密码的用户认证功能

## 背景与目标

当前 home 页面对所有用户开放。为了保护服务内容、实现用户分级访问和后续个性化体验，需要引入基于密码的认证机制。认证流程应安全、易用，并为后续扩展（如注册、找回密码、OAuth 登录等）预留接口。

## 需求描述

1. 登录入口

   - 在 home 页面显著位置提供"登录"按钮，未登录用户访问时自动弹出登录界面。
   - 登录界面采用 ShadCN UI 组件，风格与整体一致，支持深色/浅色模式。
2. 密码认证

   - 用户输入用户名（或邮箱）和密码进行登录。
   - 前端表单需有基础校验（必填、格式等），并有清晰的错误提示。
   - 密码输入框支持"显示/隐藏密码"切换。
3. 后端认证

   - 登录请求通过 Hono API 路由转发到 Cloudflare Workers 处理。
   - 密码需在后端安全校验（如 bcrypt hash），不得明文存储。
   - 认证成功后，返回 JWT 或安全的 session token，存储于 HttpOnly cookie。
4. 认证态管理

   - 前端通过 React Context 或全局状态管理用户登录态。
   - 登录后自动跳转到 home 页面，显示用户信息及"登出"按钮。
   - 未登录用户访问受保护页面时自动重定向到登录页。
5. 安全性

   - 所有认证相关 API 必须防止暴力破解（如简单限流、错误提示模糊化）。
   - 密码传输全程 HTTPS（Cloudflare Workers 默认支持）。
   - Token 采用 HttpOnly + Secure 属性，防止 XSS 窃取。
6. 用户体验

   - 登录/登出过程有清晰的 loading、成功、失败反馈。
   - 支持"记住我"选项，延长登录有效期。
   - 登录后显示欢迎语和用户头像（如有）。
7. 可扩展性

   - 代码结构便于后续扩展注册、找回密码、第三方登录（如 GitHub、Google）。
   - 后端认证逻辑与前端解耦，便于迁移和升级。

## 验收标准

- 未登录用户访问 home 页面时，必须先完成登录。
- 登录流程安全、流畅，UI 友好，错误提示明确。
- 登录后可正常访问 home 页面，显示用户信息。
- 支持登出，登出后需重新登录。
- 认证相关代码有良好注释和文档说明。

---

## 实现步骤与分解

### 1. 目录结构与分层

- `app/components/auth/`：认证相关的 React 组件（如 LoginForm、AuthProvider）。
- `app/hooks/`：自定义 hooks（如 useAuth）。
- `app/api/auth/`：前端 API 封装。
- `workers/auth/`：Cloudflare Worker 侧 Hono 路由与认证逻辑。
- `app/context/`：认证态 Context。
- `app/routes/login.tsx`：登录页。
- `app/routes/home.tsx`：受保护主页。

### 2. 主要功能点分解

#### 前端

- 登录表单（Shadcn UI，Tailwind，支持深浅色，用户名/邮箱+密码，显示/隐藏密码，记住我，表单校验，错误提示）。
- 登录态管理（React Context，useAuth hook）。
- 登录/登出流程（loading、反馈、跳转）。
- 受保护路由（未登录自动跳转到登录页）。
- 登录后显示用户信息、头像、欢迎语、登出按钮。

#### 后端（Cloudflare Worker + Hono）

- `/api/auth/login` 路由：接收用户名/邮箱+密码，校验（bcrypt），返回 JWT/Session Token，设置 HttpOnly+Secure cookie。
- 用户数据 mock（后续可接数据库）。
- 限流/防暴力破解（简单限流中间件）。
- Token 校验中间件（保护 API 路由）。

### 3. 具体实现步骤

#### 1. 目录和文件结构初始化

- 新建 `app/components/auth/`, `app/hooks/`, `app/context/`, `app/api/auth/`, `workers/auth/` 目录。
- 新建 `app/routes/login.tsx` 页面。

#### 2. 前端实现

- `AuthContext` + `useAuth`：管理和暴露登录态、用户信息、登录/登出方法。
- `LoginForm` 组件：Shadcn UI 表单，Tailwind 样式，表单校验，错误提示，记住我，显示/隐藏密码。
- `ProtectedRoute` 组件/HOC：未登录自动跳转到 `/login`。
- `home.tsx`：登录后显示用户信息、头像、欢迎语、登出按钮。
- 登录/登出流程：API 调用、loading、反馈、跳转。

#### 3. 后端实现

- `workers/auth/login.ts`：Hono 路由，接收 POST，校验用户密码（bcrypt），返回 JWT/Session Token，设置 HttpOnly+Secure cookie。
- 用户 mock 数据，密码 hash。
- 限流中间件。
- Token 校验中间件。

#### 4. 类型与安全

- 所有接口、组件、hooks 均加 TypeScript 类型。
- API 输入输出用 zod 校验。
- Token 只存 HttpOnly+Secure cookie。

## 单元测试要求

### 前端

- 登录表单组件（LoginForm）：
  - 表单渲染、输入交互、校验逻辑（必填、格式、错误提示、显示/隐藏密码、记住我）。
  - 登录流程：API 调用、loading、成功/失败反馈、跳转。
  - 登录态管理（AuthContext/useAuth）：登录、登出、用户信息展示、受保护路由跳转。
- 受保护页面（home.tsx）：未登录跳转、登录后内容展示。

### 后端（Cloudflare Worker + Hono）

- /api/auth/login 路由：
  - 正确用户名/密码登录成功，返回 token 并设置 cookie。
  - 错误用户名/密码登录失败，错误提示模糊化。
  - 限流逻辑：多次错误后触发限流。
  - Token 校验中间件：无 token/无效 token 拒绝访问，合法 token 通过。
- 用户数据与密码 hash 校验。

### 其他

- 所有关键逻辑、边界条件、异常分支均需覆盖。
- 前端建议用 React Testing Library，后端建议用 Miniflare/Hono 测试工具。
