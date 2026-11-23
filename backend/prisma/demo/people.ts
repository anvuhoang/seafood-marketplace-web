import { Random, slugify } from './random.js';

const FAMILY_NAMES: Array<[string, number]> = [
  ['Nguyễn', 30], ['Trần', 14], ['Lê', 10], ['Phạm', 8], ['Hoàng', 5], ['Huỳnh', 5], ['Phan', 4], ['Vũ', 4], ['Võ', 4],
  ['Đặng', 3], ['Bùi', 3], ['Đỗ', 3], ['Hồ', 2], ['Ngô', 2], ['Dương', 2], ['Lý', 1], ['Đinh', 1], ['Trương', 2], ['Mai', 1], ['Lâm', 1],
];
const MIDDLE_FEMALE = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Minh', 'Kim', 'Bích', 'Hồng', 'Mỹ', 'Khánh', 'Phương', 'Diệu', 'Tuyết', 'Thùy'];
const MIDDLE_MALE = ['Văn', 'Minh', 'Quốc', 'Hoàng', 'Đức', 'Thanh', 'Anh', 'Gia', 'Hữu', 'Tuấn', 'Công', 'Ngọc', 'Xuân', 'Bảo'];
const GIVEN_FEMALE = ['Lan', 'Hương', 'Linh', 'Trang', 'Mai', 'Hà', 'Thảo', 'Ngân', 'Vy', 'Yến', 'Nhung', 'Phượng', 'Quỳnh', 'Hạnh', 'Dung', 'Thủy', 'Loan', 'Châu', 'Oanh', 'Tâm', 'Nhi', 'Uyên', 'Trâm', 'My'];
const GIVEN_MALE = ['Nam', 'Hùng', 'Dũng', 'Tuấn', 'Long', 'Minh', 'Khoa', 'Phúc', 'Đạt', 'Hải', 'Sơn', 'Thắng', 'Việt', 'Quân', 'Huy', 'Bình', 'Cường', 'Thịnh', 'Toàn', 'Khải', 'Lộc', 'Tín', 'Hiếu', 'Nghĩa'];

export interface DemoPerson {
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  email: string;
  phone: string;
}

/** A Vietnamese name, e.g. "Trần Thị Thu Hà". Spelling is checked against the lists above, never made up. */
export function makeName(rng: Random): { fullName: string; gender: 'MALE' | 'FEMALE' } {
  const female = rng.chance(0.58);
  const family = rng.weighted(FAMILY_NAMES);
  const parts = female
    ? [family, rng.pick(MIDDLE_FEMALE), rng.pick(GIVEN_FEMALE)]
    : [family, rng.pick(MIDDLE_MALE), rng.pick(GIVEN_MALE)];
  // Some people have a two-part middle name.
  if (rng.chance(0.18)) parts.splice(2, 0, rng.pick(female ? MIDDLE_FEMALE : MIDDLE_MALE));
  return { fullName: parts.join(' '), gender: female ? 'FEMALE' : 'MALE' };
}

/**
 * `count` customers with distinct names, e-mail addresses (on example.com, which no one owns, so nothing is ever
 * sent to a real person) and phone numbers.
 */
export function makeCustomers(rng: Random, count: number, takenEmails: Set<string>, takenPhones: Set<string>): DemoPerson[] {
  const people: DemoPerson[] = [];
  const names = new Set<string>();
  while (people.length < count) {
    const { fullName, gender } = makeName(rng);
    if (names.has(fullName)) continue;
    names.add(fullName);
    const words = slugify(fullName).split('-');
    const given = words[words.length - 1]!;
    const family = words[0]!;
    let email = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      const suffix = rng.chance(0.5) ? String(rng.int(1, 99)) : String(rng.int(1970, 2004));
      const style = rng.int(0, 2);
      email = (style === 0 ? `${given}.${family}${suffix}` : style === 1 ? `${family}.${given}${suffix}` : `${given}${family}${suffix}`) + '@example.com';
      if (!takenEmails.has(email)) break;
      email = '';
    }
    if (!email) continue;
    let phone = '';
    for (let attempt = 0; attempt < 20 && !phone; attempt++) {
      const candidate = `0${rng.pick(['90', '91', '93', '94', '97', '98', '86', '88', '77', '78', '70', '76'])}${String(rng.int(0, 9999999)).padStart(7, '0')}`;
      if (!takenPhones.has(candidate)) phone = candidate;
    }
    if (!phone) continue;
    takenEmails.add(email);
    takenPhones.add(phone);
    people.push({ fullName, gender, email, phone });
  }
  return people;
}

// ---------------------------------------------------------------- addresses

interface Place {
  province: string;
  districts: string[];
  weight: number;
}

