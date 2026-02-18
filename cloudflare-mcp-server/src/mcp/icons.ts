type IconTheme = "light" | "dark";
type IconSpec = {
  src: string;
  mimeType: string;
  sizes: string[];
  theme: IconTheme;
};

function toSvgDataUri(svg: string): string {
  // Use UTF-8 percent-encoding to keep payload small and compatible.
  // Also strip leading BOM/whitespace to avoid odd rendering in some clients.
  const trimmed = svg.replace(/^\uFEFF/, "").trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
}

const TOOLS_LIGHT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.7 6.3a4.5 4.5 0 0 0-6.2 6.2L4.2 16.8a2 2 0 1 0 2.8 2.8l4.3-4.3a4.5 4.5 0 0 0 6.2-6.2l-2.3 2.3-2.2-2.2 2.3-2.3Z"/>
</svg>`;

const TOOLS_DARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.7 6.3a4.5 4.5 0 0 0-6.2 6.2L4.2 16.8a2 2 0 1 0 2.8 2.8l4.3-4.3a4.5 4.5 0 0 0 6.2-6.2l-2.3 2.3-2.2-2.2 2.3-2.3Z"/>
</svg>`;

const RESOURCES_LIGHT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="12" cy="6" rx="7" ry="3"/>
  <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/>
  <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>
</svg>`;

const RESOURCES_DARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="12" cy="6" rx="7" ry="3"/>
  <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/>
  <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>
</svg>`;

const PROMPTS_LIGHT = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none" 
    stroke="#000" 
    stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
    viewBox="0 0 100 100" xmlns:bx="https://boxy-svg.com">
    <path
        d="M 90 82.893 C 90 86.8 86.048 89.998 81.11 89.998 C 79.859 90 78.619 89.79 77.456 89.377 L 74.196 89.998 L 75.085 87.511 C 73.479 86.379 72.447 84.715 72.221 82.893 C 72.221 78.985 76.172 75.789 81.11 75.789 C 86.048 75.789 90 78.985 90 82.893" />
    <path d="M 77.159 82.893 L 83.085 82.893" />
    <path d="M 77.159 80.228 L 87.037 80.228" />
    <path d="M 77.159 85.557 L 87.037 85.557" />
    <path
        d="M 47.611 10.633 L 81.235 28.082 L 47.685 30.482 L 47.611 30.492 L 47.611 10.633 M 25.421 61.079 L 43.717 32.581 L 10.329 30.205 L 25.421 61.079 M 65.119 62.378 L 46.587 33.557 L 28.042 62.378 L 65.119 62.378 M 27.581 64.599 L 46.176 85.45 L 46.374 85.552 L 46.733 85.363 L 64.922 64.604 L 27.581 64.599 M 82.763 30.362 L 82.763 30.215 L 49.055 32.623 L 67.565 61.443 L 82.763 30.362 M 66.55 64.599 L 66.528 64.565 L 66.489 64.599 L 66.55 64.599 M 67.553 65.185 L 52.511 82.362 L 80.972 67.584 L 67.553 65.185 M 69.389 63.254 L 82.763 65.651 L 82.763 35.867 L 69.389 63.254 M 46.389 10 M 24.584 64.777 L 11.557 67.461 L 40.304 82.383 L 24.584 64.777 M 23.536 62.723 L 10 35.014 L 10 65.509 L 23.536 62.723 M 11.581 28.062 L 45.082 30.459 L 45.143 30.459 L 45.143 10.646 L 11.581 28.062 M 66.528 64.565 L 66.489 64.599 L 66.55 64.599 L 66.528 64.565" />
</svg>`;

const PROMPTS_DARK = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  fill="none"
  stroke="#fff"
  stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
  viewBox="0 0 100 100" xmlns:bx="https://boxy-svg.com">
  <path
    d="M 90 82.893 C 90 86.8 86.048 89.998 81.11 89.998 C 79.859 90 78.619 89.79 77.456 89.377 L 74.196 89.998 L 75.085 87.511 C 73.479 86.379 72.447 84.715 72.221 82.893 C 72.221 78.985 76.172 75.789 81.11 75.789 C 86.048 75.789 90 78.985 90 82.893" />
  <path d="M 77.159 82.893 L 83.085 82.893" />
  <path d="M 77.159 80.228 L 87.037 80.228" />
  <path d="M 77.159 85.557 L 87.037 85.557" />
  <path
    d="M 47.611 10.633 L 81.235 28.082 L 47.685 30.482 L 47.611 30.492 L 47.611 10.633 M 25.421 61.079 L 43.717 32.581 L 10.329 30.205 L 25.421 61.079 M 65.119 62.378 L 46.587 33.557 L 28.042 62.378 L 65.119 62.378 M 27.581 64.599 L 46.176 85.45 L 46.374 85.552 L 46.733 85.363 L 64.922 64.604 L 27.581 64.599 M 82.763 30.362 L 82.763 30.215 L 49.055 32.623 L 67.565 61.443 L 82.763 30.362 M 66.55 64.599 L 66.528 64.565 L 66.489 64.599 L 66.55 64.599 M 67.553 65.185 L 52.511 82.362 L 80.972 67.584 L 67.553 65.185 M 69.389 63.254 L 82.763 65.651 L 82.763 35.867 L 69.389 63.254 M 46.389 10 M 24.584 64.777 L 11.557 67.461 L 40.304 82.383 L 24.584 64.777 M 23.536 62.723 L 10 35.014 L 10 65.509 L 23.536 62.723 M 11.581 28.062 L 45.082 30.459 L 45.143 30.459 L 45.143 10.646 L 11.581 28.062 M 66.528 64.565 L 66.489 64.599 L 66.55 64.599 L 66.528 64.565" />
</svg>`;

export type IconCategory = "tools" | "resources" | "prompts";

export function getInlineIconSet(category: IconCategory): IconSpec[] {
  const mimeType = "image/svg+xml";

  const byCategory: Record<IconCategory, { light: string; dark: string }> = {
    tools: { light: TOOLS_LIGHT, dark: TOOLS_DARK },
    resources: { light: RESOURCES_LIGHT, dark: RESOURCES_DARK },
    prompts: { light: PROMPTS_LIGHT, dark: PROMPTS_DARK },
  };

  const svg = byCategory[category];
  return [
    {
      src: toSvgDataUri(svg.light),
      mimeType,
      sizes: ["any"],
      theme: "light",
    },
    {
      src: toSvgDataUri(svg.dark),
      mimeType,
      sizes: ["any"],
      theme: "dark",
    },
  ];
}
