# User Story 5: 认证安全特性实现

## Story标题
作为系统管理员，我需要实现全面的安全措施，这样就能保护用户账户免受各种攻击威胁

## 用户角色
- 系统管理员
- 安全运维人员
- 用户（安全保护的受益者）

## 用户故事
**作为** 系统管理员  
**我想要** 实现完整的认证安全机制  
**这样** 就能够防止暴力破解、会话劫持等安全威胁  

## 验收条件 (AC)

### AC1: API频率限制
- **Given** 系统检测到同一IP的频繁登录尝试
- **When** 在短时间内超过设定的尝试次数
- **Then** 系统应该暂时阻止该IP的后续登录请求
- **And** 返回适当的错误信息和重试时间

### AC2: 安全的会话管理
- **Given** 用户成功登录
- **When** 服务器设置认证Cookie
- **Then** Cookie必须包含HttpOnly属性
- **And** 在HTTPS环境下必须包含Secure属性
- **And** 必须设置合适的SameSite属性

### AC3: 密码安全存储
- **Given** 新用户注册或更改密码
- **When** 密码需要存储到数据库
- **Then** 密码必须使用bcrypt进行哈希
- **And** 绝不能以明文形式存储
- **And** 使用足够强度的salt值

### AC4: 模糊错误信息
- **Given** 用户提供错误的登录凭据
- **When** 系统验证失败
- **Then** 错误信息应该保持模糊（如"用户名或密码错误"）
- **And** 不应透露用户名是否存在
- **And** 响应时间应该保持一致，避免时序攻击

### AC5: HTTPS强制使用
- **Given** 用户访问认证相关页面
- **When** 用户使用HTTP协议
- **Then** 系统应该自动重定向到HTTPS
- **And** 所有认证数据传输必须加密

### AC6: 会话安全配置
- **Given** 用户登录会话建立
- **When** 设置会话参数
- **Then** 会话应该有合理的过期时间
- **And** 用户空闲时应该自动过期
- **And** 支持用户主动销毁会话

## 技术要求

### 频率限制实现
- 使用Redis或内存存储跟踪请求频率
- 实现渐进式延迟（每次失败增加等待时间）
- 支持IP白名单配置

### 安全头部设置
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### Cookie安全配置
```
Set-Cookie: token=<value>; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
```

## 安全监控要求
- 记录所有登录尝试（成功和失败）
- 监控异常登录模式
- 记录IP地址和用户代理
- 实现安全事件告警

## 合规性要求
- 符合OWASP认证安全指南
- 满足数据保护法规要求
- 通过安全扫描工具检测

## 定义完成 (DoD)
- [ ] 所有安全特性功能测试通过
- [ ] 通过渗透测试验证
- [ ] 安全配置文档完整
- [ ] 监控和日志功能正常
- [ ] 代码通过安全审查

## 优先级
**Critical** - 安全是系统的基础要求

## 估算
**Story Points**: 8

## 依赖
- 认证API基础功能完成
- 日志记录系统就绪
- 监控系统配置

## 测试场景
- 暴力破解攻击模拟
- 会话劫持测试
- CSRF攻击防护验证
- XSS攻击防护测试

## 备注
- 定期审查和更新安全配置
- 建立安全事件响应流程
- 考虑集成外部安全服务（如Cloudflare Security）

---

## 测试用例

### 1. 频率限制测试用例

