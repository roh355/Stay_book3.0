export type Role = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface Amenities {
  naturalLight: boolean;
  videoConf: boolean;
  whiteboard: boolean;
}

export interface Room {
  id: string;
  code: string;
  floor: number;
  capacity: number;
  amenities: Amenities;
}

export interface Floor {
  number: number;
  label: string;
  rooms: Room[];
}

export interface Booking {
  id: string;
  roomId: string;
  roomCode: string;
  date: string; // yyyy-mm-dd
  startSlot: number; // inclusive
  endSlot: number; // exclusive
  topic?: string;
  userId: string;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Stay {
  id: string;
  roomId: string;
  roomCode: string;
  checkIn: string; // yyyy-mm-dd inclusive
  checkOut: string; // yyyy-mm-dd exclusive
  guest?: string;
  userId: string;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Full day: 00:00 -> 24:00 in 30-minute slots => 48 slots.
export const WORKING_DAY = {
  startMinutes: 0,
  endMinutes: 24 * 60,
  slotMinutes: 30,
};
export const SLOT_COUNT =
  (WORKING_DAY.endMinutes - WORKING_DAY.startMinutes) / WORKING_DAY.slotMinutes;

export const HOSTEL_HORIZON_DAYS = 60;
