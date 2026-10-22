(function (root) {
    'use strict';

    const BOARD_ID = 'atom-vx';
    const PART_ID = 'system-board-atom-vx';
    const GEOMETRY_KEY = 'system-geometry-atom-vx-v1';
    const scriptUrl = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
    const MODEL_URL = scriptUrl ? new URL('../boards/atom-vx/models/PT-BOT_Atom_VX.glb', scriptUrl).href : 'boards/atom-vx/models/PT-BOT_Atom_VX.glb';
    let preparedPromise = null;
    let artworkTexturesPromise = null;
    let definitionValue = null;
    let productPromise = null;
    async function loadProduct() {
        const definition = await loadDefinition();
        if (!definition.product || !definition.product.manifest) return null;
        if (!productPromise) productPromise = (async () => {
            const url = root.BoardPackage.asset(definition, definition.product.manifest);
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error('Could not load board product');
            return { manifest: root.ProductSchema.validate(await response.json()), baseUrl: new URL('.', url).href };
        })();
        try { return await productPromise; } catch (error) { productPromise = null; throw error; }
    }

    async function loadDefinition() {
        if (!definitionValue) {
            definitionValue = root.BoardPackage ? await root.BoardPackage.load(BOARD_ID) : null;
            if (!definitionValue) throw new Error('PT Atom VX board package is unavailable.');
        }
        return definitionValue;
    }

    function selected() {
        const lexicalBoardId = typeof boardId !== 'undefined' ? boardId : '';
        const active = (typeof lexicalBoardId === 'string' && lexicalBoardId) ||
            (typeof root.boardId === 'string' && root.boardId) ||
            (root.localStorage && root.localStorage.getItem('ptbot_selected_board_id')) ||
            (root.localStorage && root.localStorage.getItem('ptbot_last_board_id')) || '';
        return !active || active === BOARD_ID;
    }

    function matches(part) {
        if (!part) return false;
        // controller-board is shared by every board/robot. Older OPT projects
        // mark Build BOT with it too; never mistake a known product for ATOM.
        const catalogProduct = /^product:(.+)$/.exec(part.catalogId || '');
        const productId = part.productManifest && part.productManifest.id || catalogProduct && catalogProduct[1];
        if (productId) return productId === BOARD_ID;
        if (part.boardId) return part.boardId === BOARD_ID;
        return !!part && (part.systemRole === 'controller-board' || part.id === PART_ID || /PT[-_ ]?BOT[ _-]?Atom[ _-]?VX\.glb$/i.test(part.fileName || ''));
    }

    function applyPackageDefinition(T, prepared, definition) {
        if (!prepared || !prepared.data) return prepared;
        const model = definition.model || {};
        const rotation = Array.isArray(model.rotation) ? model.rotation : [0, 0, 0];
        const scale = Array.isArray(model.scale) ? model.scale : [1, 1, 1];
        const unitScale = model.unit === 'millimeter' ? 0.001 : 1;
        const transform = new T.Matrix4().compose(
            new T.Vector3(),
            new T.Quaternion().setFromEuler(new T.Euler(
                (Number(rotation[0]) || 0) * Math.PI / 180,
                (Number(rotation[1]) || 0) * Math.PI / 180,
                (Number(rotation[2]) || 0) * Math.PI / 180,
                'XYZ'
            )),
            new T.Vector3(
                (Number(scale[0]) || 1) * unitScale,
                (Number(scale[1]) || 1) * unitScale,
                (Number(scale[2]) || 1) * unitScale
            )
        );
        const positions = prepared.data.positions;
        const normals = prepared.data.normals;
        const point = new T.Vector3();
        const normal = new T.Vector3();
        const normalMatrix = new T.Matrix3().getNormalMatrix(transform);
        const bounds = new T.Box3();
        for (let offset = 0; offset < positions.length; offset += 3) {
            point.fromArray(positions, offset).applyMatrix4(transform);
            positions[offset] = point.x; positions[offset + 1] = point.y; positions[offset + 2] = point.z;
            bounds.expandByPoint(point);
            if (normals && offset < normals.length) {
                normal.fromArray(normals, offset).applyMatrix3(normalMatrix).normalize();
                normals[offset] = normal.x; normals[offset + 1] = normal.y; normals[offset + 2] = normal.z;
            }
        }
        if (!bounds.isEmpty()) {
            const center = bounds.getCenter(new T.Vector3());
            for (let offset = 0; offset < positions.length; offset += 3) {
                positions[offset] -= center.x;
                positions[offset + 1] -= center.y;
                positions[offset + 2] -= center.z;
            }
            const size = bounds.getSize(new T.Vector3());
            prepared.size = size.toArray();
            prepared.center = new T.Vector3(0, size.y / 2, 0);
        }
        const overrides = definition.appearance && Array.isArray(definition.appearance.materials) ? definition.appearance.materials : [];
        overrides.forEach(override => {
            const index = Number(override.index);
            if (!Number.isInteger(index) || !prepared.data.materials || !prepared.data.materials[index] || !/^#[0-9a-f]{6}$/i.test(override.color || '')) return;
            prepared.data.materials[index].color = override.color;
            prepared.data.faces.forEach(face => { if (face.materialIndex === index) face.color = override.color; });
        });
        const surfaceOverrides = definition.appearance && Array.isArray(definition.appearance.surfaces) ? definition.appearance.surfaces : [];
        surfaceOverrides.forEach(override => {
            const faceIndex = Number(override.index);
            const face = prepared.data.faces && prepared.data.faces[faceIndex];
            if (!face || !/^#[0-9a-f]{6}$/i.test(override.color || '') || !prepared.data.materials) return;
            const base = prepared.data.materials[Number.isInteger(face.materialIndex) ? face.materialIndex : 0] || prepared.data.materials[0];
            if (!base) return;
            face.materialIndex = prepared.data.materials.length;
            face.color = override.color;
            prepared.data.materials.push(Object.assign({}, base, { color: override.color }));
        });
        if (prepared.data.materials && prepared.data.materials[0]) prepared.source.colorHex = prepared.data.materials[0].color;
        return prepared;
    }

    async function loadPrepared(T) {
        if (!preparedPromise) {
            preparedPromise = loadDefinition().then(async definition => {
                if (definition.product && definition.product.manifest) {
                    if (!root.ProductCatalog) throw new Error('The product catalog loader is unavailable.');
                    const product = await root.ProductCatalog.prepare(T, { name: definition.name, manifestUrl: root.BoardPackage.asset(definition, definition.product.manifest) });
                    product.prepared.productManifest = product.manifest;
                    product.prepared.productBaseUrl = product.baseUrl;
                    return product.prepared;
                }
                const response = await fetch(root.BoardPackage.asset(definition, definition.model.file), { cache: 'force-cache' });
                if (!response.ok) throw new Error('Could not load the built-in PT Atom VX model');
                const buffer = await response.arrayBuffer();
                const prepared = await root.AssemblyGlb.read(T, {
                    name: definition.name + '.glb',
                    size: buffer.byteLength,
                    arrayBuffer: async () => buffer
                });
                return applyPackageDefinition(T, prepared, definition);
            }).catch(error => {
                preparedPromise = null;
                throw error;
            });
        }
        return preparedPromise;
    }

    function partFromPrepared(prepared, floorY) {
        return applyPreparedProduct({
            id: PART_ID,
            name: 'PT Atom VX',
            type: 'step',
            systemRole: 'controller-board',
            boardId: BOARD_ID,
            locked: true,
            color: prepared.source.colorHex || '#263238',
            faceColors: {},
            motor: '',
            fileName: 'PT-BOT Atom VX.glb',
            geometryKey: GEOMETRY_KEY,
            importGroup: 'glb-system-atom-vx',
            position: [0, (floorY || 0) + prepared.size[1] / 2, 0],
            rotation: [0, 0, 0],
            size: prepared.size.slice(0, 3),
            mateLinks: [],
            mateTypes: {},
            mates: []
        }, prepared);
    }

    function applyPreparedProduct(part, prepared) {
        part.size = prepared.size.slice(0, 3);
        if (prepared.productManifest) {
            part.productManifest = JSON.parse(JSON.stringify(prepared.productManifest));
            part.productBaseUrl = prepared.productBaseUrl;
            if (root.ProductCatalog) Object.keys(part.faceColors || {}).forEach(key => root.ProductCatalog.applyFaceColor(part, prepared.data, key, part.faceColors[key]));
        } else {
            delete part.productManifest;
            delete part.productBaseUrl;
        }
        return part;
    }

    function normalizeColor(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return '#' + (value & 0xffffff).toString(16).padStart(6, '0');
        if (typeof value === 'string') {
            if (/^#[0-9a-f]{6}$/i.test(value)) return value;
            if (/^0x[0-9a-f]{6}$/i.test(value)) return '#' + value.slice(2);
        }
        return '#ffffff';
    }

    function loadArtworkTextures(T) {
        if (!artworkTexturesPromise) {
            artworkTexturesPromise = loadDefinition().then(definition => {
                const loader = new T.TextureLoader();
                const load = entry => new Promise((resolve, reject) => loader.load(root.BoardPackage.asset(definition, entry.file), texture => {
                if (T.sRGBEncoding !== undefined) texture.encoding = T.sRGBEncoding;
                texture.magFilter = T.LinearFilter;
                texture.minFilter = T.LinearFilter;
                texture.generateMipmaps = false;
                texture.anisotropy = 8;
                texture.needsUpdate = true;
                resolve(texture);
                }, undefined, reject));
                const entries = definition.appearance && Array.isArray(definition.appearance.artwork) ? definition.appearance.artwork : [];
                return Promise.all(entries.map(entry => load(entry).then(texture => ({ entry, texture }))));
            });
        }
        return artworkTexturesPromise;
    }

    function attachBoardArtwork(T, boardMesh) {
        if (!boardMesh || boardMesh.userData.atomVxArtwork) return boardMesh && boardMesh.userData.atomVxArtwork;
        const artwork = new T.Group();
        artwork.name = 'PT Atom VX PCB artwork';
        boardMesh.add(artwork);
        let disposed = false;
        const surfaces = [];
        const handle = {
            group: artwork,
            dispose() {
                disposed = true;
                surfaces.forEach(surface => {
                    surface.geometry.dispose();
                    surface.material.dispose();
                });
                if (artwork.parent) artwork.parent.remove(artwork);
                boardMesh.userData.atomVxArtwork = null;
            }
        };
        boardMesh.userData.atomVxArtwork = handle;

        loadArtworkTextures(T).then(items => {
            if (disposed) return;
            const makeSurface = ({ entry, texture }) => {
                const material = new T.MeshStandardMaterial({
                    map: texture,
                    color: 0xffffff,
                    roughness: 0.88,
                    metalness: 0.02,
                    alphaTest: 0.05,
                    side: T.FrontSide,
                    polygonOffset: true,
                    polygonOffsetFactor: -1,
                    polygonOffsetUnits: -1
                });
                const size = entry.size || [0.083, 0.07];
                const surface = new T.Mesh(new T.PlaneGeometry(size[0], size[1]), material);
                surface.name = 'PCB artwork ' + String(entry.side || '').toUpperCase();
                surface.position.fromArray(entry.position || [0, 0, 0]);
                const rotation = entry.rotation || [0, 0, 0];
                surface.rotation.set(rotation[0] * Math.PI / 180, rotation[1] * Math.PI / 180, rotation[2] * Math.PI / 180);
                surface.receiveShadow = true;
                artwork.add(surface);
                surfaces.push(surface);
            };
            items.forEach(makeSurface);
            if (root.dispatchEvent && typeof Event === 'function') root.dispatchEvent(new Event('atom-vx-artwork-update'));
        }).catch(error => console.warn('[PT Atom VX] PCB artwork could not be loaded', error));
        return handle;
    }

    function attachSimulation(T, boardMesh, options) {
        options = options || {};
        const boardArtwork = options.skipArtwork ? null : attachBoardArtwork(T, boardMesh);
        const definition = options.definition || definitionValue;
        const simulation = definition && definition.simulation ? definition.simulation : {};
        const display = simulation.display || {};
        const overlay = new T.Group();
        overlay.name = 'PT Atom VX simulation surfaces';
        boardMesh.add(overlay);

        const logicalWidth = (display.resolution && display.resolution[0]) || 160;
        const logicalHeight = (display.resolution && display.resolution[1]) || 128;
        const displayScale = display.textureScale || 4;
        const canvas = document.createElement('canvas');
        canvas.width = logicalWidth * displayScale;
        canvas.height = logicalHeight * displayScale;
        const context = canvas.getContext('2d');
        context.setTransform(displayScale, 0, 0, displayScale, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.fillStyle = '#05080a';
        context.fillRect(0, 0, logicalWidth, logicalHeight);
        const texture = new T.CanvasTexture(canvas);
        if (T.sRGBEncoding !== undefined) texture.encoding = T.sRGBEncoding;
        texture.magFilter = T.LinearFilter;
        texture.minFilter = T.LinearFilter;
        texture.generateMipmaps = false;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        const screenMaterial = new T.MeshBasicMaterial({ map: texture, color: 0xffffff, side: T.DoubleSide });
        screenMaterial.toneMapped = false;
        screenMaterial.polygonOffset = true;
        screenMaterial.polygonOffsetFactor = -2;
        screenMaterial.polygonOffsetUnits = -2;
        // Preserve the panel's native 160:128 (5:4) aspect ratio. The previous
        // 43.8 x 31.3 mm plane was too wide and made vertical content look flat.
        const screenWidth = (display.size && display.size[0]) || 0.039125;
        const screenHeight = (display.size && display.size[1]) || screenWidth * logicalHeight / logicalWidth;
        const fittedScreen = display.surfaceKey && root.ProductArtwork ? root.ProductArtwork.create(T, boardMesh, display, texture) : null;
        const screen = new T.Mesh(fittedScreen ? fittedScreen.geometry : new T.PlaneGeometry(screenWidth, screenHeight), screenMaterial);
        if (fittedScreen) fittedScreen.material.dispose();
        const screenRotation = display.rotation || [-90, 0, 0];
        if (!fittedScreen) {
            screen.rotation.set(screenRotation[0] * Math.PI / 180, screenRotation[1] * Math.PI / 180, screenRotation[2] * Math.PI / 180);
            screen.position.fromArray(display.position || [0.00062, 0.00979, -0.00530]);
        }
        screen.renderOrder = 4;
        screen.visible = display.enabled !== false;
        overlay.add(screen);

        const motorColors = simulation.motorColors || {};
        const ledEntries = Array.isArray(simulation.motorLeds) ? simulation.motorLeds : [];
        const leds = ledEntries.map((entry, index) => {
            const material = new T.MeshBasicMaterial({ color: entry.offColor || motorColors.off || '#15191b', side: T.DoubleSide });
            material.toneMapped = false;
            // These coordinates are the four physical red LED lenses in the
            // source GLB, relative to the centred geometry used by Assembly.
            const ledSize = Array.isArray(entry.size) ? entry.size : [0.00115, 0.00160];
            const light = new T.Mesh(new T.PlaneGeometry(ledSize[0], ledSize[1]), material);
            const ledRotation = Array.isArray(entry.rotation) ? entry.rotation : [-90, 0, 0];
            light.rotation.set(ledRotation[0] * Math.PI / 180, ledRotation[1] * Math.PI / 180, ledRotation[2] * Math.PI / 180);
            light.position.fromArray(entry.position || [0, 0, 0]);
            light.renderOrder = 5;
            light.visible = entry.enabled !== false;
            overlay.add(light);
            const port = /^M([1-4])$/i.exec(entry.motor || '');
            return { light, material, index: port ? Number(port[1]) - 1 : index, entry };
        });

        function setMotors(speeds) {
            leds.forEach((led, index) => {
                const speed = Math.max(-100, Math.min(100, Number(speeds && speeds[led.index]) || 0));
                const amount = Math.abs(speed) / 100;
                const active = speed !== 0;
                const brightness = 0.18 + amount * 0.82;
                if (!active) led.material.color.set(led.entry.offColor || motorColors.off || '#15191b');
                else led.material.color.set(speed > 0 ? (led.entry.forwardColor || motorColors.forward || '#00ff00') : (led.entry.reverseColor || motorColors.reverse || '#ff0000')).multiplyScalar(brightness);
            });
        }

        function applyDisplay(command) {
            if (!command) return;
            if(command.type==='batch'){for(const item of command.commands||[])applyDisplay(item);return;}
            const color = normalizeColor(command.color);
            context.save();
            context.fillStyle = color;
            context.strokeStyle = color;
            context.lineWidth = 1;
            if(command.screenRotation===0){context.translate(0,128);context.rotate(-Math.PI/2);}
            else if(command.screenRotation===2){context.translate(160,0);context.rotate(Math.PI/2);}
            else if(command.screenRotation===3){context.translate(160,128);context.rotate(Math.PI);}
            const x = Number(command.x) || 0, y = Number(command.y) || 0;
            if(command.type==='pixels'){
                const width=Math.min(320,Math.max(0,command.width|0)),height=Math.min(320,Math.max(0,command.height|0));
                if(width&&height&&command.pixels?.length===width*height){
                    const surface=document.createElement('canvas');surface.width=width;surface.height=height;
                    const ctx=surface.getContext('2d'),data=ctx.createImageData(width,height);
                    for(let i=0;i<command.pixels.length;i++){const v=command.pixels[i];data.data[i*4]=((v>>11)&31)*255/31;data.data[i*4+1]=((v>>5)&63)*255/63;data.data[i*4+2]=(v&31)*255/31;data.data[i*4+3]=255;}
                    ctx.putImageData(data,0,0);context.drawImage(surface,x,y);
                }
            }
            else if (command.type === 'fill') context.fillRect(0, 0, logicalWidth, logicalHeight);
            else if (command.type === 'text') {
                if(command.font==='arduino'){
                    const scale=Math.max(1,Math.min(20,Number(command.textSize)||1)),cw=6*scale,ch=8*scale;
                    context.translate(x,y);if(command.rotation)context.rotate(command.rotation);
                    context.font=(8*scale)+'px monospace';context.textBaseline='top';
                    let tx=0,ty=0;
                    for(const char of String(command.text)){
                        if(char==='\r')continue;
                        if(char==='\n'||command.wrap&&x+tx+cw>logicalWidth){tx=0;ty+=ch;if(char==='\n')continue;}
                        // Adafruit GFX treats matching foreground/background as transparent text.
                        if(command.background && normalizeColor(command.background)!==color){context.fillStyle=normalizeColor(command.background);context.fillRect(tx,ty,cw,ch);}
                        context.fillStyle=color;context.fillText(char,tx,ty);tx+=cw;
                    }
                    context.restore();texture.needsUpdate=true;return;
                }
                const size = /32/.test(command.font || '') ? 32 : /16/.test(command.font || '') ? 16 : 12;
                context.font = (/bold/i.test(command.font || '') ? '700 ' : '400 ') + size + 'px sans-serif';
                context.textBaseline = 'top';
                context.fillText(String(command.text), x, y);
            } else if (command.type === 'line') {
                context.beginPath(); context.moveTo(x, y); context.lineTo(Number(command.x2) || 0, Number(command.y2) || 0); context.stroke();
            } else if (command.type === 'rect') {
                const method = command.fill ? 'fillRect' : 'strokeRect';
                context[method](x, y, Number(command.width) || 0, Number(command.height) || 0);
            } else if(command.type==='roundrect'){
                const width=Math.max(0,Number(command.width)||0),height=Math.max(0,Number(command.height)||0),radius=Math.max(0,Math.min(Number(command.radius)||0,width/2,height/2));
                context.beginPath();context.roundRect(x,y,width,height,radius);command.fill?context.fill():context.stroke();
            } else if (command.type === 'circle') {
                context.beginPath(); context.arc(x, y, Math.max(0, Number(command.radius) || 0), 0, Math.PI * 2); command.fill ? context.fill() : context.stroke();
            } else if (command.type === 'image' && command.image) {
                const image = new Image();
                image.onload = () => {
                    context.drawImage(image, x, y);
                    texture.needsUpdate = true;
                    if (root.dispatchEvent && typeof Event === 'function') root.dispatchEvent(new Event('atom-vx-display-update'));
                };
                image.src = 'data:image/png;base64,' + command.image;
            }
            context.restore();
            texture.needsUpdate = true;
        }

        function dispose() {
            screen.geometry.dispose();
            screenMaterial.dispose();
            texture.dispose();
            leds.forEach(led => { led.light.geometry.dispose(); led.material.dispose(); });
            if (boardArtwork && boardArtwork.dispose) boardArtwork.dispose();
        }

        return { setMotors, applyDisplay, dispose, canvas, screen, leds };
    }

    root.AtomVxModel = { BOARD_ID, PART_ID, GEOMETRY_KEY, MODEL_URL, selected, matches, loadDefinition, loadProduct, loadPrepared, partFromPrepared, applyPreparedProduct, attachBoardArtwork, attachSimulation, applyPackageDefinition };
})(typeof window !== 'undefined' ? window : globalThis);
