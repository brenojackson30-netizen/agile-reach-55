// Utilidades de data/hora no fuso America/Sao_Paulo
const TZ = "America/Sao_Paulo";

export function todayStr(): string {
  // YYYY-MM-DD no fuso de SP
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function nowParts() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return map;
}

export function nowHHMM(): string {
  const p = nowParts();
  return `${p.hour}:${p.minute}`;
}

export function todayWeekday(): number {
  // 0 = domingo ... 6 = sábado, no fuso de SP
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
  const w = fmt.format(new Date());
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w] ?? 0;
}

export function minutesBetween(hhmmA: string, hhmmB: string): number {
  const [ah, am] = hhmmA.split(":").map(Number);
  const [bh, bm] = hhmmB.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAYS_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function dateAtSPWeekStart(): Date[] {
  // Retorna 7 datas (Seg→Dom) da semana atual em SP
  const w = todayWeekday(); // 0=Dom
  const offsetToMon = w === 0 ? -6 : 1 - w;
  const base = new Date();
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offsetToMon + i);
    days.push(d);
  }
  return days;
}

export function fmtDateYMD(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

export function weekdayOf(d: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[fmt.format(d)] ?? 0;
}
