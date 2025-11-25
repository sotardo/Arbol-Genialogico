// src/utils/familyLayout.js - VERSIÓN CORREGIDA CON DESCENDENCIA HASTA 11 GENERACIONES
const CONFIG = {
  horizontal: {
    CARD_WIDTH: 160,
    CARD_HEIGHT: 80,
    ANCESTOR_WIDTH: 240,
    ANCESTOR_HEIGHT: 64,
    HORIZONTAL_SPACING: 140,
    VERTICAL_SPACING: 30,
    COUPLE_VERTICAL_SPACING: 15,
  },
  vertical: {
    CARD_WIDTH: 120,
    CARD_HEIGHT: 140,
    HORIZONTAL_SPACING: 30,
    VERTICAL_SPACING: 80,
    COUPLE_VERTICAL_SPACING: 15,
  },
};

// --- Helpers ---
function generationIndexFromTipo(tipo) {
  if (!tipo || typeof tipo !== 'string') return 0;
  if (tipo === 'family-group-root') return 0;
  
  // Ancestros (positivos)
  if (tipo === 'family-group-ancestor') return 1;
  if (tipo === 'family-group-grandancestor') return 2;
  if (tipo.startsWith('family-group-great') && !tipo.includes('grandchild')) {
    const count = (tipo.match(/great/g) || []).length;
    return 2 + count;
  }
  
  // Descendientes (negativos)
  if (tipo === 'family-group-child') return -1;
  if (tipo === 'family-group-grandchild') return -2;
  if (tipo.startsWith('family-group-great') && tipo.includes('grandchild')) {
    const count = (tipo.match(/great/g) || []).length;
    return -(2 + count);
  }
  
  return 0;
}

function applyAncestorStaircase(nodes, { stairStep = 28, minGenToShift = 2 } = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes;
  const byGen = new Map();
  for (const n of nodes) {
    const g = generationIndexFromTipo(n.tipo);
    if (g >= 0) {
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g).push(n);
    }
  }
  const gens = [...byGen.keys()].sort((a, b) => a - b);
  if (gens.length === 0) return nodes;
  let accumulated = 0;
  for (const g of gens) {
    if (g >= minGenToShift) {
      accumulated += stairStep;
      const col = byGen.get(g);
      for (const n of col) n.y += accumulated;
    }
  }
  return nodes;
}

const pairKey = (aId, bId) => {
  if (!aId && !bId) return null;
  if (aId && bId) {
    const [x, y] = [String(aId), String(bId)].sort();
    return `pair:${x}:${y}`;
  }
  return `single:${String(aId || bId)}`;
};

const asId = (x) => String(x || '');

function parsePairKey(key) {
  if (!key) return { type: 'none' };
  if (key.startsWith('pair:')) {
    const [, a, b] = key.split(':');
    return { type: 'pair', aId: a, bId: b };
  }
  if (key.startsWith('single:')) {
    const [, id] = key.split(':');
    return { type: 'single', id };
  }
  return { type: 'single', id: key };
}

export class FamilyLayout {
  constructor(personas, rootPersonId, viewMode = 'horizontal', spacingMultiplier = 1, options = {}) {
    this.personas = new Map(personas.map((p) => [p._id, p]));
    this.rootPerson = this.personas.get(rootPersonId);
    this.viewMode = viewMode;
    this.spacingMultiplier = spacingMultiplier;

    this.config = { ...(CONFIG[viewMode] || CONFIG.horizontal) };
    this.config.HORIZONTAL_SPACING *= spacingMultiplier;
    this.config.VERTICAL_SPACING *= spacingMultiplier;
    this.config.COUPLE_VERTICAL_SPACING *= spacingMultiplier;

    const grid = (options && options.grid) || {};
    this.columnGap = Number.isFinite(grid.columnGap) ? grid.columnGap : this.config.HORIZONTAL_SPACING;
    this.rowStep = Number.isFinite(grid.rowStep) ? grid.rowStep : 250;
    this.columnShift = grid.columnShift || {};

    this.nodes = [];
    this.connections = [];

    this.expandedUpKeys = options.expandedUpKeys instanceof Set ? options.expandedUpKeys : new Set(options.expandedUpKeys || []);
    this.expandedDownKeys = options.expandedDownKeys instanceof Set ? options.expandedDownKeys : new Set(options.expandedDownKeys || []);

    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
  }

