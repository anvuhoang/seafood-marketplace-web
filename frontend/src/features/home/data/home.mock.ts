export interface Category {
  id: string;
  name: string;
  slug: string;
  count: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  scientificName?: string;
  category: string;
  origin: string;
  originDetail: string;
  shopName: string;
  badge?: string;
  badgeType?: "blue" | "red" | "cyan" | "amber" | "green";
  note: string;
  price: number;
  unit: string;
  image: string;
  inStock: boolean;
  rating?: number;
}

export interface Vendor {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  description: string;
  image: string;
  verified: boolean;
}

export interface Benefit {
  id: string;
  title: string;
  description: string;
  iconName: "Store" | "ShieldCheck" | "Headset" | "Sparkles";
}

export const homeCategories: Category[] = [
  {
    id: "cat-1",
    name: "Cá biển tươi",
    slug: "ca-bien-tuoi",
    count: "120+ sản phẩm",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "cat-2",
    name: "Tôm sống",
    slug: "tom-song",
    count: "85+ sản phẩm",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "cat-3",
    name: "Cua & Ghẹ",
    slug: "cua-ghe",
    count: "45+ sản phẩm",
    image:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "cat-4",
    name: "Mực & Bạch Tuộc",
    slug: "muc-bach-tuoc",
    count: "60+ sản phẩm",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "cat-5",
    name: "Nghêu, Sò, Hàu",
    slug: "ngheu-so-hau",
    count: "50+ sản phẩm",
    image:
      "https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "cat-6",
    name: "Hải sản đặc sản",
    slug: "hai-san-dac-san",
    count: "30+ sản phẩm",
    image:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=400&q=80",
  },
];

export const featuredProducts: Product[] = [
  {
    id: "prod-1",
    name: "Tôm Sú Biển Tươi Sống (Size 15 - 20 con/kg)",
    scientificName: "Penaeus monodon",
    category: "tom-song",
    origin: "Phú Quốc",
    originDetail: "Nước mặn / Phú Quốc",
    shopName: "Vựa Thủy Sản Phú Quốc Oanh",
    badge: "Phổ biến",
    badgeType: "blue",
    note: "Được đóng thùng oxy sống",
    price: 420000,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80",
    inStock: true,
    rating: 4.9,
  },
  {
    id: "prod-2",
    name: "Cá Hồi Phi Lê Tươi Sashimi Grade",
    scientificName: "Salmo salar",
    category: "ca-bien-tuoi",
    origin: "Nhập khẩu Na Uy",
    originDetail: "Nhập khẩu Na Uy",
    shopName: "Hải Sản Nhập Khẩu Sài Gòn Ocean",
    badge: "Bán chạy",
    badgeType: "red",
    note: "Filet đóng khay hút chân không",
    price: 385000,
    unit: "500g",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80",
    inStock: true,
    rating: 5.0,
  },
  {
    id: "prod-3",
    name: "Ghẹ Xanh Sống Phan Thiết (Loại 1: 3 - 4 con/kg)",
    scientificName: "Portunus armatus",
    category: "cua-ghe",
    origin: "Phan Thiết",
    originDetail: "Ghẹ lưới tự nhiên",
    shopName: "Vựa Ghẹ Xanh Cô Ba Phan Thiết",
    badge: "Phan Thiết",
    badgeType: "cyan",
    note: "Dây trói không trọng lượng",
    price: 460000,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80",
    inStock: true,
    rating: 4.8,
  },
  {
    id: "prod-4",
    name: "Mực Ống Tươi Côn Đảo (Size 4 - 6 con/kg)",
    scientificName: "Loligo edulis",
    category: "muc-bach-tuoc",
    origin: "Côn Đảo",
    originDetail: "Mực câu đêm Côn Đảo",
    shopName: "Hải Sản Vũng Tàu Express",
    badge: "Côn Đảo",
    badgeType: "blue",
    note: "Cấp đông tức thì giữ trọn vị ngọt",
    price: 290000,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    inStock: true,
    rating: 4.9,
  },
  {
    id: "prod-5",
    name: "Cua Cà Mau Năm Căn (Cua Gạch Loại 1)",
    scientificName: "Scylla paramamosain",
    category: "cua-ghe",
    origin: "Cà Mau",
    originDetail: "Cua tự nhiên Năm Căn",
    shopName: "Vựa Cua Biển Cà Mau Chính Hiệu",
    badge: "Đặc sản",
    badgeType: "amber",
    note: "Bao ăn 1 đổi 1 tận tay",
    price: 550000,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80",
    inStock: true,
    rating: 4.9,
  },
  {
    id: "prod-6",
    name: "Hàu Sữa Pháp Nuôi Vân Đồn (Tươi Sống)",
    scientificName: "Crassostrea gigas",
    category: "ngheu-so-hau",
    origin: "Quảng Ninh",
    originDetail: "Hàu sữa béo ngậy",
    shopName: "Vựa Hàu Biển Bắc Bộ",
    badge: "Giá tốt",
    badgeType: "green",
    note: "Hỗ trợ tách vỏ miễn phí",
    price: 75000,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=800&q=80",
    inStock: true,
    rating: 4.7,
  },
];

