/**
 * Ülke içi bölgeler (il / eyalet / vilayet).
 *
 * Her ülkenin tüm alt bölümünü taşımak paketi gereksiz şişirir; listesi olan
 * ülkelerde açılır menü, olmayanlarda serbest şehir girişi kullanılır
 * ({@link RegionPicker}). Kod backend'de {@code region_code VARCHAR(16)}.
 */
export type Region = { code: string; ad: string };

/** Türkiye — 81 il, plaka kodlarıyla. */
const TR: Region[] = [
  { code: "01", ad: "Adana" }, { code: "02", ad: "Adıyaman" }, { code: "03", ad: "Afyonkarahisar" },
  { code: "04", ad: "Ağrı" }, { code: "05", ad: "Amasya" }, { code: "06", ad: "Ankara" },
  { code: "07", ad: "Antalya" }, { code: "08", ad: "Artvin" }, { code: "09", ad: "Aydın" },
  { code: "10", ad: "Balıkesir" }, { code: "11", ad: "Bilecik" }, { code: "12", ad: "Bingöl" },
  { code: "13", ad: "Bitlis" }, { code: "14", ad: "Bolu" }, { code: "15", ad: "Burdur" },
  { code: "16", ad: "Bursa" }, { code: "17", ad: "Çanakkale" }, { code: "18", ad: "Çankırı" },
  { code: "19", ad: "Çorum" }, { code: "20", ad: "Denizli" }, { code: "21", ad: "Diyarbakır" },
  { code: "22", ad: "Edirne" }, { code: "23", ad: "Elazığ" }, { code: "24", ad: "Erzincan" },
  { code: "25", ad: "Erzurum" }, { code: "26", ad: "Eskişehir" }, { code: "27", ad: "Gaziantep" },
  { code: "28", ad: "Giresun" }, { code: "29", ad: "Gümüşhane" }, { code: "30", ad: "Hakkâri" },
  { code: "31", ad: "Hatay" }, { code: "32", ad: "Isparta" }, { code: "33", ad: "Mersin" },
  { code: "34", ad: "İstanbul" }, { code: "35", ad: "İzmir" }, { code: "36", ad: "Kars" },
  { code: "37", ad: "Kastamonu" }, { code: "38", ad: "Kayseri" }, { code: "39", ad: "Kırklareli" },
  { code: "40", ad: "Kırşehir" }, { code: "41", ad: "Kocaeli" }, { code: "42", ad: "Konya" },
  { code: "43", ad: "Kütahya" }, { code: "44", ad: "Malatya" }, { code: "45", ad: "Manisa" },
  { code: "46", ad: "Kahramanmaraş" }, { code: "47", ad: "Mardin" }, { code: "48", ad: "Muğla" },
  { code: "49", ad: "Muş" }, { code: "50", ad: "Nevşehir" }, { code: "51", ad: "Niğde" },
  { code: "52", ad: "Ordu" }, { code: "53", ad: "Rize" }, { code: "54", ad: "Sakarya" },
  { code: "55", ad: "Samsun" }, { code: "56", ad: "Siirt" }, { code: "57", ad: "Sinop" },
  { code: "58", ad: "Sivas" }, { code: "59", ad: "Tekirdağ" }, { code: "60", ad: "Tokat" },
  { code: "61", ad: "Trabzon" }, { code: "62", ad: "Tunceli" }, { code: "63", ad: "Şanlıurfa" },
  { code: "64", ad: "Uşak" }, { code: "65", ad: "Van" }, { code: "66", ad: "Yozgat" },
  { code: "67", ad: "Zonguldak" }, { code: "68", ad: "Aksaray" }, { code: "69", ad: "Bayburt" },
  { code: "70", ad: "Karaman" }, { code: "71", ad: "Kırıkkale" }, { code: "72", ad: "Batman" },
  { code: "73", ad: "Şırnak" }, { code: "74", ad: "Bartın" }, { code: "75", ad: "Ardahan" },
  { code: "76", ad: "Iğdır" }, { code: "77", ad: "Yalova" }, { code: "78", ad: "Karabük" },
  { code: "79", ad: "Kilis" }, { code: "80", ad: "Osmaniye" }, { code: "81", ad: "Düzce" },
];

