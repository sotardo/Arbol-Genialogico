// src/utils/familyLayout.js - SISTEMA SIMPLE CON EMPTY CARDS
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
  if (!tipo || typeof tipo !== 'string') return -1;
  if (tipo === 'family-group-root') return 0;
  if (tipo === 'family-group-ancestor') return 1;
  if (tipo === 'family-group-grandancestor') return 2;
  if (tipo.startsWith('family-group-great')) {
    const count = (tipo.match(/great/g) || []).length;
    return 2 + count;
  }
  return -1;
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

    const hasEmptyCards = upperCol.some(g => g.isEmpty || g.isEmptyCard);
    if (hasEmptyCards) return;

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
    return pairKey(aId, bId);
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

  // ✅ Determinar si esta generación debe tener botón de expansión
  const genIndex = generationIndexFromTipo(tipo);
  const realGen = genIndex + 1;
  const shouldShowExpandButton = realGen >= 3 && realGen <= 11 && realGen % 2 === 1;

  // ✅ NUEVO: reordenar SOLO si hay cards vacías para que queden ABAJO
  const hasEmpty = groups.some(g => g?.isEmpty || g?.isEmptyCard);
  const orderedGroups = hasEmpty
    ? [...groups].sort((a, b) => {
        const aEmpty = a?.isEmpty || a?.isEmptyCard;
        const bEmpty = b?.isEmpty || b?.isEmptyCard;
        if (aEmpty === bEmpty) return 0;
        // los no vacíos primero (arriba), los vacíos después (abajo)
        return aEmpty ? 1 : -1;
      })
    : groups;

  if (orderedGroups.length === 1) {
    const g = orderedGroups[0];
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
      hasExpandButton: shouldShowExpandButton
    });
    this.trackCoordinate(nodeX, nodeY);
    this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
    return;
  }

  const n = orderedGroups.length;
  const totalHeight = (n - 1) * this.rowStep;
  const startY = anchorY - totalHeight / 2 - CARD_H / 2;

  orderedGroups.forEach((g, i) => {
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
      hasExpandButton: shouldShowExpandButton
    });
    this.trackCoordinate(nodeX, nodeY);
    this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
  });
}

