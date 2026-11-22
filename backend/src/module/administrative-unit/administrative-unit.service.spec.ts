import { describe, it, expect } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ADMINISTRATIVE_UNIT_MESSAGES, AdministrativeUnitService } from './administrative-unit.service.js';

const service = new AdministrativeUnitService();

describe('AdministrativeUnitService (GSO catalogue)', () => {
  it('loads the whole three-level catalogue', () => {
    expect(service.listProvinces()).toHaveLength(63);
  });

  it('names units the way the seed data does', () => {
    // Every seeded vendor location must resolve, or the region filter would split them.
    const seeded: Array<[string, string]> = [
      ['Kiên Giang', 'Phú Quốc'],
      ['Cà Mau', 'Năm Căn'],
      ['Khánh Hòa', 'Nha Trang'],
      ['Bình Thuận', 'Phan Thiết'],
      ['Bà Rịa - Vũng Tàu', 'Côn Đảo'],
      ['Quảng Ninh', 'Vân Đồn'],
      ['Quảng Ninh', 'Hạ Long'],
    ];
    for (const [province, district] of seeded) {
      const codes = service.findCodes({ province, district, ward: null });
      expect(codes.provinceCode, province).not.toBeNull();
      expect(codes.districtCode, `${district}, ${province}`).not.toBeNull();
    }
  });

  it('keeps numbered districts and siblings that would collide under their full name', () => {
    expect(service.listDistricts('79')[0]).toEqual({ code: '760', name: 'Quận 1' });
    expect(service.listDistricts('82').filter((d) => d.name.includes('Cai Lậy'))).toEqual([
      { code: '817', name: 'Thị xã Cai Lậy' },
      { code: '820', name: 'Huyện Cai Lậy' },
    ]);
  });

  it('lists only the children of the requested parent', () => {
    expect(service.listDistricts('96').map((d) => d.name)).toContain('Năm Căn');
    expect(service.listDistricts('96').map((d) => d.name)).not.toContain('Phú Quốc');
    expect(service.listWards('911').map((w) => w.name)).toContain('An Thới');
  });

  it('answers 404 for unknown parents', () => {
    expect(() => service.listDistricts('00')).toThrow(NotFoundException);
    expect(() => service.listWards('000')).toThrow(NotFoundException);
  });

  describe('findCodes (stored names → codes, for pre-filling a resubmission)', () => {
    it('maps both same-named Cai Lậy units to their own codes', () => {
      expect(service.findCodes({ province: 'Tiền Giang', district: 'Huyện Cai Lậy', ward: 'Thạnh Lộc' })).toEqual({
        provinceCode: '82',
        districtCode: '820',
        wardCode: '28438',
      });
      expect(service.findCodes({ province: 'Tiền Giang', district: 'Thị xã Cai Lậy', ward: 'Phường 1' })).toEqual({
        provinceCode: '82',
        districtCode: '817',
        wardCode: '28435',
      });
    });

    it('looks names up under their parent, so a common name like "Phường 1" resolves per district', () => {
      expect(service.findCodes({ province: 'Hồ Chí Minh', district: 'Quận 3', ward: 'Phường 1' }).wardCode).toBe('27160');
      expect(service.findCodes({ province: 'Hồ Chí Minh', district: 'Quận 10', ward: 'Phường 1' }).wardCode).toBe('27184');
    });

    it('returns null from the first level that does not match and below', () => {
      expect(service.findCodes({ province: 'Tiền Giang', district: 'Cai Lậy', ward: 'Phường 1' })).toEqual({
        provinceCode: '82',
        districtCode: null,
        wardCode: null,
      });
      expect(service.findCodes({ province: 'TP. Hồ Chí Minh', district: 'Quận 1', ward: null })).toEqual({
        provinceCode: null,
        districtCode: null,
        wardCode: null,
      });
      expect(service.findCodes({ province: 'Kiên Giang', district: 'Phú Quốc', ward: null }).wardCode).toBeNull();
    });

    // The source lists "Xã Đông Khê" twice under Thành phố Thanh Hóa (380); names cannot tell them apart.
    const AMBIGUOUS_WARDS = new Set(['16387', '16408']);

    it('round-trips every ward in the catalogue: codes → stored names → the same codes', () => {
      let checked = 0;
      for (const province of service.listProvinces()) {
        for (const district of service.listDistricts(province.code)) {
          const wards = service.listWards(district.code);
          for (const wardCode of [null, ...wards.map((w) => w.code)]) {
            if (wardCode && AMBIGUOUS_WARDS.has(wardCode)) continue;
            const names = service.resolveAddress({ provinceCode: province.code, districtCode: district.code, wardCode });
            expect(service.findCodes(names)).toEqual({
              provinceCode: province.code,
              districtCode: district.code,
              wardCode,
            });
            checked++;
          }
        }
      }
      expect(checked).toBe(10047 + 696 - AMBIGUOUS_WARDS.size);
    });

    it('leaves the ward empty instead of guessing when the source has two wards with the same name', () => {
      const names = service.resolveAddress({ provinceCode: '38', districtCode: '380', wardCode: '16408' });
      expect(names.ward).toBe('Xã Đông Khê'); // the short form collides, so the full name is kept

      expect(service.findCodes(names)).toEqual({ provinceCode: '38', districtCode: '380', wardCode: null });
    });
  });

  describe('resolveAddress', () => {
    it('returns the stored names for a consistent address', () => {
      expect(service.resolveAddress({ provinceCode: '91', districtCode: '911', wardCode: '31081' })).toEqual({
        province: 'Kiên Giang',
        district: 'Phú Quốc',
        ward: 'An Thới',
      });
    });

    it('allows leaving the ward empty', () => {
      expect(service.resolveAddress({ provinceCode: '91', districtCode: '911', wardCode: null })).toEqual({
        province: 'Kiên Giang',
        district: 'Phú Quốc',
        ward: null,
      });
    });

    it('rejects a district from another province', () => {
      expect(() => service.resolveAddress({ provinceCode: '96', districtCode: '911' })).toThrow(
        new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.district),
      );
    });

    it('rejects a ward from another district', () => {
      expect(() => service.resolveAddress({ provinceCode: '96', districtCode: '971', wardCode: '31081' })).toThrow(
        new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.ward),
      );
    });

    it('rejects unknown codes at every level', () => {
      expect(() => service.resolveAddress({ provinceCode: '00', districtCode: '911' })).toThrow(BadRequestException);
      expect(() => service.resolveAddress({ provinceCode: '91', districtCode: '999' })).toThrow(BadRequestException);
      expect(() => service.resolveAddress({ provinceCode: '91', districtCode: '911', wardCode: '99999' })).toThrow(
        BadRequestException,
      );
    });
  });
});