  trackCoordinate(x, y) {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y);
  }

  getCenterY(node) {
    return node.y + (node.height || 180) / 2;
  }

  resolveColumnOverlaps(nodesInCol, rowStep = this.rowStep, cardH = 180) {
    if (!Array.isArray(nodesInCol) || nodesInCol.length <= 1) return;
    nodesInCol.sort((a, b) => a.y - b.y);
    for (let i = 1; i < nodesInCol.length; i++) {
      const prev = nodesInCol[i - 1];
      const curr = nodesInCol[i];
      const minTop = prev.y + rowStep;
      if (curr.y < minTop) curr.y = minTop;
    }
    for (const n of nodesInCol) {
      this.trackCoordinate(n.x, n.y);
      this.trackCoordinate(n.x + n.width, n.y + n.height);
    }
  }

  reCenterGenerationalColumns(lowerCol, upperCol) {
    if (!lowerCol?.length || !upperCol?.length) return;

    const byKey = new Map();
    for (const n of this.nodes) {
      const gk = n?.data?.groupKey;
      if (gk) byKey.set(gk, n);
    }

    const movedNodes = [];

    for (const lowerGroup of lowerCol) {
      const lowerNode = byKey.get(lowerGroup.groupKey);
      if (!lowerNode) continue;

      const upperNodes = upperCol
        .filter(upperGroup => this.esHijoDirecto(upperGroup, lowerGroup))
        .map(upperGroup => byKey.get(upperGroup.groupKey))
        .filter(Boolean);

      if (upperNodes.length === 0) continue;

      const minCY = Math.min(...upperNodes.map(n => this.getCenterY(n)));
      const maxCY = Math.max(...upperNodes.map(n => this.getCenterY(n)));
      const targetCenterY = (minCY + maxCY) / 2;

      const cardH = lowerNode.height || 180;
      lowerNode.y = targetCenterY - cardH / 2;

      this.trackCoordinate(lowerNode.x, lowerNode.y);
      this.trackCoordinate(lowerNode.x + lowerNode.width, lowerNode.y + lowerNode.height);

      movedNodes.push(lowerNode);
    }

    this.resolveColumnOverlaps(movedNodes, this.rowStep, 180);
  }

  pairKey(aId, bId) {
    if (!aId && !bId) return null;
    if (aId && bId) {
      const [x, y] = [String(aId), String(bId)].sort();
      return `pair:${x}:${y}`;
    }
    return `single:${String(aId || bId)}`;
  }

  buildAncestorGroupsFromPeople(people = []) {
    const map = new Map();
    people.forEach((p) => {
      if (!p) return;
      const spouses = (p?.conyuges || []).map((id) => this.personas.get(id)).filter(Boolean);
      if (spouses.length === 0) {
        const hijos = (p?.hijos || []).map((id) => this.personas.get(id)).filter(Boolean);
        const gKey = pairKey(p._id, null);
        if (!map.has(gKey)) {
          map.set(gKey, { id: `anc-group-${gKey}`, persona: p, conyuge: null, hijos, esDescendencia: false, groupKey: gKey });
        }
        return;
      }
      spouses.forEach((s) => {
        const hijosIds = new Set([...(p?.hijos || []), ...(s?.hijos || [])]);
        const hijos = Array.from(hijosIds).map((id) => this.personas.get(id)).filter(Boolean);
        const gKey = pairKey(p._id, s?._id);
        if (!map.has(gKey)) {
          map.set(gKey, { id: `anc-group-${gKey}`, persona: p, conyuge: s, hijos, esDescendencia: false, groupKey: gKey });
        }
      });
    });
    return Array.from(map.values());
  }

  // ✅ NUEVO: Generar grupos de descendientes SIN cards vacías
  buildDescendantGroupsFromPeople(people = []) {
    const map = new Map();
    people.forEach((p) => {
      if (!p) return;
      const spouses = (p?.conyuges || []).map((id) => this.personas.get(id)).filter(Boolean);
      
      if (spouses.length === 0) {
        const hijos = (p?.hijos || []).map((id) => this.personas.get(id)).filter(Boolean);
        const gKey = pairKey(p._id, null);
        if (!map.has(gKey)) {
          map.set(gKey, { 
            id: `desc-group-${gKey}`, 
            persona: p, 
            conyuge: null, 
            hijos, 
            esDescendencia: true, 
            groupKey: gKey 
          });
        }
        return;
      }
      
      spouses.forEach((s) => {
        const hijosIds = new Set([...(p?.hijos || []), ...(s?.hijos || [])]);
        const hijos = Array.from(hijosIds).map((id) => this.personas.get(id)).filter(Boolean);
        const gKey = pairKey(p._id, s?._id);
        if (!map.has(gKey)) {
          map.set(gKey, { 
            id: `desc-group-${gKey}`, 
            persona: p, 
            conyuge: s, 
            hijos, 
            esDescendencia: true, 
            groupKey: gKey 
          });
        }
      });
    });
    return Array.from(map.values());
  }

