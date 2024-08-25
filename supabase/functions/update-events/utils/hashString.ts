export function hashString(str: string): number {
  let hash = 0;

  if (!str || str.length === 0) {
    return hash;
  }

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hash = (hash << 5) - hash + charCode;
    hash &= hash; // Convert to positive
  }

  hash = hash >>> 0; // Ensure 32-bit integer

  // Ensure the hash is not less than 100_000
  if (hash < 100_000) {
    hash += 100_000;
  }

  return hash;
}
