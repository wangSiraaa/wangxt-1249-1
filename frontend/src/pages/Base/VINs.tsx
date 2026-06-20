import React, { useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Button, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { commonApi, statusConfig } from '@/services/api';
import { StatusTag } from '@/components/StatusTag';
import dayjs from 'dayjs';

const VINList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: 'VIN码',
      dataIndex: 'vin',
      width: 180,
      copyable: true,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 100,
    },
    {
      title: '车型',
      dataIndex: 'model_name',
      width: 140,
      render: (_, r) => `${r.model_name} ${r.model_year}`,
    },
    {
      title: '车主姓名',
      dataIndex: 'owner_name',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'owner_phone',
      width: 120,
    },
    {
      title: '购买日期',
      dataIndex: 'purchase_date',
      width: 120,
      render: (v) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '行驶里程',
      dataIndex: 'current_mileage',
      width: 100,
      render: (v) => (v ? `${v} km` : '-'),
    },
    {
      title: '车辆状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <StatusTag type="vin" status={v} />,
    },
    {
      title: '注册城市',
      dataIndex: 'register_city',
      width: 100,
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => history.push(`/base/vins/${record.id}`)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <ProTable
        headerTitle="VIN管理"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        request={async (params) => {
          try {
            const res = await commonApi.getVINs({
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
        scroll={{ x: 1500 }}
      />
    </div>
  );
};

export default VINList;
