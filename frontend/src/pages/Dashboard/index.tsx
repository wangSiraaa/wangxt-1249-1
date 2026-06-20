import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Tag, List, Progress, Empty } from 'antd';
import {
  AlertOutlined,
  WarningOutlined,
  BellOutlined,
  ToolOutlined,
  CarOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { commonApi, complaintApi, repairApi, notificationApi, statusConfig } from '@/services/api';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [defectStats, setDefectStats] = useState<any[]>([]);
  const [repairStats, setRepairStats] = useState<any[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [recentRepairs, setRecentRepairs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, defectData, repairData, complaintData, repairListData] =
        await Promise.all([
          commonApi.getDashboard(),
          complaintApi.statistics(),
          repairApi.statistics(),
          complaintApi.list({ page: 1, page_size: 5 }),
          repairApi.list({ page: 1, page_size: 5 }),
        ]);

      setStats(dashboardData);
      setDefectStats(defectData.by_defect_type || []);
      setRepairStats(repairData.by_status || []);
      setRecentComplaints(complaintData.list || []);
      setRecentRepairs(repairListData.list || []);
    } catch (error) {
      console.error('Load dashboard error:', error);
    }
  };

  const defectChartOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: defectStats.map((d) => d.defect_type),
      axisLabel: { rotate: 30 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: defectStats.map((d) => d.count),
        itemStyle: { color: '#1677ff' },
      },
    ],
  };

  const repairChartOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { show: true, formatter: '{b}: {c} ({d}%)' },
        data: repairStats.map((d) => ({
          value: d.count,
          name: statusConfig.repair[d.status as keyof typeof statusConfig.repair]?.text || d.status,
        })),
      },
    ],
  };

  if (!stats) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="投诉线索总数"
              value={stats.total_complaints}
              prefix={<AlertOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="召回范围确认中"
              value={stats.pending_recalls}
              prefix={<WarningOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="已发送车主通知"
              value={stats.sent_notifications}
              prefix={<BellOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="维修完成率"
              value={stats.repair_completion_rate}
              suffix="%"
              prefix={<ToolOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress
              percent={stats.repair_completion_rate}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card
            title={
              <span>
                <CarOutlined style={{ marginRight: 8 }} />
                涉及车型 TOP5
              </span>
            }
            size="small"
          >
            <List
              dataSource={stats.top_models || []}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Tag color="blue" key="tag">
                      {item.count} 条投诉
                    </Tag>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.brand + ' ' + item.model_name}
                    description={`${item.model_year}款 ${item.body_style}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title={
              <span>
                <AlertOutlined style={{ marginRight: 8 }} />
                缺陷类型分布
              </span>
            }
            size="small"
          >
            {defectStats.length > 0 ? (
              <ReactECharts option={defectChartOption} style={{ height: 280 }} />
            ) : (
              <Empty description="暂无数据" style={{ marginTop: 60 }} />
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title={
              <span>
                <ToolOutlined style={{ marginRight: 8 }} />
                维修状态分布
              </span>
            }
            size="small"
          >
            {repairStats.length > 0 ? (
              <ReactECharts option={repairChartOption} style={{ height: 280 }} />
            ) : (
              <Empty description="暂无数据" style={{ marginTop: 60 }} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title={
              <span>
                <AlertOutlined style={{ marginRight: 8 }} />
                最新投诉线索
              </span>
            }
            size="small"
            extra={<a href="#/complaints/list">查看全部</a>}
          >
            <List
              dataSource={recentComplaints}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 4,
                          background: '#e6f7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AlertOutlined style={{ color: '#1677ff' }} />
                      </div>
                    }
                    title={
                      <span>
                        {item.complaint_code}
                        <Tag
                          style={{ marginLeft: 8 }}
                          color={
                            statusConfig.complaint[
                              item.status as keyof typeof statusConfig.complaint
                            ]?.color
                          }
                        >
                          {
                            statusConfig.complaint[
                              item.status as keyof typeof statusConfig.complaint
                            ]?.text
                          }
                        </Tag>
                      </span>
                    }
                    description={
                      <div>
                        <div>
                          {item.brand} {item.model_name} · VIN: {item.vin}
                        </div>
                        <div style={{ color: '#8c8c8c', marginTop: 4, fontSize: 12 }}>
                          缺陷类型: {item.defect_type} ·{' '}
                          {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={
              <span>
                <ToolOutlined style={{ marginRight: 8 }} />
                最新维修记录
              </span>
            }
            size="small"
            extra={<a href="#/repairs/list">查看全部</a>}
          >
            <List
              dataSource={recentRepairs}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 4,
                          background: '#f6ffed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ToolOutlined style={{ color: '#52c41a' }} />
                      </div>
                    }
                    title={
                      <span>
                        {item.repair_code}
                        <Tag
                          style={{ marginLeft: 8 }}
                          color={
                            statusConfig.repair[
                              item.status as keyof typeof statusConfig.repair
                            ]?.color
                          }
                        >
                          {
                            statusConfig.repair[
                              item.status as keyof typeof statusConfig.repair
                            ]?.text
                          }
                        </Tag>
                      </span>
                    }
                    description={
                      <div>
                        <div>VIN: {item.vin}</div>
                        <div style={{ color: '#8c8c8c', marginTop: 4, fontSize: 12 }}>
                          经销商: {item.dealer_name} · 处理人: {item.handler_name}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
