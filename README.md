# Memolog

在线体验：[https://memolog-v6nv.vercel.app](https://memolog-v6nv.vercel.app)

> 把真实经历沉淀为可检索、可复用的个人记忆库。

Memolog 是面向学生和初入职场用户的个人记忆库：将自然语言经历整理为结构化记录，并基于真实内容生成可复用的表达。

## 功能

- **AI 整理记忆**：输入一段自然语言经历，AI 提取日期、分类、标题、成果、内容、情绪与标签；保存前可逐项修改。
- **日期与阶段**：支持单日和阶段性经历；自定义日历可按月或按年切换。
- **记忆库**：按关键词、分类、时间筛选；支持查看、编辑和删除单条记忆。
- **个人分类**：在“档案”中自由添加或删除分类，记录、筛选与图谱会同步使用。
- **经历回望**：按经历发生日期展示年度月份时间线，支持月份跳转和分类标记。
- **记忆图谱**：按分类、经历和标签展示关联，帮助发现经历之间的联系。
- **相关图片**：可为记忆添加图片；详情页支持站内大图预览，上传前会在设备本地优化图片体积以改善移动端体验。
- **AI 生成**：基于个人档案和真实记忆生成简历、自我介绍或自定义内容。
- **生成历史**：自动保存生成内容，从生成内容首行提取短标题作为索引；正文支持 Markdown 渲染，原始需求可折叠查看。

## 技术栈

- [Next.js](https://nextjs.org/) 16 + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui / Base UI
- [Supabase](https://supabase.com/)：认证、PostgreSQL、行级安全策略（RLS）
- [DeepSeek API](https://www.deepseek.com/)：经历提炼与内容生成

## 使用方式

### 使用在线版本

访问 [Memolog](https://memolog-v6nv.vercel.app)，注册或登录后即可使用。数据通过 Supabase 按账号隔离；个人网站同步仅对部署者指定的站主账号开放。

### 自行部署

克隆仓库并安装依赖：

```bash
git clone https://github.com/youranwang-hub/Memolog.git
cd Memolog/app
npm install
```

复制 `.env.example` 为 `.env.local`，完成以下配置后初始化 Supabase 并启动服务。

#### 环境变量

```env
# Supabase（浏览器端可用）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# DeepSeek（仅服务端 API Route 使用，不能使用 NEXT_PUBLIC_ 前缀）
DEEPSEEK_API_KEY=your-deepseek-api-key

# 可选：DeepSeek 模型，默认 deepseek-chat
DEEPSEEK_MODEL=deepseek-chat

# Cloudflare Turnstile（注册人机验证）
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

#### Supabase 初始化

在 Supabase 项目的 **SQL Editor** 中执行 [supabase-schema.sql](./supabase-schema.sql)。脚本会创建：

- `memories`：用户记忆
- `profiles`：个人档案和自定义分类
- `generated_histories`：AI 生成历史
- `personal_site_memories`：仅站主可编辑的个人网站公开版本；执行 [supabase-personal-site.sql](./supabase-personal-site.sql) 创建

同时会创建 RLS 策略，用户只能访问自己的数据。

如果你的数据库是在较早版本创建的，请补充执行以下迁移：

```sql
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS event_date_end TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_categories TEXT[] NOT NULL DEFAULT '{}';
```

#### 图片附件（可选）

在 Supabase 项目的 **SQL Editor** 中执行 [supabase-memory-images.sql](./supabase-memory-images.sql)。
它会创建私有图片 Bucket、附件表和按用户隔离的访问策略；支持 JPG、PNG、WebP，单张上限 5MB。

#### 启动与部署

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
npm test         # Node 测试
npm run build    # 生产构建检查
npm run start    # 启动生产服务（需先 build）
```

## 项目结构

```text
src/
├── app/
│   ├── api/deepseek/       # AI 提炼与生成接口
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
- 个人网站同步仅允许 `MEMOLOG_PERSONAL_SITE_OWNER_USER_ID`（或邮箱）指定的账号。GitHub Fine-grained Token 只配置在 Vercel 的 `GITHUB_PERSONAL_SITE_TOKEN`，浏览器和 Supabase 均不会收到它。
- 生成内容基于用户保存的记忆与档案；使用前请自行核对事实和措辞。
- 注册需要通过 Cloudflare Turnstile 人机验证；请同时在部署环境配置 Site Key 与 Secret Key。

部署到 [Vercel](https://vercel.com/) 时，填入与 `.env.local` 相同的服务端变量，并在 Supabase Auth 中将 `https://your-domain/auth/callback` 与 `https://your-domain/reset-password` 加入 Redirect URLs。

### 个人网站同步（可选）

执行 `supabase-personal-site.sql`，并在 Vercel 配置以下私密变量：

```env
MEMOLOG_PERSONAL_SITE_OWNER_USER_ID=your-supabase-user-id
GITHUB_PERSONAL_SITE_TOKEN=github-fine-grained-token
GITHUB_PERSONAL_SITE_REPO=your-account/personal-website
GITHUB_PERSONAL_SITE_BRANCH=main
```

Token 仅需目标仓库的 Contents 读写权限。原始记忆不会同步，只有经编辑确认的公开版本会写入目标栏目。

## 许可证

本项目采用 [MIT License](./LICENSE)。

## 实现说明

- AI 服务是 **DeepSeek**。新客户端使用 `/api/deepseek/extract` 和 `/api/deepseek/generate`；`/api/claude/*` 仅保留旧客户端兼容转发，不调用 Claude。
- 记忆可通过 AI 整理或手动保存。未知日期不会自动替换为当前月份。
- 列表按批次读取，搜索和时间筛选在本地完成，卡片逐批显示；历史每次读取 20 条摘要，正文按需加载。
- 生成从最近 200 条经历中按需求关键词选取最多 30 条，并限制单条上下文长度。界面会在只使用部分经历时提示；这不是完整的语义检索。
- DeepSeek 单次请求最多等待 45 秒。生成正文立即展示，历史失败可重试保存，不重复生成。
- 执行 `supabase-rate-limits.sql` 可启用跨 Vercel 实例的数据库原子限流（每用户、每类 AI 请求每分钟 20 次）。未执行迁移时降级为带过期清理和容量上限的单实例限流。
- 正文与图片属于不同存储操作，不能保证跨服务事务；界面区分正文已保存与图片失败，并保留可重试状态。
- 部署后需验证 Supabase 认证回调白名单包含网站的 `/auth/callback` 和 `/reset-password`。
