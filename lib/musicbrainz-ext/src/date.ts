export type DateParts = {year?: string; month?: string; day?: string};

export function parseDateParts(value: string | undefined): DateParts | undefined {
  const match = value?.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  return match ? {year: match[1], month: match[2], day: match[3]} : undefined;
}
