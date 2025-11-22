export function sanitizeName(input: string): string {
  const onlyAllowed = input.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, "");
  const noRepeats = onlyAllowed.replace(/([ '\-])\1+/g, "$1");
  return noRepeats.trim().replace(/\s{2,}/g, " ");
}

export function sanitizeNameLoose(input: string): string {
  const onlyAllowed = input.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, "");
  const noRepeats = onlyAllowed.replace(/([ '\-])\1+/g, "$1");
  return noRepeats.replace(/\s{2,}/g, " ");
}

export function validateName(input: string): { ok: boolean; error?: string } {
  const value = sanitizeName(input);
  if (!value) return { ok: false, error: "Name is required." };
  if (value.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  if (value.length > 80) return { ok: false, error: "Name must be 80 characters or less." };
  const banned = [
    "fuck","shit","bitch","whore","slut","asshole","bastard","dick","pussy","cunt",
    "nigger","nigga","faggot","retard","spic","chink","kike","wetback","gook"
  ];
  const norm = value
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z' -]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const tokens = norm.split(" ");
  for (const w of banned) {
    if (norm.includes(w) || tokens.includes(w)) {
      return { ok: false, error: "Please enter an appropriate name." };
    }
  }
  const pattern = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '\-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
  if (!pattern.test(value)) return { ok: false, error: "Use letters, spaces, hyphens or apostrophes only." };
  return { ok: true };
}

export function sanitizeAddress(input: string): string {
  const onlyAllowed = input.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 ,.\-]/g, "");
  const noRepeats = onlyAllowed.replace(/([ ,.\-])\1+/g, "$1");
  return noRepeats.trim().replace(/\s{2,}/g, " ");
}

export function validateAddress(input: string): { ok: boolean; error?: string } {
  const value = sanitizeAddress(input);
  if (!value) return { ok: false, error: "Address is required." };
  if (value.length < 5) return { ok: false, error: "Address must be at least 5 characters." };
  const allowed = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ,.\-]+$/;
  if (!allowed.test(value)) return { ok: false, error: "Invalid characters in address." };
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value)) return { ok: false, error: "Address must include letters." };
  return { ok: true };
}

export function sanitizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("63") && normalized.length === 12) {
    normalized = "0" + normalized.slice(2);
  }
  if (normalized.length === 10 && normalized.startsWith("9")) {
    normalized = "0" + normalized;
  }
  return normalized.slice(0, 11);
}

export function validatePhone(input: string): { ok: boolean; error?: string } {
  const value = sanitizePhone(input);
  if (!value) return { ok: false, error: "Phone number is required." };
  if (!/^09\d{9}$/.test(value)) return { ok: false, error: "Enter an 11-digit mobile number starting with 09." };
  return { ok: true };
}

export function allValid(fields: { name?: string; address?: string; phone?: string }) {
  const name = fields.name ?? "";
  const address = fields.address ?? "";
  const phone = fields.phone ?? "";
  const n = validateName(name);
  const a = validateAddress(address);
  const p = validatePhone(phone);
  return { ok: n.ok && a.ok && p.ok, errors: { name: n.error, address: a.error, phone: p.error } };
}
