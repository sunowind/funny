# User Story 6: 用户体验优化

## Story标题
作为用户，我需要流畅友好的登录体验，这样我就能够轻松高效地完成认证流程

## 用户角色
- 新用户（首次使用）
- 回访用户

## 用户故事
**作为** 使用应用的用户  
**我想要** 获得流畅、直观的登录体验  
**这样** 我就能够快速完成认证，专注于主要任务  

## 验收条件 (AC)

### AC1: 加载状态反馈
- **Given** 用户提交登录表单
- **When** 系统正在处理认证请求
- **Then** 用户应该看到明确的加载指示器
- **And** 登录按钮应该被禁用并显示"登录中..."
- **And** 加载动画应该流畅且不打扰

### AC2: 成功状态反馈
- **Given** 用户认证成功
- **When** 登录完成
- **Then** 用户应该看到成功消息提示
- **And** 应该平滑过渡到目标页面
- **And** 显示欢迎信息和用户头像（如有）

### AC3: 错误状态处理
- **Given** 登录过程中出现错误
- **When** 认证失败
- **Then** 用户应该看到清晰的错误提示
- **And** 错误信息应该具体且可操作
- **And** 表单应该保持用户已输入的数据（除密码）

### AC4: "记住我"功能
- **Given** 用户勾选"记住我"选项
- **When** 成功登录
- **Then** 系统应该延长登录有效期
- **And** 下次访问时自动登录
- **And** 在安全的设备上提供便利

### AC5: 欢迎信息展示
- **Given** 用户成功登录
- **When** 进入主页面
- **Then** 应该显示个性化的欢迎信息
- **And** 展示用户头像或默认头像
- **And** 提供清晰的登出按钮

### AC6: 响应式设计适配
- **Given** 用户在不同设备上访问
- **When** 使用手机、平板或桌面设备
- **Then** 登录界面应该适配屏幕尺寸
- **And** 触摸操作应该舒适易用
- **And** 字体大小和间距合理

### AC7: 键盘导航支持
- **Given** 用户使用键盘操作
- **When** 在登录表单中导航
- **Then** Tab键应该正确切换焦点
- **And** Enter键应该提交表单
- **And** Escape键应该关闭模态框

## 技术要求

### 加载状态实现
- 使用适当的Loading组件
- 防止重复提交
- 显示加载进度（如果适用）

### 动画和过渡
- 页面切换使用平滑过渡
- 表单验证错误的动画反馈
- 成功状态的微交互动画

### 错误处理
- 统一的错误提示样式
- 支持国际化的错误信息
- 错误恢复的引导

### 无障碍访问 (a11y)
- 适当的ARIA标签
- 屏幕阅读器支持
- 高对比度模式支持
- 键盘导航完整支持

## 用户体验指标
- 登录完成时间 < 3秒
- 首次成功登录率 > 95%
- 用户满意度评分 > 4.5/5
- 无障碍访问评级 AA级

## 定义完成 (DoD)
- [ ] 所有交互状态正确显示
- [ ] 响应式设计在主要设备上测试通过
- [ ] 无障碍访问测试通过
- [ ] 用户体验测试获得积极反馈
- [ ] 加载性能满足指标要求
- [ ] 跨浏览器兼容性测试通过

## 优先级
**Medium** - 影响用户满意度，但不阻塞基本功能

## 估算
**Story Points**: 5

## 依赖
- 基础认证功能已实现
- UI组件库已完善
- 主题系统已配置

## 测试用例
- 网络延迟情况下的加载状态
- 各种错误场景的用户体验
- 不同设备和浏览器的兼容性
- 键盘和屏幕阅读器的操作流程

## 设计考虑
- 遵循Material Design或类似设计系统
- 保持与应用整体风格一致
- 考虑用户的心理预期和习惯
- 减少认知负担，简化操作流程

## 备注
- 收集用户反馈持续优化
- 考虑A/B测试不同的UX方案
- 为未来的生物识别登录预留空间

---

## 测试用例

### 1. 加载状态测试用例

