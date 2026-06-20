import React from 'react';
import { Tag, Space } from 'antd';
import { statusConfig, RoleType } from '@/services/api';

interface StatusTagProps {
  type: keyof typeof statusConfig;
  status: number;
}

export const StatusTag: React.FC<StatusTagProps> = ({ type, status }) => {
  const config = statusConfig[type]?.[status as keyof (typeof statusConfig)[typeof type]];
  if (!config) return <Tag>{status}</Tag>;
  return <Tag color={config.color}>{config.text}</Tag>;
};

interface RoleTagProps {
  role: string;
}

const roleConfig: Record<string, { text: string; color: string }> = {
  [RoleType.ADMIN]: { text: '系统管理员', color: 'red' },
  [RoleType.QUALITY_ENGINEER]: { text: '质保工程师', color: 'blue' },
  [RoleType.REGULATION_OFFICER]: { text: '法规专员', color: 'purple' },
  [RoleType.DEALER]: { text: '经销商', color: 'green' },
};

export const RoleTag: React.FC<RoleTagProps> = ({ role }) => {
  const config = roleConfig[role] || { text: role, color: 'default' };
  return <Tag color={config.color}>{config.text}</Tag>;
};

export default { StatusTag, RoleTag };
