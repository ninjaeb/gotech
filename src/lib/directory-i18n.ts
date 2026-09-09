import type { Industry } from "@/generated/prisma/client";
import { INDUSTRY_LABELS } from "@/lib/labels";

// Same three languages as the public /lead form (src/lib/lead-form-i18n.ts)
// but kept as its own copy rather than shared — that file's locale type and
// list are specific to the lead-capture widget's own module state, and this
// one's locale is read server-side from a cookie (see directory-locale.ts)
// rather than localStorage, so the two aren't actually interchangeable.
export type DirectoryLocale = "en" | "zh" | "ms";

export const DIRECTORY_LOCALES: { code: DirectoryLocale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "BM" },
];

export const DEFAULT_DIRECTORY_LOCALE: DirectoryLocale = "en";

export type DirectoryLeadFormErrorCode =
  | "name_required"
  | "email_required"
  | "email_invalid"
  | "phone_required"
  | "phone_invalid"
  | "message_required"
  | "rate_limited"
  | "listing_not_found"
  | "invalid_submission"
  | "generic";

export type DirectoryDayLabels = {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
};

export type DirectoryStrings = {
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  allIndustries: string;
  allCategories: string;
  noResultsTitle: string;
  noResultsDescription: string;
  viewListing: string;
  servicesHeading: string;
  aboutHeading: string;
  faqHeading: string;
  visitHeading: string;
  hoursHeading: string;
  hoursOpenLabel: string;
  hoursOpenTodayLabel: string;
  hoursClosedLabel: string;
  hoursClosedTodayLabel: string;
  dayLabels: DirectoryDayLabels;
  websiteLabel: string;
  locationLabel: string;
  contactHeading: string;
  contactSubheading: string;
  formNameLabel: string;
  formNamePlaceholder: string;
  formEmailLabel: string;
  formEmailPlaceholder: string;
  formPhoneLabel: string;
  formPhonePlaceholder: string;
  formPhoneHint: string;
  formCompanyLabel: string;
  formCompanyPlaceholder: string;
  formMessageLabel: string;
  formMessagePlaceholder: string;
  formSubmit: string;
  formSubmitting: string;
  formSuccess: string;
  errors: Record<DirectoryLeadFormErrorCode, string>;
  footerTagline: string;
  backToDirectory: string;
  brandName: string;
  navLoginRegister: string;
  navMyBusiness: string;
  navGoToCrm: string;
  navSignOut: string;
  listBusinessCta: string;
  signupHeading: string;
  signupSubheading: string;
  signupCompanyLabel: string;
  signupCompanyPlaceholder: string;
  signupNameLabel: string;
  signupNamePlaceholder: string;
  signupEmailLabel: string;
  signupEmailPlaceholder: string;
  signupPhoneLabel: string;
  signupPhonePlaceholder: string;
  signupPhoneHint: string;
  signupPasswordLabel: string;
  signupPasswordHint: string;
  signupSubmit: string;
  signupSubmitting: string;
  signupOrDivider: string;
  signupGoogleCta: string;
  signupAlreadyPartner: string;
  signupSignInLink: string;
  signupErrors: Record<PartnerSignupErrorCode, string>;
};

export type PartnerSignupErrorCode =
  | "company_required"
  | "name_required"
  | "email_required"
  | "email_invalid"
  | "phone_invalid"
  | "password_length"
  | "email_taken"
  | "rate_limited"
  | "invalid_submission"
  | "generic"
  | "google_failed"
  | "google_unavailable"
  | "email_unverified"
  | "wrong_role";

