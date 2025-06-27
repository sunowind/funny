import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LoginForm } from '../app/components/auth/LoginForm';
import { AuthProvider } from '../app/context/AuthContext';

test('LoginForm 渲染', () => {
  render(
    React.createElement(AuthProvider, null,
      React.createElement(LoginForm, null)
    )
  );
  expect(screen.getByLabelText('用户名或邮箱')).toBeInTheDocument();
  expect(screen.getByLabelText('密码')).toBeInTheDocument();
  expect(screen.getByText('登录')).toBeInTheDocument();
}); 