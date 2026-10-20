// Registry of enemy movement behaviors, referenced by `behavior` in data/enemies.js.
// A behavior is { init?(enemy, game), update(enemy, game, dt),
//                 post?(enemy, game)        (after the spatial hash is built),
//                 drawUnder?(enemy, game, ctx) }.

import chase from './chase.js';
import dart from './dart.js';
import summoner from './summoner.js';
import dropper from './dropper.js';
import teleport from './teleport.js';
import aura from './aura.js';
import line from './line.js';
import incidentBoss from './incidentBoss.js';
import executiveBoss from './executiveBoss.js';

export const BEHAVIORS = { chase, dart, summoner, dropper, teleport, aura, line, incidentBoss, executiveBoss };
