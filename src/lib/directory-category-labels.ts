import type { DirectoryLocale } from "@/lib/directory-i18n";
import { DIRECTORY_SITE_NAME_BY_LOCALE } from "@/lib/directory-seo";

// BusinessCategory rows only ever store an English name (see
// prisma/migrations/20260909170000_seed_business_categories and
// prisma/migrations/20260926090000_expand_business_categories) and a
// PublishedListingSnapshot only ever stores that same English name (see
// buildPublishedSnapshot in src/lib/directory.ts, which resolves
// listing.categories to plain category.name strings at approval time,
// discarding the row's id) — so translating a category for display can only
// key off that English string, not an id. Keyed by the exact name seeded in
// those migrations; a category name with no entry here (shouldn't happen —
// the list is fixed, not admin-editable, see business-categories.ts) just
// falls back to its English name rather than showing nothing.
const CATEGORY_TRANSLATIONS: Record<string, { zh: string; ms: string }> = {
  "Accounting & Bookkeeping": { zh: "会计与簿记", ms: "Perakaunan & Pembukuan" },
  "Advertising Agency": { zh: "广告代理", ms: "Agensi Pengiklanan" },
  "Aesthetic & Cosmetic Clinic": { zh: "医美与美容诊所", ms: "Klinik Estetik & Kecantikan" },
  "Agriculture & Farming": { zh: "农业与耕作", ms: "Pertanian & Perladangan" },
  Agrotechnology: { zh: "农业科技", ms: "Agroteknologi" },
  "AI & Machine Learning Consulting": { zh: "人工智能与机器学习咨询", ms: "Perundingan AI & Pembelajaran Mesin" },
  "Air Conditioning & HVAC": { zh: "空调与暖通空调", ms: "Penyaman Udara & HVAC" },
  "Animation & Motion Graphics": { zh: "动画与动态图形", ms: "Animasi & Grafik Gerak" },
  "App Development": { zh: "应用程序开发", ms: "Pembangunan Aplikasi" },
  Architecture: { zh: "建筑设计", ms: "Seni Bina" },
  "Auto Repair & Maintenance": { zh: "汽车维修与保养", ms: "Pembaikan & Penyelenggaraan Kereta" },
  "Automotive Dealership": { zh: "汽车经销商", ms: "Peniaga Automotif" },
  "Aviation Services": { zh: "航空服务", ms: "Perkhidmatan Penerbangan" },
  "Bakery & Confectionery": { zh: "烘焙与糖果", ms: "Bakeri & Gula-gula" },
  "Banking & Financial Services": { zh: "银行与金融服务", ms: "Perbankan & Perkhidmatan Kewangan" },
  "Bar & Nightlife": { zh: "酒吧与夜生活", ms: "Bar & Hiburan Malam" },
  "Beauty, Spa & Wellness": { zh: "美容、水疗与健康", ms: "Kecantikan, Spa & Kesejahteraan" },
  "Blockchain & Web3": { zh: "区块链与Web3", ms: "Blockchain & Web3" },
  "Bookstore & Stationery": { zh: "书店与文具", ms: "Kedai Buku & Alat Tulis" },
  "Branding & Graphic Design": { zh: "品牌与平面设计", ms: "Penjenamaan & Reka Bentuk Grafik" },
  "Business Consulting": { zh: "商业咨询", ms: "Perundingan Perniagaan" },
  "Business Process Outsourcing (BPO)": { zh: "商业流程外包", ms: "Penyumberan Luar Proses Perniagaan" },
  "Car Rental": { zh: "汽车租赁", ms: "Sewa Kereta" },
  "Car Wash & Detailing": { zh: "洗车与美容服务", ms: "Cucian & Perincian Kereta" },
  Catering: { zh: "餐饮服务", ms: "Katering" },
  "Childcare & Early Education": { zh: "幼儿托管与早期教育", ms: "Penjagaan Kanak-kanak & Pendidikan Awal" },
  "Cleaning Services": { zh: "清洁服务", ms: "Perkhidmatan Pembersihan" },
  "Cloud & IT Infrastructure": { zh: "云计算与IT基础设施", ms: "Awan & Infrastruktur IT" },
  "Coffee Roaster & Café Supply": { zh: "咖啡烘焙与咖啡馆供应", ms: "Pemanggang Kopi & Bekalan Kafe" },
  "Company Secretarial Services": { zh: "公司秘书服务", ms: "Perkhidmatan Setiausaha Syarikat" },
  Construction: { zh: "建筑施工", ms: "Pembinaan" },
  "Content Marketing": { zh: "内容营销", ms: "Pemasaran Kandungan" },
  "Convenience Store": { zh: "便利店", ms: "Kedai Serbaneka" },
  "Courier & Delivery": { zh: "快递与配送", ms: "Kurier & Penghantaran" },
  Cybersecurity: { zh: "网络安全", ms: "Keselamatan Siber" },
  "Data Analytics & BI": { zh: "数据分析与商业智能", ms: "Analitik Data & BI" },
  "Debt Collection & Recovery": { zh: "债务催收与追偿", ms: "Kutipan & Pemulihan Hutang" },
  "Dental Services": { zh: "牙科服务", ms: "Perkhidmatan Pergigian" },
  "Digital Marketing": { zh: "数字营销", ms: "Pemasaran Digital" },
  "Domestic Helper & Maid Agency": { zh: "家庭帮佣中介", ms: "Agensi Pembantu Rumah" },
  "Driving School": { zh: "驾驶学院", ms: "Sekolah Memandu" },
  "E-commerce": { zh: "电子商务", ms: "E-dagang" },
  "Education & Training": { zh: "教育与培训", ms: "Pendidikan & Latihan" },
  "Electrical Services": { zh: "电气服务", ms: "Perkhidmatan Elektrik" },
  "Electronics & Appliances": { zh: "电子产品与电器", ms: "Elektronik & Perkakas" },
  "Engineering Services": { zh: "工程服务", ms: "Perkhidmatan Kejuruteraan" },
  "Entertainment & Events": { zh: "娱乐与活动", ms: "Hiburan & Acara" },
  "Environmental & ESG Consulting": { zh: "环境与ESG咨询", ms: "Perundingan Alam Sekitar & ESG" },
  "Event Planning": { zh: "活动策划", ms: "Perancangan Acara" },
  "Fashion & Apparel": { zh: "时尚与服装", ms: "Fesyen & Pakaian" },
  "Financial Advisory": { zh: "财务顾问", ms: "Penasihat Kewangan" },
  "Fisheries & Aquaculture": { zh: "渔业与水产养殖", ms: "Perikanan & Akuakultur" },
  "Fitness & Gym": { zh: "健身与健身房", ms: "Kecergasan & Gimnasium" },
  "Flooring & Tiling": { zh: "地板与瓷砖工程", ms: "Lantai & Jubin" },
  "Food & Beverage": { zh: "餐饮食品", ms: "Makanan & Minuman" },
  "Food & Beverage Manufacturing": { zh: "食品饮料制造", ms: "Pembuatan Makanan & Minuman" },
  "Food Truck & Hawker": { zh: "餐车与小贩摊位", ms: "Trak Makanan & Penjaja" },
  "Freight & Shipping": { zh: "货运与航运", ms: "Pengangkutan Kargo & Penghantaran" },
  "Funeral & Bereavement Services": { zh: "殡葬服务", ms: "Perkhidmatan Pengebumian" },
  "Furniture & Home Decor": { zh: "家具与家居装饰", ms: "Perabot & Hiasan Rumah" },
  "Furniture Manufacturing": { zh: "家具制造", ms: "Pembuatan Perabot" },
  "Game Development": { zh: "游戏开发", ms: "Pembangunan Permainan" },
  "General Trading": { zh: "一般贸易", ms: "Perdagangan Am" },
  "Glass & Aluminum Works": { zh: "玻璃与铝材工程", ms: "Kerja Kaca & Aluminium" },
  "Government & Public Sector": { zh: "政府与公共部门", ms: "Kerajaan & Sektor Awam" },
  "Hair Salon & Barbershop": { zh: "发廊与理发店", ms: "Salun Rambut & Kedai Gunting Rambut" },
  "Hardware & Tools": { zh: "五金与工具", ms: "Perkakasan & Alatan" },
  "Healthcare Services": { zh: "医疗保健服务", ms: "Perkhidmatan Penjagaan Kesihatan" },
  "Homestay & Vacation Rental": { zh: "民宿与度假屋租赁", ms: "Homestay & Sewaan Percutian" },
  "Hotel & Resort": { zh: "酒店与度假村", ms: "Hotel & Resort" },
  "HR & Recruitment": { zh: "人力资源与招聘", ms: "Sumber Manusia & Pengambilan Pekerja" },
  "Import & Export": { zh: "进出口贸易", ms: "Import & Eksport" },
  "Industrial Equipment": { zh: "工业设备", ms: "Peralatan Industri" },
  Insurance: { zh: "保险", ms: "Insurans" },
  "Insurance Broker & Agency": { zh: "保险经纪与代理", ms: "Broker & Agensi Insurans" },
  "Interior Design": { zh: "室内设计", ms: "Reka Bentuk Dalaman" },
  "International & Private School": { zh: "国际与私立学校", ms: "Sekolah Antarabangsa & Swasta" },
  "Investment & Wealth Management": { zh: "投资与财富管理", ms: "Pelaburan & Pengurusan Kekayaan" },
  "IoT & Embedded Systems": { zh: "物联网与嵌入式系统", ms: "IoT & Sistem Terbenam" },
  "Islamic Finance & Banking": { zh: "伊斯兰金融与银行", ms: "Kewangan & Perbankan Islam" },
  "IT Support & Managed Services": { zh: "IT支持与托管服务", ms: "Sokongan IT & Perkhidmatan Terurus" },
  "Jewelry & Watches": { zh: "珠宝与钟表", ms: "Barang Kemas & Jam Tangan" },
  "Kindergarten & Preschool": { zh: "幼儿园与学前教育", ms: "Tadika & Prasekolah" },
  "Landscaping & Gardening": { zh: "园林绿化与园艺", ms: "Landskap & Berkebun" },
  "Language School": { zh: "语言学校", ms: "Sekolah Bahasa" },
  "Legal Services": { zh: "法律服务", ms: "Perkhidmatan Undang-undang" },
  "Livestock & Poultry Farming": { zh: "畜牧与家禽养殖", ms: "Penternakan Ternakan & Ayam Itik" },
  "Locksmith Services": { zh: "锁匠服务", ms: "Perkhidmatan Tukang Kunci" },
  "Logistics & Supply Chain": { zh: "物流与供应链", ms: "Logistik & Rantaian Bekalan" },
  Manufacturing: { zh: "制造业", ms: "Pembuatan" },
  "Market Research": { zh: "市场调研", ms: "Penyelidikan Pasaran" },
  "Marketing Agency": { zh: "营销代理", ms: "Agensi Pemasaran" },
  "Martial Arts & Combat Sports": { zh: "武术与格斗运动", ms: "Seni Mempertahankan Diri & Sukan Pertarungan" },
  "Media Production": { zh: "媒体制作", ms: "Produksi Media" },
  "Medical Clinic & GP": { zh: "诊所与全科医生", ms: "Klinik Perubatan & Doktor Am" },
  "Medical Equipment": { zh: "医疗设备", ms: "Peralatan Perubatan" },
  "Mental Health & Counselling": { zh: "心理健康与辅导", ms: "Kesihatan Mental & Kaunseling" },
  "Metal Fabrication": { zh: "金属制造加工", ms: "Fabrikasi Logam" },
  "Money Changer & Remittance": { zh: "货币兑换与汇款", ms: "Penukaran Wang & Kiriman Wang" },
  "Motorcycle Dealership & Repair": { zh: "摩托车经销与维修", ms: "Peniaga & Pembaikan Motosikal" },
  "Moving & Relocation Services": { zh: "搬迁与搬家服务", ms: "Perkhidmatan Pindah & Relokasi" },
  "Nail Salon": { zh: "美甲店", ms: "Salun Kuku" },
  "Non-Profit & NGO": { zh: "非营利组织与NGO", ms: "Bukan Untung & NGO" },
  "Notary & Commissioner for Oaths": { zh: "公证与宣誓监誓", ms: "Notari & Pesuruhjaya Sumpah" },
  "Nursing & Home Care": { zh: "护理与居家照护", ms: "Kejururawatan & Jagaan Rumah" },
  "Nutrition & Dietetics": { zh: "营养与饮食咨询", ms: "Pemakanan & Dietetik" },
  "Office Supplies": { zh: "办公用品", ms: "Bekalan Pejabat" },
  "Oil & Gas Services": { zh: "石油与天然气服务", ms: "Perkhidmatan Minyak & Gas" },
  "Optical & Eyewear": { zh: "眼镜与视光服务", ms: "Optik & Cermin Mata" },
  Packaging: { zh: "包装", ms: "Pembungkusan" },
  "Painting Services": { zh: "油漆工程服务", ms: "Perkhidmatan Mengecat" },
  Pawnbroking: { zh: "当铺", ms: "Pajak Gadai" },
  "Payment Gateway & Fintech": { zh: "支付网关与金融科技", ms: "Get Bayaran & Fintech" },
  "Pest Control Services": { zh: "害虫防治服务", ms: "Perkhidmatan Kawalan Perosak" },
  "Pet Services & Veterinary": { zh: "宠物服务与兽医", ms: "Perkhidmatan Haiwan Peliharaan & Veterinar" },
  Pharmacy: { zh: "药剂行", ms: "Farmasi" },
  "Photography & Videography": { zh: "摄影与摄像", ms: "Fotografi & Videografi" },
  "Physiotherapy & Rehabilitation": { zh: "物理治疗与复健", ms: "Fisioterapi & Pemulihan" },
  "Plastics & Rubber Manufacturing": { zh: "塑胶与橡胶制造", ms: "Pembuatan Plastik & Getah" },
  "Plumbing Services": { zh: "水管服务", ms: "Perkhidmatan Paip" },
  "Printing & Publishing": { zh: "印刷与出版", ms: "Percetakan & Penerbitan" },
  "Property Management": { zh: "物业管理", ms: "Pengurusan Hartanah" },
  "Public Relations": { zh: "公共关系", ms: "Perhubungan Awam" },
  "Real Estate Agency": { zh: "房地产中介", ms: "Agensi Hartanah" },
  "Renewable & Solar Energy": { zh: "可再生能源与太阳能", ms: "Tenaga Boleh Diperbaharui & Solar" },
  "Renovation & Remodeling": { zh: "装修与翻新", ms: "Renovasi & Ubah Suai" },
  "Restaurant & Cafe": { zh: "餐厅与咖啡厅", ms: "Restoran & Kafe" },
  Retail: { zh: "零售", ms: "Runcit" },
  "Roofing Services": { zh: "屋顶工程服务", ms: "Perkhidmatan Bumbung" },
  "Scaffolding & Formwork": { zh: "脚手架与模板工程", ms: "Perancah & Acuan" },
  "Security Services": { zh: "保安服务", ms: "Perkhidmatan Keselamatan" },
  "SEO Services": { zh: "SEO优化服务", ms: "Perkhidmatan SEO" },
  "Signage & Fabrication": { zh: "招牌与制作工程", ms: "Papan Tanda & Fabrikasi" },
  "Social Media Marketing": { zh: "社交媒体营销", ms: "Pemasaran Media Sosial" },
  "Software Development": { zh: "软件开发", ms: "Pembangunan Perisian" },
  "Sports & Recreation": { zh: "体育与休闲", ms: "Sukan & Rekreasi" },
  "Stockbroking & Unit Trust": { zh: "股票经纪与单位信托", ms: "Broker Saham & Amanah Saham" },
  "Supermarket & Grocery": { zh: "超市与杂货店", ms: "Pasar Raya & Kedai Runcit" },
  "Talent & Influencer Agency": { zh: "艺人与网红经纪", ms: "Agensi Bakat & Pempengaruh" },
  "Tattoo & Piercing Studio": { zh: "纹身与穿孔工作室", ms: "Studio Tatu & Tindik" },
  "Tax Agent & Advisory": { zh: "税务代理与咨询", ms: "Ejen Cukai & Penasihatan" },
  Telecommunications: { zh: "电信", ms: "Telekomunikasi" },
  "Textile & Garment Manufacturing": { zh: "纺织与制衣", ms: "Pembuatan Tekstil & Pakaian" },
  "Trademark & IP Services": { zh: "商标与知识产权服务", ms: "Perkhidmatan Cap Dagangan & Harta Intelek" },
  "Traditional & Complementary Medicine": { zh: "传统与辅助医学", ms: "Perubatan Tradisional & Komplementari" },
  "Translation & Interpretation": { zh: "翻译与传译服务", ms: "Perkhidmatan Terjemahan & Interpretasi" },
  Transportation: { zh: "交通运输", ms: "Pengangkutan" },
  "Travel & Tourism": { zh: "旅游与观光", ms: "Perjalanan & Pelancongan" },
  "Tutoring & Coaching": { zh: "补习与辅导", ms: "Tuisyen & Kejurulatihan" },
  "Tyre Shop & Wheel Services": { zh: "轮胎与车轮服务", ms: "Kedai Tayar & Perkhidmatan Roda" },
  "Video Production": { zh: "视频制作", ms: "Produksi Video" },
  "Vocational & Skills Training": { zh: "职业与技能培训", ms: "Latihan Vokasional & Kemahiran" },
  Warehousing: { zh: "仓储", ms: "Pergudangan" },
  "Waste Management & Recycling": { zh: "废物管理与回收", ms: "Pengurusan Sisa & Kitar Semula" },
  "Waterproofing Services": { zh: "防水工程服务", ms: "Perkhidmatan Kalis Air" },
  "Web Design": { zh: "网页设计", ms: "Reka Bentuk Web" },
  "Web Development": { zh: "网页开发", ms: "Pembangunan Web" },
  "Wedding Services": { zh: "婚礼服务", ms: "Perkhidmatan Perkahwinan" },
  "Welding & Metalwork": { zh: "焊接与金属工程", ms: "Kimpalan & Kerja Logam" },
  "Wholesale & Distribution": { zh: "批发与分销", ms: "Borong & Pengedaran" },
};

