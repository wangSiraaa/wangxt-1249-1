import { get, post, put, del } from './request';

export interface PageParams {
  page?: number;
  page_size?: number;
  [key: string]: any;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserInfo {
  id: number;
  username: string;
  real_name: string;
  role: string;
  dealer_id: number;
  phone: string;
  email: string;
}

export const authApi = {
  login: (data: { username: string; password: string }) =>
    post<{ token: string; user_info: UserInfo }>('/auth/login', data),
  logout: () => post('/auth/logout'),
  getUserInfo: () => get<UserInfo>('/auth/user'),
};

export const commonApi = {
  getDashboard: () => get('/common/dashboard'),
  getModels: (params?: PageParams) => get<PageResult<any>>('/common/models', { params }),
  getVINs: (params?: PageParams) => get<PageResult<any>>('/common/vins', { params }),
  getVINDetail: (id: number) => get(`/common/vins/${id}`),
  getDealers: (params?: PageParams) => get<PageResult<any>>('/common/dealers', { params }),
  getUsers: (params?: PageParams) => get<PageResult<any>>('/common/users', { params }),
  getBrands: () => get<string[]>('/common/brands'),
  getCities: () => get<string[]>('/common/cities'),
};

export const complaintApi = {
  create: (data: any) => post('/complaints', data),
  list: (params?: PageParams) => get<PageResult<any>>('/complaints', { params }),
  detail: (id: number) => get(`/complaints/${id}`),
  update: (id: number, data: any) => put(`/complaints/${id}`, data),
  delete: (id: number) => del(`/complaints/${id}`),
  statistics: (params?: any) => get('/complaints/statistics', { params }),
};

export const recallApi = {
  create: (data: any) => post('/recalls', data),
  list: (params?: PageParams) => get<PageResult<any>>('/recalls', { params }),
  detail: (id: number) => get(`/recalls/${id}`),
  update: (id: number, data: any) => put(`/recalls/${id}`, data),
  confirm: (id: number, data: { status: number }) => post(`/recalls/${id}/confirm`, data),
  publish: (id: number) => post(`/recalls/${id}/publish`),
  getAffectedVINs: (id: number, params?: PageParams) =>
    get<PageResult<any>>(`/recalls/${id}/vins`, { params }),
};

export const notificationApi = {
  create: (data: any) => post('/notifications', data),
  list: (params?: PageParams) => get<PageResult<any>>('/notifications', { params }),
  detail: (id: number) => get(`/notifications/${id}`),
  send: (data: { notification_ids: number[] }) => post('/notifications/send', data),
  confirm: (id: number, data: any) => post(`/notifications/${id}/confirm`, data),
  statistics: (params?: any) => get('/notifications/statistics', { params }),
};

export const repairApi = {
  create: (data: any) => post('/repairs', data),
  list: (params?: PageParams) => get<PageResult<any>>('/repairs', { params }),
  detail: (id: number) => get(`/repairs/${id}`),
  update: (id: number, data: any) => put(`/repairs/${id}`, data),
  complete: (id: number, data: any) => post(`/repairs/${id}/complete`, data),
  qualityCheck: (id: number, data: any) => post(`/repairs/${id}/quality-check`, data),
  uploadPhoto: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post(`/repairs/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePhoto: (id: number, url: string) =>
    del(`/repairs/${id}/photos`, { params: { url } }),
  statistics: (params?: any) => get('/repairs/statistics', { params }),
};

export const RoleType = {
  ADMIN: 'ADMIN',
  QUALITY_ENGINEER: 'QUALITY_ENGINEER',
  REGULATION_OFFICER: 'REGULATION_OFFICER',
  DEALER: 'DEALER',
};

export const statusConfig = {
  complaint: {
    0: { text: '待审核', color: 'warning' },
    1: { text: '已确认', color: 'success' },
    2: { text: '已驳回', color: 'error' },
  },
  recall: {
    0: { text: '草稿', color: 'default' },
    1: { text: '待确认', color: 'warning' },
    2: { text: '已确认', color: 'processing' },
    3: { text: '已驳回', color: 'error' },
    4: { text: '已发布', color: 'success' },
  },
  notification: {
    0: { text: '待发送', color: 'default' },
    1: { text: '已发送', color: 'success' },
    2: { text: '发送失败', color: 'error' },
    3: { text: '已取消', color: 'warning' },
  },
  repair: {
    0: { text: '待维修', color: 'default' },
    1: { text: '维修中', color: 'processing' },
    2: { text: '已完成', color: 'success' },
    3: { text: '维修失败', color: 'error' },
  },
  ownerConfirm: {
    0: { text: '未确认', color: 'default' },
    1: { text: '已确认', color: 'success' },
    2: { text: '已拒绝', color: 'error' },
  },
  vin: {
    0: { text: '正常', color: 'success' },
    1: { text: '已召回', color: 'warning' },
    2: { text: '已维修', color: 'processing' },
  },
};
