// src/components/FamilyCanvas.jsx - CORREGIDO v4 - ANTI-PIXELADO + MÚLTIPLES MATRIMONIOS
import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { familyLoader } from '../utils/familyLoader';
import { FamilyLayout } from '../utils/familyLayout';
import PersonCard from './PersonCard';
import FamilyCard from './FamilyCard';
import CircleButton from './CircleButton';
import PersonDetailPanel from './PersonDetailPanel';
import { personasApi } from '../personasApi';
import { toAPI } from '../utils';
import { processLayoutConnections } from '../utils/familySearchStyleRouter';
import AgregarPadrePanel from './AgregarPadrePanel';
import AgregarHijoCard from './AgregarHijoCard';
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

const itemVariants = {
  initial: { opacity: 0, y: -8, scale: 0.95 },
  animate: { 
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const emptyCardVariants = {
  initial: { opacity: 1, y: 0, scale: 1 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export default function FamilyCanvas({
  rootId,
  height = '100vh',
  onPick,
  viewMode = 'horizontal',
  spacing = 1,
  onOpenPerfil,
}) {
  const [familyData, setFamilyData] = useState(null);
  const [layout, setLayout] = useState(null);
  const [routedEdges, setRoutedEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const [expandedUpKeys, setExpandedUpKeys] = useState(new Set());
  const [expandedDownKeys, setExpandedDownKeys] = useState(new Set());
  
  const [activeSpouseMap, setActiveSpouseMap] = useState({});
  const [layoutVersion, setLayoutVersion] = useState(0);
  
  const [panelAgregar, setPanelAgregar] = useState({
    open: false,
    targetPersonId: null,
    targetPersonName: null,
    tipo: null,
    hijosComunes: [],
    padreId: null
  });

  const viewportRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const panState = useRef({ panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });
  const hasEverCentered = useRef(false);
  const lastRootId = useRef(rootId);
  const viewportStateBeforeExpansion = useRef(null);
  const isInitialLoad = useRef(true);
  
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const MIN_SCALE = 0.4;
  const MAX_SCALE = 2.5;
  const INITIAL_ZOOM = 1.8;

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.altKey) e.preventDefault(); };
    const handleWheel = (e) => { if (e.altKey) e.preventDefault(); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    if (rootId !== lastRootId.current) {
      hasEverCentered.current = false;
      lastRootId.current = rootId;
      setActiveSpouseMap({});
      isInitialLoad.current = true;
      setLayoutVersion(0);
    }
  }, [rootId]);

  const localPairKey = (aId, bId) => {
    if (!aId && !bId) return null;
    if (aId && bId) {
      const [x, y] = [String(aId), String(bId)].sort();
      return `pair:${x}:${y}`;
    }
    return `single:${String(aId || bId)}`;
  };

  const genIndexFromTipo = (tipo) => {
    if (!tipo || typeof tipo !== 'string') return 0;
    if (tipo === 'family-group-root') return 0;
    if (tipo === 'family-group-ancestor') return 1;
    if (tipo === 'family-group-grandancestor') return 2;
    if (tipo.startsWith('family-group-great') && !tipo.includes('grandchild')) {
      return 2 + (tipo.match(/great/g) || []).length;
    }
    if (tipo === 'family-group-child') return -1;
    if (tipo === 'family-group-grandchild') return -2;
    if (tipo.startsWith('family-group-great') && tipo.includes('grandchild')) {
      return -(2 + (tipo.match(/great/g) || []).length);
    }
    return 0;
  };

  const getAbsoluteGenerationFromTipo = (tipo) => Math.abs(genIndexFromTipo(tipo));
  const computeUpBudget = () => 12;
  const computeDownBudget = () => 12;

  const generationOfGroupKey = (groupKey, layoutObj) => {
    if (!layoutObj?.nodes?.length || !groupKey) return null;
    const node = layoutObj.nodes.find(
      n => (n.tipo?.startsWith('family-group') || n.tipo === 'family-group-root') && (
        n.data?.groupKey === groupKey ||
        (localPairKey(n.data?.persona?._id, n.data?.conyuge?._id) === groupKey)
      )
    );
    return node ? getAbsoluteGenerationFromTipo(node.tipo) : null;
  };

  const areInSameLine = (key1, key2) => {
    if (!key1 || !key2 || !layout?.nodes || !familyData?.personas) return false;
    if (key1 === key2) return true;
    const node1 = layout.nodes.find(n => n.data?.groupKey === key1);
    const node2 = layout.nodes.find(n => n.data?.groupKey === key2);
    if (!node1 || !node2) return false;
    const gen1 = generationOfGroupKey(key1, layout);
    const gen2 = generationOfGroupKey(key2, layout);
    if (gen1 === null || gen2 === null || gen1 === gen2) return false;

    const ancestorNode = gen1 > gen2 ? node1 : node2;
    const descendantNode = gen1 > gen2 ? node2 : node1;
    const ancestorIds = new Set();
    if (ancestorNode.data.persona?._id) ancestorIds.add(ancestorNode.data.persona._id);
    if (ancestorNode.data.conyuge?._id) ancestorIds.add(ancestorNode.data.conyuge._id);
    const descendantIds = [];
    if (descendantNode.data.persona?._id) descendantIds.push(descendantNode.data.persona._id);
    if (descendantNode.data.conyuge?._id) descendantIds.push(descendantNode.data.conyuge._id);

    for (const descId of descendantIds) {
      let currentId = descId;
      const visited = new Set();
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        if (ancestorIds.has(currentId)) return true;
        const persona = familyData.personas.find(p => p._id === currentId);
        if (!persona?.padres?.length) break;
        let foundParent = false;
        for (const padreId of persona.padres) {
          if (ancestorIds.has(padreId)) return true;
          if (!visited.has(padreId)) { currentId = padreId; foundParent = true; break; }
        }
        if (!foundParent) break;
      }
    }
    return false;
  };

  const handleAgregarPadre = (targetPersonId, targetPersonName) => {
    setPanelAgregar({ open: true, targetPersonId, targetPersonName, tipo: 'padre' });
  };
  const handleAgregarMadre = (targetPersonId, targetPersonName) => {
    setPanelAgregar({ open: true, targetPersonId, targetPersonName, tipo: 'madre' });
  };
  const handleAgregarConyuge = (personaId, personaNombre, hijosIds) => {
    setPanelAgregar({ open: true, targetPersonId: personaId, targetPersonName: personaNombre, tipo: 'conyuge', hijosComunes: hijosIds || [] });
  };
  const handleAgregarHijo = (personaId, personaNombre, conyugeId) => {
    setPanelAgregar({ open: true, targetPersonId: personaId, targetPersonName: personaNombre, tipo: 'hijo', hijosComunes: [], padreId: conyugeId || null });
  };

  const handleExpandParentGroup = (groupKey) => {
    if (!groupKey) return;
    setExpandedUpKeys(prev => new Set([...prev, groupKey]));
  };

  const handleCambiarConyuge = useCallback((personaId, nuevoConyugeId) => {
    console.log('=== handleCambiarConyuge EJECUTADO ===');
    console.log('A. personaId:', personaId);
    console.log('B. nuevoConyugeId:', nuevoConyugeId);
    
    setActiveSpouseMap(prev => {
      const next = { ...prev, [String(personaId)]: String(nuevoConyugeId) };
      console.log('D. activeSpouseMap DESPUÉS:', next);
      return next;
    });
    
    setLayoutVersion(v => v + 1);
  }, []);

  const handlePadreAgregado = () => {
    setPanelAgregar({ open: false, targetPersonId: null, targetPersonName: null, tipo: null });
    if (rootId) {
      isInitialLoad.current = true;
      loadFamilyData();
    }
  };

  const loadFamilyData = useCallback(async () => {
    if (!rootId) return;
    
    setLoading(true);
    setError(null);

    try {
      const data = await familyLoader.loadFamilyNeighborhood(rootId, {
        maxUp: computeUpBudget(),
        maxDown: computeDownBudget(),
        expandedUpKeys,
        expandedDownKeys
      });

      setFamilyData(data);

      if (isInitialLoad.current && data.personas) {
        const preferredMap = {};
        data.personas.forEach(p => {
          if (p?.conyugePreferido) {
            preferredMap[String(p._id)] = String(p.conyugePreferido);
          }
        });
        setActiveSpouseMap(prev => ({ ...preferredMap, ...prev }));
        isInitialLoad.current = false;
      }

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error en FamilyCanvas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rootId, expandedUpKeys, expandedDownKeys]);

  useEffect(() => {
    if (!rootId) {
      setFamilyData(null);
      setLayout(null);
      return;
    }
    loadFamilyData();
  }, [rootId, expandedUpKeys, expandedDownKeys, loadFamilyData]);

  useEffect(() => {
    if (!familyData?.rootPerson || !rootId) {
      setLayout(null);
      return;
    }

    const layoutCalculator = new FamilyLayout(
      familyData.personas,
      rootId,
      viewMode,
      spacing,
      {
        expandedUpKeys,
        expandedDownKeys,
        activeSpouseMap,
        grid: { columnGap: 150, rowStep: 200 }
      }
    );
    
    const newLayout = layoutCalculator.calculateLayout();
    setLayout(newLayout);
  }, [familyData, rootId, viewMode, spacing, expandedUpKeys, expandedDownKeys, activeSpouseMap, layoutVersion]);

  useLayoutEffect(() => {
    if (!layout || !viewportRef.current) return;
    
    if (viewportStateBeforeExpansion.current) {
      const { scale: s, tx: t1, ty: t2 } = viewportStateBeforeExpansion.current;
      setScale(s); setTx(t1); setTy(t2);
      viewportStateBeforeExpansion.current = null;
      return;
    }
    
    if (hasEverCentered.current) return;

    const vp = viewportRef.current.getBoundingClientRect();
    const rootNode = layout.nodes.find(n => n.tipo === 'family-group-root');
    
    if (rootNode) {
      const fitScale = Math.min(vp.width / (layout.bounds.width + 60), vp.height / (layout.bounds.height + 60), 1);
      const s = clamp(fitScale * INITIAL_ZOOM, MIN_SCALE, MAX_SCALE);
      
      // Con CSS zoom: centrar el nodo raíz en el viewport
      const rootCenterX = rootNode.x + rootNode.width / 2;
      const rootCenterY = rootNode.y + rootNode.height / 2;
      
      setScale(s);
      setTx(vp.width / 2 - rootCenterX * s);
      setTy(vp.height / 2 - rootCenterY * s);
    }
    hasEverCentered.current = true;
  }, [layout]);

  const onMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    panState.current = { panning: true, startX: e.clientX, startY: e.clientY, startTx: tx, startTy: ty };
  };
  const onMouseMove = (e) => {
    if (!panState.current.panning) return;
    setTx(panState.current.startTx + e.clientX - panState.current.startX);
    setTy(panState.current.startTy + e.clientY - panState.current.startY);
  };
  const endPan = () => { panState.current.panning = false; };

  // Detectar Firefox (no soporta CSS zoom correctamente)
  const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');

  const onWheel = (e) => {
    if (!layout || !e.altKey) return;
    e.preventDefault();
    
    const vpRect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - vpRect.left;
    const mouseY = e.clientY - vpRect.top;
    
    // Punto del mundo bajo el cursor ANTES del zoom
    const worldX = (mouseX - tx) / scale;
    const worldY = (mouseY - ty) / scale;
    
    // Calcular nuevo scale
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = clamp(scale * zoomFactor, MIN_SCALE, MAX_SCALE);
    
    // Calcular nuevo tx/ty para que el mismo punto del mundo quede bajo el cursor
    const newTx = mouseX - worldX * newScale;
    const newTy = mouseY - worldY * newScale;
    
    setScale(newScale);
    setTx(newTx);
    setTy(newTy);
  };

  const centerRoot = () => {
    if (!layout || !viewportRef.current) return;
    const rootNode = layout.nodes.find(n => n.tipo === 'family-group-root');
    const vp = viewportRef.current.getBoundingClientRect();
    if (rootNode) {
      const rootCenterX = rootNode.x + rootNode.width / 2;
      const rootCenterY = rootNode.y + rootNode.height / 2;
      setTx(vp.width / 2 - rootCenterX * scale);
      setTy(vp.height / 2 - rootCenterY * scale);
    }
  };

  const zoomIn = () => setScale(prev => clamp(prev * 1.2, MIN_SCALE, MAX_SCALE));
  const zoomOut = () => setScale(prev => clamp(prev / 1.2, MIN_SCALE, MAX_SCALE));

  useEffect(() => {
    if (!layout?.connections) { setRoutedEdges([]); return; }
    setRoutedEdges(processLayoutConnections(layout.connections, { curveRadius: 20 }));
  }, [layout]);

  const handleOpenPerfil = (id) => {
    if (!id) return;
    if (typeof onOpenPerfil === 'function') onOpenPerfil(id);
    setSelectedPersonId(null);
  };

  const saveViewportState = () => {
    viewportStateBeforeExpansion.current = { scale, tx, ty };
  };

  const onToggleUp = (e, groupKey, active, nodeTipo) => {
    e.stopPropagation(); e.preventDefault();
    saveViewportState();
    const clickedGen = getAbsoluteGenerationFromTipo(nodeTipo);
    if (!active) {
      setExpandedUpKeys(prev => {
        const next = new Set();
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          if (g === clickedGen) { if (areInSameLine(key, groupKey)) next.add(key); }
          else if (g < clickedGen) next.add(key);
          else if (g > clickedGen && areInSameLine(key, groupKey)) next.add(key);
        });
        next.add(groupKey);
        return next;
      });
    } else {
      setExpandedUpKeys(prev => {
        const kept = new Set();
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          if (g !== null && g < clickedGen) kept.add(key);
        });
        return kept;
      });
    }
  };

  const onToggleDown = (e, groupKey, active, nodeTipo) => {
    e.stopPropagation(); e.preventDefault();
    saveViewportState();
    const clickedGen = getAbsoluteGenerationFromTipo(nodeTipo);
    if (!active) {
      setExpandedDownKeys(prev => {
        const next = new Set();
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          if (g === clickedGen) { if (areInSameLine(key, groupKey)) next.add(key); }
          else if (g < clickedGen) next.add(key);
          else if (g > clickedGen && areInSameLine(key, groupKey)) next.add(key);
        });
        next.add(groupKey);
        return next;
      });
    } else {
      setExpandedDownKeys(prev => {
        const kept = new Set();
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          if (g !== null && g < clickedGen) kept.add(key);
        });
        return kept;
      });
    }
  };

  // RENDER
  if (loading) {
    return (
      <div style={styles.full(height)}>
        <Button disabled size="sm" className="flex items-center gap-2">
          <Spinner className="h-4 w-4" />Cargando..
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.full(height), flexDirection: 'column', color: '#d32f2f' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Error en FamilyCanvas</div>
        <div style={{ marginBottom: 8 }}>{error}</div>
        <button onClick={() => window.location.reload()} style={styles.buttonDanger}>Recargar</button>
      </div>
    );
  }

  if (!familyData?.rootPerson) {
    return <div style={styles.full(height)}><div>{rootId ? 'No se encontró la persona' : 'Selecciona una persona'}</div></div>;
  }

  if (!layout?.nodes) {
    return <div style={styles.full(height)}><div>Calculando layout…</div></div>;
  }

  const viewBox = `0 0 ${layout.bounds.width} ${layout.bounds.height}`;

  return (
    <div
      ref={viewportRef}
      style={styles.viewport(height)}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endPan}
      onMouseLeave={endPan}
      onWheel={onWheel}
    >
      {/* Controls */}
      <div style={styles.controls}>
        <button style={styles.ctrlBtn} onClick={zoomOut} title="Zoom out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button style={styles.ctrlBtn} onClick={zoomIn} title="Zoom in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <div style={styles.separator} />
        <button style={styles.ctrlBtn} onClick={centerRoot} title="Centrar raíz">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
      </div>

      {/* World Container - Posicionamiento con transform */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate(${tx}px, ${ty}px)`,
      }}>
        {/* World Content - Escalado con zoom (o transform para Firefox) */}
        <div style={isFirefox ? {
          width: layout.bounds.width,
          height: layout.bounds.height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        } : {
          width: layout.bounds.width,
          height: layout.bounds.height,
          zoom: scale,
        }}>
        {/* SVG Connections */}
        <svg viewBox={viewBox} width={layout.bounds.width} height={layout.bounds.height}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}>
          {routedEdges.map((e) => {
            if (!e.points || e.points.length < 2) return null;
            const isStraight = ['descendant-trunk','descendant-vertical','expansion-stub-horizontal','expansion-stub-vertical','expansion-stub-connector'].includes(e.meta?.role);
            const R = isStraight ? 0 : 20;
            let d = `M ${e.points[0].x} ${e.points[0].y}`;
            for (let i = 1; i < e.points.length; i++) {
              const prev = e.points[i-1], curr = e.points[i], next = e.points[i+1];
              if (next && R > 0) {
                const dPrev = { x: Math.sign(curr.x-prev.x), y: Math.sign(curr.y-prev.y) };
                const dNext = { x: Math.sign(next.x-curr.x), y: Math.sign(next.y-curr.y) };
                if (dPrev.x !== dNext.x || dPrev.y !== dNext.y) {
                  const dist1 = Math.hypot(curr.x-prev.x, curr.y-prev.y);
                  const dist2 = Math.hypot(next.x-curr.x, next.y-curr.y);
                  const r = Math.min(R, dist1/2, dist2/2);
                  d += ` L ${curr.x - dPrev.x*r} ${curr.y - dPrev.y*r}`;
                  d += ` Q ${curr.x} ${curr.y}, ${curr.x + dNext.x*r} ${curr.y + dNext.y*r}`;
                } else d += ` L ${curr.x} ${curr.y}`;
              } else d += ` L ${curr.x} ${curr.y}`;
            }
            return <path key={e.id} d={d} fill="none" stroke="#03030356" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>;
          })}
        </svg>

        <AnimatePresence mode="sync">
          {/* Family Groups */}
          {layout.nodes.filter(n => n.tipo?.startsWith('family-group') || n.tipo === 'family-group-root').map((node) => {
            const group = node.data;
            const groupKey = group?.groupKey || localPairKey(group?.persona?._id, group?.conyuge?._id);
            const isAncestorCol = /ancestor/.test(node.tipo);
            const isDescendantCol = !isAncestorCol && node.tipo !== 'family-group-root';
            const isEmptyCard = group?.isEmpty || group?.isEmptyCard;
            const hasChildren = Boolean(group?.hijos?.length || group?.persona?.hijos?.length || group?.conyuge?.hijos?.length);
            const upActive = expandedUpKeys.has(groupKey);
            const downActive = expandedDownKeys.has(groupKey);
            const showUp = isAncestorCol && node.hasExpandButton && !isEmptyCard;
            const showDown = isDescendantCol && hasChildren && !isEmptyCard;

            return (
              <motion.div key={`family-${groupKey}-${node.id}-${layoutVersion}`}
                variants={isEmptyCard ? emptyCardVariants : itemVariants}
                initial="initial" animate="animate" exit="exit"
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  overflow: 'visible',
                  zIndex: node.tipo === 'family-group-root' ? 12 : 7,
                }}>
                <FamilyCard
                  persona={group.persona}
                  conyuge={group.conyuge}
                  hijos={group.hijos}
                  isEmpty={isEmptyCard}
                  targetPersonId={group.targetPersonId}
                  leftControl={showDown ? <CircleButton side="left" active={downActive} onClick={(e) => onToggleDown(e, groupKey, downActive, node.tipo)}/> : null}
                  rightControl={showUp ? <CircleButton side="right" active={upActive} onClick={(e) => onToggleUp(e, groupKey, upActive, node.tipo)}/> : null}
                  controlSize={32}
                  onAgregarPadre={(id) => handleAgregarPadre(id, familyData?.personas?.find(p => p._id === id)?.nombre || 'Persona')}
                  onAgregarMadre={(id) => handleAgregarMadre(id, familyData?.personas?.find(p => p._id === id)?.nombre || 'Persona')}
                  onAgregarConyuge={handleAgregarConyuge}
                  onPersonClick={(id) => setSelectedPersonId(id)}
                  layout={viewMode}
                  isRoot={group.persona?._id === rootId}
                  todosConyuges={group.todosConyuges || []}
                  conyugeActivo={group.conyugeActivo || null}
                  onCambiarConyuge={handleCambiarConyuge}
                  hijosFilteredByUnion={group.hijos}
                />
              </motion.div>
            );
          })}

          {/* Add Child Cards */}
          {layout.nodes.filter(n => n.tipo === 'add-child-card').map((node) => (
            <motion.div key={`add-child-${node.id}`} variants={itemVariants} initial="initial" animate="animate" exit="exit"
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                zIndex: 5,
              }}>
              <AgregarHijoCard personaId={node.data.personaId} personaNombre={node.data.personaNombre}
                onAgregarHijo={(pId, pNombre) => handleAgregarHijo(pId, pNombre, node.data.conyugeId)}/>
            </motion.div>
          ))}

          {/* Person Cards */}
          {layout.nodes.filter(n => n.data?._id && !n.tipo?.startsWith('family-group') && n.tipo !== 'add-child-card').map((node) => (
            <motion.div key={`person-${node.id}`} variants={itemVariants} initial="initial" animate="animate" exit="exit"
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                zIndex: 6,
              }}>
              <PersonCard persona={node.data} isRoot={node.id === rootId} onClick={() => setSelectedPersonId(node.data._id)} layout={viewMode}/>
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
      </div>

      <PersonDetailPanel personaId={selectedPersonId} isOpen={!!selectedPersonId} onClose={() => setSelectedPersonId(null)}
        personasApi={personasApi} toAPI={toAPI} onOpenPerfil={onOpenPerfil}/>

      <AgregarPadrePanel open={panelAgregar.open} onClose={() => setPanelAgregar({ open: false, targetPersonId: null, targetPersonName: null, tipo: null, hijosComunes: [], padreId: null })}
        targetPersonId={panelAgregar.targetPersonId} targetPersonName={panelAgregar.targetPersonName}
        tipo={panelAgregar.tipo} hijosComunes={panelAgregar.hijosComunes} padreId={panelAgregar.padreId}
        onSuccess={handlePadreAgregado} onExpandParents={handleExpandParentGroup}/>
    </div>
  );
}

const styles = {
  full: (h) => ({ width: '100%', height: typeof h === 'number' ? `${h}px` : h, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', backgroundColor: '#fafafa', borderRadius: 8 }),
  viewport: (h) => ({ position: 'relative', width: '100%', height: typeof h === 'number' ? `${h}px` : h, background: '#a4c8b9bd', overflow: 'hidden', border: '1px solid #ddd', borderRadius: 8, userSelect: 'none', cursor: 'grab' }),
  controls: { position: 'absolute', left: 16, top: 35, zIndex: 200, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: 10, padding: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  ctrlBtn: { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: '#fff', color: '#374151', cursor: 'pointer' },
  separator: { width: 1, height: 24, backgroundColor: '#e5e7eb', margin: '0 4px' },
  buttonDanger: { padding: '8px 16px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
};