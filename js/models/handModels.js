/**
 * Hand-written models beyond the cold-boot default (free-fall).
 * Loaded on demand so lab.js stays small until a subject opens.
 */
import projectile from './projectile.js';
import spring from './spring.js';
import pendulum from './pendulum.js';
import collision from './collision.js';
import doublePendulum from './doublePendulum.js';
import wave from './wave.js';
import heat from './heat.js';
import orbit from './orbit.js';
import lorentz from './lorentz.js';
import sorting from './sorting.js';
import bfsGrid from './bfsGrid.js';
import life from './life.js';
import cacheLru from './cacheLru.js';
import pipeline from './pipeline.js';
import fifo from './fifo.js';
import rcCircuit from './rcCircuit.js';
import rlc from './rlc.js';
import inclinedPlane from './inclinedPlane.js';
import collision2d from './collision2d.js';
import dijkstra from './dijkstra.js';
import logicGates from './logicGates.js';
import beamSfdBmd from './beamSfdBmd.js';
import pidTune from './pidTune.js';
import hodgkinHuxley from './hodgkinHuxley.js';
import compoundMicroscope from './compoundMicroscope.js';

export const HANDS = [
  projectile, spring, pendulum, collision, doublePendulum, wave, heat,
  orbit, lorentz, sorting, bfsGrid, life, cacheLru, pipeline, fifo, rcCircuit, rlc,
  inclinedPlane, collision2d, dijkstra, logicGates, beamSfdBmd, pidTune,
  hodgkinHuxley, compoundMicroscope,
];
