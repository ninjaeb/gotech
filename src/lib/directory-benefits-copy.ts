import type { DirectoryLocale } from "@/lib/directory-i18n";

// The public "why list here" page (src/app/[locale]/business/benefits) —
// kept as its own copy file, same pattern as directory-home-copy.ts, so the
// page component stays a plain layout and every claim below is checked in
// one place. Every claim is something this codebase actually does (see the
// linked file for each group) rather than generic directory-listing sales
// copy — the review step, the per-language pages, the IndexNow pings, the
// server-rendered JSON-LD, the leads dashboard, and the referral links are
// all real, working features, not aspirational ones.
export type DirectoryBenefitItem = { title: string; body: string };
export type DirectoryBenefitGroup = { heading: string; items: DirectoryBenefitItem[] };

export type DirectoryBenefitsCopy = {
  seoTitle: string;
  seoDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  groups: DirectoryBenefitGroup[];
  ctaHeading: string;
  ctaBody: string;
};

export const DIRECTORY_BENEFITS_COPY: Record<DirectoryLocale, DirectoryBenefitsCopy> = {
  en: {
    seoTitle: "Why List Your Business on the Gotka Business Directory",
    seoDescription:
      "See what a Gotka Business Directory listing includes: a page in three languages, fast search-engine indexing, AI-answer-engine visibility, and inquiries that land straight in your own leads dashboard.",
    heroEyebrow: "For business owners",
    heroTitle: "Why list your business here",
    heroSubtitle:
      "A Gotka Business Directory listing is a real page working for you — searchable, shareable, and built to be found by both search engines and AI answer tools.",
    groups: [
      {
        heading: "Get found in search",
        items: [
          {
            title: "Your own page, in three languages",
            body: "Every listing gets a dedicated page at gotka.com in English, Chinese, and Malay — each a real, indexable URL, not a translated copy hidden behind one language.",
          },
          {
            title: "Indexed fast, not eventually",
            body: "The moment your listing is approved or updated, the directory notifies search engines directly instead of waiting for their next routine crawl.",
          },
          {
            title: "Backed by the whole directory's authority",
            body: "Your page sits on an established domain alongside every other listing and category page, rather than starting from zero the way a brand-new standalone website would.",
          },
        ],
      },
      {
        heading: "Be found by AI answer engines",
        items: [
          {
            title: "Built the way AI crawlers can actually read",
            body: "Listing pages are plain server-rendered HTML with structured data describing your business, location, and FAQs — the format AI answer tools like ChatGPT and Perplexity can read, unlike directories that only render in JavaScript.",
          },
          {
            title: "Open to AI crawlers by design",
            body: "The directory's crawler policy explicitly allows AI answer engines to index listings, so your business can be cited in an AI-generated answer, not just a traditional search result.",
          },
        ],
      },
      {
        heading: "Turn visitors into leads",
        items: [
          {
            title: "Inquiries land in your own dashboard",
            body: "A visitor can message you straight from your listing page. It shows up in your business portal's leads dashboard — tracked from New through Won — not buried in a shared inbox.",
          },
          {
            title: "Trackable referral links",
            body: "The Recommend and Share buttons on your listing carry a referral link, so you can see when someone's sharing your page and how much traffic it sends you.",
          },
        ],
      },
      {
        heading: "Low effort, fully in your control",
        items: [
          {
            title: "Free to list",
            body: "Creating an account and publishing a listing costs nothing.",
          },
          {
            title: "One edit, live everywhere",
            body: "Update your listing once and the change goes live across all three languages — no separate pages to keep in sync.",
          },
          {
            title: "Reviewed once, yours after that",
            body: "A team member checks your listing before it first goes live. After that, you can update it and resubmit changes whenever your business does.",
          },
        ],
      },
    ],
    ctaHeading: "Ready to get listed?",
    ctaBody: "Create a business account and fill in your listing — it's live in all three languages once approved.",
  },
  zh: {
    seoTitle: "为什么要在 Gotka 企业目录刊登您的企业",
    seoDescription:
      "了解 Gotka 企业目录刊登包含哪些内容：三语页面、快速的搜索引擎收录、AI 问答引擎可见度，以及直接进入您自己潜在客户仪表板的咨询。",
    heroEyebrow: "致企业主",
    heroTitle: "为什么要在这里刊登您的企业",
    heroSubtitle: "Gotka 企业目录的刊登页面真正为您所用——可被搜索到、可被分享，并专为搜索引擎与 AI 问答工具而设计。",
    groups: [
      {
        heading: "让企业被搜索到",
        items: [
          {
            title: "拥有自己的三语页面",
            body: "每个刊登条目都会在 gotka.com 上获得专属页面，提供英文、中文和马来文版本——每种语言都是真实、可被收录的网址，而非隐藏在单一语言背后的翻译副本。",
          },
          {
            title: "快速收录，无需等待",
            body: "刊登条目一经审核通过或更新，目录会立即通知搜索引擎，而不必等待它们下一次的常规抓取。",
          },
          {
            title: "借助整个目录的权重",
            body: "您的页面与目录中其他所有刊登条目及类别页面处于同一个成熟域名之下，而不是像全新的独立网站那样从零开始。",
          },
        ],
      },
      {
        heading: "让 AI 问答引擎也能找到您",
        items: [
          {
            title: "以 AI 爬虫真正可读的方式构建",
            body: "刊登页面是纯服务器渲染的 HTML，并附有描述您企业、地点与常见问题的结构化数据——这正是 ChatGPT、Perplexity 等 AI 问答工具能够读取的格式，而仅靠 JavaScript 渲染的目录则无法被读取。",
          },
          {
            title: "刻意对 AI 爬虫开放",
            body: "目录的爬虫政策明确允许 AI 问答引擎收录刊登内容，让您的企业有机会出现在 AI 生成的回答中，而不仅仅是传统搜索结果里。",
          },
        ],
      },
      {
        heading: "把访客变成潜在客户",
        items: [
          {
            title: "咨询直接进入您自己的仪表板",
            body: "访客可以直接从您的刊登页面给您发送信息，该信息会出现在您商家门户的潜在客户仪表板中——从「新」一路追踪到「成交」，而不会被埋没在共用收件箱里。",
          },
          {
            title: "可追踪的推荐链接",
            body: "刊登页面上的「推荐」与「分享」按钮都带有推荐链接，让您能看到何时有人分享您的页面，以及它为您带来了多少流量。",
          },
        ],
      },
      {
        heading: "轻松上线，完全由您掌控",
        items: [
          {
            title: "刊登完全免费",
            body: "创建账户和发布刊登条目均不收取任何费用。",
          },
          {
            title: "一次修改，处处生效",
            body: "只需修改一次，更改就会同步在三种语言中生效上线——无需分别维护多个页面。",
          },
          {
            title: "只需审核一次，之后由您掌控",
            body: "团队成员会在您的刊登首次上线前进行审核。此后，您可以随时更新内容并重新提交审核，与您企业的实际情况保持同步。",
          },
        ],
      },
    ],
    ctaHeading: "准备好刊登了吗？",
    ctaBody: "创建企业账户并填写您的刊登资料——审核通过后即会以三种语言同步上线。",
  },
  ms: {
    seoTitle: "Kenapa Senaraikan Perniagaan Anda di Direktori Perniagaan Gotka",
    seoDescription:
      "Lihat apa yang disertakan dalam penyenaraian Direktori Perniagaan Gotka: halaman dalam tiga bahasa, pengindeksan enjin carian yang pantas, keterlihatan pada enjin jawapan AI, dan pertanyaan yang terus masuk ke papan pemuka prospek anda sendiri.",
    heroEyebrow: "Untuk pemilik perniagaan",
    heroTitle: "Kenapa senaraikan perniagaan anda di sini",
    heroSubtitle:
      "Penyenaraian Direktori Perniagaan Gotka ialah halaman sebenar yang bekerja untuk anda — boleh dicari, boleh dikongsi, dan direka untuk ditemui oleh enjin carian mahupun alat jawapan AI.",
    groups: [
      {
        heading: "Ditemui dalam carian",
        items: [
          {
            title: "Halaman sendiri, dalam tiga bahasa",
            body: "Setiap penyenaraian mendapat halaman khusus di gotka.com dalam Bahasa Inggeris, Cina dan Melayu — setiap satu URL sebenar yang boleh diindeks, bukan sekadar salinan terjemahan yang tersembunyi di sebalik satu bahasa.",
          },
          {
            title: "Diindeks dengan pantas, bukan lambat-laun",
            body: "Sebaik sahaja penyenaraian anda diluluskan atau dikemas kini, direktori terus memberitahu enjin carian dan tidak menunggu imbasan rutin seterusnya.",
          },
          {
            title: "Disokong oleh kredibiliti seluruh direktori",
            body: "Halaman anda berada dalam domain yang sudah mantap bersama setiap penyenaraian dan halaman kategori yang lain, berbanding bermula dari sifar seperti laman web berasingan yang baharu.",
          },
        ],
      },
      {
        heading: "Ditemui oleh enjin jawapan AI",
        items: [
          {
            title: "Dibina dengan cara yang boleh dibaca oleh crawler AI",
            body: "Halaman penyenaraian adalah HTML biasa yang dijana oleh pelayan, lengkap dengan data berstruktur yang menerangkan perniagaan, lokasi dan soalan lazim anda — format yang boleh dibaca oleh alat jawapan AI seperti ChatGPT dan Perplexity, tidak seperti direktori yang hanya dipaparkan melalui JavaScript.",
          },
          {
            title: "Terbuka kepada crawler AI secara sengaja",
            body: "Dasar crawler direktori ini secara khusus membenarkan enjin jawapan AI mengindeks penyenaraian, jadi perniagaan anda berpeluang disebut dalam jawapan yang dijana AI, bukan sekadar dalam hasil carian biasa.",
          },
        ],
      },
      {
        heading: "Tukar pelawat menjadi prospek",
        items: [
          {
            title: "Pertanyaan terus masuk ke papan pemuka anda sendiri",
            body: "Pelawat boleh menghantar mesej terus dari halaman penyenaraian anda. Ia muncul dalam papan pemuka prospek portal perniagaan anda — dijejaki dari Baharu hingga Menang — bukan tertimbus dalam peti masuk yang dikongsi.",
          },
          {
            title: "Pautan rujukan yang boleh dijejaki",
            body: "Butang Syorkan dan Kongsi pada penyenaraian anda membawa pautan rujukan, jadi anda dapat melihat bila seseorang berkongsi halaman anda dan berapa banyak trafik yang dibawanya.",
          },
        ],
      },
      {
        heading: "Usaha minimum, kawalan sepenuhnya di tangan anda",
        items: [
          {
            title: "Percuma untuk disenaraikan",
            body: "Mencipta akaun dan menerbitkan penyenaraian tidak dikenakan sebarang bayaran.",
          },
          {
            title: "Satu suntingan, terus disiarkan di mana-mana",
            body: "Kemas kini penyenaraian anda sekali dan perubahan itu terus disiarkan dalam ketiga-tiga bahasa — tiada halaman berasingan untuk diselaraskan.",
          },
          {
            title: "Disemak sekali, kawalan milik anda selepas itu",
            body: "Ahli pasukan akan menyemak penyenaraian anda sebelum ia disiarkan buat kali pertama. Selepas itu, anda boleh mengemas kini dan menghantar semula perubahan bila-bila masa perniagaan anda berubah.",
          },
        ],
      },
    ],
    ctaHeading: "Bersedia untuk disenaraikan?",
    ctaBody: "Cipta akaun perniagaan dan lengkapkan penyenaraian anda — ia akan disiarkan dalam ketiga-tiga bahasa sebaik sahaja diluluskan.",
  },
};
