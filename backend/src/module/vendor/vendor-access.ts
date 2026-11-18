import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { VendorStatus } from '@prisma/client';
import { CLOUDINARY_FOLDER_ROOT } from '../../common/cloudinary/cloudinary.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

export const VENDOR_NOT_FOUND = 'Tài khoản của bạn chưa có gian hàng.';
export const VENDOR_READ_ONLY =
  'Gian hàng đang bị tạm ngưng hoặc bị từ chối nên chỉ có thể xem, không thể thay đổi sản phẩm.';

/** Pending stores can prepare their catalogue before approval; their offers stay hidden until then. */
const WRITABLE_STATUSES: ReadonlySet<VendorStatus> = new Set<VendorStatus>([
  'PENDING',
  'ACTIVE',
]);

export interface OwnVendor {
  id: string;
  status: VendorStatus;
}

/** Folder for one vendor's product images, next to (not inside) its store image folder. */
export const vendorProductUploadFolder = (vendorId: string) =>
  `${CLOUDINARY_FOLDER_ROOT}/vendor-products/${vendorId}`;

export function canVendorWrite(status: VendorStatus): boolean {
  return WRITABLE_STATUSES.has(status);
}

/** The store owned by the token's user. The vendor id never comes from the client. */
export async function findOwnVendor(
  prisma: PrismaService,
  userId: string,
): Promise<OwnVendor> {
  const vendor = await prisma.vendor.findUnique({
    where: { ownerId: userId },
    select: { id: true, status: true },
  });
  if (!vendor) throw new NotFoundException(VENDOR_NOT_FOUND);
  return vendor;
}

/** Same as findOwnVendor, but 403 when the store is suspended or rejected. */
export async function findWritableVendor(
  prisma: PrismaService,
  userId: string,
): Promise<OwnVendor> {
  const vendor = await findOwnVendor(prisma, userId);
  if (!canVendorWrite(vendor.status))
    throw new ForbiddenException(VENDOR_READ_ONLY);
  return vendor;
}

/** A page window clamped to the available pages. */
export function pageWindow(totalItems: number, page = 1, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    skip: (safePage - 1) * pageSize,
    pagination: { page: safePage, limit: pageSize, totalItems, totalPages },
  };
}