posicionarColumnaEnT(groups, x, anchorY, tipo) {
  if (!groups || groups.length === 0) return;

  const shift = this.columnShift[tipo] || 0;
  const CARD_W = 240;
  const CARD_H = 180;

  // ✅ Separar grupos vacíos y normales (SOLO para ancestros)
  const emptyGroups = groups.filter(g => g.isEmpty);
  const normalGroups = groups.filter(g => !g.isEmpty);

  // ✅ CASO 1: SOLO HAY GRUPOS VACÍOS → centrarlos como una columna normal
  if (normalGroups.length === 0) {
    const n = groups.length;

    if (n === 1) {
      const g = groups[0];
      const nodeX = x + shift;
      const nodeY = anchorY - CARD_H / 2;

      this.nodes.push({
        id: g.id,
        x: nodeX,
        y: nodeY,
        width: CARD_W,
        height: CARD_H,
        data: g,
        tipo,
      });

      this.trackCoordinate(nodeX, nodeY);
      this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
      return;
    }

    const totalHeight = (n - 1) * this.rowStep;
    const startY = anchorY - totalHeight / 2 - CARD_H / 2;

    groups.forEach((g, i) => {
      const nodeX = x + shift;
      const nodeY = startY + i * this.rowStep;

      this.nodes.push({
        id: g.id,
        x: nodeX,
        y: nodeY,
        width: CARD_W,
        height: CARD_H,
        data: g,
        tipo,
      });

      this.trackCoordinate(nodeX, nodeY);
      this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
    });

    return;
  }

  // ✅ CASO 2: HAY GRUPOS NORMALES → se posicionan centrados (T),
  // y los vacíos van ARRIBA de toda la columna
  // --- Posicionar grupos normales ---
  if (normalGroups.length === 1) {
    const g = normalGroups[0];
    const nodeX = x + shift;
    const nodeY = anchorY - CARD_H / 2;

    this.nodes.push({
      id: g.id,
      x: nodeX,
      y: nodeY,
      width: CARD_W,
      height: CARD_H,
      data: g,
      tipo,
    });

    this.trackCoordinate(nodeX, nodeY);
    this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
  } else if (normalGroups.length > 1) {
    const n = normalGroups.length;
    const totalHeight = (n - 1) * this.rowStep;
    const startY = anchorY - totalHeight / 2 - CARD_H / 2;

    normalGroups.forEach((g, i) => {
      const nodeX = x + shift;
      const nodeY = startY + i * this.rowStep;

      this.nodes.push({
        id: g.id,
        x: nodeX,
        y: nodeY,
        width: CARD_W,
        height: CARD_H,
        data: g,
        tipo,
      });

      this.trackCoordinate(nodeX, nodeY);
      this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
    });
  }

  // --- Posicionar grupos vacíos ARRIBA de los normales ---
  if (emptyGroups.length > 0) {
    let topY = anchorY - CARD_H / 2;

    const normalNodes = normalGroups
      .map(g => this.nodes.find(n => n.id === g.id))
      .filter(Boolean);

    if (normalNodes.length > 0) {
      topY = Math.min(...normalNodes.map(n => n.y));
    }

    emptyGroups.forEach((g, i) => {
      const nodeX = x + shift;
      const nodeY = topY - (i + 1) * (CARD_H + 50);

      this.nodes.push({
        id: g.id,
        x: nodeX,
        y: nodeY,
        width: CARD_W,
        height: CARD_H,
        data: g,
        tipo,
      });

      this.trackCoordinate(nodeX, nodeY);
      this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
    });
  }
}

  posicionarColumnaFamilyGroups(groups, x, centerY, tipo, anchorY = null) {
    if (!groups || groups.length === 0) return;
    const CARD_W = 240;
    const CARD_H = 180;
    const shift = this.columnShift[tipo] || 0;
    const colCenterY = typeof anchorY === 'number' ? anchorY : centerY;

    const n = groups.length;
    if (n === 1) {
      const g = groups[0];
      const nodeX = x + shift;
      const nodeY = colCenterY - CARD_H / 2;
      this.nodes.push({ id: g.id, x: nodeX, y: nodeY, width: CARD_W, height: CARD_H, data: g, tipo });
      this.trackCoordinate(nodeX, nodeY);
      this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
      return;
    }

    const startY = colCenterY - ((n - 1) / 2) * this.rowStep - (CARD_H / 2);

    groups.forEach((g, i) => {
      const nodeX = x + shift;
      const nodeY = startY + i * this.rowStep;
      this.nodes.push({ id: g.id, x: nodeX, y: nodeY, width: CARD_W, height: CARD_H, data: g, tipo });
      this.trackCoordinate(nodeX, nodeY);
      this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
    });
  }

  groupFromKey(key) {
    const parsed = parsePairKey(key);
    if (parsed.type === 'none') return null;
    let persona = null, conyuge = null;
    if (parsed.type === 'single') {
      persona = this.personas.get(asId(parsed.id)) || null;
    } else {
      persona = this.personas.get(asId(parsed.aId)) || null;
      conyuge = this.personas.get(asId(parsed.bId)) || null;
    }
    if (!persona && !conyuge) return null;
    const childIds = new Set([...(persona?.hijos || []), ...(conyuge?.hijos || [])]);
    const hijos = Array.from(childIds).map((id) => this.personas.get(asId(id))).filter(Boolean);
    const gKey = pairKey(persona?._id, conyuge?._id);
    return { id: `group-${gKey}`, persona, conyuge, hijos, esDescendencia: true, groupKey: gKey };
  }

  getPersonAnchor(familyCardNode, personId, side = 'right') {
    if (!familyCardNode || !personId) return null;
    const ROW_H = 64;
    const group = familyCardNode.data;
    let personY = familyCardNode.y;

    if (group.persona?._id === personId) {
      personY = familyCardNode.y;
    } else if (group.conyuge?._id === personId) {
      personY = familyCardNode.y + (ROW_H * 2);
    } else {
      return {
        x: side === 'left' ? familyCardNode.x : familyCardNode.x + familyCardNode.width,
        y: familyCardNode.y + ROW_H
      };
    }

    const anchorX = side === 'left'
      ? familyCardNode.x + familyCardNode.width / 2
      : familyCardNode.x + familyCardNode.width / 2;

    this.trackCoordinate(anchorX, personY);
    return { x: anchorX, y: personY };
  }

  seamY(node) {
    return node.y + 64;
  }

  anchor(node, side) {
    const anchorX = side === 'left' ? node.x : node.x + node.width;
    const anchorY = this.seamY(node);
    this.trackCoordinate(anchorX, anchorY);
    return { x: anchorX, y: anchorY };
  }

  addPersonToParentsEdge(childNode, childPersonId, parentNode) {
    if (!childNode || !parentNode || !childPersonId) return;

    const start = this.getPersonAnchor(childNode, childPersonId, 'right');
    if (!start) return;

    const end = { x: parentNode.x, y: this.seamY(parentNode) };
    this.trackCoordinate(end.x, end.y);

    const VERTICAL_STUB = 40;

    const points = [];
    
    points.push(start);

    const group = childNode.data;
    const isTopRow = group.persona?._id === childPersonId;
    const verticalY = isTopRow ? start.y - VERTICAL_STUB : start.y + VERTICAL_STUB;
    points.push({ x: start.x, y: verticalY });
    this.trackCoordinate(start.x, verticalY);

    points.push({ x: start.x, y: end.y });
    this.trackCoordinate(start.x, end.y);

    points.push(end);

    this.connections.push({
      from: start,
      to: end,
      points: this.simplifyPath(points),
      meta: {
        role: 'ancestor-individual',
        childId: childNode.id,
        childPersonId,
        parentId: parentNode.id
      },
    });
  }

