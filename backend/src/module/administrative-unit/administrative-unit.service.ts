import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import type { AdministrativeUnitDto } from './dto/administrative-unit.dto.js';

/** Shape of `data/dvhcvn.json` (General Statistics Office catalogue, see data/SOURCE.md). */
interface RawWard {
  level3_id: string;
  name: string;
}
interface RawDistrict {
  level2_id: string;
  name: string;
  level3s: RawWard[];
}
interface RawProvince {
  level1_id: string;
  name: string;
  level2s: RawDistrict[];
}

interface Unit {
  code: string;
  name: string;
  parentCode: string | null;
}

export interface AddressCodes {
  provinceCode: string;
  districtCode: string;
  wardCode?: string | null;
}

export interface ResolvedAddress {
  province: string;
  district: string;
  ward: string | null;
}

export const ADMINISTRATIVE_UNIT_MESSAGES = {
  province: 'Tỉnh/thành phố không hợp lệ.',
  district: 'Quận/huyện không hợp lệ hoặc không thuộc tỉnh/thành phố đã chọn.',
  ward: 'Xã/phường không hợp lệ hoặc không thuộc quận/huyện đã chọn.',
} as const;

const TYPE_PREFIX = /^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Phường|Xã|Thị trấn)\s+(.+)$/;

/** "Tỉnh Kiên Giang" → "Kiên Giang", but "Quận 1" stays "Quận 1". */
function shortName(name: string): string {
  const match = TYPE_PREFIX.exec(name);
  return match && !/^\d+$/.test(match[2]) ? match[2] : name;
}

/**
 * Display names for siblings: the short form, unless two siblings would share it
 * (e.g. "Huyện Cai Lậy" and "Thị xã Cai Lậy"), in which case those keep the full name.
 */
function siblingNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) {
    const short = shortName(name);
    counts.set(short, (counts.get(short) ?? 0) + 1);
  }
  return names.map((name) => {
    const short = shortName(name);
    return counts.get(short) === 1 ? short : name;
  });
}

function loadUnits(): { provinces: Unit[]; districts: Map<string, Unit>; wards: Map<string, Unit> } {
  const raw = JSON.parse(readFileSync(new URL('./data/dvhcvn.json', import.meta.url), 'utf8')) as RawProvince[];
  const provinces: Unit[] = [];
  const districts = new Map<string, Unit>();
  const wards = new Map<string, Unit>();

  const provinceNames = siblingNames(raw.map((p) => p.name));
  raw.forEach((province, i) => {
    provinces.push({ code: province.level1_id, name: provinceNames[i], parentCode: null });

    const districtNames = siblingNames(province.level2s.map((d) => d.name));
    province.level2s.forEach((district, j) => {
      districts.set(district.level2_id, { code: district.level2_id, name: districtNames[j], parentCode: province.level1_id });

      const wardNames = siblingNames(district.level3s.map((w) => w.name));
      district.level3s.forEach((ward, k) => {
        wards.set(ward.level3_id, { code: ward.level3_id, name: wardNames[k], parentCode: district.level2_id });
      });
    });
  });

  return { provinces, districts, wards };
}

const toDto = ({ code, name }: Unit): AdministrativeUnitDto => ({ code, name });

/**
 * Vietnam's province → district → ward catalogue (pre-07/2025 three-level system).
 * Reference data only; loaded once from the bundled GSO file.
 */
@Injectable()
export class AdministrativeUnitService {
  private readonly provinces: Unit[];
  private readonly provinceByCode: Map<string, Unit>;
  private readonly districtByCode: Map<string, Unit>;
  private readonly wardByCode: Map<string, Unit>;
  /** Children in catalogue order, by parent code. */
  private readonly childrenOf = new Map<string, Unit[]>();
  /**
   * "<parent code>|<stored name>" → unit, or null when the name is ambiguous.
   * Stored names are unique among siblings except where the source itself lists
   * two units with the same full name (one case: "Xã Đông Khê" twice in
   * Thành phố Thanh Hóa), which cannot be told apart by name.
   */
  private readonly byParentAndName = new Map<string, Unit | null>();

  constructor() {
    const units = loadUnits();
    this.provinces = units.provinces;
    this.provinceByCode = new Map(units.provinces.map((p) => [p.code, p]));
    this.districtByCode = units.districts;
    this.wardByCode = units.wards;

    for (const unit of [...units.provinces, ...units.districts.values(), ...units.wards.values()]) {
      const parent = unit.parentCode ?? '';
      const key = `${parent}|${unit.name}`;
      this.byParentAndName.set(key, this.byParentAndName.has(key) ? null : unit);
      if (unit.parentCode) {
        const siblings = this.childrenOf.get(unit.parentCode) ?? [];
        siblings.push(unit);
        this.childrenOf.set(unit.parentCode, siblings);
      }
    }
  }

  listProvinces(): AdministrativeUnitDto[] {
    return this.provinces.map(toDto);
  }

  listDistricts(provinceCode: string): AdministrativeUnitDto[] {
    if (!this.provinceByCode.has(provinceCode)) throw new NotFoundException('Không tìm thấy tỉnh/thành phố.');
    return (this.childrenOf.get(provinceCode) ?? []).map(toDto);
  }

  listWards(districtCode: string): AdministrativeUnitDto[] {
    if (!this.districtByCode.has(districtCode)) throw new NotFoundException('Không tìm thấy quận/huyện.');
    return (this.childrenOf.get(districtCode) ?? []).map(toDto);
  }

  /** Checks the codes exist and belong to each other, and returns the names to store. 400 otherwise. */
  resolveAddress({ provinceCode, districtCode, wardCode }: AddressCodes): ResolvedAddress {
    const province = this.provinceByCode.get(provinceCode);
    if (!province) throw new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.province);

    const district = this.districtByCode.get(districtCode);
    if (!district || district.parentCode !== province.code) {
      throw new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.district);
    }

    if (!wardCode) return { province: province.name, district: district.name, ward: null };

    const ward = this.wardByCode.get(wardCode);
    if (!ward || ward.parentCode !== district.code) {
      throw new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.ward);
    }
    return { province: province.name, district: district.name, ward: ward.name };
  }

  /**
   * The reverse lookup for stored names, used to pre-fill a form. Any level that
   * does not match the catalogue (e.g. hand-entered seed data) comes back null.
   */
  findCodes(address: { province: string; district: string; ward: string | null }): {
    provinceCode: string | null;
    districtCode: string | null;
    wardCode: string | null;
  } {
    // Names are only unique within a parent (e.g. "Phường 1"), so each level is looked up under the one above.
    const province = this.byParentAndName.get(`|${address.province}`);
    const district = province ? this.byParentAndName.get(`${province.code}|${address.district}`) : undefined;
    const ward =
      district && address.ward ? this.byParentAndName.get(`${district.code}|${address.ward}`) : undefined;

    return {
      provinceCode: province?.code ?? null,
      districtCode: district?.code ?? null,
      wardCode: ward?.code ?? null,
    };
  }
}
