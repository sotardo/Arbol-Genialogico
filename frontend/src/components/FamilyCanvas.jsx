// src/components/FamilyCanvas.jsx - VERSIÓN CON CARDS VACÍAS EN TODAS LAS GENERACIONES
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
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

// Variantes de animación SOLO para nodos que aparecen por expansión
const itemVariants = {
  initial: { 
    opacity: 0, 
    y: -8,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2
    }
  }
};
// 🔥 Variante especial para cards vacías - aparecen inmediatamente sin animación
const emptyCardVariants = {
  initial: { 
    opacity: 1,    // Ya visible desde el inicio
    y: 0,
    scale: 1
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.1  // Transición mínima
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2
    }
  }
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
  const worldRef = useRef(null); 
  
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;
const INITIAL_ZOOM = 1.8;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey) {
        e.preventDefault();
      }
    };

    const handleWheel = (e) => {
      if (e.altKey) {
        e.preventDefault();
      }
    };

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
      const count = (tipo.match(/great/g) || []).length;
      return 2 + count;
    }
    
    if (tipo === 'family-group-child') return -1;
    if (tipo === 'family-group-grandchild') return -2;
    if (tipo.startsWith('family-group-great') && tipo.includes('grandchild')) {
      const count = (tipo.match(/great/g) || []).length;
      return -(2 + count);
    }
    
    return 0;
  };

  const getAbsoluteGenerationFromTipo = (tipo) => {
    const idx = genIndexFromTipo(tipo);
    return Math.abs(idx);
  };

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
    if (gen1 === null || gen2 === null) return false;

    if (gen1 === gen2) return false;

    const [ancestorKey, descendantKey] = gen1 > gen2 ? [key1, key2] : [key2, key1];
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
          
          if (!visited.has(padreId)) {
            currentId = padreId;
            foundParent = true;
            break;
          }
        }
        
        if (!foundParent) break;
      }
    }

    return false;
  };

  const handleAgregarPadre = (targetPersonId, targetPersonName) => {
    setPanelAgregar({
      open: true,
      targetPersonId,
      targetPersonName,
      tipo: 'padre'
    });
  };

  const handleAgregarMadre = (targetPersonId, targetPersonName) => {
    setPanelAgregar({
      open: true,
      targetPersonId,
      targetPersonName,
      tipo: 'madre'
    });
  };

  const handleAgregarConyuge = (personaId, personaNombre, hijosIds) => {
    setPanelAgregar({
      open: true,
      targetPersonId: personaId,
      targetPersonName: personaNombre,
      tipo: 'conyuge',
      hijosComunes: hijosIds || []
    });
  };

  const handleAgregarHijo = (personaId, personaNombre, conyugeId) => {
    setPanelAgregar({
      open: true,
      targetPersonId: personaId,
      targetPersonName: personaNombre,
      tipo: 'hijo',
      hijosComunes: [],
      padreId: conyugeId || null
    });
  };

  // ✅ NUEVA FUNCIÓN: Auto-expandir rama al agregar padres
  const handleExpandParentGroup = (groupKey) => {
    if (!groupKey) return;
    setExpandedUpKeys(prev => {
      const next = new Set(prev);
      next.add(groupKey);
      return next;
    });
  };

  const handlePadreAgregado = () => {
    setPanelAgregar({ 
      open: false, 
      targetPersonId: null, 
      targetPersonName: null, 
      tipo: null 
    });
    
    if (!rootId) return;
    
    const loadFamily = async () => {
      setLoading(true);
      try {
        const data = await familyLoader.loadFamilyNeighborhood(rootId, {
          maxUp: computeUpBudget(),
          maxDown: computeDownBudget(),
          expandedUpKeys,
          expandedDownKeys
        });

        setFamilyData(data);

        if (data.error) {
          setError(data.error);
        } else if (data.rootPerson) {
          const layoutCalculator = new FamilyLayout(
            data.personas,
            rootId,
            viewMode,
            spacing,
            {
              expandedUpKeys,
              expandedDownKeys,
              grid: {
                columnGap: 100,
                rowStep: 200
              }
            }
          );
          const layoutResult = layoutCalculator.calculateLayout();
          setLayout(layoutResult);
        }
      } catch (err) {
        console.error('Error recargando después de agregar:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFamily();
  };

  useEffect(() => {
    if (!rootId) {
      setFamilyData(null);
      setLayout(null);
      return;
    }

    const loadFamily = async () => {
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

        if (data.error) {
          setError(data.error);
        } else if (data.rootPerson) {
          const layoutCalculator = new FamilyLayout(
            data.personas,
            rootId,
            viewMode,
            spacing,
            {
              expandedUpKeys,
              expandedDownKeys,
              grid: {
                columnGap: 150,
                rowStep: 200
              }
            }
          );
          const layoutResult = layoutCalculator.calculateLayout();
          setLayout(layoutResult);
        }
      } catch (err) {
        console.error('Error completo en FamilyCanvas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFamily();
  }, [rootId, viewMode, spacing, expandedUpKeys, expandedDownKeys]);

  useLayoutEffect(() => {
    if (!layout || !viewportRef.current) return;
    
    if (viewportStateBeforeExpansion.current) {
      const { scale: savedScale, tx: savedTx, ty: savedTy } = viewportStateBeforeExpansion.current;
      setScale(savedScale);
      setTx(savedTx);
      setTy(savedTy);
      viewportStateBeforeExpansion.current = null;
      return;
    }
    
    if (hasEverCentered.current) return;

    const vp = viewportRef.current.getBoundingClientRect();
    const padding = 60;

    const rootNode = layout.nodes.find(n => n.tipo === 'family-group-root');
    
    if (rootNode) {
      const fitScale = Math.min(
        vp.width / (layout.bounds.width + padding),
        vp.height / (layout.bounds.height + padding),
        1
      );
      
      const s = clamp(fitScale * INITIAL_ZOOM, MIN_SCALE, MAX_SCALE);

      const worldCx = rootNode.x + rootNode.width / 2;
      const worldCy = rootNode.y + rootNode.height / 2;
      const nx = vp.width / 2 - s * worldCx;
      const ny = vp.height / 2 - s * worldCy;

      setScale(s);
      setTx(nx);
      setTy(ny);
    } else {
      const fitScale = Math.min(
        vp.width / (layout.bounds.width + padding),
        vp.height / (layout.bounds.height + padding),
        1
      );
const s = clamp(fitScale * INITIAL_ZOOM, MIN_SCALE, MAX_SCALE);
      const nx = (vp.width - s * layout.bounds.width) / 2;
      const ny = (vp.height - s * layout.bounds.height) / 2;

      setScale(s);
      setTx(nx);
      setTy(ny);
    }

    hasEverCentered.current = true;
  }, [layout]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;

    const target = e.target;
    if (target.closest('button') || target.tagName === 'BUTTON') {
      return;
    }

    panState.current = {
      panning: true,
      startX: e.clientX,
      startY: e.clientY,
      startTx: tx,
      startTy: ty
    };
  };

  const onMouseMove = (e) => {
    if (!panState.current.panning) return;
    const dx = e.clientX - panState.current.startX;
    setTx(panState.current.startTx + dx);
    const dy = e.clientY - panState.current.startY;
    setTy(panState.current.startTy + dy);
  };

  const endPan = () => { panState.current.panning = false; };

  const onWheel = (e) => {
    if (!layout) return;
    if (e.altKey) {
      e.preventDefault();
      const vpRect = viewportRef.current.getBoundingClientRect();
      const cx = e.clientX - vpRect.left;
      const cy = e.clientY - vpRect.top;
      const wheelDir = e.deltaY > 0 ? -1 : 1;
      const zoomFactor = 1 + 0.12 * wheelDir;
      const newScale = clamp(scale * zoomFactor, MIN_SCALE, MAX_SCALE);
      const worldX = (cx - tx) / scale;
      const worldY = (cy - ty) / scale;
      const ntx = cx - worldX * newScale;
      const nty = cy - worldY * newScale;
      setScale(newScale);
      setTx(ntx);
      setTy(nty);
    }
  };

  const centerRoot = () => {
    if (!layout || !viewportRef.current) return;
    const rootNode = layout.nodes.find(n => n.tipo === 'family-group-root');
    const vp = viewportRef.current.getBoundingClientRect();
    if (!rootNode) return;
    const worldCx = rootNode.x + rootNode.width / 2;
    const worldCy = rootNode.y + rootNode.height / 2;
    const nx = vp.width / 2 - scale * worldCx;
    const ny = vp.height / 2 - scale * worldCy;
    setTx(nx);
    setTy(ny);
  };

  const resetView = () => {
    if (!layout || !viewportRef.current) return;
    const vp = viewportRef.current.getBoundingClientRect();
    const padding = 60;
    const fitScale = Math.min(
      vp.width / (layout.bounds.width + padding),
      vp.height / (layout.bounds.height + padding),
      1
    );
    const s = clamp(fitScale, MIN_SCALE, MAX_SCALE);
    const nx = (vp.width - s * layout.bounds.width) / 2;
    const ny = (vp.height - s * layout.bounds.height) / 2;
    setScale(s);
    setTx(nx);
    setTy(ny);
  };

  const zoomIn = () => setScale(prev => clamp(prev * 1.2, MIN_SCALE, MAX_SCALE));
  const zoomOut = () => setScale(prev => clamp(prev / 1.2, MIN_SCALE, MAX_SCALE));

  useEffect(() => {
    if (!layout?.nodes || !layout?.connections) {
      setRoutedEdges([]);
      return;
    }

    const fsConnections = processLayoutConnections(layout.connections, {
      curveRadius: 20
    });

    setRoutedEdges(fsConnections);
  }, [layout]);

  const handleOpenPerfil = (id) => {
    if (!id) return;
    if (typeof onOpenPerfil === 'function') onOpenPerfil(id);
    setSelectedPersonId(null);
  };

  // Guardar estado del viewport antes de expansión
  const saveViewportState = () => {
    const worldDiv = viewportRef.current?.querySelector('[style*="transform"]');
    if (worldDiv) {
      const currentTransform = worldDiv.style.transform;
      const match = currentTransform.match(/translate\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)\s*scale\((-?\d+\.?\d*)\)/);
      if (match) {
        const [, currentTx, currentTy, currentScale] = match;
        viewportStateBeforeExpansion.current = {
          scale: parseFloat(currentScale),
          tx: parseFloat(currentTx),
          ty: parseFloat(currentTy)
        };
      }
    }
  };

  const onToggleUp = (e, groupKey, active, nodeTipo) => {
    e.stopPropagation();
    e.preventDefault();
    
    saveViewportState();
    
    const clickedGeneration = getAbsoluteGenerationFromTipo(nodeTipo);

    if (!active) {
      setExpandedUpKeys(prev => {
        const next = new Set();
        
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          
          if (g === clickedGeneration) {
            if (areInSameLine(key, groupKey)) {
              next.add(key);
            }
          } 
          else if (g < clickedGeneration) {
            next.add(key);
          }
          else if (g > clickedGeneration && areInSameLine(key, groupKey)) {
            next.add(key);
          }
        });
        
        next.add(groupKey);
        return next;
      });
    } else {
      setExpandedUpKeys(prev => {
        const kept = new Set();
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          if (g !== null && g < clickedGeneration) {
            kept.add(key);
          }
        });
        return kept;
      });
    }
  };

  const onToggleDown = (e, groupKey, active, nodeTipo) => {
    e.stopPropagation();
    e.preventDefault();
    
    saveViewportState();
    
    const clickedGeneration = getAbsoluteGenerationFromTipo(nodeTipo);

    if (!active) {
      setExpandedDownKeys(prev => {
        const next = new Set();
        
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          
          if (g === clickedGeneration) {
            if (areInSameLine(key, groupKey)) {
              next.add(key);
            }
          } 
          else if (g < clickedGeneration) {
            next.add(key);
          }
          else if (g > clickedGeneration && areInSameLine(key, groupKey)) {
            next.add(key);
          }
        });
        
        next.add(groupKey);
        return next;
      });
    } else {
      setExpandedDownKeys(prev => {
        const kept = new Set();
        prev.forEach(key => {
          const g = generationOfGroupKey(key, layout);
          if (g !== null && g < clickedGeneration) {
            kept.add(key);
          }
        });
        return kept;
      });
    }
  };

  if (loading) {
    return (
      <div style={styles.full(height)}>
        <div className="flex flex-col items-center gap-4 text-gray-700">
          <Button disabled size="sm" className="flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            Cargando..
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.full(height), flexDirection: 'column', color: '#d32f2f' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Error en FamilyCanvas</div>
        <div style={{ marginBottom: 8 }}>{error}</div>
        <button onClick={() => window.location.reload()} style={styles.buttonDanger}>Recargar página</button>
      </div>
    );
  }

  if (!familyData?.rootPerson) {
    return (<div style={styles.full(height)}><div>{rootId ? 'No se encontró la persona' : 'Selecciona una persona'}</div></div>);
  }

  if (!layout?.nodes) {
    return (<div style={styles.full(height)}><div>Calculando layout…</div></div>);
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
      <div style={styles.controls}>
        <button 
          style={styles.ctrlBtn} 
          onClick={zoomOut} 
          title="Zoom out"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        
        <button 
          style={styles.ctrlBtn} 
          onClick={zoomIn} 
          title="Zoom in"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>

        <div style={styles.separator} />
        
        <button 
          style={styles.ctrlBtn} 
          onClick={centerRoot} 
          title="Centrar raíz"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        
        <div style={styles.separator} />

        <button 
          style={styles.ctrlBtn} 
          onClick={centerRoot} 
          title="Centrar ubicación"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: layout.bounds.width,
          height: layout.bounds.height,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <svg
          viewBox={viewBox}
          width={layout.bounds.width}
          height={layout.bounds.height}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'visible',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {layout.nodes
            .filter(node => node.hasStub && node.stubStart && node.stubEnd)
            .map((node, idx) => (
              <line
                key={`stub-${node.id}-${idx}`}
                x1={node.stubStart.x}
                y1={node.stubStart.y}
                x2={node.stubEnd.x}
                y2={node.stubEnd.y}
                stroke="#03030356"
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          {routedEdges.map((e) => {
            if (!e.points || e.points.length < 2) return null;

            const isStraightLine = 
              e.meta?.role === 'descendant-trunk' || 
              e.meta?.role === 'descendant-vertical' ||
              e.meta?.role === 'expansion-stub-horizontal' ||
              e.meta?.role === 'expansion-stub-vertical' ||
              e.meta?.role === 'expansion-stub-connector';

            const CURVE_RADIUS = isStraightLine ? 0 : 20;

            let d = `M ${e.points[0].x} ${e.points[0].y}`;

            for (let i = 1; i < e.points.length; i++) {
              const prev = e.points[i - 1];
              const current = e.points[i];
              const next = i < e.points.length - 1 ? e.points[i + 1] : null;

              if (next && CURVE_RADIUS > 0) {
                const dirFromPrev = {
                  x: Math.sign(current.x - prev.x),
                  y: Math.sign(current.y - prev.y)
                };
                const dirToNext = {
                  x: Math.sign(next.x - current.x),
                  y: Math.sign(next.y - current.y)
                };

                const isCorner = (dirFromPrev.x !== dirToNext.x) || (dirFromPrev.y !== dirToNext.y);

                if (isCorner) {
                  const distToCurrent = Math.sqrt(
                    Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
                  );
                  const distToNext = Math.sqrt(
                    Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
                  );

                  const maxRadius = Math.min(CURVE_RADIUS, distToCurrent / 2, distToNext / 2);

                  const beforeCorner = {
                    x: current.x - dirFromPrev.x * maxRadius,
                    y: current.y - dirFromPrev.y * maxRadius
                  };

                  const afterCorner = {
                    x: current.x + dirToNext.x * maxRadius,
                    y: current.y + dirToNext.y * maxRadius
                  };

                  d += ` L ${beforeCorner.x} ${beforeCorner.y}`;
                  d += ` Q ${current.x} ${current.y}, ${afterCorner.x} ${afterCorner.y}`;
                } else {
                  d += ` L ${current.x} ${current.y}`;
                }
              } else {
                d += ` L ${current.x} ${current.y}`;
              }
            }
            
            return (
              <path
                key={e.id}
                d={d}
                fill="none"
                stroke="#03030356"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

<AnimatePresence mode="sync">
          {/* 🔥 FIX: Renderizado explícito separado por tipo de nodo */}
          
          {/* 1️⃣ FAMILY GROUPS (incluidas cards vacías) */}
          {layout.nodes
            .filter(node => node.tipo?.startsWith('family-group') || node.tipo === 'family-group-root')
            .map((node) => {
              const group = node.data;
              const groupKey = group?.groupKey || localPairKey(group?.persona?._id, group?.conyuge?._id);
              const isAncestorCol = /ancestor/.test(node.tipo);
              const isDescendantCol = !isAncestorCol && node.tipo !== 'family-group-root';
              
              // 🔥 Detectar cards vacías
              const isEmptyCard = group?.isEmpty === true || group?.isEmptyCard === true;
              
              const hasChildren = Boolean(
                (group?.hijos && group.hijos.length) ||
                (group?.persona?.hijos && group.persona.hijos.length) ||
                (group?.conyuge?.hijos && group.conyuge?.hijos.length)
              );
              
              const upActive = expandedUpKeys.has(groupKey);
              const downActive = expandedDownKeys.has(groupKey);

              // Botón de expansión hacia arriba SOLO en columnas de ancestros
              const shouldShowUpButton = isAncestorCol && node.hasExpandButton && !isEmptyCard;
              const shouldShowDownButton = isDescendantCol && hasChildren && !isEmptyCard;
              
              const nodeKey = `family-${groupKey}-${node.id}`;

              // 🔥 Crear los CircleButtons para pasar como props
              const rightControlBtn = shouldShowUpButton ? (
                <CircleButton
                  side="right"
                  title={upActive ? 'Contraer rama (−)' : 'Expandir 2 generaciones (+)'}
                  active={upActive}
                  onClick={(e) => onToggleUp(e, groupKey, upActive, node.tipo)}
                />
              ) : null;

              const leftControlBtn = shouldShowDownButton ? (
                <CircleButton
                  side="left"
                  title={downActive ? 'Contraer descendencia (−)' : 'Expandir descendencia (+)'}
                  active={downActive}
                  onClick={(e) => onToggleDown(e, groupKey, downActive, node.tipo)}
                />
              ) : null;

              return (
                <motion.div
                  key={nodeKey}
                  variants={isEmptyCard ? emptyCardVariants : itemVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  style={{
                    position: 'absolute',
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                    overflow: 'visible',
                    zIndex: node.tipo === 'family-group-root' ? 12 :
                           node.tipo === 'family-group-ancestor' ? 10 :
                           node.tipo === 'family-group-grandancestor' ? 9 :
                           node.tipo === 'family-group-greatancestor' ? 8 : 7,
                  }}
                >
                  <FamilyCard
                    persona={group.persona}
                    conyuge={group.conyuge}
                    hijos={group.hijos}
                    isEmpty={isEmptyCard}
                    targetPersonId={group.targetPersonId}
                    // ✅ Pasar botones como props para posicionamiento correcto
                    leftControl={leftControlBtn}
                    rightControl={rightControlBtn}
                    controlSize={32}
                    onAgregarPadre={(targetId) => {
                      const targetPerson = familyData?.personas?.find(p => p._id === targetId);
                      handleAgregarPadre(targetId, targetPerson?.nombre || 'Persona');
                    }}
                    onAgregarMadre={(targetId) => {
                      const targetPerson = familyData?.personas?.find(p => p._id === targetId);
                      handleAgregarMadre(targetId, targetPerson?.nombre || 'Persona');
                    }}
                    onAgregarConyuge={handleAgregarConyuge}
                    onPersonClick={(personaId) => setSelectedPersonId(personaId)}
                    layout={viewMode}
                    isRoot={group.persona?._id === rootId}
                  />
                </motion.div>
              );
            })}

          {/* 2️⃣ ADD CHILD CARDS */}
          {layout.nodes
            .filter(node => node.tipo === 'add-child-card')
            .map((node) => (
              <motion.div
                key={`add-child-${node.id}`}
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  zIndex: 5,
                }}
              >
                <AgregarHijoCard
                  personaId={node.data.personaId}
                  personaNombre={node.data.personaNombre}
                  onAgregarHijo={(pId, pNombre) => {
                    handleAgregarHijo(pId, pNombre, node.data.conyugeId);
                  }}
                />
              </motion.div>
            ))}

          {/* 3️⃣ PERSON CARDS INDIVIDUALES */}
          {layout.nodes
            .filter(node => 
              node.data && 
              typeof node.data === 'object' && 
              node.data._id &&
              !node.tipo?.startsWith('family-group') &&
              node.tipo !== 'family-group-root' &&
              node.tipo !== 'add-child-card'
            )
            .map((node) => (
              <motion.div
                key={`person-${node.id}`}
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  zIndex: 6,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                  willChange: 'transform',
                }}
              >
                <PersonCard
                  persona={node.data}
                  isRoot={node.id === rootId}
                  onClick={() => setSelectedPersonId(node.data._id)}
                  layout={viewMode}
                  style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
                />
              </motion.div>
            ))}

          {/* 4️⃣ NODOS DESCONOCIDOS (DEBUG) */}
          {layout.nodes
            .filter(node => 
              !node.tipo?.startsWith('family-group') &&
              node.tipo !== 'family-group-root' &&
              node.tipo !== 'add-child-card' &&
              !(node.data && typeof node.data === 'object' && node.data._id)
            )
            .map((node) => (
              <motion.div
                key={`unknown-${node.id}`}
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  border: '2px dashed orange',
                  backgroundColor: 'rgba(255,165,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  textAlign: 'center',
                }}
              >
                TIPO: {node.tipo}<br />ID: {node.id}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <PersonDetailPanel
        personaId={selectedPersonId}
        isOpen={!!selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
        personasApi={personasApi}
        toAPI={toAPI}
        onOpenPerfil={onOpenPerfil}
      />

      <AgregarPadrePanel
        open={panelAgregar.open}
        onClose={() => setPanelAgregar({ 
          open: false, 
          targetPersonId: null, 
          targetPersonName: null, 
          tipo: null,
          hijosComunes: [],
          padreId: null
        })}
        targetPersonId={panelAgregar.targetPersonId}
        targetPersonName={panelAgregar.targetPersonName}
        tipo={panelAgregar.tipo}
        hijosComunes={panelAgregar.hijosComunes} 
        padreId={panelAgregar.padreId} 
        onSuccess={handlePadreAgregado}
        onExpandParents={handleExpandParentGroup}
      />
    </div>
  );
}

const styles = {
  full: (h) => ({
    width: '100%',
    height: typeof h === 'number' ? `${h}px` : h,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ddd',
    backgroundColor: '#fafafa',
    borderRadius: 8
  }),
  viewport: (h) => ({
    position: 'relative',
    width: '100%',
    height: typeof h === 'number' ? `${h}px` : h,
    background: '#a4c8b9bd',
    overflow: 'hidden',
    border: '1px solid #ddd',
    borderRadius: 8,
    userSelect: 'none',
    touchAction: 'pan-y pan-x',
    cursor: 'grab',
  }),
  controls: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 6,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: 'none',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: 0,
    outline: 'none',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
    margin: '0 4px',
  },
  buttonDanger: {
    padding: '8px 16px',
    background: '#d32f2f',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
  }
};