addExpandedBranchConnection(fromNode, targetNodes, byGroupKey) {
  if (!fromNode || !targetNodes || targetNodes.length === 0) return;

  const ROW_H = 64;
  const CARD_BASE_HEIGHT = 128;
  const STUB_LENGTH = 80;

  const startX = fromNode.x + fromNode.width;
  const startY = fromNode.y + (CARD_BASE_HEIGHT / 2);

  const stubEndX = startX + STUB_LENGTH;

  const targetNodesData = targetNodes
    .map(tg => {
      const node = byGroupKey.get(tg.groupKey);
      return node ? { node, seamY: this.seamY(node) } : null;
    })
    .filter(Boolean);

  if (targetNodesData.length === 0) return;

  const seamYs = targetNodesData.map(d => d.seamY);
  const minSeamY = Math.min(...seamYs);
  const maxSeamY = Math.max(...seamYs);

  // 1. Stub horizontal desde el botón
  this.connections.push({
    from: { x: startX, y: startY },
    to: { x: stubEndX, y: startY },
    points: [
      { x: startX, y: startY },
      { x: stubEndX, y: startY }
    ],
    meta: {
      role: 'expansion-stub-horizontal',
      straight: true
    }
  });

  // 2. Línea vertical conectando todos los nodos
  if (targetNodesData.length > 1) {
    this.connections.push({
      from: { x: stubEndX, y: minSeamY },
      to: { x: stubEndX, y: maxSeamY },
      points: [
        { x: stubEndX, y: minSeamY },
        { x: stubEndX, y: maxSeamY }
      ],
      meta: {
        role: 'expansion-stub-vertical',
        straight: true
      }
    });
  }

  // 3. Conexión desde stub hasta la vertical (si necesario)
  if (startY < minSeamY || startY > maxSeamY) {
    const targetY = startY < minSeamY ? minSeamY : maxSeamY;
    this.connections.push({
      from: { x: stubEndX, y: startY },
      to: { x: stubEndX, y: targetY },
      points: [
        { x: stubEndX, y: startY },
        { x: stubEndX, y: targetY }
      ],
      meta: {
        role: 'expansion-stub-connector',
        straight: true
      }
    });
  }

  // 4. Ramas horizontales a cada nodo
  targetNodesData.forEach(({ node, seamY }) => {
    this.connections.push({
      from: { x: stubEndX, y: seamY },
      to: { x: node.x, y: seamY },
      points: [
        { x: stubEndX, y: seamY },
        { x: node.x, y: seamY }
      ],
      meta: {
        role: 'expansion-branch',
        parentId: fromNode.id,
        childId: node.id
      }
    });
  });
}

  addEdge(fromNode, fromSide, toNode, toSide, role = 'generic') {
    if (!fromNode || !toNode) return;
    const start = this.anchor(fromNode, fromSide);
    const end = this.anchor(toNode, toSide);
    const points = (start.y === end.y) ? [start, end] : this.calculateOrthogonalPath(start, end, fromSide, toSide);
    this.connections.push({ from: start, to: end, points, meta: { parentId: fromNode.id, childId: toNode.id, role } });
  }

