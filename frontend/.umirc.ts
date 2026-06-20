import { defineConfig } from '@umijs/max';
import path from 'path';

export default defineConfig({
  npmClient: 'pnpm',
  history: { type: 'browser' },
  hash: true,
  fastRefresh: true,
  ignoreMomentLocale: true,
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {
    dataField: 'data',
  },
  routes: [
    {
      path: '/login',
      layout: false,
      component: './Login',
      name: '登录',
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: '工作台',
      component: './Dashboard',
      icon: 'DashboardOutlined',
    },
    {
      path: '/complaints',
      name: '投诉线索',
      icon: 'AlertOutlined',
      routes: [
        { path: '/complaints/list', name: '投诉列表', component: './Complaints/List' },
        { path: '/complaints/new', name: '新增投诉', component: './Complaints/Form' },
        { path: '/complaints/:id', name: '投诉详情', component: './Complaints/Detail', hideInMenu: true },
      ],
    },
    {
      path: '/recalls',
      name: '召回管理',
      icon: 'WarningOutlined',
      routes: [
        { path: '/recalls/list', name: '召回列表', component: './Recalls/List' },
        { path: '/recalls/new', name: '新建召回', component: './Recalls/Form' },
        { path: '/recalls/:id', name: '召回详情', component: './Recalls/Detail', hideInMenu: true },
      ],
    },
    {
      path: '/notifications',
      name: '车主通知',
      icon: 'BellOutlined',
      routes: [
        { path: '/notifications/list', name: '通知列表', component: './Notifications/List' },
        { path: '/notifications/:id', name: '通知详情', component: './Notifications/Detail', hideInMenu: true },
      ],
    },
    {
      path: '/repairs',
      name: '维修管理',
      icon: 'ToolOutlined',
      routes: [
        { path: '/repairs/list', name: '维修列表', component: './Repairs/List' },
        { path: '/repairs/new', name: '新建维修', component: './Repairs/Form' },
        { path: '/repairs/:id', name: '维修详情', component: './Repairs/Detail', hideInMenu: true },
      ],
    },
    {
      path: '/base',
      name: '基础数据',
      icon: 'DatabaseOutlined',
      routes: [
        { path: '/base/models', name: '车型管理', component: './Base/Models' },
        { path: '/base/vins', name: 'VIN管理', component: './Base/VINs' },
        { path: '/base/vins/:id', name: 'VIN详情', component: './Base/VINDetail', hideInMenu: true },
        { path: '/base/dealers', name: '经销商管理', component: './Base/Dealers' },
      ],
    },
    {
      path: '*',
      layout: false,
      component: './404',
    },
  ],
  layout: {
    title: '汽车缺陷召回跟踪系统',
    locale: false,
    navTheme: 'dark',
    layout: 'mix',
    contentWidth: 'Fluid',
    fixedHeader: true,
    fixSiderbar: true,
    colorWeak: false,
    pwa: false,
    logo: '/logo.svg',
  },
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
    '/uploads': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
  publicPath: '/',
  outputPath: 'dist',
});
