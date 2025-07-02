# User Story 4: 前端认证状态管理

## Story标题
作为用户，我需要系统能记住我的登录状态，这样我就不需要在每次刷新页面时重新登录

## 用户角色
- 已登录用户
- 访问受保护页面的用户

## 用户故事
**作为** 一个已登录的用户  
**我想要** 我的登录状态在应用中持续保持  
**这样** 我就能够流畅地使用应用而不被重复的登录打断  

## 验收条件 (AC)

### AC1: 登录状态初始化
- **Given** 用户已成功登录
- **When** 应用加载或刷新页面
- **Then** 系统应该自动检查并恢复用户的登录状态
- **And** 用户信息应该在全局状态中可用

### AC2: 受保护路由访问控制
- **Given** 存在需要登录的受保护页面
- **When** 未登录用户尝试访问这些页面
- **Then** 用户应该被自动重定向到登录页面
- **And** 登录成功后应该重定向到原本要访问的页面

### AC3: 登录状态变更通知
- **Given** 用户的登录状态发生变化（登录/登出）
- **When** 状态变更完成
- **Then** 应用的所有相关组件应该自动更新显示
- **And** 导航栏应该显示正确的用户信息或登录按钮

### AC4: 令牌过期处理
- **Given** 用户的JWT令牌已过期
- **When** 用户尝试访问需要认证的资源
- **Then** 系统应该自动检测令牌过期
- **And** 用户应该被重定向到登录页面
- **And** 显示友好的过期提示信息

### AC5: 登出功能
- **Given** 用户已登录
- **When** 用户点击登出按钮
- **Then** 本地存储的认证信息应该被清除
- **And** 用户应该被重定向到登录页面或首页
- **And** 全局状态应该重置为未登录状态

## 技术要求
- 使用React Context API管理全局认证状态
- 实现路由守卫功能
- 本地存储管理（localStorage/sessionStorage）
- JWT令牌自动刷新机制（可选）
- 与React Router集成

## 状态结构设计

### AuthContext状态
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

