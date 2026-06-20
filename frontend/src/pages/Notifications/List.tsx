import React, { useEffect, useState, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, message, Modal, Alert, Row, Col, Statistic } from 'antd';
import {
  EyeOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { notificationApi, recallApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag } from '@/components/StatusTag';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const { confirm } = Modal;

const NotificationList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const canSend = userInfo?.role === RoleType.ADMIN || userInfo?.role === RoleType.REGULATION_OFFICER;
  const isDealer = userInfo?.role === RoleType.DEALER;

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const data = await notificationApi.statistics();
      setStatistics(data);
    } catch (error) {
      console.error('Load statistics error:', error);
    }
  };

  const handleSend = async (ids: number[]) => {
    confirm({
      title: '发送车主通知',
      icon: <ExclamationCircleOutlined />,
      content: `确定要发送选中的 ${ids.length} 条车主通知吗？发送后车主将收到短信通知。`,
      okText: '发送',
      cancelText: '取消',
      onOk: async () => {
        try {
          await notificationApi.send({ notification_ids: ids });
          message.success('发送成功');
          setSelectedRowKeys([]);
          actionRef.current?.reload();
          loadStatistics();
        } catch (error) {
          console.error('Send notifications error:', error);
        }
      },
    });
  };

  const handleConfirm = async (id: number, confirmStatus: number) => {
    try {
      await notificationApi.confirm(id, { owner_confirm_status: confirmStatus });
      message.success(confirmStatus === 1 ? '已确认维修' : '已拒绝');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Confirm error:', error);
    }
  };

  const statusChartOption = statistics?.by_status
    ? {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '45%'],
            label: { show: true, formatter: '{b}: {c}' },
            data: statistics.by_status.map((d: any) => ({
              value: d.count,
              name:
                statusConfig.notification[
                  d.status as keyof typeof statusConfig.notification
                ]?.text || d.status,
            })),
          },
        ],
      }
    : null;

  const columns: ProColumns<any>[] = [
    {
      title: '通知编号',
      dataIndex: 'notification_code',
      width: 140,
      render: (text: string, record: any) => (
        <a onClick={() => history.push(`/notifications/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '召回编号',
      dataIndex: 'recall_code',
      width: 140,
      render: (text, record) =>
        text ? (
          <a onClick={() => history.push(`/recalls/${record.recall_id}`)}>{text}</a>
        ) : (
          '-'
        ),
    },
    {
      title: 'VIN码',
      dataIndex: 'vin',
      width: 180,
      copyable: true,
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
      title: '通知方式',
      dataIndex: 'notify_method',
      width: 100,
      render: (v) => {
        const methodMap: Record<string, string> = {
          SMS: '短信',
          EMAIL: '邮件',
          POST: '邮寄',
          ALL: '全部',
        };
        return methodMap[v] || v;
      },
    },
    {
      title: '发送状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <StatusTag type="notification" status={v} />,
    },
    {
      title: '车主确认',
      dataIndex: 'owner_confirm_status',
      width: 100,
      render: (v) => <StatusTag type="ownerConfirm" status={v} />,
    },
    {
      title: '发送时间',
      dataIndex: 'sent_at',
      width: 160,
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/notifications/${record.id}`)}
          >
            详情
          </Button>
          {isDealer && record.owner_confirm_status === 0 && record.status === 1 && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleConfirm(record.id, 1)}
              >
                确认维修
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleConfirm(record.id, 2)}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {canSend && (
        <Alert
          message="VIN范围校验"
          description="生成通知时系统会自动校验VIN是否在召回范围内，不在范围内的VIN无法生成通知。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="通知总数"
                value={statistics.total || 0}
                prefix={<BellOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="待发送"
                value={statistics.by_status?.find((d: any) => d.status === 0)?.count || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="已发送"
                value={statistics.by_status?.find((d: any) => d.status === 1)?.count || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="车主已确认"
                value={statistics.by_owner_confirm?.find((d: any) => d.status === 1)?.count || 0}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="发送状态分布">
              {statusChartOption && (
                <ReactECharts option={statusChartOption} style={{ height: 160 }} />
              )}
            </Card>
          </Col>
        </Row>
      )}

      <ProTable
        headerTitle="车主通知列表"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as number[]),
        }}
        tableAlertRender={({ selectedRowKeys }) => (
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            {canSend && selectedRowKeys.length > 0 && (
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleSend(selectedRowKeys as number[])}
              >
                批量发送
              </Button>
            )}
          </Space>
        )}
        request={async (params) => {
          try {
            const res = await notificationApi.list({
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

export default NotificationList;
