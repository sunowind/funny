# User Story 2: 登录界面UI开发

## Story标题
作为用户，我需要一个现代化的登录界面，这样我就能够安全地访问系统

## 用户角色
- 未登录的访客用户
- 需要重新登录的已注册用户

## 用户故事
**作为** 一个访问网站的用户  
**我想要** 看到一个清晰、现代的登录界面  
**这样** 我就能够轻松地输入我的凭据并访问系统  

## 验收条件 (AC)

### AC1: 登录入口可见性
- **Given** 我是未登录用户
- **When** 我访问Home页面
- **Then** 我应该看到显著的"登录"按钮
- **And** 点击后弹出登录界面

### AC2: 登录表单设计
- **Given** 登录界面已打开
- **When** 我查看表单
- **Then** 我应该看到：
  - 用户名/邮箱输入框
  - 密码输入框（带显示/隐藏切换）
  - "记住我"复选框
  - "登录"按钮
  - 清晰的错误提示区域

### AC3: 表单校验
- **Given** 我在登录表单中
- **When** 我提交空表单或格式错误的数据
- **Then** 我应该看到清晰的错误提示
- **And** 错误提示应该指出具体问题（必填字段、邮箱格式等）

### AC4: UI样式兼容性
- **Given** 我使用不同的主题模式
- **When** 我切换深浅色模式
- **Then** 登录界面应该正确适配当前主题
- **And** 使用ShadCN UI组件保持一致性

## 技术要求
- 使用React + TypeScript
- 采用ShadCN UI组件库
- 支持深浅色主题切换
- 响应式设计，兼容移动端
- 表单使用React Hook Form或类似库

## 定义完成 (DoD)
- [ ] UI设计符合现代设计标准
- [ ] 所有验收条件通过测试
- [ ] 代码通过Code Review
- [ ] 无accessibility问题
- [ ] 在主要浏览器中测试通过

## 优先级
**High** - 作为认证流程的入口，是其他功能的前提

## 估算
**Story Points**: 5

## 依赖
- 设计系统/UI组件库就绪
- 主题系统已实现

## 备注
- 界面需要为未来的注册、找回密码功能预留空间
- 考虑加载状态的视觉反馈设计

---

## 测试用例

### 1. 单元测试用例

#### 测试用例1.1: 登录按钮可见性测试
```javascript
describe('登录按钮可见性', () => {
  test('未登录状态下应显示登录按钮', () => {
    render(<HomePage />);
    const loginButton = screen.getByRole('button', { name: /登录/i });
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toBeVisible();
  });

  test('点击登录按钮应打开登录弹框', () => {
    render(<HomePage />);
    const loginButton = screen.getByRole('button', { name: /登录/i });
    fireEvent.click(loginButton);
    expect(screen.getByTestId('login-modal')).toBeInTheDocument();
  });
});
```

#### 测试用例1.2: 登录表单元素测试
```javascript
describe('登录表单元素', () => {
  beforeEach(() => {
    render(<LoginModal isOpen={true} />);
  });

  test('应显示所有必要的表单元素', () => {
    expect(screen.getByLabelText(/用户名|邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/记住我/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  test('密码字段应支持显示/隐藏切换', () => {
    const passwordInput = screen.getByLabelText(/密码/i);
    const toggleButton = screen.getByRole('button', { name: /显示密码/i });
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
```

#### 测试用例1.3: 表单验证测试
```javascript
describe('表单验证', () => {
  test('空表单提交应显示错误信息', async () => {
    render(<LoginForm />);
    const submitButton = screen.getByRole('button', { name: /登录/i });
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/用户名不能为空/i)).toBeInTheDocument();
      expect(screen.getByText(/密码不能为空/i)).toBeInTheDocument();
    });
  });

  test('无效邮箱格式应显示错误信息', async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/邮箱/i);
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/请输入有效的邮箱格式/i)).toBeInTheDocument();
    });
  });

  test('表单验证错误后输入正确值应清除错误', async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/邮箱/i);
    
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/请输入有效的邮箱格式/i)).toBeInTheDocument();
    });
    
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    
    await waitFor(() => {
      expect(screen.queryByText(/请输入有效的邮箱格式/i)).not.toBeInTheDocument();
    });
  });
});
```

### 2. 集成测试用例

#### 测试用例2.1: 主题切换兼容性测试
```javascript
describe('主题兼容性', () => {
  test('深浅色主题切换时UI样式正确', () => {
    const { rerender } = render(
      <ThemeProvider theme="light">
        <LoginModal isOpen={true} />
      </ThemeProvider>
    );
    
    const modal = screen.getByTestId('login-modal');
    expect(modal).toHaveClass('light-theme');
    
    rerender(
      <ThemeProvider theme="dark">
        <LoginModal isOpen={true} />
      </ThemeProvider>
    );
    
    expect(modal).toHaveClass('dark-theme');
  });

  test('ShadCN UI组件在不同主题下渲染正确', () => {
    render(
      <ThemeProvider theme="dark">
        <LoginForm />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button', { name: /登录/i });
    expect(getComputedStyle(button).backgroundColor).toMatch(/dark/i);
  });
});
```

