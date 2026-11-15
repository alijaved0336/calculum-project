const iconModules = import.meta.glob<string>(
  '../assets/icons/*.svg',
  { eager: true, import: 'default', query: '?url' },
);

const iconUrlByName = Object.fromEntries(
  Object.entries(iconModules).map(([path, url]) => {
    const fileName = path.split('/').pop()?.replace('.svg', '') ?? '';
    return [fileName, url];
  }),
);

export function resolveSvgAsset(icon: string): string {
  const iconName = icon.replace(/\.svg$/, '');
  return iconUrlByName[iconName] ?? '';
}
