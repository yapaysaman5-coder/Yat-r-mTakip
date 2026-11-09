/** Locally unique ids for records created on this device (time-ordered, plus randomness). */
let last = '';
let counter = 0;

export function newId(prefix = ''): string {
  const time = Date.now().toString(36).padStart(9, '0');
  counter = time === last ? counter + 1 : 0;
  last = time;
  const rand = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
  return `${prefix}${time}${counter.toString(36).padStart(2, '0')}${rand}`;
}
