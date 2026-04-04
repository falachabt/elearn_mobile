export const SECONDARY_WHATSAPP_GROUPS = [
  {
    label: "Tle A",
    url: "https://chat.whatsapp.com/LmX86OqJh6IDnXLjBYoA6t?mode=gi_t",
  },
  {
    label: "Tle C",
    url: "https://chat.whatsapp.com/JU8xULPn02s8RFpCaTtRXx?mode=gi_t",
  },
  {
    label: "Tle D",
    url: "https://chat.whatsapp.com/HmnsYLD7Rec3hSW00EI6VA?mode=gi_t",
  },
] as const;

export const getSecondaryWhatsAppGroup = (
  className?: string | null,
  serieName?: string | null,
) => {
  const normalizedClass = (className ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  const normalizedSerie = (serieName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace("SERIE", "")
    .trim();

  const isTerminale =
    normalizedClass.includes("TLE") || normalizedClass.includes("TERMINALE");

  if (!isTerminale) return null;

  // Extract letter from class/serie name (e.g. "Série A" -> "A")
  let letter = normalizedSerie;
  if (!letter && normalizedClass.includes("SERIE")) {
    letter = normalizedClass.split("SERIE")[1].trim().substring(0, 1);
  } else if (!letter) {
    letter = normalizedClass.substring(normalizedClass.length - 1).trim();
  } else {
    letter = letter.replace("SERIE", "").trim().substring(0, 1);
  }
  
  if (!letter) return null;

  return (
    SECONDARY_WHATSAPP_GROUPS.find((group) =>
      group.label.toUpperCase().endsWith(letter)
    ) ?? null
  );
};
