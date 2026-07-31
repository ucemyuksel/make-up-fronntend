/**
 * Ülke içi bölgeler (il / eyalet / vilayet).
 *
 * Her ülkenin tüm alt bölümünü taşımak paketi gereksiz şişirir; listesi olan
 * ülkelerde açılır menü, olmayanlarda serbest şehir girişi kullanılır
 * ({@link RegionPicker}). Kod backend'de {@code region_code VARCHAR(16)}.
 */
export type Bolge = { kod: string; ad: string };

/** Türkiye — 81 il, plaka kodlarıyla. */
const TR: Bolge[] = [
  { kod: "01", ad: "Adana" }, { kod: "02", ad: "Adıyaman" }, { kod: "03", ad: "Afyonkarahisar" },
  { kod: "04", ad: "Ağrı" }, { kod: "05", ad: "Amasya" }, { kod: "06", ad: "Ankara" },
  { kod: "07", ad: "Antalya" }, { kod: "08", ad: "Artvin" }, { kod: "09", ad: "Aydın" },
  { kod: "10", ad: "Balıkesir" }, { kod: "11", ad: "Bilecik" }, { kod: "12", ad: "Bingöl" },
  { kod: "13", ad: "Bitlis" }, { kod: "14", ad: "Bolu" }, { kod: "15", ad: "Burdur" },
  { kod: "16", ad: "Bursa" }, { kod: "17", ad: "Çanakkale" }, { kod: "18", ad: "Çankırı" },
  { kod: "19", ad: "Çorum" }, { kod: "20", ad: "Denizli" }, { kod: "21", ad: "Diyarbakır" },
  { kod: "22", ad: "Edirne" }, { kod: "23", ad: "Elazığ" }, { kod: "24", ad: "Erzincan" },
  { kod: "25", ad: "Erzurum" }, { kod: "26", ad: "Eskişehir" }, { kod: "27", ad: "Gaziantep" },
  { kod: "28", ad: "Giresun" }, { kod: "29", ad: "Gümüşhane" }, { kod: "30", ad: "Hakkâri" },
  { kod: "31", ad: "Hatay" }, { kod: "32", ad: "Isparta" }, { kod: "33", ad: "Mersin" },
  { kod: "34", ad: "İstanbul" }, { kod: "35", ad: "İzmir" }, { kod: "36", ad: "Kars" },
  { kod: "37", ad: "Kastamonu" }, { kod: "38", ad: "Kayseri" }, { kod: "39", ad: "Kırklareli" },
  { kod: "40", ad: "Kırşehir" }, { kod: "41", ad: "Kocaeli" }, { kod: "42", ad: "Konya" },
  { kod: "43", ad: "Kütahya" }, { kod: "44", ad: "Malatya" }, { kod: "45", ad: "Manisa" },
  { kod: "46", ad: "Kahramanmaraş" }, { kod: "47", ad: "Mardin" }, { kod: "48", ad: "Muğla" },
  { kod: "49", ad: "Muş" }, { kod: "50", ad: "Nevşehir" }, { kod: "51", ad: "Niğde" },
  { kod: "52", ad: "Ordu" }, { kod: "53", ad: "Rize" }, { kod: "54", ad: "Sakarya" },
  { kod: "55", ad: "Samsun" }, { kod: "56", ad: "Siirt" }, { kod: "57", ad: "Sinop" },
  { kod: "58", ad: "Sivas" }, { kod: "59", ad: "Tekirdağ" }, { kod: "60", ad: "Tokat" },
  { kod: "61", ad: "Trabzon" }, { kod: "62", ad: "Tunceli" }, { kod: "63", ad: "Şanlıurfa" },
  { kod: "64", ad: "Uşak" }, { kod: "65", ad: "Van" }, { kod: "66", ad: "Yozgat" },
  { kod: "67", ad: "Zonguldak" }, { kod: "68", ad: "Aksaray" }, { kod: "69", ad: "Bayburt" },
  { kod: "70", ad: "Karaman" }, { kod: "71", ad: "Kırıkkale" }, { kod: "72", ad: "Batman" },
  { kod: "73", ad: "Şırnak" }, { kod: "74", ad: "Bartın" }, { kod: "75", ad: "Ardahan" },
  { kod: "76", ad: "Iğdır" }, { kod: "77", ad: "Yalova" }, { kod: "78", ad: "Karabük" },
  { kod: "79", ad: "Kilis" }, { kod: "80", ad: "Osmaniye" }, { kod: "81", ad: "Düzce" },
];

