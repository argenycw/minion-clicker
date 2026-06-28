import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore } from '../../../firebase';

export type AdventureRoomRecord = {
  code: string;
  hostPeerId: string;
  mapSeed: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const ROOM_COLLECTION = 'adventureRooms';
const ROOM_CODE_LENGTH = 6;

export function createRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function publishAdventureRoom(record: Pick<AdventureRoomRecord, 'code' | 'hostPeerId' | 'mapSeed'>) {
  await setDoc(doc(firestore, ROOM_COLLECTION, record.code), {
    ...record,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function findAdventureRoom(code: string): Promise<AdventureRoomRecord | undefined> {
  const normalized = normalizeRoomCode(code);
  if (!normalized) return undefined;
  const snapshot = await getDoc(doc(firestore, ROOM_COLLECTION, normalized));
  return snapshot.exists() ? snapshot.data() as AdventureRoomRecord : undefined;
}

export async function clearAdventureRoom(code: string) {
  const normalized = normalizeRoomCode(code);
  if (!normalized) return;
  await deleteDoc(doc(firestore, ROOM_COLLECTION, normalized));
}

export function normalizeRoomCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, ROOM_CODE_LENGTH);
  return digits.length === ROOM_CODE_LENGTH ? digits : undefined;
}
