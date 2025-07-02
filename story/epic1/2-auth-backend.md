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

---

## 测试用例

### 1. API功能测试用例

#### 测试用例1.1: 登录API成功场景测试
```javascript
describe('POST /api/auth/login - 成功场景', () => {
  test('有效凭据应返回成功响应', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'validPassword123',
      rememberMe: false
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      user: {
        id: expect.any(String),
        username: expect.any(String),
        email: 'testuser@example.com'
      }
    });

    // 验证JWT令牌在Cookie中设置
    expect(response.headers['set-cookie']).toBeDefined();
    const cookies = response.headers['set-cookie'];
    expect(cookies.some(cookie => cookie.includes('token='))).toBe(true);
  });

  test('rememberMe选项应影响token过期时间', async () => {
    const loginDataShort = {
      username: 'testuser@example.com',
      password: 'validPassword123',
      rememberMe: false
    };

    const loginDataLong = {
      username: 'testuser@example.com',
      password: 'validPassword123',
      rememberMe: true
    };

    const responseShort = await request(app)
      .post('/api/auth/login')
      .send(loginDataShort);

    const responseLong = await request(app)
      .post('/api/auth/login')
      .send(loginDataLong);

    // 验证记住我选项影响Cookie过期时间
    const shortCookie = responseShort.headers['set-cookie'][0];
    const longCookie = responseLong.headers['set-cookie'][0];

    expect(longCookie).toMatch(/Max-Age=\d+/);
    expect(shortCookie).not.toMatch(/Max-Age=/);
  });
});
```

#### 测试用例1.2: 登录API失败场景测试
```javascript
describe('POST /api/auth/login - 失败场景', () => {
  test('用户名不存在应返回401错误', async () => {
    const loginData = {
      username: 'nonexistent@example.com',
      password: 'anyPassword123'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: '用户名或密码错误'
    });
  });

  test('错误密码应返回401错误', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'wrongPassword'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: '用户名或密码错误'
    });
  });

  test('缺少必填字段应返回400错误', async () => {
    const incompleteData = {
      username: 'testuser@example.com'
      // 缺少密码字段
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(incompleteData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/密码.*必填/i);
  });

  test('无效数据格式应返回400错误', async () => {
    const invalidData = {
      username: '', // 空用户名
      password: '123' // 过短密码
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
```

### 2. 安全测试用例

#### 测试用例2.1: 密码安全处理测试
```javascript
describe('密码安全处理', () => {
  let db;

  beforeAll(async () => {
    db = await getDatabase();
  });

  test('密码应以哈希形式存储在数据库中', async () => {
    const userData = {
      username: 'securitytest',
      email: 'security@example.com',
      password: 'plainTextPassword123'
    };

    // 创建测试用户
    await createUser(userData);

    // 从数据库查询用户
    const user = await db.query('SELECT * FROM users WHERE email = ?', [userData.email]);
    
    // 验证密码不是明文存储
    expect(user[0].password).not.toBe(userData.password);
    expect(user[0].password).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash 格式
  });

  test('密码验证应使用bcrypt比较', async () => {
    const validPassword = 'testPassword123';
    const hashedPassword = await bcrypt.hash(validPassword, 12);

    // 模拟验证过程
    const isValid = await bcrypt.compare(validPassword, hashedPassword);
    const isInvalid = await bcrypt.compare('wrongPassword', hashedPassword);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  test('响应时间应一致，防止时序攻击', async () => {
    const validUser = { username: 'validuser@example.com', password: 'wrongPassword' };
    const invalidUser = { username: 'nonexistent@example.com', password: 'anyPassword' };

    const start1 = Date.now();
    await request(app).post('/api/auth/login').send(validUser);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await request(app).post('/api/auth/login').send(invalidUser);
    const time2 = Date.now() - start2;

    // 响应时间差异应小于50ms
    expect(Math.abs(time1 - time2)).toBeLessThan(50);
  });
});
```

