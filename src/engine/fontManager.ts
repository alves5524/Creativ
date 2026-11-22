import { FontEntry } from '../types/studio';

const loadedGoogleFamilies = new Set<string>();
const loadedTypekitIds = new Set<string>();

/**
 * Dynamically injects a Google Fonts stylesheet for any font family name
 * and waits for the browser font face to finish loading.
 */
export async function loadGoogleFont(familyInput: string): Promise<FontEntry> {
  const family = familyInput.trim();
  if (!family) {
    throw new Error('Enter a valid Google Font family name.');
  }

  const encoded = encodeURIComponent(family).replace(/%20/g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800;900&display=swap`;

  if (!loadedGoogleFamilies.has(family.toLowerCase())) {
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.googleFont = family;
      link.onload = () => resolve();
      link.onerror = () =>
        reject(new Error(`Could not load "${family}" from Google Fonts.`));
      document.head.appendChild(link);
    });
    loadedGoogleFamilies.add(family.toLowerCase());
  }

  try {
    await document.fonts.load(`700 48px "${family}"`);
    await document.fonts.ready;
  } catch {
    // Fallback if weight 700 is unavailable; still load default weight
    await document.fonts.load(`400 48px "${family}"`);
  }

  return {
    family,
    provider: 'google',
    category: 'Custom',
    weights: [400, 500, 600, 700, 800, 900],
  };
}

/**
 * Loads an Adobe Fonts (Typekit) Web Project by its Project ID (e.g. "abc1def")
 * and returns any font family names detected in document.fonts after loading.
 */
export async function loadAdobeTypekitProject(projectIdInput: string): Promise<string[]> {
  const projectId = projectIdInput
    .trim()
    .replace(/^https?:\/\/use\.typekit\.net\//i, '')
    .replace(/\.css$/i, '');

  if (!/^[a-z0-9]{4,16}$/i.test(projectId)) {
    throw new Error('Adobe Fonts Project ID should be 4–16 alphanumeric characters (e.g. abc1def).');
  }

  const beforeFamilies = new Set<string>();
  document.fonts.forEach((f) => beforeFamilies.add(f.family.replace(/^['"]|['"]$/g, '')));

  if (!loadedTypekitIds.has(projectId)) {
    const href = `https://use.typekit.net/${projectId}.css`;
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.adobeTypekit = projectId;
      link.onload = () => resolve();
      link.onerror = () =>
        reject(
          new Error(
            `Unable to load Typekit project "${projectId}". Verify the Project ID is published in Adobe Fonts.`
          )
        );
      document.head.appendChild(link);
    });
    loadedTypekitIds.add(projectId);
  }

  await document.fonts.ready;

  const detected: string[] = [];
  document.fonts.forEach((f) => {
    const clean = f.family.replace(/^['"]|['"]$/g, '');
    if (!beforeFamilies.has(clean) && !detected.includes(clean)) {
      detected.push(clean);
    }
  });

  return detected;
}

/**
 * Loads a local font file (.ttf, .otf, .woff, .woff2) using the Web FontFace API.
 */
export async function loadLocalFontFile(file: File): Promise<FontEntry> {
  const validExt = /\.(ttf|otf|woff|woff2)$/i;
  if (!validExt.test(file.name)) {
    throw new Error('Unsupported font format. Upload .ttf, .otf, .woff, or .woff2.');
  }

  const rawName = file.name.replace(validExt, '').replace(/[_-]+/g, ' ').trim();
  const familyName = rawName || `CustomFont-${Date.now()}`;
  const buffer = await file.arrayBuffer();

  const fontFace = new FontFace(familyName, buffer);
  const loadedFace = await fontFace.load();
  document.fonts.add(loadedFace);
  await document.fonts.ready;

  return {
    family: familyName,
    provider: 'local',
    category: 'Custom',
    weights: [400, 700],
  };
}
