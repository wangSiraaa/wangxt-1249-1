import React from 'react';
import { Avatar, Dropdown, MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useModel, history } from '@umijs/max';
import { authApi, UserInfo, RoleType } from '@/services/api';
import { message } from 'antd';

interface GlobalHeaderProps {
  userInfo?: UserInfo;
}

const roleNameMap: Record<string, string> = {
  [RoleType.ADMIN]: '系统管理员',
  [RoleType.QUALITY_ENGINEER]: '质保工程师',
  [RoleType.REGULATION_OFFICER]: '法规专员',
  [RoleType.DEALER]: '经销商',
};

const GlobalHeader: React.FC<GlobalHeaderProps> = () => {
  const { initialState, setInitialState } = useModel('@@initialState');

  const handleLogout = async () => {
    try {
      await authApi.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      setInitialState({ currentUser: null, settings: {} });
      message.success('退出登录成功');
      history.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const userInfo = initialState?.currentUser as UserInfo;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 24 }}>
      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
        {roleNameMap[userInfo?.role] || userInfo?.role}
      </span>
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1677ff' }}
          />
          <span style={{ color: '#fff', marginLeft: 8, fontSize: 14 }}>
            {userInfo?.real_name || userInfo?.username}
          </span>
        </div>
      </Dropdown>
    </div>
  );
};

export default GlobalHeader;
