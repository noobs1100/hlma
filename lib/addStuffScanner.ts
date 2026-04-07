export type AddStuffKind = "r" | "b";

export type AddStuffScanResult = {
  kind: AddStuffKind;
  code: string;
  raw: string;
};

const ADD_STUFF_CODE_PATTERN = /^([rb]):([A-Za-z0-9+/]{6})$/i;

export function parseAddStuffCode(raw: string): AddStuffScanResult | null {
  const match = raw.trim().match(ADD_STUFF_CODE_PATTERN);

  if (!match) {
    return null;
  }

  return {
    kind: match[1].toLowerCase() as AddStuffKind,
    code: match[2],
    raw: raw.trim(),
  };
}