/** ABD — 50 eyalet + başkent bölgesi. */
const US: Region[] = [
  { code: "AL", ad: "Alabama" }, { code: "AK", ad: "Alaska" }, { code: "AZ", ad: "Arizona" },
  { code: "AR", ad: "Arkansas" }, { code: "CA", ad: "California" }, { code: "CO", ad: "Colorado" },
  { code: "CT", ad: "Connecticut" }, { code: "DE", ad: "Delaware" }, { code: "DC", ad: "Washington D.C." },
  { code: "FL", ad: "Florida" }, { code: "GA", ad: "Georgia" }, { code: "HI", ad: "Hawaii" },
  { code: "ID", ad: "Idaho" }, { code: "IL", ad: "Illinois" }, { code: "IN", ad: "Indiana" },
  { code: "IA", ad: "Iowa" }, { code: "KS", ad: "Kansas" }, { code: "KY", ad: "Kentucky" },
  { code: "LA", ad: "Louisiana" }, { code: "ME", ad: "Maine" }, { code: "MD", ad: "Maryland" },
  { code: "MA", ad: "Massachusetts" }, { code: "MI", ad: "Michigan" }, { code: "MN", ad: "Minnesota" },
  { code: "MS", ad: "Mississippi" }, { code: "MO", ad: "Missouri" }, { code: "MT", ad: "Montana" },
  { code: "NE", ad: "Nebraska" }, { code: "NV", ad: "Nevada" }, { code: "NH", ad: "New Hampshire" },
  { code: "NJ", ad: "New Jersey" }, { code: "NM", ad: "New Mexico" }, { code: "NY", ad: "New York" },
  { code: "NC", ad: "North Carolina" }, { code: "ND", ad: "North Dakota" }, { code: "OH", ad: "Ohio" },
  { code: "OK", ad: "Oklahoma" }, { code: "OR", ad: "Oregon" }, { code: "PA", ad: "Pennsylvania" },
  { code: "RI", ad: "Rhode Island" }, { code: "SC", ad: "South Carolina" }, { code: "SD", ad: "South Dakota" },
  { code: "TN", ad: "Tennessee" }, { code: "TX", ad: "Texas" }, { code: "UT", ad: "Utah" },
  { code: "VT", ad: "Vermont" }, { code: "VA", ad: "Virginia" }, { code: "WA", ad: "Washington" },
  { code: "WV", ad: "West Virginia" }, { code: "WI", ad: "Wisconsin" }, { code: "WY", ad: "Wyoming" },
];

/** Almanya — 16 eyalet. */
const DE: Region[] = [
  { code: "BW", ad: "Baden-Württemberg" }, { code: "BY", ad: "Bayern" }, { code: "BE", ad: "Berlin" },
  { code: "BB", ad: "Brandenburg" }, { code: "HB", ad: "Bremen" }, { code: "HH", ad: "Hamburg" },
  { code: "HE", ad: "Hessen" }, { code: "MV", ad: "Mecklenburg-Vorpommern" }, { code: "NI", ad: "Niedersachsen" },
  { code: "NW", ad: "Nordrhein-Westfalen" }, { code: "RP", ad: "Rheinland-Pfalz" }, { code: "SL", ad: "Saarland" },
  { code: "SN", ad: "Sachsen" }, { code: "ST", ad: "Sachsen-Anhalt" }, { code: "SH", ad: "Schleswig-Holstein" },
  { code: "TH", ad: "Thüringen" },
];

/** Birleşik Krallık — ülkeler + başlıca İngiltere bölgeleri. */
const GB: Region[] = [
  { code: "ENG", ad: "İngiltere" }, { code: "SCT", ad: "İskoçya" }, { code: "WLS", ad: "Galler" },
  { code: "NIR", ad: "Kuzey İrlanda" }, { code: "LND", ad: "Londra" }, { code: "MAN", ad: "Manchester" },
  { code: "BIR", ad: "Birmingham" },
];

/** Hollanda — 12 il. */
const NL: Region[] = [
  { code: "DR", ad: "Drenthe" }, { code: "FL", ad: "Flevoland" }, { code: "FR", ad: "Friesland" },
  { code: "GE", ad: "Gelderland" }, { code: "GR", ad: "Groningen" }, { code: "LI", ad: "Limburg" },
  { code: "NB", ad: "Noord-Brabant" }, { code: "NH", ad: "Noord-Holland" }, { code: "OV", ad: "Overijssel" },
  { code: "UT", ad: "Utrecht" }, { code: "ZE", ad: "Zeeland" }, { code: "ZH", ad: "Zuid-Holland" },
];

/** Fransa — 13 anakara bölgesi. */
const FR: Region[] = [
  { code: "ARA", ad: "Auvergne-Rhône-Alpes" }, { code: "BFC", ad: "Bourgogne-Franche-Comté" },
  { code: "BRE", ad: "Bretagne" }, { code: "CVL", ad: "Centre-Val de Loire" }, { code: "COR", ad: "Korsika" },
  { code: "GES", ad: "Grand Est" }, { code: "HDF", ad: "Hauts-de-France" }, { code: "IDF", ad: "Île-de-France" },
  { code: "NOR", ad: "Normandiya" }, { code: "NAQ", ad: "Nouvelle-Aquitaine" }, { code: "OCC", ad: "Occitanie" },
  { code: "PDL", ad: "Pays de la Loire" }, { code: "PAC", ad: "Provence-Alpes-Côte d'Azur" },
];