/** ABD — 50 eyalet + başkent bölgesi. */
const US: Bolge[] = [
  { kod: "AL", ad: "Alabama" }, { kod: "AK", ad: "Alaska" }, { kod: "AZ", ad: "Arizona" },
  { kod: "AR", ad: "Arkansas" }, { kod: "CA", ad: "California" }, { kod: "CO", ad: "Colorado" },
  { kod: "CT", ad: "Connecticut" }, { kod: "DE", ad: "Delaware" }, { kod: "DC", ad: "Washington D.C." },
  { kod: "FL", ad: "Florida" }, { kod: "GA", ad: "Georgia" }, { kod: "HI", ad: "Hawaii" },
  { kod: "ID", ad: "Idaho" }, { kod: "IL", ad: "Illinois" }, { kod: "IN", ad: "Indiana" },
  { kod: "IA", ad: "Iowa" }, { kod: "KS", ad: "Kansas" }, { kod: "KY", ad: "Kentucky" },
  { kod: "LA", ad: "Louisiana" }, { kod: "ME", ad: "Maine" }, { kod: "MD", ad: "Maryland" },
  { kod: "MA", ad: "Massachusetts" }, { kod: "MI", ad: "Michigan" }, { kod: "MN", ad: "Minnesota" },
  { kod: "MS", ad: "Mississippi" }, { kod: "MO", ad: "Missouri" }, { kod: "MT", ad: "Montana" },
  { kod: "NE", ad: "Nebraska" }, { kod: "NV", ad: "Nevada" }, { kod: "NH", ad: "New Hampshire" },
  { kod: "NJ", ad: "New Jersey" }, { kod: "NM", ad: "New Mexico" }, { kod: "NY", ad: "New York" },
  { kod: "NC", ad: "North Carolina" }, { kod: "ND", ad: "North Dakota" }, { kod: "OH", ad: "Ohio" },
  { kod: "OK", ad: "Oklahoma" }, { kod: "OR", ad: "Oregon" }, { kod: "PA", ad: "Pennsylvania" },
  { kod: "RI", ad: "Rhode Island" }, { kod: "SC", ad: "South Carolina" }, { kod: "SD", ad: "South Dakota" },
  { kod: "TN", ad: "Tennessee" }, { kod: "TX", ad: "Texas" }, { kod: "UT", ad: "Utah" },
  { kod: "VT", ad: "Vermont" }, { kod: "VA", ad: "Virginia" }, { kod: "WA", ad: "Washington" },
  { kod: "WV", ad: "West Virginia" }, { kod: "WI", ad: "Wisconsin" }, { kod: "WY", ad: "Wyoming" },
];

/** Almanya — 16 eyalet. */
const DE: Bolge[] = [
  { kod: "BW", ad: "Baden-Württemberg" }, { kod: "BY", ad: "Bayern" }, { kod: "BE", ad: "Berlin" },
  { kod: "BB", ad: "Brandenburg" }, { kod: "HB", ad: "Bremen" }, { kod: "HH", ad: "Hamburg" },
  { kod: "HE", ad: "Hessen" }, { kod: "MV", ad: "Mecklenburg-Vorpommern" }, { kod: "NI", ad: "Niedersachsen" },
  { kod: "NW", ad: "Nordrhein-Westfalen" }, { kod: "RP", ad: "Rheinland-Pfalz" }, { kod: "SL", ad: "Saarland" },
  { kod: "SN", ad: "Sachsen" }, { kod: "ST", ad: "Sachsen-Anhalt" }, { kod: "SH", ad: "Schleswig-Holstein" },
  { kod: "TH", ad: "Thüringen" },
];

/** Birleşik Krallık — ülkeler + başlıca İngiltere bölgeleri. */
const GB: Bolge[] = [
  { kod: "ENG", ad: "İngiltere" }, { kod: "SCT", ad: "İskoçya" }, { kod: "WLS", ad: "Galler" },
  { kod: "NIR", ad: "Kuzey İrlanda" }, { kod: "LND", ad: "Londra" }, { kod: "MAN", ad: "Manchester" },
  { kod: "BIR", ad: "Birmingham" },
];

/** Hollanda — 12 il. */
const NL: Bolge[] = [
  { kod: "DR", ad: "Drenthe" }, { kod: "FL", ad: "Flevoland" }, { kod: "FR", ad: "Friesland" },
  { kod: "GE", ad: "Gelderland" }, { kod: "GR", ad: "Groningen" }, { kod: "LI", ad: "Limburg" },
  { kod: "NB", ad: "Noord-Brabant" }, { kod: "NH", ad: "Noord-Holland" }, { kod: "OV", ad: "Overijssel" },
  { kod: "UT", ad: "Utrecht" }, { kod: "ZE", ad: "Zeeland" }, { kod: "ZH", ad: "Zuid-Holland" },
];

/** Fransa — 13 anakara bölgesi. */
const FR: Bolge[] = [
  { kod: "ARA", ad: "Auvergne-Rhône-Alpes" }, { kod: "BFC", ad: "Bourgogne-Franche-Comté" },
  { kod: "BRE", ad: "Bretagne" }, { kod: "CVL", ad: "Centre-Val de Loire" }, { kod: "COR", ad: "Korsika" },
  { kod: "GES", ad: "Grand Est" }, { kod: "HDF", ad: "Hauts-de-France" }, { kod: "IDF", ad: "Île-de-France" },
  { kod: "NOR", ad: "Normandiya" }, { kod: "NAQ", ad: "Nouvelle-Aquitaine" }, { kod: "OCC", ad: "Occitanie" },
  { kod: "PDL", ad: "Pays de la Loire" }, { kod: "PAC", ad: "Provence-Alpes-Côte d'Azur" },
];

