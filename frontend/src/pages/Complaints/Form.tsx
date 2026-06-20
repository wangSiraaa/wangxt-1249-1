import React, { useEffect, useState } from 'react';
import {
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormDigit,
  ProFormDatePicker,
  ProFormItem,
} from '@ant-design/pro-components';
import { Card, Button, Space, message, Row, Col } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useSearchParams } from '@umijs/max';
import { complaintApi, commonApi } from '@/services/api';
import dayjs from 'dayjs';

const ComplaintForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [loading, setLoading] = useState(false);
  const [form] = ProForm.useForm();
  const [models, setModels] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');

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

  const loadDetail = async () => {
    try {
      const data = await complaintApi.detail(Number(editId));
      setSelectedBrand(data.brand);
      form.setFieldsValue({
        ...data,
        model_id: data.model_id?.toString(),
        occurrence_date: dayjs(data.occurrence_date),
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
        model_id: Number(values.model_id),
        occurrence_date: values.occurrence_date?.format('YYYY-MM-DD'),
      };

      if (editId) {
        await complaintApi.update(Number(editId), submitData);
        message.success('更新成功');
      } else {
        await complaintApi.create(submitData);
        message.success('创建成功');
      }
      history.push('/complaints/list');
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={editId ? '编辑投诉线索' : '新增投诉线索'}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/complaints/list')}>
            返回列表
          </Button>
        }
      >
        <ProForm
          form={form}
          layout="horizontal"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          onFinish={onFinish}
          initialValues={{ status: 0 }}
          submitter={{
            render: (_, dom) => (
              <Space style={{ justifyContent: 'center', display: 'flex' }}>
                {dom}
              </Space>
            ),
            submitButtonProps: {
              loading,
              icon: <SaveOutlined />,
              children: editId ? '更新' : '保存',
            },
            resetButtonProps: {
              onClick: () => history.push('/complaints/list'),
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
                  form.setFieldsValue({ model_id: undefined, vin: undefined });
                }}
              />
            </Col>
            <Col span={12}>
              <ProFormSelect
                name="model_id"
                label="车型"
                rules={[{ required: true, message: '请选择车型' }]}
                options={models.map((m) => ({
                  label: `${m.model_name} ${m.model_year}款 (${m.body_style})`,
                  value: m.id.toString(),
                }))}
                placeholder="请选择车型"
                disabled={!selectedBrand}
              />
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <ProFormText
                name="vin"
                label="VIN码"
                rules={[
                  { required: true, message: '请输入VIN码' },
                  { len: 17, message: 'VIN码必须为17位' },
                ]}
                placeholder="请输入17位VIN码"
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

          <Row gutter={24}>
            <Col span={12}>
              <ProFormDatePicker
                name="occurrence_date"
                label="故障发生日期"
                rules={[{ required: true, message: '请选择故障发生日期' }]}
              />
            </Col>
            <Col span={12}>
              <ProFormDigit
                name="mileage"
                label="行驶里程(km)"
                min={0}
                placeholder="请输入行驶里程"
              />
            </Col>
          </Row>

          <ProFormTextArea
            name="description"
            label="故障描述"
            rules={[{ required: true, message: '请输入故障描述' }]}
            placeholder="请详细描述故障现象、发生条件等"
            fieldProps={{ rows: 4, maxLength: 2000, showCount: true }}
          />

          <Row gutter={24}>
            <Col span={12}>
              <ProFormText name="owner_name" label="车主姓名" placeholder="请输入车主姓名" />
            </Col>
            <Col span={12}>
              <ProFormText name="owner_phone" label="车主电话" placeholder="请输入车主电话" />
            </Col>
          </Row>

          <ProFormTextArea
            name="engineer_notes"
            label="工程师备注"
            placeholder="请输入质保工程师分析备注"
            fieldProps={{ rows: 3, maxLength: 1000, showCount: true }}
          />
        </ProForm>
      </Card>
    </div>
  );
};

export default ComplaintForm;
