import React, { useEffect, useState } from 'react';
import {
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormDigit,
  ProFormDatePicker,
  ProFormListItem,
} from '@ant-design/pro-components';
import { Card, Button, Space, message, Row, Col, Alert, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { history, useSearchParams } from '@umijs/max';
import { recallApi, commonApi, complaintApi } from '@/services/api';
import dayjs from 'dayjs';

const RecallForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [loading, setLoading] = useState(false);
  const [form] = ProForm.useForm();
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [models, setModels] = useState<any[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [modelComplaintCount, setModelComplaintCount] = useState<number>(0);

  useEffect(() => {
    loadBrands();
    if (editId) {
      loadDetail();
    }
  }, [editId]);

  useEffect(() => {
    if (selectedBrand) {
      loadModels(selectedBrand);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedModelIds.length > 0) {
      checkComplaintCount();
    } else {
      setModelComplaintCount(0);
    }
  }, [selectedBrand, selectedModelIds]);

  const loadBrands = async () => {
    try {
      const data = await commonApi.getBrands();
      setBrands(data || []);
    } catch (error) {
      console.error('Load brands error:', error);
    }
  };

  const loadModels = async (brand: string) => {
    try {
      const res = await commonApi.getModels({ brand, page_size: 100 });
      setModels(res.list || []);
    } catch (error) {
      console.error('Load models error:', error);
    }
  };

  const checkComplaintCount = async () => {
    try {
      const res = await complaintApi.list({
        brand: selectedBrand,
        model_ids: selectedModelIds,
        status: 1,
        page_size: 1,
      });
      setModelComplaintCount(res.total || 0);
    } catch (error) {
      console.error('Check complaint count error:', error);
    }
  };

  const loadDetail = async () => {
    try {
      const data = await recallApi.detail(Number(editId));
      setSelectedBrand(data.brand);
      const modelIds = (data.affected_models || []).map((m: any) => m.id);
      setSelectedModelIds(modelIds);
      form.setFieldsValue({
        ...data,
        affected_models: modelIds,
        start_date: dayjs(data.start_date),
        end_date: dayjs(data.end_date),
        estimated_date: dayjs(data.estimated_date),
      });
    } catch (error) {
      console.error('Load detail error:', error);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const submitData = {
        ...values,
        affected_models: selectedModelIds,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD'),
        estimated_date: values.estimated_date?.format('YYYY-MM-DD'),
        status: 1,
      };

      if (editId) {
        await recallApi.update(Number(editId), submitData);
        message.success('更新成功');
      } else {
        await recallApi.create(submitData);
        message.success('创建成功');
      }
      history.push('/recalls/list');
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = (modelId: number) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId],
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={editId ? '编辑召回范围' : '新建召回范围'}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/recalls/list')}>
            返回列表
          </Button>
        }
      >
        <Alert
          message="操作说明"
          description="选择召回涉及的车型后，系统会自动统计该车型已确认的投诉样本数。提交后状态变为"待确认"，法规专员可以进行确认。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <ProForm
          form={form}
          layout="horizontal"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          onFinish={onFinish}
          initialValues={{ min_complaint_threshold: 5 }}
          submitter={{
            render: (_, dom) => (
              <Space style={{ justifyContent: 'center', display: 'flex' }}>
                {dom}
              </Space>
            ),
            submitButtonProps: {
              loading,
              icon: <SaveOutlined />,
              children: editId ? '更新并提交审核' : '保存并提交审核',
            },
            resetButtonProps: {
              onClick: () => history.push('/recalls/list'),
              children: '取消',
            },
          }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <ProFormSelect
                name="brand"
                label="品牌"
                rules={[{ required: true, message: '请选择品牌' }]}
                options={brands.map((b) => ({ label: b, value: b }))}
                placeholder="请选择品牌"
                onChange={(value) => {
                  setSelectedBrand(value);
                  setSelectedModelIds([]);
                }}
              />
            </Col>
            <Col span={12}>
              <ProFormSelect
                name="defect_type"
                label="缺陷类型"
                rules={[{ required: true, message: '请选择缺陷类型' }]}
                options={[
                  { label: '制动系统', value: '制动系统' },
                  { label: '动力系统', value: '动力系统' },
                  { label: '转向系统', value: '转向系统' },
                  { label: '电气系统', value: '电气系统' },
                  { label: '底盘系统', value: '底盘系统' },
                  { label: '车身系统', value: '车身系统' },
                  { label: '其他', value: '其他' },
                ]}
                placeholder="请选择缺陷类型"
              />
            </Col>
          </Row>

          <ProFormText
            name="title"
            label="召回标题"
            rules={[{ required: true, message: '请输入召回标题' }]}
            placeholder="请简要描述本次召回的核心内容"
          />

          <ProFormTextArea
            name="description"
            label="缺陷描述"
            rules={[{ required: true, message: '请输入缺陷描述' }]}
            placeholder="请详细描述缺陷情况、可能产生的后果等"
            fieldProps={{ rows: 3, maxLength: 2000, showCount: true }}
          />

          <ProFormTextArea
            name="repair_measure"
            label="维修措施"
            rules={[{ required: true, message: '请输入维修措施' }]}
            placeholder="请描述本次召回将采取的维修措施"
            fieldProps={{ rows: 3, maxLength: 1000, showCount: true }}
          />

          <Row gutter={24}>
            <Col span={8}>
              <ProFormDigit
                name="min_complaint_threshold"
                label="最小投诉阈值"
                min={1}
                max={100}
                rules={[{ required: true, message: '请输入最小投诉阈值' }]}
                tooltip="达到此投诉数量后才能确认召回"
              />
            </Col>
            <Col span={8}>
              <ProFormDatePicker
                name="start_date"
                label="生产起始日期"
                rules={[{ required: true, message: '请选择生产起始日期' }]}
              />
            </Col>
            <Col span={8}>
              <ProFormDatePicker
                name="end_date"
                label="生产截止日期"
                rules={[{ required: true, message: '请选择生产截止日期' }]}
              />
            </Col>
          </Row>

          <ProFormDatePicker
            name="estimated_date"
            label="预计维修完成日期"
            placeholder="请选择预计完成全部维修的日期"
          />

          <ProFormItem
            label="涉及车型"
            required
            tooltip="请勾选本次召回涉及的所有车型"
            extra={
              <Space>
                <span>已选 {selectedModelIds.length} 款车型</span>
                <Tag color={modelComplaintCount >= 5 ? 'success' : 'warning'}>
                  已确认投诉样本: {modelComplaintCount}
                </Tag>
              </Space>
            }
          >
            <Card
              size="small"
              style={selectedBrand ? {} : { background: '#fafafa' }}
              bodyStyle={{ maxHeight: 300, overflowY: 'auto' }}
            >
              {!selectedBrand ? (
                <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '20px 0' }}>
                  请先选择品牌
                </div>
              ) : models.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '20px 0' }}>
                  暂无车型数据
                </div>
              ) : (
                <Row gutter={[8, 8]}>
                  {models.map((model) => (
                    <Col xs={24} sm={12} md={8} key={model.id}>
                      <div
                        onClick={() => toggleModel(model.id)}
                        style={{
                          padding: 12,
                          border: selectedModelIds.includes(model.id)
                            ? '2px solid #1677ff'
                            : '1px solid #d9d9d9',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: selectedModelIds.includes(model.id) ? '#e6f4ff' : '#fff',
                          transition: 'all 0.3s',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{model.model_name}</div>
                        <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                          {model.model_year}款 · {model.body_style}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </ProFormItem>
        </ProForm>
      </Card>
    </div>
  );
};

export default RecallForm;
