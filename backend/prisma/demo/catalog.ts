import type { PoolName } from './images.js';
import { POOLS } from './images.js';
import { Random, roundPrice, slugify } from './random.js';

export type CategorySlug = 'ca-bien-tuoi' | 'tom-song' | 'cua-ghe' | 'muc-bach-tuoc' | 'ngheu-so-oc' | 'hai-san-dac-san';

/** How a product reaches the customer; it decides the packing sentence and the shelf life shown. */
export type Kind = 'live' | 'fresh' | 'frozen' | 'cooked' | 'dried' | 'sauce' | 'set';

export interface DemoVariant {
  name: string;
  sku: string;
  unit: string;
  sizeLabel: string;
  /** Multiplies the product's price: a bigger size costs more per kilo. */
  priceFactor: number;
}

export interface DemoProduct {
  slug: string;
  name: string;
  description: string;
  category: CategorySlug;
  speciesSlug: string;
  pool: PoolName;
  imageIds: number[];
  featured: boolean;
  /** The price of the first variant, per unit, in dong. */
  basePrice: number;
  unit: string;
  kind: Kind;
  /** Where it comes from; vendors of that region are more likely to sell it. */
  origin: string;
  variants: DemoVariant[];
  /** Roughly how many people buy it (higher = more orders). */
  popularity: number;
}

export interface DemoSpecies {
  slug: string;
  commonName: string;
  scientificName: string | null;
  description: string;
}

interface Form {
  label: string;
  kind: Kind;
  /** One sentence about this form. */
  text: string;
  /** Price compared with the family's base price. */
  mul: number;
  sizes: string[];
  unit?: string;
}

interface Origin {
  label: string;
  /** One sentence about where it comes from. */
  text: string;
}

interface Family {
  key: string;
  /** The first words of every name, for example "Tôm Sú". */
  name: string;
  category: CategorySlug;
  pool: PoolName;
  species: DemoSpecies;
  intro: string;
  basePrice: number;
  forms: Form[];
  origins: Origin[];
  /** How many products to make from the form × origin combinations. */
  count: number;
  tips: string[];
}

const PACKING: Record<Kind, string[]> = {
  live: [
    'Đóng thùng xốp có sục oxy, giữ sống 4-6 giờ vận chuyển nội thành.',
    'Giao trong thùng xốp kèm túi oxy; bạn nhận còn bơi, kiểm tra hàng trước khi thanh toán.',
    'Vựa tuyển từng con, đóng thùng oxy ngay khi có đơn nên hàng tới tay vẫn khỏe.',
  ],
  fresh: [
    'Ướp đá vảy trong thùng xốp, giữ lạnh 0-4 °C suốt hành trình giao.',
    'Cắt và đóng khay ngay trong ngày, ướp đá, giao lạnh trong 2 giờ nội thành.',
    'Hàng về trong ngày, sơ chế sạch, ướp đá giữ độ tươi tới tay bạn.',
  ],
  frozen: [
    'Cấp đông nhanh -40 °C, hút chân không từng gói, hạn dùng 6-12 tháng ở -18 °C.',
    'Đông lạnh dạng khay rời, lấy đủ lượng cần dùng, phần còn lại để ngăn đá.',
    'Cấp đông ngay sau khi sơ chế, giữ nguyên vị ngọt; giao kèm đá khô.',
  ],
  cooked: [
    'Hấp chín sẵn, làm lạnh nhanh và đóng hộp; chỉ cần hâm nóng hoặc dùng nguội.',
    'Đã chế biến sẵn, đóng hộp giữ nhiệt; dùng trong 24 giờ khi bảo quản mát.',
  ],
  dried: [
    'Phơi nắng tự nhiên, hút chân không, bảo quản nơi khô ráo hoặc ngăn mát 6 tháng.',
    'Đóng gói kín, không chất bảo quản; để ngăn mát để giữ mùi thơm lâu hơn.',
  ],
  sauce: [
    'Đóng chai thủy tinh, đậy kín, tránh ánh nắng; sau khi mở nắp nên dùng trong 3 tháng.',
    'Ủ chượp tự nhiên đủ thời gian, lọc qua nhiều lần; đóng chai và dán tem truy xuất nguồn gốc.',
  ],
  set: [
    'Các phần được chia sẵn theo khay, ướp đá và giao cùng một chuyến; có hướng dẫn chế biến kèm theo.',
    'Đóng thùng riêng từng loại, ghi rõ cách bảo quản và chế biến, kèm nước chấm.',
  ],
};

const SHIPPING_LINES = [
  'Vựa nhận đơn trước 15 giờ giao trong ngày tại TP.HCM và Hà Nội.',
  'Giao toàn quốc bằng xe lạnh, nhận hàng trong 24-48 giờ.',
  'Đổi mới 1 đổi 1 nếu hải sản chết, hỏng hoặc không đúng mô tả, báo trong 2 giờ sau khi nhận.',
  'Cân đúng trọng lượng thịt, hoàn tiền phần chênh lệch nếu thiếu.',
];

const F = (label: string, kind: Kind, text: string, mul: number, sizes: string[], unit?: string): Form => ({ label, kind, text, mul, sizes, unit });
const O = (label: string, text: string): Origin => ({ label, text });

