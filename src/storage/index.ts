import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings, WorkSession } from '../types';

const KEYS = {
  SETTINGS: 'tt_settings',
  SESSIONS: 'tt_sessions',
  ACTIVE_SESSION: 'tt_active_session',
};

const DEFAULT_SETTINGS: UserSettings = {
  employmentType: 'employment',
  hourlyRate: 50,
  currency: 'PLN',
  language: 'en',
  b2bZusType: 'full',
  b2bLumpRate: 0.12,
  taxReliefEnabled: true,
};

export async function getSettings(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getSessions(): Promise<WorkSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SESSIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveSession(session: WorkSession): Promise<void> {
  const sessions = await getSessions();
  sessions.unshift(session);
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  const updated = sessions.filter((s) => s.id !== id);
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(updated));
}

export async function getActiveSession(): Promise<{ startTime: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setActiveSession(startTime: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify({ startTime }));
}

export async function clearActiveSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ACTIVE_SESSION);
}
