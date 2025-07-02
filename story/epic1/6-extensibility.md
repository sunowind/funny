# User Story 7: 认证系统可扩展性架构

## Story标题
作为技术架构师，我需要设计可扩展的认证系统架构，这样未来就能够轻松集成新的认证方式和功能

## 用户角色
- 技术架构师
- 后端开发工程师
- 产品经理（规划未来功能）

## 用户故事
**作为** 技术架构师  
**我想要** 构建灵活可扩展的认证系统  
**这样** 未来就能够快速集成OAuth、注册、密码重置等新功能而不需要重构核心代码  

## 验收条件 (AC)

### AC1: 认证提供商抽象层
- **Given** 需要支持多种认证方式
- **When** 设计认证架构
- **Then** 应该定义统一的认证接口
- **And** 密码认证应该作为一个具体实现
- **And** 为OAuth提供商预留接口

### AC2: 前端认证状态扩展性
- **Given** 认证状态管理需要支持更多信息
- **When** 添加新的用户属性或认证状态
- **Then** 应该能够无痛扩展状态结构
- **And** 不影响现有组件的正常工作
- **And** 保持向后兼容性

### AC3: API路由结构预留
- **Given** 未来需要添加更多认证相关API
- **When** 设计API路由结构
- **Then** 应该为注册、密码重置等功能预留路由空间
- **And** 保持RESTful设计原则
- **And** 支持版本化管理

### AC4: 配置管理系统
- **Given** 不同环境需要不同的认证配置
- **When** 部署到不同环境
- **Then** 应该支持环境变量配置
- **And** 支持不同认证策略的开关
- **And** 配置变更不需要代码修改

### AC5: 数据库模式扩展性
- **Given** 用户表需要支持更多认证方式
- **When** 设计数据库表结构
- **Then** 应该预留OAuth provider字段
- **And** 支持多种身份标识符
- **And** 便于添加新的用户属性

## 技术架构设计

### 认证提供商接口
```typescript
interface AuthProvider {
  name: string;
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  validateToken(token: string): Promise<TokenValidation>;
  refreshToken?(refreshToken: string): Promise<AuthResult>;
}

interface AuthCredentials {
  type: 'password' | 'oauth' | 'sso';
  data: any;
}
```

### 用户数据模型扩展
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  // 扩展字段
  authProviders: AuthProviderInfo[];
  profile: UserProfile;
  preferences: UserPreferences;
  // 可选字段为未来功能预留
  avatar?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  twoFactorEnabled?: boolean;
}

interface AuthProviderInfo {
  provider: string;
  providerId: string;
  linkedAt: Date;
}
```

### API路由规划
```
/api/auth/
├── login          # 密码登录
├── logout         # 登出
├── refresh        # 刷新令牌
├── register       # 注册 (预留)
├── forgot-password # 忘记密码 (预留)
├── reset-password  # 重置密码 (预留)
├── oauth/
│   ├── google     # Google OAuth (预留)
│   ├── github     # GitHub OAuth (预留)
│   └── callback   # OAuth回调 (预留)
└── verify/
    ├── email      # 邮箱验证 (预留)
    └── phone      # 手机验证 (预留)
```

### 配置管理结构
```typescript
interface AuthConfig {
  providers: {
    password: PasswordConfig;
    oauth?: OAuthConfig;
  };
  security: SecurityConfig;
  session: SessionConfig;
}