#### 测试用例1.1: IP频率限制测试
```javascript
describe('IP频率限制', () => {
  beforeEach(async () => {
    await clearRateLimitCache();
  });

  test('正常频率的请求应该被允许', async () => {
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(
        request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '192.168.1.100')
          .send({ username: 'test@example.com', password: 'wrong' })
      );
    }

    const responses = await Promise.all(requests);
    responses.forEach(response => {
      expect(response.status).toBe(401); // 认证失败但未被限制
      expect(response.body.message).not.toMatch(/rate.*limit/i);
    });
  });

  test('超过频率限制应返回429错误', async () => {
    const clientIP = '192.168.1.101';
    const requests = [];

    // 快速发送超过限制的请求
    for (let i = 0; i < 10; i++) {
      requests.push(
        request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', clientIP)
          .send({ username: 'test@example.com', password: 'wrong' })
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(res => res.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].headers['retry-after']).toBeDefined();
    expect(rateLimited[0].body.message).toMatch(/rate.*limit/i);
  });

  test('不同IP应有独立的频率限制', async () => {
    const ip1 = '192.168.1.102';
    const ip2 = '192.168.1.103';

    // IP1快速发送多个请求触发限制
    const ip1Requests = Array(8).fill().map(() =>
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip1)
        .send({ username: 'test@example.com', password: 'wrong' })
    );

    // IP2发送正常请求
    const ip2Requests = Array(3).fill().map(() =>
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip2)
        .send({ username: 'test@example.com', password: 'wrong' })
    );

    const [ip1Responses, ip2Responses] = await Promise.all([
      Promise.all(ip1Requests),
      Promise.all(ip2Requests)
    ]);

    const ip1Limited = ip1Responses.some(res => res.status === 429);
    const ip2Limited = ip2Responses.some(res => res.status === 429);

    expect(ip1Limited).toBe(true);
    expect(ip2Limited).toBe(false);
  });

  test('渐进式延迟应正确实施', async () => {
    const clientIP = '192.168.1.104';
    
    // 第一次失败
    const response1 = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIP)
      .send({ username: 'test@example.com', password: 'wrong' });
    
    expect(response1.status).toBe(401);

    // 第二次失败，应该有短暂延迟
    const response2 = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIP)
      .send({ username: 'test@example.com', password: 'wrong' });
    
    expect(response2.status).toBe(401);

    // 第三次失败，延迟应该更长
    const response3 = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIP)
      .send({ username: 'test@example.com', password: 'wrong' });
    
    expect(response3.status).toBe(401);

    // 第四次应该被限制
    const response4 = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIP)
      .send({ username: 'test@example.com', password: 'wrong' });
    
    expect(response4.status).toBe(429);
  });
});
```

#### 测试用例1.2: 频率限制恢复测试
```javascript
describe('频率限制恢复', () => {
  test('等待足够时间后应解除限制', async () => {
    const clientIP = '192.168.1.105';

    // 触发频率限制
    const requests = Array(8).fill().map(() =>
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', clientIP)
        .send({ username: 'test@example.com', password: 'wrong' })
    );

    await Promise.all(requests);

    // 立即尝试应被限制
    const limitedResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIP)
      .send({ username: 'test@example.com', password: 'wrong' });

    expect(limitedResponse.status).toBe(429);

    // 等待限制时间过期（模拟等待）
    await new Promise(resolve => setTimeout(resolve, 1100));

    // 应该能正常请求
    const normalResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIP)
      .send({ username: 'test@example.com', password: 'wrong' });

    expect(normalResponse.status).toBe(401); // 正常的认证失败
  });

  test('成功登录应重置失败计数', async () => {
    const clientIP = '192.168.1.106';

    // 几次失败尝试
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', clientIP)
        .send({ username: 'test@example.com', password: 'wrong' });
    }

    // 成功登录
    await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIP)
      .send({ username: 'validuser@example.com', password: 'validpassword' });

    // 失败计数应被重置，可以重新开始
    for (let i = 0; i < 4; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', clientIP)
        .send({ username: 'test@example.com', password: 'wrong' });
      
      expect(response.status).toBe(401); // 应该允许多次失败
    }
  });
});
```

### 2. 安全头部测试用例

#### 测试用例2.1: HTTP安全头部测试
```javascript
describe('HTTP安全头部', () => {
  test('应设置所有必要的安全头部', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test@example.com', password: 'password' });

    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('HSTS头部应正确配置', async () => {
    const response = await request(app)
      .get('/api/auth/status');

    const hstsHeader = response.headers['strict-transport-security'];
    expect(hstsHeader).toMatch(/max-age=\d+/);
    expect(hstsHeader).toContain('includeSubDomains');
  });

  test('CSP头部应阻止内联脚本', async () => {
    const response = await request(app)
      .get('/api/auth/status');

    const cspHeader = response.headers['content-security-policy'];
    expect(cspHeader).not.toContain("'unsafe-inline'");
    expect(cspHeader).not.toContain("'unsafe-eval'");
  });
});
```

### 3. Cookie安全测试用例

