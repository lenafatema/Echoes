/** ECHOES colour source of truth. Keep literal colour values in this file only. */
export const colors = {
  neutrals: {
    paper50: '#F6EEDF', paper100: '#EFE4D0', paper200: '#E4D4B8', sand300: '#CDB894',
    taupe500: '#7A634E', umber600: '#6A5240', ink800: '#2A1B11', walnut800: '#33231A',
    espresso900: '#241810', cream100: '#EADBC0', cream400: '#C9B99C', taupe300: '#A89A82',
  },
  reward: { fill: '#B8862B', dark: '#E0B14A' },
  path: { aLight: '#2A1B11', aDark: '#EADBC0', bLight: '#8A5A12', bDark: '#D9A066' },
  status: {
    positiveLight: '#566B2F', positiveDark: '#B4C985',
    negativeLight: '#9A3F2D', negativeDark: '#EBA48E',
    warningLight: '#8A5A12', warningDark: '#E0B14A',
    infoLight: '#3F6479', infoDark: '#8FB2CE',
  },
  ranks: { bronze: '#B87A45', silver: '#B9B2A6', gold: '#E0B14A', platinum: '#E6E1D8' },
  focus: '#FFD477',
  shadow: 'rgba(26,15,8,.35)',
  scenarios: {
    techFest: { fill: '#4C5A8C', tint: '#9AA7D6' },
    startup: { fill: '#2F6B65', tint: '#7FBDB5' },
    restaurant: { fill: '#A8482A', tint: '#E0916F' },
    flood: { fill: '#466A85', tint: '#8FB2CE' },
    film: { fill: '#7A4F6B', tint: '#C79AB8' },
    harvest: { fill: '#5F6C26', tint: '#B5C46A' },
    custom: { fill: '#7A634E', tint: '#C9B99C' },
  },
} as const;

export type ScenarioAccentKey = keyof typeof colors.scenarios;
export const scenarioAccentById = {
  'college-tech-fest': 'techFest',
  'startup-product-launch': 'startup',
  'restaurant-opening-week': 'restaurant',
  'flood-relief-camp': 'flood',
  'film-shoot-weather': 'film',
  'harvest-before-rains': 'harvest',
} as const satisfies Record<string, ScenarioAccentKey>;

export const themeAccent: Readonly<Record<string, ScenarioAccentKey>> = {
  stage: 'techFest', office: 'startup', kitchen: 'restaurant', hall: 'flood',
  set: 'film', field: 'harvest', workshop: 'custom', generic: 'custom',
};

/** Three.js material aliases. Each resolves to a named token, never a second palette. */
export const material = {
  roomDark: colors.neutrals.espresso900,
  room: colors.neutrals.walnut800,
  raised: colors.neutrals.umber600,
  wood: colors.neutrals.taupe500,
  woodLight: colors.neutrals.sand300,
  paper: colors.neutrals.paper50,
  paperWarm: colors.neutrals.paper100,
  paperShade: colors.neutrals.paper200,
  text: colors.neutrals.cream100,
  textMuted: colors.neutrals.cream400,
  neutralAccent: colors.neutrals.taupe500,
  water: colors.scenarios.flood.tint,
  foliage: colors.scenarios.harvest.fill,
  coral: colors.scenarios.restaurant.fill,
  silver: colors.ranks.silver,
} as const;

export function accentForScenario(id?: string, theme?: string) {
  const key = (id && (scenarioAccentById as Record<string, ScenarioAccentKey>)[id]) || themeAccent[theme || ''] || 'custom';
  return colors.scenarios[key];
}

export function flattenColors(prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (value: unknown, path: string[]) => {
    if (typeof value === 'string') result[path.join('-')] = value;
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, child]) => visit(child, [...path, key]));
  };
  Object.entries(colors).forEach(([key, value]) => visit(value, prefix ? [prefix, key] : [key]));
  return result;
}

export const contrastPairs = [
  ['ink on paper-50', colors.neutrals.ink800, colors.neutrals.paper50],
  ['ink on paper-100', colors.neutrals.ink800, colors.neutrals.paper100],
  ['ink on paper-200', colors.neutrals.ink800, colors.neutrals.paper200],
  ['taupe-500 on paper-50', colors.neutrals.taupe500, colors.neutrals.paper50],
  ['cream-100 on walnut-800', colors.neutrals.cream100, colors.neutrals.walnut800],
  ['cream-100 on espresso-900', colors.neutrals.cream100, colors.neutrals.espresso900],
  ['cream-400 on walnut-800', colors.neutrals.cream400, colors.neutrals.walnut800],
  ['cream-400 on espresso-900', colors.neutrals.cream400, colors.neutrals.espresso900],
  ['Path B light on paper-50', colors.path.bLight, colors.neutrals.paper50],
  ['Path B light on paper-100', colors.path.bLight, colors.neutrals.paper100],
  ['Path B dark on walnut-800', colors.path.bDark, colors.neutrals.walnut800],
  ['Path B dark on espresso-900', colors.path.bDark, colors.neutrals.espresso900],
  ['positive light on paper-50', colors.status.positiveLight, colors.neutrals.paper50],
  ['positive light on paper-100', colors.status.positiveLight, colors.neutrals.paper100],
  ['positive dark on walnut-800', colors.status.positiveDark, colors.neutrals.walnut800],
  ['positive dark on espresso-900', colors.status.positiveDark, colors.neutrals.espresso900],
  ['negative light on paper-50', colors.status.negativeLight, colors.neutrals.paper50],
  ['negative light on paper-100', colors.status.negativeLight, colors.neutrals.paper100],
  ['negative dark on walnut-800', colors.status.negativeDark, colors.neutrals.walnut800],
  ['negative dark on espresso-900', colors.status.negativeDark, colors.neutrals.espresso900],
  ['warning light on paper-50', colors.status.warningLight, colors.neutrals.paper50],
  ['warning light on paper-100', colors.status.warningLight, colors.neutrals.paper100],
  ['warning dark on walnut-800', colors.status.warningDark, colors.neutrals.walnut800],
  ['warning dark on espresso-900', colors.status.warningDark, colors.neutrals.espresso900],
  ['info light on paper-50', colors.status.infoLight, colors.neutrals.paper50],
  ['info light on paper-100', colors.status.infoLight, colors.neutrals.paper100],
  ['info dark on walnut-800', colors.status.infoDark, colors.neutrals.walnut800],
  ['info dark on espresso-900', colors.status.infoDark, colors.neutrals.espresso900],
  ['focus on walnut-800', colors.focus, colors.neutrals.walnut800],
  ['focus on espresso-900', colors.focus, colors.neutrals.espresso900],
] as const;

export const nonTextContrastPairs = [
  ['ink border on paper-100', colors.neutrals.ink800, colors.neutrals.paper100],
  ['focus on walnut-800', colors.focus, colors.neutrals.walnut800],
  ['focus on espresso-900', colors.focus, colors.neutrals.espresso900],
] as const;
