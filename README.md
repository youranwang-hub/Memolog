# Memolog

在线体验：[https://memolog-v6nv.vercel.app](https://memolog-v6nv.vercel.app)

> 把真实经历沉淀为可检索、可复用的个人记忆库。

Memolog 是一个面向学生和初入职场用户的个人第二大脑。它不是通用聊天工具，而是帮助你随手记录经历、保留细节，并在写简历、准备自我介绍或整理思路时，从自己的真实记忆中生成内容。

## 功能

- **AI 整理记忆**：输入一段自然语言经历，AI 提取日期、分类、标题、成果、内容、情绪与标签；保存前可逐项修改。
- **日期与阶段**：支持单日和阶段性经历；自定义日历可按月或按年切换。
- **记忆库**：按关键词、分类、时间筛选；支持查看、编辑和删除单条记忆。
- **个人分类**：在“档案”中自由添加或删除分类，记录、筛选与图谱会同步使用。
- **记忆图谱**：按分类、经历和标签展示关联，帮助发现经历之间的联系。
- **AI 生成**：基于个人档案和真实记忆生成简历、自我介绍或自定义内容。
- **生成历史**：自动保存生成内容，AI 会为新记录提炼短标题作为索引；正文支持 Markdown 渲染，原始需求可折叠查看。

## 技术栈

- [Next.js](https://nextjs.org/) 16 + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui / Base UI
- [Supabase](https://supabase.com/)：认证、PostgreSQL、行级安全策略（RLS）
- [DeepSeek API](https://www.deepseek.com/)：经历提炼与内容生成

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制并填写 `.env.local`：

```env
# Supabase（浏览器端可用）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# DeepSeek（仅服务端 API Route 使用，不能使用 NEXT_PUBLIC_ 前缀）
DEEPSEEK_API_KEY=your-deepseek-api-key

# 可选：注册邀请码
INVITE_CODE=your-invite-code
```

### 3. 初始化 Supabase

在 Supabase 项目的 **SQL Editor** 中执行 [supabase-schema.sql](./supabase-schema.sql)。脚本会创建：

- `memories`：用户记忆
- `profiles`：个人档案和自定义分类
- `generated_histories`：AI 生成历史

同时会创建 RLS 策略，用户只能访问自己的数据。

如果你的数据库是在较早版本创建的，请补充执行以下迁移：

```sql
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS event_date_end TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_categories TEXT[] NOT NULL DEFAULT '{}';
```

### 4. 启动开发服务

### 3.1 启用相关图片

在 Supabase 项目的 **SQL Editor** 中执行 [supabase-memory-images.sql](./supabase-memory-images.sql)。
它会创建私有图片 Bucket、附件表和按用户隔离的访问策略；支持 JPG、PNG、WebP，单张上限 5MB。

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。如本机 Turbopack 缓存出现权限问题，可改用：

```bash
npm run dev -- --webpack
```

## 常用命令

```bash
npm run lint     # ESLint 检查
npm run build    # 生产构建检查
npm run start    # 启动生产服务（需先 build）
```

## 项目结构

```text
src/
├── app/
│   ├── api/claude/       # AI 提炼与生成接口
│   ├── dashboard/        # 记忆库与图谱
│   ├── generate/         # 简历、自我介绍与自定义生成
│   ├── memory/[id]/      # 单条记忆详情与编辑
│   └── profile/          # 个人档案与分类管理
├── components/
│   ├── auth/             # 登录态与应用外壳
│   ├── memory/           # 记录表单、记忆卡片、图谱
│   └── ui/               # 复用 UI 组件
└── lib/                  # Supabase、AI、日期和数据访问封装
```

## 数据与隐私

- 数据按 Supabase 用户 ID 隔离，依赖 RLS 限制访问范围。
- AI 密钥仅在服务端路由中使用，切勿将 `DEEPSEEK_API_KEY` 暴露到浏览器端。
- 生成内容基于用户保存的记忆与档案；使用前请自行核对事实和措辞。

## 部署

推荐部署到 [Vercel](https://vercel.com/)。在项目环境变量中填入与 `.env.local` 相同的 Supabase 和 DeepSeek 配置，然后执行部署即可。

## 许可证

当前仓库未声明许可证。若准备公开发布，请补充合适的 LICENSE 文件。
