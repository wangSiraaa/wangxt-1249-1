import React, { useEffect, useState } from 'react';
import {
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormDatePicker,
} from '@ant-design/pro-components';
import { Card, Button, Space, message, Row, Col, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, WarningOutlined } from '@ant-design/icons';
import { history, useSearchParams, useModel } from '@umijs/max';
import { repairApi, notificationApi, commonApi } from '@/services/api';
import dayjs from 'dayjs';

const RepairForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form] = ProForm.useForm();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.currentUser as any;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationApi.list({
        owner_confirm_status: 1,
        has_repair: false,
        page_size: 100,
      });
      const dealerNotifications = userInfo?.dealer_id
        ? res.list.filter((n: any) => n.dealer_id === userInfo.dealer_id)
        : res.list;
      setNotifications(dealerNotifications || []);
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const submitData = {
        ...values,
        notification_id: Number(values.notification_id),
        start_date: values.start_date?.format('YYYY-MM-DD'),
        estimated_completion_date: values.estimated_completion_date?.format('YYYY-MM-DD'),
      };

      await repairApi.create(submitData);
      message.success('创建成功');
      history.push('/repairs/list');
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (value: string) => {
    const notification = notifications.find((n) => n.id.toString() === value);
    setSelectedNotification(notification);
    if (notification) {
      form.setFieldsValue({
        vin: notification.vin,
        brand: notification.brand,
        model_name: notification.model_name,
        model_year: notification.model_year,
        owner_name: notification.owner_name,
        owner_phone: notification.owner_phone,
      });
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="新建维修记录"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/repairs/list')}>
            返回列表
          </Button>
        }
      >
        <Alert
          message="重要提醒"
          description="维修完成前必须上传旧件照片，系统会自动从当前登录账号获取处理人信息。维修完成后旧件照片和处理人信息将永久保留。"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
        />

        <ProForm
          form={form}
          layout="horizontal"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          onFinish={onFinish}
          initialValues={{ status: 1 }}
          submitter={{
            render: (_, dom) => (
              <Space style={{ justifyContent: 'center', display: 'flex' }}>
                {dom}
              </Space>
            ),
            submitButtonProps: {
              loading,
              icon: <SaveOutlined />,
              children: '创建维修记录',
            },
            resetButtonProps: {
              onClick: () => history.push('/repairs/list'),
              children: '取消',
            },
          }}
        >
          <ProFormSelect
            name="notification_id"
            label="关联通知"
            rules={[{ required: true, message: '请选择关联的车主通知' }]}
            options={notifications.map((n) => ({
              label: `${n.notification_code} - ${n.vin} - ${n.owner_name}`,
              value: n.id.toString(),
            }))}
            placeholder="请选择已确认维修的车主通知"
            onChange={handleNotificationChange}
            fieldProps={{ showSearch: true }}
          />

          {selectedNotification && (
            <Card
              size="small"
              style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}
              title="车辆与车主信息"
            >
              <Row gutter={24}>
                <Col span={8}>
                  <strong>VIN码:</strong> {selectedNotification.vin}
                </Col>
                <Col span={8}>
                  <strong>品牌车型:</strong> {selectedNotification.brand}{' '}
                  {selectedNotification.model_name} {selectedNotification.model_year}款
                </Col>
                <Col span={8}>
                  <strong>车主:</strong> {selectedNotification.owner_name}
                </Col>
                <Col span={8}>
                  <strong>联系电话:</strong> {selectedNotification.owner_phone}
                </Col>
                <Col span={16}>
                  <strong>联系地址:</strong> {selectedNotification.owner_address || '-'}
                </Col>
              </Row>
            </Card>
          )}

          <Row gutter={24}>
            <Col span={8}>
              <ProFormText name="vin" label="VIN码" disabled />
            </Col>
            <Col span={8}>
              <ProFormText name="brand" label="品牌" disabled />
            </Col>
            <Col span={8}>
              <ProFormText name="model_name" label="车型" disabled />
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <ProFormSelect
                name="status"
                label="维修状态"
                rules={[{ required: true, message: '请选择维修状态' }]}
                options={[
                  { label: '待维修', value: 0 },
                  { label: '维修中', value: 1 },
                ]}
              />
            </Col>
            <Col span={12}>
              <ProFormSelect
                name="repair_type"
                label="维修类型"
                rules={[{ required: true, message: '请选择维修类型' }]}
                options={[
                  { label: '零件更换', value: '零件更换' },
                  { label: '软件升级', value: '软件升级' },
                  { label: '机械修复', value: '机械修复' },
                  { label: '其他', value: '其他' },
                ]}
              />
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={8}>
              <ProFormDatePicker
                name="start_date"
                label="维修开始日期"
                rules={[{ required: true, message: '请选择维修开始日期' }]}
                initialValue={dayjs()}
              />
            </Col>
            <Col span={8}>
              <ProFormDatePicker
                name="estimated_completion_date"
                label="预计完成日期"
                placeholder="请选择预计完成日期"
              />
            </Col>
            <Col span={8}>
              <ProFormSelect
                name="technician"
                label="维修技师"
                placeholder="请选择维修技师"
              >
                {/* 技师列表可以通过API获取 */}
              </ProFormSelect>
            </Col>
          </Row>

          <ProFormTextArea
            name="repair_description"
            label="维修描述"
            rules={[{ required: true, message: '请输入维修描述' }]}
            placeholder="请详细描述维修内容、更换的零件等"
            fieldProps={{ rows: 4, maxLength: 2000, showCount: true }}
          />

          <Row gutter={24}>
            <Col span={12}>
              <ProFormText name="owner_name" label="车主姓名" disabled />
            </Col>
            <Col span={12}>
              <ProFormText name="owner_phone" label="车主电话" disabled />
            </Col>
          </Row>

          <ProFormTextArea
            name="notes"
            label="备注"
            placeholder="请输入其他需要记录的信息"
            fieldProps={{ rows: 3, maxLength: 1000, showCount: true }}
          />
        </ProForm>
      </Card>
    </div>
  );
};

export default RepairForm;