const FAMILIES: Family[] = [
  // ---------------------------------------------------------------- cá
  {
    key: 'hoi', name: 'Cá Hồi', category: 'ca-bien-tuoi', pool: 'salmon', count: 12, basePrice: 590_000,
    species: { slug: 'ca-hoi-atlantic', commonName: 'Cá hồi Đại Tây Dương', scientificName: 'Salmo salar', description: 'Cá hồi thịt cam đỏ, nhiều Omega-3, vân mỡ đều, ăn sống hoặc nấu chín đều ngon.' },
    intro: 'Cá hồi thịt cam đỏ, vân mỡ đẹp, béo mà không ngấy, giàu Omega-3.',
    forms: [
      F('Phi Lê Tươi', 'fresh', 'Phi lê bỏ da, cắt sẵn khối, đạt chuẩn ăn sashimi.', 1.0, ['Khối 300-400 g', 'Khối 500-700 g', 'Khối 1 kg']),
      F('Phi Lê Đông Lạnh', 'frozen', 'Phi lê cấp đông nhanh, tiện trữ ngăn đá dùng dần.', 0.82, ['Gói 500 g', 'Gói 1 kg']),
      F('Nguyên Con Làm Sạch', 'fresh', 'Nguyên con đã bỏ ruột và vảy, thích hợp nướng cả con hoặc cắt khúc.', 0.7, ['2-3 kg/con', '3-4 kg/con', '4-5 kg/con']),
      F('Cắt Steak', 'fresh', 'Cắt khoanh dày 2-3 cm, áp chảo hoặc nướng giữ độ ngọt.', 0.78, ['Khay 500 g', 'Khay 1 kg']),
      F('Cắt Sashimi', 'fresh', 'Miếng đã cắt lát, xếp khay kèm gói wasabi và nước tương.', 1.25, ['Khay 200 g', 'Khay 400 g']),
      F('Phần Bụng Béo', 'fresh', 'Phần bụng nhiều mỡ nhất, tan trong miệng, hợp nướng muối hoặc ăn sống.', 0.95, ['Khay 500 g', 'Khay 1 kg']),
    ],
    origins: [O('Na Uy', 'Nhập khẩu trực tiếp từ vùng nuôi biển lạnh của Na Uy.'), O('Chile', 'Cá nuôi vùng Patagonia (Chile), nước lạnh sạch.'), O('Tasmania', 'Nuôi tại Tasmania (Úc), thịt chắc và ít tanh.'), O('Canada', 'Nhập từ vùng nuôi British Columbia (Canada).')],
    tips: ['Ăn sống nên dùng trong 24 giờ kể từ lúc nhận và giữ ở 0-2 °C.', 'Nướng 4 phút mỗi mặt với bơ tỏi là đủ chín mềm.'],
  },
  {
    key: 'ngu', name: 'Cá Ngừ Đại Dương', category: 'ca-bien-tuoi', pool: 'tuna', count: 8, basePrice: 340_000,
    species: { slug: 'ca-ngu-vay-vang', commonName: 'Cá ngừ vây vàng', scientificName: 'Thunnus albacares', description: 'Cá ngừ đại dương thịt đỏ, đánh bắt bằng câu tay ở vùng biển Nam Trung Bộ.' },
    intro: 'Cá ngừ đại dương đánh bắt bằng câu tay, thịt đỏ tươi, ít tanh, nhiều đạm.',
    forms: [
      F('Phi Lê', 'fresh', 'Phi lê thịt đỏ, ăn sống kiểu sashimi hoặc áp chảo tái.', 1.0, ['Khối 500 g', 'Khối 1 kg']),
      F('Cắt Steak', 'fresh', 'Khoanh dày 2-3 cm, áp chảo vài phút mỗi mặt giữ phần giữa còn hồng.', 0.9, ['Khay 500 g', 'Khay 1 kg']),
      F('Phần Bụng', 'fresh', 'Phần bụng nhiều mỡ, vị béo, ăn sống ngon nhất.', 2.1, ['Khay 300 g', 'Khay 500 g']),
      F('Đông Lạnh Nguyên Khối', 'frozen', 'Cấp đông -60 °C giữ màu đỏ, rã đông tự nhiên trong ngăn mát.', 0.8, ['Khối 1 kg', 'Khối 2 kg']),
    ],
    origins: [O('Bình Định', 'Đánh bắt xa bờ ở ngư trường Bình Định.'), O('Phú Yên', 'Câu tay ở vùng biển Phú Yên, cá được xử lý ngay trên tàu.'), O('Khánh Hòa', 'Nguồn cá từ cảng cá Hòn Rớ (Khánh Hòa).'), O('Nhật Bản', 'Nhập khẩu hạng sashimi, phân loại theo độ mỡ.')],
    tips: ['Muốn ăn sống, chọn khối còn lạnh, cắt ngang thớ thịt.', 'Áp chảo lửa lớn 1 phút mỗi mặt để phần trong còn hồng.'],
  },
  {
    key: 'chem', name: 'Cá Chẽm', category: 'ca-bien-tuoi', pool: 'seabass', count: 8, basePrice: 195_000,
    species: { slug: 'ca-chem', commonName: 'Cá chẽm (cá vược)', scientificName: 'Lates calcarifer', description: 'Cá chẽm thịt trắng, dai ngọt, ít xương dăm, nuôi lồng bè ở vùng cửa sông và biển.' },
    intro: 'Cá chẽm thịt trắng dai ngọt, ít xương dăm, hợp hấp, chiên giòn hoặc nấu canh chua.',
    forms: [
      F('Tươi Nguyên Con', 'fresh', 'Cá còn tươi, mắt trong, mang đỏ; có thể làm sạch miễn phí.', 1.0, ['0.8-1 kg/con', '1-1.5 kg/con', '1.5-2 kg/con']),
      F('Phi Lê', 'fresh', 'Phi lê bỏ xương lớn, giữ da giòn khi áp chảo.', 1.45, ['Khay 500 g', 'Khay 1 kg']),
      F('Cắt Khúc', 'fresh', 'Cắt khúc dày 3-4 cm, tiện nướng giấy bạc hoặc kho tộ.', 1.15, ['Khay 700 g', 'Khay 1.5 kg']),
      F('Đông Lạnh Làm Sạch', 'frozen', 'Đã bỏ nội tạng, cấp đông từng con, hút chân không.', 0.82, ['1-1.5 kg/con', '1.5-2 kg/con']),
    ],
    origins: [O('Nha Trang', 'Nuôi lồng bè ở vịnh Nha Trang.'), O('Hải Phòng', 'Cá nuôi vùng biển Cát Bà, Hải Phòng.'), O('Cam Ranh', 'Nuôi ở vịnh Cam Ranh, nước sạch và nhiều thức ăn tự nhiên.'), O('Vũng Tàu', 'Cá lồng bè Vũng Tàu, thu hoạch theo đơn.')],
    tips: ['Hấp xì dầu 10-12 phút theo cân nặng, rưới dầu hành nóng.', 'Giữ ở 0-4 °C và chế biến trong 24 giờ.'],
  },
  {
    key: 'mu', name: 'Cá Mú', category: 'ca-bien-tuoi', pool: 'snapper', count: 8, basePrice: 520_000,
    species: { slug: 'ca-mu', commonName: 'Cá mú', scientificName: 'Epinephelus spp.', description: 'Cá mú thịt chắc, ngọt, da dày giàu collagen; loại hải sản cao cấp của tiệc và nhà hàng.' },
    intro: 'Cá mú thịt chắc ngọt, da dày giàu collagen, món hấp, nấu lẩu hay nướng đều sang.',
    forms: [
      F('Đỏ Sống', 'live', 'Cá mú đỏ nuôi bể, bơi khỏe, thịt hồng nhạt, rất ngọt.', 1.0, ['0.8-1 kg/con', '1-1.5 kg/con', '1.5-2 kg/con']),
      F('Trân Châu Sống', 'live', 'Cá mú trân châu (cá mú nghệ), vân đen vàng đẹp, thịt dày.', 1.35, ['1-1.5 kg/con', '1.5-2 kg/con']),
      F('Đen Tươi', 'fresh', 'Cá mú đen tươi ướp đá, giá dễ chịu, hợp nấu lẩu.', 0.6, ['1-1.5 kg/con', '2-3 kg/con']),
      F('Chấm Cam Sống', 'live', 'Cá mú chấm cam vân nâu, thịt dai, ít tanh.', 0.9, ['0.7-1 kg/con', '1-1.5 kg/con']),
    ],
    origins: [O('Vân Phong', 'Nuôi lồng bè ở vịnh Vân Phong (Khánh Hòa).'), O('Côn Đảo', 'Đánh bắt tự nhiên quanh Côn Đảo.'), O('Phú Quốc', 'Nuôi bè biển Phú Quốc, nước sạch.'), O('Hà Tiên', 'Nuôi vùng biển Hà Tiên (Kiên Giang).')],
    tips: ['Hấp gừng hành 12-15 phút, thịt trắng ngọt nước.', 'Giữ sống trong thùng nước biển sục khí tới lúc chế biến.'],
  },
  {
    key: 'hong', name: 'Cá Hồng', category: 'ca-bien-tuoi', pool: 'snapper', count: 6, basePrice: 215_000,
    species: { slug: 'ca-hong', commonName: 'Cá hồng', scientificName: 'Lutjanus spp.', description: 'Cá hồng thân đỏ, thịt trắng chắc, ít xương, vị ngọt thanh.' },
    intro: 'Cá hồng thân đỏ tươi, thịt trắng chắc, ít xương, nấu canh chua hay hấp đều hợp.',
    forms: [
      F('Đỏ Tươi', 'fresh', 'Cá còn tươi nguyên con, ướp đá vảy.', 1.0, ['0.5-0.8 kg/con', '0.8-1.2 kg/con']),
      F('Đỏ Đông Lạnh', 'frozen', 'Làm sạch, cấp đông từng con, tiện trữ.', 0.78, ['0.5-0.8 kg/con', '0.8-1.2 kg/con']),
      F('Phi Lê', 'fresh', 'Phi lê giữ da, bỏ xương, áp chảo hoặc chiên sốt me.', 1.5, ['Khay 500 g', 'Khay 1 kg']),
    ],
    origins: [O('Vũng Tàu', 'Đánh bắt ở ngư trường Vũng Tàu.'), O('Nha Trang', 'Nguồn từ ngư dân Nha Trang.'), O('Quy Nhơn', 'Cá của ngư dân Quy Nhơn, về cảng mỗi sáng.'), O('Phú Quốc', 'Đánh bắt quanh đảo Phú Quốc.')],
    tips: ['Kho tộ với thịt ba chỉ hoặc nấu canh chua đều ngon.'],
  },
  {
    key: 'thu', name: 'Cá Thu', category: 'ca-bien-tuoi', pool: 'mackerel', count: 8, basePrice: 255_000,
    species: { slug: 'ca-thu', commonName: 'Cá thu', scientificName: 'Scomberomorus spp.', description: 'Cá thu thịt dày, ít xương, béo thơm, chiên, kho hay làm chả cá đều được.' },
    intro: 'Cá thu thịt dày ít xương, béo thơm, kho tiêu, chiên giòn hoặc làm chả cá rất hợp.',
    forms: [
      F('Tươi Nguyên Con', 'fresh', 'Cá thu mới về bến, thân cứng, mắt trong.', 1.0, ['1-1.5 kg/con', '1.5-2 kg/con', '2-3 kg/con']),
      F('Cắt Khúc', 'fresh', 'Cắt khúc dày 3 cm, tiện chiên hoặc kho.', 1.1, ['Khay 700 g', 'Khay 1.5 kg']),
      F('Phi Lê', 'fresh', 'Phi lê bỏ xương, làm chả cá hoặc áp chảo.', 1.4, ['Khay 500 g', 'Khay 1 kg']),
      F('Một Nắng', 'dried', 'Phơi nắng một ngày cho thịt săn, nướng hoặc chiên đều thơm.', 1.7, ['Gói 500 g', 'Gói 1 kg']),
      F('Đông Lạnh', 'frozen', 'Cấp đông nguyên con, giữ vị ngọt.', 0.8, ['1-1.5 kg/con', '1.5-2 kg/con']),
    ],
    origins: [O('Nha Trang', 'Cá thu của ngư dân Nha Trang.'), O('Phan Thiết', 'Đánh bắt tại ngư trường Phan Thiết.'), O('Vũng Tàu', 'Cá thu cảng Vũng Tàu.'), O('Sầm Sơn', 'Cá thu vùng biển Thanh Hóa.')],
    tips: ['Kho tiêu với thơm (dứa) và cà chua cho nồi cá đậm đà.'],
  },
  {
    key: 'nuc', name: 'Cá Nục', category: 'ca-bien-tuoi', pool: 'mackerel', count: 5, basePrice: 92_000,
    species: { slug: 'ca-nuc', commonName: 'Cá nục', scientificName: 'Decapterus spp.', description: 'Cá nục thịt trắng, mềm, giá bình dân, món quen thuộc của bữa cơm gia đình.' },
    intro: 'Cá nục thịt trắng mềm, giá bình dân, hợp kho nghệ, nấu canh chua hoặc chiên giòn.',
    forms: [
      F('Tươi', 'fresh', 'Cá nục mới về, ướp đá, size đều.', 1.0, ['8-10 con/kg', '12-15 con/kg']),
      F('Đông Lạnh', 'frozen', 'Cấp đông từng khay 1 kg, rã đông nhanh.', 0.85, ['Khay 1 kg', 'Thùng 5 kg']),
      F('Làm Sạch', 'fresh', 'Đã bỏ ruột và mang, rửa sạch sẵn.', 1.25, ['Khay 700 g', 'Khay 1 kg']),
    ],
    origins: [O('Phan Thiết', 'Nguồn cá nục Phan Thiết.'), O('Nha Trang', 'Cá nục ngư dân Nha Trang.'), O('Bình Định', 'Cá nục cảng Quy Nhơn.')],
    tips: ['Kho nghệ hoặc kho tiêu đều ngon; chiên với chút muối cho giòn da.'],
  },
  {
    key: 'com', name: 'Cá Cơm', category: 'ca-bien-tuoi', pool: 'sardine', count: 6, basePrice: 115_000,
    species: { slug: 'ca-com', commonName: 'Cá cơm', scientificName: 'Stolephorus spp.', description: 'Cá cơm nhỏ, thịt ngọt, dùng chiên giòn, nấu canh hoặc làm nước mắm.' },
    intro: 'Cá cơm nhỏ thịt ngọt, giàu canxi, chiên giòn, rim tiêu hoặc nấu canh chua đều hợp.',
    forms: [
      F('Tươi Than', 'fresh', 'Cá cơm than tươi nguyên con, ướp đá.', 1.0, ['Khay 500 g', 'Khay 1 kg']),
      F('Tươi Sạch Ruột', 'fresh', 'Đã làm sạch ruột, sẵn chiên hoặc rim.', 1.3, ['Khay 500 g', 'Khay 1 kg']),
      F('Đông Lạnh', 'frozen', 'Cấp đông rời từng con, lấy bao nhiêu dùng bấy nhiêu.', 0.85, ['Gói 500 g', 'Gói 1 kg']),
    ],
    origins: [O('Phú Quốc', 'Cá cơm Phú Quốc, vùng nguyên liệu nước mắm nổi tiếng.'), O('Phan Thiết', 'Cá cơm Phan Thiết.'), O('Kiên Giang', 'Cá cơm vùng biển Kiên Giang.')],
    tips: ['Chiên giòn chấm muối tiêu chanh hoặc rim mặn ngọt ăn cơm.'],
  },
  {
    key: 'trich', name: 'Cá Trích', category: 'ca-bien-tuoi', pool: 'sardine', count: 5, basePrice: 98_000,
    species: { slug: 'ca-trich', commonName: 'Cá trích', scientificName: 'Sardinella spp.', description: 'Cá trích thân bạc, béo, hợp nướng than, chiên hoặc nấu canh.' },
    intro: 'Cá trích thân bạc béo ngậy, nướng than hay chiên đều thơm lừng.',
    forms: [
      F('Tươi', 'fresh', 'Cá tươi ướp đá, thân bạc sáng.', 1.0, ['10-12 con/kg', '15-20 con/kg']),
      F('Nướng Sẵn Đông Lạnh', 'frozen', 'Sơ chế tẩm muối, cấp đông, chỉ cần nướng 6 phút.', 1.4, ['Gói 500 g', 'Gói 1 kg']),
    ],
    origins: [O('Quảng Ngãi', 'Cá trích của ngư dân Quảng Ngãi.'), O('Bình Định', 'Cá trích cảng Quy Nhơn.'), O('Hải Phòng', 'Cá trích vịnh Bắc Bộ.')],
    tips: ['Nướng than 4-5 phút mỗi mặt, chấm muối ớt xanh.'],
  },
  {
    key: 'chim', name: 'Cá Chim Trắng', category: 'ca-bien-tuoi', pool: 'pomfret', count: 6, basePrice: 265_000,
    species: { slug: 'ca-chim-trang', commonName: 'Cá chim trắng', scientificName: 'Pampus argenteus', description: 'Cá chim thân dẹt, thịt trắng mềm, ít xương, hợp chiên hoặc hấp.' },
    intro: 'Cá chim thân dẹt, thịt trắng mềm ngọt, ít xương, trẻ nhỏ và người lớn tuổi đều dễ ăn.',
    forms: [
      F('Tươi', 'fresh', 'Cá chim tươi nguyên con ướp đá.', 1.0, ['0.4-0.6 kg/con', '0.6-0.8 kg/con']),
      F('Làm Sạch', 'fresh', 'Đã bỏ ruột, vảy, sẵn chiên giòn hoặc hấp.', 1.2, ['0.4-0.6 kg/con', '0.6-0.8 kg/con']),
      F('Đông Lạnh', 'frozen', 'Cấp đông nguyên con, rã đông là dùng.', 0.82, ['Gói 3 con', 'Gói 5 con']),
    ],
    origins: [O('Kiên Giang', 'Cá chim biển Kiên Giang.'), O('Quảng Ninh', 'Cá chim vịnh Hạ Long.'), O('Nha Trang', 'Cá chim cảng Nha Trang.'), O('Vũng Tàu', 'Cá chim cảng Vũng Tàu.')],
    tips: ['Chiên giòn chấm nước mắm tỏi ớt, hoặc hấp bầu.'],
  },
  {
    key: 'trap', name: 'Cá Tráp Biển', category: 'ca-bien-tuoi', pool: 'pomfret', count: 4, basePrice: 185_000,
    species: { slug: 'ca-trap', commonName: 'Cá tráp', scientificName: 'Sparidae', description: 'Cá tráp thân tròn, thịt trắng chắc, vị ngọt thanh, hợp nướng muối.' },
    intro: 'Cá tráp thân tròn thịt trắng chắc, ngọt thanh, nướng muối hay hấp đều đẹp mâm.',
    forms: [
      F('Tươi', 'fresh', 'Cá tráp tươi ướp đá nguyên con.', 1.0, ['0.4-0.6 kg/con', '0.6-0.9 kg/con']),
      F('Nướng Muối Sẵn', 'frozen', 'Đã tẩm muối và sả, chỉ cần nướng 15 phút.', 1.5, ['Gói 2 con', 'Gói 4 con']),
    ],
    origins: [O('Hải Phòng', 'Cá tráp nuôi lồng bè Cát Bà.'), O('Quảng Ninh', 'Cá tráp vùng Vân Đồn.')],
    tips: ['Nướng muối 15-18 phút, chấm muối tiêu chanh.'],
  },
  {
    key: 'hoivan', name: 'Cá Hồi Vân', category: 'ca-bien-tuoi', pool: 'trout', count: 4, basePrice: 295_000,
    species: { slug: 'ca-hoi-van', commonName: 'Cá hồi vân', scientificName: 'Oncorhynchus mykiss', description: 'Cá hồi vân nuôi nước lạnh vùng cao, thịt hồng nhạt, ngọt và ít béo hơn cá hồi biển.' },
    intro: 'Cá hồi vân nuôi nước lạnh ở vùng cao, thịt hồng nhạt, ngọt thanh, ít béo.',
    forms: [
      F('Tươi Nguyên Con', 'fresh', 'Cá nuôi bể nước suối, giao ướp đá.', 1.0, ['0.8-1 kg/con', '1-1.5 kg/con']),
      F('Phi Lê', 'fresh', 'Phi lê bỏ xương, áp chảo hoặc nướng giấy bạc.', 1.5, ['Khay 500 g', 'Khay 1 kg']),
    ],
    origins: [O('Đà Lạt', 'Nuôi nước suối lạnh trên cao nguyên Lâm Đồng.'), O('Sa Pa', 'Nuôi nước suối Sa Pa.')],
    tips: ['Nướng giấy bạc với bơ chanh 15 phút.'],
  },
  // ---------------------------------------------------------------- tôm
  {
    key: 'tomsu', name: 'Tôm Sú', category: 'tom-song', pool: 'tigerPrawn', count: 15, basePrice: 460_000,
    species: { slug: 'tom-su-bien', commonName: 'Tôm Sú Biển Tự Nhiên', scientificName: 'Penaeus monodon', description: 'Loài tôm biển có kích thước lớn, vỏ dày hoa văn sọc vằn đặc trưng.' },
    intro: 'Tôm sú vỏ sọc vằn, thịt săn chắc, ngọt đậm, giàu đạm và canxi.',
    forms: [
      F('Sống', 'live', 'Tôm bơi khỏe trong hồ sục khí, thịt ngọt nhất khi chế biến ngay.', 1.0, ['Size 15-20 con/kg', 'Size 20-30 con/kg', 'Size 30-40 con/kg']),
      F('Tươi Ướp Đá', 'fresh', 'Tôm vừa chết trong ngày, ướp đá vảy, vỏ còn bóng.', 0.82, ['Size 20-30 con/kg', 'Size 30-40 con/kg']),
      F('Đông Lạnh', 'frozen', 'Cấp đông rời từng con, hút chân không.', 0.68, ['Size 20-30 con/kg', 'Size 30-40 con/kg']),
      F('Bóc Vỏ Bỏ Chỉ', 'fresh', 'Đã bóc vỏ, rút chỉ lưng, giữ đuôi, sẵn chiên hoặc xào.', 1.45, ['Khay 300 g', 'Khay 500 g']),
      F('Tẩm Ướp Muối Ớt', 'frozen', 'Tẩm muối ớt tỏi sẵn, chỉ cần nướng 8 phút.', 1.1, ['Khay 500 g', 'Khay 1 kg']),
    ],
    origins: [O('Cà Mau', 'Tôm của vùng Năm Căn, Cà Mau.'), O('Bạc Liêu', 'Nuôi sinh thái ở Bạc Liêu.'), O('Phú Quốc', 'Đánh bắt vùng biển Hàm Ninh, Phú Quốc.'), O('Quảng Ninh', 'Nuôi ao đất ven biển Quảng Ninh.'), O('Khánh Hòa', 'Tôm vùng Cam Ranh, Khánh Hòa.'), O('Kiên Giang', 'Tôm biển Kiên Giang.')],
    tips: ['Hấp bia hoặc nước dừa 4-5 phút; tôm sống nên chế biến ngay khi nhận.', 'Nướng muối ớt trên than hoa cho vỏ giòn và thịt ngọt.'],
  },
  {
    key: 'tomthe', name: 'Tôm Thẻ Chân Trắng', category: 'tom-song', pool: 'shrimp', count: 10, basePrice: 195_000,
    species: { slug: 'tom-the-chan-trang', commonName: 'Tôm thẻ chân trắng', scientificName: 'Litopenaeus vannamei', description: 'Tôm thẻ chân trắng vỏ mỏng, thịt giòn ngọt, giá dễ chịu, dùng hằng ngày.' },
    intro: 'Tôm thẻ chân trắng vỏ mỏng, thịt giòn ngọt, giá dễ chịu, dùng được hằng ngày.',
    forms: [
      F('Tươi', 'fresh', 'Tôm thu hoạch trong ngày, ướp đá, vỏ bóng.', 1.0, ['Size 40-50 con/kg', 'Size 60-70 con/kg', 'Size 80-100 con/kg']),
      F('Sống', 'live', 'Tôm bơi trong hồ sục khí, đóng oxy khi giao.', 1.3, ['Size 40-50 con/kg', 'Size 60-70 con/kg']),
      F('Đông Lạnh', 'frozen', 'Cấp đông rời IQF, tiện lấy dùng.', 0.8, ['Gói 500 g', 'Gói 1 kg']),
      F('Bóc Vỏ', 'fresh', 'Bóc vỏ bỏ đầu, thịt sạch, nấu canh hoặc làm chả tôm.', 1.6, ['Khay 300 g', 'Khay 500 g']),
    ],
    origins: [O('Bạc Liêu', 'Nuôi công nghệ cao ở Bạc Liêu.'), O('Cà Mau', 'Tôm nuôi vùng Cà Mau.'), O('Ninh Thuận', 'Nuôi ven biển Ninh Thuận, nước sạch.'), O('Bến Tre', 'Tôm vùng Ba Tri, Bến Tre.')],
    tips: ['Rang muối, chiên bơ tỏi hoặc luộc nước dừa đều ngon.'],
  },
  {
    key: 'tomcang', name: 'Tôm Càng Xanh', category: 'tom-song', pool: 'freshwaterPrawn', count: 6, basePrice: 360_000,
    species: { slug: 'tom-cang-xanh', commonName: 'Tôm càng xanh', scientificName: 'Macrobrachium rosenbergii', description: 'Tôm càng xanh đặc sản sông nước miền Tây, càng to, thịt ngọt, gạch béo.' },
    intro: 'Tôm càng xanh đặc sản sông nước miền Tây, càng to, thịt ngọt, gạch béo.',
    forms: [
      F('Sống', 'live', 'Tôm bơi khỏe, càng xanh đậm, vỏ cứng.', 1.0, ['Size 8-10 con/kg', 'Size 15-20 con/kg']),
      F('Tươi Ướp Đá', 'fresh', 'Tôm ướp đá, dùng trong ngày.', 0.8, ['Size 15-20 con/kg', 'Size 20-30 con/kg']),
    ],
    origins: [O('Đồng Tháp', 'Nuôi ruộng lúa ở Đồng Tháp.'), O('Cần Thơ', 'Tôm vùng Cần Thơ.'), O('Tiền Giang', 'Tôm vùng Gò Công, Tiền Giang.')],
    tips: ['Hấp nước dừa hoặc nướng muối ớt; ăn kèm muối tiêu chanh.'],
  },
  {
    key: 'tomhum', name: 'Tôm Hùm', category: 'tom-song', pool: 'lobster', count: 14, basePrice: 1_650_000,
    species: { slug: 'tom-hum-bong', commonName: 'Tôm hùm bông', scientificName: 'Panulirus ornatus', description: 'Tôm hùm bông vỏ hoa văn xanh vàng, thịt dày, ngọt đậm, đặc sản Nam Trung Bộ.' },
    intro: 'Tôm hùm thịt dày, ngọt đậm, món đặc sản của tiệc cưới, sinh nhật và dịp lễ.',
    forms: [
      F('Bông Sống', 'live', 'Tôm hùm bông còn sống, nuôi lồng bè, đóng thùng oxy.', 1.0, ['0.6-0.8 kg/con', '0.8-1 kg/con', '1-1.2 kg/con', '1.2-1.5 kg/con']),
      F('Xanh Sống', 'live', 'Tôm hùm xanh vỏ xanh đen, thịt chắc, giá mềm hơn tôm hùm bông.', 0.65, ['0.5-0.7 kg/con', '0.7-1 kg/con']),
      F('Bông Đông Lạnh', 'frozen', 'Cấp đông nguyên con, hút chân không, giữ vị ngọt.', 0.7, ['0.6-0.8 kg/con', '0.8-1 kg/con']),
      F('Sao Sống', 'live', 'Tôm hùm sao thân gai, ngọt thanh.', 0.55, ['0.5-0.8 kg/con']),
    ],
    origins: [O('Nha Trang', 'Nuôi lồng bè ở vịnh Nha Trang.'), O('Phú Yên', 'Nuôi ở vịnh Xuân Đài, Phú Yên.'), O('Cam Ranh', 'Nuôi ở vịnh Cam Ranh.'), O('Vân Phong', 'Nuôi ở vịnh Vân Phong.'), O('Bình Định', 'Tôm hùm vùng Quy Nhơn.')],
    tips: ['Nướng phô mai hoặc hấp bia; chia đôi dọc thân rồi nướng 10-12 phút.'],
  },
  {
    key: 'tomhumdat', name: 'Tôm Hùm Đất', category: 'tom-song', pool: 'crayfish', count: 4, basePrice: 390_000,
    species: { slug: 'tom-hum-dat', commonName: 'Tôm hùm đất', scientificName: 'Procambarus clarkii', description: 'Tôm hùm đất (crawfish) nhập khẩu, vỏ đỏ, thịt ngọt, hợp nấu kiểu Cajun.' },
    intro: 'Tôm hùm đất vỏ đỏ, thịt ngọt, hợp nấu cay kiểu Cajun hoặc xào bơ tỏi.',
    forms: [
      F('Tươi Sống', 'live', 'Tôm sống, rửa sạch trước khi chế biến.', 1.0, ['Size 15-20 con/kg', 'Size 25-30 con/kg']),
      F('Đã Luộc Đông Lạnh', 'frozen', 'Luộc chín sẵn, cấp đông, hâm nóng là ăn.', 1.2, ['Gói 500 g', 'Gói 1 kg']),
    ],
    origins: [O('Nhập khẩu', 'Nhập khẩu từ Mỹ, kiểm dịch đầy đủ.'), O('Trung Quốc', 'Nguồn nhập khẩu có kiểm dịch.')],
    tips: ['Xào sốt Cajun cay hoặc bơ tỏi, ăn bằng tay cho đã.'],
  },
  {
    key: 'tomhumbaby', name: 'Tôm Hùm Baby', category: 'tom-song', pool: 'langoustine', count: 4, basePrice: 690_000,
    species: { slug: 'tom-hum-baby', commonName: 'Tôm hùm baby (langoustine)', scientificName: 'Nephrops norvegicus', description: 'Tôm hùm baby thân nhỏ, thịt ngọt mềm, nấu nhanh, hợp nướng hoặc hấp.' },
    intro: 'Tôm hùm baby thân nhỏ, thịt ngọt mềm, nấu nhanh, hợp nướng hoặc hấp.',
    forms: [
      F('Đông Lạnh', 'frozen', 'Cấp đông nguyên con, hút chân không.', 1.0, ['Gói 500 g', 'Gói 1 kg']),
      F('Tươi Ướp Đá', 'fresh', 'Hàng về theo chuyến, ướp đá.', 1.2, ['Khay 500 g']),
    ],
    origins: [O('Nhập khẩu', 'Nhập khẩu từ châu Âu.'), O('Quảng Ninh', 'Nguồn từ vịnh Hạ Long, có theo mùa.')],
    tips: ['Nướng bơ tỏi 5-6 phút, ăn nóng.'],
  },
  {
    key: 'tomtit', name: 'Tôm Tít', category: 'tom-song', pool: 'shrimp', count: 4, basePrice: 320_000,
    species: { slug: 'tom-tit', commonName: 'Tôm tít (tôm tích)', scientificName: 'Squilla mantis', description: 'Tôm tít thân dẹt, thịt ngọt, gạch béo, hấp hoặc nướng đều ngon.' },
    intro: 'Tôm tít thịt ngọt, gạch béo, hấp, nướng hoặc rang muối đều hợp.',
    forms: [F('Sống', 'live', 'Tôm tít bơi khỏe, thịt đầy.', 1.0, ['Size 20-30 con/kg', 'Size 30-40 con/kg']), F('Đông Lạnh', 'frozen', 'Cấp đông nguyên con.', 0.75, ['Gói 500 g', 'Gói 1 kg'])],
    origins: [O('Hải Phòng', 'Tôm tít vịnh Bắc Bộ.'), O('Kiên Giang', 'Tôm tít biển Kiên Giang.')],
    tips: ['Hấp 5 phút hoặc nướng muối ớt.'],
  },
  {
    key: 'tomdat', name: 'Tôm Đất', category: 'tom-song', pool: 'shrimp', count: 3, basePrice: 245_000,
    species: { slug: 'tom-dat', commonName: 'Tôm đất', scientificName: 'Metapenaeus ensis', description: 'Tôm đất vỏ mỏng, thịt ngọt, hợp rim mặn, rang me hoặc nấu canh.' },
    intro: 'Tôm đất vỏ mỏng, thịt ngọt, hợp rim mặn ngọt, rang me hoặc nấu canh.',
    forms: [F('Tươi', 'fresh', 'Tôm đất tươi ướp đá.', 1.0, ['Size 50-60 con/kg', 'Size 70-80 con/kg']), F('Sống', 'live', 'Tôm bơi trong hồ, thịt ngọt.', 1.3, ['Size 50-60 con/kg'])],
    origins: [O('Cà Mau', 'Tôm đất vùng rừng ngập mặn Cà Mau.'), O('Bạc Liêu', 'Tôm đất Bạc Liêu.'), O('Bến Tre', 'Tôm đất Bến Tre.')],
    tips: ['Rang me hoặc rim mặn ngọt ăn cơm rất đưa.'],
  },
  // ---------------------------------------------------------------- cua ghẹ
  {
    key: 'cua', name: 'Cua Biển', category: 'cua-ghe', pool: 'crabDish', count: 12, basePrice: 520_000,
    species: { slug: 'cua-bien', commonName: 'Cua biển (cua xanh)', scientificName: 'Scylla paramamosain', description: 'Cua biển mai xanh, càng chắc, gạch son béo ngậy, thịt ngọt.' },
    intro: 'Cua biển mai xanh, càng chắc, thịt ngọt, gạch son béo ngậy.',
    forms: [
      F('Gạch Son Sống', 'live', 'Cua cái đầy gạch son, buộc dây chắc, bơi bò khỏe.', 1.0, ['3-4 con/kg', '2-3 con/kg', '2 con/kg']),
      F('Thịt Sống', 'live', 'Cua đực chắc thịt, càng đầy, mai cứng.', 0.8, ['3-4 con/kg', '2-3 con/kg']),
      F('Lột Sống', 'live', 'Cua lột vỏ mềm, ăn được cả con, chiên bột hoặc rang muối.', 0.65, ['Khay 6 con', 'Khay 10 con']),
      F('Hấp Sẵn Đóng Hộp', 'cooked', 'Hấp chín sẵn, làm lạnh, mở hộp là ăn.', 1.3, ['Hộp 1 kg', 'Hộp 2 kg']),
    ],
    origins: [O('Cà Mau', 'Cua vùng đầm rừng ngập mặn Cà Mau.'), O('Năm Căn', 'Cua Năm Căn nổi tiếng nhiều gạch.'), O('Bạc Liêu', 'Cua nuôi Bạc Liêu.'), O('Kiên Giang', 'Cua biển Kiên Giang.'), O('Quảng Ninh', 'Cua vùng Vân Đồn.')],
    tips: ['Hấp nước dừa 15-20 phút hoặc rang muối ớt; cua sống nên chế biến trong ngày.'],
  },
  {
    key: 'cuahoangde', name: 'Cua Hoàng Đế', category: 'cua-ghe', pool: 'kingCrab', count: 5, basePrice: 2_450_000,
    species: { slug: 'cua-hoang-de', commonName: 'Cua hoàng đế', scientificName: 'Paralithodes camtschaticus', description: 'Cua hoàng đế chân dài, thịt trắng dày ngọt thanh, món sang của tiệc nhà hàng.' },
    intro: 'Cua hoàng đế chân dài, thịt trắng dày ngọt thanh, món sang cho tiệc nhà hàng.',
    forms: [
      F('Chân Hấp Đông Lạnh', 'frozen', 'Chân hấp chín cấp đông, rã đông hâm nóng là dùng.', 1.0, ['Cụm 500 g', 'Cụm 1 kg']),
      F('Nguyên Con Đông Lạnh', 'frozen', 'Nguyên con đã hấp, cấp đông từ nơi đánh bắt.', 0.85, ['2-3 kg/con', '3-4 kg/con']),
    ],
    origins: [O('Alaska', 'Nhập khẩu từ Alaska (Mỹ).'), O('Nga', 'Nhập khẩu từ vùng biển Bering (Nga).'), O('Na Uy', 'Nhập khẩu từ biển Barents (Na Uy).')],
    tips: ['Hâm hơi nước 5 phút, chấm bơ chanh.'],
  },
  {
    key: 'cuatuyet', name: 'Cua Tuyết', category: 'cua-ghe', pool: 'kingCrab', count: 3, basePrice: 980_000,
    species: { slug: 'cua-tuyet', commonName: 'Cua tuyết', scientificName: 'Chionoecetes opilio', description: 'Cua tuyết chân dài mảnh, thịt ngọt, dùng lẩu hoặc hấp.' },
    intro: 'Cua tuyết chân dài mảnh, thịt ngọt thanh, hợp lẩu hoặc hấp.',
    forms: [F('Chân Hấp Đông Lạnh', 'frozen', 'Chân hấp sẵn, cấp đông.', 1.0, ['Cụm 500 g', 'Cụm 1 kg'])],
    origins: [O('Canada', 'Nhập khẩu từ Canada.'), O('Nhật Bản', 'Nhập khẩu từ Nhật Bản.'), O('Nga', 'Nhập khẩu từ Nga.')],
    tips: ['Hấp 4-5 phút hoặc nhúng lẩu 1 phút.'],
  },
  {
    key: 'gheXanh', name: 'Ghẹ Xanh', category: 'cua-ghe', pool: 'swimmingCrab', count: 9, basePrice: 340_000,
    species: { slug: 'ghe-xanh', commonName: 'Ghẹ xanh', scientificName: 'Portunus pelagicus', description: 'Ghẹ xanh mai nhọn, thịt ngọt, gạch béo, giá mềm hơn cua biển.' },
    intro: 'Ghẹ xanh càng dài, thịt ngọt, gạch béo, hấp hay rang me đều ngon.',
    forms: [
      F('Sống', 'live', 'Ghẹ bơi khỏe, mai cứng, buộc dây.', 1.0, ['4-5 con/kg', '6-8 con/kg', '8-10 con/kg']),
      F('Hấp Sẵn', 'cooked', 'Hấp chín sẵn, làm lạnh nhanh, đóng khay.', 1.25, ['Khay 1 kg', 'Khay 2 kg']),
      F('Đông Lạnh Cắt Đôi', 'frozen', 'Cắt đôi làm sạch, cấp đông, tiện nấu lẩu hoặc rang me.', 0.8, ['Gói 500 g', 'Gói 1 kg']),
      F('Gạch Sống Loại Đặc Biệt', 'live', 'Ghẹ cái đầy gạch, chọn kỹ từng con.', 1.35, ['4-5 con/kg', '6-8 con/kg']),
    ],
    origins: [O('Phan Thiết', 'Ghẹ vùng biển Phan Thiết.'), O('Quảng Ninh', 'Ghẹ vịnh Hạ Long.'), O('Kiên Giang', 'Ghẹ Kiên Giang.'), O('Khánh Hòa', 'Ghẹ vịnh Nha Trang.'), O('Hà Tiên', 'Ghẹ Hà Tiên.')],
    tips: ['Hấp 8-10 phút hoặc rang me; ghẹ sống nên chế biến trong ngày.'],
  },
  {
    key: 'ghedo', name: 'Ghẹ Đỏ', category: 'cua-ghe', pool: 'swimmingCrab', count: 3, basePrice: 295_000,
    species: { slug: 'ghe-do', commonName: 'Ghẹ đỏ', scientificName: 'Portunus haanii', description: 'Ghẹ đỏ vỏ đỏ cam, thịt ngọt, gạch nhiều.' },
    intro: 'Ghẹ đỏ vỏ đỏ cam, thịt ngọt, nhiều gạch, giá dễ chịu.',
    forms: [F('Sống', 'live', 'Ghẹ bơi khỏe.', 1.0, ['5-6 con/kg', '7-9 con/kg']), F('Hấp Sẵn', 'cooked', 'Hấp chín sẵn đóng khay.', 1.25, ['Khay 1 kg'])],
    origins: [O('Quảng Ngãi', 'Ghẹ vùng Quảng Ngãi.'), O('Bình Thuận', 'Ghẹ vùng Phan Thiết.')],
    tips: ['Hấp gừng 8 phút.'],
  },
  {
    key: 'ghe3cham', name: 'Ghẹ Ba Chấm', category: 'cua-ghe', pool: 'swimmingCrab', count: 3, basePrice: 360_000,
    species: { slug: 'ghe-ba-cham', commonName: 'Ghẹ ba chấm', scientificName: 'Portunus sanguinolentus', description: 'Ghẹ ba chấm có ba đốm trắng trên mai, thịt chắc ngọt.' },
    intro: 'Ghẹ ba chấm đặc trưng ba đốm trắng trên mai, thịt chắc ngọt.',
    forms: [F('Sống', 'live', 'Ghẹ bơi khỏe, càng chắc.', 1.0, ['4-5 con/kg', '6-8 con/kg']), F('Hấp Sẵn', 'cooked', 'Hấp chín sẵn.', 1.25, ['Khay 1 kg'])],
    origins: [O('Kiên Giang', 'Ghẹ ba chấm Kiên Giang.'), O('Phú Quốc', 'Ghẹ ba chấm vùng đảo Phú Quốc.')],
    tips: ['Hấp hoặc nấu bún riêu ghẹ.'],
  },
  // ---------------------------------------------------------------- mực
  {
    key: 'mucong', name: 'Mực Ống', category: 'muc-bach-tuoc', pool: 'squid', count: 10, basePrice: 285_000,
    species: { slug: 'muc-ong', commonName: 'Mực ống', scientificName: 'Loligo spp.', description: 'Mực ống thân dài, thịt giòn ngọt, thích hợp nướng, xào, hấp gừng.' },
    intro: 'Mực ống thân dài, thịt giòn ngọt, nướng, xào hay hấp gừng đều ngon.',
    forms: [
      F('Câu Đêm Tươi', 'fresh', 'Mực câu đêm, da bóng, mắt đen, ướp đá ngay trên tàu.', 1.0, ['5-7 con/kg', '8-10 con/kg', '10-12 con/kg']),
      F('Trứng Tươi', 'fresh', 'Mực mùa sinh sản, nhiều trứng, hấp gừng thơm ngọt.', 1.3, ['4-6 con/kg', '6-8 con/kg']),
      F('Làm Sạch Đông Lạnh', 'frozen', 'Đã bỏ nội tạng và da, cấp đông.', 0.78, ['Gói 500 g', 'Gói 1 kg']),
      F('Nhồi Thịt Sẵn', 'frozen', 'Nhồi thịt và nấm mèo, chỉ cần hấp hoặc chiên.', 1.2, ['Khay 6 con', 'Khay 10 con']),
    ],
    origins: [O('Phú Quốc', 'Mực câu đêm quanh đảo Phú Quốc.'), O('Cô Tô', 'Mực nhảy vùng biển Cô Tô.'), O('Quy Nhơn', 'Mực ngư dân Quy Nhơn.'), O('Phan Thiết', 'Mực vùng Phan Thiết.'), O('Nha Trang', 'Mực ngư dân Nha Trang.'), O('Côn Đảo', 'Mực câu quanh Côn Đảo.')],
    tips: ['Hấp gừng 5-6 phút, đừng nấu quá lâu kẻo dai.'],
  },
  {
    key: 'mucnang', name: 'Mực Nang', category: 'muc-bach-tuoc', pool: 'squid', count: 5, basePrice: 245_000,
    species: { slug: 'muc-nang', commonName: 'Mực nang', scientificName: 'Sepia spp.', description: 'Mực nang thân dày, thịt giòn dai, nhiều mực đen, hợp nướng sa tế.' },
    intro: 'Mực nang thân dày, thịt giòn dai, hợp nướng sa tế, xào chua ngọt.',
    forms: [F('Tươi', 'fresh', 'Mực nang tươi ướp đá.', 1.0, ['0.3-0.5 kg/con', '0.5-0.8 kg/con']), F('Làm Sạch Đông Lạnh', 'frozen', 'Bỏ mai và nội tạng, cấp đông.', 0.8, ['Gói 500 g', 'Gói 1 kg'])],
    origins: [O('Hạ Long', 'Mực nang vịnh Hạ Long.'), O('Phú Quốc', 'Mực nang Phú Quốc.'), O('Quy Nhơn', 'Mực nang Quy Nhơn.')],
    tips: ['Nướng sa tế hoặc xào cần tỏi.'],
  },
  {
    key: 'muclat', name: 'Mực Lá', category: 'muc-bach-tuoc', pool: 'squid', count: 5, basePrice: 395_000,
    species: { slug: 'muc-la', commonName: 'Mực lá', scientificName: 'Sepioteuthis lessoniana', description: 'Mực lá thân dẹt như chiếc lá, thịt dày, ngọt và mềm, loại mực ngon nhất.' },
    intro: 'Mực lá thân dẹt như chiếc lá, thịt dày ngọt và mềm, được xem là loại mực ngon nhất.',
    forms: [F('Tươi', 'fresh', 'Mực lá tươi, còn đổi màu, ướp đá.', 1.0, ['3-4 con/kg', '5-6 con/kg']), F('Sống', 'live', 'Mực lá còn bơi, thịt giòn ngọt nhất.', 1.45, ['3-4 con/kg'])],
    origins: [O('Phú Quốc', 'Mực lá vùng biển Phú Quốc.'), O('Hạ Long', 'Mực lá Quảng Ninh.'), O('Côn Đảo', 'Mực lá Côn Đảo.')],
    tips: ['Nướng than hoa hoặc hấp bia, giữ nguyên vị ngọt.'],
  },
  {
    key: 'btuoc', name: 'Bạch Tuộc', category: 'muc-bach-tuoc', pool: 'octopus', count: 7, basePrice: 245_000,
    species: { slug: 'bach-tuoc', commonName: 'Bạch tuộc', scientificName: 'Octopus vulgaris', description: 'Bạch tuộc thịt giòn sần sật, hợp nướng, nhúng lẩu hoặc xào.' },
    intro: 'Bạch tuộc thịt giòn sần sật, hợp nướng sa tế, nhúng lẩu hoặc xào.',
    forms: [
      F('Tươi', 'fresh', 'Bạch tuộc tươi ướp đá, vòi chắc.', 1.0, ['0.3-0.5 kg/con', '0.5-0.8 kg/con']),
      F('Baby', 'fresh', 'Bạch tuộc con, mềm, nấu nhanh.', 1.3, ['Khay 500 g', 'Khay 1 kg']),
      F('Làm Sạch Đông Lạnh', 'frozen', 'Bỏ mắt, mỏ và nội tạng, cấp đông.', 0.78, ['Gói 500 g', 'Gói 1 kg']),
      F('Nguyên Con Đông Lạnh', 'frozen', 'Nguyên con nhập khẩu, cấp đông.', 0.9, ['Gói 1 kg', 'Gói 2 kg']),
    ],
    origins: [O('Phan Thiết', 'Bạch tuộc vùng biển Phan Thiết.'), O('Vũng Tàu', 'Bạch tuộc Vũng Tàu.'), O('Quy Nhơn', 'Bạch tuộc Quy Nhơn.'), O('Kiên Giang', 'Bạch tuộc Kiên Giang.')],
    tips: ['Luộc 3 phút rồi nướng sa tế để thịt giòn mà không dai.'],
  },
  // ---------------------------------------------------------------- nghêu sò ốc
  {
    key: 'hau', name: 'Hàu', category: 'ngheu-so-oc', pool: 'oyster', count: 10, basePrice: 135_000,
    species: { slug: 'hau-bien', commonName: 'Hàu biển', scientificName: 'Crassostrea gigas', description: 'Hàu biển thịt béo ngậy, giàu kẽm, ăn sống hoặc nướng mỡ hành.' },
    intro: 'Hàu thịt béo ngậy, giàu kẽm, nướng mỡ hành, hấp sả hoặc ăn sống với chanh.',
    forms: [
      F('Sữa Còn Vỏ', 'live', 'Hàu sữa to béo, còn vỏ, giữ lạnh.', 1.0, ['Khay 12 con', 'Khay 24 con', 'Rổ 1 kg']),
      F('Nửa Vỏ Đông Lạnh', 'frozen', 'Hàu để nửa vỏ, cấp đông, tiện nướng.', 0.9, ['Khay 12 con', 'Khay 24 con']),
      F('Thịt Bóc Vỏ', 'fresh', 'Thịt hàu đã bóc, rửa sạch, dùng nấu cháo, chiên trứng.', 1.5, ['Hộp 250 g', 'Hộp 500 g']),
      F('Pacific Sống', 'live', 'Hàu Pacific vỏ dày, thịt đầy, hợp ăn sống.', 1.35, ['Khay 6 con', 'Khay 12 con']),
    ],
    origins: [O('Vân Đồn', 'Hàu nuôi ở vùng biển Vân Đồn.'), O('Cam Ranh', 'Hàu nuôi ở vịnh Cam Ranh.'), O('Hạ Long', 'Hàu vùng vịnh Hạ Long.'), O('Phú Yên', 'Hàu vịnh Xuân Đài.'), O('Nha Trang', 'Hàu nuôi ở Nha Trang.')],
    tips: ['Nướng mỡ hành 6-8 phút hoặc ăn sống với muối tiêu chanh.'],
  },
  {
    key: 'ngheu', name: 'Nghêu', category: 'ngheu-so-oc', pool: 'clam', count: 7, basePrice: 72_000,
    species: { slug: 'ngheu-ben-tre', commonName: 'Nghêu', scientificName: 'Meretrix lyrata', description: 'Nghêu vỏ trắng ngà, thịt ngọt, đặc sản vùng bãi bồi Bến Tre.' },
    intro: 'Nghêu vỏ trắng ngà, thịt ngọt, hấp sả, xào bơ tỏi hoặc nấu canh đều ngon.',
    forms: [
      F('Tươi Sạch Cát', 'live', 'Nghêu đã ngâm nhả cát, rửa sẵn.', 1.0, ['Túi 1 kg', 'Túi 2 kg']),
      F('Lụa', 'live', 'Nghêu lụa vỏ mỏng, thịt béo, giá cao hơn.', 1.4, ['Túi 1 kg']),
      F('Luộc Sẵn Đông Lạnh', 'frozen', 'Luộc chín sẵn, cấp đông, hâm nóng là dùng.', 1.1, ['Gói 500 g', 'Gói 1 kg']),
      F('Tây', 'live', 'Nghêu Tây (clam) vỏ có vân, thịt dày.', 1.2, ['Túi 1 kg', 'Túi 2 kg']),
    ],
    origins: [O('Bến Tre', 'Nghêu bãi bồi Bến Tre.'), O('Tiền Giang', 'Nghêu Gò Công, Tiền Giang.'), O('Cần Giờ', 'Nghêu Cần Giờ, TP.HCM.'), O('Thanh Hóa', 'Nghêu Thanh Hóa.')],
    tips: ['Hấp sả gừng 5 phút đến khi vỏ mở; bỏ những con không mở.'],
  },
  {
    key: 'sodiep', name: 'Sò Điệp', category: 'ngheu-so-oc', pool: 'scallop', count: 5, basePrice: 245_000,
    species: { slug: 'so-diep', commonName: 'Sò điệp', scientificName: 'Pecten spp.', description: 'Sò điệp vỏ quạt, thịt trắng ngọt, nướng mỡ hành hoặc áp chảo.' },
    intro: 'Sò điệp vỏ quạt, thịt trắng ngọt mềm, nướng mỡ hành hay áp chảo bơ tỏi đều đẹp mâm.',
    forms: [F('Nửa Vỏ Tươi', 'fresh', 'Sò điệp còn vỏ, ướp đá.', 1.0, ['Khay 10 con', 'Khay 20 con']), F('Thịt Đông Lạnh', 'frozen', 'Thịt sò điệp Nhật, cấp đông.', 1.5, ['Gói 500 g', 'Gói 1 kg']), F('Nửa Vỏ Đông Lạnh', 'frozen', 'Sò điệp nửa vỏ cấp đông.', 0.85, ['Khay 10 con', 'Khay 20 con'])],
    origins: [O('Hạ Long', 'Sò điệp Quảng Ninh.'), O('Nhật Bản', 'Sò điệp Hokkaido nhập khẩu.'), O('Phú Quốc', 'Sò điệp Phú Quốc.')],
    tips: ['Nướng mỡ hành 4-5 phút.'],
  },
  {
    key: 'sohuyet', name: 'Sò Huyết', category: 'ngheu-so-oc', pool: 'clam', count: 4, basePrice: 125_000,
    species: { slug: 'so-huyet', commonName: 'Sò huyết', scientificName: 'Anadara granosa', description: 'Sò huyết thịt đỏ, ngọt, nhiều chất sắt, nướng hoặc nhúng nước sôi.' },
    intro: 'Sò huyết thịt đỏ, ngọt, giàu sắt, nướng mỡ hành hoặc nhúng nước sôi chấm muối tiêu.',
    forms: [F('Tươi Sống', 'live', 'Sò huyết to, vỏ khép chặt, ngâm sạch bùn.', 1.0, ['Túi 1 kg', 'Túi 2 kg']), F('Luộc Sẵn Đông Lạnh', 'frozen', 'Luộc sẵn cấp đông.', 1.15, ['Gói 500 g', 'Gói 1 kg'])],
    origins: [O('Kiên Giang', 'Sò huyết Kiên Giang.'), O('Cà Mau', 'Sò huyết Cà Mau.'), O('Thái Bình', 'Sò huyết Thái Bình.')],
    tips: ['Nhúng nước sôi 30 giây vừa chín tới, chấm muối tiêu chanh.'],
  },
  {
    key: 'solong', name: 'Sò Lông', category: 'ngheu-so-oc', pool: 'clam', count: 3, basePrice: 95_000,
    species: { slug: 'so-long', commonName: 'Sò lông', scientificName: 'Anadara subcrenata', description: 'Sò lông vỏ có lông, thịt ngọt, nướng mỡ hành hoặc hấp.' },
    intro: 'Sò lông vỏ có lớp lông mịn, thịt ngọt, nướng mỡ hành hoặc hấp đều ngon.',
    forms: [F('Tươi Sống', 'live', 'Sò lông tươi, ngâm sạch.', 1.0, ['Túi 1 kg', 'Túi 2 kg'])],
    origins: [O('Bến Tre', 'Sò lông vùng cửa sông Bến Tre.'), O('Cà Mau', 'Sò lông Cà Mau.'), O('Nam Định', 'Sò lông Nam Định.')],
    tips: ['Nướng mỡ hành hoặc xào bơ tỏi.'],
  },
  {
    key: 'vem', name: 'Vẹm Xanh', category: 'ngheu-so-oc', pool: 'mussel', count: 5, basePrice: 68_000,
    species: { slug: 'vem-xanh', commonName: 'Vẹm xanh', scientificName: 'Perna viridis', description: 'Vẹm xanh vỏ xanh bóng, thịt cam béo, hấp sả hoặc nấu canh chua.' },
    intro: 'Vẹm xanh vỏ bóng, thịt cam béo, hấp sả hoặc nấu canh chua.',
    forms: [F('Tươi Sống', 'live', 'Vẹm đã cạo sạch, ngâm nhả bùn.', 1.0, ['Túi 1 kg', 'Túi 2 kg']), F('Nửa Vỏ Đông Lạnh', 'frozen', 'Vẹm New Zealand nửa vỏ, cấp đông.', 1.7, ['Khay 500 g', 'Khay 1 kg'])],
    origins: [O('Quảng Ninh', 'Vẹm vịnh Hạ Long.'), O('New Zealand', 'Nhập khẩu New Zealand.'), O('Kiên Giang', 'Vẹm Kiên Giang.')],
    tips: ['Hấp với sả và ớt 5 phút đến khi vỏ mở.'],
  },
  {
    key: 'oc', name: 'Ốc Hương', category: 'ngheu-so-oc', pool: 'snail', count: 6, basePrice: 465_000,
    species: { slug: 'oc-huong', commonName: 'Ốc hương', scientificName: 'Babylonia areolata', description: 'Ốc hương vỏ có đốm vàng, thịt giòn ngọt, bơi trong bể sục khí.' },
    intro: 'Ốc hương vỏ đốm vàng, thịt giòn ngọt, rang muối ớt, hấp sả hay nướng đều hợp.',
    forms: [F('Sống', 'live', 'Ốc bơi hồ, vỏ sạch.', 1.0, ['60-80 con/kg', '80-100 con/kg']), F('Luộc Sẵn Đông Lạnh', 'frozen', 'Luộc sẵn, cấp đông.', 0.85, ['Gói 500 g', 'Gói 1 kg'])],
    origins: [O('Quảng Ngãi', 'Ốc hương vùng biển Quảng Ngãi.'), O('Phú Yên', 'Ốc hương vịnh Xuân Đài.'), O('Bà Rịa', 'Ốc hương Bà Rịa.')],
    tips: ['Hấp sả 6-7 phút hoặc rang muối ớt.'],
  },
  {
    key: 'ocmong', name: 'Ốc Biển', category: 'ngheu-so-oc', pool: 'snail', count: 7, basePrice: 105_000,
    species: { slug: 'oc-bien', commonName: 'Ốc biển các loại', scientificName: null, description: 'Các loại ốc biển như ốc len, ốc móng tay, ốc mỡ, ốc xà cừ tươi sống.' },
    intro: 'Ốc biển tươi sống, ngâm sạch, hợp luộc, xào me hoặc nướng.',
    forms: [
      F('Len Xào Dừa', 'live', 'Ốc len tươi, thịt mềm, xào nước dừa béo.', 1.0, ['Túi 1 kg', 'Túi 2 kg']),
      F('Móng Tay', 'live', 'Ốc móng tay giòn, xào bơ tỏi.', 1.4, ['Túi 1 kg']),
      F('Mỡ', 'live', 'Ốc mỡ to, nhiều thịt, hấp sả.', 0.95, ['Túi 1 kg', 'Túi 2 kg']),
      F('Tiêu', 'live', 'Ốc tiêu nhỏ, luộc chấm muối ớt.', 0.7, ['Túi 1 kg']),
    ],
    origins: [O('Hải Phòng', 'Ốc vùng biển Hải Phòng.'), O('Quảng Ninh', 'Ốc vịnh Hạ Long.'), O('Phan Thiết', 'Ốc Phan Thiết.'), O('Phú Quốc', 'Ốc Phú Quốc.')],
    tips: ['Luộc sả gừng hoặc xào me; ngâm nước vo gạo cho nhả bùn.'],
  },
  // ---------------------------------------------------------------- đặc sản
  {
    key: 'baongu', name: 'Bào Ngư', category: 'hai-san-dac-san', pool: 'abalone', count: 6, basePrice: 890_000,
    species: { slug: 'bao-ngu', commonName: 'Bào ngư', scientificName: 'Haliotis spp.', description: 'Bào ngư thịt dày, dai giòn, thượng phẩm trong ẩm thực, giàu đạm và khoáng chất.' },
    intro: 'Bào ngư thịt dày dai giòn, món thượng phẩm hợp hấp, nấu cháo hoặc nướng.',
    forms: [
      F('Sống', 'live', 'Bào ngư còn sống, bám vỏ chặt, ngâm nước biển.', 1.0, ['10-12 con/kg', '8-10 con/kg', '6-8 con/kg']),
      F('Đông Lạnh', 'frozen', 'Làm sạch, cấp đông từng con.', 0.8, ['Khay 6 con', 'Khay 10 con']),
      F('Khô', 'dried', 'Bào ngư khô phơi tự nhiên, ngâm nở nấu hầm.', 4.5, ['Gói 100 g', 'Gói 250 g']),
    ],
    origins: [O('Hàn Quốc', 'Nhập khẩu từ Hàn Quốc.'), O('Cam Ranh', 'Nuôi tại Cam Ranh.'), O('Phú Yên', 'Nuôi tại Phú Yên.'), O('Nhật Bản', 'Nhập từ Nhật Bản.')],
    tips: ['Hấp 12-15 phút hoặc nấu cháo bào ngư.'],
  },
  {
    key: 'nhim', name: 'Nhím Biển', category: 'hai-san-dac-san', pool: 'urchin', count: 3, basePrice: 620_000,
    species: { slug: 'nhim-bien', commonName: 'Nhím biển (cầu gai)', scientificName: 'Diadema setosum', description: 'Nhím biển thịt vàng béo ngậy, ăn sống hoặc nấu cháo, đặc sản vùng đảo.' },
    intro: 'Nhím biển thịt (gonad) vàng béo ngậy, ăn sống hoặc nấu cháo, đặc sản vùng đảo.',
    forms: [F('Sống', 'live', 'Nhím biển còn sống, gai cử động.', 1.0, ['Khay 5 con', 'Khay 10 con']), F('Lấy Thịt Đông Lạnh', 'frozen', 'Đã tách sẵn phần thịt, cấp đông.', 1.8, ['Hộp 100 g', 'Hộp 200 g'])],
    origins: [O('Phú Quốc', 'Nhím biển vùng đảo Phú Quốc.'), O('Quy Nhơn', 'Nhím biển Bình Định.'), O('Đà Nẵng', 'Nhím biển Sơn Trà.')],
    tips: ['Ăn sống với chanh hoặc nấu cháo, dùng ngay sau khi tách.'],
  },
  {
    key: 'muckho', name: 'Mực Khô', category: 'hai-san-dac-san', pool: 'dried', count: 7, basePrice: 880_000,
    species: { slug: 'muc-kho', commonName: 'Mực khô', scientificName: null, description: 'Mực khô phơi nắng tự nhiên, thịt dày, ngọt đậm, nướng chấm tương ớt.' },
    intro: 'Mực khô phơi nắng tự nhiên, thịt dày, ngọt đậm, nướng chấm tương ớt là món nhậu quen thuộc.',
    forms: [
      F('Loại 1', 'dried', 'Mực khô nguyên con, thịt dày, màu vàng sáng.', 1.0, ['Gói 250 g', 'Gói 500 g', 'Hộp 1 kg']),
      F('Trứng', 'dried', 'Mực trứng khô, nhiều trứng, béo thơm.', 1.35, ['Gói 250 g', 'Gói 500 g']),
      F('Xé Sợi Ăn Liền', 'dried', 'Đã xé sợi, tẩm gia vị vừa miệng.', 0.9, ['Gói 200 g', 'Gói 500 g']),
    ],
    origins: [O('Phú Quốc', 'Mực khô Phú Quốc.'), O('Phan Thiết', 'Mực khô Phan Thiết.'), O('Quy Nhơn', 'Mực khô Quy Nhơn.'), O('Côn Đảo', 'Mực khô Côn Đảo.')],
    tips: ['Nướng nhẹ lửa than, xé sợi chấm tương ớt.'],
  },
  {
    key: 'tomkho', name: 'Tôm Khô', category: 'hai-san-dac-san', pool: 'dried', count: 6, basePrice: 620_000,
    species: { slug: 'tom-kho', commonName: 'Tôm khô', scientificName: null, description: 'Tôm khô ngọt đậm, dùng nấu canh, nấu cháo, làm gỏi.' },
    intro: 'Tôm khô ngọt đậm, dùng nấu canh, nấu cháo, làm gỏi hoặc ăn vặt.',
    forms: [F('Đất Loại 1', 'dried', 'Tôm đất khô nguyên con, vỏ đỏ.', 1.0, ['Gói 250 g', 'Gói 500 g']), F('Chì', 'dried', 'Tôm chì khô, thịt đầy.', 0.85, ['Gói 250 g', 'Gói 500 g']), F('Bóc Vỏ', 'dried', 'Tôm khô bóc vỏ, sẵn nấu.', 1.7, ['Gói 200 g', 'Gói 500 g'])],
    origins: [O('Cà Mau', 'Tôm khô Cà Mau.'), O('Bạc Liêu', 'Tôm khô Bạc Liêu.'), O('Kiên Giang', 'Tôm khô Rạch Giá.')],
    tips: ['Ngâm nước ấm 10 phút trước khi nấu.'],
  },
  {
    key: 'cakho', name: 'Khô Cá', category: 'hai-san-dac-san', pool: 'dried', count: 9, basePrice: 395_000,
    species: { slug: 'kho-ca', commonName: 'Khô cá biển', scientificName: null, description: 'Khô cá biển phơi nắng tự nhiên, nướng hoặc chiên ăn với cơm nóng.' },
    intro: 'Khô cá biển phơi nắng tự nhiên, nướng hoặc chiên ăn với cơm nóng rất đưa.',
    forms: [
      F('Thu Một Nắng', 'dried', 'Cá thu một nắng, thịt ngọt, chiên giòn.', 1.0, ['Gói 500 g', 'Gói 1 kg']),
      F('Chỉ Vàng', 'dried', 'Cá chỉ vàng khô, nướng ăn vặt.', 0.75, ['Gói 300 g', 'Gói 500 g']),
      F('Cơm', 'dried', 'Cá cơm khô, rang mè hoặc nấu canh.', 0.55, ['Gói 300 g', 'Gói 500 g']),
      F('Dứa', 'dried', 'Cá dứa khô, nướng thơm lừng.', 1.25, ['Gói 500 g', 'Gói 1 kg']),
      F('Đù', 'dried', 'Cá đù khô, thịt dai ngọt.', 0.9, ['Gói 500 g']),
    ],
    origins: [O('Phan Thiết', 'Khô cá Phan Thiết.'), O('Phú Quốc', 'Khô cá Phú Quốc.'), O('Cà Mau', 'Khô cá Cà Mau.'), O('Quy Nhơn', 'Khô cá Quy Nhơn.')],
    tips: ['Nướng than hoa hoặc chiên giòn.'],
  },
  {
    key: 'nuocmam', name: 'Nước Mắm Nhĩ', category: 'hai-san-dac-san', pool: 'sauce', count: 8, basePrice: 98_000,
    species: { slug: 'nuoc-mam', commonName: 'Nước mắm cá cơm', scientificName: null, description: 'Nước mắm truyền thống ủ chượp cá cơm với muối biển, vị đậm, thơm.' },
    intro: 'Nước mắm truyền thống ủ chượp cá cơm với muối biển, vị đậm, hậu ngọt, mùi thơm tự nhiên.',
    forms: [
      F('Nguyên Chất 40°N', 'sauce', 'Độ đạm 40°N, đậm đà, dùng chấm và nêm.', 1.0, ['Chai 500 ml'], 'chai'),
      F('Nguyên Chất 35°N', 'sauce', 'Độ đạm 35°N, vị dịu, hợp pha nước chấm.', 0.85, ['Chai 500 ml', 'Chai 1 lít'], 'chai'),
      F('Cá Cơm Than Cốt', 'sauce', 'Nước mắm cốt đầu tiên, đạm cao, màu cánh gián.', 1.6, ['Chai 250 ml', 'Chai 500 ml'], 'chai'),
    ],
    origins: [O('Phú Quốc', 'Nước mắm Phú Quốc, ủ trong thùng gỗ 12 tháng.'), O('Phan Thiết', 'Nước mắm Phan Thiết, làng nghề trăm năm.'), O('Nha Trang', 'Nước mắm Nha Trang.'), O('Cát Hải', 'Nước mắm Cát Hải (Hải Phòng).')],
    tips: ['Pha nước chấm theo tỉ lệ 1 mắm : 1 đường : 2 nước : chanh, tỏi, ớt.'],
  },
];

