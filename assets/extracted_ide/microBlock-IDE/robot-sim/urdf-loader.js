/* Minimal offline URDF + STL loader for the Robot SIM. */
(function (root) {
    function vectorFromText(THREE, text, fallback) {
        const source = String(text || '').trim();
        const values = source ? source.split(/\s+/).map(Number) : [];
        return new THREE.Vector3(
            Number.isFinite(values[0]) ? values[0] : fallback[0],
            Number.isFinite(values[1]) ? values[1] : fallback[1],
            Number.isFinite(values[2]) ? values[2] : fallback[2]
        );
    }

    function applyOrigin(THREE, object, originElement) {
        if (!originElement) return;
        const xyz = vectorFromText(THREE, originElement.getAttribute('xyz'), [0, 0, 0]);
        const rpy = vectorFromText(THREE, originElement.getAttribute('rpy'), [0, 0, 0]);
        object.position.copy(xyz);
        object.rotation.set(rpy.x, rpy.y, rpy.z, 'XYZ');
    }

    function parseAsciiStl(THREE, text) {
        const vertices = [];
        const normals = [];
        let normal = [0, 1, 0];
        String(text).split(/\r?\n/).forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === 'facet' && parts[1] === 'normal') {
                normal = parts.slice(2, 5).map(Number);
            } else if (parts[0] === 'vertex') {
                vertices.push(...parts.slice(1, 4).map(Number));
                normals.push(...normal);
            }
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.computeBoundingSphere();
        return geometry;
    }

    function parseBinaryStl(THREE, buffer) {
        const view = new DataView(buffer);
        const triangles = view.getUint32(80, true);
        const vertices = new Float32Array(triangles * 9);
        const normals = new Float32Array(triangles * 9);
        let offset = 84;
        for (let triangle = 0; triangle < triangles; triangle += 1) {
            const normal = [
                view.getFloat32(offset, true),
                view.getFloat32(offset + 4, true),
                view.getFloat32(offset + 8, true)
            ];
            offset += 12;
            for (let vertex = 0; vertex < 3; vertex += 1) {
                const index = triangle * 9 + vertex * 3;
                vertices[index] = view.getFloat32(offset, true);
                vertices[index + 1] = view.getFloat32(offset + 4, true);
                vertices[index + 2] = view.getFloat32(offset + 8, true);
                normals[index] = normal[0];
                normals[index + 1] = normal[1];
                normals[index + 2] = normal[2];
                offset += 12;
            }
            offset += 2;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.computeBoundingSphere();
        return geometry;
    }

    function parseStl(THREE, buffer) {
        if (buffer.byteLength >= 84) {
            const triangles = new DataView(buffer).getUint32(80, true);
            if (84 + triangles * 50 === buffer.byteLength) return parseBinaryStl(THREE, buffer);
        }
        return parseAsciiStl(THREE, new TextDecoder().decode(buffer));
    }

    function materialFromName(THREE, materialName) {
        const colors = {
            chassis_blue: 0x1f6f9b,
            deck_yellow: 0xf2c94c,
            motor_dark: 0x38444d,
            tire_dark: 0x3b4650,
            hub_light: 0xd7e5ed,
            marker_orange: 0xff6f3d,
            yellow: 0xf2c94c,
            black: 0x2f3942,
            red: 0xd94a38,
            blue: 0x1f6f9b,
            green: 0x4d9b67a
        };
        return new THREE.MeshStandardMaterial({
            color: colors[materialName] || 0x9aa9b6,
            metalness: materialName === 'hub_light' ? 0.22 : 0.08,
            roughness: materialName === 'tire_dark' || materialName === 'black' ? 0.84 : 0.45
        });
    }

    function materialFromElement(THREE, materialElement) {
        const colorElement = materialElement ? materialElement.querySelector('color') : null;
        const colorText = colorElement ? colorElement.getAttribute('rgba') : '';
        const rgba = String(colorText || '').trim().split(/\s+/).map(Number);
        if (rgba.length >= 3 && rgba.slice(0, 3).every(Number.isFinite)) {
            const alpha = Number.isFinite(rgba[3]) ? rgba[3] : 1;
            return new THREE.MeshStandardMaterial({
                color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
                opacity: alpha,
                transparent: alpha < 1,
                metalness: 0.08,
                roughness: 0.5
            });
        }
        return materialFromName(THREE, materialElement ? materialElement.getAttribute('name') || '' : '');
    }

    function resolveUrl(path, baseUrl) {
        const absoluteBase = new URL(baseUrl, root.location ? root.location.href : 'http://localhost/').toString();
        return new URL(path, absoluteBase).toString();
    }

    function resolveMeshPath(uri, urdfUrl) {
        if (!uri) return '';
        if (uri.startsWith('package://')) {
            const packagePath = uri.slice('package://'.length);
            const slash = packagePath.indexOf('/');
            const relative = slash >= 0 ? packagePath.slice(slash + 1) : packagePath;
            return resolveUrl(relative, urdfUrl);
        }
        return resolveUrl(uri, urdfUrl);
    }

    async function loadText(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Load failed: ' + url);
        return response.text();
    }

    async function loadArrayBuffer(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Load failed: ' + url);
        return response.arrayBuffer();
    }

    async function loadRobotFromUrdf(THREE, urdfUrl) {
        const urdfText = await loadText(urdfUrl);
        const documentXml = new DOMParser().parseFromString(urdfText, 'application/xml');
        const robotElement = documentXml.querySelector('robot');
        if (!robotElement) throw new Error('Invalid URDF: missing robot element');

        const linkGroups = {};
        const joints = [];
        const rootGroup = new THREE.Group();
        rootGroup.name = robotElement.getAttribute('name') || 'urdf_robot';

        for (const linkElement of robotElement.querySelectorAll('link')) {
            const linkName = linkElement.getAttribute('name');
            const linkGroup = new THREE.Group();
            linkGroup.name = linkName;
            linkGroups[linkName] = linkGroup;

            for (const visual of linkElement.querySelectorAll('visual')) {
                const meshElement = visual.querySelector('geometry > mesh');
                if (!meshElement) continue;
                const meshUrl = resolveMeshPath(meshElement.getAttribute('filename'), urdfUrl);
                const geometry = parseStl(THREE, await loadArrayBuffer(meshUrl));
                const mesh = new THREE.Mesh(geometry, materialFromElement(THREE, visual.querySelector('material')));
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                applyOrigin(THREE, mesh, visual.querySelector('origin'));
                linkGroup.add(mesh);
            }
        }

        for (const jointElement of robotElement.querySelectorAll('joint')) {
            const joint = new THREE.Group();
            joint.name = jointElement.getAttribute('name') || '';
            applyOrigin(THREE, joint, jointElement.querySelector('origin'));
            const parentElement = jointElement.querySelector('parent');
            const childElement = jointElement.querySelector('child');
            const axisElement = jointElement.querySelector('axis');
            joints.push({
                name: joint.name,
                group: joint,
                parent: parentElement ? parentElement.getAttribute('link') : '',
                child: childElement ? childElement.getAttribute('link') : '',
                axis: vectorFromText(THREE, axisElement ? axisElement.getAttribute('xyz') : '', [1, 0, 0]).normalize()
            });
        }

        const childLinks = new Set();
        joints.forEach(joint => {
            const parentGroup = linkGroups[joint.parent];
            const childGroup = linkGroups[joint.child];
            if (!parentGroup || !childGroup) return;
            joint.group.add(childGroup);
            parentGroup.add(joint.group);
            childLinks.add(joint.child);
        });

        const rootLinkName = Object.keys(linkGroups).find(name => !childLinks.has(name));
        if (!rootLinkName) throw new Error('Invalid URDF: missing root link');
        rootGroup.add(linkGroups[rootLinkName]);

        const wheelJoints = ['wheel_fl_joint', 'wheel_bl_joint', 'wheel_fr_joint', 'wheel_br_joint']
            .map(name => joints.find(joint => joint.name === name));
        if (wheelJoints.some(joint => !joint)) throw new Error('URDF must define wheel_fl/bl/fr/br joints');

        return { root: rootGroup, wheelJoints };
    }

    root.RobotUrdfLoader = { loadRobotFromUrdf };
})(typeof window !== 'undefined' ? window : globalThis);




