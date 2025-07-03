# User Story 3: 后端认证API开发

## Story标题
作为系统，我需要安全的后端认证服务，这样用户的登录请求就能被正确验证和处理

## 用户角色
- 系统管理员
- 前端应用（作为API消费者）

## 用户故事
**作为** 前端应用  
**我想要** 调用安全的认证API  
**这样** 我就能够验证用户身份并获取访问令牌  

## 验收条件 (AC)

### AC1: 登录API端点
- **Given** 前端发送登录请求
- **When** 请求包含有效的用户名/邮箱和密码
- **Then** API应该返回JWT令牌和用户基本信息
- **And** HTTP状态码为200

### AC2: 密码安全处理
- **Given** 用户密码存储在数据库中
- **When** 进行密码验证
- **Then** 密码必须使用bcrypt进行哈希和验证
- **And** 绝不能以明文形式存储或传输密码

### AC3: 无效凭据处理
- **Given** 前端发送登录请求
- **When** 用户名不存在或密码错误
- **Then** API应该返回模糊的错误信息（如"用户名或密码错误"）
- **And** HTTP状态码为401
- **And** 不应透露具体是用户名还是密码错误

### AC4: JWT令牌生成
- **Given** 用户认证成功
- **When** 生成访问令牌
- **Then** 令牌应该包含用户ID、过期时间等必要信息
- **And** 令牌应该使用安全的签名算法
- **And** 设置合理的过期时间

### AC5: Cookie安全设置
- **Given** 认证成功需要设置cookie
- **When** 返回响应
- **Then** Cookie应该设置HttpOnly属性
- **And** Cookie应该设置Secure属性（HTTPS环境）
- **And** Cookie应该设置SameSite属性

## 技术要求
- 使用Hono框架构建API
- 部署在Cloudflare Workers
- 使用bcrypt进行密码哈希
- JWT令牌生成和验证
- 连接Cloudflare D1数据库（或其他数据存储）

## API规范

### POST /api/auth/login
**请求体:**
```json
{
  "username": "string", // 用户名或邮箱
  "password": "string",
  "rememberMe": "boolean" // 可选
}
```

**成功响应 (200):**
```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  }
}
```

**失败响应 (401):**
```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

## 安全要求
- 实现请求频率限制（防暴力破解）
- 记录认证相关的安全日志
- 输入验证和清理
- 安全头部设置

## 定义完成 (DoD)
- [ ] 所有API端点正常工作
- [ ] 安全测试通过（密码哈希、JWT安全等）
- [ ] 频率限制功能测试通过
- [ ] API文档完整
- [ ] 代码通过安全审查

## 优先级
**High** - 认证功能的核心，前端登录依赖此API

## 估算
**Story Points**: 8

## 依赖
- Cloudflare Workers环境配置
- 数据库schema设计完成
- 用户数据模型定义

## 备注
- 考虑未来扩展OAuth、多因素认证等功能
- 为注册、密码重置等功能预留API结构