posicionarColumnaFamilyGroups(groups, x, centerY, tipo, anchorY = null) {
  if (!groups || groups.length === 0) return;
  const CARD_W = 240;
  const CARD_H = 180;
  const shift = this.columnShift[tipo] || 0;
  const colCenterY = typeof anchorY === 'number' ? anchorY : centerY;

  // ✅ Determinar si esta generación debe tener botón (normalmente false para root)
  const genIndex = generationIndexFromTipo(tipo);
  const realGen = genIndex + 1;
  const shouldShowExpandButton = realGen >= 3 && realGen <= 11 && realGen % 2 === 1;

  const n = groups.length;
  if (n === 1) {
    const g = groups[0];
    const nodeX = x + shift;
    const nodeY = colCenterY - CARD_H / 2;
    
    this.nodes.push({ 
      id: g.id, 
      x: nodeX, 
      y: nodeY, 
      width: CARD_W, 
      height: CARD_H, 
      data: g, 
      tipo,
      hasExpandButton: shouldShowExpandButton  // ✅ Agregar flag
    });
    this.trackCoordinate(nodeX, nodeY);
    this.trackCoordinate(nodeX + CARD_W, nodeY + CARD_H);
    return;
  }

  const startY = colCenterY - ((n - 1) / 2) * this.rowStep - (CARD_H / 2);

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
      hasExpandButton: shouldShowExpandButton  // ✅ Agregar flag
    });
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
    return { id: `anc-group-${gKey}`, persona, conyuge, hijos, esDescendencia: false, groupKey: gKey };
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

    const anchorX = familyCardNode.x + familyCardNode.width / 2;
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
      meta: { role: 'ancestor-individual', childId: childNode.id, childPersonId, parentId: parentNode.id },
    });
  }

  addExpandedBranchConnection(fromNode, targetGroups, byGroupKey) {
    if (!fromNode || !targetGroups || targetGroups.length === 0) return;

    const CARD_BASE_HEIGHT = 128;
    const STUB_LENGTH = 80;

    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + (CARD_BASE_HEIGHT / 2);
    const stubEndX = startX + STUB_LENGTH;

    const targetNodesData = targetGroups
      .map(tg => {
        const node = byGroupKey.get(tg.groupKey);
        if (!node) return null;
        return { 
          node, 
          seamY: this.seamY(node),
          isEmptyCard: tg.isEmpty || tg.isEmptyCard
        };
      })
      .filter(Boolean);

    if (targetNodesData.length === 0) return;

    const seamYs = targetNodesData.map(d => d.seamY);
    const minSeamY = Math.min(...seamYs);
    const maxSeamY = Math.max(...seamYs);

    this.connections.push({
      from: { x: startX, y: startY },
      to: { x: stubEndX, y: startY },
      points: [{ x: startX, y: startY }, { x: stubEndX, y: startY }],
      meta: { role: 'expansion-stub-horizontal', straight: true }
    });

    if (targetNodesData.length > 1) {
      this.connections.push({
        from: { x: stubEndX, y: minSeamY },
        to: { x: stubEndX, y: maxSeamY },
        points: [{ x: stubEndX, y: minSeamY }, { x: stubEndX, y: maxSeamY }],
        meta: { role: 'expansion-stub-vertical', straight: true }
      });
    }

    if (startY < minSeamY || startY > maxSeamY) {
      const targetY = startY < minSeamY ? minSeamY : maxSeamY;
      this.connections.push({
        from: { x: stubEndX, y: startY },
        to: { x: stubEndX, y: targetY },
        points: [{ x: stubEndX, y: startY }, { x: stubEndX, y: targetY }],
        meta: { role: 'expansion-stub-connector', straight: true }
      });
    }

    targetNodesData.forEach(({ node, seamY, isEmptyCard }) => {
      this.connections.push({
        from: { x: stubEndX, y: seamY },
        to: { x: node.x, y: seamY },
        points: [{ x: stubEndX, y: seamY }, { x: node.x, y: seamY }],
        meta: { role: 'expansion-branch', parentId: fromNode.id, childId: node.id, isEmptyCard }
      });
    });
  }

  addTreeStyleDescendantEdges(parentNode, childNodes) {
    if (!parentNode || !childNodes || childNodes.length === 0) return;

    const HORIZONTAL_STUB = 60;
    const VERTICAL_STUB = 30;

    const parentAnchor = this.anchor(parentNode, 'left');
    const verticalLineX = parentAnchor.x - HORIZONTAL_STUB;

    this.connections.push({
      from: parentAnchor,
      to: { x: verticalLineX, y: parentAnchor.y },
      points: [parentAnchor, { x: verticalLineX, y: parentAnchor.y }],
      meta: { role: 'descendant-trunk', parentId: parentNode.id, straight: true }
    });

    this.trackCoordinate(verticalLineX, parentAnchor.y);

    const childSeamYPositions = childNodes.map(child => this.seamY(child));
    const minSeamY = Math.min(...childSeamYPositions);
    const maxSeamY = Math.max(...childSeamYPositions);

    const verticalStart = Math.min(parentAnchor.y, minSeamY);
    const verticalEnd = Math.max(parentAnchor.y, maxSeamY);

    if (verticalStart !== verticalEnd) {
      this.connections.push({
        from: { x: verticalLineX, y: verticalStart },
        to: { x: verticalLineX, y: verticalEnd },
        points: [{ x: verticalLineX, y: verticalStart }, { x: verticalLineX, y: verticalEnd }],
        meta: { role: 'descendant-vertical', parentId: parentNode.id, straight: true }
      });
      this.trackCoordinate(verticalLineX, verticalStart);
      this.trackCoordinate(verticalLineX, verticalEnd);
    }

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
        meta: { role: 'descendant-branch', parentId: parentNode.id, childId: childNode.id, straight: false }
      });
    });
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
    if (parentGroup.isEmpty || parentGroup.isEmptyCard) return false;

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

  emptyCardBelongsToParent(emptyCard, parentGroup) {
    if (!emptyCard || !parentGroup) return false;
    if (!emptyCard.isEmpty && !emptyCard.isEmptyCard) return false;
    
    const targetPersonId = emptyCard.targetPersonId;
    if (!targetPersonId) return false;
    
    const parentPersonId = parentGroup.persona?._id;
    const parentConyugeId = parentGroup.conyuge?._id;
    
    return (
      (parentPersonId && String(parentPersonId) === String(targetPersonId)) ||
      (parentConyugeId && String(parentConyugeId) === String(targetPersonId))
    );
  }

  buildIndividualAncestorEdges(fromNode, targetGroups, byGroupKey) {
    if (!fromNode || !targetGroups?.length) return;
    const fromGroup = fromNode.data;
    if (!fromGroup) return;
    
    const peopleInGroup = [fromGroup.persona, fromGroup.conyuge].filter(Boolean);
    for (const person of peopleInGroup) {
      if (!person?._id || !person.padres?.length) continue;
      const parentIds = person.padres.map(asId);
      for (const parentId of parentIds) {
        for (const targetGroup of targetGroups) {
          if (targetGroup.isEmpty || targetGroup.isEmptyCard) continue;
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
  }

buildEmptyParentEdges(fromNode, targetGroups, byGroupKey) {
  if (!fromNode || !targetGroups?.length) return;
  const fromGroup = fromNode.data;
  if (!fromGroup) return;

  const fromPersonIds = new Set();
  if (fromGroup.persona?._id) fromPersonIds.add(String(fromGroup.persona._id));
  if (fromGroup.conyuge?._id) fromPersonIds.add(String(fromGroup.conyuge._id));

  // ✅ Procesar cada persona por separado para obtener conexiones individuales
  const peopleInGroup = [fromGroup.persona, fromGroup.conyuge].filter(Boolean);
  
  for (const person of peopleInGroup) {
    if (!person?._id) continue;

    // Buscar la empty card correspondiente a esta persona
    const relatedEmptyCard = targetGroups.find(tg => {
      if (!tg.isEmpty && !tg.isEmptyCard) return false;
      return String(tg.targetPersonId) === String(person._id);
    });

    if (!relatedEmptyCard) continue;

    const targetNode = byGroupKey.get(relatedEmptyCard.groupKey);
    if (!targetNode) continue;

    // ✅ Usar el mismo método que para conexiones normales
    this.addPersonToParentsEdge(fromNode, person._id, targetNode);
  }
}

  // ✅ Generar empty cards para grupos sin padres
  generateEmptyCardsFor(groups) {
    const emptyCards = [];
    const processedIds = new Set();

    for (const group of groups) {
      if (group.isEmpty || group.isEmptyCard) continue;

      if (group.persona) {
        const personaPadres = group.persona.padres || [];
        const personaId = group.persona._id;
        if (personaPadres.length === 0 && !processedIds.has(personaId)) {
          processedIds.add(personaId);
          emptyCards.push({
            id: `empty-parents-${personaId}`,
            persona: null,
            conyuge: null,
            hijos: [group.persona],
            esDescendencia: false,
            isEmpty: true,
            isEmptyCard: true,
            groupKey: `empty-parents-${personaId}`,
            targetPersonId: personaId,
            targetPersonName: group.persona.nombre
          });
        }
      }

      if (group.conyuge) {
        const conyugePadres = group.conyuge.padres || [];
        const conyugeId = group.conyuge._id;
        if (conyugePadres.length === 0 && !processedIds.has(conyugeId)) {
          processedIds.add(conyugeId);
          emptyCards.push({
            id: `empty-parents-${conyugeId}`,
            persona: null,
            conyuge: null,
            hijos: [group.conyuge],
            esDescendencia: false,
            isEmpty: true,
            isEmptyCard: true,
            groupKey: `empty-parents-${conyugeId}`,
            targetPersonId: conyugeId,
            targetPersonName: group.conyuge.nombre
          });
        }
      }
    }
    return emptyCards;
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
    
    for (let gen = 2; gen <= 11; gen++) {
      const prevCol = result.columns[result.columns.length - 1];
      if (!prevCol) break;
      
      const currentGenGroups = [];
      const parentGroups = [];
      
      for (const parentGroup of prevCol.groups) {
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
    
    const rootParentIds = new Set(root?.padres || []);
    
    let conyugeParentIds = new Set();
    let conyuge = null;
    if (root.conyuges?.length > 0) {
      const conyugeId = root.conyuges[0];
      conyuge = this.personas.get(conyugeId);
      if (conyuge) {
        conyugeParentIds = new Set(conyuge.padres || []);
      }
    }
    
    const allParentIds = new Set([...rootParentIds, ...conyugeParentIds]);
    const parents = Array.from(allParentIds)
      .map((id) => this.personas.get(id))
      .filter(Boolean);
    
    const parentGroups = this.buildAncestorGroupsFromPeople(parents);
    
    if (rootParentIds.size === 0) {
      groups.push({
        id: `empty-parents-root-${root._id}`,
        persona: null,
        conyuge: null,
        hijos: [root],
        esDescendencia: false,
        isEmpty: true,
        isEmptyCard: true,
        groupKey: `empty-parents-root-${root._id}`,
        targetPersonId: root._id,
        targetPersonName: root.nombre
      });
    }
    
    if (conyuge && conyugeParentIds.size === 0) {
      groups.push({
        id: `empty-parents-conyuge-${conyuge._id}`,
        persona: null,
        conyuge: null,
        hijos: [conyuge],
        esDescendencia: false,
        isEmpty: true,
        isEmptyCard: true,
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
      if (g.isEmpty || g.isEmptyCard) return;
      (g?.persona?.padres || []).forEach((id) => ids.add(id));
      (g?.conyuge?.padres || []).forEach((id) => ids.add(id));
    });
    const grands = Array.from(ids).map((id) => this.personas.get(id)).filter(Boolean);
    const normalGroups = this.buildAncestorGroupsFromPeople(grands);
    
    const emptyCards = this.generateEmptyCardsFor(ancestorGroups);
    
    return [...normalGroups, ...emptyCards];
  }

  generateGreatAncestorGroups(selectedGrands = []) {
    const ids = new Set();
    selectedGrands.forEach((g) => {
      if (g.isEmpty || g.isEmptyCard) return;
      (g?.persona?.padres || []).forEach((id) => ids.add(id));
      (g?.conyuge?.padres || []).forEach((id) => ids.add(id));
    });
    const greats = Array.from(ids).map((id) => this.personas.get(id)).filter(Boolean);
    const normalGroups = this.buildAncestorGroupsFromPeople(greats);
    
    const emptyCards = this.generateEmptyCardsFor(selectedGrands);
    
    return [...normalGroups, ...emptyCards];
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
    return { id: `anc-group-${gKey}`, persona, conyuge, hijos, esDescendencia: false, groupKey: gKey };
  }

  calculateHorizontalTreeLayout() {
    const descendantData = this.generateAllDescendantColumns();
    const rootGroup = descendantData.rootGroup;
    
    const ancestorCol1 = this.generateAncestorGroups();
    const ancestorCol2 = this.generateGrandAncestorGroups(ancestorCol1);

    // ✅ SISTEMA SIMPLE DE EXPANSIÓN: 2 COLUMNAS POR CADA KEY EXPANDIDA
    const extraAncestorCols = [];
    const processedKeys = new Set();

    this.expandedUpKeys.forEach(expandKey => {
      if (processedKeys.has(expandKey)) return;
      processedKeys.add(expandKey);
      
      let anchorGroup =
        ancestorCol2.find((g) => g.groupKey === expandKey) ||
        ancestorCol1.find((g) => g.groupKey === expandKey) ||
        this.groupFromKey(expandKey);
      
      if (!anchorGroup) return;
      
      let currentGroups = [anchorGroup];
      const MAX_EXTRA_COLS = 2;
      let steps = 0;
      
      while (currentGroups.length > 0 && steps < MAX_EXTRA_COLS) {
        const nextCol = this.generateGreatAncestorGroups(currentGroups);
        if (nextCol.length === 0) break;
        
        extraAncestorCols.push({ 
          groups: nextCol, 
          parentGroups: currentGroups, 
          parentKey: currentGroups[0]?.groupKey, 
          anchorKey: expandKey 
        });
        
        currentGroups = nextCol;
        steps++;
      }
    });

    const heights = [];
    const hCol = (n) => Math.max(this.rowStep, Math.max(1, n) * this.rowStep);
    
    descendantData.columns.forEach(col => {
      heights.push(hCol(col.groups.length || 1));
    });
    
    heights.push(hCol(1));
    
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

    if (rootGroup) {
      this.posicionarColumnaFamilyGroups([rootGroup], rootX, centerY, 'family-group-root');
    }

    let currentRightX = rootX + colW;

    if (ancestorCol1.length > 0) {
      const rootNode = this.nodes.find(n => n.tipo === 'family-group-root');
      const anchorY1 = rootNode ? rootNode.y + rootNode.height / 2 : centerY;
      this.posicionarColumnaEnT(ancestorCol1, currentRightX, anchorY1, 'family-group-ancestor');
      currentRightX += colW;
    }

    if (ancestorCol2.length > 0) {
      const byKeyTemp = getByGroupKey();

      const parentNodesWithParents = [];
      for (const parentGroup of ancestorCol1) {
        const hasParentsInCol2 = ancestorCol2.some(grandGroup => {
          if (grandGroup.isEmpty || grandGroup.isEmptyCard) {
            const targetId = grandGroup.targetPersonId;
            return targetId && (
              String(parentGroup.persona?._id) === String(targetId) ||
              String(parentGroup.conyuge?._id) === String(targetId)
            );
          }
          return this.esHijoDirecto(grandGroup, parentGroup);
        });
        
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
      const byGroupKeyTmp = getByGroupKey();

      const parentNodesForThisCol = [];
      for (const parentGroup of colData.parentGroups) {
        const hasParentsInCurrentCol = col.some(currentGroup => {
          if (currentGroup.isEmpty || currentGroup.isEmptyCard) {
            return this.emptyCardBelongsToParent(currentGroup, parentGroup);
          }
          return this.esHijoDirecto(currentGroup, parentGroup);
        });
        
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

    let currentLeftX = rootX - colW;
    
    const getTipoForGeneration = (gen) => {
      if (gen === 1) return 'family-group-child';
      if (gen === 2) return 'family-group-grandchild';
      return `family-group-${'great'.repeat(gen - 2)}grandchild`;
    };
    
    descendantData.columns.forEach((colData) => {
      const col = colData.groups;
      const generation = colData.generation;
      const tipo = getTipoForGeneration(generation);
      
      if (col.length === 0) return;
      
      let anchorY = centerY;
      
      if (generation === 1) {
        const rootNode = this.nodes.find(n => n.tipo === 'family-group-root');
        if (rootNode) {
          anchorY = rootNode.y + rootNode.height / 2;
        }
      } else {
        const byKeyDesc = getByGroupKey();
        const parentNodesExpanded = colData.parentGroups
          .filter(pg => this.expandedDownKeys.has(pg.groupKey))
          .map(pg => byKeyDesc.get(pg.groupKey))
          .filter(Boolean);
        
        if (parentNodesExpanded.length > 0) {
          anchorY = parentNodesExpanded.reduce((sum, n) => sum + (n.y + n.height / 2), 0) / parentNodesExpanded.length;
        }
      }
      
      this.posicionarColumnaEnT(col, currentLeftX, anchorY, tipo);
      currentLeftX -= colW;
    });

    const rootNode = this.nodes.find(n => n.tipo === 'family-group-root');
    const firstGenCol = descendantData.columns.find(c => c.generation === 1);
    
    if (rootNode && rootGroup && firstGenCol) {
      const byGroupKeyTmp = getByGroupKey();
      const firstGenNodes = firstGenCol.groups
        .map(cg => byGroupKeyTmp.get(cg.groupKey))
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

    const allAncestorCols = [ancestorCol1, ancestorCol2, ...extraAncestorCols.map(c => c.groups)];
    for (let i = 0; i < allAncestorCols.length - 1; i++) {
      const lower = allAncestorCols[i];
      const upper = allAncestorCols[i + 1];
      this.reCenterGenerationalColumns(lower, upper);
    }

    const byGroupKey = getByGroupKey();
    const findNodeByKey = (gk) => byGroupKey.get(gk);

    descendantData.columns.forEach((colData) => {
      const col = colData.groups;
      const parentGroups = colData.parentGroups || [];
      
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

    if (rootNode && ancestorCol1.length) {
      this.buildIndividualAncestorEdges(rootNode, ancestorCol1, byGroupKey);
      this.buildEmptyParentEdges(rootNode, ancestorCol1, byGroupKey);
    }

    if (ancestorCol2.length) {
      for (const pg of ancestorCol1) {
        const fromNode = findNodeByKey(pg.groupKey);
        if (!fromNode) continue;
        this.buildIndividualAncestorEdges(fromNode, ancestorCol2, byGroupKey);
        this.buildEmptyParentEdges(fromNode, ancestorCol2, byGroupKey);
      }
    }

    // ✅ CONEXIONES PARA RAMAS EXPANDIDAS
    for (let idx = 0; idx < extraAncestorCols.length; idx++) {
      const colData = extraAncestorCols[idx];
      const col = colData.groups;
      
      for (const parentGroup of colData.parentGroups) {
        const parentNode = findNodeByKey(parentGroup.groupKey);
        if (!parentNode) continue;
        
        const allRelatedGroups = col.filter(g => {
          if (!g.isEmpty && !g.isEmptyCard) {
            return this.esHijoDirecto(g, parentGroup);
          }
          return this.emptyCardBelongsToParent(g, parentGroup);
        });
        
        if (allRelatedGroups.length > 0) {
          const genIndex = generationIndexFromTipo(parentNode.tipo);
          const realGen = genIndex + 1;
          const hasExpandButton = realGen >= 3 && realGen <= 11 && realGen % 2 === 1;
          
          if (hasExpandButton) {
            this.addExpandedBranchConnection(parentNode, allRelatedGroups, byGroupKey);
          } else {
            this.buildIndividualAncestorEdges(parentNode, allRelatedGroups, byGroupKey);
            this.buildEmptyParentEdges(parentNode, allRelatedGroups, byGroupKey);
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