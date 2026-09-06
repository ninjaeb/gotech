import type { LeadFormErrorCode } from "@/lib/leads";

export type LeadFormLocale = "en" | "zh" | "ms";

export const LEAD_FORM_LOCALES: { code: LeadFormLocale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "BM" },
];

export const DEFAULT_LEAD_FORM_LOCALE: LeadFormLocale = "en";

export type LeadFormStrings = {
  heading: string;
  subheading: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneHint: string;
  companyLabel: string;
  companyPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  errors: Record<LeadFormErrorCode, string>;
};

export const LEAD_FORM_STRINGS: Record<LeadFormLocale, LeadFormStrings> = {
  en: {
    heading: "Let's build something",
    subheading: "Tell us about your project and we'll get back to you.",
    nameLabel: "Name",
    namePlaceholder: "Jane Smith",
    emailLabel: "Email",
    emailPlaceholder: "jane@company.com",
    phoneLabel: "Phone",
    phonePlaceholder: "+60 12 345 6789",
    phoneHint: "Include the country code with a + sign, e.g. +60 12 345 6789.",
    companyLabel: "Company",
    companyPlaceholder: "Optional",
    messageLabel: "What are you looking to build?",
    messagePlaceholder: "Tell us a bit about your project…",
    submit: "Get in touch",
    submitting: "Sending…",
    success: "Thanks! We'll be in touch shortly.",
    errors: {
      name_required: "Name is required",
      email_required: "Email is required",
      email_invalid: "Enter a valid email",
      phone_required: "Phone number is required",
      phone_invalid: "Include the country code with a + sign, e.g. +60 12 345 6789.",
      pipeline_not_ready: "The system isn't set up yet — please try again shortly.",
      rate_limited: "Too many attempts — please wait a few minutes and try again.",
      invalid_submission: "Please check the form and try again.",
      generic: "Something went wrong. Please try again.",
    },
  },
  zh: {
    heading: "让我们一起打造",
    subheading: "告诉我们您的项目详情，我们会尽快与您联系。",
    nameLabel: "姓名",
    namePlaceholder: "Jane Smith",
    emailLabel: "电子邮件",
    emailPlaceholder: "jane@company.com",
    phoneLabel: "电话号码",
    phonePlaceholder: "+60 12 345 6789",
    phoneHint: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
    companyLabel: "公司",
    companyPlaceholder: "选填",
    messageLabel: "您想打造什么项目？",
    messagePlaceholder: "简单介绍一下您的项目…",
    submit: "联系我们",
    submitting: "发送中…",
    success: "谢谢！我们会尽快与您联系。",
    errors: {
      name_required: "请填写姓名",
      email_required: "请填写电子邮件",
      email_invalid: "请输入有效的电子邮件地址",
      phone_required: "请填写电话号码",
      phone_invalid: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
      pipeline_not_ready: "系统尚未设置完成，请稍后再试。",
      rate_limited: "尝试次数过多，请稍等几分钟后再试。",
      invalid_submission: "请检查表单内容后重试。",
      generic: "出现错误，请重试。",
    },
  },
  ms: {
    heading: "Mari kita bina sesuatu",
    subheading: "Beritahu kami tentang projek anda dan kami akan menghubungi anda.",
    nameLabel: "Nama",
    namePlaceholder: "Jane Smith",
    emailLabel: "E-mel",
    emailPlaceholder: "jane@company.com",
    phoneLabel: "Nombor Telefon",
    phonePlaceholder: "+60 12 345 6789",
    phoneHint: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
    companyLabel: "Syarikat",
    companyPlaceholder: "Pilihan",
    messageLabel: "Apakah projek yang anda ingin bina?",
    messagePlaceholder: "Ceritakan sedikit tentang projek anda…",
    submit: "Hubungi Kami",
    submitting: "Menghantar…",
    success: "Terima kasih! Kami akan menghubungi anda tidak lama lagi.",
    errors: {
      name_required: "Nama diperlukan",
      email_required: "E-mel diperlukan",
      email_invalid: "Sila masukkan e-mel yang sah",
      phone_required: "Nombor telefon diperlukan",
      phone_invalid: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
      pipeline_not_ready: "Sistem belum bersedia — sila cuba sebentar lagi.",
      rate_limited: "Terlalu banyak percubaan — sila tunggu beberapa minit dan cuba lagi.",
      invalid_submission: "Sila semak borang dan cuba lagi.",
      generic: "Berlaku ralat. Sila cuba lagi.",
    },
  },
};

const STORAGE_KEY = "leadFormLang";

function isLeadFormLocale(value: unknown): value is LeadFormLocale {
  return value === "en" || value === "zh" || value === "ms";
}

// A tiny external store, read via useSyncExternalStore rather than a
// useState+useEffect pair — localStorage can't be read during the server
// render, so the server (and first client) render must report the default;
// React re-checks getLeadFormLocaleSnapshot right after hydration and
// re-renders if the visitor had actually picked something else previously.
let currentLocale: LeadFormLocale = DEFAULT_LEAD_FORM_LOCALE;
let hydratedFromStorage = false;
const listeners = new Set<() => void>();

function hydrateFromStorageOnce() {
  if (hydratedFromStorage) return;
  hydratedFromStorage = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLeadFormLocale(stored)) currentLocale = stored;
  } catch {
    // localStorage unavailable (privacy mode, etc.) — stick with the default.
  }
}

export function subscribeLeadFormLocale(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getLeadFormLocaleSnapshot(): LeadFormLocale {
  hydrateFromStorageOnce();
  return currentLocale;
}

export function getServerLeadFormLocaleSnapshot(): LeadFormLocale {
  return DEFAULT_LEAD_FORM_LOCALE;
}

export function setLeadFormLocale(next: LeadFormLocale) {
  currentLocale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore — not essential, the switcher still works for this visit.
  }
  listeners.forEach((listener) => listener());
}
