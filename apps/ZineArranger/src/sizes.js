// Zine sizes (half … 64th), their spec-string prefixes, and the automatic signature-size cap.

export const SIZE_HALF = 0;
export const SIZE_QUARTER = 1;
export const SIZE_EIGHTH = 2;
export const SIZE_12TH = 3;
export const SIZE_16TH = 4;
export const SIZE_24TH = 5;
export const SIZE_32ND = 6;
export const SIZE_36TH = 7;
export const SIZE_48TH = 8;
export const SIZE_64TH = 9;

export const SIZE_CHARS = ["2-","4-","8-","12-","16-","24-","32-","36-","48-","64-"]




// If the user hasn't manually set a custom signature size (sigSize <= 0), don't let
// an auto-computed signature grow past what a typical stapler/binder can realistically
// punch through in one go. Checking "Custom Signature Size" and entering a value always
// overrides this — this cap only applies to the automatic default.
export var MAX_AUTO_SIGNATURE_SHEETS = 25;