export const trustedVendors: Vendor[] = [
  {
    id: "ven-1",
    name: "Vựa Hải Sản Biển Xanh",
    location: "Nha Trang, Khánh Hòa",
    rating: 4.9,
    reviewCount: 128,
    productCount: 150,
    description:
      "Chuyên hải sản miền Trung, cá ngừ đại dương, tôm hùm bông cao cấp đánh bắt tự nhiên.",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80",
    verified: true,
  },
  {
    id: "ven-2",
    name: "Hải Sản Phú Quốc",
    location: "Hàm Ninh, Phú Quốc",
    rating: 4.8,
    reviewCount: 95,
    productCount: 85,
    description:
      "Cung cấp mực trứng, tôm mũ ni và ghẹ xanh tươi mới được kéo lưới về cảng mỗi rạng sáng.",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80",
    verified: true,
  },
  {
    id: "ven-3",
    name: "Vựa Hải Sản Hồ Sài Gòn",
    location: "Bình Thạnh, TP. Hồ Chí Minh",
    rating: 4.9,
    reviewCount: 210,
    productCount: 200,
    description:
      "Hồ nuôi chứa công nghệ lọc tuần hoàn, hải sản bơi sống tại hồ, đóng gói giao nhanh 2h tận nhà.",
    image:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80",
    verified: true,
  },
  {
    id: "ven-4",
    name: "Hải Sản Tươi Mỗi Ngày",
    location: "Bến Đá, Vũng Tàu",
    rating: 4.7,
    reviewCount: 82,
    productCount: 90,
    description:
      "Cập bến hải thuyền mỗi ngày, mực ống chớp, ốc móng tay chúa và cá chim trắng tự nhiên.",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    verified: true,
  },
];

export const homeBenefits: Benefit[] = [
  {
    id: "ben-1",
    title: "Đa dạng nhà cung cấp",
    description:
      "Kết nối hàng trăm vựa uy tín khắp cả nước, dễ dàng so sánh giá và lựa chọn nguồn hàng tốt nhất.",
    iconName: "Store",
  },
  {
    id: "ben-2",
    title: "Minh bạch nguồn gốc",
    description:
      "Nguồn gốc đánh bắt rõ ràng, có giấy chứng nhận vệ sinh an toàn thực phẩm và xuất xứ minh bạch.",
    iconName: "ShieldCheck",
  },
  {
    id: "ben-3",
    title: "Dịch vụ tận tâm",
    description:
      "Giao hỏa tốc trong 2h, đóng gói thùng xốp đá khô hoặc bình sục oxy tiêu chuẩn chuyên nghiệp.",
    iconName: "Headset",
  },
  {
    id: "ben-4",
    title: "Khám phá bằng AI",
    description:
      "Nhận diện hải sản qua ảnh, tra cứu công thức chế biến & đề xuất mức giá tốt nhất từ các vựa.",
    iconName: "Sparkles",
  },
];
