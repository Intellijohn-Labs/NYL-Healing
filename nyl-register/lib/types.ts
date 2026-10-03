export type Slot = {
  id: string;
  slot_date: string; // YYYY-MM-DD
  starts_at: string | null; // HH:MM:SS
  remaining: number;
};
