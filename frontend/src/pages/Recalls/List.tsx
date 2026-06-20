import React, { useEffect, useState, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, message, Progress, Alert } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { recallApi, commonApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag, RoleTag } from '@/components/StatusTag';
import dayjs from 'dayjs';

const RecallList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const canEdit = userInfo?.role === RoleType.ADMIN || userInfo?.role === RoleType.REGULATION_OFFICER;

  const handleConfirm = async (id: number, status: number) => {
    try {
      await recallApi.confirm(id, { status });
      message.success(status === 2 ? '确认召回成功' : '已驳回');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Confirm recall error:', error);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await recallApi.publish(id);
      message.success('发布成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Publish recall error:', error);
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '召回编号',
      dataIndex: 'recall_code',
      width: 140,
      render: (text: string, record: any) => (
        <a onClick={() => history.push(`/recalls/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '召回标题',
      dataIndex: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 100,
    },
    {
      title: '涉及车型',
      dataIndex: 'model_names',
      width: 200,
      render: (_, record) => (
        <Space wrap>
          {(record.affected_models || []).map((m: any, i: number) => (
            <Tag key={i} color="blue">
              {m.model_name} {m.model_year}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '投诉样本',
      dataIndex: 'complaint_count',
      width: 120,
      render: (v: number, record) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Space>
            <span style={{ fontWeight: 600, color: v >= record.min_complaint_threshold ? '#52c41a' : '#faad14' }}>
              {v}
            </span>
            <span style={{ color: '#8c8c8c' }}>/ {record.min_complaint_threshold}</span>
          </Space>
          <Progress
            percent={Math.min(Math.round((v / record.min_complaint_threshold) * 100), 100)}
            size="small"
            status={v >= record.min_complaint_threshold ? 'success' : 'active'}
          />
        </Space>
      ),
    },
    {
      title: '缺陷类型',
      dataIndex: 'defect_type',
      width: 120,
    },
    {
      title: '涉及车辆数',
      dataIndex: 'affected_vin_count',
      width: 100,
      render: (v) => <span style={{ fontWeight: 600 }}>{v || 0}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <StatusTag type="recall" status={v} />,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/recalls/${record.id}`)}
          >
            详情
          </Button>
          {canEdit && (
            <>
              {record.status === 1 && (
                <>
                  <Button
                    type="link"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    disabled={record.complaint_count < record.min_complaint_threshold}
                    onClick={() => handleConfirm(record.id, 2)}
                  >
                    确认召回
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleConfirm(record.id, 3)}
                  >
                    驳回
                  </Button>
                </>
              )}
              {record.status === 2 && (
                <Button
                  type="link"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => handlePublish(record.id)}
                >
                  发布
                </Button>
              )}
              {record.status <= 1 && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => history.push(`/recalls/new?id=${record.id}`)}
                >
                  编辑
                </Button>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {canEdit && (
        <Alert
          message="业务规则"
          description="投诉样本数必须达到最小阈值才能确认召回；确认后可以发布，发布后才能生成车主通知。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <ProTable
        headerTitle="召回范围列表"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        toolBarRender={() => [
          canEdit && (
            <Button
              type="primary"
              key="new"
              icon={<PlusOutlined />}
              onClick={() => history.push('/recalls/new')}
            >
              新建召回
            </Button>
          ),
        ]}
        request={async (params) => {
          try {
            const res = await recallApi.list({
              page: params.current,
              page_size: params.pageSize,
              ...params,
            });
            return {
              data: res.list,
              success: true,
              total: res.total,
            };
          } catch (error) {
            return { data: [], success: false, total: 0 };
          }
        }}
        columns={columns}
        scroll={{ x: 1600 }}
      />
    </div>
  );
};

export default RecallList;