### 3. 端到端测试用例

#### 测试用例3.1: 完整登录流程测试
```javascript
describe('完整登录流程', () => {
  test('用户可以成功完成登录流程', async () => {
    // 访问首页
    cy.visit('/');
    
    // 点击登录按钮
    cy.get('[data-testid="login-button"]').click();
    
    // 填写登录表单
    cy.get('[data-testid="username-input"]').type('testuser@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="remember-me"]').check();
    
    // 提交表单
    cy.get('[data-testid="submit-button"]').click();
    
    // 验证登录成功
    cy.url().should('not.include', '/login');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });
});
```

### 4. 响应式设计测试用例

#### 测试用例4.1: 移动端适配测试
```javascript
describe('响应式设计', () => {
  const viewports = [
    { width: 320, height: 568, name: 'iPhone SE' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];

  viewports.forEach(viewport => {
    test(`在${viewport.name}设备上显示正确`, () => {
      cy.viewport(viewport.width, viewport.height);
      cy.visit('/');
      cy.get('[data-testid="login-button"]').click();
      
      // 验证表单在该视口下可见且可操作
      cy.get('[data-testid="login-modal"]').should('be.visible');
      cy.get('[data-testid="username-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      
      // 验证按钮大小适合触摸操作
      if (viewport.width <= 768) {
        cy.get('[data-testid="submit-button"]')
          .should('have.css', 'min-height')
          .and('match', /44px|2.75rem/); // 符合移动端触摸标准
      }
    });
  });
});
```

### 5. 无障碍访问测试用例

#### 测试用例5.1: 键盘导航测试
```javascript
describe('无障碍访问', () => {
  test('支持键盘导航', () => {
    render(<LoginModal isOpen={true} />);
    
    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const rememberCheckbox = screen.getByLabelText(/记住我/i);
    const submitButton = screen.getByRole('button', { name: /登录/i });
    
    usernameInput.focus();
    expect(usernameInput).toHaveFocus();
    
    // Tab键导航
    fireEvent.keyDown(usernameInput, { key: 'Tab' });
    expect(passwordInput).toHaveFocus();
    
    fireEvent.keyDown(passwordInput, { key: 'Tab' });
    expect(rememberCheckbox).toHaveFocus();
    
    fireEvent.keyDown(rememberCheckbox, { key: 'Tab' });
    expect(submitButton).toHaveFocus();
  });

  test('支持屏幕阅读器', () => {
    render(<LoginModal isOpen={true} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby');
    expect(modal).toHaveAttribute('aria-describedby');
    
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('aria-label');
    });
  });

  test('Escape键关闭模态框', () => {
    const onClose = jest.fn();
    render(<LoginModal isOpen={true} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
```

### 6. 性能测试用例

#### 测试用例6.1: 组件加载性能测试
```javascript
describe('性能测试', () => {
  test('登录模态框打开时间应小于200ms', async () => {
    const startTime = performance.now();
    render(<LoginModal isOpen={true} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('login-modal')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(200);
  });

  test('表单验证响应时间应小于100ms', async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/邮箱/i);
    
    const startTime = performance.now();
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/请输入有效的邮箱格式/i)).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });
});
```

### 7. 浏览器兼容性测试用例

#### 测试用例7.1: 跨浏览器兼容性测试
```javascript
describe('浏览器兼容性', () => {
  const browsers = ['chrome', 'firefox', 'safari', 'edge'];
  
  browsers.forEach(browser => {
    test(`在${browser}浏览器中功能正常`, () => {
      cy.visit('/', { browser });
      
      // 测试基本功能
      cy.get('[data-testid="login-button"]').click();
      cy.get('[data-testid="login-modal"]').should('be.visible');
      
      // 测试表单交互
      cy.get('[data-testid="username-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password');
      
      // 验证样式渲染正确
      cy.get('[data-testid="submit-button"]')
        .should('have.css', 'cursor', 'pointer')
        .should('be.enabled');
    });
  });
});
```

### 8. 视觉回归测试用例

#### 测试用例8.1: UI视觉一致性测试
```javascript
describe('视觉回归测试', () => {
  test('登录弹框视觉快照匹配', () => {
    cy.visit('/');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="login-modal"]').should('be.visible');
    
    // 截图对比
    cy.get('[data-testid="login-modal"]').matchImageSnapshot('login-modal');
  });

  test('表单验证错误状态视觉快照', () => {
    cy.visit('/');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="submit-button"]').click();
    
    cy.get('[data-testid="login-form"]').matchImageSnapshot('login-form-errors');
  });
});
``` 