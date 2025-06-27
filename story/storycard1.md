# Story Card 1

## 标题

为 Home 页面集成安全、现代的基于密码的用户认证

## 背景与目标

当前 Home 页面对所有用户开放，缺乏访问控制。为保护内容、实现分级访问和个性化体验，需引入安全、易用、可扩展的基于密码认证机制，并为注册、找回密码、OAuth 等后续扩展预留接口。

## 需求概述

1. **登录入口**
   - Home 页面显著位置提供"登录"按钮，未登录用户访问时自动弹出登录界面。
   - 登录界面采用 ShadCN UI，支持深浅色模式。
2. **密码认证**
   - 用户通过用户名/邮箱+密码登录。
   - 前端表单需基础校验（必填、格式），清晰错误提示。
   - 密码框支持显示/隐藏切换。
3. **后端认证**
   - 登录请求经 Hono API 路由转发至 Cloudflare Workers。
   - 密码后端安全校验（bcrypt），禁止明文存储。
   - 认证成功返回 JWT 或安全 session token，存于 HttpOnly cookie。
4. **认证态管理**
   - 前端用 React Context 管理登录态。
   - 登录后自动跳转 Home，显示用户信息及"登出"按钮。
   - 未登录访问受保护页自动重定向登录。
5. **安全性**
   - API 防暴力破解（限流、模糊错误提示）。
   - 全程 HTTPS，Token 采用 HttpOnly+Secure 属性。
6. **用户体验**
   - 登录/登出过程有 loading、成功、失败反馈。
   - 支持"记住我"延长登录有效期。
   - 登录后显示欢迎语和头像（如有）。
7. **可扩展性**
   - 结构便于扩展注册、找回密码、第三方登录。
   - 前后端认证逻辑解耦，便于迁移升级。

## 验收标准

- 未登录用户访问 Home 必须先登录。
- 登录流程安全流畅，UI 友好，错误提示明确。
- 登录后可访问 Home，显示用户信息。
- 支持登出，登出后需重新登录。
- 认证相关代码有良好注释和文档。

---

## 实现分解

### 目录结构

- `app/components/auth/`：认证相关 React 组件（LoginForm、ProtectedRoute 等）
- `app/hooks/`：自定义 hooks（useAuth）
- `app/api/auth/`：前端 API 封装
- `workers/auth/`：Cloudflare Worker 认证逻辑
- `app/context/`：认证态 Context
- `app/routes/login.tsx`：登录页
- `app/routes/home.tsx`：受保护主页

### 前端功能

- 登录表单（Shadcn UI，Tailwind，深浅色，用户名/邮箱+密码，显示/隐藏密码，记住我，表单校验，错误提示）
- 登录态管理（React Context，useAuth hook）
- 登录/登出流程（API 调用、loading、反馈、跳转）
- 受保护路由（未登录自动跳转登录页）
- 登录后显示用户信息、头像、欢迎语、登出按钮

### 后端功能（Cloudflare Worker + Hono + 数据库）

- `/api/auth/login` 路由：
  - 接收用户名/邮箱+密码，查询真实数据库 Cloudflare D1中的用户表。
  - 校验用户是否存在，获取存储的密码 hash。
  - 使用 bcrypt 校验用户输入的密码与数据库 hash 是否匹配。
  - 认证成功后，生成 JWT/Session Token，设置 HttpOnly+Secure cookie。
  - 返回用户信息（不含敏感字段）。
- 用户数据存储于数据库，支持后续扩展（如注册、找回密码、第三方登录等）。
- 限流中间件：防止暴力破解攻击。
- Token 校验中间件：保护 API 路由，校验 token 有效性。
- 所有数据库操作需有异常处理，防止信息泄露。

### 类型与安全

- 所有接口、组件、hooks 均加 TypeScript 类型
- API 输入输出用 zod 校验
- Token 仅存 HttpOnly+Secure cookie
- 数据库连接、查询、异常处理需安全可靠

## 单元测试要求

### 前端

- 登录表单（LoginForm）：渲染、交互、校验、错误提示、显示/隐藏密码、记住我
- 登录流程：API 调用、loading、反馈、跳转
- 登录态管理（AuthContext/useAuth）：登录、登出、用户信息展示、受保护路由跳转
- 受保护页面（home.tsx）：未登录跳转、登录后内容展示

### 后端

- `/api/auth/login` 路由：
  - 正确用户名/密码登录成功，返回 token 并设置 cookie（集成测试需连接测试数据库，单元测试可 mock 数据库操作）
  - 错误用户名/密码登录失败，错误提示模糊化
  - 限流逻辑：多次错误后触发限流
  - Token 校验中间件：无 token/无效 token 拒绝访问，合法 token 通过
- 用户数据与密码 hash 校验（单元测试可 mock，集成测试用测试数据库）
- 数据库异常、边界条件、SQL 注入等安全测试（建议在集成测试中覆盖）

### 其他

- 关键逻辑、边界条件、异常分支均需覆盖
- 前端建议用 React Testing Library，后端建议用 Miniflare/Hono 测试工具