### User接口
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}
```

## 实现要点
- Context Provider包装整个应用
- useAuth自定义Hook简化组件使用
- ProtectedRoute组件保护需要认证的路由
- 应用启动时检查已存在的认证状态
- 统一的错误处理和加载状态

## 定义完成 (DoD)
- [ ] 认证状态在整个应用中正确同步
- [ ] 路由保护功能正常工作
- [ ] 页面刷新后登录状态保持
- [ ] 登出功能正确清理状态
- [ ] 所有认证相关的加载和错误状态正确显示
- [ ] 代码通过TypeScript类型检查

## 优先级
**High** - 认证功能的核心基础设施

## 估算
**Story Points**: 5

## 依赖
- React Router配置完成
- 登录API可用
- 基础UI组件就绪

## 备注
- 考虑令牌自动刷新机制的实现
- 为多标签页状态同步预留扩展空间
- 考虑离线状态处理

---

## 测试用例

### 1. 认证状态管理单元测试

#### 测试用例1.1: AuthContext初始化测试
```javascript
describe('AuthContext初始化', () => {
  test('初始状态应正确设置', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    expect(result.current.state).toEqual({
      isAuthenticated: false,
      user: null,
      loading: true,
      error: null
    });
  });

  test('启动时应检查现有认证状态', async () => {
    // 模拟本地存储中存在token
    localStorage.setItem('authToken', 'valid-jwt-token');
    
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await waitForNextUpdate();

    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.isAuthenticated).toBe(true);
  });

  test('无效token应重置为未认证状态', async () => {
    localStorage.setItem('authToken', 'invalid-token');
    
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await waitForNextUpdate();

    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.user).toBe(null);
    expect(localStorage.getItem('authToken')).toBe(null);
  });
});
```

#### 测试用例1.2: 登录功能测试
```javascript
describe('登录功能', () => {
  let authContextValue;

  beforeEach(() => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });
    authContextValue = result;
  });

  test('成功登录应更新状态', async () => {
    const credentials = {
      username: 'test@example.com',
      password: 'password123'
    };

    // 模拟API成功响应
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: { id: '1', username: 'test', email: 'test@example.com' }
      }),
      headers: {
        'set-cookie': ['token=jwt-token; HttpOnly']
      }
    });

    await act(async () => {
      await authContextValue.current.login(credentials);
    });

    expect(authContextValue.current.state).toMatchObject({
      isAuthenticated: true,
      user: {
        id: '1',
        username: 'test',
        email: 'test@example.com'
      },
      loading: false,
      error: null
    });
  });

  test('登录失败应设置错误状态', async () => {
    const credentials = {
      username: 'test@example.com',
      password: 'wrongpassword'
    };

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({
        success: false,
        message: '用户名或密码错误'
      })
    });

    await act(async () => {
      await authContextValue.current.login(credentials);
    });

    expect(authContextValue.current.state).toMatchObject({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: '用户名或密码错误'
    });
  });

  test('登录过程中应显示加载状态', async () => {
    const credentials = {
      username: 'test@example.com',
      password: 'password123'
    };

    let resolveLogin;
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve;
    });

    fetchMock.mockReturnValueOnce(loginPromise);

    act(() => {
      authContextValue.current.login(credentials);
    });

    expect(authContextValue.current.state.loading).toBe(true);

    await act(async () => {
      resolveLogin({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          user: { id: '1', username: 'test', email: 'test@example.com' }
        })
      });
      await loginPromise;
    });

    expect(authContextValue.current.state.loading).toBe(false);
  });
});
```

#### 测试用例1.3: 登出功能测试
```javascript
describe('登出功能', () => {
  test('登出应清除认证状态', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    // 先设置已登录状态
    act(() => {
      result.current.state.isAuthenticated = true;
      result.current.state.user = { id: '1', username: 'test' };
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.state).toMatchObject({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
  });

  test('登出应清除本地存储', async () => {
    localStorage.setItem('authToken', 'test-token');
    sessionStorage.setItem('userData', JSON.stringify({ id: '1' }));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorage.getItem('authToken')).toBe(null);
    expect(sessionStorage.getItem('userData')).toBe(null);
  });

  test('登出应调用注销API', async () => {
    const logoutSpy = jest.spyOn(authAPI, 'logout');
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutSpy).toHaveBeenCalled();
  });
});
```

### 2. 路由保护测试

#### 测试用例2.1: ProtectedRoute组件测试
```javascript
describe('ProtectedRoute组件', () => {
  test('已认证用户应能访问受保护组件', () => {
    const MockProtectedComponent = () => <div>Protected Content</div>;
    
    render(
      <AuthProvider initialState={{ isAuthenticated: true, user: { id: '1' } }}>
        <MemoryRouter>
          <ProtectedRoute>
            <MockProtectedComponent />
          </ProtectedRoute>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('未认证用户应被重定向到登录页', () => {
    const MockProtectedComponent = () => <div>Protected Content</div>;
    
    render(
      <AuthProvider initialState={{ isAuthenticated: false, user: null }}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/protected" element={
              <ProtectedRoute>
                <MockProtectedComponent />
              </ProtectedRoute>
            } />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('登录成功后应重定向到原目标页面', async () => {
    const MockProtectedComponent = () => <div>Protected Content</div>;
    
    const { rerender } = render(
      <AuthProvider initialState={{ isAuthenticated: false, user: null }}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/protected" element={
              <ProtectedRoute>
                <MockProtectedComponent />
              </ProtectedRoute>
            } />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();

    // 模拟登录成功
    rerender(
      <AuthProvider initialState={{ isAuthenticated: true, user: { id: '1' } }}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/protected" element={
              <ProtectedRoute>
                <MockProtectedComponent />
              </ProtectedRoute>
            } />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

### 3. 令牌过期处理测试

#### 测试用例3.1: 令牌过期检测测试
```javascript
describe('令牌过期处理', () => {
  test('过期令牌应触发自动登出', async () => {
    // 创建过期的JWT token
    const expiredToken = jwt.sign(
      { userId: '1', exp: Math.floor(Date.now() / 1000) - 3600 },
      'test-secret'
    );
    
    localStorage.setItem('authToken', expiredToken);

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await waitForNextUpdate();

    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.user).toBe(null);
    expect(localStorage.getItem('authToken')).toBe(null);
  });

  test('API请求返回401应触发登出', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    // 设置已登录状态
    act(() => {
      result.current.state.isAuthenticated = true;
      result.current.state.user = { id: '1' };
    });

    // 模拟API请求返回401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Token expired' })
    });

    await act(async () => {
      try {
        await fetch('/api/protected-endpoint');
      } catch (error) {
        // 预期会有错误
      }
    });

    expect(result.current.state.isAuthenticated).toBe(false);
  });

  test('令牌即将过期应自动刷新', async () => {
    // 创建即将过期的token（还有5分钟）
    const soonExpireToken = jwt.sign(
      { userId: '1', exp: Math.floor(Date.now() / 1000) + 300 },
      'test-secret'
    );
    
    localStorage.setItem('authToken', soonExpireToken);

    const refreshSpy = jest.spyOn(authAPI, 'refreshToken');
    refreshSpy.mockResolvedValue({
      success: true,
      token: 'new-refreshed-token'
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await waitForNextUpdate();

    expect(refreshSpy).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe('new-refreshed-token');
  });
});
```

### 4. 状态同步测试

#### 测试用例4.1: 组件状态同步测试
```javascript
describe('状态同步', () => {
  test('认证状态变化应同步到所有使用useAuth的组件', async () => {
    const ComponentA = () => {
      const { state } = useAuth();
      return <div data-testid="component-a">{state.isAuthenticated ? 'Logged In' : 'Logged Out'}</div>;
    };

    const ComponentB = () => {
      const { state } = useAuth();
      return <div data-testid="component-b">{state.user?.username || 'No User'}</div>;
    };

    const LoginButton = () => {
      const { login } = useAuth();
      return (
        <button 
          onClick={() => login({ username: 'test', password: 'pass' })}
          data-testid="login-btn"
        >
          Login
        </button>
      );
    };

    render(
      <AuthProvider>
        <ComponentA />
        <ComponentB />
        <LoginButton />
      </AuthProvider>
    );

    expect(screen.getByTestId('component-a')).toHaveTextContent('Logged Out');
    expect(screen.getByTestId('component-b')).toHaveTextContent('No User');

    // 模拟登录
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: { id: '1', username: 'testuser', email: 'test@example.com' }
      })
    });

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('component-a')).toHaveTextContent('Logged In');
      expect(screen.getByTestId('component-b')).toHaveTextContent('testuser');
    });
  });

  test('导航栏应根据认证状态显示相应内容', () => {
    const Navigation = () => {
      const { state, logout } = useAuth();
      
      if (state.isAuthenticated) {
        return (
          <nav data-testid="authenticated-nav">
            <span>Welcome, {state.user?.username}</span>
            <button onClick={logout}>Logout</button>
          </nav>
        );
      }
      
      return (
        <nav data-testid="unauthenticated-nav">
          <button>Login</button>
        </nav>
      );
    };

    const { rerender } = render(
      <AuthProvider initialState={{ isAuthenticated: false, user: null }}>
        <Navigation />
      </AuthProvider>
    );

    expect(screen.getByTestId('unauthenticated-nav')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();

    rerender(
      <AuthProvider initialState={{ 
        isAuthenticated: true, 
        user: { id: '1', username: 'John' } 
      }}>
        <Navigation />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated-nav')).toBeInTheDocument();
    expect(screen.getByText('Welcome, John')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
```

### 5. 错误处理测试

#### 测试用例5.1: 网络错误处理测试
```javascript
describe('错误处理', () => {
  test('网络错误应设置相应错误状态', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    fetchMock.mockRejectedValueOnce(new Error('Network Error'));

    await act(async () => {
      try {
        await result.current.login({ username: 'test', password: 'pass' });
      } catch (error) {
        // 预期的错误
      }
    });

    expect(result.current.state.error).toBe('网络连接失败，请检查网络设置');
    expect(result.current.state.loading).toBe(false);
  });

  test('服务器错误应显示适当消息', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Internal Server Error' })
    });

    await act(async () => {
      try {
        await result.current.login({ username: 'test', password: 'pass' });
      } catch (error) {
        // 预期的错误
      }
    });

    expect(result.current.state.error).toBe('服务器暂时不可用，请稍后重试');
  });

  test('错误状态应能被清除', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    // 设置错误状态
    act(() => {
      result.current.state.error = 'Some error';
    });

    expect(result.current.state.error).toBe('Some error');

    // 清除错误
    act(() => {
      result.current.clearError();
    });

    expect(result.current.state.error).toBe(null);
  });
});
```

### 6. 本地存储测试

#### 测试用例6.1: 本地存储管理测试
```javascript
describe('本地存储管理', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('登录成功应保存token到localStorage', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: { id: '1', username: 'test' }
      }),
      headers: {
        'set-cookie': ['token=jwt-token-value; HttpOnly']
      }
    });

    await act(async () => {
      await result.current.login({ 
        username: 'test', 
        password: 'pass',
        rememberMe: true 
      });
    });

    expect(localStorage.getItem('authToken')).toBeTruthy();
  });

  test('非持久登录应使用sessionStorage', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: { id: '1', username: 'test' }
      }),
      headers: {
        'set-cookie': ['token=jwt-token-value; HttpOnly']
      }
    });

    await act(async () => {
      await result.current.login({ 
        username: 'test', 
        password: 'pass',
        rememberMe: false 
      });
    });

    expect(sessionStorage.getItem('authToken')).toBeTruthy();
    expect(localStorage.getItem('authToken')).toBeFalsy();
  });

  test('页面刷新应恢复认证状态', async () => {
    const validToken = jwt.sign(
      { userId: '1', exp: Math.floor(Date.now() / 1000) + 3600 },
      'test-secret'
    );
    
    localStorage.setItem('authToken', validToken);
    localStorage.setItem('userData', JSON.stringify({
      id: '1',
      username: 'test',
      email: 'test@example.com'
    }));

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await waitForNextUpdate();

    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.user).toMatchObject({
      id: '1',
      username: 'test',
      email: 'test@example.com'
    });
  });
});
```

### 7. 集成测试

#### 测试用例7.1: 完整认证流程集成测试
```javascript
describe('完整认证流程集成', () => {
  test('从登录到访问受保护页面的完整流程', async () => {
    const App = () => {
      return (
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/" element={<HomePage />} />
            </Routes>
          </Router>
        </AuthProvider>
      );
    };

    render(<App />);

    // 1. 访问受保护页面
    fireEvent.click(screen.getByText('Go to Dashboard'));
    expect(screen.getByText('Login Page')).toBeInTheDocument();

    // 2. 填写登录表单
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });

    // 3. 提交登录
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: { id: '1', username: 'test', email: 'test@example.com' }
      })
    });

    fireEvent.click(screen.getByText('Login'));

    // 4. 验证重定向到Dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    // 5. 验证用户信息显示
    expect(screen.getByText('Welcome, test')).toBeInTheDocument();
  });
});
``` 