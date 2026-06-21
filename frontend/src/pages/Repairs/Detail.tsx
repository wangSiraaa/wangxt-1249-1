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
  Image,
  Divider,
  Modal,
  Alert,
  Empty,
  Dropdown,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CameraOutlined,
  AuditOutlined,
  UserOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  ScheduleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { history, useParams, useModel } from '@umijs/max';
import { repairApi, notificationApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag, RoleTag, AppointmentProgress } from '@/components/StatusTag';
import PhotoUpload from '@/components/PhotoUpload';
import dayjs from 'dayjs';

const { confirm } = Modal;

const RepairDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [notification, setNotification] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [oldPartPhotos, setOldPartPhotos] = useState<string[]>([]);
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const isDealer = userInfo?.role === RoleType.DEALER;
  const isQuality =
    userInfo?.role === RoleType.QUALITY_ENGINEER || userInfo?.role === RoleType.ADMIN;

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await repairApi.detail(Number(params.id));
      setData(data);
      setOldPartPhotos(data.old_part_photos || []);

      if (data.notification_id) {
        const notif = await notificationApi.detail(data.notification_id);
        setNotification(notif);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotosChange = (photos: string[]) => {
    setOldPartPhotos(photos);
  };

  const handleComplete = () => {
    if (oldPartPhotos.length === 0) {
      message.error('维修完成前必须上传旧件照片，请先上传旧件照片');
      return;
    }

    confirm({
      title: '确认完成维修',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要将此维修记录标记为"已完成"吗？</p>
          <p style={{ color: '#faad14' }}>
            系统将自动记录您 ({userInfo?.real_name || userInfo?.username}) 作为处理人，
            并且维修完成后旧件照片和处理人信息将永久保留。
          </p>
          {oldPartPhotos.length > 0 && (
            <Alert
              message={`已上传 ${oldPartPhotos.length} 张旧件照片`}
              type="success"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      ),
      okText: '确认完成',
      cancelText: '取消',
      onOk: async () => {
        try {
          await repairApi.complete(Number(params.id), {});
          message.success('维修完成，处理人信息已记录');
          loadData();
        } catch (error) {
          console.error('Complete repair error:', error);
        }
      },
    });
  };

  const handleQualityCheck = (result: number) => {
    confirm({
      title: result === 1 ? '质检通过' : '质检不通过',
      icon: <ExclamationCircleOutlined />,
      content: result === 1 ? '确定此维修记录质检通过吗？' : '确定标记为需返工吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await repairApi.qualityCheck(Number(params.id), {
            quality_result: result,
            quality_notes: result === 1 ? '质检通过' : '质检不通过，需返工',
          });
          message.success(result === 1 ? '质检通过' : '已标记为需返工');
          loadData();
        } catch (error) {
          console.error('Quality check error:', error);
        }
      },
    });
  };

  const handleAppointmentUpdate = (status: number) => {
    const statusNames: Record<number, string> = {
      0: '待联系',
      1: '已联系',
      2: '已预约',
      3: '到店未修',
    };

    confirm({
      title: `标记为"${statusNames[status]}"`,
      icon: <ExclamationCircleOutlined />,
      content: `确定将此维修记录的预约状态标记为"${statusNames[status]}"吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await repairApi.updateAppointment(Number(params.id), {
            appointment_status: status,
          });
          message.success(`已更新为"${statusNames[status]}"`);
          loadData();
        } catch (error) {
          console.error('Update appointment error:', error);
        }
      },
    });
  };

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ padding: '100px 0' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            维修记录详情
            <StatusTag type="repair" status={data.status} />
            {data.quality_result !== null && (
              <Tag color={data.quality_result === 1 ? 'success' : 'error'}>
                {data.quality_result === 1 ? '质检通过' : '需返工'}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {isDealer && data.status < 2 && (
              <>
                <Dropdown
                  menu={{
                    items: [
                      { key: '1', label: '标记为已联系' },
                      { key: '2', label: '标记为已预约' },
                      { key: '3', label: '标记为到店未修' },
                    ],
                    onClick: ({ key }) => handleAppointmentUpdate(Number(key)),
                  }}
                >
                  <Button icon={<ScheduleOutlined />}>
                    预约推进 <DownOutlined />
                  </Button>
                </Dropdown>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  disabled={oldPartPhotos.length === 0}
                  onClick={handleComplete}
                >
                  完成维修
                </Button>
              </>
            )}
            {isQuality && data.status === 2 && data.quality_result === null && (
              <>
                <Button
                  type="primary"
                  icon={<AuditOutlined />}
                  onClick={() => handleQualityCheck(1)}
                >
                  质检通过
                </Button>
                <Button
                  danger
                  icon={<AuditOutlined />}
                  onClick={() => handleQualityCheck(2)}
                >
                  需返工
                </Button>
              </>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/repairs/list')}>
              返回列表
            </Button>
          </Space>
        }
      >
        {isDealer && data.status < 2 && oldPartPhotos.length === 0 && (
          <Alert
            message="重要提醒"
            description="维修完成前必须上传旧件照片。请在下方上传区域上传旧件照片后再标记维修完成。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {data.status >= 2 && (
          <Alert
            message="维修已完成"
            description={
              <div>
                <p>处理人: <strong>{data.handler_name}</strong> (ID: {data.handler_id})</p>
                <p>完成时间: {dayjs(data.completed_at).format('YYYY-MM-DD HH:mm:ss')}</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="维修单号">{data.repair_code}</Descriptions.Item>
          <Descriptions.Item label="维修状态">
            <StatusTag type="repair" status={data.status} />
          </Descriptions.Item>
          <Descriptions.Item label="预约推进状态" span={2}>
            <AppointmentProgress status={data.appointment_status || 0} />
          </Descriptions.Item>
          <Descriptions.Item label="联系时间">
            {data.contact_time ? dayjs(data.contact_time).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="预约时间">
            {data.appointment_time ? dayjs(data.appointment_time).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="到店时间">
            {data.arrival_time ? dayjs(data.arrival_time).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="联系备注" span={2}>
            {data.contact_remark || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="关联通知">
            {notification ? (
              <a onClick={() => history.push(`/notifications/${notification.id}`)}>
                {notification.notification_code}
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
          <Descriptions.Item label="经销商">{data.dealer_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="维修类型">{data.repair_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="维修技师">{data.technician || '-'}</Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <UserOutlined style={{ color: '#1677ff' }} />
                处理人
              </Space>
            }
          >
            <Space>
              {data.handler_name || '-'}
              {data.handler_role && <RoleTag role={data.handler_role} />}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="开始日期">
            {data.start_date ? dayjs(data.start_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="预计完成日期">
            {data.estimated_completion_date
              ? dayjs(data.estimated_completion_date).format('YYYY-MM-DD')
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="实际完成日期">
            {data.completed_at ? dayjs(data.completed_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(data.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="维修描述" span={2}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {data.repair_description || '-'}
            </div>
          </Descriptions.Item>
          {data.notes && (
            <Descriptions.Item label="备注" span={2}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{data.notes}</div>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientation="left">
          <Space>
            <CameraOutlined />
            旧件照片
            {oldPartPhotos.length > 0 && <Tag color="green">{oldPartPhotos.length} 张</Tag>}
            {oldPartPhotos.length === 0 && data.status < 2 && (
              <Tag color="warning">请上传旧件照片</Tag>
            )}
          </Space>
        </Divider>

        {oldPartPhotos.length === 0 && data.status >= 2 && (
          <Empty description="无旧件照片" />
        )}

        {oldPartPhotos.length > 0 && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {oldPartPhotos.map((photo, index) => (
              <Col xs={12} sm={8} md={6} lg={4} key={index}>
                <Image
                  width="100%"
                  height={120}
                  src={photo}
                  style={{ borderRadius: 8, objectFit: 'cover' }}
                />
              </Col>
            ))}
          </Row>
        )}

        {isDealer && data.status < 2 && (
          <Card
            size="small"
            title={
              <Space>
                <UploadOutlined />
                上传旧件照片
              </Space>
            }
            extra={
              <Tag color="blue">最多上传9张 · 单张不超过5MB</Tag>
            }
          >
            <PhotoUpload
              repairId={data.id}
              value={oldPartPhotos}
              onChange={handlePhotosChange}
              maxCount={9}
            />
          </Card>
        )}

        {notification && (
          <>
            <Divider orientation="left">车主通知信息</Divider>
            <Card size="small" hoverable onClick={() => history.push(`/notifications/${notification.id}`)}>
              <Card.Meta
                title={
                  <Space>
                    {notification.notification_code}
                    <StatusTag type="notification" status={notification.status} />
                    <StatusTag type="ownerConfirm" status={notification.owner_confirm_status} />
                  </Space>
                }
                description={
                  <div>
                    <div>车主: {notification.owner_name} · 电话: {notification.owner_phone}</div>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      通知内容: {notification.content?.substring(0, 100)}...
                    </div>
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

export default RepairDetail;
