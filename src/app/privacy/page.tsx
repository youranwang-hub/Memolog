import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="journal-page privacy-page">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回登录</Link>
      <h1 className="editorial-title">隐私与 AI 使用说明</h1>
      <p className="privacy-updated">最后更新：2026 年 9 月 9 日</p>
      <section><h2>我们收集什么</h2><p>你主动填写的账号邮箱、档案信息、经历记录、图片和生成历史，会用于提供 Memolog 的记录、检索和生成服务。</p></section>
      <section><h2>数据如何保存</h2><p>数据存储在 Supabase，并按账号隔离。除非你主动使用个人网站发布功能，其他用户无法查看你的记忆。请不要在记录中填写密码、身份证号、银行卡号等高度敏感信息。</p></section>
      <section><h2>AI 如何使用你的内容</h2><p>当你主动点击“AI 整理”或“生成”时，所需的经历和档案片段会发送至 DeepSeek API 处理。AI 输出仅供辅助参考，不应替代你对简历、事实陈述或重要决定的最终判断。</p></section>
      <section><h2>你的选择</h2><p>你可以编辑或删除自己的记忆和生成历史。删除记忆后，它不会再出现在你的记忆库中；如需删除账户或咨询数据问题，请联系产品维护者。</p></section>
      <section><h2>服务安全</h2><p>注册时使用 Cloudflare Turnstile 进行人机验证，以减少滥用。我们会持续改进服务安全，但互联网传输不存在绝对安全保证。</p></section>
    </main>
  );
}