#### 测试用例3.1: Cookie安全属性测试
```javascript
describe('Cookie安全属性', () => {
  test('认证Cookie应包含所有安全属性', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ 
        username: 'validuser@example.com', 
        password: 'validpassword' 
      });

    const cookies = response.headers['set-cookie'];
    const authCookie = cookies.find(cookie => cookie.includes('token='));

    expect(authCookie).toMatch(/HttpOnly/);
    expect(authCookie).toMatch(/SameSite=Strict/);
    expect(authCookie).toMatch(/Path=\//);
    
    // 在生产环境中应包含Secure
    if (process.env.NODE_ENV === 'production') {
      expect(authCookie).toMatch(/Secure/);
    }
  });

  test('Cookie应有合理的过期时间', async () => {
    const shortTermResponse = await request(app)
      .post('/api/auth/login')
      .send({ 
        username: 'validuser@example.com', 
        password: 'validpassword',
        rememberMe: false
      });

    const longTermResponse = await request(app)
      .post('/api/auth/login')
      .send({ 
        username: 'validuser@example.com', 
        password: 'validpassword',
        rememberMe: true
      });

    const shortCookie = shortTermResponse.headers['set-cookie'][0];
    const longCookie = longTermResponse.headers['set-cookie'][0];

    // 短期Cookie应该是会话Cookie（无Max-Age）
    expect(shortCookie).not.toMatch(/Max-Age=/);

    // 长期Cookie应该有Max-Age
    expect(longCookie).toMatch(/Max-Age=\d+/);
    
    // 提取Max-Age值并验证合理性
    const maxAgeMatch = longCookie.match(/Max-Age=(\d+)/);
    const maxAge = parseInt(maxAgeMatch[1]);
    expect(maxAge).toBeGreaterThan(86400); // 至少1天
    expect(maxAge).toBeLessThanOrEqual(2592000); // 最多30天
  });

  test('登出应正确清除Cookie', async () => {
    // 先登录
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ 
        username: 'validuser@example.com', 
        password: 'validpassword' 
      });

    const authCookie = loginResponse.headers['set-cookie'][0];

    // 登出
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);

    const logoutCookies = logoutResponse.headers['set-cookie'];
    const clearedCookie = logoutCookies.find(cookie => cookie.includes('token='));

    expect(clearedCookie).toMatch(/token=;/); // 空值
    expect(clearedCookie).toMatch(/Max-Age=0/); // 立即过期
  });
});
```

### 4. 密码安全测试用例

#### 测试用例4.1: 密码哈希安全测试
```javascript
describe('密码哈希安全', () => {
  test('密码应使用强度足够的哈希', async () => {
    const password = 'testPassword123';
    const hash = await bcrypt.hash(password, 12);

    // 验证bcrypt格式
    expect(hash).toMatch(/^\$2[aby]\$.{56}$/);
    
    // 验证哈希强度（cost factor >= 12）
    const costFactor = parseInt(hash.split('$')[2]);
    expect(costFactor).toBeGreaterThanOrEqual(12);
  });

  test('相同密码应生成不同哈希', async () => {
    const password = 'testPassword123';
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);

    expect(hash1).not.toBe(hash2);
    
    // 但都应能验证原密码
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });

  test('密码验证应防时序攻击', async () => {
    const validHash = await bcrypt.hash('validPassword', 12);
    const times = [];

    // 测试多次验证时间
    for (let i = 0; i < 5; i++) {
      const start = process.hrtime.bigint();
      await bcrypt.compare('wrongPassword', validHash);
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000); // 转换为毫秒
    }

    // 验证时间的标准差应该较小
    const avg = times.reduce((a, b) => a + b) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    
    expect(stdDev).toBeLessThan(avg * 0.1); // 标准差应小于平均值的10%
  });
});
```

### 5. 输入验证和清理测试用例

#### 测试用例5.1: 恶意输入防护测试
```javascript
describe('恶意输入防护', () => {
  test('SQL注入尝试应被阻止', async () => {
    const maliciousInputs = [
      "admin'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; DELETE FROM users WHERE id=1; --",
      "admin' /*",
      "' UNION SELECT * FROM users --"
    ];

    for (const maliciousInput of maliciousInputs) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: maliciousInput,
          password: 'password'
        });

      expect(response.status).not.toBe(500); // 不应导致服务器错误
      expect(response.status).toBe(400); // 应该是输入验证错误
    }
  });

  test('XSS攻击向量应被清理', async () => {
    const xssInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>',
      "'><script>alert('xss')</script>"
    ];

    for (const xssInput of xssInputs) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: xssInput + '@example.com',
          password: 'password'
        });

      // 响应不应包含原始脚本内容
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>');
      expect(responseText).not.toContain('javascript:');
      expect(responseText).not.toContain('onerror=');
    }
  });

  test('过长输入应被拒绝', async () => {
    const longUsername = 'a'.repeat(1000) + '@example.com';
    const longPassword = 'b'.repeat(1000);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: longUsername,
        password: longPassword
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/length|long/i);
  });

  test('无效字符应被正确处理', async () => {
    const invalidInputs = [
      { username: 'user\x00@example.com', password: 'password' }, // null字节
      { username: 'user\r\n@example.com', password: 'password' }, // CRLF注入
      { username: 'user@example.com', password: 'pass\x00word' }
    ];

    for (const input of invalidInputs) {
      const response = await request(app)
        .post('/api/auth/login')
        .send(input);

      expect(response.status).toBe(400);
    }
  });
});
```