#### 测试用例2.2: JWT令牌安全测试
```javascript
describe('JWT令牌安全', () => {
  test('JWT应包含必要信息且安全签名', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'validPassword123'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    const cookies = response.headers['set-cookie'];
    const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
    const token = tokenCookie.split('token=')[1].split(';')[0];

    // 验证JWT结构
    expect(token.split('.').length).toBe(3);

    // 解码JWT payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    expect(payload).toHaveProperty('userId');
    expect(payload).toHaveProperty('exp');
    expect(payload).toHaveProperty('iat');
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  test('过期的JWT应被拒绝', async () => {
    // 创建过期的JWT
    const expiredToken = jwt.sign(
      { userId: 'test', exp: Math.floor(Date.now() / 1000) - 3600 },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .get('/api/protected-route')
      .set('Cookie', `token=${expiredToken}`)
      .expect(401);

    expect(response.body.message).toMatch(/token.*expired/i);
  });

  test('无效签名的JWT应被拒绝', async () => {
    const invalidToken = jwt.sign(
      { userId: 'test', exp: Math.floor(Date.now() / 1000) + 3600 },
      'wrong-secret'
    );

    const response = await request(app)
      .get('/api/protected-route')
      .set('Cookie', `token=${invalidToken}`)
      .expect(401);

    expect(response.body.message).toMatch(/invalid.*token/i);
  });
});
```

#### 测试用例2.3: Cookie安全设置测试
```javascript
describe('Cookie安全设置', () => {
  test('Cookie应包含安全属性', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'validPassword123'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    const cookies = response.headers['set-cookie'];
    const tokenCookie = cookies.find(cookie => cookie.includes('token='));

    expect(tokenCookie).toMatch(/HttpOnly/);
    expect(tokenCookie).toMatch(/SameSite=Strict/);
    
    // 在HTTPS环境下应包含Secure属性
    if (process.env.NODE_ENV === 'production') {
      expect(tokenCookie).toMatch(/Secure/);
    }
  });

  test('Cookie路径应正确设置', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'validPassword123'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    const cookies = response.headers['set-cookie'];
    const tokenCookie = cookies.find(cookie => cookie.includes('token='));

    expect(tokenCookie).toMatch(/Path=\//);
  });
});
```

### 3. 频率限制测试用例

#### 测试用例3.1: API频率限制测试
```javascript
describe('API频率限制', () => {
  const clientIP = '127.0.0.1';

  beforeEach(async () => {
    // 清理频率限制缓存
    await clearRateLimitCache(clientIP);
  });

  test('正常频率的请求应该被允许', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'wrongPassword'
    };

    // 连续3次失败请求应该被允许
    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);
      
      expect(response.status).toBe(401);
      expect(response.body.message).not.toMatch(/rate.*limit/i);
    }
  });

  test('超过频率限制应返回429错误', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'wrongPassword'
    };

    // 快速发送6次失败请求
    const requests = Array(6).fill().map(() => 
      request(app).post('/api/auth/login').send(loginData)
    );

    const responses = await Promise.all(requests);

    // 前几次请求应该返回401，后续请求应该返回429
    const rateLimitedResponses = responses.filter(res => res.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);

    // 429响应应包含重试时间信息
    const rateLimitResponse = rateLimitedResponses[0];
    expect(rateLimitResponse.headers['retry-after']).toBeDefined();
    expect(rateLimitResponse.body.message).toMatch(/rate.*limit/i);
  });

  test('频率限制应该基于IP地址', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'wrongPassword'
    };

    // 从不同IP发送请求
    const ip1Requests = Array(6).fill().map(() => 
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.1')
        .send(loginData)
    );

    const ip2Requests = Array(3).fill().map(() => 
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.2')
        .send(loginData)
    );

    const [ip1Responses, ip2Responses] = await Promise.all([
      Promise.all(ip1Requests),
      Promise.all(ip2Requests)
    ]);

    // IP1应该被限制，IP2应该正常
    const ip1Limited = ip1Responses.some(res => res.status === 429);
    const ip2Limited = ip2Responses.some(res => res.status === 429);

    expect(ip1Limited).toBe(true);
    expect(ip2Limited).toBe(false);
  });
});
```

### 4. 输入验证测试用例

