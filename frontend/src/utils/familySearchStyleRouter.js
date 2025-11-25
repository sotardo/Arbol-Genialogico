// src/utils/familySearchStyleRouter_FINAL.js
// Convierte los points de FamilyLayout a paths SVG estilo FamilySearch

/**
 * Convierte un array de puntos en un path SVG con curvas suaves
 * @param {Array} points - Array de {x, y}
 * @param {number} curveRadius - Radio de las curvas en esquinas
 * @returns {string} Path SVG
 */
export function pointsToFamilySearchPath(points, curveRadius = 20) {
  if (!points || points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = i < points.length - 1 ? points[i + 1] : null;

    if (next) {
      // Calcular direcciones
      const dirFromPrev = {
        x: Math.sign(current.x - prev.x),
        y: Math.sign(current.y - prev.y)
      };
      const dirToNext = {
        x: Math.sign(next.x - current.x),
        y: Math.sign(next.y - current.y)
      };

      // Detectar si es una esquina (cambio de dirección)
      const isCorner = (dirFromPrev.x !== dirToNext.x) || (dirFromPrev.y !== dirToNext.y);

      if (isCorner) {
        // Calcular distancias para ajustar el radio
        const distToCurrent = Math.sqrt(
          Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
        );
        const distToNext = Math.sqrt(
          Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
        );

        // Radio ajustado para no exceder las distancias
        const maxRadius = Math.min(curveRadius, distToCurrent / 2, distToNext / 2);

        if (maxRadius > 1) {
          // Puntos antes y después de la esquina
          const beforeCorner = {
            x: current.x - dirFromPrev.x * maxRadius,
            y: current.y - dirFromPrev.y * maxRadius
          };

          const afterCorner = {
            x: current.x + dirToNext.x * maxRadius,
            y: current.y + dirToNext.y * maxRadius
          };

          // Línea hasta antes de la esquina, luego curva cuadrática
          path += ` L ${beforeCorner.x} ${beforeCorner.y}`;
          path += ` Q ${current.x} ${current.y}, ${afterCorner.x} ${afterCorner.y}`;
        } else {
          // Si el radio es muy pequeño, usar línea recta
          path += ` L ${current.x} ${current.y}`;
        }
      } else {
        // No es esquina, línea recta
        path += ` L ${current.x} ${current.y}`;
      }
    } else {
      // Último punto
      path += ` L ${current.x} ${current.y}`;
    }
  }

  return path;
}

/**
 * Procesa las conexiones del layout y las convierte a paths SVG
 * @param {Array} connections - Array de conexiones con points
 * @param {Object} options - Opciones de estilo
 * @returns {Array} Array de objetos {id, path, points, style}
 */
export function processLayoutConnections(connections, options = {}) {
  const {
    curveRadius = 20,
    defaultStroke = '#9ca3af',
    defaultStrokeWidth = 2
  } = options;

  if (!connections || !Array.isArray(connections)) {
    console.warn('⚠️ processLayoutConnections: connections no es un array válido');
    return [];
  }

  console.log(`🎨 Procesando ${connections.length} conexiones...`);

  const processed = connections.map((conn, index) => {
    if (!conn.points || conn.points.length < 2) {
      console.warn(`⚠️ Conexión ${index} sin points válidos:`, conn);
      return null;
    }

    // Convertir points a path SVG con curvas
    const path = pointsToFamilySearchPath(conn.points, curveRadius);

    if (!path) {
      console.warn(`⚠️ No se pudo generar path para conexión ${index}`);
      return null;
    }

    // Determinar estilo según el rol
    const role = conn.meta?.role || 'generic';
    const style = {
      stroke: defaultStroke,
      strokeWidth: defaultStrokeWidth,
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    };

    // Estilos especiales según el tipo de conexión
    if (role === 'ancestor-individual') {
      style.stroke = '#6366f1'; // Azul para ancestros
      style.strokeWidth = 2.5;
    } else if (role === 'descendant') {
      style.stroke = '#10b981'; // Verde para descendientes
      style.strokeWidth = 2;
    }

    return {
      id: `conn_${index}`,
      path,
      points: conn.points,
      meta: conn.meta,
      style
    };
  }).filter(Boolean);

  console.log(`✅ ${processed.length} conexiones procesadas exitosamente`);

  return processed;
}

/**
 * Versión simplificada para debugging
 */
export function debugConnections(connections) {
  if (!connections || !Array.isArray(connections)) return [];

  console.log('🐛 DEBUG MODE: Generando líneas directas simples');

  return connections.map((conn, index) => {
    if (!conn.points || conn.points.length < 2) return null;

    const start = conn.points[0];
    const end = conn.points[conn.points.length - 1];

    return {
      id: `debug_${index}`,
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      points: [start, end],
      style: {
        stroke: '#ef4444',
        strokeWidth: 3,
        fill: 'none',
        strokeDasharray: '5,5'
      }
    };
  }).filter(Boolean);
}