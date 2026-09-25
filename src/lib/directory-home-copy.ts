import type { DirectoryLocale } from "@/lib/directory-i18n";
import type { FaqEntry } from "@/lib/directory";

// The directory home page's own prose (see DirectoryHomeSections) — what
// the directory is, how it works, and its FAQ. Kept as plain, factual,
// self-contained statements on purpose: a search engine needs indexable
// text beyond a grid of names, and an AI answer engine quotes exactly this
// kind of sentence when asked "what is X / how do I contact Y". Every claim
// here is one the code actually guarantees (admin approval before publish,
// three real per-language URLs, replies via the lead form) — nothing
// aspirational. The FAQ doubles as FAQPage JSON-LD (see buildFaqJsonLd).
export type DirectoryHomeCopy = {
  aboutHeading: string;
  aboutBody: string;
  browseHeading: string;
  browseIntro: string;
  listingCount: (count: number) => string;
  browseLocationHeading: string;
  browseLocationIntro: string;
  howHeading: string;
  howSteps: { title: string; body: string }[];
  listCtaHeading: string;
  listCtaBody: string;
  faqs: FaqEntry[];
};

export const DIRECTORY_HOME_COPY: Record<DirectoryLocale, DirectoryHomeCopy> = {
  en: {
    aboutHeading: "About the Gotka Business Directory",
    aboutBody:
      "The Gotka Business Directory is a curated list of businesses in the Gotka partner network, published by Gotka Technologies. Every listing is reviewed before it goes live and has its own page covering the business's products and services, location, opening hours, and frequently asked questions — plus a contact form that reaches the business directly. The directory is free to browse and available in English, Chinese, and Malay.",
    browseHeading: "Browse by category",
    browseIntro: "Jump straight to the businesses in a category.",
    listingCount: (count) => (count === 1 ? "1 business" : `${count} businesses`),
    browseLocationHeading: "Browse by location",
    browseLocationIntro: "Jump straight to the businesses in a state or region.",
    howHeading: "How it works",
    howSteps: [
      {
        title: "Search or browse",
        body: "Filter by business name, product or service, industry, or category — results update as you type.",
      },
      {
        title: "Compare businesses",
        body: "Each listing shows its products and services (with prices where given), opening hours, location on a map, and FAQs.",
      },
      {
        title: "Get in touch",
        body: "Send a message from the listing page. It goes straight to the business, which replies to the email address you provide.",
      },
    ],
    listCtaHeading: "Own a business?",
    listCtaBody:
      "Create a business account, fill in your listing, and submit it for review. Once approved, your page is live in all three languages and inquiries come straight to you.",
    faqs: [
      {
        question: "What is the Gotka Business Directory?",
        answer:
          "A public directory of businesses in the Gotka partner network, run by Gotka Technologies. It lists each business's products and services, location, opening hours, and a direct contact form, in English, Chinese, and Malay.",
      },
      {
        question: "How do I contact a business listed here?",
        answer:
          "Open the business's page and use the Get in touch form. Your message goes straight to that business, and they reply to the email address you provide.",
      },
      {
        question: "How can I list my business?",
        answer:
          "Create a business account, fill in your listing (company details, products and services, opening hours, location, FAQ), and submit it for review. Once approved, your page is live in all three languages.",
      },
      {
        question: "Is every listing checked before it's published?",
        answer:
          "Yes. A listing only appears in the directory after it has been reviewed and approved by the Gotka team, and only the approved version is shown publicly.",
      },
      {
        question: "Which languages is the directory available in?",
        answer:
          "English, Chinese (简体中文), and Malay (Bahasa Melayu). Each language has its own URL — use the language switcher at the top of the page.",
      },
    ],
  },
  zh: {
    aboutHeading: "关于 Gotka 企业目录",
    aboutBody:
      "Gotka 企业目录由 Gotka Technologies 发布，收录 Gotka 合作伙伴网络中经过筛选的企业。每个企业在上线前都会经过审核，并拥有自己的页面，介绍其产品与服务、地点、营业时间和常见问题，还提供可直接联系该企业的联系表单。目录可免费浏览，提供英文、中文和马来文版本。",
    browseHeading: "按类别浏览",
    browseIntro: "直接查看某个类别下的企业。",
    listingCount: (count) => `${count} 家企业`,
    browseLocationHeading: "按地区浏览",
    browseLocationIntro: "直接查看某个州属或地区的企业。",
    howHeading: "使用方法",
    howSteps: [
      {
        title: "搜索或浏览",
        body: "按企业名称、产品或服务、行业或类别筛选——输入时结果即时更新。",
      },
      {
        title: "比较企业",
        body: "每个企业页面都列出其产品与服务（如有标价则一并显示）、营业时间、地图位置和常见问题。",
      },
      {
        title: "直接联系",
        body: "在企业页面发送信息，信息会直接送达该企业，他们会回复到您提供的电子邮件地址。",
      },
    ],
    listCtaHeading: "您是企业主？",
    listCtaBody: "创建企业账户，填写您的企业资料并提交审核。审核通过后，您的页面将以三种语言上线，咨询也会直接发送给您。",
    faqs: [
      {
        question: "什么是 Gotka 企业目录？",
        answer:
          "这是由 Gotka Technologies 运营的公开企业目录，收录 Gotka 合作伙伴网络中的企业。每个企业页面列出其产品与服务、地点、营业时间和直接联系表单，并提供英文、中文和马来文版本。",
      },
      {
        question: "如何联系目录中的企业？",
        answer: "打开该企业的页面，使用“联系我们”表单。您的信息会直接发送给该企业，他们会回复到您提供的电子邮件地址。",
      },
      {
        question: "如何刊登我的企业？",
        answer:
          "创建企业账户，填写您的企业资料（公司信息、产品与服务、营业时间、地点、常见问题），然后提交审核。审核通过后，您的页面将以三种语言上线。",
      },
      {
        question: "每个企业在发布前都会经过审核吗？",
        answer: "是的。企业资料只有在经过 Gotka 团队审核并批准后才会出现在目录中，公开显示的也仅是已批准的版本。",
      },
      {
        question: "目录提供哪些语言？",
        answer: "英文、中文（简体）和马来文。每种语言都有独立的网址——请使用页面顶部的语言切换器。",
      },
    ],
  },
  ms: {
    aboutHeading: "Tentang Direktori Perniagaan Gotka",
    aboutBody:
      "Direktori Perniagaan Gotka ialah senarai terpilih perniagaan dalam rangkaian rakan kongsi Gotka, diterbitkan oleh Gotka Technologies. Setiap penyenaraian disemak sebelum disiarkan dan mempunyai halaman sendiri yang merangkumi produk dan perkhidmatan, lokasi, waktu operasi dan soalan lazim perniagaan itu — serta borang hubungan yang terus sampai kepada perniagaan tersebut. Direktori ini percuma untuk dilayari dan tersedia dalam Bahasa Inggeris, Cina dan Melayu.",
    browseHeading: "Layari mengikut kategori",
    browseIntro: "Terus ke perniagaan dalam sesuatu kategori.",
    listingCount: (count) => `${count} perniagaan`,
    browseLocationHeading: "Layari mengikut lokasi",
    browseLocationIntro: "Terus ke perniagaan dalam sesuatu negeri atau kawasan.",
    howHeading: "Cara ia berfungsi",
    howSteps: [
      {
        title: "Cari atau layari",
        body: "Tapis mengikut nama perniagaan, produk atau perkhidmatan, industri atau kategori — hasil dikemas kini semasa anda menaip.",
      },
      {
        title: "Bandingkan perniagaan",
        body: "Setiap penyenaraian memaparkan produk dan perkhidmatannya (dengan harga jika diberikan), waktu operasi, lokasi di peta dan soalan lazim.",
      },
      {
        title: "Hubungi terus",
        body: "Hantar mesej dari halaman penyenaraian. Ia terus sampai kepada perniagaan itu, yang akan membalas ke alamat e-mel yang anda berikan.",
      },
    ],
    listCtaHeading: "Memiliki perniagaan?",
    listCtaBody:
      "Cipta akaun perniagaan, lengkapkan penyenaraian anda dan hantar untuk semakan. Setelah diluluskan, halaman anda disiarkan dalam ketiga-tiga bahasa dan pertanyaan terus sampai kepada anda.",
    faqs: [
      {
        question: "Apakah Direktori Perniagaan Gotka?",
        answer:
          "Direktori awam perniagaan dalam rangkaian rakan kongsi Gotka, dikendalikan oleh Gotka Technologies. Ia menyenaraikan produk dan perkhidmatan, lokasi, waktu operasi dan borang hubungan terus setiap perniagaan, dalam Bahasa Inggeris, Cina dan Melayu.",
      },
      {
        question: "Bagaimana saya menghubungi perniagaan yang disenaraikan di sini?",
        answer:
          "Buka halaman perniagaan itu dan gunakan borang Hubungi kami. Mesej anda terus sampai kepada perniagaan tersebut, dan mereka membalas ke alamat e-mel yang anda berikan.",
      },
      {
        question: "Bagaimana saya boleh menyenaraikan perniagaan saya?",
        answer:
          "Cipta akaun perniagaan, lengkapkan penyenaraian anda (butiran syarikat, produk dan perkhidmatan, waktu operasi, lokasi, soalan lazim) dan hantar untuk semakan. Setelah diluluskan, halaman anda disiarkan dalam ketiga-tiga bahasa.",
      },
      {
        question: "Adakah setiap penyenaraian disemak sebelum disiarkan?",
        answer:
          "Ya. Sesuatu penyenaraian hanya muncul dalam direktori selepas disemak dan diluluskan oleh pasukan Gotka, dan hanya versi yang diluluskan dipaparkan secara awam.",
      },
      {
        question: "Dalam bahasa apakah direktori ini tersedia?",
        answer:
          "Bahasa Inggeris, Cina (简体中文) dan Melayu (Bahasa Melayu). Setiap bahasa mempunyai URL sendiri — gunakan penukar bahasa di bahagian atas halaman.",
      },
    ],
  },
};