interface PasswordConfig {
  enabled: boolean;
  minLength: number;
  requireComplexity: boolean;
}
```

## 实现要求
- 使用工厂模式管理认证提供商
- 实现插件式架构支持功能扩展
- 前后端认证逻辑完全解耦
- 支持多数据库适配器模式

## 扩展点设计
1. **认证提供商扩展点**: 新增OAuth、SSO等
2. **中间件扩展点**: 自定义认证流程
3. **事件钩子**: 登录前后的自定义逻辑
4. **存储适配器**: 支持不同的数据存储方案

## 定义完成 (DoD)
- [ ] 架构设计文档完整
- [ ] 接口定义清晰且可扩展
- [ ] 现有功能迁移到新架构无问题
- [ ] 提供扩展示例和文档
- [ ] 代码结构清晰，符合SOLID原则

## 优先级
**Medium** - 为长期发展奠定基础，但不阻塞当前功能

## 估算
**Story Points**: 8

## 依赖
- 基础认证功能已实现
- 数据库设计确定
- 技术架构决策完成

## 验证方式
- 实现一个模拟的OAuth提供商验证扩展性
- 添加一个新的用户属性验证数据模型扩展
- 创建配置变更场景验证配置系统

## 文档要求
- 架构设计说明
- 扩展开发指南
- API接口文档
- 配置参考手册

## 备注
- 遵循开闭原则，对扩展开放，对修改关闭
- 考虑微服务架构的兼容性
- 为多租户场景预留扩展空间

---

## 测试用例

### 1. 认证提供商接口测试用例

#### 测试用例1.1: 认证提供商抽象层测试
```javascript
describe('认证提供商抽象层', () => {
  test('密码认证提供商应实现统一接口', async () => {
    const passwordProvider = new PasswordAuthProvider();
    
    // 验证接口实现
    expect(passwordProvider.name).toBe('password');
    expect(typeof passwordProvider.authenticate).toBe('function');
    expect(typeof passwordProvider.validateToken).toBe('function');
    
    // 测试认证功能
    const credentials = {
      type: 'password',
      data: { username: 'test@example.com', password: 'password123' }
    };
    
    const result = await passwordProvider.authenticate(credentials);
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
  });

  test('OAuth提供商应实现相同接口', async () => {
    const oauthProvider = new OAuthAuthProvider();
    
    // 验证接口一致性
    expect(oauthProvider.name).toBe('oauth');
    expect(typeof oauthProvider.authenticate).toBe('function');
    expect(typeof oauthProvider.validateToken).toBe('function');
    
    // 测试OAuth认证流程
    const oauthCredentials = {
      type: 'oauth',
      data: { provider: 'google', code: 'auth_code_123' }
    };
    
    const result = await oauthProvider.authenticate(oauthCredentials);
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
  });

  test('认证提供商工厂应正确创建实例', () => {
    const factory = new AuthProviderFactory();
    
    const passwordProvider = factory.createProvider('password');
    expect(passwordProvider).toBeInstanceOf(PasswordAuthProvider);
    
    const oauthProvider = factory.createProvider('oauth');
    expect(oauthProvider).toBeInstanceOf(OAuthAuthProvider);
    
    expect(() => factory.createProvider('unknown')).toThrow('Unknown provider type');
  });

  test('应支持动态注册新提供商', () => {
    const factory = new AuthProviderFactory();
    
    class CustomAuthProvider {
      name = 'custom';
      async authenticate(credentials) {
        return { success: true, user: {}, token: 'custom-token' };
      }
      async validateToken(token) {
        return { valid: true, user: {} };
      }
    }
    
    factory.registerProvider('custom', CustomAuthProvider);
    
    const customProvider = factory.createProvider('custom');
    expect(customProvider).toBeInstanceOf(CustomAuthProvider);
  });

  test('提供商接口应支持令牌刷新', async () => {
    const provider = new PasswordAuthProvider();
    
    if (provider.refreshToken) {
      const refreshResult = await provider.refreshToken('refresh_token_123');
      
      expect(refreshResult).toHaveProperty('success');
      expect(refreshResult).toHaveProperty('token');
    } else {
      // 如果不支持刷新，应该明确说明
      expect(provider.refreshToken).toBeUndefined();
    }
  });
});
```

#### 测试用例1.2: 认证流程管理测试
```javascript
describe('认证流程管理', () => {
  test('认证管理器应协调多个提供商', async () => {
    const authManager = new AuthManager();
    
    authManager.registerProvider(new PasswordAuthProvider());
    authManager.registerProvider(new OAuthAuthProvider());
    
    // 测试密码认证
    const passwordAuth = await authManager.authenticate({
      type: 'password',
      data: { username: 'test@example.com', password: 'password' }
    });
    
    expect(passwordAuth.success).toBe(true);
    expect(passwordAuth.provider).toBe('password');
    
    // 测试OAuth认证
    const oauthAuth = await authManager.authenticate({
      type: 'oauth',
      data: { provider: 'google', code: 'code123' }
    });
    
    expect(oauthAuth.success).toBe(true);
    expect(oauthAuth.provider).toBe('oauth');
  });

  test('认证管理器应处理未知提供商类型', async () => {
    const authManager = new AuthManager();
    
    const unknownAuth = await authManager.authenticate({
      type: 'unknown',
      data: {}
    });
    
    expect(unknownAuth.success).toBe(false);
    expect(unknownAuth.error).toMatch(/unknown.*provider/i);
  });

  test('认证管理器应支持中间件', async () => {
    const authManager = new AuthManager();
    const middlewareSpy = jest.fn();
    
    authManager.use(async (ctx, next) => {
      middlewareSpy(ctx.credentials);
      await next();
    });
    
    authManager.registerProvider(new PasswordAuthProvider());
    
    await authManager.authenticate({
      type: 'password',
      data: { username: 'test@example.com', password: 'password' }
    });
    
    expect(middlewareSpy).toHaveBeenCalled();
  });
});
```

### 2. 前端状态扩展性测试用例

#### 测试用例2.1: 认证状态扩展测试
```javascript
describe('认证状态扩展性', () => {
  test('认证状态应支持添加新字段', () => {
    const initialState = {
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    };
    
    // 扩展状态结构
    const extendedState = {
      ...initialState,
      permissions: [],
      preferences: {},
      lastActivity: null
    };
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider initialState={extendedState}>
          {children}
        </AuthProvider>
      )
    });
    
    expect(result.current.state).toHaveProperty('permissions');
    expect(result.current.state).toHaveProperty('preferences');
    expect(result.current.state).toHaveProperty('lastActivity');
  });

  test('用户对象应支持动态扩展', () => {
    const baseUser = {
      id: '1',
      username: 'test',
      email: 'test@example.com'
    };
    
    const extendedUser = {
      ...baseUser,
      profile: {
        firstName: 'Test',
        lastName: 'User',
        avatar: 'avatar.jpg'
      },
      roles: ['user', 'premium'],
      settings: {
        theme: 'dark',
        language: 'en'
      }
    };
    
    render(
      <AuthProvider initialState={{ 
        isAuthenticated: true, 
        user: extendedUser 
      }}>
        <UserProfile />
      </AuthProvider>
    );
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('premium')).toBeInTheDocument();
  });

  test('状态更新应保持向后兼容性', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });
    
    // 旧版本的更新方法应该继续工作
    act(() => {
      result.current.updateUser({
        id: '1',
        username: 'test'
      });
    });
    
    expect(result.current.state.user).toMatchObject({
      id: '1',
      username: 'test'
    });
    
    // 新版本的扩展更新方法
    act(() => {
      result.current.updateUserExtended({
        profile: { firstName: 'Test' },
        permissions: ['read', 'write']
      });
    });
    
    expect(result.current.state.user).toMatchObject({
      id: '1',
      username: 'test',
      profile: { firstName: 'Test' },
      permissions: ['read', 'write']
    });
  });

  test('状态持久化应支持新字段', () => {
    const extendedState = {
      isAuthenticated: true,
      user: {
        id: '1',
        username: 'test',
        preferences: { theme: 'dark' },
        permissions: ['read']
      }
    };
    
    // 保存扩展状态
    localStorage.setItem('authState', JSON.stringify(extendedState));
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });
    
    expect(result.current.state.user.preferences).toEqual({ theme: 'dark' });
    expect(result.current.state.user.permissions).toEqual(['read']);
  });
});
```

### 3. API路由扩展性测试用例

#### 测试用例3.1: 路由结构扩展测试
```javascript
describe('API路由扩展性', () => {
  test('应支持版本化API路由', async () => {
    // v1 API
    const v1Response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test@example.com', password: 'password' });
    
    expect(v1Response.status).toBe(200);
    
    // v2 API (扩展版本)
    const v2Response = await request(app)
      .post('/api/v2/auth/login')
      .send({ 
        username: 'test@example.com', 
        password: 'password',
        deviceInfo: { type: 'mobile', id: 'device123' }
      });
    
    expect(v2Response.status).toBe(200);
    expect(v2Response.body).toHaveProperty('deviceSession');
  });

  test('新的认证端点应遵循统一模式', async () => {
    // 注册端点（预留）
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123'
      });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toHaveProperty('success');
    expect(registerResponse.body).toHaveProperty('user');
    
    // 密码重置端点（预留）
    const resetResponse = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });
    
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body).toHaveProperty('success');
  });

  test('OAuth端点应支持多个提供商', async () => {
    const providers = ['google', 'github', 'facebook'];
    
    for (const provider of providers) {
      const response = await request(app)
        .get(`/api/auth/oauth/${provider}`)
        .query({ redirect_uri: 'http://localhost:3000/callback' });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(provider);
    }
  });

  test('API路由应支持中间件扩展', async () => {
    const rateLimitSpy = jest.spyOn(rateLimitMiddleware, 'check');
    const authSpy = jest.spyOn(authMiddleware, 'verify');
    
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'test@example.com', password: 'password' });
    
    expect(rateLimitSpy).toHaveBeenCalled();
    
    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer valid-token');
    
    expect(authSpy).toHaveBeenCalled();
  });

  test('路由配置应支持动态注册', () => {
    const router = new AuthRouter();
    
    // 动态添加新路由
    router.addRoute('POST', '/auth/2fa/verify', twoFactorVerifyHandler);
    router.addRoute('POST', '/auth/social/link', socialLinkHandler);
    
    const routes = router.getRoutes();
    
    expect(routes).toHaveProperty('POST /auth/2fa/verify');
    expect(routes).toHaveProperty('POST /auth/social/link');
  });
});
```

### 4. 配置管理系统测试用例

#### 测试用例4.1: 配置系统扩展测试
```javascript
describe('配置管理系统', () => {
  test('应支持环境变量配置', () => {
    const config = new AuthConfig({
      JWT_SECRET: 'test-secret',
      BCRYPT_ROUNDS: '12',
      OAUTH_GOOGLE_CLIENT_ID: 'google-client-id',
      OAUTH_GITHUB_CLIENT_ID: 'github-client-id'
    });
    
    expect(config.jwt.secret).toBe('test-secret');
    expect(config.password.bcryptRounds).toBe(12);
    expect(config.oauth.google.clientId).toBe('google-client-id');
    expect(config.oauth.github.clientId).toBe('github-client-id');
  });

  test('配置应支持嵌套结构', () => {
    const config = new AuthConfig({
      AUTH_PROVIDERS_PASSWORD_ENABLED: 'true',
      AUTH_PROVIDERS_PASSWORD_MIN_LENGTH: '8',
      AUTH_PROVIDERS_OAUTH_GOOGLE_ENABLED: 'true',
      AUTH_PROVIDERS_OAUTH_GITHUB_ENABLED: 'false'
    });
    
    expect(config.providers.password.enabled).toBe(true);
    expect(config.providers.password.minLength).toBe(8);
    expect(config.providers.oauth.google.enabled).toBe(true);
    expect(config.providers.oauth.github.enabled).toBe(false);
  });

  test('配置验证应检测无效值', () => {
    expect(() => {
      new AuthConfig({
        BCRYPT_ROUNDS: 'invalid',
        JWT_SECRET: '' // 空密钥
      });
    }).toThrow('Invalid configuration');
  });

  test('配置应支持运行时更新', () => {
    const config = new AuthConfig();
    
    config.updateProvider('oauth', 'microsoft', {
      enabled: true,
      clientId: 'microsoft-client-id'
    });
    
    expect(config.providers.oauth.microsoft).toEqual({
      enabled: true,
      clientId: 'microsoft-client-id'
    });
  });

  test('配置应支持默认值和覆盖', () => {
    const defaultConfig = {
      providers: {
        password: { enabled: true, minLength: 6 },
        oauth: { enabled: false }
      }
    };
    
    const customConfig = {
      providers: {
        password: { minLength: 8 },
        oauth: { enabled: true, google: { clientId: 'test' } }
      }
    };
    
    const mergedConfig = AuthConfig.merge(defaultConfig, customConfig);
    
    expect(mergedConfig.providers.password.enabled).toBe(true);
    expect(mergedConfig.providers.password.minLength).toBe(8);
    expect(mergedConfig.providers.oauth.enabled).toBe(true);
  });
});
```

### 5. 数据库模式扩展性测试用例

#### 测试用例5.1: 数据库扩展测试
```javascript
describe('数据库模式扩展性', () => {
  test('用户表应支持多种认证方式', async () => {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      authProviders: [
        { provider: 'password', providerId: 'test@example.com' },
        { provider: 'google', providerId: 'google-user-id-123' }
      ]
    });
    
    expect(user.authProviders).toHaveLength(2);
    expect(user.authProviders[0].provider).toBe('password');
    expect(user.authProviders[1].provider).toBe('google');
  });

  test('用户表应支持灵活的属性扩展', async () => {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        avatar: 'avatar.jpg'
      },
      preferences: {
        theme: 'dark',
        language: 'zh-CN',
        notifications: true
      },
      metadata: {
        registrationSource: 'web',
        referrer: 'google'
      }
    });
    
    expect(user.profile.firstName).toBe('Test');
    expect(user.preferences.theme).toBe('dark');
    expect(user.metadata.registrationSource).toBe('web');
  });

  test('认证会话表应支持设备信息', async () => {
    const session = await AuthSession.create({
      userId: 'user-123',
      token: 'session-token',
      deviceInfo: {
        type: 'mobile',
        os: 'iOS',
        browser: 'Safari',
        fingerprint: 'device-fingerprint'
      },
      location: {
        ip: '192.168.1.1',
        country: 'CN',
        city: 'Beijing'
      }
    });
    
    expect(session.deviceInfo.type).toBe('mobile');
    expect(session.location.country).toBe('CN');
  });

  test('数据库适配器应支持不同存储后端', async () => {
    // 测试不同的数据库适配器
    const adapters = [
      new PostgreSQLAdapter(process.env.POSTGRES_URL),
      new MySQLAdapter(process.env.MYSQL_URL),
      new SQLiteAdapter(':memory:')
    ];
    
    for (const adapter of adapters) {
      const userRepo = new UserRepository(adapter);
      
      const user = await userRepo.create({
        username: 'test',
        email: 'test@example.com'
      });
      
      expect(user.id).toBeDefined();
      expect(user.username).toBe('test');
      
      const foundUser = await userRepo.findByEmail('test@example.com');
      expect(foundUser).toBeTruthy();
    }
  });

  test('数据模型应支持版本迁移', async () => {
    // 模拟数据库迁移
    const migrator = new DatabaseMigrator();
    
    // 添加新字段迁移
    migrator.addMigration('add_user_preferences', {
      up: 'ALTER TABLE users ADD COLUMN preferences JSON',
      down: 'ALTER TABLE users DROP COLUMN preferences'
    });
    
    // 添加新表迁移
    migrator.addMigration('create_auth_sessions', {
      up: `CREATE TABLE auth_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        token VARCHAR(255),
        device_info JSON,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      down: 'DROP TABLE auth_sessions'
    });
    
    await migrator.runPendingMigrations();
    
    // 验证迁移是否成功
    const tableExists = await migrator.tableExists('auth_sessions');
    expect(tableExists).toBe(true);
  });
});
```

### 6. 插件系统测试用例

#### 测试用例6.1: 插件架构测试
```javascript
describe('插件系统', () => {
  test('应支持认证插件注册', () => {
    const authSystem = new AuthSystem();
    
    class TwoFactorPlugin {
      name = 'two-factor';
      
      async beforeAuthentication(context) {
        context.require2FA = true;
      }
      
      async afterAuthentication(context) {
        if (context.user.twoFactorEnabled && !context.twoFactorVerified) {
          throw new Error('Two-factor verification required');
        }
      }
    }
    
    authSystem.registerPlugin(new TwoFactorPlugin());
    
    const plugins = authSystem.getPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('two-factor');
  });

  test('插件应能修改认证流程', async () => {
    const authSystem = new AuthSystem();
    
    class LoggingPlugin {
      async beforeAuthentication(context) {
        context.startTime = Date.now();
      }
      
      async afterAuthentication(context) {
        const duration = Date.now() - context.startTime;
        console.log(`Authentication took ${duration}ms`);
      }
    }
    
    const consoleSpy = jest.spyOn(console, 'log');
    authSystem.registerPlugin(new LoggingPlugin());
    
    await authSystem.authenticate({
      type: 'password',
      data: { username: 'test@example.com', password: 'password' }
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Authentication took \d+ms/)
    );
  });

  test('插件应支持事件钩子', () => {
    const eventSystem = new AuthEventSystem();
    
    const loginHandler = jest.fn();
    const logoutHandler = jest.fn();
    
    eventSystem.on('user:login', loginHandler);
    eventSystem.on('user:logout', logoutHandler);
    
    eventSystem.emit('user:login', { userId: '123', timestamp: Date.now() });
    eventSystem.emit('user:logout', { userId: '123', timestamp: Date.now() });
    
    expect(loginHandler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123' })
    );
    expect(logoutHandler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123' })
    );
  });

  test('插件应支持依赖注入', () => {
    const container = new DIContainer();
    
    container.register('logger', () => new Logger());
    container.register('emailService', () => new EmailService());
    
    class PasswordResetPlugin {
      constructor(logger, emailService) {
        this.logger = logger;
        this.emailService = emailService;
      }
      
      async sendResetEmail(email) {
        this.logger.info(`Sending reset email to ${email}`);
        await this.emailService.send(email, 'Password Reset', 'Reset link...');
      }
    }
    
    container.register('passwordResetPlugin', 
      (logger, emailService) => new PasswordResetPlugin(logger, emailService)
    );
    
    const plugin = container.resolve('passwordResetPlugin');
    expect(plugin.logger).toBeInstanceOf(Logger);
    expect(plugin.emailService).toBeInstanceOf(EmailService);
  });
});
```

### 7. 扩展验证测试用例

#### 测试用例7.1: 扩展功能验证测试
```javascript
describe('扩展功能验证', () => {
  test('OAuth扩展应无缝集成', async () => {
    const authSystem = new AuthSystem();
    
    // 模拟OAuth扩展
    class GoogleOAuthExtension {
      async authenticate(authCode) {
        // 模拟Google OAuth流程
        const userInfo = await this.exchangeCodeForUserInfo(authCode);
        return {
          success: true,
          user: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            provider: 'google'
          }
        };
      }
      
      async exchangeCodeForUserInfo(code) {
        return {
          id: 'google-123',
          email: 'test@gmail.com',
          name: 'Test User'
        };
      }
    }
    
    authSystem.addOAuthProvider('google', new GoogleOAuthExtension());
    
    const result = await authSystem.authenticateOAuth('google', 'auth-code-123');
    
    expect(result.success).toBe(true);
    expect(result.user.provider).toBe('google');
    expect(result.user.email).toBe('test@gmail.com');
  });

  test('注册功能扩展应保持一致性', async () => {
    const authSystem = new AuthSystem();
    
    class RegistrationExtension {
      async register(userData) {
        // 验证数据
        this.validateRegistrationData(userData);
        
        // 创建用户
        const user = await this.createUser(userData);
        
        // 发送欢迎邮件
        await this.sendWelcomeEmail(user.email);
        
        return { success: true, user };
      }
      
      validateRegistrationData(data) {
        if (!data.email || !data.password) {
          throw new Error('Email and password are required');
        }
      }
      
      async createUser(data) {
        return {
          id: 'new-user-123',
          email: data.email,
          username: data.username,
          createdAt: new Date()
        };
      }
      
      async sendWelcomeEmail(email) {
        console.log(`Sending welcome email to ${email}`);
      }
    }
    
    authSystem.addExtension('registration', new RegistrationExtension());
    
    const result = await authSystem.register({
      email: 'new@example.com',
      password: 'password123',
      username: 'newuser'
    });
    
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('new@example.com');
  });

  test('多因素认证扩展应集成顺畅', async () => {
    const authSystem = new AuthSystem();
    
    class MFAExtension {
      async generateTOTP(userId) {
        return {
          secret: 'MFASECRETEKEY',
          qrCode: 'data:image/png;base64,qrcode-data',
          backupCodes: ['123456', '789012']
        };
      }
      
      async verifyTOTP(userId, token) {
        return token === '123456'; // 简化验证
      }
      
      async sendSMSCode(phoneNumber) {
        console.log(`Sending SMS code to ${phoneNumber}`);
        return { success: true, messageId: 'sms-123' };
      }
    }
    
    authSystem.addExtension('mfa', new MFAExtension());
    
    const totpSetup = await authSystem.generateTOTP('user-123');
    expect(totpSetup.secret).toBeDefined();
    expect(totpSetup.qrCode).toBeDefined();
    
    const verification = await authSystem.verifyTOTP('user-123', '123456');
    expect(verification).toBe(true);
  });

  test('第三方集成应支持标准接口', async () => {
    const authSystem = new AuthSystem();
    
    class LDAPIntegration {
      async authenticate(username, password) {
        // 模拟LDAP认证
        if (username.endsWith('@company.com')) {
          return {
            success: true,
            user: {
              id: `ldap-${username}`,
              username,
              groups: ['employees', 'developers']
            }
          };
        }
        return { success: false };
      }
    }
    
    authSystem.addAuthProvider('ldap', new LDAPIntegration());
    
    const result = await authSystem.authenticate({
      type: 'ldap',
      data: {
        username: 'john@company.com',
        password: 'password'
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.user.groups).toContain('employees');
  });
});
```

### 8. 性能和稳定性测试用例

#### 测试用例8.1: 扩展性能测试
```javascript
describe('扩展性能测试', () => {
  test('多提供商环境下性能应稳定', async () => {
    const authSystem = new AuthSystem();
    
    // 注册多个认证提供商
    authSystem.addProvider('password', new PasswordProvider());
    authSystem.addProvider('google', new GoogleProvider());
    authSystem.addProvider('github', new GitHubProvider());
    authSystem.addProvider('ldap', new LDAPProvider());
    
    const startTime = performance.now();
    
    // 并发认证测试
    const authPromises = Array(100).fill().map(async (_, i) => {
      const providerType = ['password', 'google', 'github', 'ldap'][i % 4];
      return authSystem.authenticate({
        type: providerType,
        data: { username: `user${i}@example.com`, password: 'password' }
      });
    });
    
    await Promise.all(authPromises);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000); // 5秒内完成100个并发认证
  });

  test('插件链不应影响核心性能', async () => {
    const authSystem = new AuthSystem();
    
    // 添加多个插件
    for (let i = 0; i < 10; i++) {
      authSystem.addPlugin({
        name: `plugin-${i}`,
        beforeAuth: async (context) => {
          context[`plugin${i}Data`] = `data-${i}`;
        }
      });
    }
    
    const startTime = performance.now();
    
    await authSystem.authenticate({
      type: 'password',
      data: { username: 'test@example.com', password: 'password' }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100); // 插件链不应显著增加延迟
  });

  test('配置热更新不应影响运行时性能', async () => {
    const authSystem = new AuthSystem();
    
    const startTime = performance.now();
    
    // 模拟运行时配置更新
    for (let i = 0; i < 50; i++) {
      authSystem.updateConfig({
        providers: {
          password: { minLength: 6 + (i % 3) }
        }
      });
      
      await authSystem.authenticate({
        type: 'password',
        data: { username: 'test@example.com', password: 'password123' }
      });
    }
    
    const endTime = performance.now();
    const avgDuration = (endTime - startTime) / 50;
    
    expect(avgDuration).toBeLessThan(50); // 每次认证平均不超过50ms
  });

  test('扩展功能应正确处理错误传播', async () => {
    const authSystem = new AuthSystem();
    
    class FailingPlugin {
      async beforeAuth(context) {
        throw new Error('Plugin error');
      }
    }
    
    authSystem.addPlugin(new FailingPlugin());
    
    const result = await authSystem.authenticate({
      type: 'password',
      data: { username: 'test@example.com', password: 'password' }
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Plugin error');
    
    // 系统应该继续可用
    const healthCheck = await authSystem.healthCheck();
    expect(healthCheck.status).toBe('healthy');
  });
});
``` 