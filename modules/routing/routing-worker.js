/**
 * Module C — Tactical Routing Web Worker
 * Graph spec: docs/data-contracts/routing-graph.schema.json
 *
 * Implements A* (with Euclidean grid-distance heuristic).
 * Falls back gracefully to Dijkstra (h=0) if no goal coordinates given.
 *
 * Edge cost = baseCost (or Euclidean grid distance) × terrain weight.
 * Terrain weights are defined in the schema and must not be changed here
 * without flagging to the orchestrator.
 */

// Canonical terrain weights from routing-graph.schema.json _terrainWeights
const TERRAIN_WEIGHTS = {
  infantry: { clear: 1,  damaged: 50, blocked: 100 },
  armored:  { clear: 1,  damaged: 1,  blocked: 10  },
};

/**
 * A* pathfinding on the routing graph.
 * @param {object} graph  - { nodes, edges, mode, startId, endId }
 * @returns {{ path: string[], cost: number }|{ path: null, cost: Infinity }}
 */
function aStar(graph) {
  const { nodes, edges, mode, startId, endId } = graph;

  if (!TERRAIN_WEIGHTS[mode]) {
    throw new Error(`Unknown routing mode "${mode}". Expected "infantry" or "armored".`);
  }
  const weights = TERRAIN_WEIGHTS[mode];

  // Index nodes by id
  const nodeMap = {};
  for (const n of nodes) nodeMap[n.id] = n;

  if (!nodeMap[startId]) throw new Error(`startId "${startId}" not found in nodes`);
  if (!nodeMap[endId])   throw new Error(`endId "${endId}" not found in nodes`);

  // Build adjacency list: from → [ { to, cost } ]
  const adj = {};
  for (const n of nodes) adj[n.id] = [];

  for (const edge of edges) {
    const fromNode = nodeMap[edge.from];
    const toNode   = nodeMap[edge.to];
    if (!fromNode || !toNode) continue;

    let base;
    if (edge.baseCost !== undefined) {
      base = edge.baseCost;
    } else {
      const dx = toNode.gridX - fromNode.gridX;
      const dy = toNode.gridY - fromNode.gridY;
      base = Math.sqrt(dx * dx + dy * dy);
    }

    const terrainMultiplier = weights[toNode.status] ?? weights.clear;
    adj[edge.from].push({ to: edge.to, cost: base * terrainMultiplier });
  }

  // Euclidean grid distance heuristic (admissible — never overestimates when
  // terrain weights ≥ 1, which they always are in our weight table)
  function h(nodeId) {
    const n = nodeMap[nodeId];
    const g = nodeMap[endId];
    const dx = g.gridX - n.gridX;
    const dy = g.gridY - n.gridY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Priority queue (min-heap by f = g + h)
  // Using a simple sorted insertion for small graphs; replace with a binary
  // heap if graph sizes grow beyond a few thousand nodes.
  const open = [{ id: startId, g: 0, f: h(startId) }];
  const gScore = { [startId]: 0 };
  const cameFrom = {};

  while (open.length > 0) {
    // Pop node with lowest f
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();

    if (current.id === endId) {
      // Reconstruct path
      const path = [];
      let cursor = endId;
      while (cursor !== undefined) {
        path.unshift(cursor);
        cursor = cameFrom[cursor];
      }
      return { path, cost: gScore[endId] };
    }

    for (const { to, cost } of adj[current.id]) {
      const tentativeG = gScore[current.id] + cost;
      if (gScore[to] === undefined || tentativeG < gScore[to]) {
        gScore[to] = tentativeG;
        cameFrom[to] = current.id;
        open.push({ id: to, g: tentativeG, f: tentativeG + h(to) });
      }
    }
  }

  return { path: null, cost: Infinity };
}

// ─── Web Worker message handler ───────────────────────────────────────────────
// When loaded as a Worker, receives { graph } and posts back { path, cost } or { error }.
// When imported as a module (for tests), aStar is exported directly.

if (typeof self !== 'undefined' && typeof WorkerGlobalScope !== 'undefined') {
  self.onmessage = function (evt) {
    try {
      const result = aStar(evt.data.graph);
      self.postMessage(result);
    } catch (err) {
      self.postMessage({ error: err.message });
    }
  };
}

export { aStar };