/** Gift boxes and sets made of several kinds of seafood. They are made by hand: a set is more than one product. */
const SETS: Array<{ name: string; pool: PoolName; price: number; sizes: string[]; text: string; origin: string }> = [
  { name: 'Combo Lẩu Hải Sản Đầy Đủ', pool: 'hotpot', price: 790_000, sizes: ['2-3 người', '4-5 người', '6-8 người'], text: 'Tôm, mực, nghêu, cá, cua nhỏ và rau ăn kèm, chia sẵn từng khay, kèm gói nêm lẩu Thái.', origin: 'Sài Gòn' },
  { name: 'Combo Lẩu Hải Sản Chua Cay', pool: 'hotpot', price: 690_000, sizes: ['2-3 người', '4-5 người'], text: 'Hải sản chọn lọc kèm gói gia vị chua cay, ăn nóng trong mùa lạnh.', origin: 'Sài Gòn' },
  { name: 'Combo Hải Sản Nướng BBQ', pool: 'grilledFish', price: 890_000, sizes: ['3-4 người', '6-8 người'], text: 'Tôm sú, mực, sò điệp, hàu và cá, tẩm sẵn gia vị nướng, kèm giấy bạc và sốt chấm.', origin: 'Vũng Tàu' },
  { name: 'Mâm Hải Sản Tiệc Gia Đình', pool: 'platter', price: 1_450_000, sizes: ['4-6 người', '8-10 người'], text: 'Tôm hùm baby, cua, ghẹ, tôm sú và nghêu, hấp sẵn hoặc sống theo yêu cầu.', origin: 'Nha Trang' },
  { name: 'Hộp Quà Hải Sản Cao Cấp', pool: 'platter', price: 1_950_000, sizes: ['Hộp 3 kg', 'Hộp 5 kg'], text: 'Tôm hùm, bào ngư, sò điệp và cá hồi Na Uy trong hộp quà giữ lạnh, thiệp chúc tặng kèm.', origin: 'Sài Gòn' },
  { name: 'Set Sashimi Tổng Hợp', pool: 'sashimi', price: 520_000, sizes: ['Khay 300 g', 'Khay 500 g', 'Khay 800 g'], text: 'Cá hồi, cá ngừ, sò điệp và tôm ngọt cắt lát, kèm wasabi, nước tương và rau củ.', origin: 'Sài Gòn' },
  { name: 'Set Hải Sản Tươi Cho Tuần', pool: 'fishMarket', price: 420_000, sizes: ['Combo 2 người', 'Combo 4 người'], text: 'Cá, tôm, mực chọn theo mùa cho cả tuần, đóng riêng từng bữa.', origin: 'Hà Nội' },
  { name: 'Combo Cháo Hải Sản Bổ Dưỡng', pool: 'hotpot', price: 360_000, sizes: ['2 người', '4 người'], text: 'Tôm, mực, nghêu, sò điệp làm sạch, kèm gạo nếp và gia vị nấu cháo.', origin: 'Sài Gòn' },
  { name: 'Hộp Quà Tết Đặc Sản Biển', pool: 'dried', price: 780_000, sizes: ['Hộp 1.5 kg', 'Hộp 3 kg'], text: 'Mực khô, tôm khô, khô cá thu và nước mắm Phú Quốc trong hộp quà.', origin: 'Phan Thiết' },
  { name: 'Combo Hải Sản Đông Lạnh Tiện Dụng', pool: 'fishMarket', price: 560_000, sizes: ['Thùng 3 kg', 'Thùng 5 kg'], text: 'Tôm, mực, cá phi lê và nghêu cấp đông, dùng dần trong 3 tháng.', origin: 'Sài Gòn' },
  { name: 'Mâm Cua Ghẹ Hấp Bia', pool: 'crabDish', price: 980_000, sizes: ['3-4 người', '6-8 người'], text: 'Cua gạch và ghẹ sống, kèm bia, sả và gừng để hấp tại nhà.', origin: 'Phan Thiết' },
  { name: 'Set Nhậu Hải Sản Khô', pool: 'dried', price: 450_000, sizes: ['Set 1 kg', 'Set 2 kg'], text: 'Mực khô, cá chỉ vàng, tôm khô và đậu phộng, kèm tương ớt.', origin: 'Phú Quốc' },
];