#### 测试用例1.1: 登录加载状态测试
```javascript
describe('登录加载状态', () => {
  test('提交登录时应显示加载状态', async () => {
    render(<LoginForm />);
    
    // 模拟延迟的API响应
    let resolveLogin;
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve;
    });
    
    global.fetch = jest.fn(() => loginPromise);
    
    const usernameInput = screen.getByLabelText(/用户名|邮箱/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const submitButton = screen.getByRole('button', { name: /登录/i });
    
    fireEvent.change(usernameInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    // 验证加载状态
    expect(screen.getByText(/登录中/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    // 解析Promise以结束加载状态
    await act(async () => {
      resolveLogin({
        ok: true,
        json: () => Promise.resolve({ success: true, user: { id: '1' } })
      });
      await loginPromise;
    });
    
    expect(screen.queryByText(/登录中/i)).not.toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  test('加载状态下表单应防止重复提交', async () => {
    render(<LoginForm />);
    
    let resolveCount = 0;
    global.fetch = jest.fn(() => {
      resolveCount++;
      return new Promise(() => {}); // 永不解析，保持加载状态
    });
    
    const submitButton = screen.getByRole('button', { name: /登录/i });
    
    fireEvent.change(screen.getByLabelText(/用户名/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/密码/i), { 
      target: { value: 'password' } 
    });
    
    // 快速点击多次
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    
    // 应该只调用一次
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(submitButton).toBeDisabled();
  });

  test('加载动画应流畅显示', () => {
    render(<LoginForm isLoading={true} />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
    
    // 验证spinner的可访问性
    expect(spinner).toHaveAttribute('aria-label', '正在登录...');
  });
});
```

### 2. 成功状态测试用例

#### 测试用例2.1: 登录成功反馈测试
```javascript
describe('登录成功反馈', () => {
  test('成功登录应显示成功消息', async () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }));

    render(<LoginForm />);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: { id: '1', username: 'testuser', email: 'test@example.com' }
      })
    }));
    
    fireEvent.change(screen.getByLabelText(/用户名/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/密码/i), { 
      target: { value: 'password123' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/登录成功/i)).toBeInTheDocument();
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    });
  });

  test('成功登录应显示欢迎信息', async () => {
    const user = { id: '1', username: 'John', email: 'john@example.com' };
    
    render(
      <AuthProvider initialState={{ isAuthenticated: true, user }}>
        <WelcomeMessage />
      </AuthProvider>
    );
    
    expect(screen.getByText('欢迎回来，John!')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('成功登录应显示用户头像', () => {
    const userWithAvatar = { 
      id: '1', 
      username: 'John', 
      avatar: 'https://example.com/avatar.jpg' 
    };
    
    render(
      <AuthProvider initialState={{ isAuthenticated: true, user: userWithAvatar }}>
        <UserProfile />
      </AuthProvider>
    );
    
    const avatar = screen.getByRole('img', { name: /John.*头像/i });
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  test('无头像用户应显示默认头像', () => {
    const userWithoutAvatar = { id: '1', username: 'John' };
    
    render(
      <AuthProvider initialState={{ isAuthenticated: true, user: userWithoutAvatar }}>
        <UserProfile />
      </AuthProvider>
    );
    
    const defaultAvatar = screen.getByTestId('default-avatar');
    expect(defaultAvatar).toBeInTheDocument();
    expect(defaultAvatar).toHaveTextContent('J'); // 首字母头像
  });

  test('登录成功后应平滑过渡到目标页面', async () => {
    const mockNavigate = jest.fn();
    
    render(
      <MemoryRouter initialEntries={['/login?redirect=/dashboard']}>
        <Routes>
          <Route path="/login" element={<LoginPage navigate={mockNavigate} />} />
        </Routes>
      </MemoryRouter>
    );
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, user: { id: '1' } })
    }));
    
    fireEvent.change(screen.getByLabelText(/用户名/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/密码/i), { 
      target: { value: 'password' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
```

### 3. 错误状态测试用例