/** Birleşik Arap Emirlikleri — 7 emirlik. */
const AE: Region[] = [
  { code: "AZ", ad: "Abu Dabi" }, { code: "DU", ad: "Dubai" }, { code: "SH", ad: "Şarika" },
  { code: "AJ", ad: "Ajman" }, { code: "UQ", ad: "Ümmülkuveyn" }, { code: "RK", ad: "Re'sülhayme" },
  { code: "FU", ad: "Fucayra" },
];

/** Azerbaycan — başlıca şehirler. */
const LOW: Region[] = [
  { code: "BA", ad: "Bakü" }, { code: "GA", ad: "Gence" }, { code: "SM", ad: "Sumqayıt" },
  { code: "MI", ad: "Mingeçevir" }, { code: "NX", ad: "Nahçıvan" },
];

/** İtalya — 20 bölge. */
const IT: Region[] = [
  { code: "65", ad: "Abruzzo" }, { code: "77", ad: "Basilicata" }, { code: "78", ad: "Calabria" },
  { code: "72", ad: "Campania" }, { code: "45", ad: "Emilia-Romagna" }, { code: "36", ad: "Friuli-Venezia Giulia" },
  { code: "62", ad: "Lazio" }, { code: "42", ad: "Liguria" }, { code: "25", ad: "Lombardia" },
  { code: "57", ad: "Marche" }, { code: "67", ad: "Molise" }, { code: "21", ad: "Piemonte" },
  { code: "75", ad: "Puglia" }, { code: "88", ad: "Sardegna" }, { code: "82", ad: "Sicilia" },
  { code: "52", ad: "Toscana" }, { code: "32", ad: "Trentino-Alto Adige" }, { code: "55", ad: "Umbria" },
  { code: "23", ad: "Valle d'Aosta" }, { code: "34", ad: "Veneto" },
];

/** İspanya — 17 özerk topluluk. */
const ES: Region[] = [
  { code: "AN", ad: "Endülüs" }, { code: "AR", ad: "Aragon" }, { code: "AS", ad: "Asturias" },
  { code: "CN", ad: "Kanarya Adaları" }, { code: "CB", ad: "Cantabria" }, { code: "CM", ad: "Castilla-La Mancha" },
  { code: "CL", ad: "Castilla y León" }, { code: "CT", ad: "Katalonya" }, { code: "EX", ad: "Extremadura" },
  { code: "GA", ad: "Galiçya" }, { code: "IB", ad: "Balear Adaları" }, { code: "RI", ad: "La Rioja" },
  { code: "MD", ad: "Madrid" }, { code: "MC", ad: "Murcia" }, { code: "NC", ad: "Navarra" },
  { code: "PV", ad: "Bask Bölgesi" }, { code: "VC", ad: "Valensiya" },
];

/** Kanada — 10 eyalet + 3 bölge. */
const CA: Region[] = [
  { code: "AB", ad: "Alberta" }, { code: "BC", ad: "British Columbia" }, { code: "MB", ad: "Manitoba" },
  { code: "NB", ad: "New Brunswick" }, { code: "NL", ad: "Newfoundland ve Labrador" }, { code: "NS", ad: "Nova Scotia" },
  { code: "ON", ad: "Ontario" }, { code: "PE", ad: "Prince Edward Island" }, { code: "QC", ad: "Québec" },
  { code: "SK", ad: "Saskatchewan" }, { code: "NT", ad: "Kuzeybatı Toprakları" }, { code: "NU", ad: "Nunavut" },
  { code: "YT", ad: "Yukon" },
];

/** Avustralya — 8 eyalet/bölge. */
const AU: Region[] = [
  { code: "NSW", ad: "New South Wales" }, { code: "QLD", ad: "Queensland" }, { code: "SA", ad: "South Australia" },
  { code: "TAS", ad: "Tasmania" }, { code: "VIC", ad: "Victoria" }, { code: "WA", ad: "Western Australia" },
  { code: "ACT", ad: "Avustralya Başkent Bölgesi" }, { code: "NT", ad: "Kuzey Toprakları" },
];

export const REGIONS: Record<string, Region[]> = {
  TR, US, DE, GB, NL, FR, AE, LOW, IT, ES, CA, AU,
};

/** Ülkenin bölge listesi var mı? Yoksa serbest şehir girişi kullanılır. */
export const withRegions = (countryCode: string) => REGIONS[countryCode] !== undefined;

export const regionName = (countryCode: string, regionCode: string) =>
  REGIONS[countryCode]?.find((b) => b.code === regionCode)?.ad ?? regionCode;
