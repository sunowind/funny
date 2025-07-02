# Epic 2

## 标题

实现基础的Markdown编辑器功能

## 背景与目标

在Editor页面，展示一个Markdown编辑器。用户可以输入Markdown格式的文本，实时预览渲染效果，提供基础的编辑功能。这是构建SaaS产品文档编辑功能的第一步，为后续的协作编辑、版本管理等功能奠定基础。

## 需求概述

1. **Markdown编辑器组件**
   - 提供左右分栏布局：左侧编辑区域，右侧实时预览
   - 支持基础Markdown语法（标题、段落、列表、链接、图片、代码块等）
   - 编辑器具备语法高亮功能

2. **实时预览功能**
   - Markdown内容实时渲染为HTML
   - 预览区域支持滚动同步
   - 渲染样式美观且符合现代设计规范

3. **基础编辑功能**
   - 支持常用快捷键（Ctrl+B加粗、Ctrl+I斜体等）
   - 提供工具栏，包含常用格式化按钮
   - 支持撤销/重做操作

4. **文档持久化功能**
   - 文档自动保存到云端数据库
   - 支持手动保存操作
   - 文档版本控制基础功能
   - 支持文档列表管理

5. **用户数据管理**
   - 用户文档权限管理
   - 文档元数据追踪（创建时间、修改时间、字数统计等）
   - 支持文档标签分类
   - 文档搜索功能基础支持

## 验收标准

- 编辑器能够正确解析并渲染基础Markdown语法
- 左右分栏布局在不同屏幕尺寸下表现良好
- 实时预览延迟不超过200ms
- 工具栏按钮功能正常，快捷键响应准确
- 编辑器界面美观，用户体验流畅
- 代码结构清晰，组件可复用
- 文档能够正确保存到数据库并持久化
- 自动保存功能工作正常，间隔时间合理（30秒-2分钟）
- API响应时间低于500ms
- 文档列表加载和搜索功能正常
- 所有API接口都有适当的错误处理和验证

---

## 实现分解

### 目录结构

**前端组件结构：**
- `components/Editor/` - 编辑器组件目录
  - `MarkdownEditor.tsx` - 主编辑器组件
  - `EditorToolbar.tsx` - 工具栏组件
  - `PreviewPane.tsx` - 预览面板组件
  - `DocumentList.tsx` - 文档列表组件
- `lib/markdown/` - Markdown处理相关
  - `parser.ts` - Markdown解析工具
  - `renderer.ts` - 渲染配置
- `hooks/` - 自定义Hook
  - `useAutoSave.ts` - 自动保存逻辑
  - `useDocument.ts` - 文档数据管理

**后端API结构：**
- `workers/api/documents/` - 文档管理API
  - `create.ts` - 创建文档接口
  - `update.ts` - 更新文档接口
  - `list.ts` - 文档列表接口
  - `detail.ts` - 文档详情接口
  - `delete.ts` - 删除文档接口
- `workers/types/` - 类型定义
  - `document.ts` - 文档相关类型和验证schema
- `workers/services/` - 业务逻辑层
  - `documentService.ts` - 文档服务

### 前端功能

- 集成Monaco Editor作为编辑器内核
- 使用marked.js或类似库进行Markdown解析
- 实现分栏布局组件，支持拖拽调整宽度
- 添加语法高亮主题配置
- 实现滚动同步功能
- 集成自动保存功能，定期调用后端API
- 实现文档列表页面，支持创建、编辑、删除操作
- 添加文档搜索和筛选功能

### 后端功能

**API设计原则：**
- 遵循RESTful设计规范
- 使用Hono框架构建高性能API
- 所有接口支持JSON格式数据交换
- 实现统一的错误处理和响应格式

**核心API接口：**

1. **文档CRUD操作**
   ```
   POST   /api/documents        - 创建新文档
   GET    /api/documents        - 获取文档列表（支持分页、搜索）
   GET    /api/documents/:id    - 获取文档详情
   PUT    /api/documents/:id    - 更新文档内容
   PATCH  /api/documents/:id    - 部分更新（自动保存）
   DELETE /api/documents/:id    - 删除文档
   ```

2. **自动保存功能**
   ```
   PATCH  /api/documents/:id/autosave - 自动保存接口
   ```

3. **文档统计与分析**
   ```
   GET    /api/documents/:id/stats    - 获取文档统计信息
   ```

**数据库设计：**
- 利用现有的Document模型（已在Prisma schema中定义）
- 支持文档内容、标题、标签、字数统计等字段
- 实现软删除功能
- 记录文档版本信息

**性能优化：**
- 实现增量保存，只传输变更内容
- 使用Cloudflare Workers边缘计算优势
- 添加适当的缓存策略
- 支持文档内容压缩存储

**安全与验证：**
- 使用Zod进行严格的输入验证
- 实现用户权限验证，确保只能操作自己的文档
- 防止XSS攻击，对用户输入进行适当转义
- 添加请求频率限制，防止滥用

### 类型与安全

**前端类型安全：**
- 定义Editor相关的TypeScript接口
- 添加Document数据模型的类型定义
- 确保组件props类型安全
- 定义API响应和请求的类型接口

**后端类型安全：**
- 使用Zod定义文档验证schema
- 定义Cloudflare Workers环境类型
- 确保数据库操作的类型安全
- 实现统一的错误类型定义

**安全措施：**
- 添加Markdown内容的XSS防护
- 实现输入内容的基础校验
- 用户身份验证和权限控制
- SQL注入防护（通过Prisma ORM）
- 敏感数据加密存储

### 技术实现重点

**前端技术栈：**
- React Router v7 - 页面路由管理
- Monaco Editor - 代码编辑器组件
- Marked.js - Markdown解析渲染
- Zustand - 状态管理
- Tailwind CSS + Shadcn UI - 样式组件

**后端技术栈：**
- Hono - 轻量级Web框架
- Cloudflare Workers - 边缘计算平台
- Prisma + D1 - 数据库ORM和存储
- Zod - 运行时类型验证
- bcrypt-ts - 密码加密

**开发与部署：**
- TypeScript严格模式
- Vitest单元测试
- Wrangler本地开发环境
- 自动化CI/CD流程