#### 测试用例3.1: 错误处理和显示测试
```javascript
describe('错误状态处理', () => {
  test('登录失败应显示错误消息', async () => {
    render(<LoginForm />);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({
        success: false,
        message: '用户名或密码错误'
      })
    }));
    
    fireEvent.change(screen.getByLabelText(/用户名/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/密码/i), { 
      target: { value: 'wrongpassword' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });
  });

  test('网络错误应显示友好提示', async () => {
    render(<LoginForm />);
    
    global.fetch = jest.fn(() => Promise.reject(new Error('Network Error')));
    
    fireEvent.change(screen.getByLabelText(/用户名/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/密码/i), { 
      target: { value: 'password' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/网络连接失败/i)).toBeInTheDocument();
      expect(screen.getByText(/请检查网络设置/i)).toBeInTheDocument();
    });
  });

  test('错误消息应可关闭', async () => {
    render(<LoginForm />);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ success: false, message: '登录失败' })
    }));
    
    // 触发错误
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(screen.getByText('登录失败')).toBeInTheDocument();
    });
    
    // 关闭错误提示
    const closeButton = screen.getByRole('button', { name: /关闭错误/i });
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('登录失败')).not.toBeInTheDocument();
  });

  test('表单验证错误应保留用户输入（除密码外）', async () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    
    fireEvent.change(usernameInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ success: false, message: '登录失败' })
    }));
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(screen.getByText('登录失败')).toBeInTheDocument();
    });
    
    // 用户名应保留，密码应被清空
    expect(usernameInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('');
  });

  test('错误状态应有适当的视觉反馈', async () => {
    render(<LoginForm />);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ success: false, message: '登录失败' })
    }));
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveClass('error-alert');
      
      // 验证错误状态的动画
      expect(errorAlert).toHaveClass('animate-shake');
    });
  });
});
```

### 4. "记住我"功能测试用例

#### 测试用例4.1: 记住我功能测试
```javascript
describe('"记住我"功能', () => {
  test('勾选记住我应延长登录有效期', async () => {
    render(<LoginForm />);
    
    const rememberCheckbox = screen.getByLabelText(/记住我/i);
    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    
    fireEvent.change(usernameInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(rememberCheckbox);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, user: { id: '1' } }),
      headers: new Headers({
        'set-cookie': 'token=long-lived-token; Max-Age=2592000; HttpOnly'
      })
    }));
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"rememberMe":true')
        })
      );
    });
  });

  test('未勾选记住我应使用短期会话', async () => {
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/用户名/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/密码/i), { 
      target: { value: 'password' } 
    });
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, user: { id: '1' } })
    }));
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"rememberMe":false')
        })
      );
    });
  });

  test('记住我状态应持久化', () => {
    const { rerender } = render(<LoginForm />);
    
    const rememberCheckbox = screen.getByLabelText(/记住我/i);
    fireEvent.click(rememberCheckbox);
    
    expect(rememberCheckbox).toBeChecked();
    
    // 重新渲染组件
    rerender(<LoginForm />);
    
    const newRememberCheckbox = screen.getByLabelText(/记住我/i);
    expect(newRememberCheckbox).toBeChecked();
  });

  test('记住我功能应有安全提示', () => {
    render(<LoginForm />);
    
    const rememberCheckbox = screen.getByLabelText(/记住我/i);
    fireEvent.mouseOver(rememberCheckbox);
    
    expect(screen.getByText(/仅在受信任的设备上使用/i)).toBeInTheDocument();
  });
});
```

### 5. 响应式设计测试用例