#### 测试用例4.1: 输入清理和验证测试
```javascript
describe('输入验证和清理', () => {
  test('SQL注入攻击应被阻止', async () => {
    const maliciousData = {
      username: "admin'; DROP TABLE users; --",
      password: 'anyPassword'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(maliciousData);

    // 不应该是500错误（数据库错误）
    expect(response.status).not.toBe(500);
    expect(response.status).toBe(400); // 输入验证错误
  });

  test('XSS攻击应被清理', async () => {
    const xssData = {
      username: '<script>alert("xss")</script>@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(xssData);

    // 响应中不应包含原始脚本标签
    expect(JSON.stringify(response.body)).not.toMatch(/<script>/);
  });

  test('过长输入应被拒绝', async () => {
    const longData = {
      username: 'a'.repeat(1000) + '@example.com',
      password: 'b'.repeat(1000)
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(longData)
      .expect(400);

    expect(response.body.message).toMatch(/too.*long|length/i);
  });

  test('特殊字符应被正确处理', async () => {
    const specialCharData = {
      username: 'user+tag@example.com',
      password: 'Pass@123!#$%'
    };

    // 这应该是有效的输入
    const response = await request(app)
      .post('/api/auth/login')
      .send(specialCharData);

    // 应该返回401（用户不存在）而不是400（格式错误）
    expect(response.status).toBe(401);
  });
});
```

### 5. 集成测试用例

#### 测试用例5.1: 数据库集成测试
```javascript
describe('数据库集成', () => {
  let testUser;

  beforeEach(async () => {
    // 创建测试用户
    testUser = await createTestUser({
      username: 'integrationtest',
      email: 'integration@example.com',
      password: 'testPassword123'
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await deleteTestUser(testUser.id);
  });

  test('成功登录应更新最后登录时间', async () => {
    const loginData = {
      username: 'integration@example.com',
      password: 'testPassword123'
    };

    const loginTime = new Date();
    await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    // 验证数据库中的最后登录时间已更新
    const updatedUser = await getUserById(testUser.id);
    expect(new Date(updatedUser.lastLoginAt)).toBeGreaterThanOrEqual(loginTime);
  });

  test('失败登录应记录失败次数', async () => {
    const loginData = {
      username: 'integration@example.com',
      password: 'wrongPassword'
    };

    await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(401);

    // 验证失败次数记录
    const loginAttempts = await getFailedLoginAttempts(testUser.id);
    expect(loginAttempts.length).toBeGreaterThan(0);
  });
});
```

### 6. 性能测试用例

#### 测试用例6.1: API性能测试
```javascript
describe('API性能', () => {
  test('登录API响应时间应小于500ms', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'validPassword123'
    };

    const startTime = Date.now();
    
    await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500);
  });

  test('并发登录请求应正确处理', async () => {
    const loginData = {
      username: 'testuser@example.com',
      password: 'validPassword123'
    };

    // 同时发送10个登录请求
    const requests = Array(10).fill().map(() => 
      request(app).post('/api/auth/login').send(loginData)
    );

    const responses = await Promise.all(requests);

    // 所有请求都应该成功
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  test('bcrypt哈希性能应在可接受范围内', async () => {
    const password = 'testPassword123';
    
    const startTime = Date.now();
    await bcrypt.hash(password, 12);
    const hashTime = Date.now() - startTime;

    // bcrypt哈希时间应小于1秒
    expect(hashTime).toBeLessThan(1000);
  });
});
```

### 7. 环境兼容性测试用例

#### 测试用例7.1: Cloudflare Workers环境测试
```javascript
describe('Cloudflare Workers兼容性', () => {
  test('应在Workers环境中正确处理Request对象', async () => {
    const mockRequest = new Request('https://test.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test@example.com',
        password: 'password123'
      })
    });

    const mockEnv = {
      DB: mockD1Database,
      JWT_SECRET: 'test-secret'
    };

    const response = await authHandler(mockRequest, mockEnv);
    
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBeDefined();
  });

  test('应正确处理环境变量', async () => {
    const mockEnv = {
      JWT_SECRET: 'test-jwt-secret',
      BCRYPT_ROUNDS: '12',
      RATE_LIMIT_MAX: '5'
    };

    const config = getAuthConfig(mockEnv);
    
    expect(config.jwtSecret).toBe('test-jwt-secret');
    expect(config.bcryptRounds).toBe(12);
    expect(config.rateLimitMax).toBe(5);
  });
});
``` 