/** Birleşik Arap Emirlikleri — 7 emirlik. */
const AE: Bolge[] = [
  { kod: "AZ", ad: "Abu Dabi" }, { kod: "DU", ad: "Dubai" }, { kod: "SH", ad: "Şarika" },
  { kod: "AJ", ad: "Ajman" }, { kod: "UQ", ad: "Ümmülkuveyn" }, { kod: "RK", ad: "Re'sülhayme" },
  { kod: "FU", ad: "Fucayra" },
];

/** Azerbaycan — başlıca şehirler. */
const AZ: Bolge[] = [
  { kod: "BA", ad: "Bakü" }, { kod: "GA", ad: "Gence" }, { kod: "SM", ad: "Sumqayıt" },
  { kod: "MI", ad: "Mingeçevir" }, { kod: "NX", ad: "Nahçıvan" },
];

/** İtalya — 20 bölge. */
const IT: Bolge[] = [
  { kod: "65", ad: "Abruzzo" }, { kod: "77", ad: "Basilicata" }, { kod: "78", ad: "Calabria" },
  { kod: "72", ad: "Campania" }, { kod: "45", ad: "Emilia-Romagna" }, { kod: "36", ad: "Friuli-Venezia Giulia" },
  { kod: "62", ad: "Lazio" }, { kod: "42", ad: "Liguria" }, { kod: "25", ad: "Lombardia" },
  { kod: "57", ad: "Marche" }, { kod: "67", ad: "Molise" }, { kod: "21", ad: "Piemonte" },
  { kod: "75", ad: "Puglia" }, { kod: "88", ad: "Sardegna" }, { kod: "82", ad: "Sicilia" },
  { kod: "52", ad: "Toscana" }, { kod: "32", ad: "Trentino-Alto Adige" }, { kod: "55", ad: "Umbria" },
  { kod: "23", ad: "Valle d'Aosta" }, { kod: "34", ad: "Veneto" },
];

/** İspanya — 17 özerk topluluk. */
const ES: Bolge[] = [
  { kod: "AN", ad: "Endülüs" }, { kod: "AR", ad: "Aragon" }, { kod: "AS", ad: "Asturias" },
  { kod: "CN", ad: "Kanarya Adaları" }, { kod: "CB", ad: "Cantabria" }, { kod: "CM", ad: "Castilla-La Mancha" },
  { kod: "CL", ad: "Castilla y León" }, { kod: "CT", ad: "Katalonya" }, { kod: "EX", ad: "Extremadura" },
  { kod: "GA", ad: "Galiçya" }, { kod: "IB", ad: "Balear Adaları" }, { kod: "RI", ad: "La Rioja" },
  { kod: "MD", ad: "Madrid" }, { kod: "MC", ad: "Murcia" }, { kod: "NC", ad: "Navarra" },
  { kod: "PV", ad: "Bask Bölgesi" }, { kod: "VC", ad: "Valensiya" },
];

/** Kanada — 10 eyalet + 3 bölge. */
const CA: Bolge[] = [
  { kod: "AB", ad: "Alberta" }, { kod: "BC", ad: "British Columbia" }, { kod: "MB", ad: "Manitoba" },
  { kod: "NB", ad: "New Brunswick" }, { kod: "NL", ad: "Newfoundland ve Labrador" }, { kod: "NS", ad: "Nova Scotia" },
  { kod: "ON", ad: "Ontario" }, { kod: "PE", ad: "Prince Edward Island" }, { kod: "QC", ad: "Québec" },
  { kod: "SK", ad: "Saskatchewan" }, { kod: "NT", ad: "Kuzeybatı Toprakları" }, { kod: "NU", ad: "Nunavut" },
  { kod: "YT", ad: "Yukon" },
];

/** Avustralya — 8 eyalet/bölge. */
const AU: Bolge[] = [
  { kod: "NSW", ad: "New South Wales" }, { kod: "QLD", ad: "Queensland" }, { kod: "SA", ad: "South Australia" },
  { kod: "TAS", ad: "Tasmania" }, { kod: "VIC", ad: "Victoria" }, { kod: "WA", ad: "Western Australia" },
  { kod: "ACT", ad: "Avustralya Başkent Bölgesi" }, { kod: "NT", ad: "Kuzey Toprakları" },
];

export const REGIONS: Record<string, Bolge[]> = {
  TR, US, DE, GB, NL, FR, AE, AZ, IT, ES, CA, AU,
};

/** Ülkenin bölge listesi var mı? Yoksa serbest şehir girişi kullanılır. */
export const withRegions = (ulkeKodu: string) => REGIONS[ulkeKodu] !== undefined;

export const regionName = (ulkeKodu: string, bolgeKodu: string) =>
  REGIONS[ulkeKodu]?.find((b) => b.kod === bolgeKodu)?.ad ?? bolgeKodu;
