import React, { useEffect, useState, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, message, Select, Input } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { complaintApi, commonApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag, RoleTag } from '@/components/StatusTag';
import dayjs from 'dayjs';

const ComplaintList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [brands, setBrands] = useState<string[]>([]);
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const canEdit = userInfo?.role === RoleType.ADMIN || userInfo?.role === RoleType.QUALITY_ENGINEER;

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const data = await commonApi.getBrands();
      setBrands(data || []);
    } catch (error) {
      console.error('Load brands error:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await complaintApi.delete(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete complaint error:', error);
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '投诉编号',
      dataIndex: 'complaint_code',
      width: 140,
      render: (text: string, record: any) => (
        <a onClick={() => history.push(`/complaints/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 100,
      filters: brands.map((b) => ({ text: b, value: b })),
    },
    {
      title: '车型',
      dataIndex: 'model_name',
      width: 140,
      render: (text, record) => `${text} ${record.model_year || ''}`,
    },
    {
      title: 'VIN码',
      dataIndex: 'vin',
      width: 180,
      copyable: true,
    },
    {
      title: '缺陷类型',
      dataIndex: 'defect_type',
      width: 140,
      valueType: 'select',
      valueEnum: {
        制动系统: { text: '制动系统' },
        动力系统: { text: '动力系统' },
        转向系统: { text: '转向系统' },
        电气系统: { text: '电气系统' },
        底盘系统: { text: '底盘系统' },
        车身系统: { text: '车身系统' },
        其他: { text: '其他' },
      },
    },
    {
      title: '故障描述',
      dataIndex: 'description',
      ellipsis: true,
      width: 200,
    },
    {
      title: '里程数',
      dataIndex: 'mileage',
      width: 100,
      render: (v) => (v ? `${v} km` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <StatusTag type="complaint" status={v} />,
    },
    {
      title: '录入工程师',
      dataIndex: 'engineer_name',
      width: 120,
      render: (text, record) => (
        <Space>
          {text || '-'}
          {record.engineer_role && <RoleTag role={record.engineer_role} />}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      valueType: 'dateTime',
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/complaints/${record.id}`)}
          >
            详情
          </Button>
          {canEdit && record.status === 0 && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => history.push(`/complaints/new?id=${record.id}`)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除该投诉线索？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <ProTable
        headerTitle="投诉线索列表"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        toolBarRender={() => [
          canEdit && (
            <Button
              type="primary"
              key="new"
              icon={<PlusOutlined />}
              onClick={() => history.push('/complaints/new')}
            >
              新增投诉
            </Button>
          ),
        ]}
        request={async (params, sort, filter) => {
          try {
            const res = await complaintApi.list({
              page: params.current,
              page_size: params.pageSize,
              ...params,
              ...filter,
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
        scroll={{ x: 1400 }}
      />
    </div>
  );
};

export default ComplaintList;
