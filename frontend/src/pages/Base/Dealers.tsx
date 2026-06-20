import React, { useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Space } from 'antd';
import { commonApi } from '@/services/api';
import dayjs from 'dayjs';

const DealerList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '经销商编码',
      dataIndex: 'dealer_code',
      width: 140,
    },
    {
      title: '经销商名称',
      dataIndex: 'dealer_name',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 100,
    },
    {
      title: '所在城市',
      dataIndex: 'city',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 130,
    },
    {
      title: '联系邮箱',
      dataIndex: 'email',
      width: 180,
    },
    {
      title: '负责人',
      dataIndex: 'contact_person',
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
        headerTitle="经销商管理"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        request={async (params) => {
          try {
            const res = await commonApi.getDealers({
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

export default DealerList;
