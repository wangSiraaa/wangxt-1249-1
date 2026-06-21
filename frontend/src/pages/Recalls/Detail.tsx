import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Divider,
  message,
  Row,
  Col,
  Alert,
  Progress,
  Statistic,
  Modal,
  Tabs,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  BellOutlined,
  CarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { history, useParams, useModel } from '@umijs/max';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { recallApi, notificationApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag, AppointmentProgress } from '@/components/StatusTag';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const { confirm } = Modal;

const RecallDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const vinActionRef = useRef<ActionType>();
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const canEdit = userInfo?.role === RoleType.ADMIN || userInfo?.role === RoleType.REGULATION_OFFICER;

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await recallApi.detail(Number(params.id));
      setData(data);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (status: number) => {
    if (status === 2 && data.complaint_count < data.min_complaint_threshold) {
      message.error(
        `投诉样本不足，当前投诉样本数为 ${data.complaint_count}，最小阈值为 ${data.min_complaint_threshold}`,
      );
      return;
    }

    confirm({
      title: status === 2 ? '确认召回范围' : '驳回召回申请',
      icon: <ExclamationCircleOutlined />,
      content:
        status === 2
          ? `确认后，该召回范围将进入"已确认"状态，可以进行发布。当前投诉样本: ${data.complaint_count}/${data.min_complaint_threshold}`
          : '驳回后，该召回范围将被标记为"已驳回"，无法继续处理。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await recallApi.confirm(Number(params.id), { status });
          message.success(status === 2 ? '确认召回成功' : '已驳回');
          loadData();
        } catch (error) {
          console.error('Confirm error:', error);
        }
      },
    });
  };

  const handlePublish = () => {
    confirm({
      title: '发布召回',
      icon: <ExclamationCircleOutlined />,
      content:
        '发布后，系统将自动计算受影响的VIN列表，并且可以生成车主通知。发布后无法撤回，请确认是否继续？',
      okText: '发布',
      cancelText: '取消',
      onOk: async () => {
        try {
          await recallApi.publish(Number(params.id));
          message.success('发布成功');
          loadData();
          vinActionRef.current?.reload();
        } catch (error) {
          console.error('Publish error:', error);
        }
      },
    });
  };

  const handleGenerateNotifications = async () => {
    try {
      const res = await notificationApi.create({
        recall_id: data.id,
        vin_list: [],
      });
      message.success(`成功生成 ${res.count} 条车主通知`);
      loadData();
    } catch (error) {
      console.error('Generate notifications error:', error);
    }
  };

  const vinColumns: ProColumns<any>[] = [
    {
      title: 'VIN码',
      dataIndex: 'vin',
      width: 180,
      copyable: true,
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
      title: '是否在召回范围',
      dataIndex: 'is_in_scope',
      width: 120,
      render: (v) => (
        <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '车辆状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <StatusTag type="vin" status={v} />,
    },
  ];

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ padding: '100px 0' }}>加载中...</div>
      </div>
    );
  }

  const complaintPercent = Math.min(
    Math.round((data.complaint_count / data.min_complaint_threshold) * 100),
    100,
  );

  const appointmentChartOption = data.appointment_stats
    ? {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '45%'],
            label: { show: true, formatter: '{b}: {c} ({d}%)' },
            data: data.appointment_stats.map((d: any) => ({
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

  const repairStatusChartOption = data.repair_status_stats
    ? {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '45%'],
            label: { show: true, formatter: '{b}: {c} ({d}%)' },
            data: data.repair_status_stats.map((d: any) => ({
              value: d.count,
              name:
                statusConfig.repair[
                  d.repair_status as keyof typeof statusConfig.repair
                ]?.text || d.repair_status,
            })),
          },
        ],
      }
    : null;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            召回详情
            <StatusTag type="recall" status={data.status} />
          </Space>
        }
        extra={
          <Space>
            {canEdit && (
              <>
                {data.status === 1 && (
                  <>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      disabled={data.complaint_count < data.min_complaint_threshold}
                      onClick={() => handleConfirm(2)}
                    >
                      确认召回
                    </Button>
                    <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleConfirm(3)}
                    >
                      驳回
                    </Button>
                  </>
                )}
                {data.status === 2 && (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handlePublish}
                  >
                    发布召回
                  </Button>
                )}
                {data.status === 4 && data.notification_count === 0 && (
                  <Button
                    type="primary"
                    icon={<BellOutlined />}
                    onClick={handleGenerateNotifications}
                  >
                    生成车主通知
                  </Button>
                )}
                {data.status <= 1 && (
                  <Button
                    onClick={() => history.push(`/recalls/new?id=${data.id}`)}
                  >
                    编辑
                  </Button>
                )}
              </>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/recalls/list')}>
              返回列表
            </Button>
          </Space>
        }
      >
        {data.status === 1 && data.complaint_count < data.min_complaint_threshold && (
          <Alert
            message="投诉样本不足"
            description={`当前投诉样本数为 ${data.complaint_count}，最小阈值为 ${data.min_complaint_threshold}，请先收集足够的投诉样本后再确认召回。`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="基本信息" key="info">
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="投诉样本数"
                    value={data.complaint_count}
                    suffix={`/ ${data.min_complaint_threshold}`}
                    valueStyle={{
                      color:
                        data.complaint_count >= data.min_complaint_threshold
                          ? '#52c41a'
                          : '#faad14',
                    }}
                  />
                  <Progress
                    percent={complaintPercent}
                    size="small"
                    status={
                      data.complaint_count >= data.min_complaint_threshold
                        ? 'success'
                        : 'active'
                    }
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="涉及车辆数"
                    value={data.affected_vin_count || 0}
                    prefix={<CarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="已发通知"
                    value={data.notification_count || 0}
                    prefix={<BellOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="已完成维修"
                    value={data.repair_completed_count || 0}
                    suffix={`/ ${data.affected_vin_count || 0}`}
                  />
                </Card>
              </Col>
            </Row>

            {data.repair_count > 0 && (
              <>
                <Divider orientation="left">召回推进看板</Divider>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={12} md={4}>
                    <Card size="small">
                      <Statistic
                        title="维修登记数"
                        value={data.repair_count || 0}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={4}>
                    <Card size="small">
                      <Statistic
                        title="维修完成率"
                        value={data.repair_complete_rate || '0%'}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={4}>
                    <Card size="small">
                      <Statistic
                        title="待联系"
                        value={data.appointment_stats?.find((d: any) => d.appointment_status === 0)?.count || 0}
                        valueStyle={{ color: '#8c8c8c' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={4}>
                    <Card size="small">
                      <Statistic
                        title="已联系"
                        value={data.appointment_stats?.find((d: any) => d.appointment_status === 1)?.count || 0}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={4}>
                    <Card size="small">
                      <Statistic
                        title="已预约"
                        value={data.appointment_stats?.find((d: any) => d.appointment_status === 2)?.count || 0}
                        valueStyle={{ color: '#13c2c2' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={4}>
                    <Card size="small">
                      <Statistic
                        title="到店未修"
                        value={data.appointment_stats?.find((d: any) => d.appointment_status === 3)?.count || 0}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} md={12}>
                    <Card size="small" title="预约推进状态分布">
                      {appointmentChartOption && (
                        <ReactECharts option={appointmentChartOption} style={{ height: 200 }} />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" title="维修状态分布">
                      {repairStatusChartOption && (
                        <ReactECharts option={repairStatusChartOption} style={{ height: 200 }} />
                      )}
                    </Card>
                  </Col>
                </Row>
                {data.dealer_stats && data.dealer_stats.length > 0 && (
                  <Card size="small" title="各经销商推进情况" style={{ marginBottom: 16 }}>
                    <Row gutter={[16, 16]}>
                      {data.dealer_stats.map((dealer: any, index: number) => (
                        <Col xs={24} md={12} key={index}>
                          <div style={{ padding: 8, background: '#fafafa', borderRadius: 6 }}>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <div style={{ fontWeight: 'bold' }}>{dealer.dealer_name}</div>
                              <div>
                                维修登记: {dealer.total} | 已完成: {dealer.completed}
                              </div>
                              <Progress
                                percent={dealer.total > 0 ? Math.round((dealer.completed / dealer.total) * 100) : 0}
                                size="small"
                              />
                            </Space>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                )}
              </>
            )}

            <Descriptions bordered column={2} size="middle">
              <Descriptions.Item label="召回编号">{data.recall_code}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <StatusTag type="recall" status={data.status} />
              </Descriptions.Item>
              <Descriptions.Item label="品牌">{data.brand}</Descriptions.Item>
              <Descriptions.Item label="缺陷类型">{data.defect_type}</Descriptions.Item>
              <Descriptions.Item label="召回标题" span={2}>
                {data.title}
              </Descriptions.Item>
              <Descriptions.Item label="涉及车型" span={2}>
                <Space wrap>
                  {(data.affected_models || []).map((m: any, i: number) => (
                    <Tag key={i} color="blue">
                      {m.model_name} {m.model_year}款 ({m.body_style})
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="生产起始日期">
                {dayjs(data.start_date).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="生产截止日期">
                {dayjs(data.end_date).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="预计完成日期">
                {data.estimated_date ? dayjs(data.estimated_date).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(data.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="缺陷描述" span={2}>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {data.description}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="维修措施" span={2}>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {data.repair_measure}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>

          {data.status >= 4 && (
            <Tabs.TabPane tab="受影响VIN列表" key="vins">
              <ProTable
                actionRef={vinActionRef as any}
                rowKey="id"
                search={false}
                pagination={{ pageSize: 10 }}
                loading={vinLoading}
                request={async (params) => {
                  setVinLoading(true);
                  try {
                    const res = await recallApi.getAffectedVINs(Number(params.id), {
                      page: params.current,
                      page_size: params.pageSize,
                    });
                    return {
                      data: res.list,
                      success: true,
                      total: res.total,
                    };
                  } catch (error) {
                    return { data: [], success: false, total: 0 };
                  } finally {
                    setVinLoading(false);
                  }
                }}
                columns={vinColumns}
                scroll={{ x: 1000 }}
              />
            </Tabs.TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  );
};

export default RecallDetail;
