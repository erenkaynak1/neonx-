// Draft XI v2 engine: formation templates for the prototype (design doc section 15).
// Zone = column letter A–E (left → right when attacking) + row 1–6 (own goal → opponent goal).
// Modifiers: 'f' = front of the zone (+4 m), 'b' = back (−4 m), 's' = screen in front of centre backs (+5 m).
// Each slot: [slotId, position label, mevki, zone with ball, zone without ball]

export const FORMATIONS = {
  '4-3-3': [
    ['GK', 'Kaleci', 'GK', 'C1', 'C1'],
    ['LB', 'Sol bek', 'LB', 'A4', 'A2'], ['LCB', 'Sol stoper', 'CB', 'B2', 'B2'], ['RCB', 'Sağ stoper', 'CB', 'D2', 'D2'], ['RB', 'Sağ bek', 'RB', 'E4', 'E2'],
    ['DM', 'Ön libero', 'DM', 'C3', 'C2s'], ['LCM', 'Sol iç orta saha', 'CM', 'B4', 'B3'], ['RCM', 'Sağ iç orta saha', 'CM', 'D4', 'D3'],
    ['LW', 'Sol kanat', 'LW', 'A5', 'A3'], ['ST', 'Santrfor', 'ST', 'C6', 'C4'], ['RW', 'Sağ kanat', 'RW', 'E5', 'E3'],
  ],
  '4-4-2': [
    ['GK', 'Kaleci', 'GK', 'C1', 'C1'],
    ['LB', 'Sol bek', 'LB', 'A4', 'A2'], ['LCB', 'Sol stoper', 'CB', 'B2', 'B2'], ['RCB', 'Sağ stoper', 'CB', 'D2', 'D2'], ['RB', 'Sağ bek', 'RB', 'E4', 'E2'],
    ['LM', 'Sol orta saha', 'LM', 'A5', 'A3'], ['LCM', 'Merkez orta saha (tutan)', 'CM', 'C3', 'B3'], ['RCM', 'Merkez orta saha (çıkan)', 'CM', 'C4', 'D3'], ['RM', 'Sağ orta saha', 'RM', 'E5', 'E3'],
    ['LS', 'Sol forvet', 'ST', 'B6', 'C4f'], ['RS', 'Sağ forvet', 'ST', 'D6', 'C4b'],
  ],
  '4-2-3-1': [
    ['GK', 'Kaleci', 'GK', 'C1', 'C1'],
    ['LB', 'Sol bek', 'LB', 'A4', 'A2'], ['LCB', 'Sol stoper', 'CB', 'B2', 'B2'], ['RCB', 'Sağ stoper', 'CB', 'D2', 'D2'], ['RB', 'Sağ bek', 'RB', 'E4', 'E2'],
    ['LDM', 'Sol ön libero', 'DM', 'B3', 'B3'], ['RDM', 'Sağ ön libero', 'DM', 'D3', 'D3'],
    ['LW', 'Sol kanat', 'LW', 'A5', 'A3'], ['AM', '10 numara', 'AM', 'C5', 'C4b'], ['RW', 'Sağ kanat', 'RW', 'E5', 'E3'], ['ST', 'Santrfor', 'ST', 'C6', 'C4f'],
  ],
  '3-5-2': [
    ['GK', 'Kaleci', 'GK', 'C1', 'C1'],
    ['LCB', 'Sol stoper', 'CB', 'B2', 'B2'], ['CB', 'Merkez stoper', 'CB', 'C2', 'C2'], ['RCB', 'Sağ stoper', 'CB', 'D2', 'D2'],
    ['LWB', 'Sol kanat bek', 'LWB', 'A5', 'A2'], ['RWB', 'Sağ kanat bek', 'RWB', 'E5', 'E2'],
    ['DM', 'Ön libero', 'DM', 'C3', 'C3'], ['LCM', 'Sol iç orta saha', 'CM', 'B4', 'B3'], ['RCM', 'Sağ iç orta saha', 'CM', 'D4', 'D3'],
    ['LS', 'Sol forvet', 'ST', 'B6', 'B4'], ['RS', 'Sağ forvet', 'ST', 'D6', 'D4'],
  ],
};

export const PITCH_W = 680; // decimetres (68 m)
export const PITCH_L = 1050; // decimetres (105 m)
export const COL_W = 136; // 13.6 m
export const ROW_L = 175; // 17.5 m

/** Zone string → team-relative point in decimetres {x, y}. */
export function zonePoint(zone) {
  const col = zone.charCodeAt(0) - 65; // A=0
  const row = Number(zone[1]);
  const mod = zone[2] || '';
  let x = col * COL_W + (COL_W >> 1);
  let y = (row - 1) * ROW_L + (ROW_L >> 1);
  if (zone === 'C1') y = 80; // keeper ~8 m off the line
  if (mod === 'f') y += 40; else if (mod === 'b') y -= 40; else if (mod === 's') y += 50;
  return { x, y };
}
