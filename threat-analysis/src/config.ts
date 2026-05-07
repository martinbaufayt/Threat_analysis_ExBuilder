import { ImmutableObject } from 'seamless-immutable';

export type Unit = 'feet' | 'meters';

export interface ThreatType {
  label: string;
  mandatoryFt: number;
  preferredFt: number;
}

export const THREAT_TYPES: ThreatType[] = [
  { label: 'Pipe Bomb',                      mandatoryFt: 70,   preferredFt: 1200 },
  { label: 'Suicide Bomb',                   mandatoryFt: 110,  preferredFt: 1700 },
  { label: 'Briefcase Bomb',                 mandatoryFt: 150,  preferredFt: 1850 },
  { label: 'Car Bomb',                       mandatoryFt: 320,  preferredFt: 1900 },
  { label: 'SUV / Van Bomb',                 mandatoryFt: 400,  preferredFt: 2400 },
  { label: 'Small Delivery Truck Bomb',      mandatoryFt: 640,  preferredFt: 3800 },
  { label: 'Container / Water Truck Bomb',   mandatoryFt: 860,  preferredFt: 5100 },
  { label: 'Semi-Trailer Bomb',              mandatoryFt: 1570, preferredFt: 9300 },
];

export const FT_TO_M = 0.3048;

export function toMeters(feet: number): number {
  return feet * FT_TO_M;
}

export interface Config {
  defaultUnit: Unit;
  defaultThreatIndex: number;
}

export type IMConfig = ImmutableObject<Config>;