addTreeStyleDescendantEdges(parentNode, childNodes) {
  if (!parentNode || !childNodes || childNodes.length === 0) return;

  const HORIZONTAL_STUB = 60;
  const VERTICAL_STUB = 30;
  const CARD_H = 180;

  const parentAnchor = this.anchor(parentNode, 'left');
  const verticalLineX = parentAnchor.x - HORIZONTAL_STUB;

  // ✅ Trunk horizontal recto (a la misma altura del padre)
  this.connections.push({
    from: parentAnchor,
    to: { x: verticalLineX, y: parentAnchor.y },
    points: [
      parentAnchor,
      { x: verticalLineX, y: parentAnchor.y }
    ],
    meta: {
      role: 'descendant-trunk',
      parentId: parentNode.id,
      straight: true
    }
  });

  this.trackCoordinate(verticalLineX, parentAnchor.y);

  // Línea vertical desde el trunk hasta los hijos
  const childSeamYPositions = childNodes.map(child => this.seamY(child));
  const minSeamY = Math.min(...childSeamYPositions);
  const maxSeamY = Math.max(...childSeamYPositions);

  // Extender la vertical desde la altura del trunk hasta el hijo más alejado
  const verticalStart = Math.min(parentAnchor.y, minSeamY);
  const verticalEnd = Math.max(parentAnchor.y, maxSeamY);

  if (verticalStart !== verticalEnd) {
    this.connections.push({
      from: { x: verticalLineX, y: verticalStart },
      to: { x: verticalLineX, y: verticalEnd },
      points: [
        { x: verticalLineX, y: verticalStart },
        { x: verticalLineX, y: verticalEnd }
      ],
      meta: {
        role: 'descendant-vertical',
        parentId: parentNode.id,
        straight: true
      }
    });

    this.trackCoordinate(verticalLineX, verticalStart);
    this.trackCoordinate(verticalLineX, verticalEnd);
  }

  // Ramas horizontales hacia cada hijo
  childNodes.forEach(childNode => {
    const childAnchor = this.anchor(childNode, 'right');
    
    const branchPoints = [
      { x: verticalLineX, y: childAnchor.y },
      { x: childAnchor.x + VERTICAL_STUB, y: childAnchor.y },
      childAnchor
    ];

    branchPoints.forEach(p => this.trackCoordinate(p.x, p.y));

    this.connections.push({
      from: { x: verticalLineX, y: childAnchor.y },
      to: childAnchor,
      points: branchPoints,
      meta: {
        role: 'descendant-branch',
        parentId: parentNode.id,
        childId: childNode.id,
        straight: false
      }
    });
  });
}

  calculateOrthogonalPath(start, end, fromSide, toSide) {
    const STUB = 30;
    const points = [start];

    const firstStub = {
      x: fromSide === 'left' ? start.x - STUB : start.x + STUB,
      y: start.y
    };
    points.push(firstStub);
    this.trackCoordinate(firstStub.x, firstStub.y);

    const targetStub = {
      x: toSide === 'left' ? end.x - STUB : end.x + STUB,
      y: end.y
    };

    points.push({ x: targetStub.x, y: firstStub.y });
    this.trackCoordinate(targetStub.x, firstStub.y);

    points.push({ x: targetStub.x, y: targetStub.y });
    this.trackCoordinate(targetStub.x, targetStub.y);

    points.push(end);

    return this.simplifyPath(points);
  }

  simplifyPath(points) {
    if (points.length < 3) return points;
    const simplified = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const current = points[i];
      const next = points[i + 1];
      const isColinear = (prev.x === current.x && current.x === next.x) || (prev.y === current.y && current.y === next.y);
      if (!isColinear) simplified.push(current);
    }
    simplified.push(points[points.length - 1]);
    return simplified;
  }

  esHijoDirecto(parentGroup, childGroup) {
    if (!parentGroup || !childGroup) return false;
    const parentIds = new Set();
    if (parentGroup.persona?._id) parentIds.add(asId(parentGroup.persona._id));
    if (parentGroup.conyuge?._id) parentIds.add(asId(parentGroup.conyuge._id));
    const childPersonIds = new Set();
    if (childGroup.persona?._id) childPersonIds.add(asId(childGroup.persona._id));
    if (childGroup.conyuge?._id) childPersonIds.add(asId(childGroup.conyuge._id));
    for (const childPersonId of childPersonIds) {
      const childPerson = this.personas.get(childPersonId);
      if (!childPerson) continue;
      const padresIds = (childPerson.padres || []).map(asId);
      for (const padreId of padresIds) {
        if (parentIds.has(padreId)) return true;
      }
    }
    return false;
  }

  buildIndividualAncestorEdges(fromNode, targetGroups, byGroupKey) {
    if (!fromNode || !targetGroups?.length) return [];
    const fromGroup = fromNode.data;
    if (!fromGroup) return [];
    const peopleInGroup = [fromGroup.persona, fromGroup.conyuge].filter(Boolean);
    for (const person of peopleInGroup) {
      if (!person?._id || !person.padres?.length) continue;
      const parentIds = person.padres.map(asId);
      for (const parentId of parentIds) {
        for (const targetGroup of targetGroups) {
          const targetNode = byGroupKey.get(targetGroup.groupKey);
          if (!targetNode) continue;
          const groupHasThisParent =
            (targetGroup.persona?._id && asId(targetGroup.persona._id) === parentId) ||
            (targetGroup.conyuge?._id && asId(targetGroup.conyuge._id) === parentId);
          if (groupHasThisParent) {
            this.addPersonToParentsEdge(fromNode, person._id, targetNode);
            break;
          }
        }
      }
    }
    return [];
  }

  buildAncestorEdgesRelacionados(fromNode, targetGroups, byGroupKey, fromGroup) {
    if (!fromNode || !targetGroups?.length || !fromGroup) return [];
    return this.buildIndividualAncestorEdges(fromNode, targetGroups, byGroupKey);
  }

  calculateLayout() {
    if (!this.rootPerson) {
      return { nodes: [], connections: [], bounds: { width: 0, height: 0 } };
    }
    this.nodes = [];
    this.connections = [];
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
    return this.viewMode === 'horizontal' ? this.calculateHorizontalTreeLayout() : this.calculateVerticalLayout();
  }

  // ✅ NUEVO: Generar columnas de descendientes recursivamente
  generateAllDescendantColumns() {
    const rootGroup = {
      id: 'group-root',
      persona: this.rootPerson,
      conyuge: null,
      hijos: [],
      esDescendencia: false,
      groupKey: this.pairKey(this.rootPerson?._id, this.rootPerson?.conyuges?.[0] || null),
    };
    
    if (Array.isArray(this.rootPerson?.conyuges) && this.rootPerson.conyuges.length > 0) {
      const c = this.personas.get(this.rootPerson.conyuges[0]);
      if (c) rootGroup.conyuge = c;
    }
    
    if (Array.isArray(this.rootPerson?.hijos)) {
      rootGroup.hijos = this.rootPerson.hijos.map((id) => this.personas.get(id)).filter(Boolean);
    }
    
    const result = { rootGroup, columns: [] };
    
    // Generación 1: hijos directos de la raíz (SIEMPRE VISIBLE)
    const gen1Children = rootGroup.hijos || [];
    if (gen1Children.length > 0) {
      const gen1Groups = gen1Children.map(child => {
        let spouse = null;
        if (Array.isArray(child.conyuges) && child.conyuges.length > 0) {
          spouse = this.personas.get(child.conyuges[0]) || null;
        }
        
        const childHijos = Array.isArray(child.hijos) 
          ? child.hijos.map((id) => this.personas.get(id)).filter(Boolean) 
          : [];
        
        return {
          id: `desc-group-gen1-${child._id}`,
          persona: child,
          conyuge: spouse,
          hijos: childHijos,
          esDescendencia: true,
          groupKey: this.pairKey(child._id, spouse?._id)
        };
      });
      
      result.columns.push({ generation: 1, groups: gen1Groups, parentGroups: [rootGroup] });
    }
    
    // Generaciones 2-11: recursivas basadas en expandedDownKeys
    for (let gen = 2; gen <= 11; gen++) {
      const prevCol = result.columns[result.columns.length - 1];
      if (!prevCol) break;
      
      const currentGenGroups = [];
      const parentGroups = [];
      
      for (const parentGroup of prevCol.groups) {
        // Solo generar si el padre está expandido
        if (this.expandedDownKeys.has(parentGroup.groupKey)) {
          const childrenOfThisParent = parentGroup.hijos || [];
          
          childrenOfThisParent.forEach(child => {
            let spouse = null;
            if (Array.isArray(child.conyuges) && child.conyuges.length > 0) {
              spouse = this.personas.get(child.conyuges[0]) || null;
            }
            
            const childHijos = Array.isArray(child.hijos) 
              ? child.hijos.map((id) => this.personas.get(id)).filter(Boolean) 
              : [];
            
            currentGenGroups.push({
              id: `desc-group-gen${gen}-${child._id}`,
              persona: child,
              conyuge: spouse,
              hijos: childHijos,
              esDescendencia: true,
              groupKey: this.pairKey(child._id, spouse?._id)
            });
          });
          
          if (childrenOfThisParent.length > 0) {
            parentGroups.push(parentGroup);
          }
        }
      }
      
      if (currentGenGroups.length > 0) {
        result.columns.push({ 
          generation: gen, 
          groups: currentGenGroups,
          parentGroups 
        });
      } else {
        break;
      }
    }
    
    return result;
  }

 generateAncestorGroups() {
  const root = this.rootPerson;
  if (!root) return [];
  
  const groups = [];
  
  // IDs de padres de la raíz
  const rootParentIds = new Set(root?.padres || []);
  
  // IDs de padres del cónyuge
  let conyugeParentIds = new Set();
  let conyuge = null;
  if (root.conyuges?.length > 0) {
    const conyugeId = root.conyuges[0];
    conyuge = this.personas.get(conyugeId);
    if (conyuge) {
      conyugeParentIds = new Set(conyuge.padres || []);
    }
  }
  
  // Combinar todos los IDs
  const allParentIds = new Set([...rootParentIds, ...conyugeParentIds]);
  const parents = Array.from(allParentIds)
    .map((id) => this.personas.get(id))
    .filter(Boolean);
  
  // Grupos normales
  const parentGroups = this.buildAncestorGroupsFromPeople(parents);
  
  // ✅ Card vacía para raíz si no tiene padres
  if (rootParentIds.size === 0) {
    groups.push({
      id: `empty-parents-root-${root._id}`,
      persona: null,
      conyuge: null,
      hijos: [root],
      esDescendencia: false,
      isEmpty: true,
      groupKey: `empty-parents-root-${root._id}`,
      targetPersonId: root._id,
      targetPersonName: root.nombre
    });
  }
  
  // ✅ Card vacía para cónyuge si existe y no tiene padres
  if (conyuge && conyugeParentIds.size === 0) {
    groups.push({
      id: `empty-parents-conyuge-${conyuge._id}`,
      persona: null,
      conyuge: null,
      hijos: [conyuge],
      esDescendencia: false,
      isEmpty: true,
      groupKey: `empty-parents-conyuge-${conyuge._id}`,
      targetPersonId: conyuge._id,
      targetPersonName: conyuge.nombre
    });
  }
  
  groups.push(...parentGroups);
  
  return groups;
}

  generateGrandAncestorGroups(ancestorGroups = []) {
    const ids = new Set();
    ancestorGroups.forEach((g) => {
      (g?.persona?.padres || []).forEach((id) => ids.add(id));
      (g?.conyuge?.padres || []).forEach((id) => ids.add(id));
    });
    const grands = Array.from(ids).map((id) => this.personas.get(id)).filter(Boolean);
    return this.buildAncestorGroupsFromPeople(grands);
  }

  generateGreatAncestorGroups(selectedGrands = []) {
    const ids = new Set();
    selectedGrands.forEach((g) => {
      (g?.persona?.padres || []).forEach((id) => ids.add(id));
      (g?.conyuge?.padres || []).forEach((id) => ids.add(id));
    });
    const greats = Array.from(ids).map((id) => this.personas.get(id)).filter(Boolean);
    return this.buildAncestorGroupsFromPeople(greats);
  }

