declare module '*.css';
declare module '*.less';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.bmp';
declare module '*.tiff';

declare namespace API {
  type CurrentUser = {
    id?: number;
    username?: string;
    real_name?: string;
    role?: string;
    dealer_id?: number;
    phone?: string;
    email?: string;
  };

  type PageParams = {
    page?: number;
    page_size?: number;
    [key: string]: any;
  };

  type PageResult<T> = {
    list: T[];
    total: number;
    page: number;
    page_size: number;
  };
}
