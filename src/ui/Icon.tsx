// Ícones no estilo Carbon (grade 32px, traço 2px, cantos retos) — os mesmos desenhados no Figma.
// Para trocar pelos SVGs oficiais do Carbon, basta substituir os caminhos abaixo.
const PATHS: Record<string, string> = {
  home: 'M4 16L16 4l12 12M7 13v15h7v-9h4v9h7V13',
  user: 'M10.5 9a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0M6 28v-3a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v3',
  users: 'M7 9a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 27v-3a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v3M19.5 10a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M22 19h2a5 5 0 0 1 5 5v3',
  list: 'M4 8h3M12 8h16M4 16h3M12 16h16M4 24h3M12 24h16',
  gift: 'M4 11h24v6H4zM6 17v11h20V17M16 11v17M16 11C12 11 9 9 9 7a3 3 0 0 1 5-2zM16 11c4 0 7-2 7-4a3 3 0 0 0-5-2z',
  trophy: 'M10 4h12v8a6 6 0 0 1-12 0zM10 7H5v2a5 5 0 0 0 5 5M22 7h5v2a5 5 0 0 1-5 5M16 18v6M10 28h12M12 24h8',
  clock: 'M4 16a12 12 0 1 0 24 0a12 12 0 1 0-24 0M16 8v8l5 4',
  back: 'M27 16H5M13 8l-8 8 8 8',
  camera: 'M4 10h6l2-4h8l2 4h6v16H4zM11 18a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
  info: 'M4 16a12 12 0 1 0 24 0a12 12 0 1 0-24 0M16 14v9M16 9v2',
  check: 'M5 17l7 7 15-16',
  utensils: 'M9 4v9a3 3 0 0 0 6 0V4M12 4v24M22 28V4c-4 2-5 7-5 11h5',
  lock: 'M6 14h20v14H6zM10 14V9a6 6 0 0 1 12 0v5M16 20v3',
  film: 'M4 6h24v20H4zM10 6v20M22 6v20M4 12h6M4 20h6M22 12h6M22 20h6',
  chevron: 'M12 6l10 10-10 10',
  logout: 'M13 4H5v24h8M12 16h16M22 10l6 6-6 6',
  bulb: 'M16 3a9 9 0 0 0-5 16.5V23h10v-3.5A9 9 0 0 0 16 3zM12 27h8M13 30h6',
  play: 'M9 5l18 11L9 27z',
  shield: 'M16 3l11 4v9c0 7-5 11-11 13C10 27 5 23 5 16V7z',
  heart: 'M16 27C5 19 4 13 4 10a6 6 0 0 1 12-1 6 6 0 0 1 12 1c0 3-1 9-12 17z',
  chart: 'M6 28V16M14 28V8M22 28V20M4 28h24',
  plus: 'M16 5v22M5 16h22',
  edit: 'M4 28h6L27 11l-6-6L4 22zM17 9l6 6',
  key: 'M4 22a6 6 0 1 0 12 0a6 6 0 1 0-12 0M14.5 17.5L27 5M22 10l4 4M19 13l3 3',
  trash: 'M5 8h22M12 8V4h8v4M8 8l1 20h14l1-20M13 13v10M19 13v10',
  bell: 'M16 4c-5 0-8 4-8 9v6l-3 5h22l-3-5v-6c0-5-3-9-8-9zM13 27a3 3 0 0 0 6 0',
  x: 'M6 6l20 20M26 6L6 26',
  alert: 'M16 4L29 27H3zM16 12v8M16 23v1',
  mail: 'M3 7h26v18H3zM3 7l13 11L29 7',
  download: 'M16 4v17M8 14l8 8 8-8M5 27h22',
  star: 'M16 3l4 9 10 1-7.5 6.5L25 29l-9-5-9 5 2.5-9.5L2 13l10-1z',
  wifioff: 'M16 26v.01M11 21a7.5 7.5 0 0 1 5-2M21 21a7.5 7.5 0 0 0-2-1.5M6 16a14 14 0 0 1 4-3M26 16a14 14 0 0 0-9-5M2 11a20 20 0 0 1 5-3.5M30 11a20 20 0 0 0-13-5M4 4l24 24',
  eye: 'M2 16S8 7 16 7s14 9 14 9-6 9-14 9S2 16 2 16zM12 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  eyeoff: 'M2 16S8 7 16 7c2 0 4 .6 5.5 1.5M30 16s-2 3-5.5 5.5M4 4l24 24M13 13a4 4 0 0 0 6 6',
  flame: 'M16 3c1 6 8 9 8 17a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 2 4 3 4 0-4-1-8 1-13z',
  book: 'M4 6h9a3 3 0 0 1 3 3v19a3 3 0 0 0-3-3H4zM28 6h-9a3 3 0 0 0-3 3v19a3 3 0 0 1 3-3h9z',
  gamepad: 'M8 9h16a6 6 0 0 1 6 6v6a4 4 0 0 1-7 3l-3-3H12l-3 3a4 4 0 0 1-7-3v-6a6 6 0 0 1 6-6zM9 14v5M6.5 16.5h5M22 15v.01M25 18v.01',
  coin: 'M4 16a12 12 0 1 0 24 0a12 12 0 1 0-24 0M16 9v14M12 12.5h6a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 0 0 5h6',
  refresh: 'M26 12a11 11 0 0 0-20-2M6 4v6h6M6 20a11 11 0 0 0 20 2M26 28v-6h-6',
};

export type IconName = keyof typeof PATHS | string;

export function Icon({ name, size = 24, stroke, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  const d = PATHS[name] || PATHS.star;
  const sw = stroke ?? (size <= 16 ? 2.6 : size <= 20 ? 2.3 : 2);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" style={{ flex: 'none' }}>
      <path d={d} />
    </svg>
  );
}

export const REWARD_ICONS = ['gift', 'utensils', 'gamepad', 'film'];

/** Escolhe um ícone para a tarefa a partir do título. */
export function taskIcon(title: string): string {
  const t = title.toLowerCase();
  if (/(conhe[cç]a o money)/.test(t)) return 'star';
  if (/(estud|ler|li[cç][aã]o|dever|prova|matem|leitura)/.test(t)) return 'book';
  if (/(lou[cç]a|cozinh|comida|prato|mesa)/.test(t)) return 'utensils';
  if (/(casa|quarto|arrum|varrer|limp|cama|lixo|roupa)/.test(t)) return 'home';
  if (/(jogo|game)/.test(t)) return 'gamepad';
  return 'list';
}
