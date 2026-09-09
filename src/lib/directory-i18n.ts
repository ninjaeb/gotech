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
};

export const DIRECTORY_STRINGS: Record<DirectoryLocale, DirectoryStrings> = {
  en: {
    heroTitle: "Find the right partner for your project",
    heroSubtitle: "Browse trusted businesses in the Gotka partner network and reach out directly.",
    searchPlaceholder: "Search by company or service…",
    allIndustries: "All industries",
    noResultsTitle: "No partners found",
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
    contactSubheading: "Send a message directly to this partner — they'll reply to the email address you provide.",
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
    formSuccess: "Thanks! Your message has been sent — the partner will reply to your email directly.",
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
    footerTagline: "A directory of trusted partners in the Gotka network.",
    backToDirectory: "Back to directory",
  },
  zh: {
    heroTitle: "为您的项目寻找合适的合作伙伴",
    heroSubtitle: "浏览 Gotka 合作伙伴网络中值得信赖的企业，并直接联系他们。",
    searchPlaceholder: "按公司或服务搜索…",
    allIndustries: "所有行业",
    noResultsTitle: "未找到合作伙伴",
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
    contactSubheading: "直接给这家合作伙伴发送信息——他们会回复您提供的电子邮件地址。",
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
    formSuccess: "谢谢！您的信息已发送——合作伙伴会直接回复您的电子邮件。",
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
    footerTagline: "Gotka 合作伙伴网络中值得信赖的企业目录。",
    backToDirectory: "返回目录",
  },
  ms: {
    heroTitle: "Cari rakan kongsi yang sesuai untuk projek anda",
    heroSubtitle: "Semak imbas perniagaan yang dipercayai dalam rangkaian rakan kongsi Gotka dan hubungi terus.",
    searchPlaceholder: "Cari mengikut syarikat atau perkhidmatan…",
    allIndustries: "Semua industri",
    noResultsTitle: "Tiada rakan kongsi dijumpai",
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
    contactSubheading: "Hantar mesej terus kepada rakan kongsi ini — mereka akan membalas ke alamat e-mel yang anda berikan.",
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
    formSuccess: "Terima kasih! Mesej anda telah dihantar — rakan kongsi akan membalas terus ke e-mel anda.",
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
  },
};