### 6. HTTPS强制测试用例

#### 测试用例6.1: HTTPS重定向测试
```javascript
describe('HTTPS强制', () => {
  test('HTTP请求应重定向到HTTPS', async () => {
    // 模拟HTTP请求
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-Proto', 'http')
      .send({
        username: 'test@example.com',
        password: 'password'
      });

    expect(response.status).toBe(301);
    expect(response.headers.location).toMatch(/^https:/);
  });

  test('HTTPS请求应正常处理', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({
        username: 'test@example.com',
        password: 'password'
      });

    expect(response.status).not.toBe(301);
  });

  test('开发环境应跳过HTTPS检查', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-Proto', 'http')
      .send({
        username: 'test@example.com',
        password: 'password'
      });

    expect(response.status).not.toBe(301);

    process.env.NODE_ENV = originalEnv;
  });
});
```

### 7. 安全监控和日志测试用例

#### 测试用例7.1: 安全事件日志测试
```javascript
describe('安全事件日志', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('失败登录应记录安全日志', async () => {
    await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '192.168.1.200')
      .set('User-Agent', 'TestAgent/1.0')
      .send({
        username: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'LOGIN_FAILED',
        ip: '192.168.1.200',
        userAgent: 'TestAgent/1.0',
        username: 'test@example.com',
        timestamp: expect.any(String)
      })
    );
  });

  test('成功登录应记录审计日志', async () => {
    await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '192.168.1.201')
      .send({
        username: 'validuser@example.com',
        password: 'validpassword'
      });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'LOGIN_SUCCESS',
        ip: '192.168.1.201',
        userId: expect.any(String),
        timestamp: expect.any(String)
      })
    );
  });

  test('频率限制触发应记录警告日志', async () => {
    const clientIP = '192.168.1.202';

    // 触发频率限制
    const requests = Array(8).fill().map(() =>
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', clientIP)
        .send({ username: 'test@example.com', password: 'wrong' })
    );

    await Promise.all(requests);

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'RATE_LIMIT_TRIGGERED',
        ip: clientIP,
        level: 'WARNING'
      })
    );
  });

  test('异常登录模式应触发告警', async () => {
    // 模拟来自多个不同IP的大量失败尝试
    const ips = ['192.168.1.203', '192.168.1.204', '192.168.1.205'];
    
    for (const ip of ips) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({
          username: 'admin@example.com', // 相同用户名
          password: 'wrongpassword'
        });
    }

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'SUSPICIOUS_ACTIVITY',
        pattern: 'MULTIPLE_IP_FAILED_LOGIN',
        username: 'admin@example.com'
      })
    );
  });
});
```

### 8. 渗透测试用例

#### 测试用例8.1: 认证绕过尝试测试
```javascript
describe('认证绕过防护', () => {
  test('空密码应被拒绝', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'validuser@example.com',
        password: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('特殊字符密码应正确处理', async () => {
    // 包含各种特殊字符的密码
    const specialPasswords = [
      'pass"word',
      "pass'word",
      'pass\\word',
      'pass/word',
      'pass;word',
      'pass|word'
    ];

    for (const password of specialPasswords) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: password
        });

      // 应该是认证失败而不是服务器错误
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    }
  });

  test('Unicode字符应被正确处理', async () => {
    const unicodeInputs = [
      { username: 'tëst@example.com', password: 'pássword' },
      { username: '测试@example.com', password: '密码123' },
      { username: 'test@example.com', password: '🔒password' }
    ];

    for (const input of unicodeInputs) {
      const response = await request(app)
        .post('/api/auth/login')
        .send(input);

      // 应该是认证失败而不是服务器错误
      expect(response.status).toBe(401);
    }
  });
});
``` 