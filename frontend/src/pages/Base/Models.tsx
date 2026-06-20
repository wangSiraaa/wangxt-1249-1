import React, { useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Space } from 'antd';
import { commonApi } from '@/services/api';
import dayjs from 'dayjs';

const ModelList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 120,
    },
    {
      title: '车型名称',
      dataIndex: 'model_name',
      width: 160,
    },
    {
      title: '车型代码',
      dataIndex: 'model_code',
      width: 140,
    },
    {
      title: '年款',
      dataIndex: 'model_year',
      width: 100,
    },
    {
      title: '车身形式',
      dataIndex: 'body_style',
      width: 120,
    },
    {
      title: '发动机',
      dataIndex: 'engine_type',
      width: 140,
    },
    {
      title: '变速箱',
      dataIndex: 'transmission',
      width: 120,
    },
    {
      title: '驱动方式',
      dataIndex: 'drive_type',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <ProTable
        headerTitle="车型管理"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        request={async (params) => {
          try {
            const res = await commonApi.getModels({
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
        scroll={{ x: 1400 }}
      />
    </div>
  );
};

export default ModelList;
