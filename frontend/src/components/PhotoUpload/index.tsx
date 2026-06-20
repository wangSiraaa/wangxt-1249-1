import React, { useState } from 'react';
import { Upload, message, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import { repairApi } from '@/services/api';

interface PhotoUploadProps {
  repairId: number;
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  maxCount?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  repairId,
  value = [],
  onChange,
  disabled = false,
  maxCount = 9,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>(
    value.map((url, index) => ({
      uid: `-${index}`,
      name: `photo_${index}.jpg`,
      status: 'done' as const,
      url,
      response: { data: url },
    })),
  );

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB!');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const url = await repairApi.uploadPhoto(repairId, file as File);
      const newUrls = [...value, url];
      onChange?.(newUrls);
      setFileList([
        ...fileList,
        {
          uid: `-${Date.now()}`,
          name: file.name,
          status: 'done',
          url,
          response: { data: url },
        },
      ]);
      onSuccess?.({ data: url });
      message.success('上传成功');
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const handleRemove = async (file: UploadFile) => {
    try {
      const url = file.url || file.response?.data;
      if (url) {
        await repairApi.deletePhoto(repairId, url);
        const newUrls = value.filter((u) => u !== url);
        onChange?.(newUrls);
        setFileList(fileList.filter((f) => f.uid !== file.uid));
        message.success('删除成功');
      }
    } catch (error) {
      console.error('Delete photo error:', error);
    }
  };

  const handlePreview = async (file: UploadFile) => {
    if (file.url) {
      setPreviewImage(file.url);
      setPreviewVisible(true);
    }
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传照片</div>
    </div>
  );

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        onPreview={handlePreview}
        onRemove={handleRemove}
        disabled={disabled}
        maxCount={maxCount}
      >
        {fileList.length >= maxCount || disabled ? null : uploadButton}
      </Upload>

      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  );
};

export default PhotoUpload;