calculateHorizontalTreeLayout() {
    // Generar descendientes recursivamente
    const descendantData = this.generateAllDescendantColumns();
    const rootGroup = descendantData.rootGroup;
    
    // Generar ancestros
    const ancestorCol1 = this.generateAncestorGroups();
    const ancestorCol2 = this.generateGrandAncestorGroups(ancestorCol1);
    const extraAncestorCols = [];
    const processedKeys = new Set();

 // ✅ CORRECTO - Genera solo LA SIGUIENTE generación
this.expandedUpKeys.forEach(expandKey => {
  if (processedKeys.has(expandKey)) return;
  processedKeys.add(expandKey);
  
  let anchorGroup =
    ancestorCol2.find((g) => g.groupKey === expandKey) ||
    ancestorCol1.find((g) => g.groupKey === expandKey) ||
    this.groupFromKey(expandKey);
  
  if (!anchorGroup) return;
  
  // ✅ Solo genera LA SIGUIENTE generación (no un loop while)
  const nextCol = this.generateGreatAncestorGroups([anchorGroup]);
  if (nextCol.length > 0) {
    extraAncestorCols.push({ 
      groups: nextCol, 
      parentGroups: [anchorGroup], 
      parentKey: anchorGroup.groupKey, 
      anchorKey: expandKey 
    });
  }
});
    const heights = [];
    const hCol = (n) => Math.max(this.rowStep, Math.max(1, n) * this.rowStep);
    
    // Calcular alturas para descendientes
    descendantData.columns.forEach(col => {
      heights.push(hCol(col.groups.length || 1));
    });
    
    // Altura raíz
    heights.push(hCol(1));
    
    // Alturas ancestros
    heights.push(hCol(ancestorCol1.length || 1));
    heights.push(hCol(ancestorCol2.length || 1));
    for (const col of extraAncestorCols) heights.push(hCol(col.groups.length || 1));
    
    const alturaMaxima = Math.max(...heights, 500);
    const centerY = alturaMaxima / 2;
    const colW = 240 + this.columnGap;
    
    const leftCols = descendantData.columns.length;
    const rightCols =
      (ancestorCol1.length > 0 ? 1 : 0) +
      (ancestorCol2.length > 0 ? 1 : 0) +
      extraAncestorCols.filter(c => c.groups.length > 0).length;
    
    let anchoTotal = (leftCols + 1 + rightCols) * colW;
    const totalCanvasWidth = Math.max(anchoTotal + 100, 1200);
    const startX = (totalCanvasWidth - anchoTotal) / 2;
    const rootX = startX + leftCols * colW;

    const getByGroupKey = () => {
      const m = new Map();
      for (const n of this.nodes) {
        const gk = n?.data?.groupKey;
        if (gk) m.set(gk, n);
      }
      return m;
    };

    // Posicionar raíz
    if (rootGroup) {
      this.posicionarColumnaFamilyGroups([rootGroup], rootX, centerY, 'family-group-root');
    }

    // Posicionar ancestros (derecha)
    let currentRightX = rootX + colW;

    if (ancestorCol1.length > 0) {
      const rootNode = this.nodes.find(n => n.tipo === 'family-group-root');
      const anchorY1 = rootNode ? rootNode.y + rootNode.height / 2 : centerY;
      this.posicionarColumnaEnT(ancestorCol1, currentRightX, anchorY1, 'family-group-ancestor');
      currentRightX += colW;
    }

    if (ancestorCol2.length > 0) {
      const byKeyTemp = new Map();
      for (const n of this.nodes) {
        const gk = n?.data?.groupKey;
        if (gk) byKeyTemp.set(gk, n);
      }

      const parentNodesWithParents = [];
      for (const parentGroup of ancestorCol1) {
        const hasParentsInCol2 = ancestorCol2.some(grandGroup => this.esHijoDirecto(grandGroup, parentGroup));
        if (hasParentsInCol2) {
          const parentNode = byKeyTemp.get(parentGroup.groupKey);
          if (parentNode) parentNodesWithParents.push(parentNode);
        }
      }

      let anchorY2 = centerY;
      if (parentNodesWithParents.length > 0) {
        anchorY2 =
          parentNodesWithParents.reduce((sum, n) => sum + (n.y + n.height / 2), 0) /
          parentNodesWithParents.length;
      }

      this.posicionarColumnaEnT(ancestorCol2, currentRightX, anchorY2, 'family-group-grandancestor');
      currentRightX += colW;
    }

    for (let idx = 0; idx < extraAncestorCols.length; idx++) {
      const colData = extraAncestorCols[idx];
      const col = colData.groups;
      if (!col.length) continue;

      const label = `family-group-${'great'.repeat(idx + 1)}ancestor`;
      const byGroupKeyTmp = new Map();
      for (const n of this.nodes) {
        const gk = n?.data?.groupKey;
        if (gk) byGroupKeyTmp.set(gk, n);
      }

      const parentNodesForThisCol = [];
      for (const parentGroup of colData.parentGroups) {
        const hasParentsInCurrentCol = col.some(currentGroup => this.esHijoDirecto(currentGroup, parentGroup));
        if (hasParentsInCurrentCol) {
          const parentNode = byGroupKeyTmp.get(parentGroup.groupKey);
          if (parentNode) parentNodesForThisCol.push(parentNode);
        }
      }

      let anchorY = centerY;
      if (parentNodesForThisCol.length > 0) {
        anchorY =
          parentNodesForThisCol.reduce((sum, n) => sum + (n.y + n.height / 2), 0) /
          parentNodesForThisCol.length;
      }

      this.posicionarColumnaEnT(col, currentRightX, anchorY, label);
      currentRightX += colW;
    }

    // Posicionar descendientes (izquierda)
    let currentLeftX = rootX - colW;
    
    const getTipoForGeneration = (gen) => {
      if (gen === 1) return 'family-group-child';
      if (gen === 2) return 'family-group-grandchild';
      return `family-group-${'great'.repeat(gen - 2)}grandchild`;
    };
    
    descendantData.columns.forEach((colData, colIdx) => {
      const col = colData.groups;
      const generation = colData.generation;
      const tipo = getTipoForGeneration(generation);
      
      if (col.length === 0) return;
      
      let anchorY = centerY;
      
      // Para la primera generación, alinear con la raíz
      if (generation === 1) {
        const rootNode = this.nodes.find(n => n.tipo === 'family-group-root');
        if (rootNode) {
          anchorY = rootNode.y + rootNode.height / 2;
        }
      } else {
        // Para otras generaciones, alinear con los padres expandidos
        const byKey = getByGroupKey();
        const parentNodesExpanded = colData.parentGroups
          .filter(pg => this.expandedDownKeys.has(pg.groupKey))
          .map(pg => byKey.get(pg.groupKey))
          .filter(Boolean);
        
        if (parentNodesExpanded.length > 0) {
          anchorY = parentNodesExpanded.reduce((sum, n) => sum + (n.y + n.height / 2), 0) / parentNodesExpanded.length;
        }
      }
      
      this.posicionarColumnaEnT(col, currentLeftX, anchorY, tipo);
      currentLeftX -= colW;
    });

    // ✅ Card "Agregar hijo" solo para primera generación
    const rootNode = this.nodes.find(n => n.tipo === 'family-group-root');
    const firstGenCol = descendantData.columns.find(c => c.generation === 1);
    
    if (rootNode && rootGroup && firstGenCol) {
      const byGroupKey = getByGroupKey();
      const firstGenNodes = firstGenCol.groups
        .map(cg => byGroupKey.get(cg.groupKey))
        .filter(Boolean);
      
      let bottomY = rootNode.y;
      
      if (firstGenNodes.length > 0) {
        const maxChildY = Math.max(...firstGenNodes.map(n => n.y + n.height));
        bottomY = maxChildY + 50;
      }
      
      const addChildCard = {
        id: `add-child-root`,
        x: rootX - colW,
        y: bottomY,
        width: 240,
        height: 180,
        tipo: 'add-child-card',
        data: {
          personaId: rootGroup.persona._id,
          personaNombre: rootGroup.persona.nombre,
          conyugeId: rootGroup.conyuge?._id
        }
      };
      
      this.nodes.push(addChildCard);
      this.trackCoordinate(addChildCard.x, addChildCard.y);
      this.trackCoordinate(addChildCard.x + addChildCard.width, addChildCard.y + addChildCard.height);
    }

    // Recentrar columnas ancestros
    const allAncestorCols = [ancestorCol1, ancestorCol2, ...extraAncestorCols.map(c => c.groups)];
    for (let i = 0; i < allAncestorCols.length - 1; i++) {
      const lower = allAncestorCols[i];
      const upper = allAncestorCols[i + 1];
      this.reCenterGenerationalColumns(lower, upper);
    }

    const byGroupKey = new Map();
    for (const n of this.nodes) {
      const gk = n?.data?.groupKey;
      if (gk) byGroupKey.set(gk, n);
    }
    const findNodeByKey = (gk) => byGroupKey.get(gk);

    // Conexiones descendientes
    descendantData.columns.forEach((colData, colIdx) => {
      const col = colData.groups;
      const parentGroups = colData.parentGroups;
      
      for (const parentGroup of parentGroups) {
        const fromNode = findNodeByKey(parentGroup.groupKey);
        if (!fromNode) continue;
        
        const childNodesForThisParent = col
          .filter(cg => this.esHijoDirecto(parentGroup, cg))
          .map(cg => byGroupKey.get(cg.groupKey))
          .filter(Boolean);
        
        if (childNodesForThisParent.length > 0) {
          this.addTreeStyleDescendantEdges(fromNode, childNodesForThisParent);
        }
      }
    });

    // Conexiones ancestros
    if (rootNode && ancestorCol1.length) {
      this.buildIndividualAncestorEdges(rootNode, ancestorCol1, byGroupKey);
    }

    if (ancestorCol2.length) {
      for (const pg of ancestorCol1) {
        const fromNode = findNodeByKey(pg.groupKey);
        if (!fromNode) continue;
        this.buildIndividualAncestorEdges(fromNode, ancestorCol2, byGroupKey);
      }
    }

    for (let idx = 0; idx < extraAncestorCols.length; idx++) {
      const colData = extraAncestorCols[idx];
      const col = colData.groups;
      
      for (const parentGroup of colData.parentGroups) {
        const parentNode = findNodeByKey(parentGroup.groupKey);
        if (!parentNode) continue;
        
        const childrenInThisCol = col.filter(g => this.esHijoDirecto(g, parentGroup));
        if (childrenInThisCol.length > 0) {
          
          const genIndex = generationIndexFromTipo(parentNode.tipo);
          const realGen = genIndex + 1;
          const hasExpandButton = realGen >= 3 && realGen <= 11 && realGen % 2 === 1;
          
          if (hasExpandButton) {
            this.addExpandedBranchConnection(parentNode, childrenInThisCol, byGroupKey);
          } else {
            this.buildIndividualAncestorEdges(parentNode, childrenInThisCol, byGroupKey);
          }
        }
      }
    }

    const PADDING = 150;
    const canvasWidth = Math.max((this.maxX - this.minX) + PADDING * 2, 2000);
    const canvasHeight = Math.max((this.maxY - this.minY) + PADDING * 2, 1500);

    return {
      nodes: this.nodes,
      connections: this.connections,
      bounds: { width: canvasWidth, height: canvasHeight },
    };
  }

  calculateVerticalLayout() {
    return this.calculateHorizontalTreeLayout();
  }
}