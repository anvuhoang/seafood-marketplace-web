import type { CategorySlug } from './catalog.js';
import type { PoolName } from './images.js';

export type DemoVendorStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface DemoVendor {
  slug: string;
  name: string;
  /** The owner signs in with this address and the password Vendor@123456 (an applicant is a customer: Customer@123456). */
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  streetAddress: string;
  description: string;
  status: DemoVendorStatus;
  /** What the vendor sells. */
  categories: CategorySlug[];
  /** The origins it sources from: products from these places are more likely to be on its shelf. */
  regions: string[];
  /** How busy the store is; it decides its share of the orders. */
  size: 'large' | 'medium' | 'small';
  /** How many days ago the store opened (an applicant: how long ago it applied). */
  daysAgo: number;
  logoPool: PoolName;
  coverPool: PoolName;
  /** Why an admin suspended the store, or the note an applicant wrote. */
  note?: string;
}

const ALL: CategorySlug[] = ['ca-bien-tuoi', 'tom-song', 'cua-ghe', 'muc-bach-tuoc', 'ngheu-so-oc', 'hai-san-dac-san'];

export const DEMO_VENDORS: DemoVendor[] = [
  {
    slug: 'vua-hai-san-cat-ba-xanh', name: 'Vựa Hải Sản Cát Bà Xanh', ownerEmail: 'catbaxanh@haisanexpress.vn', ownerName: 'Đỗ Quang Huy', ownerPhone: '0903110201',
    phone: '0903110201', email: 'vua@catbaxanh.vn', province: 'Hải Phòng', district: 'Cát Hải', streetAddress: '15 Cảng Cát Bà, thị trấn Cát Bà',
    description: 'Vựa hải sản trên đảo Cát Bà, thu mua trực tiếp từ ngư dân và bè nuôi quanh vịnh Lan Hạ. Chuyên cá, ghẹ, hàu và ốc tươi sống, giao Hà Nội trong ngày.',
    status: 'ACTIVE', categories: ['ca-bien-tuoi', 'cua-ghe', 'ngheu-so-oc'], regions: ['Hải Phòng', 'Quảng Ninh', 'Cát Hải', 'Hạ Long', 'Vân Đồn', 'Thái Bình'], size: 'large', daysAgo: 240, logoPool: 'fishMarket', coverPool: 'harbor',
  },
  {
    slug: 'hai-san-van-don-247', name: 'Hải Sản Vân Đồn 247', ownerEmail: 'vandon247@haisanexpress.vn', ownerName: 'Nguyễn Văn Hải', ownerPhone: '0903110202',
    phone: '0903110202', email: 'lienhe@vandon247.vn', province: 'Quảng Ninh', district: 'Vân Đồn', streetAddress: '3 Bến Cái Rồng, thị trấn Cái Rồng',
    description: 'Hàu, sò điệp, ngán và cua ghế vùng Vân Đồn. Bè nuôi riêng của gia đình, thu hoạch theo đơn để giữ độ tươi.',
    status: 'ACTIVE', categories: ['ngheu-so-oc', 'cua-ghe', 'tom-song'], regions: ['Vân Đồn', 'Quảng Ninh', 'Hạ Long', 'Cô Tô', 'Hải Phòng'], size: 'medium', daysAgo: 200, logoPool: 'oyster', coverPool: 'harbor',
  },
  {
    slug: 'vua-ca-bien-sam-son', name: 'Vựa Cá Biển Sầm Sơn', ownerEmail: 'samson@haisanexpress.vn', ownerName: 'Lê Thị Thu Hà', ownerPhone: '0903110203',
    phone: '0903110203', email: 'vua@samson.vn', province: 'Thanh Hóa', district: 'Sầm Sơn', streetAddress: '22 Hồ Xuân Hương, TP. Sầm Sơn',
    description: 'Cá biển tươi cập cảng Lạch Hới mỗi sáng: thu, nục, chim, cơm. Có chả cá và cá một nắng làm tại vựa.',
    status: 'ACTIVE', categories: ['ca-bien-tuoi', 'ngheu-so-oc'], regions: ['Sầm Sơn', 'Thanh Hóa', 'Thái Bình', 'Nam Định', 'Hải Phòng'], size: 'medium', daysAgo: 180, logoPool: 'mackerel', coverPool: 'harbor',
  },
  {
    slug: 'hai-san-da-nang-my-khe', name: 'Hải Sản Đà Nẵng Mỹ Khê', ownerEmail: 'mykhe@haisanexpress.vn', ownerName: 'Trần Minh Tuấn', ownerPhone: '0903110204',
    phone: '0903110204', email: 'mykhe@haisan.vn', province: 'Đà Nẵng', district: 'Sơn Trà', streetAddress: '88 Võ Nguyên Giáp, quận Sơn Trà',
    description: 'Hải sản miền Trung giao nhanh nội thành Đà Nẵng và Huế: cá, tôm, mực từ ngư dân Mân Thái và Thọ Quang.',
    status: 'ACTIVE', categories: ['ca-bien-tuoi', 'muc-bach-tuoc', 'tom-song', 'cua-ghe'], regions: ['Đà Nẵng', 'Quảng Ngãi', 'Bình Định', 'Quy Nhơn', 'Huế'], size: 'medium', daysAgo: 170, logoPool: 'squid', coverPool: 'harbor',
  },
  {
    slug: 'vua-hai-san-quy-nhon-bien-xanh', name: 'Vựa Hải Sản Quy Nhơn Biển Xanh', ownerEmail: 'quynhon@haisanexpress.vn', ownerName: 'Võ Thanh Sơn', ownerPhone: '0903110205',
    phone: '0903110205', email: 'vua@quynhonbienxanh.vn', province: 'Bình Định', district: 'Quy Nhơn', streetAddress: '9 Trần Hưng Đạo, TP. Quy Nhơn',
    description: 'Cá ngừ đại dương câu tay, mực, ốc hương và nhím biển Quy Nhơn. Cá được xử lý ngay trên tàu để giữ màu và vị.',
    status: 'ACTIVE', categories: ['ca-bien-tuoi', 'muc-bach-tuoc', 'ngheu-so-oc', 'hai-san-dac-san'], regions: ['Quy Nhơn', 'Bình Định', 'Phú Yên', 'Quảng Ngãi'], size: 'large', daysAgo: 220, logoPool: 'tuna', coverPool: 'harbor',
  },
  {
    slug: 'hai-san-cam-ranh-sach', name: 'Hải Sản Cam Ranh Sạch', ownerEmail: 'camranh@haisanexpress.vn', ownerName: 'Phan Quốc Bảo', ownerPhone: '0903110206',
    phone: '0903110206', email: 'camranh@haisansach.vn', province: 'Khánh Hòa', district: 'Cam Ranh', streetAddress: '41 Đường Nguyễn Trọng Kỷ, TP. Cam Ranh',
    description: 'Tôm hùm, hàu, bào ngư và cá mú nuôi bè sạch ở vịnh Cam Ranh và Vân Phong. Mỗi lô có phiếu kiểm tra nguồn nước.',
    status: 'ACTIVE', categories: ['tom-song', 'ngheu-so-oc', 'hai-san-dac-san', 'ca-bien-tuoi'], regions: ['Cam Ranh', 'Vân Phong', 'Khánh Hòa', 'Nha Trang', 'Phú Yên'], size: 'large', daysAgo: 260, logoPool: 'lobster', coverPool: 'harbor',
  },
  {
    slug: 'vua-tom-cua-bac-lieu', name: 'Vựa Tôm Cua Bạc Liêu', ownerEmail: 'baclieu@haisanexpress.vn', ownerName: 'Huỳnh Văn Lợi', ownerPhone: '0903110207',
    phone: '0903110207', email: 'vua@tomcuabaclieu.vn', province: 'Bạc Liêu', district: 'TP. Bạc Liêu', streetAddress: '120 Hùng Vương, TP. Bạc Liêu',
    description: 'Tôm sú, tôm thẻ và cua gạch nuôi sinh thái ở Bạc Liêu và Cà Mau. Giao sỉ cho nhà hàng, bán lẻ toàn quốc.',
    status: 'ACTIVE', categories: ['tom-song', 'cua-ghe'], regions: ['Bạc Liêu', 'Cà Mau', 'Bến Tre', 'Kiên Giang', 'Năm Căn', 'Đồng Tháp', 'Cần Thơ', 'Tiền Giang'], size: 'large', daysAgo: 210, logoPool: 'tigerPrawn', coverPool: 'harbor',
  },
  {
    slug: 'hai-san-vung-tau-bai-sau', name: 'Hải Sản Vũng Tàu Bãi Sau', ownerEmail: 'vungtau@haisanexpress.vn', ownerName: 'Đặng Hoàng Nam', ownerPhone: '0903110208',
    phone: '0903110208', email: 'baisau@haisanvt.vn', province: 'Bà Rịa - Vũng Tàu', district: 'Vũng Tàu', streetAddress: '57 Thùy Vân, TP. Vũng Tàu',
    description: 'Hải sản cảng Vũng Tàu giao TP.HCM trong 2 giờ: cá hồng, cá chim, mực, ghẹ và bạch tuộc.',
    status: 'ACTIVE', categories: ['ca-bien-tuoi', 'muc-bach-tuoc', 'cua-ghe', 'tom-song'], regions: ['Vũng Tàu', 'Phan Thiết', 'Cần Giờ', 'Bà Rịa'], size: 'medium', daysAgo: 150, logoPool: 'snapper', coverPool: 'harbor',
  },
  {
    slug: 'vua-hai-san-ha-tien', name: 'Vựa Hải Sản Hà Tiên', ownerEmail: 'hatien@haisanexpress.vn', ownerName: 'Trương Thị Mỹ Linh', ownerPhone: '0903110209',
    phone: '0903110209', email: 'vua@hatien.vn', province: 'Kiên Giang', district: 'Hà Tiên', streetAddress: '6 Bến Tượng, TP. Hà Tiên',
    description: 'Ghẹ, mực, sò huyết và cá mú nuôi bè Hà Tiên. Vựa gia đình ba đời, bán sỉ lẻ.',
    status: 'ACTIVE', categories: ['cua-ghe', 'muc-bach-tuoc', 'ngheu-so-oc', 'ca-bien-tuoi'], regions: ['Hà Tiên', 'Kiên Giang', 'Phú Quốc', 'Cà Mau'], size: 'medium', daysAgo: 190, logoPool: 'swimmingCrab', coverPool: 'harbor',
  },
  {
    slug: 'dac-san-bien-phan-thiet', name: 'Đặc Sản Biển Phan Thiết', ownerEmail: 'phanthiet@haisanexpress.vn', ownerName: 'Lý Văn Thành', ownerPhone: '0903110210',
    phone: '0903110210', email: 'dacsan@phanthietbien.vn', province: 'Bình Thuận', district: 'Phan Thiết', streetAddress: '33 Nguyễn Tất Thành, TP. Phan Thiết',
    description: 'Nước mắm, mực khô, tôm khô và khô cá làm theo nghề truyền thống Phan Thiết. Đóng hộp quà, nhận đơn sỉ dịp lễ Tết.',
    status: 'ACTIVE', categories: ['hai-san-dac-san', 'ca-bien-tuoi'], regions: ['Phan Thiết', 'Phú Quốc', 'Cát Hải', 'Nha Trang', 'Cà Mau', 'Quy Nhơn', 'Côn Đảo'], size: 'medium', daysAgo: 230, logoPool: 'dried', coverPool: 'harbor',
  },
  {
    slug: 'hai-san-nhap-khau-sai-gon', name: 'Hải Sản Nhập Khẩu Sài Gòn', ownerEmail: 'nhapkhau@haisanexpress.vn', ownerName: 'Ngô Thanh Hằng', ownerPhone: '0903110211',
    phone: '0903110211', email: 'sales@nhapkhausg.vn', province: 'Hồ Chí Minh', district: 'Thủ Đức', streetAddress: 'Kho lạnh 5, KCN Hiệp Bình Phước',
    description: 'Cá hồi Na Uy, cua hoàng đế Alaska, sò điệp Nhật, vẹm New Zealand nhập khẩu chính ngạch, bảo quản kho lạnh -25 °C. Có hóa đơn và giấy kiểm dịch.',
    status: 'ACTIVE', categories: ['ca-bien-tuoi', 'cua-ghe', 'tom-song', 'ngheu-so-oc', 'hai-san-dac-san'], regions: ['Na Uy', 'Chile', 'Tasmania', 'Canada', 'Nhật Bản', 'Alaska', 'Nga', 'Nhập khẩu', 'New Zealand', 'Hàn Quốc', 'Trung Quốc', 'Sài Gòn'], size: 'large', daysAgo: 250, logoPool: 'salmon', coverPool: 'harbor',
  },
  {
    slug: 'cho-bien-ha-noi', name: 'Chợ Biển Hà Nội', ownerEmail: 'chobienhn@haisanexpress.vn', ownerName: 'Bùi Thị Hồng Nhung', ownerPhone: '0903110212',
    phone: '0903110212', email: 'cskh@chobienhn.vn', province: 'Hà Nội', district: 'Cầu Giấy', streetAddress: '18 Trần Thái Tông, quận Cầu Giấy',
    description: 'Kho phân phối hải sản tươi và đông lạnh cho nội thành Hà Nội, nhập hàng từ Quảng Ninh, Hải Phòng và Thanh Hóa mỗi đêm, giao trong 2 giờ.',
    status: 'ACTIVE', categories: ALL, regions: ['Quảng Ninh', 'Hải Phòng', 'Thanh Hóa', 'Hà Nội', 'Sầm Sơn', 'Vân Đồn', 'Hạ Long', 'Cô Tô', 'Cát Hải', 'Na Uy', 'Nhật Bản', 'Hà Nội'], size: 'large', daysAgo: 245, logoPool: 'platter', coverPool: 'fishMarket',
  },
  // Applications waiting for an admin, and a store an admin suspended: the admin pages have something to show.
  {
    slug: 'vua-hai-san-co-to-island', name: 'Vựa Hải Sản Cô Tô Island', ownerEmail: 'cotoisland@example.com', ownerName: 'Vũ Đình Khoa', ownerPhone: '0903110213',
    phone: '0903110213', email: 'cotoisland@example.com', province: 'Quảng Ninh', district: 'Cô Tô', streetAddress: '4 Bến Cô Tô, thị trấn Cô Tô',
    description: 'Mực nhảy, ngán và cá tươi đánh bắt quanh đảo Cô Tô; xin mở gian hàng để bán toàn quốc.',
    status: 'PENDING', categories: ['muc-bach-tuoc', 'ngheu-so-oc'], regions: ['Cô Tô'], size: 'small', daysAgo: 2, logoPool: 'squid', coverPool: 'harbor', note: 'Có giấy phép kinh doanh và giấy chứng nhận vệ sinh an toàn thực phẩm.',
  },
  {
    slug: 'hai-san-ninh-thuan-sach', name: 'Hải Sản Ninh Thuận Sạch', ownerEmail: 'ninhthuan@example.com', ownerName: 'Mai Thị Kim Ngân', ownerPhone: '0903110214',
    phone: '0903110214', email: 'ninhthuan@example.com', province: 'Ninh Thuận', district: 'Ninh Hải', streetAddress: '27 Đường Ven Biển, Ninh Hải',
    description: 'Tôm hùm và cá mú nuôi bè Vĩnh Hy; đang xin mở gian hàng.',
    status: 'PENDING', categories: ['tom-song', 'ca-bien-tuoi'], regions: ['Ninh Thuận'], size: 'small', daysAgo: 4, logoPool: 'lobster', coverPool: 'harbor', note: 'Bè nuôi có giấy chứng nhận VietGAP.',
  },
  {
    slug: 'vua-hai-san-tam-ngung', name: 'Vựa Hải Sản Tạm Ngưng', ownerEmail: 'tamngung@example.com', ownerName: 'Đinh Công Thành', ownerPhone: '0903110215',
    phone: '0903110215', email: 'tamngung@example.com', province: 'Hồ Chí Minh', district: 'Gò Vấp', streetAddress: '12 Quang Trung, quận Gò Vấp',
    description: 'Vựa bán hải sản đông lạnh, đã bị tạm ngưng sau khi có nhiều khiếu nại về chất lượng giao hàng.',
    status: 'SUSPENDED', categories: ['ca-bien-tuoi'], regions: ['Sài Gòn'], size: 'small', daysAgo: 120, logoPool: 'fishMarket', coverPool: 'harbor', note: 'Nhiều khiếu nại về hàng đông lạnh giao chậm và rã đông; yêu cầu bổ sung quy trình bảo quản.',
  },
];

/** Where the vendors of each size sit in the order of choice: a large store sells more than a small one. */
export const SIZE_WEIGHT: Record<DemoVendor['size'], number> = { large: 5, medium: 3, small: 1 };