export function translateCategoryName(name: string, locale: DirectoryLocale): string {
  if (locale === "en") return name;
  return CATEGORY_TRANSLATIONS[name]?.[locale] ?? name;
}

// A friendly category page's own URL — the language lives in the path as
// a leading segment (see directoryHomePath in directory-i18n.ts), same as
// every other directory URL, English included. Relative — the caller
// prepends siteOrigin for anything that needs an absolute URL (metadata,
// JSON-LD); an on-page <Link> uses it as-is.
export function categoryPath(categorySlug: string, locale: DirectoryLocale): string {
  return `/${locale}/business/category/${categorySlug}`;
}

// Category-page copy templates — kept beside translateCategoryName since
// they all key off the same per-locale category label it produces, rather
// than in directory-i18n.ts's DIRECTORY_STRINGS (which has no per-category
// slot to interpolate into).
export function categoryPageTitle(name: string, locale: DirectoryLocale): string {
  const label = translateCategoryName(name, locale);
  const siteName = DIRECTORY_SITE_NAME_BY_LOCALE[locale];
  if (locale === "zh") return `${label} 企业 | ${siteName}`;
  if (locale === "ms") return `Perniagaan ${label} | ${siteName}`;
  return `${label} Businesses | ${siteName}`;
}

export function categoryPageHeading(name: string, locale: DirectoryLocale): string {
  const label = translateCategoryName(name, locale);
  if (locale === "zh") return `${label} 企业`;
  if (locale === "ms") return `Perniagaan ${label}`;
  return `${label} businesses`;
}

export function categoryPageDescription(name: string, locale: DirectoryLocale): string {
  const label = translateCategoryName(name, locale);
  if (locale === "zh") return `浏览 Gotka 网络中值得信赖的 ${label} 企业，并直接联系他们。`;
  if (locale === "ms") return `Semak imbas perniagaan ${label} yang dipercayai dalam rangkaian Gotka dan hubungi terus.`;
  return `Browse trusted ${label} businesses in the Gotka network and reach out directly.`;
}
