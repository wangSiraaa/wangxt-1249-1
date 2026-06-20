import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Divider,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { history, useParams, useModel } from '@umijs/max';
import { notificationApi, repairApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag } from '@/components/StatusTag';
import dayjs from 'dayjs';

const { confirm } = Modal;

const NotificationDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [repairRecord, setRepairRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const canSend = userInfo?.role === RoleType.ADMIN || userInfo?.role === RoleType.REGULATION_OFFICER;
  const isDealer = userInfo?.role === RoleType.DEALER;

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.detail(Number(params.id));
      setData(data);

      if (data.repair_id) {
        const repair = await repairApi.detail(data.repair_id);
        setRepairRecord(repair);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    confirm({
      title: '发送车主通知',
      icon: <ExclamationCircleOutlined />,
      content: `确定要向车主 ${data.owner_name} 发送召回通知吗？`,
      okText: '发送',
      cancelText: '取消',
      onOk: async () => {
        try {
          await notificationApi.send({ notification_ids: [Number(params.id)] });
          message.success('发送成功');
          loadData();
        } catch (error) {
          console.error('Send error:', error);
        }
      },
    });
  };

  const handleConfirm = async (confirmStatus: number) => {
    try {
      await notificationApi.confirm(Number(params.id), { owner_confirm_status: confirmStatus });
      message.success(confirmStatus === 1 ? '已确认维修' : '已拒绝');
      loadData();
    } catch (error) {
      console.error('Confirm error:', error);
    }
  };

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ padding: '100px 0' }}>加载中...</div>
      </div>
    );
  }

  const methodMap: Record<string, string> = {
    SMS: '短信',
    EMAIL: '邮件',
    POST: '邮寄',
    ALL: '全部',
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            车主通知详情
            <StatusTag type="notification" status={data.status} />
          </Space>
        }
        extra={
          <Space>
            {canSend && data.status === 0 && (
              <Button type="primary" icon={<SendOutlined />} onClick={handleSend}>
                发送通知
              </Button>
            )}
            {isDealer && data.owner_confirm_status === 0 && data.status === 1 && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleConfirm(1)}
                >
                  确认维修
                </Button>
                <Button danger icon={<CloseCircleOutlined />} onClick={() => handleConfirm(2)}>
                  拒绝
                </Button>
              </>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/notifications/list')}>
              返回列表
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="通知编号" value={data.notification_code} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="发送状态"
                value={
                  statusConfig.notification[
                    data.status as keyof typeof statusConfig.notification
                  ]?.text
                }
                prefix={<SendOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="车主确认"
                value={
                  statusConfig.ownerConfirm[
                    data.owner_confirm_status as keyof typeof statusConfig.ownerConfirm
                  ]?.text
                }
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="通知方式"
                value={methodMap[data.notify_method] || data.notify_method}
              />
            </Card>
          </Col>
        </Row>

        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="召回编号">
            {data.recall_code ? (
              <a onClick={() => history.push(`/recalls/${data.recall_id}`)}>
                {data.recall_code}
              </a>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="VIN码" copyable>
            {data.vin}
          </Descriptions.Item>
          <Descriptions.Item label="品牌">{data.brand || '-'}</Descriptions.Item>
          <Descriptions.Item label="车型">
            {data.model_name ? `${data.model_name} ${data.model_year}款` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="车主姓名">{data.owner_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{data.owner_phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="车主邮箱">{data.owner_email || '-'}</Descriptions.Item>
          <Descriptions.Item label="车主地址">{data.owner_address || '-'}</Descriptions.Item>
          <Descriptions.Item label="通知内容" span={2}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, background: '#fafafa', padding: 12, borderRadius: 8 }}>
              {data.content}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="发送时间">
            {data.sent_at ? dayjs(data.sent_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="车主确认时间">
            {data.owner_confirm_at
              ? dayjs(data.owner_confirm_at).format('YYYY-MM-DD HH:mm:ss')
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(data.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="失败原因" span={2}>
            {data.fail_reason || '-'}
          </Descriptions.Item>
        </Descriptions>

        {repairRecord && (
          <>
            <Divider orientation="left">关联维修记录</Divider>
            <Card
              size="small"
              hoverable
              onClick={() => history.push(`/repairs/${repairRecord.id}`)}
            >
              <Card.Meta
                avatar={
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: '#e6f7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ToolOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                  </div>
                }
                title={
                  <Space>
                    {repairRecord.repair_code}
                    <StatusTag type="repair" status={repairRecord.status} />
                  </Space>
                }
                description={
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      经销商: {repairRecord.dealer_name} · 处理人: {repairRecord.handler_name}
                    </div>
                    {repairRecord.completed_at && (
                      <div style={{ color: '#8c8c8c' }}>
                        完成时间: {dayjs(repairRecord.completed_at).format('YYYY-MM-DD HH:mm')}
                      </div>
                    )}
                  </div>
                }
              />
            </Card>
          </>
        )}
      </Card>
    </div>
  );
};

export default NotificationDetail;
