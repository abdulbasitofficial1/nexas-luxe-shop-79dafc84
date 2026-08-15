export function cleanProductDescription(
  input: string | null | undefined,
): string {
  if (!input) return "";

  let text = String(input);

  // =====================================================
  // BASIC CLEANUP
  // =====================================================

  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/�/g, "")
    .replace(/\uFFFD/g, "")
    .replace(/\?\?/g, "")
    .replace(/[ \t]+/g, " ");

  // =====================================================
  // REMOVE MARKAZ FOOTER / PROMOTIONAL TEXT
  // =====================================================

  text = text
    .replace(
      /Delivered\s+across\s+Pakistan\s+with\s+cash\s+on\s+delivery\.?/gi,
      "",
    )
    .replace(
      /View\s+this\s+product\s+on\s+Markaz\.?/gi,
      "",
    )
    .replace(
      /Delivered\s+across\s+Pakistan.*$/gim,
      "",
    )
    .replace(
      /View\s+this\s+product\s+on\s+Markaz.*$/gim,
      "",
    );

  // =====================================================
  // NORMALIZE BULLETS
  // =====================================================

  text = text
    .replace(/[•●▪◦∙]/g, "\n")
    .replace(/\s*-\s+/g, "\n");

  // =====================================================
  // CLEAN FIELD NAMES
  // =====================================================

  const replacements: Array<
    [RegExp, string]
  > = [
    [/Gender\s*Type\s*:/gi, "Gender:"],
    [/Product\s*Design\s*:/gi, "Design:"],
    [/Product\s*Feature\s*:/gi, "Feature:"],
    [/Number\s*Of\s*Pieces\s*:/gi, "Pieces:"],
    [/Product\s*Color\s*:/gi, "Color:"],
    [/Product\s*Colour\s*:/gi, "Color:"],
    [/Jewellery\s*Care\s*Instructions\s*:/gi, "Jewelry Care:"],
    [/Jewelry\s*Care\s*Instructions\s*:/gi, "Jewelry Care:"],
    [/Package\s*Include\s*:/gi, "Package Includes:"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  // =====================================================
  // PUT COMMON FIELDS ON NEW LINES
  // =====================================================

  const fields = [
    "Material",
    "Plating",
    "Gender",
    "Design",
    "Feature",
    "Pieces",
    "Size",
    "Color",
    "Colour",
    "Package Includes",
    "Jewelry Care",
    "Jewellery Care",
    "Product Code",
    "Brand",
    "Model",
    "Weight",
    "Dimensions",
    "Capacity",
    "Compatibility",
    "Battery",
    "Power",
    "Warranty",
  ];

  for (const field of fields) {
    const escaped = field.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    text = text.replace(
      new RegExp(
        `\\s*(${escaped}\\s*:)`,
        "gi",
      ),
      `\n$1`,
    );
  }

  // =====================================================
  // CARE INSTRUCTIONS
  // =====================================================

  text = text.replace(
    /\s+(Avoid contact|Remove before|Store in|Keep away|Handle gently|With proper care|Note:)/gi,
    "\n$1",
  );

  // =====================================================
  // REMOVE PRODUCT CODE
  // =====================================================

  text = text.replace(
    /^\s*Product Code\s*:\s*[A-Za-z0-9_-]+\s*$/gim,
    "",
  );

  // =====================================================
  // CLEAN DUPLICATE PUNCTUATION / SPACES
  // =====================================================

  text = text
    .replace(/[?]{2,}/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  // =====================================================
  // FORMAT LINES
  // =====================================================

  const lines = text
    .split("\n")
    .map((line) =>
      line
        .replace(/^[-•●▪◦:]+/, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  // =====================================================
  // BUILD CLEAN DESCRIPTION
  // =====================================================

  const output: string[] = [];

  let insideCareSection = false;

  for (const line of lines) {
    if (
      /^Jewelry Care\s*:/i.test(line)
    ) {
      output.push("Jewelry Care:");
      insideCareSection = true;
      continue;
    }

    if (
      /^Package Includes\s*:/i.test(line)
    ) {
      output.push(line);
      insideCareSection = false;
      continue;
    }

    if (
      /^Note\s*:/i.test(line)
    ) {
      output.push(line);
      insideCareSection = false;
      continue;
    }

    if (insideCareSection) {
      if (
        line.startsWith("Avoid contact") ||
        line.startsWith("Remove before") ||
        line.startsWith("Store in") ||
        line.startsWith("Keep away") ||
        line.startsWith("Handle gently") ||
        line.startsWith("With proper care")
      ) {
        output.push(`• ${line}`);
      } else {
        output.push(line);
      }

      continue;
    }

    output.push(line);
  }

  // =====================================================
  // FINAL CLEANUP
  // =====================================================

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
