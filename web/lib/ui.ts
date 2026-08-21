export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TONES = [
  "bg-blue-50 text-blue-800",
  "bg-teal-50 text-teal-800",
  "bg-indigo-50 text-indigo-800",
  "bg-amber-50 text-amber-800",
  "bg-slate-100 text-navy",
];

export function toneFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i) * (i + 1)) % TONES.length;
  return TONES[h];
}
