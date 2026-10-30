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

  // 3. Create categories
  const catTom = await prisma.category.upsert({
    where: { slug: 'tom-song' },
    update: {},
    create: {
      name: 'Tôm Sống & Tự Nhiên',
      slug: 'tom-song',
      sortOrder: 1,
      isActive: true,
    },
  });

  const catGhe = await prisma.category.upsert({
    where: { slug: 'cua-ghe' },
    update: {},
    create: {
      name: 'Cua & Ghẹ',
      slug: 'cua-ghe',
      sortOrder: 2,
      isActive: true,
    },
  });

  const catMuc = await prisma.category.upsert({
    where: { slug: 'muc-bach-tuoc' },
    update: {},
    create: {
      name: 'Mực & Bạch Tuộc',
      slug: 'muc-bach-tuoc',
      sortOrder: 3,
      isActive: true,
    },
  });

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
