import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Space, Tag, Divider, message, Row, Col } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { history, useParams, useModel } from '@umijs/max';
import { complaintApi, recallApi, statusConfig, RoleType } from '@/services/api';
import { StatusTag, RoleTag } from '@/components/StatusTag';
import dayjs from 'dayjs';

const ComplaintDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [relatedRecalls, setRelatedRecalls] = useState<any[]>([]);
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;
  const canReview =
    userInfo?.role === RoleType.ADMIN || userInfo?.role === RoleType.QUALITY_ENGINEER;

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [detail, recalls] = await Promise.all([
        complaintApi.detail(Number(params.id)),
        recallApi.list({ vin: detail?.vin, page_size: 50 }),
      ]);
      setData(detail);
      setRelatedRecalls(recalls.list || []);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: number) => {
    try {
      await complaintApi.update(Number(params.id), { status });
      message.success(status === 1 ? '审核通过' : '已驳回');
      loadData();
    } catch (error) {
      console.error('Review error:', error);
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
            投诉线索详情
            <StatusTag type="complaint" status={data.status} />
          </Space>
        }
        extra={
          <Space>
            {canReview && data.status === 0 && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleReview(1)}
                >
                  确认有效
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleReview(2)}
                >
                  驳回
                </Button>
              </>
            )}
            {canReview && data.status === 0 && (
              <Button
                icon={<EditOutlined />}
                onClick={() => history.push(`/complaints/new?id=${data.id}`)}
              >
                编辑
              </Button>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/complaints/list')}>
              返回列表
            </Button>
          </Space>
        }
      >
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="投诉编号">{data.complaint_code}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag type="complaint" status={data.status} />
          </Descriptions.Item>
          <Descriptions.Item label="品牌">{data.brand}</Descriptions.Item>
          <Descriptions.Item label="车型">
            {data.model_name} {data.model_year}款 ({data.body_style})
          </Descriptions.Item>
          <Descriptions.Item label="VIN码" copyable>
            {data.vin}
          </Descriptions.Item>
          <Descriptions.Item label="缺陷类型">{data.defect_type}</Descriptions.Item>
          <Descriptions.Item label="故障发生日期">
            {dayjs(data.occurrence_date).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="行驶里程">
            {data.mileage ? `${data.mileage} km` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="车主姓名">{data.owner_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="车主电话">{data.owner_phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="录入工程师">
            <Space>
              {data.engineer_name || '-'}
              {data.engineer_role && <RoleTag role={data.engineer_role} />}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="录入时间">
            {dayjs(data.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="故障描述" span={2}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{data.description}</div>
          </Descriptions.Item>
          {data.engineer_notes && (
            <Descriptions.Item label="工程师备注" span={2}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {data.engineer_notes}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>

        {relatedRecalls.length > 0 && (
          <>
            <Divider orientation="left">关联召回</Divider>
            <Row gutter={[16, 16]}>
              {relatedRecalls.map((recall) => (
                <Col xs={24} md={12} key={recall.id}>
                  <Card size="small" hoverable>
                    <Card.Meta
                      title={
                        <a onClick={() => history.push(`/recalls/${recall.id}`)}>
                          {recall.recall_code}
                        </a>
                      }
                      description={
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                          <div>{recall.title}</div>
                          <Space>
                            <StatusTag type="recall" status={recall.status} />
                            <Tag color="blue">投诉样本: {recall.complaint_count}</Tag>
                          </Space>
                        </Space>
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

export default ComplaintDetail;
