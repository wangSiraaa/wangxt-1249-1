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

interface AppointmentProgressProps {
  status: number;
}

export const AppointmentProgress: React.FC<AppointmentProgressProps> = ({ status }) => {
  const steps = [
    { key: 0, text: '待联系', color: 'default' },
    { key: 1, text: '已联系', color: 'blue' },
    { key: 2, text: '已预约', color: 'cyan' },
    { key: 3, text: '到店未修', color: 'purple' },
  ];

  return (
    <Space size={4}>
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <Tag color={status >= step.key ? step.color : 'default'} style={{ margin: 0 }}>
            {step.text}
          </Tag>
          {index < steps.length - 1 && (
            <div style={{ width: 16, height: 2, background: status > step.key ? '#1677ff' : '#e8e8e8' }} />
          )}
        </React.Fragment>
      ))}
    </Space>
  );
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
