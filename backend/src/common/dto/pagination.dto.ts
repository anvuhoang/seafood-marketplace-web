/** Page metadata returned with paginated lists. */
export class PaginationDto {
  /** @example 1 */
  page: number;
  /** @example 12 */
  limit: number;
  /** @example 25 */
  totalItems: number;
  /** @example 3 */
  totalPages: number;
}
