-- 汽车缺陷召回跟踪系统数据库初始化脚本

CREATE DATABASE IF NOT EXISTS recall_tracking DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE recall_tracking;

-- 1. 车型表
CREATE TABLE IF NOT EXISTS vehicle_models (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    brand VARCHAR(100) NOT NULL COMMENT '品牌',
    model VARCHAR(100) NOT NULL COMMENT '型号',
    year INT NOT NULL COMMENT '年款',
    engine_type VARCHAR(50) COMMENT '发动机类型',
    production_start_date DATE COMMENT '生产开始日期',
    production_end_date DATE COMMENT '生产结束日期',
    description TEXT COMMENT '车型描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    INDEX idx_brand_model (brand, model, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车型表';

-- 2. VIN车辆信息表
CREATE TABLE IF NOT EXISTS vehicle_vins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    vin VARCHAR(17) NOT NULL UNIQUE COMMENT '车辆识别码',
    model_id BIGINT NOT NULL COMMENT '车型ID',
    production_date DATE COMMENT '生产日期',
    owner_name VARCHAR(100) COMMENT '车主姓名',
    owner_phone VARCHAR(20) COMMENT '车主电话',
    owner_address VARCHAR(500) COMMENT '车主地址',
    dealer_id BIGINT COMMENT '经销商ID',
    status TINYINT DEFAULT 0 COMMENT '状态：0-正常，1-已召回，2-已维修',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    FOREIGN KEY (model_id) REFERENCES vehicle_models(id),
    INDEX idx_vin (vin),
    INDEX idx_model_id (model_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIN车辆信息表';

-- 3. 投诉线索表
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    complaint_no VARCHAR(50) NOT NULL UNIQUE COMMENT '投诉编号',
    model_id BIGINT NOT NULL COMMENT '车型ID',
    vin VARCHAR(17) COMMENT 'VIN码',
    complaint_type VARCHAR(100) NOT NULL COMMENT '投诉类型',
    fault_description TEXT NOT NULL COMMENT '故障描述',
    fault_location VARCHAR(200) COMMENT '故障部位',
    occurrence_time DATETIME COMMENT '发生时间',
    mileage INT COMMENT '发生时里程(公里)',
    reporter_name VARCHAR(100) COMMENT '上报人',
    reporter_type VARCHAR(50) COMMENT '上报人类型：车主/经销商/内部',
    quality_engineer_id BIGINT COMMENT '质保工程师ID',
    quality_engineer_name VARCHAR(100) COMMENT '质保工程师姓名',
    sample_type VARCHAR(50) COMMENT '样本类型：故障样本/投诉样本',
    status TINYINT DEFAULT 0 COMMENT '状态：0-待审核，1-已确认，2-已驳回',
    analysis_result TEXT COMMENT '分析结果',
    is_defect TINYINT DEFAULT 0 COMMENT '是否判定为缺陷：0-否，1-是',
    related_recall_id BIGINT COMMENT '关联召回ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    FOREIGN KEY (model_id) REFERENCES vehicle_models(id),
    INDEX idx_complaint_no (complaint_no),
    INDEX idx_model_id (model_id),
    INDEX idx_status (status),
    INDEX idx_is_defect (is_defect)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投诉线索表';

-- 4. 召回范围表
CREATE TABLE IF NOT EXISTS recall_scopes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    recall_no VARCHAR(50) NOT NULL UNIQUE COMMENT '召回编号',
    model_id BIGINT NOT NULL COMMENT '车型ID',
    defect_description TEXT NOT NULL COMMENT '缺陷描述',
    defect_cause TEXT COMMENT '缺陷原因分析',
    risk_description TEXT COMMENT '风险描述',
    vin_start VARCHAR(17) COMMENT 'VIN范围起始',
    vin_end VARCHAR(17) COMMENT 'VIN范围结束',
    production_start_date DATE COMMENT '生产日期范围开始',
    production_end_date DATE COMMENT '生产日期范围结束',
    vin_count INT DEFAULT 0 COMMENT '涉及VIN数量',
    complaint_count INT DEFAULT 0 COMMENT '关联投诉样本数',
    min_complaint_threshold INT DEFAULT 5 COMMENT '最小投诉样本阈值',
    regulation_officer_id BIGINT COMMENT '法规专员ID',
    regulation_officer_name VARCHAR(100) COMMENT '法规专员姓名',
    repair_measure TEXT COMMENT '维修措施',
    estimated_cost DECIMAL(15,2) COMMENT '预计成本',
    status TINYINT DEFAULT 0 COMMENT '状态：0-草稿，1-待确认，2-已确认，3-已驳回，4-已发布',
    confirmed_at DATETIME COMMENT '确认时间',
    published_at DATETIME COMMENT '发布时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    FOREIGN KEY (model_id) REFERENCES vehicle_models(id),
    INDEX idx_recall_no (recall_no),
    INDEX idx_model_id (model_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='召回范围表';

-- 5. 召回VIN关联表
CREATE TABLE IF NOT EXISTS recall_vins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    recall_id BIGINT NOT NULL COMMENT '召回ID',
    vin_id BIGINT NOT NULL COMMENT 'VIN ID',
    vin VARCHAR(17) NOT NULL COMMENT 'VIN码',
    is_in_scope TINYINT DEFAULT 1 COMMENT '是否在召回范围内：0-否，1-是',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (recall_id) REFERENCES recall_scopes(id),
    FOREIGN KEY (vin_id) REFERENCES vehicle_vins(id),
    UNIQUE KEY uk_recall_vin (recall_id, vin_id),
    INDEX idx_recall_id (recall_id),
    INDEX idx_vin (vin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='召回VIN关联表';

-- 6. 车主通知表
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    notification_no VARCHAR(50) NOT NULL UNIQUE COMMENT '通知编号',
    recall_id BIGINT NOT NULL COMMENT '召回ID',
    vin_id BIGINT NOT NULL COMMENT 'VIN ID',
    vin VARCHAR(17) NOT NULL COMMENT 'VIN码',
    owner_name VARCHAR(100) COMMENT '车主姓名',
    owner_phone VARCHAR(20) COMMENT '车主电话',
    owner_address VARCHAR(500) COMMENT '车主地址',
    notification_type VARCHAR(50) DEFAULT 'MAIL' COMMENT '通知方式：MAIL-邮件，SMS-短信，PHONE-电话',
    notification_content TEXT COMMENT '通知内容',
    scheduled_send_time DATETIME COMMENT '计划发送时间',
    actual_send_time DATETIME COMMENT '实际发送时间',
    sender_id BIGINT COMMENT '发送人ID',
    sender_name VARCHAR(100) COMMENT '发送人姓名',
    status TINYINT DEFAULT 0 COMMENT '状态：0-待发送，1-已发送，2-发送失败，3-已取消',
    owner_confirm_status TINYINT DEFAULT 0 COMMENT '车主确认状态：0-未确认，1-已确认，2-已拒绝',
    owner_confirm_time DATETIME COMMENT '车主确认时间',
    appointment_time DATETIME COMMENT '预约维修时间',
    dealer_id BIGINT COMMENT '指定经销商ID',
    failure_reason TEXT COMMENT '失败原因',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    FOREIGN KEY (recall_id) REFERENCES recall_scopes(id),
    FOREIGN KEY (vin_id) REFERENCES vehicle_vins(id),
    INDEX idx_notification_no (notification_no),
    INDEX idx_recall_id (recall_id),
    INDEX idx_vin (vin),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车主通知表';

-- 7. 维修记录表
CREATE TABLE IF NOT EXISTS repair_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    repair_no VARCHAR(50) NOT NULL UNIQUE COMMENT '维修单号',
    recall_id BIGINT NOT NULL COMMENT '召回ID',
    notification_id BIGINT COMMENT '通知ID',
    vin_id BIGINT NOT NULL COMMENT 'VIN ID',
    vin VARCHAR(17) NOT NULL COMMENT 'VIN码',
    model_id BIGINT NOT NULL COMMENT '车型ID',
    dealer_id BIGINT COMMENT '经销商ID',
    dealer_name VARCHAR(200) COMMENT '经销商名称',
    repair_type VARCHAR(100) COMMENT '维修类型',
    repair_description TEXT COMMENT '维修描述',
    repair_measure TEXT COMMENT '维修措施',
    old_part_photos JSON COMMENT '旧件照片URL列表',
    old_part_disposal VARCHAR(200) COMMENT '旧件处理方式',
    repair_start_time DATETIME COMMENT '维修开始时间',
    repair_end_time DATETIME COMMENT '维修结束时间',
    repair_status TINYINT DEFAULT 0 COMMENT '维修状态：0-待维修，1-维修中，2-已完成，3-维修失败',
    handler_id BIGINT NOT NULL COMMENT '处理人ID',
    handler_name VARCHAR(100) NOT NULL COMMENT '处理人姓名',
    parts_used TEXT COMMENT '使用配件',
    labor_cost DECIMAL(15,2) DEFAULT 0 COMMENT '工时费',
    parts_cost DECIMAL(15,2) DEFAULT 0 COMMENT '配件费',
    total_cost DECIMAL(15,2) DEFAULT 0 COMMENT '总费用',
    owner_signature VARCHAR(200) COMMENT '车主签字',
    quality_check_result TEXT COMMENT '质检结果',
    quality_checker_id BIGINT COMMENT '质检人ID',
    quality_checker_name VARCHAR(100) COMMENT '质检人姓名',
    quality_check_time DATETIME COMMENT '质检时间',
    remark TEXT COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    FOREIGN KEY (recall_id) REFERENCES recall_scopes(id),
    FOREIGN KEY (notification_id) REFERENCES notifications(id),
    FOREIGN KEY (vin_id) REFERENCES vehicle_vins(id),
    FOREIGN KEY (model_id) REFERENCES vehicle_models(id),
    INDEX idx_repair_no (repair_no),
    INDEX idx_recall_id (recall_id),
    INDEX idx_vin (vin),
    INDEX idx_repair_status (repair_status),
    INDEX idx_handler_id (handler_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='维修记录表';

-- 8. 经销商表
CREATE TABLE IF NOT EXISTS dealers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    dealer_code VARCHAR(50) NOT NULL UNIQUE COMMENT '经销商编码',
    dealer_name VARCHAR(200) NOT NULL COMMENT '经销商名称',
    contact_person VARCHAR(100) COMMENT '联系人',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    address VARCHAR(500) COMMENT '地址',
    city VARCHAR(100) COMMENT '城市',
    status TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    INDEX idx_dealer_code (dealer_code),
    INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='经销商表';

-- 9. 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码',
    real_name VARCHAR(100) NOT NULL COMMENT '真实姓名',
    role VARCHAR(50) NOT NULL COMMENT '角色：QUALITY_ENGINEER-质保工程师，REGULATION_OFFICER-法规专员，DEALER-经销商，ADMIN-管理员',
    dealer_id BIGINT COMMENT '关联经销商ID（经销商角色）',
    phone VARCHAR(20) COMMENT '电话',
    email VARCHAR(100) COMMENT '邮箱',
    status TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间',
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 初始化测试数据
INSERT INTO dealers (dealer_code, dealer_name, contact_person, contact_phone, address, city) VALUES
('D001', '北京奔驰4S店', '张三', '13800138001', '北京市朝阳区建国路88号', '北京'),
('D002', '上海大众4S店', '李四', '13800138002', '上海市浦东新区张江路100号', '上海'),
('D003', '广州丰田4S店', '王五', '13800138003', '广州市天河区天河路200号', '广州');

INSERT INTO users (username, password, real_name, role, phone, email) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '系统管理员', 'ADMIN', '13900139000', 'admin@example.com'),
('engineer1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '李工', 'QUALITY_ENGINEER', '13900139001', 'engineer1@example.com'),
('engineer2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '王工', 'QUALITY_ENGINEER', '13900139002', 'engineer2@example.com'),
('officer1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '张专员', 'REGULATION_OFFICER', '13900139003', 'officer1@example.com'),
('dealer1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '北京店管理员', 'DEALER', 1, '13900139004', 'dealer1@example.com'),
('dealer2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '上海店管理员', 'DEALER', 2, '13900139005', 'dealer2@example.com');

INSERT INTO vehicle_models (brand, model, year, engine_type, production_start_date, production_end_date, description) VALUES
('奔驰', 'C级', 2023, '1.5T', '2022-09-01', '2023-12-31', '奔驰C级轿车，配备1.5T涡轮增压发动机'),
('奔驰', 'E级', 2023, '2.0T', '2022-06-01', '2023-12-31', '奔驰E级轿车，配备2.0T涡轮增压发动机'),
('大众', '帕萨特', 2022, '2.0T', '2021-09-01', '2022-12-31', '大众帕萨特轿车，配备2.0T涡轮增压发动机'),
('丰田', '凯美瑞', 2023, '2.5L', '2022-03-01', '2023-12-31', '丰田凯美瑞轿车，配备2.5L自然吸气发动机');

INSERT INTO vehicle_vins (vin, model_id, production_date, owner_name, owner_phone, owner_address, dealer_id, status) VALUES
('WDDWF4KBXJR300001', 1, '2022-10-15', '刘先生', '13700137001', '北京市海淀区中关村大街1号', 1, 0),
('WDDWF4KBXJR300002', 1, '2022-11-20', '陈女士', '13700137002', '北京市西城区金融街10号', 1, 0),
('WDDWF4KBXJR300003', 1, '2022-12-05', '赵先生', '13700137003', '北京市朝阳区望京SOHO', 1, 0),
('WDDWF4KBXJR300004', 1, '2023-01-10', '孙女士', '13700137004', '北京市东城区王府井大街', 1, 0),
('WDDWF4KBXJR300005', 1, '2023-02-15', '周先生', '13700137005', '北京市丰台区北京西站', 1, 0),
('WDDWF4KBXJR300006', 1, '2023-03-20', '吴女士', '13700137006', '北京市石景山万达广场', 1, 0),
('WDDZF4JBXKA100001', 2, '2022-08-10', '郑先生', '13700137007', '上海市浦东新区陆家嘴', 2, 0),
('WDDZF4JBXKA100002', 2, '2022-09-15', '冯女士', '13700137008', '上海市徐汇区徐家汇', 2, 0),
('WVWZZZ3CZME100001', 3, '2021-11-20', '蒋先生', '13700137009', '广州市天河区珠江新城', 3, 0),
('WVWZZZ3CZME100002', 3, '2021-12-25', '沈女士', '13700137010', '广州市越秀区北京路', 3, 0);