/** Province and district names as the shop's administrative data writes them, so a filter or a report matches. */
const PLACES: Place[] = [
  { province: 'Hồ Chí Minh', districts: ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 10', 'Bình Thạnh', 'Gò Vấp', 'Tân Bình', 'Phú Nhuận', 'Thủ Đức', 'Tân Phú'], weight: 38 },
  { province: 'Hà Nội', districts: ['Ba Đình', 'Hoàn Kiếm', 'Tây Hồ', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Thanh Xuân', 'Long Biên', 'Hoàng Mai', 'Nam Từ Liêm'], weight: 24 },
  { province: 'Đà Nẵng', districts: ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'], weight: 8 },
  { province: 'Cần Thơ', districts: ['Ninh Kiều', 'Cái Răng', 'Bình Thuỷ', 'Ô Môn'], weight: 5 },
  { province: 'Hải Phòng', districts: ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Hải An', 'Kiến An'], weight: 5 },
  { province: 'Đồng Nai', districts: ['Biên Hòa', 'Long Khánh', 'Trảng Bom', 'Long Thành'], weight: 5 },
  { province: 'Bình Dương', districts: ['Thủ Dầu Một', 'Dĩ An', 'Thuận An', 'Bến Cát'], weight: 5 },
  { province: 'Khánh Hòa', districts: ['Nha Trang', 'Cam Ranh', 'Ninh Hòa'], weight: 3 },
  { province: 'Bà Rịa - Vũng Tàu', districts: ['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ'], weight: 3 },
  { province: 'Huế', districts: ['Thuận Hóa', 'Phú Xuân', 'Hương Thủy'], weight: 2 },
  { province: 'Quảng Ninh', districts: [], weight: 0 },
];

const STREETS = [
  'Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Hai Bà Trưng', 'Điện Biên Phủ', 'Cách Mạng Tháng Tám', 'Nguyễn Trãi', 'Lý Thường Kiệt',
  'Phạm Văn Đồng', 'Võ Văn Tần', 'Nguyễn Thị Minh Khai', 'Lê Văn Sỹ', 'Hoàng Văn Thụ', 'Nguyễn Văn Cừ', 'Trường Chinh', 'Láng Hạ',
  'Kim Mã', 'Xã Đàn', 'Nguyễn Chí Thanh', 'Bạch Đằng', 'Lê Duẩn', 'Tôn Đức Thắng', 'Pasteur', 'Nam Kỳ Khởi Nghĩa', 'Phan Đình Phùng',
];
const HOUSE_STYLES = ['{n} {street}', '{n}/{m} {street}', 'Số {n}, đường {street}', '{n} {street}, hẻm {m}'];

export interface DemoAddress {
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
}

export function makeAddress(rng: Random): DemoAddress {
  const place = rng.weighted(PLACES.filter((p) => p.weight > 0).map((p) => [p, p.weight] as const));
  const district = rng.pick(place.districts);
  const n = rng.int(1, 320);
  const m = rng.int(1, 60);
  const street = rng.pick(STREETS);
  const streetAddress = rng.pick(HOUSE_STYLES).replace('{n}', String(n)).replace('{m}', String(m)).replace('{street}', street);
  return { province: place.province, district, ward: rng.chance(0.55) ? `Phường ${rng.int(1, 15)}` : null, streetAddress };
}

// ---------------------------------------------------------------- reviews

export type Sentiment = 'good' | 'ok' | 'bad';
export type ReviewGroup = 'fish' | 'shrimp' | 'crab' | 'squid' | 'shell' | 'special';

const COMMON_GOOD = [
  'Giao nhanh, đóng gói cẩn thận, mở thùng ra còn rất tươi.',
  'Mua lần thứ ba rồi, chất lượng vẫn ổn định, sẽ ủng hộ tiếp.',
  'Hàng đúng như mô tả, vựa tư vấn nhiệt tình.',
  'Cân đúng ký, giá hợp lý so với ngoài chợ.',
  'Cả nhà ăn đều khen, chắc chắn sẽ đặt lại.',
  'Đóng thùng xốp có đá kỹ, nhận hàng vẫn lạnh.',
  'Shipper gọi trước khi giao, hàng nguyên vẹn.',
  'Giá tốt hơn chỗ mình hay mua, chất lượng không thua.',
];
const COMMON_OK = [
  'Hàng ổn, giao hơi trễ so với dự kiến nhưng vựa có báo trước.',
  'Chất lượng tạm được, giá hơi cao một chút.',
  'Đóng gói ổn, nhưng nhiều đá nên phần hàng ít hơn mình nghĩ.',
  'Bình thường, không có gì để chê nhưng cũng chưa nổi bật.',
];
const COMMON_BAD = [
  'Hàng giao hơi chậm nên không còn tươi như mong đợi, hy vọng vựa cải thiện.',
  'Có vài con không đúng size như mô tả, đã nhắn vựa và được hỗ trợ.',
  'Đóng gói chưa kỹ, nước đá chảy ra thùng, hàng vẫn dùng được.',
];

const BY_GROUP: Record<ReviewGroup, { good: string[]; ok: string[]; bad: string[] }> = {
  fish: {
    good: ['Cá tươi, mắt trong, thịt chắc, nấu lên ngọt nước.', 'Phi lê đẹp, không tanh, làm sashimi tại nhà rất ngon.', 'Cá nguyên con, làm sạch sẵn, tiết kiệm thời gian.', 'Thịt cá béo thơm, chiên lên giòn da, cả nhà ăn hết sạch.'],
    ok: ['Cá tươi nhưng hơi nhỏ so với cỡ mình đặt.', 'Cá ổn, có mùi tanh nhẹ, nấu với gừng thì hết.'],
    bad: ['Cá có mùi hơi tanh khi mở thùng, chắc do giao lâu.', 'Miếng cá không đều như hình.'],
  },
  shrimp: {
    good: ['Tôm còn bơi khi mở thùng, thịt chắc và ngọt.', 'Tôm size đều, vỏ bóng, hấp lên đỏ đẹp.', 'Tôm tươi, không có mùi, luộc chấm muối tiêu chanh rất ngon.', 'Thịt tôm giòn ngọt, bóc vỏ sẵn rất tiện cho nhà có trẻ nhỏ.'],
    ok: ['Tôm tươi nhưng có vài con chết, vựa đã đền lại.', 'Tôm ổn, size hơi lệch so với mô tả.'],
    bad: ['Có vài con tôm đã mềm đầu, không còn tươi như quảng cáo.', 'Tôm hơi nhỏ so với size đặt.'],
  },
  crab: {
    good: ['Cua chắc thịt, gạch nhiều, hấp lên thơm lừng.', 'Ghẹ tươi, càng đầy, rang me rất đưa cơm.', 'Cua còn bò khỏe, buộc dây kỹ, thịt ngọt.', 'Gạch son béo ngậy, đáng tiền.'],
    ok: ['Cua ngon nhưng một con hơi ít gạch.', 'Ghẹ tươi, nhưng có hai con hơi nhỏ.'],
    bad: ['Một con cua đã yếu khi nhận hàng.', 'Cua ít thịt hơn mong đợi.'],
  },
  squid: {
    good: ['Mực tươi, da bóng, hấp gừng giòn ngọt.', 'Mực nhiều trứng, nướng lên thơm phức.', 'Bạch tuộc sạch, giòn sần sật, nướng sa tế quá đỉnh.', 'Mực làm sạch sẵn, nấu rất nhanh.'],
    ok: ['Mực tươi nhưng hơi nhỏ so với size.', 'Bạch tuộc ổn, hơi dai nếu nấu lâu.'],
    bad: ['Mực không còn giòn như hình.', 'Có mùi nhẹ, chắc do để lâu.'],
  },
  shell: {
    good: ['Hàu béo, nướng mỡ hành tuyệt vời.', 'Nghêu sạch cát, hấp sả ngọt nước.', 'Sò điệp to, nướng lên thơm, thịt ngọt.', 'Ốc giòn, không bị bùn, luộc chấm muối ớt hết sạch.'],
    ok: ['Nghêu còn hơi cát, ngâm kỹ thì ổn.', 'Hàu nhỏ hơn mình nghĩ nhưng vẫn béo.'],
    bad: ['Một số con không mở sau khi hấp.', 'Nghêu còn nhiều cát.'],
  },
  special: {
    good: ['Hàng khô thơm, đóng gói sạch, nướng ăn nhậu rất đã.', 'Nước mắm thơm, hậu ngọt, pha nước chấm là hết cơm.', 'Bào ngư tươi, hấp lên dai giòn, đáng tiền.', 'Combo đầy đủ, chia khay gọn, rất tiện đãi khách.'],
    ok: ['Hàng ổn nhưng mặn hơn mình quen.', 'Combo ngon, nhưng phần ít hơn mình nghĩ cho 4 người.'],
    bad: ['Hàng khô hơi cứng, chắc do để lâu.', 'Chai nước mắm bị rỉ nhẹ khi nhận.'],
  },
};

export const REVIEW_HIGHLIGHTS = ['fresh-lively', 'oxygen-packing', 'on-time', 'accurate-weight', 'firm-sweet', 'helpful-advice'] as const;

export function groupOfCategory(category: string, kind: string): ReviewGroup {
  if (kind === 'dried' || kind === 'sauce' || kind === 'set' || category === 'hai-san-dac-san') return 'special';
  if (category === 'ca-bien-tuoi') return 'fish';
  if (category === 'tom-song') return 'shrimp';
  if (category === 'cua-ghe') return 'crab';
  if (category === 'muc-bach-tuoc') return 'squid';
  return 'shell';
}

/** A review: one sentence about the product and one about the service, matching the stars. */
export function makeReview(rng: Random, rating: number, group: ReviewGroup): { content: string; highlights: string[] } {
  const sentiment: Sentiment = rating >= 4 ? 'good' : rating === 3 ? 'ok' : 'bad';
  const common = sentiment === 'good' ? COMMON_GOOD : sentiment === 'ok' ? COMMON_OK : COMMON_BAD;
  const parts = [rng.pick(BY_GROUP[group][sentiment])];
  if (rng.chance(0.75)) parts.push(rng.pick(common));
  const highlights = sentiment === 'good' ? rng.sample(REVIEW_HIGHLIGHTS, rng.int(1, 3)) : sentiment === 'ok' ? rng.sample(REVIEW_HIGHLIGHTS, rng.int(0, 1)) : [];
  return { content: parts.join(' '), highlights: [...highlights] };
}