#### 测试用例5.1: 设备适配测试
```javascript
describe('响应式设计', () => {
  test('移动端布局应适配小屏幕', () => {
    // 模拟移动设备视口
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    render(<LoginForm />);
    
    const loginContainer = screen.getByTestId('login-container');
    expect(loginContainer).toHaveClass('mobile-layout');
    
    // 验证表单元素在移动端的样式
    const submitButton = screen.getByRole('button', { name: /登录/i });
    expect(submitButton).toHaveClass('mobile-button');
    
    // 验证输入框大小适合触摸操作
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      const styles = getComputedStyle(input);
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44); // iOS 指导原则
    });
  });

  test('平板端布局应适中显示', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    
    render(<LoginForm />);
    
    const loginContainer = screen.getByTestId('login-container');
    expect(loginContainer).toHaveClass('tablet-layout');
  });

  test('桌面端布局应充分利用空间', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
    
    render(<LoginForm />);
    
    const loginContainer = screen.getByTestId('login-container');
    expect(loginContainer).toHaveClass('desktop-layout');
  });

  test('触摸操作应舒适易用', () => {
    // 模拟触摸设备
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });
    
    render(<LoginForm />);
    
    const interactiveElements = screen.getAllByRole('button');
    interactiveElements.forEach(element => {
      const styles = getComputedStyle(element);
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
    });
  });

  test('字体大小应在不同设备上合理', () => {
    const viewports = [
      { width: 320, expectedClass: 'text-sm' },
      { width: 768, expectedClass: 'text-base' },
      { width: 1200, expectedClass: 'text-lg' }
    ];
    
    viewports.forEach(({ width, expectedClass }) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      
      const { container } = render(<LoginForm />);
      
      expect(container.firstChild).toHaveClass(expectedClass);
    });
  });
});
```

### 6. 无障碍访问测试用例

#### 测试用例6.1: 键盘导航测试
```javascript
describe('无障碍访问', () => {
  test('Tab键应正确切换焦点顺序', () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const rememberCheckbox = screen.getByLabelText(/记住我/i);
    const submitButton = screen.getByRole('button', { name: /登录/i });
    
    usernameInput.focus();
    expect(usernameInput).toHaveFocus();
    
    fireEvent.keyDown(usernameInput, { key: 'Tab' });
    expect(passwordInput).toHaveFocus();
    
    fireEvent.keyDown(passwordInput, { key: 'Tab' });
    expect(rememberCheckbox).toHaveFocus();
    
    fireEvent.keyDown(rememberCheckbox, { key: 'Tab' });
    expect(submitButton).toHaveFocus();
  });

  test('Enter键应提交表单', () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    
    const usernameInput = screen.getByLabelText(/用户名/i);
    fireEvent.change(usernameInput, { target: { value: 'test@example.com' } });
    
    fireEvent.keyDown(usernameInput, { key: 'Enter' });
    
    expect(onSubmit).toHaveBeenCalled();
  });

  test('Escape键应关闭模态框', () => {
    const onClose = jest.fn();
    render(<LoginModal isOpen={true} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalled();
  });

  test('屏幕阅读器支持应完整', () => {
    render(<LoginForm />);
    
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-labelledby', 'login-form-title');
    
    const usernameInput = screen.getByLabelText(/用户名/i);
    expect(usernameInput).toHaveAttribute('aria-describedby');
    expect(usernameInput).toHaveAttribute('aria-required', 'true');
    
    const passwordInput = screen.getByLabelText(/密码/i);
    expect(passwordInput).toHaveAttribute('aria-describedby');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
    
    const submitButton = screen.getByRole('button', { name: /登录/i });
    expect(submitButton).toHaveAttribute('aria-describedby');
  });

  test('错误状态应对屏幕阅读器可访问', async () => {
    render(<LoginForm />);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ success: false, message: '登录失败' })
    }));
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveAttribute('aria-live', 'polite');
      expect(errorAlert).toHaveAttribute('aria-atomic', 'true');
    });
  });

  test('高对比度模式应正确显示', () => {
    // 模拟高对比度模式
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
    
    render(<LoginForm />);
    
    const form = screen.getByTestId('login-form');
    expect(form).toHaveClass('high-contrast');
  });

  test('焦点指示器应清晰可见', () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/用户名/i);
    usernameInput.focus();
    
    expect(usernameInput).toHaveClass('focus:ring-2');
    expect(usernameInput).toHaveClass('focus:ring-blue-500');
  });
});
```

