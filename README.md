# 汽车缺陷召回跟踪系统

## 项目简介

汽车缺陷召回跟踪系统，实现了**投诉线索→缺陷分析→车主通知→维修完成**的完整召回跟踪流程。系统支持多角色协作：质保工程师录入故障样本，法规专员确认召回范围，经销商回填维修状态。

## 核心特性

- 🚗 **投诉线索管理** - 质保工程师录入、审核、分析故障投诉
- 📊 **缺陷分析** - 按车型、缺陷类型、时间段统计分析投诉数据
- ✅ **召回范围确认** - 法规专员确认召回，**投诉样本不足不能直接发召回**
- 📢 **车主通知** - 批量生成、发送通知，**VIN不在范围内不能生成通知**
- 🔧 **维修管理** - 经销商回填维修状态，**维修完成后保留旧件照片和处理人**
- 👥 **多角色权限** - 管理员、质保工程师、法规专员、经销商
- 📈 **数据仪表盘** - 实时统计各环节数据

## 技术栈

### 后端
- **Go 1.20**
- **Gin v1.9.1** - Web框架
- **GORM v1.25.5** - ORM框架
- **JWT** - 认证授权
- **MySQL 8.0+** - 数据库

### 前端
- **React 18** + **TypeScript**
- **Umi Max** (Ant Design Pro)
- **Ant Design v5** - UI组件库
- **Pro Components** - 高级组件
- **ECharts** - 图表库
- **Axios** - HTTP请求

## 项目结构

```
├── backend/                    # Go 后端
│   ├── config/                 # 配置模块
│   ├── controllers/            # 控制器
│   │   ├── auth_controller.go
│   │   ├── complaint_controller.go
│   │   ├── recall_controller.go
│   │   ├── notification_controller.go
│   │   ├── repair_controller.go
│   │   └── common_controller.go
│   ├── models/                 # 数据模型
│   ├── pkg/                    # 公共包
│   │   ├── middleware/         # 中间件
│   │   └── response/           # 响应封装
│   ├── routes/                 # 路由配置
│   ├── sql/                    # SQL脚本
│   ├── .env                    # 环境配置
│   ├── go.mod
│   └── main.go                 # 入口文件
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/         # 公共组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── Login/
│   │   │   ├── Dashboard/
│   │   │   ├── Complaints/
│   │   │   ├── Recalls/
│   │   │   ├── Notifications/
│   │   │   ├── Repairs/
│   │   │   └── Base/
│   │   ├── services/           # API服务
│   │   └── app.tsx             # 全局配置
│   ├── .umirc.ts               # Umi配置
│   ├── tsconfig.json
│   └── package.json
│
└── docs/
    └── API.md                  # API文档
```

## 快速开始

### 环境要求

- Go >= 1.20
- Node.js >= 16.0.0
- MySQL >= 8.0

### 1. 数据库初始化

```bash
mysql -u root -p < backend/sql/init.sql
```

### 2. 启动后端服务

```bash
cd backend

# 修改配置
vim .env

# 安装依赖
go mod download

# 启动服务
go run main.go
# 服务地址: http://localhost:8080
```

### 3. 启动前端服务

```bash
cd frontend

# 安装依赖
npm install
# 或
pnpm install

# 启动开发服务
npm run dev
# 服务地址: http://localhost:8000
```

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 系统管理员 | admin | 123456 |
| 质保工程师 | quality01 | 123456 |
| 质保工程师 | quality02 | 123456 |
| 法规专员 | regulation01 | 123456 |
| 经销商 | dealer01 | 123456 |
| 经销商 | dealer02 | 123456 |

## 业务流程

```
┌─────────────────────────────────────────────────────────────┐
│                    汽车缺陷召回完整流程                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 质保工程师  ──录入──▶  投诉线索                           │
│                          │                                   │
│                          ▼ 收集足够样本(≥5)                  │
│  2. 法规专员  ──确认──▶  召回范围  ──发布──▶  计算受影响VIN   │
│                          │                                   │
│                          ▼ 通知VIN必须在召回范围内            │
│  3. 系统      ──生成──▶  车主通知  ──发送──▶  车主收到通知   │
│                          │                                   │
│                          ▼ 车主确认维修                       │
│  4. 经销商    ──创建──▶  维修记录  ──上传──▶  旧件照片      │
│                          │                                   │
│                          ▼ 必须有照片才能完成                 │
│                          │  完成维修  ──记录──▶  处理人信息  │
│                          │                                   │
│                          ▼                                   │
│  5. 质保工程师 ──质检──▶  质量检查  ──归档──▶  完成闭环      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 核心业务规则

### 1. 投诉样本校验
> **投诉样本不足不能直接发召回**
>
> 法规专员确认召回范围时，系统会校验该召回关联的已确认投诉样本数是否达到设置的最小阈值（默认5个），未达到则不允许确认召回。

### 2. VIN范围校验
> **VIN不在召回范围内不能生成通知**
>
> 生成车主通知时，系统会校验每个VIN是否在该召回的范围内，不在范围内则无法生成通知。

### 3. 旧件照片校验
> **维修完成后仍要保留旧件照片和处理人**
>
> 维修完成前必须上传旧件照片，完成时系统自动从登录Token中获取处理人信息并永久记录，维修完成后旧件照片不允许删除。

## API 文档

详细API文档请参考 [API.md](docs/API.md)

## 主要功能页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 登录页 | /login | 用户登录 |
| 工作台 | /dashboard | 数据统计仪表盘 |
| 投诉列表 | /complaints/list | 投诉线索列表 |
| 新增投诉 | /complaints/new | 录入投诉线索 |
| 投诉详情 | /complaints/:id | 查看投诉详情 |
| 召回列表 | /recalls/list | 召回范围列表 |
| 新建召回 | /recalls/new | 创建召回范围 |
| 召回详情 | /recalls/:id | 召回详情、确认、发布 |
| 通知列表 | /notifications/list | 车主通知列表 |
| 通知详情 | /notifications/:id | 通知详情、发送 |
| 维修列表 | /repairs/list | 维修记录列表 |
| 新建维修 | /repairs/new | 创建维修记录 |
| 维修详情 | /repairs/:id | 维修详情、上传照片、完成 |
| 车型管理 | /base/models | 车型数据管理 |
| VIN管理 | /base/vins | VIN车辆数据管理 |
| 经销商管理 | /base/dealers | 经销商数据管理 |

## 开发规范

### 后端开发规范

1. **路由规范**: RESTful API 设计
2. **响应规范**: 统一使用 `pkg/response` 包返回
3. **认证规范**: 使用 JWT Token，中间件校验
4. **权限规范**: 基于角色的访问控制（RBAC）
5. **事务规范**: 关键操作使用数据库事务

### 前端开发规范

1. **组件规范**: 使用 Pro Components 高级组件
2. **请求规范**: 使用 `src/services/request.ts` 封装
3. **状态管理**: 使用 Umi Max 的 initialState 和 model
4. **路由规范**: 在 `.umirc.ts` 中集中配置
5. **权限规范**: 基于角色控制按钮和页面访问

## 部署说明

### 后端部署

```bash
# 构建
cd backend
go build -o recall-tracking .

# 运行
nohup ./recall-tracking > app.log 2>&1 &
```

### 前端部署

```bash
# 构建
cd frontend
npm run build

# 部署 dist 目录到 nginx
cp -r dist/* /var/www/recall-tracking/
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name recall.example.com;

    # 前端静态文件
    location / {
        root /var/www/recall-tracking;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 上传文件代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
    }
}
```

## 许可证

MIT License
