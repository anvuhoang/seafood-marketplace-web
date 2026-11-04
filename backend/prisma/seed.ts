import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not configured in .env');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Seed database with initial vendors, categories, species, and seafood products.
 */
async function main() {
  console.log('Seeding seafood database...');

  // 1. Create or upsert vendor owner user
  const hashedPassword = await bcrypt.hash('Vendor@123456', 10);
  const vendorOwner = await prisma.user.upsert({
    where: { email: 'phuquocxanh@haisanexpress.vn' },
    update: {},
    create: {
      email: 'phuquocxanh@haisanexpress.vn',
      fullName: 'Nguyễn Văn Hải (Chủ vựa Phú Quốc Xanh)',
      phone: '0908123456',
      passwordHash: hashedPassword,
      role: 'VENDOR',
      status: 'ACTIVE',
    },
  });

  // 2. Create or upsert vendor
  const vendor = await prisma.vendor.upsert({
    where: { slug: 'vua-thuy-san-phu-quoc-xanh' },
    update: {},
    create: {
      ownerId: vendorOwner.id,
      name: 'Vựa Thủy Sản Phú Quốc Xanh',
      slug: 'vua-thuy-san-phu-quoc-xanh',
      description:
        'Vựa hải sản lớn tại đảo Phú Quốc. Cung cấp hải sản đánh bắt trong ngày cho các chuỗi nhà hàng cao cấp và khách sỉ, lẻ toàn quốc.',
      logoUrl:
        'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=200&q=80',
      coverUrl:
        'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1200&q=80',
      phone: '0908123456',
      email: 'vua@phuquocxanh.vn',
      province: 'Kiên Giang',
      district: 'Phú Quốc',
      streetAddress: '12 Bến Cảng, TP. Phú Quốc',
      status: 'ACTIVE',
      ratingAverage: 4.9,
      ratingCount: 342,
    },
  });

  // 3. Create categories (same order as the header navigation).
  // Re-running the seed only refreshes image and order, so names and the
  // active flag edited later by an admin are kept.
  const categoryDefinitions = [
    {
      name: 'Cá Tươi & Đông Lạnh',
      slug: 'ca-bien-tuoi',
      description: 'Cá tươi cập bến hằng ngày, cá phi lê chuẩn sashimi và cá sống tự nhiên.',
      imageUrl:
        'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Tôm Sống & Tự Nhiên',
      slug: 'tom-song',
      description: 'Tôm sú biển bơi hồ sục khí, tôm càng xanh, tôm thẻ chân trắng tươi ngon.',
      imageUrl:
        'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Cua & Ghẹ',
      slug: 'cua-ghe',
      description: 'Cua Cà Mau gạch son chắc thịt, ghẹ xanh tươi sống từ các vựa ven biển.',
      imageUrl:
        'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Mực & Bạch Tuộc',
      slug: 'muc-bach-tuoc',
      description: 'Mực ống câu đêm, mực lá dày cơm, bạch tuộc tươi giòn ngọt.',
      imageUrl:
        'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Nghêu, Sò, Ốc',
      slug: 'ngheu-so-oc',
      description: 'Ốc hương bơi hồ, sò huyết, sò điệp, nghêu sạch cát.',
      imageUrl:
        'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Hải Sản Đặc Sản',
      slug: 'hai-san-dac-san',
      description: 'Bào ngư, tu hài, sá sùng và các loại hải sản quý hiếm theo mùa.',
      imageUrl:
        'https://images.unsplash.com/photo-1585545335512-1e43f40d4999?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const categories = new Map<string, { id: string }>();
  for (const [index, definition] of categoryDefinitions.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: definition.slug },
      update: { imageUrl: definition.imageUrl, sortOrder: index },
      create: { ...definition, sortOrder: index, isActive: true },
    });
    categories.set(definition.slug, category);
  }

  // Fill descriptions only where none is set yet, so admin edits are kept.
  for (const definition of categoryDefinitions) {
    await prisma.category.updateMany({
      where: { slug: definition.slug, description: null },
      data: { description: definition.description },
    });
  }

  const catTom = categories.get('tom-song')!;
  const catGhe = categories.get('cua-ghe')!;
  const catMuc = categories.get('muc-bach-tuoc')!;

  // 4. Create species
  const speciesTomSu = await prisma.seafoodSpecies.upsert({
    where: { slug: 'tom-su-bien' },
    update: {},
    create: {
      commonName: 'Tôm Sú Biển Tự Nhiên',
      scientificName: 'Penaeus monodon',
      slug: 'tom-su-bien',
      description:
        'Loài tôm biển có kích thước lớn, vỏ dày hoa văn sọc vằn đặc trưng.',
    },
  });

  // 5. Create Flagship Product: Tôm Sú Biển Tươi Sống Loại 1
  const productTomSu = await prisma.product.upsert({
    where: { slug: 'tom-su-bien-tuoi-song-loai-1' },
    update: {},
    create: {
      name: 'Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)',
      slug: 'tom-su-bien-tuoi-song-loai-1',
      description:
        'Tôm sú biển tự nhiên đánh bắt trực tiếp từ vùng biển Hàm Ninh - Phú Quốc. Thịt săn chắc, ngọt đậm, thơm ngon tự nhiên, giàu đạm và canxi. Đóng gói thùng xốp đá cay giữ sống 4-6 giờ vận chuyển tận nơi.',
      status: 'ACTIVE',
      isFeatured: true,
      speciesId: speciesTomSu.id,
      categories: {
        create: [{ categoryId: catTom.id }],
      },
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=80',
            altText: 'Tôm sú biển tươi sống loại 1',
            sortOrder: 0,
            isPrimary: true,
          },
          {
            imageUrl:
              'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
            altText: 'Hồ bơi sục khí oxy chuyên dụng tại vựa',
            sortOrder: 1,
            isPrimary: false,
          },
          {
            imageUrl:
              'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=1200&q=80',
            altText: 'Bàn sơ chế và phân loại tôm biển xuất khẩu',
            sortOrder: 2,
            isPrimary: false,
          },
          {
            imageUrl:
              'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=1200&q=80',
            altText: 'Món tôm nướng mọi than hoa thơm nức',
            sortOrder: 3,
            isPrimary: false,
          },
        ],
      },
      variants: {
        create: [
          {
            name: 'Tôm sú biển tươi sống (Size 15 - 20 con/kg)',
            sku: 'SBD-TZ04-QSC',
            unit: 'kg',
            sizeLabel: '15 - 20 con/kg',
            isActive: true,
            offers: {
              create: [
                {
                  vendorId: vendor.id,
                  price: 420000,
                  stock: 14,
                  status: 'ACTIVE',
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 6. Create Product 2: Ghẹ Xanh Sống Phú Quốc
  await prisma.product.upsert({
    where: { slug: 'ghe-xanh-song-phu-quoc' },
    update: {},
    create: {
      name: 'Ghẹ Xanh Sống Phú Quốc Tuyển Chọn',
      slug: 'ghe-xanh-song-phu-quoc',
      description: 'Ghẹ lưới tự nhiên biển Phú Quốc, dây trói không trọng lượng.',
      status: 'ACTIVE',
      isFeatured: false,
      categories: {
        create: [{ categoryId: catGhe.id }],
      },
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&w=600&q=80',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
      variants: {
        create: [
          {
            name: 'Ghẹ xanh sống loại 1',
            sku: 'GHE-PQ-01',
            unit: 'kg',
            sizeLabel: '3 - 4 con/kg',
            isActive: true,
            offers: {
              create: [
                {
                  vendorId: vendor.id,
                  price: 390000,
                  stock: 24,
                  status: 'ACTIVE',
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 7. Create Product 3: Mực Ống Câu Đêm Phú Quốc
  await prisma.product.upsert({
    where: { slug: 'muc-ong-cau-dem-phu-quoc' },
    update: {},
    create: {
      name: 'Mực Ống Câu Đêm Phú Quốc Loại 1',
      slug: 'muc-ong-cau-dem-phu-quoc',
      description: 'Mực câu đêm chớp mắt, cấp đông nhanh giữ trọn vị ngọt tự nhiên.',
      status: 'ACTIVE',
      isFeatured: false,
      categories: {
        create: [{ categoryId: catMuc.id }],
      },
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=600&q=80',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
      variants: {
        create: [
          {
            name: 'Mực ống câu đêm',
            sku: 'MUC-PQ-01',
            unit: 'kg',
            sizeLabel: '4 - 6 con/kg',
            isActive: true,
            offers: {
              create: [
                {
                  vendorId: vendor.id,
                  price: 310000,
                  stock: 18,
                  status: 'ACTIVE',
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 8. Create Discontinued Product for Edge Case Testing
  await prisma.product.upsert({
    where: { slug: 'discontinued-sample' },
    update: {},
    create: {
      name: 'Tôm Hùm Đỏ Côn Đảo (Ngừng kinh doanh)',
      slug: 'discontinued-sample',
      description: 'Sản phẩm tạm ngừng khai thác để bảo tồn nguồn lợi tự nhiên.',
      status: 'INACTIVE',
      isFeatured: false,
      categories: {
        create: [{ categoryId: catTom.id }],
      },
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
      variants: {
        create: [
          {
            name: 'Tôm hùm đỏ',
            sku: 'HUM-CD-01',
            unit: 'kg',
            sizeLabel: '1 - 2 con/kg',
            isActive: false,
            offers: {
              create: [
                {
                  vendorId: vendor.id,
                  price: 1850000,
                  stock: 0,
                  status: 'OUT_OF_STOCK',
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 6. Sample catalogue: species, vendors, products, extra offers and
  // reviews, so listing, filters, product detail and reviews use real rows.
  // Every step is an upsert or guarded insert, so the seed can be re-run.
  // Image URLs were checked by eye to show seafood.
  const IMG = {
    salmonFillet: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?auto=format&fit=crop&w=800&q=80',
    salmonSteak: 'https://images.unsplash.com/photo-1601314002592-b8734bca6604?auto=format&fit=crop&w=800&q=80',
    wholeFish: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=800&q=80',
    fishOnIce: 'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=800&q=80',
    fishCatch: 'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?auto=format&fit=crop&w=800&q=80',
    prawnsRaw: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=800&q=80',
    prawnsPlate: 'https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=800&q=80',
    lobsterLive: 'https://images.unsplash.com/photo-1585545335512-1e43f40d4999?auto=format&fit=crop&w=800&q=80',
    lobsterPlate: 'https://images.unsplash.com/photo-1590759668628-05b0fc34bb70?auto=format&fit=crop&w=800&q=80',
    crab: 'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&w=800&q=80',
    mixedSeafood: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80',
  };

  const speciesDefinitions = [
    { slug: 'tom-hum-bong', commonName: 'Tôm hùm bông', scientificName: 'Panulirus ornatus' },
    { slug: 'tom-cang-xanh', commonName: 'Tôm càng xanh', scientificName: 'Macrobrachium rosenbergii' },
    { slug: 'tom-the-chan-trang', commonName: 'Tôm thẻ chân trắng', scientificName: 'Litopenaeus vannamei' },
    { slug: 'cua-bun', commonName: 'Cua bùn', scientificName: 'Scylla paramamosain' },
    { slug: 'ghe-xanh', commonName: 'Ghẹ xanh', scientificName: 'Portunus pelagicus' },
    { slug: 'muc-ong', commonName: 'Mực ống', scientificName: 'Uroteuthis chinensis' },
    { slug: 'muc-la', commonName: 'Mực lá', scientificName: 'Sepioteuthis lessoniana' },
    { slug: 'bach-tuoc', commonName: 'Bạch tuộc', scientificName: 'Octopus vulgaris' },
    { slug: 'ca-bop', commonName: 'Cá bớp', scientificName: 'Rachycentron canadum' },
    { slug: 'ca-mu-do', commonName: 'Cá mú đỏ', scientificName: 'Plectropomus leopardus' },
    { slug: 'ca-thu', commonName: 'Cá thu', scientificName: 'Scomberomorus commerson' },
    { slug: 'ca-hoi', commonName: 'Cá hồi Đại Tây Dương', scientificName: 'Salmo salar' },
    { slug: 'ca-chim-trang', commonName: 'Cá chim trắng', scientificName: 'Pampus argenteus' },
    { slug: 'ca-ngu-dai-duong', commonName: 'Cá ngừ đại dương', scientificName: 'Thunnus albacares' },
    { slug: 'oc-huong', commonName: 'Ốc hương', scientificName: 'Babylonia areolata' },
    { slug: 'so-huyet', commonName: 'Sò huyết', scientificName: 'Tegillarca granosa' },
    { slug: 'ngheu-trang', commonName: 'Nghêu trắng', scientificName: 'Meretrix lyrata' },
    { slug: 'so-diep', commonName: 'Sò điệp', scientificName: 'Chlamys nobilis' },
    { slug: 'hau-thai-binh-duong', commonName: 'Hàu Thái Bình Dương', scientificName: 'Crassostrea gigas' },
    { slug: 'tu-hai', commonName: 'Tu hài', scientificName: 'Lutraria rhynchaena' },
    { slug: 'bao-ngu', commonName: 'Bào ngư', scientificName: 'Haliotis diversicolor' },
    { slug: 'sa-sung', commonName: 'Sá sùng', scientificName: 'Sipunculus nudus' },
  ];

  const speciesIds = new Map<string, string>([['tom-su-bien', speciesTomSu.id]]);
  for (const definition of speciesDefinitions) {
    const species = await prisma.seafoodSpecies.upsert({
      where: { slug: definition.slug },
      update: {},
      create: definition,
    });
    speciesIds.set(definition.slug, species.id);
  }

  interface SampleProduct {
    name: string;
    slug: string;
    category: string;
    species: string;
    image: string;
    size: string;
    price: number;
    stock: number;
    featured?: boolean;
    description: string;
  }

  interface SampleVendor {
    ownerEmail: string;
    ownerName: string;
    ownerPhone: string;
    name: string;
    slug: string;
    description: string;
    province: string;
    district: string;
    streetAddress: string;
    status: 'ACTIVE' | 'SUSPENDED';
    ratingAverage: number;
    ratingCount: number;
    products: SampleProduct[];
  }

  const sampleVendors: SampleVendor[] = [
    {
      ownerEmail: 'camaudatmui@haisanexpress.vn',
      ownerName: 'Trần Văn Mũi (Chủ vựa Cà Mau Đất Mũi)',
      ownerPhone: '0918234567',
      name: 'HTX Cua Cà Mau Đất Mũi',
      slug: 'htx-cua-ca-mau-dat-mui',
      description: 'Hợp tác xã nuôi cua sinh thái rừng đước Năm Căn, giao cua gạch, cua thịt quanh năm.',
      province: 'Cà Mau',
      district: 'Năm Căn',
      streetAddress: '25 Khóm 2, Thị trấn Năm Căn',
      status: 'ACTIVE',
      ratingAverage: 4.8,
      ratingCount: 156,
      products: [
        { name: 'Cua Gạch Son Cà Mau Loại 1', slug: 'cua-gach-son-ca-mau-loai-1', category: 'cua-ghe', species: 'cua-bun', image: IMG.crab, size: '350 - 400 g/con', price: 580000, stock: 30, featured: true, description: 'Cua gạch son rừng đước Năm Căn, gạch đầy, thịt chắc, dây trói không tính trọng lượng.' },
        { name: 'Cua Thịt Năm Căn Chắc Thịt', slug: 'cua-thit-nam-can', category: 'cua-ghe', species: 'cua-bun', image: IMG.crab, size: '400 - 500 g/con', price: 520000, stock: 18, description: 'Cua thịt chắc ngọt, phù hợp hấp bia, rang me hoặc nấu lẩu.' },
        { name: 'Tôm Càng Xanh Sông Cà Mau', slug: 'tom-cang-xanh-ca-mau', category: 'tom-song', species: 'tom-cang-xanh', image: IMG.prawnsRaw, size: '8 - 10 con/kg', price: 450000, stock: 12, description: 'Tôm càng xanh nuôi tự nhiên trong vuông tôm lúa, càng to, thịt dai ngọt.' },
        { name: 'Tôm Thẻ Chân Trắng Cà Mau', slug: 'tom-the-chan-trang-ca-mau', category: 'tom-song', species: 'tom-the-chan-trang', image: IMG.prawnsPlate, size: '40 - 50 con/kg', price: 230000, stock: 45, description: 'Tôm thẻ tươi đóng đá ngay tại ao, phù hợp chiên, hấp hoặc làm gỏi cuốn.' },
        { name: 'Sò Huyết Đầm Thị Tường', slug: 'so-huyet-dam-thi-tuong', category: 'ngheu-so-oc', species: 'so-huyet', image: IMG.mixedSeafood, size: '60 - 80 con/kg', price: 180000, stock: 40, description: 'Sò huyết đầm Thị Tường, ruột đỏ tươi, nướng mỡ hành hoặc xào me đều ngon.' },
        { name: 'Nghêu Trắng Sạch Cát', slug: 'ngheu-trang-sach-cat', category: 'ngheu-so-oc', species: 'ngheu-trang', image: IMG.mixedSeafood, size: '40 - 50 con/kg', price: 75000, stock: 60, description: 'Nghêu trắng đã ngâm sạch cát, nấu canh chua, hấp sả hoặc nấu cháo.' },
      ],
    },
    {
      ownerEmail: 'nhatrangxanh@haisanexpress.vn',
      ownerName: 'Lê Thị Biển (Chủ vựa Nha Trang Xanh)',
      ownerPhone: '0935345678',
      name: 'Vựa Hải Sản Nha Trang Xanh',
      slug: 'vua-hai-san-nha-trang-xanh',
      description: 'Vựa hải sản cảng Hòn Rớ, chuyên tôm hùm bông, ốc hương và cá biển đánh bắt trong ngày.',
      province: 'Khánh Hòa',
      district: 'Nha Trang',
      streetAddress: 'Cảng cá Hòn Rớ, Phước Đồng',
      status: 'ACTIVE',
      ratingAverage: 4.7,
      ratingCount: 98,
      products: [
        { name: 'Tôm Hùm Bông Nha Trang', slug: 'tom-hum-bong-nha-trang', category: 'hai-san-dac-san', species: 'tom-hum-bong', image: IMG.lobsterLive, size: '1 - 1.2 kg/con', price: 1450000, stock: 6, featured: true, description: 'Tôm hùm bông nuôi lồng vịnh Nha Trang, bơi khỏe, thịt chắc ngọt.' },
        { name: 'Ốc Hương Biển Loại 1', slug: 'oc-huong-bien-loai-1', category: 'ngheu-so-oc', species: 'oc-huong', image: IMG.mixedSeafood, size: '60 - 70 con/kg', price: 390000, stock: 20, description: 'Ốc hương biển giòn ngọt, hấp sả hoặc rang muối ớt.' },
        { name: 'Cá Bớp Biển Cắt Khoanh', slug: 'ca-bop-bien-cat-khoanh', category: 'ca-bien-tuoi', species: 'ca-bop', image: IMG.salmonSteak, size: 'Khoanh 300 - 400 g', price: 320000, stock: 15, description: 'Cá bớp biển cắt khoanh làm sạch trong ngày, nấu lẩu măng chua hoặc kho tộ.' },
        { name: 'Cá Mú Đỏ Biển Đảo', slug: 'ca-mu-do-bien-dao', category: 'ca-bien-tuoi', species: 'ca-mu-do', image: IMG.fishOnIce, size: '1.2 - 1.8 kg/con', price: 620000, stock: 0, description: 'Cá mú đỏ đánh bắt vùng rạn san hô, hấp xì dầu hoặc nấu cháo.' },
        { name: 'Sò Điệp Nha Trang', slug: 'so-diep-nha-trang', category: 'ngheu-so-oc', species: 'so-diep', image: IMG.mixedSeafood, size: '20 - 25 con/kg', price: 210000, stock: 25, description: 'Sò điệp vỏ tươi, nướng mỡ hành hoặc phô mai.' },
        { name: 'Cá Hồi Phi Lê Nhập Khẩu', slug: 'ca-hoi-phi-le-nhap-khau', category: 'ca-bien-tuoi', species: 'ca-hoi', image: IMG.salmonFillet, size: 'Khay 500 g', price: 520000, stock: 22, featured: true, description: 'Cá hồi phi lê bảo quản lạnh, dùng làm sashimi, áp chảo hoặc nướng.' },
      ],
    },
    {
      ownerEmail: 'duyenhaiphanthiet@haisanexpress.vn',
      ownerName: 'Phạm Văn Duyên (Chủ vựa Duyên Hải)',
      ownerPhone: '0945456789',
      name: 'Vựa Hải Sản Duyên Hải Phan Thiết',
      slug: 'vua-hai-san-duyen-hai-phan-thiet',
      description: 'Vựa đầu mối cảng Phan Thiết, nhận hàng từ ghe câu mỗi sáng: ghẹ, mực, cá biển.',
      province: 'Bình Thuận',
      district: 'Phan Thiết',
      streetAddress: 'Cảng cá Phan Thiết, Đức Thắng',
      status: 'ACTIVE',
      ratingAverage: 4.6,
      ratingCount: 74,
      products: [
        { name: 'Ghẹ Xanh Phan Thiết Loại Nhất', slug: 'ghe-xanh-phan-thiet-loai-nhat', category: 'cua-ghe', species: 'ghe-xanh', image: IMG.crab, size: '3 - 4 con/kg', price: 490000, stock: 16, featured: true, description: 'Ghẹ xanh ghe cào Phan Thiết, chắc thịt, hấp sả hoặc rang me.' },
        { name: 'Mực Ống Phan Thiết Tươi', slug: 'muc-ong-phan-thiet-tuoi', category: 'muc-bach-tuoc', species: 'muc-ong', image: IMG.mixedSeafood, size: '8 - 12 con/kg', price: 340000, stock: 20, description: 'Mực ống câu đêm, thân dày, hấp gừng hoặc chiên giòn.' },
        { name: 'Cá Chim Trắng Biển', slug: 'ca-chim-trang-bien', category: 'ca-bien-tuoi', species: 'ca-chim-trang', image: IMG.wholeFish, size: '500 - 700 g/con', price: 350000, stock: 14, description: 'Cá chim trắng thịt mềm, ít xương, chiên giòn hoặc hấp.' },
        { name: 'Bạch Tuộc Tươi Sống', slug: 'bach-tuoc-tuoi-song', category: 'muc-bach-tuoc', species: 'bach-tuoc', image: IMG.mixedSeafood, size: '1 - 2 con/kg', price: 240000, stock: 18, description: 'Bạch tuộc tươi giòn, nướng sa tế hoặc nhúng giấm.' },
      ],
    },
    {
      ownerEmail: 'condaoxanh@haisanexpress.vn',
      ownerName: 'Võ Thị Đảo (Chủ vựa Côn Đảo Xanh)',
      ownerPhone: '0956567890',
      name: 'Vựa Côn Đảo Xanh',
      slug: 'vua-con-dao-xanh',
      description: 'Vựa hải sản biển đảo Côn Đảo, chuyên mực trứng, cá ngừ và hải sản quý theo mùa.',
      province: 'Bà Rịa - Vũng Tàu',
      district: 'Côn Đảo',
      streetAddress: 'Bến Đầm, Côn Đảo',
      status: 'ACTIVE',
      ratingAverage: 4.9,
      ratingCount: 61,
      products: [
        { name: 'Mực Ống Trứng Côn Đảo', slug: 'muc-ong-trung-con-dao', category: 'muc-bach-tuoc', species: 'muc-ong', image: IMG.mixedSeafood, size: '12 - 15 cm/con', price: 290000, stock: 24, description: 'Mực ống trứng đầy, hấp hành gừng hoặc nướng muối ớt.' },
        { name: 'Cá Ngừ Đại Dương Cắt Lát', slug: 'ca-ngu-dai-duong-cat-lat', category: 'ca-bien-tuoi', species: 'ca-ngu-dai-duong', image: IMG.fishCatch, size: 'Lát 300 g', price: 390000, stock: 12, description: 'Cá ngừ đại dương câu tay, cắt lát áp chảo hoặc làm gỏi.' },
        { name: 'Bào Ngư Biển Côn Đảo', slug: 'bao-ngu-bien-con-dao', category: 'hai-san-dac-san', species: 'bao-ngu', image: IMG.mixedSeafood, size: '10 - 12 con/kg', price: 1250000, stock: 5, description: 'Bào ngư biển tự nhiên, hầm thuốc bắc hoặc nướng bơ tỏi.' },
      ],
    },
    {
      ownerEmail: 'vandon@haisanexpress.vn',
      ownerName: 'Đỗ Văn Đồn (Chủ vựa Vân Đồn)',
      ownerPhone: '0967678901',
      name: 'Vựa Hải Sản Vân Đồn',
      slug: 'vua-hai-san-van-don',
      description: 'Vựa hải sản vịnh Bái Tử Long, chuyên tu hài, hàu sữa và sá sùng Vân Đồn.',
      province: 'Quảng Ninh',
      district: 'Vân Đồn',
      streetAddress: 'Cái Rồng, Vân Đồn',
      status: 'ACTIVE',
      ratingAverage: 4.5,
      ratingCount: 39,
      products: [
        { name: 'Tu Hài Vân Đồn', slug: 'tu-hai-van-don', category: 'hai-san-dac-san', species: 'tu-hai', image: IMG.mixedSeafood, size: '8 - 10 con/kg', price: 260000, stock: 20, description: 'Tu hài vịnh Bái Tử Long, nướng mỡ hành hoặc xào tỏi.' },
        { name: 'Hàu Sữa Vân Đồn', slug: 'hau-sua-van-don', category: 'ngheu-so-oc', species: 'hau-thai-binh-duong', image: IMG.mixedSeafood, size: '12 - 15 con/kg', price: 95000, stock: 50, description: 'Hàu sữa béo ngậy, nướng phô mai hoặc ăn sống mù tạt.' },
        { name: 'Sá Sùng Khô Vân Đồn', slug: 'sa-sung-kho-van-don', category: 'hai-san-dac-san', species: 'sa-sung', image: IMG.mixedSeafood, size: 'Loại 1, 1 kg', price: 4500000, stock: 3, description: 'Sá sùng phơi khô, dùng nấu nước dùng phở hoặc rang giòn.' },
      ],
    },
    {
      // Suspended on purpose: its product must not appear in any listing.
      ownerEmail: 'halongtamngung@haisanexpress.vn',
      ownerName: 'Bùi Văn Long (Chủ vựa Hạ Long)',
      ownerPhone: '0978789012',
      name: 'Vựa Hải Sản Hạ Long (Tạm ngưng)',
      slug: 'vua-hai-san-ha-long-tam-ngung',
      description: 'Vựa đang bị tạm ngưng hoạt động.',
      province: 'Quảng Ninh',
      district: 'Hạ Long',
      streetAddress: 'Chợ Hạ Long 1',
      status: 'SUSPENDED',
      ratingAverage: 3.2,
      ratingCount: 12,
      products: [
        { name: 'Cá Thu Hạ Long Cắt Khúc', slug: 'ca-thu-ha-long-cat-khuc', category: 'ca-bien-tuoi', species: 'ca-thu', image: IMG.fishOnIce, size: 'Khúc 500 - 700 g', price: 280000, stock: 10, description: 'Sản phẩm của vựa đang tạm ngưng.' },
      ],
    },
  ];

  const vendorIds = new Map<string, string>([[vendor.slug, vendor.id]]);

  for (const sample of sampleVendors) {
    const owner = await prisma.user.upsert({
      where: { email: sample.ownerEmail },
      update: {},
      create: {
        email: sample.ownerEmail,
        fullName: sample.ownerName,
        phone: sample.ownerPhone,
        passwordHash: hashedPassword,
        role: 'VENDOR',
        status: 'ACTIVE',
      },
    });

    const sampleVendor = await prisma.vendor.upsert({
      where: { slug: sample.slug },
      update: {},
      create: {
        ownerId: owner.id,
        name: sample.name,
        slug: sample.slug,
        description: sample.description,
        phone: sample.ownerPhone,
        email: sample.ownerEmail,
        province: sample.province,
        district: sample.district,
        streetAddress: sample.streetAddress,
        status: sample.status,
        ratingAverage: sample.ratingAverage,
        ratingCount: sample.ratingCount,
      },
    });
    vendorIds.set(sample.slug, sampleVendor.id);

    for (const item of sample.products) {
      await prisma.product.upsert({
        where: { slug: item.slug },
        update: {},
        create: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          status: 'ACTIVE',
          isFeatured: item.featured ?? false,
          speciesId: speciesIds.get(item.species),
          categories: { create: [{ categoryId: categories.get(item.category)!.id }] },
          images: { create: [{ imageUrl: item.image, sortOrder: 0, isPrimary: true }] },
          variants: {
            create: [
              {
                name: item.name,
                unit: 'kg',
                sizeLabel: item.size,
                isActive: true,
                offers: {
                  create: [
                    { vendorId: sampleVendor.id, price: item.price, stock: item.stock, status: 'ACTIVE' },
                  ],
                },
              },
            ],
          },
        },
      });
    }
  }

  // Fill in data that earlier seed runs created without it (or with a wrong
  // image), without overwriting values someone has changed since.
  const productFixes: Array<{ slug: string; species?: string; image?: string; size?: string; description?: string }> = [
    { slug: 'ghe-xanh-song-phu-quoc', species: 'ghe-xanh', image: IMG.crab },
    { slug: 'muc-ong-cau-dem-phu-quoc', species: 'muc-ong', image: IMG.mixedSeafood },
    ...sampleVendors.flatMap((sample) =>
      sample.products.map((item) => ({
        slug: item.slug,
        species: item.species,
        image: item.image,
        size: item.size,
        description: item.description,
      })),
    ),
  ];
  // Placeholder photos earlier seed runs used for these products. Only those
  // are replaced, so an image a vendor uploads later is never overwritten.
  const outdatedImageIds = [
    'photo-1559847844-5315695dadae',
    'photo-1544551763-46a013bb70d5',
    'photo-1534482421-64566f976cfa',
    'photo-1628294895950-9805252327bc',
    'photo-1615141982883-c7ad0e69fd62',
  ];

  for (const fix of productFixes) {
    if (fix.species) {
      await prisma.product.updateMany({
        where: { slug: fix.slug, speciesId: null },
        data: { speciesId: speciesIds.get(fix.species) },
      });
    }
    if (fix.description) {
      await prisma.product.updateMany({
        where: { slug: fix.slug, description: null },
        data: { description: fix.description },
      });
    }
    if (fix.image) {
      await prisma.productImage.updateMany({
        where: {
          product: { slug: fix.slug },
          isPrimary: true,
          imageUrl: { not: fix.image },
          OR: outdatedImageIds.map((id) => ({ imageUrl: { contains: id } })),
        },
        data: { imageUrl: fix.image },
      });
    }
    if (fix.size) {
      await prisma.productVariant.updateMany({
        where: { product: { slug: fix.slug }, sizeLabel: null },
        data: { sizeLabel: fix.size },
      });
    }
  }

  // The first vendor was created with unrelated logo and cover photos.
  await prisma.vendor.updateMany({
    where: { slug: vendor.slug, logoUrl: { contains: 'photo-1559847844-5315695dadae' } },
    data: { logoUrl: IMG.prawnsRaw },
  });
  await prisma.vendor.updateMany({
    where: { slug: vendor.slug, coverUrl: { contains: 'photo-1544551763-46a013bb70d5' } },
    data: { coverUrl: IMG.fishOnIce },
  });

  // Products sold by more than one vendor, to exercise "cheapest offer" logic.
  const extraOffers = [
    { product: 'oc-huong-bien-loai-1', vendor: 'vua-con-dao-xanh', price: 370000, stock: 10 },
    { product: 'ca-mu-do-bien-dao', vendor: 'vua-con-dao-xanh', price: 650000, stock: 5 },
    { product: 'tom-hum-bong-nha-trang', vendor: 'vua-con-dao-xanh', price: 1390000, stock: 4 },
  ];

  for (const extra of extraOffers) {
    const variant = await prisma.productVariant.findFirst({
      where: { product: { slug: extra.product } },
      orderBy: { name: 'asc' },
    });
    const vendorId = vendorIds.get(extra.vendor);
    if (!variant || !vendorId) continue;

    await prisma.vendorOffer.upsert({
      where: { vendorId_variantId: { vendorId, variantId: variant.id } },
      update: {},
      create: { vendorId, variantId: variant.id, price: extra.price, stock: extra.stock, status: 'ACTIVE' },
    });
  }

  // Sample customers and their reviews.
  const customerPassword = await bcrypt.hash('Customer@123456', 10);
  const sampleCustomers = [
    { email: 'lan.nguyen@example.com', fullName: 'Nguyễn Thị Lan', phone: '0901000001' },
    { email: 'quan.tran@example.com', fullName: 'Trần Minh Quân', phone: '0901000002' },
    { email: 'ha.pham@example.com', fullName: 'Phạm Thu Hà', phone: '0901000003' },
    { email: 'nam.le@example.com', fullName: 'Lê Hoàng Nam', phone: '0901000004' },
  ];
  const customerIds: string[] = [];
  for (const customer of sampleCustomers) {
    const user = await prisma.user.upsert({
      where: { email: customer.email },
      update: {},
      create: { ...customer, passwordHash: customerPassword, role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerIds.push(user.id);
  }

  const sampleReviews: Array<{ product: string; customer: number; rating: number; content: string }> = [
    { product: 'tom-su-bien-tuoi-song-loai-1', customer: 0, rating: 5, content: 'Tôm còn bơi khi mở thùng, thịt chắc và ngọt. Giao đúng giờ.' },
    { product: 'tom-su-bien-tuoi-song-loai-1', customer: 1, rating: 4, content: 'Tôm tươi, size đều. Đóng gói kỹ, chỉ hơi nhiều đá.' },
    { product: 'tom-su-bien-tuoi-song-loai-1', customer: 2, rating: 5, content: 'Mua lần thứ ba, chất lượng vẫn ổn định.' },
    { product: 'cua-gach-son-ca-mau-loai-1', customer: 0, rating: 5, content: 'Cua gạch nhiều, hấp lên rất thơm. Sẽ mua lại.' },
    { product: 'cua-gach-son-ca-mau-loai-1', customer: 3, rating: 4, content: 'Cua chắc, có một con hơi ít gạch nhưng nhìn chung tốt.' },
    { product: 'tom-hum-bong-nha-trang', customer: 1, rating: 5, content: 'Tôm hùm còn sống khoẻ, nướng phô mai cả nhà đều khen.' },
    { product: 'ghe-xanh-phan-thiet-loai-nhat', customer: 2, rating: 4, content: 'Ghẹ chắc thịt, giao nhanh. Giá hợp lý.' },
    { product: 'ghe-xanh-phan-thiet-loai-nhat', customer: 3, rating: 3, content: 'Ghẹ ngon nhưng có hai con hơi nhỏ so với size.' },
    { product: 'ca-hoi-phi-le-nhap-khau', customer: 0, rating: 5, content: 'Cá hồi đỏ tươi, làm sashimi rất ngon.' },
    { product: 'oc-huong-bien-loai-1', customer: 3, rating: 5, content: 'Ốc giòn, sạch, hấp sả là hết sạch.' },
    { product: 'muc-ong-trung-con-dao', customer: 1, rating: 4, content: 'Mực nhiều trứng, hấp gừng rất ngon.' },
    { product: 'hau-sua-van-don', customer: 2, rating: 5, content: 'Hàu béo, nướng mỡ hành tuyệt vời.' },
  ];

  for (const review of sampleReviews) {
    const product = await prisma.product.findUnique({ where: { slug: review.product } });
    const userId = customerIds[review.customer];
    if (!product || !userId) continue;

    // Reviews have no natural unique key, so skip ones this seed already added.
    const existing = await prisma.review.findFirst({ where: { productId: product.id, userId } });
    if (existing) continue;

    await prisma.review.create({
      data: { productId: product.id, userId, rating: review.rating, content: review.content, status: 'PUBLISHED' },
    });
  }

  // Delivered sample orders, so the review center has items waiting for a
  // review. Order numbers are fixed, so re-running the seed skips them.
  const sampleOrders: Array<{
    orderNumber: string;
    customer: number;
    deliveredDaysAgo: number;
    items: Array<{ product: string; quantity: number }>;
  }> = [
    { orderNumber: 'HSE-89214', customer: 0, deliveredDaysAgo: 2, items: [{ product: 'tom-su-bien-tuoi-song-loai-1', quantity: 1 }] },
    {
      orderNumber: 'HSE-89187',
      customer: 0,
      deliveredDaysAgo: 6,
      items: [
        { product: 'ghe-xanh-song-phu-quoc', quantity: 2 },
        { product: 'muc-ong-cau-dem-phu-quoc', quantity: 1 },
      ],
    },
    { orderNumber: 'HSE-89102', customer: 1, deliveredDaysAgo: 4, items: [{ product: 'cua-thit-nam-can', quantity: 1 }] },
  ];

  for (const sample of sampleOrders) {
    const userId = customerIds[sample.customer];
    const customer = sampleCustomers[sample.customer];
    if (!userId || !customer) continue;
    if (await prisma.order.findUnique({ where: { orderNumber: sample.orderNumber } })) continue;

    // Cheapest active offer for each product, grouped into one vendor order per vendor.
    const lines = [];
    for (const item of sample.items) {
      const offer = await prisma.vendorOffer.findFirst({
        where: { status: 'ACTIVE', variant: { product: { slug: item.product } } },
        include: { vendor: true, variant: { include: { product: true } } },
        orderBy: { price: 'asc' },
      });
      if (offer) lines.push({ offer, quantity: item.quantity, lineTotal: Number(offer.price) * item.quantity });
    }
    if (lines.length === 0) continue;

    const byVendor = new Map<string, typeof lines>();
    for (const line of lines) {
      byVendor.set(line.offer.vendorId, [...(byVendor.get(line.offer.vendorId) ?? []), line]);
    }

    const deliveredAt = new Date(Date.now() - sample.deliveredDaysAgo * 24 * 60 * 60 * 1000);
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

    await prisma.order.create({
      data: {
        orderNumber: sample.orderNumber,
        userId,
        status: 'COMPLETED',
        subtotal,
        grandTotal: subtotal,
        recipientName: customer.fullName,
        recipientPhone: customer.phone,
        shippingAddress: '42 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
        shippingProvince: 'TP. Hồ Chí Minh',
        shippingDistrict: 'Quận 1',
        shippingWard: 'Phường Bến Thành',
        createdAt: new Date(deliveredAt.getTime() - 24 * 60 * 60 * 1000),
        vendorOrders: {
          create: [...byVendor.values()].map((vendorLines) => {
            const vendorSubtotal = vendorLines.reduce((sum, line) => sum + line.lineTotal, 0);
            return {
              vendorId: vendorLines[0]!.offer.vendorId,
              status: 'COMPLETED' as const,
              subtotal: vendorSubtotal,
              grandTotal: vendorSubtotal,
              shipment: { create: { status: 'COMPLETED' as const, shippedAt: deliveredAt, deliveredAt } },
              items: {
                create: vendorLines.map((line) => ({
                  offerId: line.offer.id,
                  productNameSnapshot: line.offer.variant.product.name,
                  variantNameSnapshot: line.offer.variant.name,
                  vendorNameSnapshot: line.offer.vendor.name,
                  unitSnapshot: line.offer.variant.unit,
                  unitPrice: line.offer.price,
                  quantity: line.quantity,
                  lineTotal: line.lineTotal,
                })),
              },
            };
          }),
        },
      },
    });
  }

  // An admin account, so the admin area can be used right after seeding.
  await prisma.user.upsert({
    where: { email: 'admin@haisanexpress.vn' },
    update: {},
    create: {
      email: 'admin@haisanexpress.vn',
      fullName: 'Quản trị viên HaiSan Express',
      phone: '0900000000',
      passwordHash: await bcrypt.hash('Admin@123456', 10),
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // Stores waiting for review. Their owners stay customers until an admin
  // approves the store, which is what promotes them to VENDOR.
  const pendingVendors = [
    {
      owner: { email: 'hai.dang@example.com', fullName: 'Lê Văn Đăng', phone: '0902000001' },
      store: {
        name: 'Vựa Ghẹ Sống Côn Đảo Hải Đăng',
        slug: 'vua-ghe-song-con-dao-hai-dang',
        description: 'Ghẹ, cua và tôm hùm đánh bắt quanh Côn Đảo, giữ sống trong bồn giữ lạnh.',
        phone: '0902000001',
        email: 'haidang@example.com',
        province: 'Bà Rịa - Vũng Tàu',
        district: 'Côn Đảo',
        streetAddress: '8 Tôn Đức Thắng, Côn Đảo',
      },
    },
    {
      owner: { email: 'thu.huong@example.com', fullName: 'Phạm Thu Hương', phone: '0902000002' },
      store: {
        name: 'Hải Sản Biển Đông Nha Trang',
        slug: 'hai-san-bien-dong-nha-trang',
        description: 'Tôm hùm, cá mú và sò điệp nuôi lồng bè ở vịnh Nha Trang.',
        phone: '0902000002',
        email: 'biendong@example.com',
        province: 'Khánh Hòa',
        district: 'Nha Trang',
        streetAddress: '25 Trần Phú, Nha Trang',
      },
    },
    {
      owner: { email: 'minh.tuan@example.com', fullName: 'Võ Minh Tuấn', phone: '0902000003' },
      store: {
        name: 'Vựa Mực Phan Thiết',
        slug: 'vua-muc-phan-thiet',
        description: 'Mực ống, mực lá và cá thu phơi khô, đánh bắt tại Phan Thiết.',
        phone: '0902000003',
        email: 'mucphanthiet@example.com',
        province: 'Bình Thuận',
        district: 'Phan Thiết',
        streetAddress: '3 Đường Ngư Ông, Phan Thiết',
      },
    },
  ];

  for (const pending of pendingVendors) {
    const owner = await prisma.user.upsert({
      where: { email: pending.owner.email },
      update: {},
      create: { ...pending.owner, passwordHash: customerPassword, role: 'CUSTOMER', status: 'ACTIVE' },
    });
    await prisma.vendor.upsert({
      where: { slug: pending.store.slug },
      update: {},
      create: { ...pending.store, ownerId: owner.id, status: 'PENDING' },
    });
  }

  console.log('Seeding finished successfully.');
  console.log(`- Created product: ${productTomSu.name} (slug: ${productTomSu.slug})`);
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