export const DIRECTORY_STRINGS: Record<DirectoryLocale, DirectoryStrings> = {
  en: {
    heroTitle: "Find the right business for your project",
    heroSubtitle: "Browse trusted businesses in the Gotka network and reach out directly.",
    searchPlaceholder: "Search by company or service…",
    allIndustries: "All industries",
    allCategories: "All categories",
    noResultsTitle: "No businesses found",
    noResultsDescription: "Try a different search or industry filter.",
    viewListing: "View details",
    servicesHeading: "Products & Services",
    aboutHeading: "About",
    faqHeading: "Frequently asked questions",
    visitHeading: "Visit us",
    hoursHeading: "Hours",
    hoursOpenLabel: "Open",
    hoursOpenTodayLabel: "Open today",
    hoursClosedLabel: "Closed",
    hoursClosedTodayLabel: "Closed today",
    dayLabels: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    },
    websiteLabel: "Website",
    locationLabel: "Location",
    contactHeading: "Get in touch",
    contactSubheading: "Send a message directly to this business — they'll reply to the email address you provide.",
    formNameLabel: "Name",
    formNamePlaceholder: "Jane Smith",
    formEmailLabel: "Email",
    formEmailPlaceholder: "jane@company.com",
    formPhoneLabel: "Phone",
    formPhonePlaceholder: "+60 12 345 6789",
    formPhoneHint: "Include the country code with a + sign, e.g. +60 12 345 6789.",
    formCompanyLabel: "Company",
    formCompanyPlaceholder: "Optional",
    formMessageLabel: "What do you need help with?",
    formMessagePlaceholder: "Tell us a bit about your project…",
    formSubmit: "Send message",
    formSubmitting: "Sending…",
    formSuccess: "Thanks! Your message has been sent — the business will reply to your email directly.",
    errors: {
      name_required: "Name is required",
      email_required: "Email is required",
      email_invalid: "Enter a valid email",
      phone_required: "Phone number is required",
      phone_invalid: "Include the country code with a + sign, e.g. +60 12 345 6789.",
      message_required: "Tell us a bit about what you need",
      rate_limited: "Too many attempts — please wait a few minutes and try again.",
      listing_not_found: "This listing is no longer available.",
      invalid_submission: "Please check the form and try again.",
      generic: "Something went wrong. Please try again.",
    },
    footerTagline: "A directory of trusted businesses in the Gotka network.",
    backToDirectory: "Back to directory",
    brandName: "Business Directory",
    navLoginRegister: "Business Login",
    navMyBusiness: "My business",
    navGoToCrm: "Go to CRM",
    navSignOut: "Sign out",
    listBusinessCta: "List your business",
    signupHeading: "List your business",
    signupSubheading: "Join the business directory and start receiving inquiries directly from visitors.",
    signupCompanyLabel: "Business name",
    signupCompanyPlaceholder: "Acme Sdn Bhd",
    signupNameLabel: "Your name",
    signupNamePlaceholder: "Jane Smith",
    signupEmailLabel: "Email",
    signupEmailPlaceholder: "jane@company.com",
    signupPhoneLabel: "Phone",
    signupPhonePlaceholder: "+60 12 345 6789",
    signupPhoneHint: "Include the country code with a + sign, e.g. +60 12 345 6789.",
    signupPasswordLabel: "Password",
    signupPasswordHint: "At least 8 characters.",
    signupSubmit: "Create account",
    signupSubmitting: "Creating account…",
    signupOrDivider: "or",
    signupGoogleCta: "Continue with Google",
    signupAlreadyPartner: "Already have an account?",
    signupSignInLink: "Sign in",
    signupErrors: {
      company_required: "Business name is required",
      name_required: "Your name is required",
      email_required: "Email is required",
      email_invalid: "Enter a valid email",
      phone_invalid: "Include the country code with a + sign, e.g. +60 12 345 6789.",
      password_length: "Password must be at least 8 characters",
      email_taken: "An account with that email already exists. Try signing in instead.",
      rate_limited: "Too many attempts — please wait a few minutes and try again.",
      invalid_submission: "Please check the form and try again.",
      generic: "Something went wrong. Please try again.",
      google_failed: "Google sign-in failed. Please try again.",
      google_unavailable: "Google sign-in isn't available right now.",
      email_unverified: "Your Google account's email isn't verified.",
      wrong_role: "That Google account belongs to a staff member. Staff sign in at /system/login.",
    },
  },
  zh: {
    heroTitle: "为您的项目寻找合适的企业",
    heroSubtitle: "浏览 Gotka 网络中值得信赖的企业，并直接联系他们。",
    searchPlaceholder: "按公司或服务搜索…",
    allIndustries: "所有行业",
    allCategories: "所有类别",
    noResultsTitle: "未找到企业",
    noResultsDescription: "请尝试其他搜索词或行业筛选。",
    viewListing: "查看详情",
    servicesHeading: "产品与服务",
    aboutHeading: "关于",
    faqHeading: "常见问题",
    visitHeading: "联系地址",
    hoursHeading: "营业时间",
    hoursOpenLabel: "营业",
    hoursOpenTodayLabel: "今日营业",
    hoursClosedLabel: "休息",
    hoursClosedTodayLabel: "今日休息",
    dayLabels: {
      monday: "星期一",
      tuesday: "星期二",
      wednesday: "星期三",
      thursday: "星期四",
      friday: "星期五",
      saturday: "星期六",
      sunday: "星期日",
    },
    websiteLabel: "网站",
    locationLabel: "地点",
    contactHeading: "联系我们",
    contactSubheading: "直接给这家企业发送信息——他们会回复您提供的电子邮件地址。",
    formNameLabel: "姓名",
    formNamePlaceholder: "Jane Smith",
    formEmailLabel: "电子邮件",
    formEmailPlaceholder: "jane@company.com",
    formPhoneLabel: "电话号码",
    formPhonePlaceholder: "+60 12 345 6789",
    formPhoneHint: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
    formCompanyLabel: "公司",
    formCompanyPlaceholder: "选填",
    formMessageLabel: "您需要什么帮助？",
    formMessagePlaceholder: "简单介绍一下您的项目…",
    formSubmit: "发送信息",
    formSubmitting: "发送中…",
    formSuccess: "谢谢！您的信息已发送——该企业会直接回复您的电子邮件。",
    errors: {
      name_required: "请填写姓名",
      email_required: "请填写电子邮件",
      email_invalid: "请输入有效的电子邮件地址",
      phone_required: "请填写电话号码",
      phone_invalid: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
      message_required: "请简单说明您需要的帮助",
      rate_limited: "尝试次数过多，请稍等几分钟后再试。",
      listing_not_found: "该合作伙伴的资料已下架。",
      invalid_submission: "请检查表单内容后重试。",
      generic: "出现错误，请重试。",
    },
    footerTagline: "Gotka 网络中值得信赖的企业目录。",
    backToDirectory: "返回目录",
    brandName: "企业目录",
    navLoginRegister: "企业登录",
    navMyBusiness: "我的企业",
    navGoToCrm: "前往 CRM",
    navSignOut: "退出登录",
    listBusinessCta: "刊登您的企业",
    signupHeading: "刊登您的企业",
    signupSubheading: "加入企业目录，直接从访客那里获得咨询。",
    signupCompanyLabel: "企业名称",
    signupCompanyPlaceholder: "Acme Sdn Bhd",
    signupNameLabel: "您的姓名",
    signupNamePlaceholder: "Jane Smith",
    signupEmailLabel: "电子邮件",
    signupEmailPlaceholder: "jane@company.com",
    signupPhoneLabel: "电话号码",
    signupPhonePlaceholder: "+60 12 345 6789",
    signupPhoneHint: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
    signupPasswordLabel: "密码",
    signupPasswordHint: "至少 8 个字符。",
    signupSubmit: "创建账户",
    signupSubmitting: "正在创建账户…",
    signupOrDivider: "或",
    signupGoogleCta: "使用 Google 继续",
    signupAlreadyPartner: "已经有账户？",
    signupSignInLink: "登录",
    signupErrors: {
      company_required: "请填写企业名称",
      name_required: "请填写您的姓名",
      email_required: "请填写电子邮件",
      email_invalid: "请输入有效的电子邮件地址",
      phone_invalid: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
      password_length: "密码至少需要 8 个字符",
      email_taken: "该电子邮件已注册账户，请尝试登录。",
      rate_limited: "尝试次数过多，请稍等几分钟后再试。",
      invalid_submission: "请检查表单内容后重试。",
      generic: "出现错误，请重试。",
      google_failed: "Google 登录失败，请重试。",
      google_unavailable: "Google 登录目前不可用。",
      email_unverified: "您的 Google 账户电子邮件尚未验证。",
      wrong_role: "该 Google 账户属于员工账号。员工请在 /system/login 登录。",
    },
  },
  ms: {
    heroTitle: "Cari perniagaan yang sesuai untuk projek anda",
    heroSubtitle: "Semak imbas perniagaan yang dipercayai dalam rangkaian Gotka dan hubungi terus.",
    searchPlaceholder: "Cari mengikut syarikat atau perkhidmatan…",
    allIndustries: "Semua industri",
    allCategories: "Semua kategori",
    noResultsTitle: "Tiada perniagaan dijumpai",
    noResultsDescription: "Cuba carian atau penapis industri yang lain.",
    viewListing: "Lihat butiran",
    servicesHeading: "Produk & Perkhidmatan",
    aboutHeading: "Tentang",
    faqHeading: "Soalan lazim",
    visitHeading: "Lawati kami",
    hoursHeading: "Waktu Operasi",
    hoursOpenLabel: "Buka",
    hoursOpenTodayLabel: "Buka hari ini",
    hoursClosedLabel: "Tutup",
    hoursClosedTodayLabel: "Tutup hari ini",
    dayLabels: {
      monday: "Isnin",
      tuesday: "Selasa",
      wednesday: "Rabu",
      thursday: "Khamis",
      friday: "Jumaat",
      saturday: "Sabtu",
      sunday: "Ahad",
    },
    websiteLabel: "Laman web",
    locationLabel: "Lokasi",
    contactHeading: "Hubungi kami",
    contactSubheading: "Hantar mesej terus kepada perniagaan ini — mereka akan membalas ke alamat e-mel yang anda berikan.",
    formNameLabel: "Nama",
    formNamePlaceholder: "Jane Smith",
    formEmailLabel: "E-mel",
    formEmailPlaceholder: "jane@company.com",
    formPhoneLabel: "Nombor Telefon",
    formPhonePlaceholder: "+60 12 345 6789",
    formPhoneHint: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
    formCompanyLabel: "Syarikat",
    formCompanyPlaceholder: "Pilihan",
    formMessageLabel: "Apakah bantuan yang anda perlukan?",
    formMessagePlaceholder: "Ceritakan sedikit tentang projek anda…",
    formSubmit: "Hantar mesej",
    formSubmitting: "Menghantar…",
    formSuccess: "Terima kasih! Mesej anda telah dihantar — perniagaan ini akan membalas terus ke e-mel anda.",
    errors: {
      name_required: "Nama diperlukan",
      email_required: "E-mel diperlukan",
      email_invalid: "Sila masukkan e-mel yang sah",
      phone_required: "Nombor telefon diperlukan",
      phone_invalid: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
      message_required: "Beritahu kami sedikit tentang apa yang anda perlukan",
      rate_limited: "Terlalu banyak percubaan — sila tunggu beberapa minit dan cuba lagi.",
      listing_not_found: "Penyenaraian ini tidak lagi tersedia.",
      invalid_submission: "Sila semak borang dan cuba lagi.",
      generic: "Berlaku ralat. Sila cuba lagi.",
    },
    footerTagline: "Direktori perniagaan yang dipercayai dalam rangkaian Gotka.",
    backToDirectory: "Kembali ke direktori",
    brandName: "Direktori Perniagaan",
    navLoginRegister: "Log Masuk Perniagaan",
    navMyBusiness: "Perniagaan saya",
    navGoToCrm: "Pergi ke CRM",
    navSignOut: "Log keluar",
    listBusinessCta: "Senaraikan perniagaan anda",
    signupHeading: "Senaraikan perniagaan anda",
    signupSubheading: "Sertai direktori perniagaan dan mula menerima pertanyaan terus daripada pelawat.",
    signupCompanyLabel: "Nama perniagaan",
    signupCompanyPlaceholder: "Acme Sdn Bhd",
    signupNameLabel: "Nama anda",
    signupNamePlaceholder: "Jane Smith",
    signupEmailLabel: "E-mel",
    signupEmailPlaceholder: "jane@company.com",
    signupPhoneLabel: "Nombor Telefon",
    signupPhonePlaceholder: "+60 12 345 6789",
    signupPhoneHint: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
    signupPasswordLabel: "Kata laluan",
    signupPasswordHint: "Sekurang-kurangnya 8 aksara.",
    signupSubmit: "Cipta akaun",
    signupSubmitting: "Mencipta akaun…",
    signupOrDivider: "atau",
    signupGoogleCta: "Teruskan dengan Google",
    signupAlreadyPartner: "Sudah mempunyai akaun?",
    signupSignInLink: "Log masuk",
    signupErrors: {
      company_required: "Nama perniagaan diperlukan",
      name_required: "Nama anda diperlukan",
      email_required: "E-mel diperlukan",
      email_invalid: "Sila masukkan e-mel yang sah",
      phone_invalid: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
      password_length: "Kata laluan mesti sekurang-kurangnya 8 aksara",
      email_taken: "Akaun dengan e-mel itu sudah wujud. Cuba log masuk sebaliknya.",
      rate_limited: "Terlalu banyak percubaan — sila tunggu beberapa minit dan cuba lagi.",
      invalid_submission: "Sila semak borang dan cuba lagi.",
      generic: "Berlaku ralat. Sila cuba lagi.",
      google_failed: "Log masuk Google gagal. Sila cuba lagi.",
      google_unavailable: "Log masuk Google tidak tersedia sekarang.",
      email_unverified: "E-mel akaun Google anda belum disahkan.",
      wrong_role: "Akaun Google itu milik kakitangan. Kakitangan log masuk di /system/login.",
    },
  },
};

