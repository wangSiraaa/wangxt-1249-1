import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Space, Divider, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, CarOutlined, AlertOutlined, ToolOutlined } from '@ant-design/icons';
import { history, useParams } from '@umijs/max';
import { commonApi, complaintApi, repairApi, statusConfig } from '@/services/api';
import { StatusTag } from '@/components/StatusTag';
import dayjs from 'dayjs';

const VINDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  const loadData = async () => {
    try {
      const [detail, complaintData, repairData] = await Promise.all([
        commonApi.getVINDetail(Number(params.id)),
        complaintApi.list({ vin: detail?.vin, page_size: 50 }),
        repairApi.list({ vin: detail?.vin, page_size: 50 }),
      ]);
      setData(detail);
      setComplaints(complaintData.list || []);
      setRepairs(repairData.list || []);
    } catch (error) {
      console.error('Load data error:', error);
    }
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
            <CarOutlined />
            VIN详情
            <StatusTag type="vin" status={data.status} />
          </Space>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/base/vins')}>
            返回列表
          </Button>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="投诉记录" value={complaints.length} prefix={<AlertOutlined />} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="维修记录" value={repairs.length} prefix={<ToolOutlined />} />
            </Card>
          </Col>
        </Row>

        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="VIN码" copyable>
            {data.vin}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag type="vin" status={data.status} />
          </Descriptions.Item>
          <Descriptions.Item label="品牌">{data.brand}</Descriptions.Item>
          <Descriptions.Item label="车型">
            {data.model_name} {data.model_year}款
          </Descriptions.Item>
          <Descriptions.Item label="车身形式">{data.body_style}</Descriptions.Item>
          <Descriptions.Item label="发动机">{data.engine_type}</Descriptions.Item>
          <Descriptions.Item label="变速箱">{data.transmission}</Descriptions.Item>
          <Descriptions.Item label="驱动方式">{data.drive_type}</Descriptions.Item>
          <Descriptions.Item label="生产日期">
            {dayjs(data.production_date).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="购买日期">
            {data.purchase_date ? dayjs(data.purchase_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="车主姓名">{data.owner_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{data.owner_phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="车主邮箱">{data.owner_email || '-'}</Descriptions.Item>
          <Descriptions.Item label="注册城市">{data.register_city || '-'}</Descriptions.Item>
          <Descriptions.Item label="当前里程">
            {data.current_mileage ? `${data.current_mileage} km` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="车辆地址">{data.owner_address || '-'}</Descriptions.Item>
        </Descriptions>

        {complaints.length > 0 && (
          <>
            <Divider orientation="left">投诉记录</Divider>
            <Row gutter={[16, 16]}>
              {complaints.map((c) => (
                <Col xs={24} md={12} key={c.id}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => history.push(`/complaints/${c.id}`)}
                  >
                    <Card.Meta
                      title={
                        <Space>
                          {c.complaint_code}
                          <StatusTag type="complaint" status={c.status} />
                        </Space>
                      }
                      description={
                        <div>
                          <div>缺陷类型: {c.defect_type}</div>
                          <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                            {dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}

        {repairs.length > 0 && (
          <>
            <Divider orientation="left">维修记录</Divider>
            <Row gutter={[16, 16]}>
              {repairs.map((r) => (
                <Col xs={24} md={12} key={r.id}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => history.push(`/repairs/${r.id}`)}
                  >
                    <Card.Meta
                      title={
                        <Space>
                          {r.repair_code}
                          <StatusTag type="repair" status={r.status} />
                        </Space>
                      }
                      description={
                        <div>
                          <div>经销商: {r.dealer_name}</div>
                          <div>处理人: {r.handler_name}</div>
                          <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                            {r.completed_at
                              ? `完成于 ${dayjs(r.completed_at).format('YYYY-MM-DD')}`
                              : `创建于 ${dayjs(r.created_at).format('YYYY-MM-DD')}`}
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Card>
    </div>
  );
};

export default VINDetail;
