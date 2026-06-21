import React, { useEffect, useState, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Space,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Alert,
  Image,
  Tooltip,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CameraOutlined,
  AuditOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { repairApi, notificationApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag, RoleTag, AppointmentProgress } from '@/components/StatusTag';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const RepairList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [statistics, setStatistics] = useState<any>(null);
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const isDealer = userInfo?.role === RoleType.DEALER;
  const isQuality = userInfo?.role === RoleType.QUALITY_ENGINEER || userInfo?.role === RoleType.ADMIN;

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const data = await repairApi.statistics();
      setStatistics(data);
    } catch (error) {
      console.error('Load statistics error:', error);
    }
  };

  const handleComplete = async (id: number, record: any) => {
    if (record.old_part_photos?.length === 0) {
      message.error('维修完成前必须上传旧件照片，请先上传旧件照片');
      return;
    }

    try {
      await repairApi.complete(id, {});
      message.success('维修完成');
      actionRef.current?.reload();
      loadStatistics();
    } catch (error) {
      console.error('Complete repair error:', error);
    }
  };

  const handleQualityCheck = async (id: number, result: number) => {
    try {
      await repairApi.qualityCheck(id, {
        quality_result: result,
        quality_notes: result === 1 ? '质检通过' : '质检不通过，需返工',
      });
      message.success(result === 1 ? '质检通过' : '已标记为需返工');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Quality check error:', error);
    }
  };

  const appointmentChartOption = statistics?.by_appointment
    ? {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '45%'],
            label: { show: true, formatter: '{b}: {c} ({d}%)' },
            data: statistics.by_appointment.map((d: any) => ({
              value: d.count,
              name:
                statusConfig.appointment[
                  d.appointment_status as keyof typeof statusConfig.appointment
                ]?.text || d.appointment_status,
            })),
          },
        ],
      }
    : null;

  const repairChartOption = statistics?.by_status
    ? {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '45%'],
            label: { show: true, formatter: '{b}: {c} ({d}%)' },
            data: statistics.by_status.map((d: any) => ({
              value: d.count,
              name:
                statusConfig.repair[
                  d.status as keyof typeof statusConfig.repair
                ]?.text || d.status,
            })),
          },
        ],
      }
    : null;

  const columns: ProColumns<any>[] = [
    {
      title: '维修单号',
      dataIndex: 'repair_code',
      width: 140,
      render: (text: string, record: any) => (
        <a onClick={() => history.push(`/repairs/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '关联通知',
      dataIndex: 'notification_code',
      width: 140,
      render: (text, record) =>
        text ? (
          <a onClick={() => history.push(`/notifications/${record.notification_id}`)}>
            {text}
          </a>
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
      title: '品牌车型',
      dataIndex: 'model_name',
      width: 160,
      render: (_, r) => `${r.brand || ''} ${r.model_name || ''}`,
    },
    {
      title: '经销商',
      dataIndex: 'dealer_name',
      width: 140,
      hideInSearch: !isDealer,
    },
    {
      title: '处理人',
      dataIndex: 'handler_name',
      width: 120,
      render: (text, record) => (
        <Space>
          <UserOutlined style={{ color: '#1677ff' }} />
          {text || '-'}
        </Space>
      ),
    },
    {
      title: '旧件照片',
      dataIndex: 'old_part_photos',
      width: 120,
      render: (photos: string[]) => {
        if (!photos || photos.length === 0) {
          return <Tag color="warning">未上传</Tag>;
        }
        return (
          <Tooltip title={`已上传 ${photos.length} 张照片`}>
            <Space>
              <Image
                width={40}
                height={40}
                src={photos[0]}
                style={{ borderRadius: 4 }}
              />
              <Tag color="green">{photos.length}张</Tag>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '维修状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <StatusTag type="repair" status={v} />,
    },
    {
      title: '预约推进状态',
      dataIndex: 'appointment_status',
      width: 200,
      render: (v) => <StatusTag type="appointment" status={v || 0} />,
    },
    {
      title: '质检状态',
      dataIndex: 'quality_result',
      width: 100,
      render: (v) => {
        if (v === undefined || v === null) return <Tag>待质检</Tag>;
        return (
          <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '通过' : '不通过'}</Tag>
        );
      },
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
            onClick={() => history.push(`/repairs/${record.id}`)}
          >
            详情
          </Button>
          {isDealer && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CameraOutlined />}
                onClick={() => history.push(`/repairs/${record.id}`)}
              >
                上传照片
              </Button>
              {record.status < 2 && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  disabled={record.old_part_photos?.length === 0}
                  onClick={() => handleComplete(record.id, record)}
                >
                  完成维修
                </Button>
              )}
            </>
          )}
          {isQuality && record.status === 2 && record.quality_result === null && (
            <Space direction="vertical" size={0}>
              <Button
                type="link"
                size="small"
                icon={<AuditOutlined />}
                onClick={() => handleQualityCheck(record.id, 1)}
              >
                质检通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<AuditOutlined />}
                onClick={() => handleQualityCheck(record.id, 2)}
              >
                需返工
              </Button>
            </Space>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {isDealer && (
        <Alert
          message="重要提示"
          description="维修完成前必须上传旧件照片，系统会自动记录处理人信息。没有上传旧件照片的维修记录无法标记为完成。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic title="维修总数" value={statistics.total || 0} />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="待维修"
                value={statistics.by_status?.find((d: any) => d.status === 0)?.count || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="维修中"
                value={statistics.by_status?.find((d: any) => d.status === 1)?.count || 0}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="已完成"
                value={statistics.by_status?.find((d: any) => d.status === 2)?.count || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="维修状态分布">
              {repairChartOption && (
                <ReactECharts option={repairChartOption} style={{ height: 160 }} />
              )}
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="待联系"
                value={statistics.by_appointment?.find((d: any) => d.appointment_status === 0)?.count || 0}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="已联系"
                value={statistics.by_appointment?.find((d: any) => d.appointment_status === 1)?.count || 0}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="已预约"
                value={statistics.by_appointment?.find((d: any) => d.appointment_status === 2)?.count || 0}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title="到店未修"
                value={statistics.by_appointment?.find((d: any) => d.appointment_status === 3)?.count || 0}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="预约状态分布">
              {appointmentChartOption && (
                <ReactECharts option={appointmentChartOption} style={{ height: 160 }} />
              )}
            </Card>
          </Col>
        </Row>
      )}

      <ProTable
        headerTitle="维修记录列表"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        toolBarRender={() => [
          isDealer && (
            <Button
              type="primary"
              key="new"
              icon={<PlusOutlined />}
              onClick={() => history.push('/repairs/new')}
            >
              新建维修
            </Button>
          ),
        ]}
        request={async (params) => {
          try {
            const res = await repairApi.list({
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
        scroll={{ x: 1700 }}
      />
    </div>
  );
};

export default RepairList;
