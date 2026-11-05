import { MECH } from './rows/mech.js';
import { FIELDS } from './rows/fields.js';
import { MODERN } from './rows/modern.js';
import { CS } from './rows/cs.js';
import { SYS } from './rows/sys.js';
import { ENG } from './rows/eng.js';
import { ENGB } from './rows/engb.js';
import { ENGC } from './rows/engc.js';
import { ENGD, IDS } from './rows/engd.js';
import { FIX } from './rows/fix.js';

export const ROWS = [
  ...MECH,
  ...FIELDS,
  ...MODERN,
  ...CS,
  ...SYS,
  ...ENG,
  ...ENGB,
  ...ENGC,
  ...ENGD,
  ...IDS,
  ...FIX,
];
