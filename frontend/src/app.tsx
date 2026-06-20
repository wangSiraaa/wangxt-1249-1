import React from 'react';
import { history, useModel } from '@umijs/max';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import type { RequestConfig } from '@umijs/max';
import { message } from 'antd';
import GlobalHeader from '@/components/GlobalHeader';

export async function getInitialState(): Promise<{
  currentUser?: API.CurrentUser;
  settings?: Partial<LayoutSettings>;
}> {
  const userInfoStr = localStorage.getItem('userInfo');
  let currentUser = undefined;
  if (userInfoStr) {
    try {
      currentUser = JSON.parse(userInfoStr);
    } catch (e) {
      console.error('Parse userInfo error:', e);
    }
  }

  return {
    currentUser,
    settings: {},
  };
}

export const layout: any = ({ initialState }: any) => {
  return {
    headerContentRender: () => <GlobalHeader userInfo={initialState?.currentUser} />,
    rightContentRender: () => null,
    footerRender: () => null,
    onPageChange: () => {
      const { location } = history;
      if (!localStorage.getItem('token') && location.pathname !== '/login') {
        history.push('/login');
      }
    },
  };
};

export const request: RequestConfig = {
  timeout: 30000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
  requestInterceptors: [
    (config: any) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  ],
  responseInterceptors: [
    [
      (response: any) => {
        const data = response.data;
        if (data && data.code !== 200) {
          message.error(data.message || '请求失败');
          if (data.code === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            history.push('/login');
          }
          return Promise.reject(new Error(data.message || '请求失败'));
        }
        return response;
      },
      (error: any) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          history.push('/login');
          message.error('登录已过期，请重新登录');
        } else {
          message.error(error.message || '网络错误');
        }
        return Promise.reject(error);
      },
    ],
  ],
};