// Industry is a fixed enum shared with the internal /system CRM (see
// INDUSTRY_LABELS in src/lib/labels.ts, English-only — that side isn't
// trilingual, see src/app/system/(dashboard)/settings/directory/page.tsx's
// own comment on why). The public directory needs the same 20 values in
// all three locales; "en" reuses INDUSTRY_LABELS directly rather than
// duplicating those strings a second time.
export const INDUSTRY_LABELS_BY_LOCALE: Record<DirectoryLocale, Record<Industry, string>> = {
  en: INDUSTRY_LABELS,
  zh: {
    TECHNOLOGY: "科技",
    RETAIL_ECOMMERCE: "零售与电子商务",
    HEALTHCARE: "医疗保健",
    FINANCE_BANKING: "金融与银行",
    MANUFACTURING: "制造业",
    CONSTRUCTION_REAL_ESTATE: "建筑与房地产",
    EDUCATION: "教育",
    HOSPITALITY_TOURISM: "酒店与旅游",
    PROFESSIONAL_SERVICES: "专业服务",
    MEDIA_ENTERTAINMENT: "媒体与娱乐",
    TRANSPORTATION_LOGISTICS: "运输与物流",
    AGRICULTURE: "农业",
    ENERGY_UTILITIES: "能源与公用事业",
    GOVERNMENT_NONPROFIT: "政府与非营利组织",
    TELECOMMUNICATIONS: "电信",
    AUTOMOTIVE: "汽车",
    FOOD_BEVERAGE: "餐饮",
    LEGAL: "法律",
    MARKETING_ADVERTISING: "市场营销与广告",
    OTHER: "其他",
  },
  ms: {
    TECHNOLOGY: "Teknologi",
    RETAIL_ECOMMERCE: "Runcit & E-dagang",
    HEALTHCARE: "Penjagaan Kesihatan",
    FINANCE_BANKING: "Kewangan & Perbankan",
    MANUFACTURING: "Pembuatan",
    CONSTRUCTION_REAL_ESTATE: "Pembinaan & Hartanah",
    EDUCATION: "Pendidikan",
    HOSPITALITY_TOURISM: "Hospitaliti & Pelancongan",
    PROFESSIONAL_SERVICES: "Perkhidmatan Profesional",
    MEDIA_ENTERTAINMENT: "Media & Hiburan",
    TRANSPORTATION_LOGISTICS: "Pengangkutan & Logistik",
    AGRICULTURE: "Pertanian",
    ENERGY_UTILITIES: "Tenaga & Utiliti",
    GOVERNMENT_NONPROFIT: "Kerajaan & Bukan Untung",
    TELECOMMUNICATIONS: "Telekomunikasi",
    AUTOMOTIVE: "Automotif",
    FOOD_BEVERAGE: "Makanan & Minuman",
    LEGAL: "Undang-undang",
    MARKETING_ADVERTISING: "Pemasaran & Pengiklanan",
    OTHER: "Lain-lain",
  },
};
