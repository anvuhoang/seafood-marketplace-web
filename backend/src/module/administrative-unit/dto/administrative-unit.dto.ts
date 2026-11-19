/** One province, district or ward from the GSO catalogue. */
export class AdministrativeUnitDto {
  /** GSO code, unique nationwide within its level. @example "91" */
  code: string;
  /** Name as stored on addresses (type prefix dropped where unambiguous). @example "Kiên Giang" */
  name: string;
}
