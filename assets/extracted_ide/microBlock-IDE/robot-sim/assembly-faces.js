(function (root) {
    'use strict';
    function hasBrepFaces(geometry) {
        return !!(geometry && geometry.userData && Array.isArray(geometry.userData.brepFaces) && geometry.userData.brepFaces.length);
    }
    const boundaryCache = new WeakMap();
    function openBoundaries(T, geometry) {
        if (boundaryCache.has(geometry)) return boundaryCache.get(geometry);
        const position=geometry.attributes.position, index=geometry.index, count=index?index.count:position.count;
        const welded=new Map(), ids=new Map(), points=[], edges=new Map();
        const vertex=i=>{
            if(ids.has(i))return ids.get(i);
            const p=new T.Vector3().fromBufferAttribute(position,i),key=p.toArray().map(v=>Math.round(v*1e7)).join(',');
            if(!welded.has(key)){welded.set(key,points.length);points.push(p);}
            ids.set(i,welded.get(key));return ids.get(i);
        };
        for(let i=0;i<count;i+=3){
            const v=[0,1,2].map(j=>vertex(index?index.getX(i+j):i+j));
            for(let j=0;j<3;j++){
                const a=v[j],b=v[(j+1)%3];if(a===b)continue;
                const key=Math.min(a,b)+':'+Math.max(a,b);
                if(edges.has(key))edges.get(key).count++;
                else edges.set(key,{a,b,count:1,triangle:i/3});
            }
        }
        const adjacency=new Map();
        edges.forEach(edge=>{if(edge.count!==1)return;[edge.a,edge.b].forEach(id=>{if(!adjacency.has(id))adjacency.set(id,[]);adjacency.get(id).push(edge);});});
        const visited=new Set(),loops=[];
        adjacency.forEach((_edges,start)=>{
            if(visited.has(start))return;
            const queue=[start],component=[];
            while(queue.length){const id=queue.pop();if(visited.has(id))continue;visited.add(id);component.push(id);adjacency.get(id).forEach(e=>queue.push(e.a===id?e.b:e.a));}
            if(component.length<3||component.some(id=>adjacency.get(id).length!==2))return;
            const order=[start];let previous=start,current=adjacency.get(start)[0];current=current.a===start?current.b:current.a;
            while(current!==start){order.push(current);const edge=adjacency.get(current).find(e=>(e.a===current?e.b:e.a)!==previous);previous=current;current=edge.a===current?edge.b:edge.a;}
            const first=adjacency.get(start)[0];if(first.a===order[0]&&first.b===order[1])order.reverse();
            const ring=order.map(id=>points[id]),normal=new T.Vector3(),center=new T.Vector3();
            ring.forEach((p,i)=>{normal.add(p.clone().cross(ring[(i+1)%ring.length]));center.add(p);});
            if(normal.lengthSq()<1e-24)return;normal.normalize();center.divideScalar(ring.length);
            const size=new T.Box3().setFromPoints(ring).getSize(new T.Vector3()).length();
            if(ring.some(p=>Math.abs(p.clone().sub(center).dot(normal))>Math.max(size*1e-5,1e-7)))return;
            const u=ring[1].clone().sub(ring[0]).normalize(),v=normal.clone().cross(u),contour=ring.map(p=>new T.Vector2(p.dot(u),p.dot(v)));
            const triangles=T.ShapeUtils.triangulateShape(contour,[]),vertices=[];
            triangles.forEach(triangle=>triangle.forEach(i=>vertices.push(...ring[i].toArray())));
            if(!vertices.length)return;
            loops.push({key:'boundary-'+loops.length,kind:'plane',center,normal,vertices,ring,edgeSelection:true,triangle:first.triangle});
        });
        boundaryCache.set(geometry,loops);return loops;
    }
    // Face references stay in the part's local coordinates as it moves.
    root.AssemblyFaces = {
        openBoundaries,
        boundaryHit: function(T, mesh, ray, camera, height, obstruction) {
            let best=null;
            const onRay=new T.Vector3(),onEdge=new T.Vector3();
            openBoundaries(T,mesh.geometry).forEach(loop=>loop.ring.forEach((point,i)=>{
                const a=mesh.localToWorld(point.clone()),b=mesh.localToWorld(loop.ring[(i+1)%loop.ring.length].clone());
                const distanceSq=ray.distanceSqToSegment(a,b,onRay,onEdge);
                const depth=onEdge.clone().sub(camera.position).dot(camera.getWorldDirection(new T.Vector3()));
                if(depth<=0)return;
                const tolerance=2*depth*Math.tan(camera.fov*Math.PI/360)*5/Math.max(1,height);
                const distance=ray.origin.distanceTo(onRay);
                if(distanceSq>tolerance*tolerance || (obstruction&&obstruction.distance<distance-tolerance*.5))return;
                if(best&&best.distance<=distance)return;
                const face=Object.assign({},loop,{partId:mesh.userData.componentId});
                best={object:mesh,point:onEdge.clone(),distance,faceIndex:loop.triangle,face:{normal:loop.normal},boundaryFace:face};
            }));
            return best;
        },
        outline: function (T, vertices, color) {
            // Mark the CAD face boundary without tinting its material.
            const edges = new Map();
            const vertexKey = vertex => vertex.map(value => Math.round(value * 100000)).join(',');
            const addEdge = (a, b) => {
                const aKey = vertexKey(a), bKey = vertexKey(b);
                const key = aKey < bKey ? aKey + '|' + bKey : bKey + '|' + aKey;
                const edge = edges.get(key);
                if (edge) edge.count += 1;
                else edges.set(key, { a: a, b: b, count: 1 });
            };
            for (let offset = 0; offset + 8 < vertices.length; offset += 9) {
                const a = vertices.slice(offset, offset + 3);
                const b = vertices.slice(offset + 3, offset + 6);
                const c = vertices.slice(offset + 6, offset + 9);
                addEdge(a, b); addEdge(b, c); addEdge(c, a);
            }
            const positions = [];
            edges.forEach(edge => { if (edge.count === 1) positions.push(...edge.a, ...edge.b); });
            const geometry = new T.BufferGeometry();
            geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
            const outline = new T.LineSegments(geometry, new T.LineBasicMaterial({
                color: color === undefined ? 0x1674b8 : color,
                transparent: true, opacity: 0.9, depthTest: true, depthWrite: false
            }));
            outline.renderOrder = 6;
            return outline;
        },
        fromBrep: function (T, hit, part) {
            if (!hasBrepFaces(hit.object.geometry)) return null;
            const g = hit.object.geometry, faceIndex = g.userData.brepFaces.findIndex(f => hit.faceIndex >= f.first && hit.faceIndex <= f.last);
            if (faceIndex < 0) return null;
            const range = g.userData.brepFaces[faceIndex], positions = g.attributes.position;
            const points = [], ns = [], vertices = [];
            const used = new Set();
            for (let i = range.first * 3; i < (range.last + 1) * 3; i++) {
                const index = g.index ? g.index.getX(i) : i;
                const v = new T.Vector3().fromBufferAttribute(positions, index);
                vertices.push(v.x, v.y, v.z);
                if (!used.has(index)) { used.add(index); points.push(v); }
            }
            const center = points.reduce((sum, v) => sum.add(v), new T.Vector3()).divideScalar(points.length);
            const normal = hit.face.normal.clone().normalize();
            const scale = new T.Box3().setFromPoints(points).getSize(new T.Vector3()).length();
            const epsilon = Math.max(scale * 1e-4, 1e-7);
            const planar = points.every(v => Math.abs(v.clone().sub(points[0]).dot(normal)) < epsilon);
            const result = {
                partId: part.id,
                key: 'brep-' + faceIndex,
                kind: planar ? 'plane' : 'unsupported',
                center,
                normal,
                vertices,
                // GLB faces retain their source material colour. Passing it
                // with the selection lets the colour picker show that face's
                // value instead of the first material used by the whole part.
                color: typeof range.color === 'string' ? range.color : null,
                materialIndex: Number.isInteger(range.materialIndex) ? range.materialIndex : null
            };
            if (planar) return result;
            // Use geometric triangle normals. GLB shading normals may be blended
            // with caps/bevels or deliberately edited; they do not define the shaft.
            const ta = new T.Vector3(), tb = new T.Vector3(), tc = new T.Vector3(), triangles = [];
            for (let offset = 0; offset + 8 < vertices.length; offset += 9) {
                ta.fromArray(vertices, offset); tb.fromArray(vertices, offset + 3); tc.fromArray(vertices, offset + 6);
                const n = tb.sub(ta).cross(tc.sub(ta));
                if (n.lengthSq() > 0) { ns.push(n.clone().normalize()); triangles.push({ offset, weight: n.length(), normal: ns[ns.length - 1] }); }
            }
            if (!ns.length) return result;
            let axis = new T.Vector3(), strength = 0;
            ns.forEach(n => { const candidate = new T.Vector3().crossVectors(ns[0], n); if (candidate.lengthSq() > strength) { strength = candidate.lengthSq(); axis.copy(candidate); } });
            if (strength < 1e-8) return result;
            axis.normalize();
            const mixed = ns.some(n => Math.abs(n.dot(axis)) > .02);
            if (mixed) {
                // Some exported shafts combine the cylindrical wall, a flat and
                // end bevels in one face. Find the dominant extrusion axis by area.
                let best = 0;
                const stride = Math.max(1, Math.ceil(ns.length / 32));
                for (let i = 0; i < ns.length; i += stride) for (let j = i + stride; j < ns.length; j += stride) {
                    const candidate = ns[i].clone().cross(ns[j]);
                    if (candidate.lengthSq() < 1e-8) continue;
                    candidate.normalize();
                    const score = triangles.reduce((sum, triangle) => sum + triangle.weight * Math.max(0, 1 - Math.pow(triangle.normal.dot(candidate) / .01, 2)), 0);
                    if (score > best) { best = score; axis.copy(candidate); }
                }
                if (!best) return result;
            }
            const basis = ns.find(n => Math.abs(n.dot(axis)) < .02);
            if (!basis) return result;
            const u = basis.clone().addScaledVector(axis, -basis.dot(axis)).normalize();
            const v = new T.Vector3().crossVectors(axis, u);
            const coords = points.map(p => new T.Vector2(p.dot(u), p.dot(v)));
            let a = coords[0];
            if (mixed) {
                const mean = coords.reduce((sum, p) => sum.add(p), new T.Vector2()).divideScalar(coords.length);
                coords.forEach(p => { if (p.distanceToSquared(mean) > a.distanceToSquared(mean)) a = p; });
            }
            let b = a, c = a;
            coords.forEach(p => { if (p.distanceToSquared(a) > b.distanceToSquared(a)) b = p; });
            let area = 0;
            coords.forEach(p => { const cross = Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)); if (cross > area) { area = cross; c = p; } });
            if (area < 1e-12) return result;
            const d = 2*(a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y));
            const aa=a.lengthSq(), bb=b.lengthSq(), cc=c.lengthSq();
            const cx=(aa*(b.y-c.y)+bb*(c.y-a.y)+cc*(a.y-b.y))/d;
            const cy=(aa*(c.x-b.x)+bb*(a.x-c.x)+cc*(b.x-a.x))/d;
            const circle = new T.Vector2(cx,cy), radius = circle.distanceTo(a);
            if (coords.some(p => Math.abs(p.distanceTo(circle)-radius) > Math.max(radius*.002,1e-7))) {
                if (!mixed) return result;
                const tolerance = Math.max(radius * .005, 1e-7);
                if (coords.some(p => p.distanceTo(circle) > radius + tolerance)) return result;
                let supported = 0, total = 0;
                triangles.forEach(triangle => {
                    total += triangle.weight;
                    if (Math.abs(triangle.normal.dot(axis)) > .02) return;
                    for (let j = 0; j < 9; j += 3) {
                        ta.fromArray(vertices, triangle.offset + j);
                        if (Math.abs(new T.Vector2(ta.dot(u), ta.dot(v)).distanceTo(circle) - radius) > tolerance) return;
                    }
                    supported += triangle.weight;
                });
                // Require a substantial actual cylindrical wall; a conical or
                // rounded surface merely sharing a circular rim is insufficient.
                if (supported < total * .35) return result;
            }
            result.center = u.multiplyScalar(cx).add(v.multiplyScalar(cy)).addScaledVector(axis, center.dot(axis));
            result.axis = axis;
            result.kind = 'cylinder';
            result.radius = radius;
            if (part.mateSurface && mixed) {
                // A GLB primitive can combine the shaft wall and its end cap.
                // Pick the geometric region under the cursor for mating, while
                // appearance editing keeps the original material surface range.
                const clicked = (hit.faceIndex - range.first) * 9;
                ta.fromArray(vertices, clicked);
                tb.fromArray(vertices, clicked + 3);
                tc.fromArray(vertices, clicked + 6);
                const pickedNormal = tb.clone().sub(ta).cross(tc.sub(ta)).normalize();
                // Tiny end-rim facets from GLB tessellation can tilt enough to
                // miss the cap test. Resolve them to a nearby actual end plane,
                // never to the cylinder wall on the other side of that edge.
                const axial = pickedNormal.dot(axis);
                if (Math.abs(axial) > .98 && Math.abs(axial) <= .9999) {
                    let nearest = Math.max(radius * .02, epsilon), end;
                    triangles.forEach(triangle => {
                        if (triangle.normal.dot(axis) * Math.sign(axial) < .9999) return;
                        tb.fromArray(vertices, triangle.offset);
                        const distance = Math.abs(tb.clone().sub(ta).dot(triangle.normal));
                        if (distance < nearest) { nearest = distance; end = triangle; }
                    });
                    if (end) {
                        ta.fromArray(vertices, end.offset);
                        pickedNormal.copy(end.normal);
                    }
                }
                const cap = Math.abs(pickedNormal.dot(axis)) > .9999;
                const patch = [];
                triangles.forEach(triangle => {
                    if (cap) {
                        if (triangle.normal.dot(pickedNormal) < .9999) return;
                        for (let j = 0; j < 9; j += 3) {
                            tb.fromArray(vertices, triangle.offset + j);
                            if (Math.abs(tb.sub(ta).dot(pickedNormal)) > epsilon) return;
                        }
                    } else {
                        if (Math.abs(triangle.normal.dot(axis)) > .02) return;
                        for (let j = 0; j < 9; j += 3) {
                            tb.fromArray(vertices, triangle.offset + j).sub(result.center);
                            tb.addScaledVector(axis, -tb.dot(axis));
                            if (Math.abs(tb.length() - radius) > Math.max(radius * .005, 1e-7)) return;
                        }
                    }
                    for (let j = 0; j < 9; j++) patch.push(vertices[triangle.offset + j]);
                });
                if (patch.length) {
                    // A material range can contain both the side and end caps.
                    // Allow small tessellation errors for the visible wall, but
                    // never expand the highlight onto caps, bevels or shaft flats.
                    // Keep the tighter analytic patch for mate calculations.
                    if (!cap) {
                        const wall = [];
                        triangles.forEach(triangle => {
                            if (Math.abs(triangle.normal.dot(axis)) > .02) return;
                            for (let j = 0; j < 9; j += 3) {
                                tb.fromArray(vertices, triangle.offset + j).sub(result.center);
                                tb.addScaledVector(axis, -tb.dot(axis));
                                if (Math.abs(tb.length() - radius) > Math.max(radius * .02, 1e-7)) return;
                            }
                            for (let j = 0; j < 9; j++) wall.push(vertices[triangle.offset + j]);
                        });
                        result.selectionVertices = wall;
                    }
                    result.vertices = patch;
                    if (cap) {
                        result.kind = 'plane';
                        result.normal = pickedNormal;
                        result.center = new T.Vector3();
                        for (let i = 0; i < patch.length; i += 3) result.center.add(tb.fromArray(patch, i));
                        result.center.divideScalar(patch.length / 3);
                        delete result.axis;
                        delete result.radius;
                    }
                }
            }
            return result;
        },
        fromHit: function (THREE, hit, part) {
            const mesh = hit.object;
            if (hasBrepFaces(mesh.geometry)) {
                const face=this.fromBrep(THREE, hit, part);
                if (!face || face.kind!=='unsupported' || !part.mateSurface) return face;
                // GLB may group a rounded housing and its flat mounting face
                // into one material surface. Recover the clicked planar patch
                // without pretending the curved housing is a cylinder.
                const range=mesh.geometry.userData.brepFaces[Number(face.key.slice(5))],vertices=face.vertices;
                const offset=(hit.faceIndex-range.first)*9;
                const a=new THREE.Vector3().fromArray(vertices,offset),b=new THREE.Vector3().fromArray(vertices,offset+3),c=new THREE.Vector3().fromArray(vertices,offset+6);
                const normal=b.sub(a).cross(c.sub(a)).normalize();
                const bounds=new THREE.Box3(),p=new THREE.Vector3();
                for(let i=0;i<vertices.length;i+=3)bounds.expandByPoint(p.fromArray(vertices,i));
                const epsilon=Math.max(bounds.getSize(p).length()*1e-4,1e-7),patch=[],center=new THREE.Vector3();
                let totalArea=0,patchArea=0;
                for(let i=0;i<vertices.length;i+=9){
                    const points=[0,3,6].map(j=>new THREE.Vector3().fromArray(vertices,i+j));
                    const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])),area=n.length();totalArea+=area;
                    if(!area || n.divideScalar(area).dot(normal)<.99999 || points.some(v=>Math.abs(v.clone().sub(a).dot(normal))>epsilon))continue;
                    patchArea+=area;points.forEach(v=>{patch.push(v.x,v.y,v.z);center.add(v);});
                }
                // Two-triangle tessellation facets on a curved surface are
                // not CAD planes. Require a substantial planar region.
                if(patch.length<27 || patchArea<totalArea*.02)return face;
                return Object.assign({},face,{kind:'plane',normal,center:center.divideScalar(patch.length/3),vertices:patch});
            }
            const normal = hit.face.normal.clone().normalize();
            const point = mesh.worldToLocal(hit.point.clone());
            const curved = part.type === 'wheel' && Math.abs(normal.y) < 0.9;
            const source = mesh.geometry;
            const geometry = source.isBufferGeometry ? source : new THREE.BufferGeometry().fromGeometry(source);
            const positions = geometry.attributes.position;
            const index = geometry.index;
            const count = index ? index.count : positions.count;
            const vertices = [];
            const center = new THREE.Vector3();
            for (let i = 0; i < count; i += 3) {
                const triangle = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, index ? index.getX(i + j) : i + j));
                const n = new THREE.Vector3().subVectors(triangle[1], triangle[0]).cross(new THREE.Vector3().subVectors(triangle[2], triangle[0])).normalize();
                const matches = curved ? Math.abs(n.y) < 0.9 : n.dot(normal) > 0.999 && Math.abs(normal.dot(triangle[0].clone().sub(point))) < 0.0001;
                if (matches) triangle.forEach(v => { vertices.push(v.x, v.y, v.z); center.add(v); });
            }
            if (!source.isBufferGeometry) geometry.dispose();
            if (!vertices.length) return null;
            center.divideScalar(vertices.length / 3);
            return { partId: part.id, key: curved ? 'side' : normal.toArray().map(n => n.toFixed(3)).join(','), kind: curved ? 'cylinder' : 'plane', axis: curved ? new THREE.Vector3(0,1,0) : undefined, normal: normal, center: curved ? new THREE.Vector3() : center, vertices: vertices };
        },
        align: function (THREE, fixedMesh, movingMesh, fixedFace, movingFace, concentric) {
            fixedMesh.updateMatrixWorld(true);
            movingMesh.updateMatrixWorld(true);
            const fixedNormal = (concentric ? (fixedFace.axis || new THREE.Vector3(0, 1, 0)).clone() : fixedFace.normal.clone()).applyQuaternion(fixedMesh.quaternion).normalize();
            const movingNormal = (concentric ? (movingFace.axis || new THREE.Vector3(0, 1, 0)).clone() : movingFace.normal.clone()).applyQuaternion(movingMesh.quaternion).normalize();
            const destination = concentric ? fixedNormal : fixedNormal.clone().negate();
            const rotation = new THREE.Quaternion().setFromUnitVectors(movingNormal, destination);
            const anchor = fixedMesh.localToWorld(fixedFace.center.clone());
            if (concentric) {
                // Preserve the axial position; coaxial does not mean coincident centers.
                let offset = movingMesh.localToWorld(movingFace.center.clone()).sub(anchor).dot(fixedNormal);
                fixedMesh.geometry.computeBoundingBox();
                movingMesh.geometry.computeBoundingBox();
                const fixedBox = fixedMesh.geometry.boundingBox;
                const movingBox = movingMesh.geometry.boundingBox;
                const clearance = (fixedBox.max.y - fixedBox.min.y + movingBox.max.y - movingBox.min.y) / 2;
                if (!hasBrepFaces(fixedMesh.geometry) && !hasBrepFaces(movingMesh.geometry) && Math.abs(offset) < clearance) offset = (offset < 0 ? -1 : 1) * clearance;
                anchor.addScaledVector(fixedNormal, offset);
            }
            movingMesh.quaternion.premultiply(rotation);
            movingMesh.updateMatrixWorld(true);
            movingMesh.position.add(anchor.sub(movingMesh.localToWorld(movingFace.center.clone())));
            movingMesh.updateMatrixWorld(true);
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
