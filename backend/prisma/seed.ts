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
        'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=200&q=80',
      coverUrl:
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
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
        'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=400&q=80',
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
        'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Mực & Bạch Tuộc',
      slug: 'muc-bach-tuoc',
      description: 'Mực ống câu đêm, mực lá dày cơm, bạch tuộc tươi giòn ngọt.',
      imageUrl:
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Nghêu, Sò, Ốc',
      slug: 'ngheu-so-oc',
      description: 'Ốc hương bơi hồ, sò huyết, sò điệp, nghêu sạch cát.',
      imageUrl:
        'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Hải Sản Đặc Sản',
      slug: 'hai-san-dac-san',
      description: 'Bào ngư, tu hài, sá sùng và các loại hải sản quý hiếm theo mùa.',
      imageUrl:
        'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=400&q=80',
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
              'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
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
              'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
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

  // 6. Extra sample vendors and products, so listing filters (category,
  // region, vendor, price) have real data to work with.
  const IMG = {
    fish: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=600&q=80',
    shrimp: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
    grilled: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=600&q=80',
    crab: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
    shell: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=600&q=80',
  };

  const sampleVendors = [
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
      ratingAverage: 4.8,
      ratingCount: 156,
      products: [
        { name: 'Cua Gạch Son Cà Mau Loại 1', slug: 'cua-gach-son-ca-mau-loai-1', category: 'cua-ghe', image: IMG.crab, size: '350 - 400 g/con', price: 580000, stock: 30, featured: true },
        { name: 'Cua Thịt Năm Căn Chắc Thịt', slug: 'cua-thit-nam-can', category: 'cua-ghe', image: IMG.crab, size: '400 - 500 g/con', price: 520000, stock: 18 },
        { name: 'Tôm Càng Xanh Sông Cà Mau', slug: 'tom-cang-xanh-ca-mau', category: 'tom-song', image: IMG.shrimp, size: '8 - 10 con/kg', price: 450000, stock: 12 },
        { name: 'Sò Huyết Đầm Thị Tường', slug: 'so-huyet-dam-thi-tuong', category: 'ngheu-so-oc', image: IMG.shell, size: '60 - 80 con/kg', price: 180000, stock: 40 },
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
      ratingAverage: 4.7,
      ratingCount: 98,
      products: [
        { name: 'Tôm Hùm Bông Nha Trang', slug: 'tom-hum-bong-nha-trang', category: 'hai-san-dac-san', image: IMG.grilled, size: '1 - 1.2 kg/con', price: 1450000, stock: 6, featured: true },
        { name: 'Ốc Hương Biển Loại 1', slug: 'oc-huong-bien-loai-1', category: 'ngheu-so-oc', image: IMG.shell, size: '60 - 70 con/kg', price: 390000, stock: 20 },
        { name: 'Cá Bớp Biển Cắt Khoanh', slug: 'ca-bop-bien-cat-khoanh', category: 'ca-bien-tuoi', image: IMG.fish, size: 'Khoanh 300 - 400 g', price: 320000, stock: 15 },
        { name: 'Cá Mú Đỏ Biển Đảo', slug: 'ca-mu-do-bien-dao', category: 'ca-bien-tuoi', image: IMG.fish, size: '1.2 - 1.8 kg/con', price: 620000, stock: 0 },
      ],
    },
  ];

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
        status: 'ACTIVE',
        ratingAverage: sample.ratingAverage,
        ratingCount: sample.ratingCount,
      },
    });

    for (const item of sample.products) {
      await prisma.product.upsert({
        where: { slug: item.slug },
        update: {},
        create: {
          name: item.name,
          slug: item.slug,
          status: 'ACTIVE',
          isFeatured: item.featured ?? false,
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
                    {
                      vendorId: sampleVendor.id,
                      price: item.price,
                      stock: item.stock,
                      status: 'ACTIVE',
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    }
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