### 7. 性能测试用例

#### 测试用例7.1: 用户体验性能测试
```javascript
describe('性能测试', () => {
  test('登录完成时间应小于3秒', async () => {
    const startTime = performance.now();
    
    render(<LoginForm />);
    
    global.fetch = jest.fn(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, user: { id: '1' } })
        }), 1000) // 模拟1秒网络延迟
      )
    );
    
    fireEvent.change(screen.getByLabelText(/用户名/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/密码/i), { 
      target: { value: 'password' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/登录成功/i)).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(3000);
  });

  test('表单渲染时间应优化', () => {
    const startTime = performance.now();
    
    render(<LoginForm />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(100); // 100ms内完成渲染
  });

  test('动画性能应流畅', () => {
    render(<LoginForm />);
    
    const animatedElements = screen.getAllByTestId('animated-element');
    
    animatedElements.forEach(element => {
      const styles = getComputedStyle(element);
      expect(styles.willChange).toBe('transform'); // 启用硬件加速
    });
  });

  test('大量交互操作不应影响性能', () => {
    render(<LoginForm />);
    
    const startTime = performance.now();
    
    const usernameInput = screen.getByLabelText(/用户名/i);
    
    // 模拟大量输入
    for (let i = 0; i < 100; i++) {
      fireEvent.change(usernameInput, { target: { value: `test${i}@example.com` } });
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(500); // 500ms内完成所有操作
  });
});
```

### 8. 用户体验指标测试用例

#### 测试用例8.1: UX指标验证测试
```javascript
describe('用户体验指标', () => {
  test('首次成功登录率应大于95%', () => {
    // 这个测试通常需要在实际用户测试中验证
    // 这里我们测试表单的易用性因素
    
    render(<LoginForm />);
    
    // 验证表单清晰度
    expect(screen.getByLabelText(/用户名/i)).toBeVisible();
    expect(screen.getByLabelText(/密码/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /登录/i })).toBeVisible();
    
    // 验证视觉层次清晰
    const title = screen.getByRole('heading', { name: /登录/i });
    expect(title).toHaveClass('text-2xl', 'font-bold');
    
    // 验证操作流程简单
    const formElements = screen.getAllByRole('textbox');
    expect(formElements.length).toBeLessThanOrEqual(2); // 最多两个输入框
  });

  test('用户满意度元素应到位', () => {
    render(<LoginForm />);
    
    // 清晰的标签
    expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    
    // 有用的帮助信息
    expect(screen.getByText(/忘记密码/i)).toBeInTheDocument();
    
    // 明确的行动号召
    const submitButton = screen.getByRole('button', { name: /登录/i });
    expect(submitButton).toHaveClass('bg-blue-600', 'text-white');
    
    // 适当的视觉反馈
    expect(screen.getByTestId('form-container')).toHaveClass('rounded-lg', 'shadow-lg');
  });

  test('认知负担应最小化', () => {
    render(<LoginForm />);
    
    // 字段数量最少
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBe(1); // 只有用户名/邮箱字段可见
    
    // 密码字段单独处理
    const passwordInput = screen.getByLabelText(/密码/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // 可选功能明确标识
    const rememberMe = screen.getByLabelText(/记住我/i);
    expect(rememberMe).toHaveAttribute('type', 'checkbox');
    
    // 主要行动突出
    const submitButton = screen.getByRole('button', { name: /登录/i });
    expect(submitButton).toHaveClass('bg-primary');
  });

  test('错误恢复应简单', async () => {
    render(<LoginForm />);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ 
        success: false, 
        message: '用户名或密码错误',
        suggestions: ['检查用户名拼写', '确认密码正确']
      })
    }));
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    await waitFor(() => {
      // 错误信息明确
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
      
      // 提供建议
      expect(screen.getByText('检查用户名拼写')).toBeInTheDocument();
      expect(screen.getByText('确认密码正确')).toBeInTheDocument();
      
      // 快速重试
      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
    });
  });
});
``` 