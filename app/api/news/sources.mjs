export const sources = [
  {
    id: "ca-ircc",
    country: "加拿大", flag: "🇨🇦", region: "北美", source: "加拿大移民部 IRCC",
    format: "feed", hosts: ["canada.ca"],
    url: "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=departmentofcitizenshipandimmigration&sort=publishedDate&orderBy=desc&publishedDate%3E=2021-07-23&pick=50&format=atom",
  },
  {
    id: "ca-notices",
    country: "加拿大", flag: "🇨🇦", region: "北美", source: "加拿大移民部 IRCC",
    format: "list", path: /\/news\/notices\/[^/]+\.html$/,
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html",
  },
  {
    id: "us-uscis",
    country: "美国", flag: "🇺🇸", region: "北美", source: "美国移民局 USCIS",
    format: "feed", url: "https://www.uscis.gov/news/rss-feed/23269",
  },
  {
    id: "us-bulletin",
    country: "美国", flag: "🇺🇸", region: "北美", source: "美国国务院签证公告",
    format: "bulletin", path: /\/visa-bulletin-for-[a-z]+-\d{4}\.html$/,
    url: "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html",
  },
  {
    id: "uk-home-office",
    country: "英国", flag: "🇬🇧", region: "欧洲", source: "英国内政部",
    format: "feed", url: "https://www.gov.uk/government/organisations/home-office.atom",
  },
  {
    id: "eu-home-affairs",
    country: "欧盟", flag: "🇪🇺", region: "欧洲", source: "欧盟委员会移民与内政总司",
    format: "feed", url: "https://home-affairs.ec.europa.eu/node/2/rss_en",
  },
  {
    id: "gr-migration",
    country: "希腊", flag: "🇬🇷", region: "欧洲", source: "希腊移民与庇护部",
    format: "feed", url: "https://migration.gov.gr/feed/",
  },
  {
    id: "nz-inz",
    country: "新西兰", flag: "🇳🇿", region: "大洋洲", source: "新西兰移民局 INZ",
    format: "sitemap", path: /^\/about-us\/news-centre\/[^/]+\/$/,
    url: "https://www.immigration.govt.nz/sitemap.xml",
  },
  {
    id: "au-home-affairs",
    country: "澳大利亚", flag: "🇦🇺", region: "大洋洲", source: "澳大利亚内政部",
    format: "list", dateBeforeLink: true, path: /\/news-media\/archive\/article\?.+/,
    url: "https://immi.homeaffairs.gov.au/news-media?TermId=fdbe0e65-9d74-4c77-8ca9-68c99dd9a5e0&TermSetId=a76074c9-979d-4db3-adcc-34af89495da2&TermStoreId=1cafda66-8aac-4a45-95fa-3e03872913b6",
  },
  {
    id: "hk-immd",
    country: "中国香港", flag: "🇭🇰", region: "亚洲", source: "香港入境事务处",
    format: "list", path: /\/press\/press-releases\/\d{8}[a-z]?\.html$/i,
    url: "https://www.immd.gov.hk/hks/press/press_releases.html",
  },
  {
    id: "sg-mom",
    country: "新加坡", flag: "🇸🇬", region: "亚洲", source: "新加坡人力部 MOM",
    format: "list", path: /^\/newsroom\/press-releases\/\d{4}\/.+/,
    url: "https://www.mom.gov.sg/newsroom/press-releases?category=Work+passes+and+permits",
  },
  {
    id: "pa-snm",
    country: "巴拿马", flag: "🇵🇦", region: "拉丁美洲", source: "巴拿马国家移民局 SNM",
    format: "feed", url: "https://www.migracion.gob.pa/feed/",
  },
];
