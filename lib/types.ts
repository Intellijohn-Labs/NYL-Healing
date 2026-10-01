export type Slot = {
  id: string;
  slot_date: string; // YYYY-MM-DD
  starts_at: string | null; // HH:MM:SS
  remaining: number;
};

// Everything shown on one patient pass
export type PassData = {
  patientCode: string;
  passToken: string;
  fullName: string;
  age: number | null;
  gender: string; // male | female | other
  city: string;
  registeringFor: string | null; // self | child | parent | spouse | other
  guardianName: string | null;
  guardianRelation: string | null; // father | mother | "other: ..."
  slotDate: string | null;
  startsAt: string | null;
  issuedAt: string | null;
  qr: string; // data: URI of the QR code SVG
  url: string; // permanent link to this pass
};
