import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, CarOutlined } from '@ant-design/icons';
import { useModel, history } from '@umijs/max';
import { authApi } from '@/services/api';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { setInitialState } = useModel('@@initialState');

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(values);
      localStorage.setItem('token', res.token);
      localStorage.setItem('userInfo', JSON.stringify(res.user_info));
      message.success('登录成功');
      setInitialState({ currentUser: res.user_info, settings: {} });
      history.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: string) => {
    const accounts: Record<string, { username: string; password: string }> = {
      quality: { username: 'quality01', password: '123456' },
      regulation: { username: 'regulation01', password: '123456' },
      dealer: { username: 'dealer01', password: '123456' },
      admin: { username: 'admin', password: '123456' },
    };
    form.setFieldsValue(accounts[role]);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <CarOutlined style={{ fontSize: 64, color: '#fff', marginBottom: 16 }} />
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 600, margin: 0 }}>
            汽车缺陷召回跟踪系统
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
            投诉线索 → 缺陷分析 → 车主通知 → 维修完成
          </p>
        </div>

        <Card style={{ borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <Tabs
            centered
            items={[
              { key: '1', label: '账号登录' },
            ]}
          />
          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ height: 44, fontSize: 16, fontWeight: 500 }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <p style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 13, marginBottom: 12 }}>
              快速登录测试账号：
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button size="small" onClick={() => quickLogin('admin')}>
                管理员
              </Button>
              <Button size="small" onClick={() => quickLogin('quality')}>
                质保工程师
              </Button>
              <Button size="small" onClick={() => quickLogin('regulation')}>
                法规专员
              </Button>
              <Button size="small" onClick={() => quickLogin('dealer')}>
                经销商
              </Button>
            </div>
          </div>
        </Card>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginTop: 24, fontSize: 12 }}>
          © 2024 汽车缺陷召回跟踪系统 v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
