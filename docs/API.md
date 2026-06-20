# 汽车缺陷召回跟踪系统 API 文档

## 目录

1. [系统概述](#系统概述)
2. [技术架构](#技术架构)
3. [快速开始](#快速开始)
4. [API 接口列表](#api-接口列表)
5. [业务流程说明](#业务流程说明)
6. [核心业务规则](#核心业务规则)
7. [测试账号](#测试账号)

---

## 系统概述

汽车缺陷召回跟踪系统实现了从**投诉线索→缺陷分析→车主通知→维修完成**的完整召回跟踪流程。

### 主要功能模块

| 模块 | 角色 | 功能说明 |
|------|------|----------|
| 投诉线索管理 | 质保工程师 | 录入、审核、分析故障投诉样本 |
| 召回范围管理 | 法规专员 | 确认召回范围，含投诉样本校验 |
| 车主通知管理 | 法规专员/经销商 | 生成、发送通知，含VIN范围校验 |
| 维修记录管理 | 经销商 | 回填维修状态，含旧件照片和处理人记录 |
| 基础数据管理 | 所有角色 | 车型、VIN、经销商数据管理 |

---

## 技术架构

### 后端技术栈
- **框架**: Go 1.20 + Gin v1.9.1
- **ORM**: GORM v1.25.5
- **认证**: JWT (golang-jwt/jwt/v5)
- **密码加密**: bcrypt
- **数据库**: MySQL 8.0+

### 前端技术栈
- **框架**: React 18 + TypeScript
- **脚手架**: Umi Max (Ant Design Pro)
- **UI组件**: Ant Design v5 + Pro Components
- **HTTP请求**: Axios
- **图表**: ECharts

### 数据库设计

核心数据表：
- `vehicle_models` - 车型表
- `vehicle_vins` - VIN车辆表
- `complaints` - 投诉线索表
- `recall_scopes` - 召回范围表
- `recall_vins` - 召回VIN关联表
- `notifications` - 车主通知表
- `repair_records` - 维修记录表
- `dealers` - 经销商表
- `users` - 用户表

---

## 快速开始

### 后端启动

```bash
cd backend

# 1. 初始化数据库
mysql -u root -p < sql/init.sql

# 2. 修改配置
vim .env

# 3. 安装依赖
go mod download

# 4. 启动服务
go run main.go
# 服务启动在 http://localhost:8080
```

### 前端启动

```bash
cd frontend

# 1. 安装依赖
npm install
# 或
pnpm install

# 2. 启动开发服务
npm run dev
# 服务启动在 http://localhost:8000
```

### 配置说明

后端 `.env` 配置：
```env
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=recall_tracking

# 服务配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# JWT 配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRE_HOURS=24

# 上传配置
UPLOAD_PATH=./uploads
```

---

## API 接口列表

### 统一响应格式

所有接口返回格式统一：
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证/Token过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 1. 认证接口

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123456"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user_info": {
      "id": 1,
      "username": "admin",
      "real_name": "系统管理员",
      "role": "ADMIN",
      "dealer_id": 0,
      "phone": "13800138000",
      "email": "admin@example.com"
    }
  }
}
```

#### 获取当前用户信息
```
GET /api/auth/user
Authorization: Bearer {token}
```

#### 登出
```
POST /api/auth/logout
Authorization: Bearer {token}
```

---

### 2. 投诉线索接口

#### 新增投诉（质保工程师）
```
POST /api/complaints
Authorization: Bearer {token}
Content-Type: application/json

{
  "brand": "奔驰",
  "model_id": 1,
  "vin": "LBV1Z310XKM000001",
  "defect_type": "制动系统",
  "description": "高速行驶时刹车有异响",
  "occurrence_date": "2024-01-15",
  "mileage": 15000,
  "owner_name": "张三",
  "owner_phone": "13800138001"
}
```

#### 投诉列表
```
GET /api/complaints?page=1&page_size=10&brand=奔驰&status=1
```

#### 投诉详情
```
GET /api/complaints/:id
```

#### 更新投诉
```
PUT /api/complaints/:id
```

#### 删除投诉
```
DELETE /api/complaints/:id
```

#### 缺陷统计
```
GET /api/complaints/statistics
```

---

### 3. 召回范围接口

#### 新建召回范围
```
POST /api/recalls
Authorization: Bearer {token}
Content-Type: application/json

{
  "brand": "奔驰",
  "title": "制动系统缺陷召回",
  "description": "部分车辆制动系统存在安全隐患",
  "defect_type": "制动系统",
  "repair_measure": "更换制动总泵",
  "min_complaint_threshold": 5,
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "affected_models": [1, 2]
}
```

#### 召回列表
```
GET /api/recalls?page=1&page_size=10
```

#### 召回详情
```
GET /api/recalls/:id
```

#### 确认召回范围（法规专员）
```
POST /api/recalls/:id/confirm
Content-Type: application/json

{
  "status": 2
}
```

**核心校验**: 投诉样本数必须达到 `min_complaint_threshold` 才能确认

#### 发布召回
```
POST /api/recalls/:id/publish
```

#### 受影响VIN列表
```
GET /api/recalls/:id/vins
```

---

### 4. 车主通知接口

#### 生成车主通知
```
POST /api/notifications
Authorization: Bearer {token}
Content-Type: application/json

{
  "recall_id": 1,
  "vin_list": ["LBV1Z310XKM000001"]
}
```

**核心校验**: 所有VIN必须在召回范围内

#### 通知列表
```
GET /api/notifications?page=1&page_size=10
```

#### 通知详情
```
GET /api/notifications/:id
```

#### 批量发送通知
```
POST /api/notifications/send
Content-Type: application/json

{
  "notification_ids": [1, 2, 3]
}
```

#### 车主确认（经销商）
```
POST /api/notifications/:id/confirm
Content-Type: application/json

{
  "owner_confirm_status": 1
}
```

#### 通知统计
```
GET /api/notifications/statistics
```

---

### 5. 维修记录接口

#### 新建维修记录（经销商）
```
POST /api/repairs
Authorization: Bearer {token}
Content-Type: application/json

{
  "notification_id": 1,
  "vin": "LBV1Z310XKM000001",
  "status": 1,
  "repair_type": "零件更换",
  "repair_description": "更换制动总泵",
  "start_date": "2024-01-20"
}
```

#### 维修列表
```
GET /api/repairs?page=1&page_size=10
```

#### 维修详情
```
GET /api/repairs/:id
```

#### 上传旧件照片
```
POST /api/repairs/:id/photos
Content-Type: multipart/form-data

file: [binary]
```

#### 删除旧件照片
```
DELETE /api/repairs/:id/photos?url={photo_url}
```

#### 完成维修（经销商）
```
POST /api/repairs/:id/complete
```

**核心校验**: 必须已上传旧件照片，系统自动记录处理人

#### 质量检查（质保工程师）
```
POST /api/repairs/:id/quality-check
Content-Type: application/json

{
  "quality_result": 1,
  "quality_notes": "质检通过"
}
```

#### 维修统计
```
GET /api/repairs/statistics
```

---

### 6. 基础数据接口

#### 仪表盘统计
```
GET /api/common/dashboard
```

#### 车型列表
```
GET /api/common/models
```

#### VIN列表
```
GET /api/common/vins
```

#### VIN详情
```
GET /api/common/vins/:id
```

#### 经销商列表
```
GET /api/common/dealers
```

#### 用户列表
```
GET /api/common/users
```

#### 品牌列表
```
GET /api/common/brands
```

#### 城市列表
```
GET /api/common/cities
```

---

## 业务流程说明

### 完整召回流程

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  质保工程师      │────▶│  法规专员        │────▶│  经销商          │
│  录入投诉样本    │     │  确认召回范围    │     │  车主确认维修    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  投诉样本≥5个   │────▶│  发布召回        │────▶│  维修完成        │
│  才能确认召回    │     │  计算受影响VIN   │     │  保留旧件照片    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  生成车主通知    │────▶│  发送通知        │────▶│  质检归档        │
│  VIN必须在范围内 │     │  短信/邮件       │     │  处理人记录      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 角色权限矩阵

| 功能 | 管理员 | 质保工程师 | 法规专员 | 经销商 |
|------|--------|-----------|----------|--------|
| 录入投诉 | ✓ | ✓ | - | - |
| 审核投诉 | ✓ | ✓ | - | - |
| 创建召回范围 | ✓ | - | ✓ | - |
| 确认召回范围 | ✓ | - | ✓ | - |
| 发布召回 | ✓ | - | ✓ | - |
| 生成通知 | ✓ | - | ✓ | - |
| 发送通知 | ✓ | - | ✓ | - |
| 车主确认 | - | - | - | ✓ |
| 创建维修 | - | - | - | ✓ |
| 上传旧件照片 | - | - | - | ✓ |
| 完成维修 | - | - | - | ✓ |
| 质量检查 | ✓ | ✓ | - | - |
| 查看数据 | ✓ | ✓ | ✓ | ✓(仅本经销商) |

---

## 核心业务规则

### 1. 投诉样本校验规则

**规则**: 投诉样本不足不能直接发召回

**实现**:
```go
// recall_controller.go:234-241
if req.Status == 2 {
    if recall.ComplaintCount < recall.MinComplaintThreshold {
        response.BadRequest(c, "投诉样本不足，当前投诉样本数为 "+
            strconv.Itoa(recall.ComplaintCount)+
            "，最小阈值为 "+strconv.Itoa(recall.MinComplaintThreshold)+
            "，请先收集足够的投诉样本后再确认召回")
        return
    }
}
```

### 2. VIN范围校验规则

**规则**: VIN不在召回范围内不能生成通知

**实现**:
```go
// notification_controller.go:59-66
for _, vinStr := range req.VINList {
    var recallVIN models.RecallVIN
    result := models.DB.Where("recall_id = ? AND vin = ? AND is_in_scope = 1", req.RecallID, vinStr).First(&recallVIN)
    if result.Error != nil {
        response.BadRequest(c, "VIN "+vinStr+" 不在召回范围内，不能生成通知")
        return
    }
}
```

### 3. 旧件照片校验规则

**规则**: 维修完成前必须上传旧件照片

**实现**:
```go
// repair_controller.go:366-369
if len(repair.OldPartPhotos) == 0 {
    response.BadRequest(c, "维修完成前必须上传旧件照片，请先上传旧件照片")
    return
}
```

### 4. 处理人记录规则

**规则**: 维修完成后保留处理人信息（从JWT Token获取）

**实现**:
```go
// repair_controller.go:371-378
handlerID, _ := c.Get("userID")
handlerName, _ := c.Get("userRealName")
repair.HandlerID = handlerID.(uint64)
repair.HandlerName = handlerName.(string)
repair.CompletedAt = time.Now()
repair.Status = 2
```

---

## 测试账号

数据库初始化脚本已内置以下测试账号：

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 系统管理员 | admin | 123456 | 拥有所有权限 |
| 质保工程师 | quality01 | 123456 | 质量工程师01 |
| 质保工程师 | quality02 | 123456 | 质量工程师02 |
| 法规专员 | regulation01 | 123456 | 法规专员01 |
| 经销商 | dealer01 | 123456 | 北京奔驰4S店 |
| 经销商 | dealer02 | 123456 | 上海宝马4S店 |

---

## 附录

### HTTP状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证/Token无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 角色编码

| 编码 | 角色名称 |
|------|----------|
| ADMIN | 系统管理员 |
| QUALITY_ENGINEER | 质保工程师 |
| REGULATION_OFFICER | 法规专员 |
| DEALER | 经销商 |

### 状态编码

**投诉状态**:
| 值 | 说明 |
|----|------|
| 0 | 待审核 |
| 1 | 已确认 |
| 2 | 已驳回 |

**召回状态**:
| 值 | 说明 |
|----|------|
| 0 | 草稿 |
| 1 | 待确认 |
| 2 | 已确认 |
| 3 | 已驳回 |
| 4 | 已发布 |

**通知状态**:
| 值 | 说明 |
|----|------|
| 0 | 待发送 |
| 1 | 已发送 |
| 2 | 发送失败 |
| 3 | 已取消 |

**维修状态**:
| 值 | 说明 |
|----|------|
| 0 | 待维修 |
| 1 | 维修中 |
| 2 | 已完成 |
| 3 | 维修失败 |
