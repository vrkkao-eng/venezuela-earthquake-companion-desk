/**
 * Unit tests for A* routing (acceptance criteria: P0-1 from CLAUDE_CODE_BRIEF.md)
 *
 * Each test uses a hand-constructed graph with a known correct answer.
 * Tests must pass for BOTH infantry and armored modes, and the two modes
 * must produce DIFFERENT paths on graphs where terrain makes them diverge.
 *
 * field-critical: must pass field-critical-verifier before marking done.
 */
import { aStar } from './routing-worker.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertPath(result, expectedIds, label) {
  assert(result.path !== null, `${label}: path found`);
  if (result.path === null) return;
  assert(
    JSON.stringify(result.path) === JSON.stringify(expectedIds),
    `${label}: path = [${result.path}], expected [${expectedIds}]`
  );
}

// ─── Graph 1: Linear 3-node graph, all clear ─────────────────────────────────
// A(0,0) → B(1,0) → C(2,0)
// Correct shortest path: A→B→C for both modes
{
  console.log('\nTest 1: Linear graph (all clear)');
  const graph = {
    nodes: [
      { id: 'A', gridX: 0, gridY: 0, status: 'clear' },
      { id: 'B', gridX: 1, gridY: 0, status: 'clear' },
      { id: 'C', gridX: 2, gridY: 0, status: 'clear' },
    ],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ],
    startId: 'A', endId: 'C',
  };

  for (const mode of ['infantry', 'armored']) {
    assertPath(aStar({ ...graph, mode }), ['A', 'B', 'C'], `linear/${mode}`);
  }
}

// ─── Graph 2: Detour vs shortcut with damaged terrain ─────────────────────────
//
//  Start(0,0) ──── Mid(1,0)[damaged] ──── End(2,0)
//       \                                    /
//        ───── Bypass(1,2) ──────────────────
//
// Infantry: damaged weight = 50, so going via Bypass costs less than Mid
//   direct:  dist(S→Mid)≈1 × 50 + dist(Mid→End)≈1 × 1 = 51   (Mid is damaged, End is clear)
//   bypass:  dist(S→Bypass)≈2.24 × 1 + dist(Bypass→End)≈2.24 × 1 = 4.47
//   → infantry takes bypass
//
// Armored: damaged weight = 1
//   direct:  1×1 + 1×1 = 2
//   bypass:  2.24 + 2.24 = 4.47
//   → armored takes direct (through Mid)
{
  console.log('\nTest 2: Damaged shortcut vs bypass — infantry should detour, armored should not');
  const graph = {
    nodes: [
      { id: 'S',      gridX: 0, gridY: 0, status: 'clear'   },
      { id: 'Mid',    gridX: 1, gridY: 0, status: 'damaged'  },
      { id: 'End',    gridX: 2, gridY: 0, status: 'clear'    },
      { id: 'Bypass', gridX: 1, gridY: 2, status: 'clear'    },
    ],
    edges: [
      { from: 'S',      to: 'Mid'    },
      { from: 'Mid',    to: 'End'    },
      { from: 'S',      to: 'Bypass' },
      { from: 'Bypass', to: 'End'    },
    ],
    startId: 'S', endId: 'End',
  };

  const infantry = aStar({ ...graph, mode: 'infantry' });
  const armored  = aStar({ ...graph, mode: 'armored'  });

  assert(infantry.path !== null, 'infantry: path found');
  assert(armored.path  !== null, 'armored: path found');

  // Infantry must avoid Mid (damaged×50 too expensive)
  assert(
    infantry.path !== null && !infantry.path.includes('Mid'),
    `infantry path avoids damaged Mid node (path: [${infantry.path}])`
  );
  // Armored must go through Mid (damaged×1 = clear, shortcut wins)
  assert(
    armored.path !== null && armored.path.includes('Mid'),
    `armored path cuts through damaged Mid node (path: [${armored.path}])`
  );
  // The two paths must be different
  assert(
    JSON.stringify(infantry.path) !== JSON.stringify(armored.path),
    'infantry and armored take different paths'
  );
}

