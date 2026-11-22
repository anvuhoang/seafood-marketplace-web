import { randomInt } from 'node:crypto';

/**
 * A number that identifies one payment attempt at PayOS. It must be a unique positive integer
 * that JavaScript can hold exactly (below 2^53): the time in milliseconds followed by three random
 * digits, so two attempts in the same millisecond still differ.
 */
export function newOrderCode(
  now: number = Date.now(),
  random: (max: number) => number = randomInt,
): number {
  return now * 1000 + random(1000);
}
