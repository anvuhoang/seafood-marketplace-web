import { ProductDetail } from "../types/product.types";

/**
 * Mock data for the flagship product shown in the UI mockup:
 * Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)
 */
export const flagshipProductMock: ProductDetail = {
  id: "prod-1",
  name: "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)",
  slug: "tom-su-bien-tuoi-song-loai-1",
  description:
    "Tôm sú biển tự nhiên đánh bắt trực tiếp từ vùng biển Hàm Ninh - Phú Quốc. Thịt săn chắc, ngọt đậm, thơm ngon tự nhiên, giàu đạm và canxi. Đóng gói thùng xốp đá cay giữ sống 4-6 giờ vận chuyển tận nơi.",
  status: "ACTIVE",
  isFeatured: true,
  sku: "SBD-TZ04-QSC",
  unit: "kg",
  price: 420000,
  originalPrice: 480000,
  discountPercent: 12,
  stock: 14,
  inStock: true,
  isDiscontinued: false,
  species: {
    id: "spec-1",
    commonName: "Tôm Sú Biển Tự Nhiên",
    scientificName: "Penaeus monodon",
    slug: "tom-su-bien",
    description: "Loài tôm biển có kích thước lớn, vỏ dày hoa văn sọc vằn đặc trưng.",
  },
  categories: [
    { id: "cat-home", name: "Trang chủ", slug: "/" },
    { id: "cat-2", name: "Tôm Sống & Tái Chế", slug: "/category/tom-song" },
    { id: "cat-sub-1", name: "Tôm sú biển", slug: "/category/tom-su-bien" },
  ],
  images: [
    {
      id: "img-1",
      imageUrl:
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=80",
      altText: "Tôm sú biển tươi sống loại 1 trên đĩa đá lạnh",
      sortOrder: 0,
      isPrimary: true,
    },
    {
      id: "img-2",
      imageUrl:
        "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80",
      altText: "Hồ bơi sục khí oxy chuyên dụng tại vựa",
      sortOrder: 1,
      isPrimary: false,
    },
    {
      id: "img-3",
      imageUrl:
        "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=1200&q=80",
      altText: "Bàn sơ chế và phân loại tôm biển xuất khẩu",
      sortOrder: 2,
      isPrimary: false,
    },
    {
      id: "img-4",
      imageUrl:
        "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=1200&q=80",
      altText: "Món tôm sú nướng mọi than hồng thơm nức",
      sortOrder: 3,
      isPrimary: false,
    },
  ],
  vendor: {
    id: "ven-phu-quoc-xanh",
    name: "Vựa Thủy Sản Phú Quốc Xanh",
    slug: "vua-thuy-san-phu-quoc-xanh",
    description:
      "Vựa hải sản lớn tại đảo Phú Quốc. Cung cấp hải sản đánh bắt trong ngày cho các chuỗi nhà hàng cao cấp và khách sỉ, lẻ toàn quốc.",
    logoUrl:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=200&q=80",
    coverUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    address:
      "Địa chỉ kho: 12 Bến Cảng, TP. Phú Quốc (kho trung chuyển phân phối tại TP.HCM: Tân Bình)",
    province: "Kiên Giang",
    district: "Phú Quốc",
    ratingAverage: 4.9,
    ratingCount: 342,
    verified: true,
    responseTimeMinutes: 20,
    positiveRatingPercent: 99.2,
  },
  specifications: {
    commonName: "Tôm Sú Biển Tự Nhiên",
    scientificName: "Penaeus monodon",
    habitat: "Tôm tự nhiên, Tôm biển cào đêm & lưới",
    origin: "Vùng biển Hàm Ninh, TP. Phú Quốc",
    catchMethod: "Đánh bắt lờ bè lớn biển ban đêm ven rạn đá",
    storageCondition: "Độ mặn 28 - 32‰, Nhiệt độ 22°C - 24°C",
    packagingStandard: "Thùng xốp đục 30ml đá cay duy trì 4 - 6 giờ bơi sống",
    wasteRatio: "Khoảng 10% - 15% trọng lượng vỏ tôm",
    culinaryAdvice:
      "Tôm sú tự nhiên có thớ thịt chắc giòn, ngọt tự nhiên đậm đà. Ngon nhất khi làm tôm nướng muối ớt, hấp nước dừa xiêm, sốt bơ tỏi hoặc ăn sashimi chấm mù tạt wasabi.",
  },
  reviewsSummary: {
    ratingAverage: 4.8,
    reviewCount: 148,
    soldCount: 1400,
    questionCount: 45,
    ratingBreakdown: {
      5: 118,
      4: 20,
      3: 6,
      2: 2,
      1: 2,
    },
    reviews: [
      {
        id: "rev-1",
        authorName: "Trần Hoàng Long",
        authorSub: "Đã mua 2.5 kg - Giao 2 ngày trước",
        rating: 5,
        date: "2 ngày trước",
        verifiedPurchase: true,
        content:
          "Tôm nhận được siêu tươi, gõ vỏ còn nhảy tanh tách! Vận chuyển giao hỏa tốc 1h30 phút là tới nơi rồi, mở thùng xốp ra nước lạnh mát tay, con nào con nấy chắc nịch. Mình nướng mọi chấm muối tiêu chanh ngon tuyệt vời. Chắc chắn sẽ tiếp tục ủng hộ vựa này!",
        photos: [
          "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=300&q=80",
          "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=300&q=80",
        ],
      },
      {
        id: "rev-2",
        authorName: "Mai Ngọc Trâm",
        authorSub: "Nhà hàng Biển Đông - Đã mua 15 kg",
        rating: 5,
        date: "1 tuần trước",
        verifiedPurchase: true,
        content:
          "Vựa làm việc rất chuyên nghiệp, trước khi đóng thùng có gọi video call quay bồn cho mình kiểm tra tôm bơi lội khỏe mạnh. Giao đúng giờ hẹn, bao bì đóng thùng xốp oxy muối đá cay chuẩn quy chuẩn an toàn thực phẩm. Khách ăn khen ngợi rất nhiều.",
      },
    ],
  },
  preparationOptions: [
    {
      id: "prep-live",
      label: "Bơi sống (bao oxy)",
      description: "Miễn phí đóng oxy",
      isDefault: true,
    },
    {
      id: "prep-ice",
      label: "Ngợp ướp đá nhiệt",
      description: "Lấy đá bảo quản",
      isDefault: false,
    },
    {
      id: "prep-vacuum",
      label: "Hút chân không",
      description: "Cấp đông -18°C",
      isDefault: false,
    },
  ],
  relatedProducts: [
    {
      id: "prod-rel-1",
      name: "Ghẹ Xanh Sống Phú Quốc Tuyển Chọn",
      slug: "ghe-xanh-song-phu-quoc",
      price: 390000,
      unit: "kg",
      image:
        "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80",
      badge: "Phú Quốc",
      tag: "1 thùng oxy còn 24 kg bơi sống",
      inStock: true,
      soldNote: "Còn sẵn",
    },
    {
      id: "prod-rel-2",
      name: "Cá Hồi Na Uy Tươi Cắt Thỏi Trong Ngày",
      slug: "ca-hoi-nauy-tuoi-cat-thoi",
      price: 395000,
      unit: "500g",
      image:
        "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=600&q=80",
      badge: "Nhập Khẩu",
      tag: "Filet đóng khay hút chân không",
      inStock: true,
      soldNote: "Còn sẵn",
    },
    {
      id: "prod-rel-3",
      name: "Mực Ống Câu Đêm Phú Quốc Loại 1",
      slug: "muc-ong-cau-dem-phu-quoc",
      price: 310000,
      unit: "kg",
      image:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
      badge: "Phú Quốc",
      tag: "Cấp đông chớp nhoáng trên tàu",
      inStock: true,
      soldNote: "Còn sẵn",
    },
    {
      id: "prod-rel-4",
      name: "Combo Hải Sản Thuyền Chài Đảo Ngọc",
      slug: "combo-hai-san-thuyen-chai-dao-ngoc",
      price: 499000,
      unit: "set",
      image:
        "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=600&q=80",
      badge: "Tiện Lợi",
      tag: "Đầy đủ mực, tôm, nghêu, sò điệp",
      inStock: true,
      soldNote: "Còn sẵn",
    },
  ],
};

/**
 * Discontinued or Out-Of-Stock mock product for testing edge cases
 */
export const discontinuedProductMock: ProductDetail = {
  ...flagshipProductMock,
  id: "prod-discontinued",
  name: "Tôm Hùm Đỏ Côn Đảo (Tạm Hết Hàng & Ngừng Nhập)",
  slug: "discontinued-sample",
  status: "INACTIVE",
  stock: 0,
  inStock: false,
  isDiscontinued: true,
  price: 1850000,
  originalPrice: 2100000,
};
