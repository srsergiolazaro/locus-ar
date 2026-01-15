/**
 * 🚀 Moonshot: Simple incremental Delaunay Triangulation (Bowyer-Watson)
 *
 * Used to create a topological mesh covering the image target features.
 */
export function triangulate(points) {
    if (points.length < 3)
        return [];
    // 1. Create a super-triangle that contains all points
    // Find min/max bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX)
            minX = p.x;
        if (p.x > maxX)
            maxX = p.x;
        if (p.y < minY)
            minY = p.y;
        if (p.y > maxY)
            maxY = p.y;
    }
    const dx = maxX - minX;
    const dy = maxY - minY;
    const deltaMax = Math.max(dx, dy);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    // A triangle large enough to cover all points
    const p1 = { x: midX - 20 * deltaMax, y: midY - deltaMax };
    const p2 = { x: midX, y: midY + 20 * deltaMax };
    const p3 = { x: midX + 20 * deltaMax, y: midY - deltaMax };
    let triangles = [
        { p1, p2, p3, indices: [-1, -2, -3] }
    ];
    // 2. Add points one by one
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const badTriangles = [];
        for (const t of triangles) {
            if (isInCircumcircle(p, t)) {
                badTriangles.push(t);
            }
        }
        const polygon = [];
        for (const t of badTriangles) {
            const edges = [
                { a: t.p1, b: t.p2, i1: t.indices[0], i2: t.indices[1] },
                { a: t.p2, b: t.p3, i1: t.indices[1], i2: t.indices[2] },
                { a: t.p3, b: t.p1, i1: t.indices[2], i2: t.indices[0] }
            ];
            for (const edge of edges) {
                let isShared = false;
                for (const t2 of badTriangles) {
                    if (t === t2)
                        continue;
                    if (isSameEdge(edge, t2)) {
                        isShared = true;
                        break;
                    }
                }
                if (!isShared) {
                    polygon.push(edge);
                }
            }
        }
        // Remove bad triangles
        triangles = triangles.filter(t => !badTriangles.includes(t));
        // Add new triangles from polygon edges to point p
        for (const edge of polygon) {
            triangles.push({
                p1: edge.a,
                p2: edge.b,
                p3: p,
                indices: [edge.i1, edge.i2, i]
            });
        }
    }
    // 3. Remove triangles that share vertices with the super-triangle
    return triangles.filter(t => {
        return t.indices[0] >= 0 && t.indices[1] >= 0 && t.indices[2] >= 0;
    }).map(t => t.indices);
}
function isInCircumcircle(p, t) {
    const x1 = t.p1.x, y1 = t.p1.y;
    const x2 = t.p2.x, y2 = t.p2.y;
    const x3 = t.p3.x, y3 = t.p3.y;
    const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    const centerX = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
    const centerY = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
    const radiusSq = (x1 - centerX) * (x1 - centerX) + (y1 - centerY) * (y1 - centerY);
    const distSq = (p.x - centerX) * (p.x - centerX) + (p.y - centerY) * (p.y - centerY);
    return distSq <= radiusSq;
}
function isSameEdge(edge, triangle) {
    const tEdges = [
        [triangle.indices[0], triangle.indices[1]],
        [triangle.indices[1], triangle.indices[2]],
        [triangle.indices[2], triangle.indices[0]]
    ];
    for (const te of tEdges) {
        if ((edge.i1 === te[0] && edge.i2 === te[1]) || (edge.i1 === te[1] && edge.i2 === te[0])) {
            return true;
        }
    }
    return false;
}
/**
 * Extract edges from triangles for Mass-Spring logic
 */
export function getEdges(triangles) {
    const edgeSet = new Set();
    const edges = [];
    for (const t of triangles) {
        const pairs = [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];
        for (const pair of pairs) {
            const low = Math.min(pair[0], pair[1]);
            const high = Math.max(pair[0], pair[1]);
            const key = `${low}-${high}`;
            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                edges.push([low, high]);
            }
        }
    }
    return edges;
}