function sizeFactor(index: number): number {
  return [1, 1.12, 1.26, 1.4][Math.min(index, 3)]!;
}

const COMBO_SPECIES: DemoSpecies = { slug: 'combo-hai-san', commonName: 'Combo hải sản', scientificName: null, description: 'Phần hải sản chọn sẵn từ nhiều loại, chia khay, giao lạnh.' };

/** The shop's species, one for each family (several products share one). */
export function buildSpecies(): DemoSpecies[] {
  return [...FAMILIES.map((family) => family.species), COMBO_SPECIES];
}

/**
 * Makes the catalogue: about 300 products, each with a name, description, photos, sizes and a price.
 * Names are made of the family name, the form and the origin ("Tôm Sú Sống Cà Mau"), so each one is different and
 * reads like something a vendor would list.
 */
export function buildCatalog(rng: Random, total = 300): DemoProduct[] {
  const products: DemoProduct[] = [];
  const usedSlugs = new Set<string>();
  let serial = 0;

  const make = (
    family: Pick<Family, 'key' | 'category' | 'pool' | 'basePrice' | 'intro' | 'tips'> & { speciesSlug: string },
    name: string,
    form: Form,
    origin: Origin,
    index: number,
  ): DemoProduct | null => {
    const slug = slugify(name);
    if (!slug || usedSlugs.has(slug)) return null;
    usedSlugs.add(slug);
    serial += 1;
    const unit = form.unit ?? 'kg';
    const base = roundPrice(family.basePrice * form.mul * (0.93 + rng.next() * 0.14));
    const pool = POOLS[family.pool];
    const start = (index * 3 + serial) % pool.length;
    const imageIds = [0, 1, 2].map((offset) => pool[(start + offset) % pool.length]!);

    const description = [
      `${name}: ${family.intro}`,
      form.text,
      origin.text,
      rng.pick(PACKING[form.kind]),
      rng.pick(family.tips),
      rng.pick(SHIPPING_LINES),
    ].join(' ');

    return {
      slug,
      name,
      description,
      category: family.category,
      speciesSlug: family.speciesSlug,
      pool: family.pool,
      imageIds,
      featured: false,
      basePrice: base,
      unit,
      kind: form.kind,
      origin: origin.label,
      variants: form.sizes.map((size, i) => ({
        name: `${name} (${size})`,
        sku: `DM-${family.key.toUpperCase()}-${String(serial).padStart(3, '0')}-${i + 1}`,
        unit,
        sizeLabel: size,
        priceFactor: form.kind === 'live' || form.kind === 'fresh' ? sizeFactor(i) : 1 + i * 0.85,
      })),
      popularity: 1,
    };
  };

  for (const family of FAMILIES) {
    const combos: Array<{ form: Form; origin: Origin }> = [];
    for (const form of family.forms) for (const origin of family.origins) combos.push({ form, origin });
    // Every form appears at least once, then the rest at random.
    const chosen: typeof combos = [];
    for (const form of family.forms) chosen.push(rng.pick(combos.filter((combo) => combo.form === form)));
    const rest = rng.sample(combos.filter((combo) => !chosen.includes(combo)), Math.max(0, family.count - chosen.length));
    chosen.push(...rest);

    for (const [index, { form, origin }] of chosen.slice(0, family.count).entries()) {
      const name = `${family.name} ${form.label} ${origin.label}`;
      const product = make({ ...family, speciesSlug: family.species.slug }, name, form, origin, index);
      if (product) products.push(product);
    }
  }

  for (const [index, set] of SETS.entries()) {
    const form: Form = { label: '', kind: 'set', text: set.text, mul: 1, sizes: set.sizes, unit: 'set' };
    const product = make(
      { key: 'set', category: 'hai-san-dac-san', pool: set.pool, basePrice: set.price, intro: 'Phần hải sản chọn sẵn, chia khay, giao lạnh.', tips: ['Mở thùng, kiểm tra hàng rồi chế biến theo hướng dẫn.'], speciesSlug: 'combo-hai-san' },
      set.name,
      form,
      { label: set.origin, text: `Tuyển từ các vựa ${set.origin}.` },
      index,
    );
    if (product) products.push(product);
  }

  // More than asked for: drop the extra at random, but never a family's first product.
  const firsts = new Set(FAMILIES.map((family) => products.find((p) => p.speciesSlug === family.species.slug)?.slug));
  let excess = products.length - total;
  while (excess > 0) {
    const candidate = rng.int(0, products.length - 1);
    if (firsts.has(products[candidate]!.slug) || products[candidate]!.kind === 'set') continue;
    products.splice(candidate, 1);
    excess -= 1;
  }

  // The featured ones: a few of the best-known, spread over categories. Popularity follows a long tail.
  const byPopularity = rng.sample(products, products.length);
  for (const [rank, product] of byPopularity.entries()) product.popularity = 1 / (rank + 6);
  const featuredCount = new Map<CategorySlug, number>();
  for (const product of byPopularity) {
    const seen = featuredCount.get(product.category) ?? 0;
    if (seen < 3 && product.kind !== 'dried' && product.kind !== 'sauce') {
      product.featured = true;
      featuredCount.set(product.category, seen + 1);
    }
  }
  return products;
}

export const CATEGORY_NAMES: Record<CategorySlug, string> = {
  'ca-bien-tuoi': 'Cá Tươi & Đông Lạnh',
  'tom-song': 'Tôm Sống & Tự Nhiên',
  'cua-ghe': 'Cua & Ghẹ',
  'muc-bach-tuoc': 'Mực & Bạch Tuộc',
  'ngheu-so-oc': 'Nghêu, Sò, Ốc',
  'hai-san-dac-san': 'Hải Sản Đặc Sản',
};

export { SHIPPING_LINES };