// ─── Graph 3: Blocked node — infantry must avoid, armored may still go through ─
//
//  Start ── Block(blocked) ── End
//       ──── Safe(clear)   ────
//
// infantry: blocked×100, Safe path = ~2.24 total. Block path = 1×100 + 1×1 = 101
//   → infantry uses Safe
// armored: blocked×10. Block path = 1×10 + 1 = 11. Safe = ~4.47
//   → armored still prefers Safe (11 > 4.47 — both go safe)
//   Let's use a longer safe detour so armored chooses blocked
//
// Revised: safe bypass gridY=10 so bypass costs ~10.05×1 per leg ≈ 20.1
// blocked: 1×10 + 1×1 = 11 for armored → armored uses Block
// for infantry: 1×100 + 1 = 101 vs 20.1 → infantry uses Bypass
{
  console.log('\nTest 3: Blocked node — infantry bypasses, armored cuts through');
  const graph = {
    nodes: [
      { id: 'S',      gridX: 0, gridY:  0, status: 'clear'   },
      { id: 'Block',  gridX: 1, gridY:  0, status: 'blocked'  },
      { id: 'End',    gridX: 2, gridY:  0, status: 'clear'    },
      { id: 'Bypass', gridX: 1, gridY: 10, status: 'clear'    },
    ],
    edges: [
      { from: 'S',      to: 'Block'  },
      { from: 'Block',  to: 'End'    },
      { from: 'S',      to: 'Bypass' },
      { from: 'Bypass', to: 'End'    },
    ],
    startId: 'S', endId: 'End',
  };

  const infantry = aStar({ ...graph, mode: 'infantry' });
  const armored  = aStar({ ...graph, mode: 'armored'  });

  assert(infantry.path !== null && !infantry.path.includes('Block'),
    `infantry avoids blocked node (path: [${infantry.path}])`);
  assert(armored.path !== null && armored.path.includes('Block'),
    `armored cuts through blocked node (path: [${armored.path}])`);
  assert(
    JSON.stringify(infantry.path) !== JSON.stringify(armored.path),
    'different paths for different modes'
  );
}

// ─── Graph 4: No path exists ──────────────────────────────────────────────────
{
  console.log('\nTest 4: Disconnected graph returns null path');
  const graph = {
    nodes: [
      { id: 'A', gridX: 0, gridY: 0, status: 'clear' },
      { id: 'B', gridX: 5, gridY: 5, status: 'clear' },
    ],
    edges: [],
    startId: 'A', endId: 'B',
    mode: 'infantry',
  };
  const result = aStar(graph);
  assert(result.path === null, 'disconnected graph returns null path');
  assert(result.cost === Infinity, 'disconnected graph returns Infinity cost');
}

// ─── Graph 5: Start = End ─────────────────────────────────────────────────────
{
  console.log('\nTest 5: Start equals end');
  const graph = {
    nodes: [{ id: 'A', gridX: 0, gridY: 0, status: 'clear' }],
    edges: [],
    startId: 'A', endId: 'A',
    mode: 'infantry',
  };
  const result = aStar(graph);
  assertPath(result, ['A'], 'start=end returns single-node path');
  assert(result.cost === 0, 'cost is 0 when start=end');
}

// ─── Graph 6: baseCost override used when provided ────────────────────────────
{
  console.log('\nTest 6: baseCost override');
  const graph = {
    nodes: [
      { id: 'X', gridX: 0, gridY: 0, status: 'clear' },
      { id: 'Y', gridX: 0, gridY: 0, status: 'clear' }, // same grid pos, would be dist 0
      { id: 'Z', gridX: 0, gridY: 0, status: 'clear' },
    ],
    edges: [
      { from: 'X', to: 'Y', baseCost: 10 },
      { from: 'Y', to: 'Z', baseCost: 1  },
      { from: 'X', to: 'Z', baseCost: 5  },
    ],
    startId: 'X', endId: 'Z',
    mode: 'infantry',
  };
  const result = aStar(graph);
  assertPath(result, ['X', 'Z'], 'direct edge with lower baseCost wins');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
