export const cyberPalette = {
  blue: "var(--color-cyber-blue)", // Flows
  teal: "var(--color-cyber-teal)", // Normal / Benign
  amber: "var(--color-cyber-amber)", // Medium
  orange: "var(--color-cyber-orange)", // High
  red: "var(--color-cyber-red)", // Critical / DoS
  purple: "var(--color-cyber-purple)", // Unknown
};

// Map Severities
export const severityColors: Record<string, string> = {
  CRITICAL: cyberPalette.red,
  HIGH: cyberPalette.orange,
  MEDIUM: cyberPalette.amber,
  LOW: cyberPalette.teal,
  NORMAL: cyberPalette.blue,
};

// Map Specific Attack Types
export const getAttackColor = (attackType: string): string => {
  const type = attackType.toLowerCase();
  if (type.includes("benign") || type.includes("normal")) return cyberPalette.teal;
  if (type.includes("dos") || type.includes("ddos")) return cyberPalette.red;
  if (type.includes("bruteforce")) return cyberPalette.orange;
  if (type.includes("portscan") || type.includes("scan")) return cyberPalette.amber;
  if (type.includes("sqli") || type.includes("injection")) return cyberPalette.orange;
  if (type.includes("xss")) return cyberPalette.amber;
  return cyberPalette.purple; // Unknown fallback
};
