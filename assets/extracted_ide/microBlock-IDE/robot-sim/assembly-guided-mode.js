/* Guided practice uses its own scene and progress. It never edits the assembly. */
(function (root) {
    'use strict';
    const STORAGE_KEY = 'robot_assembly_guide_v1';
    function practiceManifest(part) {
        if (!part || !part.productManifest || part.productManifest.kind !== 'robot') return null;
        if (!part.productManifest.assemblyGuide || part.productManifest.assemblyGuide.enabled !== true) return null;
        const manifest = JSON.parse(JSON.stringify(part.productManifest));
        const practice = manifest.assemblyGuide.practice;
        if (practice && practice.schema === 1) {
            manifest.components = practice.components;
            manifest.assemblyGuide = practice.assemblyGuide;
            manifest.joints = practice.joints;
            manifest.mates = practice.mates;
        }
        return manifest;
    }
    function create(options) {
        const T = options.THREE, modal = options.modal, canvas = options.canvas, camera = options.camera, orbit = options.orbit;
        const doc = modal.ownerDocument, panel = modal.querySelector('.assembly-mode-panel');
        const toolbar = modal.querySelector('.assembly-icon-group'), viewport = modal.querySelector('.assembly-viewport');
        let runtime = null, view = null, session = null, active = false, loading = false, run = 0, storageId = '';
        let drag = null, stagedId = '', focusRadius = null;
        const thumbnailJobs = new Set();
        const images = new Map(), raycaster = new T.Raycaster(), pointer = new T.Vector2();
        const publishedGuides = new Map();
        let publishRefresh = 0;
        async function refreshPublished(entries) {
            if (active || loading || !root.fetch) return;
            const token = ++publishRefresh;
            const ids = new Set(options.parts().filter(part => part.productManifest && part.productManifest.kind === 'robot').map(part => part.productManifest.id));
            await Promise.all(entries.filter(entry => ids.has(entry.productId)).map(async entry => {
                const revision = entry.manifestUrl + '|' + (entry.previewRevision || '');
                // Thumbnail revisions do not track guide changes (including
                // corrected screw seats). Revalidate the guide on reopening.
                try {
                    const response = await root.fetch(entry.manifestUrl, { cache: 'no-cache' });
                    if (!response.ok) throw new Error('Could not read published assembly guide.');
                    const manifest = await response.json();
                    if (manifest.id !== entry.productId || manifest.kind !== 'robot') throw new Error('Published assembly guide product does not match.');
                    if (token !== publishRefresh || active || loading) return;
                    publishedGuides.set(entry.productId, { revision, manifest, baseUrl: new URL('.', entry.manifestUrl).href });
                } catch (error) { options.status('Could not refresh assembly guide: ' + error.message); }
            }));
            if (token === publishRefresh) refreshAvailability();
        }
        function element(tag, className, text) {
            const node = doc.createElement(tag); if (className) node.className = className;
            if (text !== undefined) node.textContent = text; return node;
        }
        const toggle = element('button', 'assembly-icon-button');
        toggle.id = 'assembly-guide-toggle'; toggle.type = 'button'; toggle.dataset.guideControl = 'true';
        toggle.setAttribute('aria-label', 'Guided assembly'); toggle.title = 'Guided assembly';
        toggle.innerHTML = '<i class="fas fa-book-open" aria-hidden="true"></i>';
        toolbar.appendChild(toggle);
        let playing = false, playDelay = 0;
        const play = element('button', 'assembly-icon-button');
        play.id = 'assembly-guide-play'; play.type = 'button'; play.dataset.guideControl = 'true';
        toolbar.insertBefore(play, toggle);
        function setPlaying(value) {
            playing = value; playDelay = .35;
            play.innerHTML = '<i class="fas fa-' + (playing ? 'pause' : 'play') + '"></i>';
            play.title = playing ? 'Pause assembly' : 'Play assembly';
            play.setAttribute('aria-label', play.title);
            play.setAttribute('aria-pressed', String(playing));
        }
        setPlaying(false);
        play.addEventListener('click', () => {
            if (!active || !session || session.status().complete) return;
            setPlaying(!playing);
            if (playing) assembleNext();
        });
        const kit = element('section', 'assembly-guide-kit'); kit.hidden = true; kit.dataset.guideControl = 'true';
        const eyebrow = element('div', 'assembly-guide-eyebrow', 'GUIDED ASSEMBLY');
        const title = element('strong', 'assembly-guide-product');
        const count = element('span', 'assembly-guide-count');
        const progress = element('progress', 'assembly-guide-progress'); progress.setAttribute('aria-label', 'Assembly progress');
        const inventory = element('div', 'assembly-guide-inventory'); inventory.setAttribute('aria-label', 'Parts for this robot');
        const actions = element('div', 'assembly-guide-actions');
        function button(text, action) {
            const node = element('button', '', text); node.type = 'button'; node.addEventListener('click', action); actions.appendChild(node); return node;
        }
        const back = button('Back', () => changeProgress(false));
        const next = button('Next', assembleNext);
        next.id = 'assembly-guide-next';
        next.setAttribute('aria-label', 'Automatically assemble the current part');
        const restart = button('Restart', () => changeProgress(true));
        const exitButton = button('Exit guide', exit);
        kit.append(eyebrow, title, count, progress, inventory, actions); panel.insertBefore(kit, panel.firstChild);
        const hint = element('div', 'assembly-guide-hint'); hint.hidden = true; hint.dataset.guideControl = 'true';
        const stepLabel = element('span', 'assembly-guide-eyebrow');
        const stepTitle = element('strong');
        const instruction = element('p');
        const feedback = element('div', 'assembly-guide-feedback'); feedback.setAttribute('role', 'status');
        hint.append(stepLabel, stepTitle, instruction, feedback); viewport.appendChild(hint);
        function notify(text) { feedback.textContent = text; options.status(text); }
        function candidate() {
            const parts = options.parts().map(part => {
                const published = part.productManifest && publishedGuides.get(part.productManifest.id);
                return published ? Object.assign({}, part, { productManifest: published.manifest, productBaseUrl: published.baseUrl }) : part;
            });
            const enabled = part => part.productManifest && part.productManifest.kind === 'robot' && part.productManifest.assemblyGuide && part.productManifest.assemblyGuide.enabled === true;
            return parts.find(part => part.id === options.selectedId() && enabled(part)) || parts.find(enabled);
        }
        function refreshAvailability() {
            play.hidden = !active;
            play.disabled = !active || !session || session.status().complete;
            toggle.hidden = !active && !loading && !candidate();
            toggle.disabled = !active && !loading && (options.busy() || !candidate());
            toggle.setAttribute('aria-pressed', String(active || loading));
            toggle.setAttribute('aria-label', active || loading ? 'Exit guided assembly' : 'Guided assembly');
        }
        function readProgress() {
            try { const value = JSON.parse(root.localStorage.getItem(STORAGE_KEY)); return value && value.sessions && typeof value.sessions === 'object' && !Array.isArray(value.sessions) ? value : { sessions: {} }; }
            catch (_) { return { sessions: {} }; }
        }
        function saveProgress() {
            if (!session) return;
            try {
                const state = readProgress(); state.sessions[storageId] = session.serialize();
                root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                root.localStorage.setItem('robot_assembly_guide_revision', Date.now() + '-' + Math.random().toString(36).slice(2));
            } catch (_) { notify('Progress could not be saved. Keep this window open to continue.'); }
        }
        function freezeCamera() {
            focusRadius = null; orbit.desiredTheta = orbit.theta; orbit.desiredPhi = orbit.phi;
            orbit.desiredTarget.copy(orbit.target); orbit.dragging = false;
        }
        function focusStep() {
            if (!view || drag && drag.started) return;
            const focus = view.focus(), step = session.currentStep();
            const direction = focus.direction || (step && step.cameraDirection ? new T.Vector3().fromArray(step.cameraDirection) : null);
            if (direction && direction.lengthSq() > .00001) {
                direction.normalize();
                let theta = Math.atan2(direction.x, direction.z);
                while (theta - orbit.theta > Math.PI) theta -= Math.PI * 2;
                while (theta - orbit.theta < -Math.PI) theta += Math.PI * 2;
                orbit.desiredTheta = theta;
                orbit.desiredPhi = Math.max(.25, Math.min(Math.PI - .25, Math.acos(Math.max(-1, Math.min(1, direction.y)))));
            }
            orbit.desiredTarget.copy(focus.center);
            const fov = Math.min(camera.fov * Math.PI / 180, 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
            focusRadius = Math.max(.05, focus.radius / Math.sin(fov / 2) * 1.04);
        }
        let kitScrollLock = null;
        function lockKitScroll() {
            if (kitScrollLock) return;
            kitScrollLock = { overflow: inventory.style.overflow, scrollTop: inventory.scrollTop };
            inventory.style.overflow = 'hidden';
        }
        function unlockKitScroll() {
            if (!kitScrollLock) return;
            inventory.style.overflow = kitScrollLock.overflow;
            inventory.scrollTop = kitScrollLock.scrollTop;
            kitScrollLock = null;
        }
        // Safari may promote a touch to native scrolling even when a pointer
        // handler calls preventDefault. Claim eligible kit touches from start.
        inventory.addEventListener('touchstart', event => {
            const row = event.target.closest?.('.assembly-guide-part');
            if (active && !view.isAnimating() && row && !row.disabled && session.canSelect(row.dataset.componentId)) event.preventDefault();
        }, { passive: false });
        root.addEventListener('touchmove', event => {
            if (drag && drag.pointerType === 'touch' && event.cancelable !== false) event.preventDefault();
        }, { capture: true, passive: false });
        function cancelDrag() {
            unlockKitScroll();
            const old = drag; drag = null;
            if (old && old.capture) { try { old.capture.releasePointerCapture(old.pointerId); } catch (_) { } }
            if (view && stagedId) view.cancelStage(stagedId);
            stagedId = ''; canvas.style.cursor = 'var(--cursor-grab, grab)';
        }
        function changeProgress(reset) {
            setPlaying(false);
            if (!active || view.isAnimating()) return;
            cancelDrag(); if (reset) session.reset(); else session.back(); saveProgress(); refreshStep();
        }
        function attachPart(id, pose, duration) {
            const token = run;
            if (!view.beginSnap(id, pose, () => {
                if (!active || token !== run) return;
                session.completeStep(id); root.AssemblyFeedbackAudio?.attached(); saveProgress(); refreshStep();
                playDelay = .35;
                if (session.status().complete) setPlaying(false);
                refreshAvailability();
                options.status(session.status().complete ? 'Guided assembly complete.' : 'Part attached. Continue with the next part.');
            }, duration)) return;
            back.disabled = restart.disabled = next.disabled = true;
            stagedId = ''; canvas.style.cursor = 'default';
        }
        function assembleNext() {
            if (!active || loading || !view || view.isAnimating()) return;
            const step = session.currentStep(); if (!step) return;
            cancelDrag(); focusStep();
            if (!view.stage(step.componentId)) return;
            const approach = step.approachDirection || step.cameraDirection;
            const direction = approach ? new T.Vector3().fromArray(approach) :
                view.focus().direction || camera.position.clone().sub(targetCenter(step.componentId));
            if (direction.lengthSq() < 1e-8) direction.set(0, 1, 0);
            const distance = Math.max(.025, Math.min(.08, view.focus().radius * .65));
            view.move(step.componentId, targetCenter(step.componentId).addScaledVector(direction.normalize(), distance));
            attachPart(step.componentId, view.targets.get(step.componentId), .16);
        }
        function refreshStep() {
            refreshAvailability();
            view.setInstalled(session.installedIds()); view.prepareStep(session.currentStep());
            const state = session.status(), step = session.currentStep();
            count.textContent = state.completedCount + ' / ' + state.totalSteps + ' steps complete';
            progress.max = state.totalSteps; progress.value = state.completedCount;
            back.disabled = !state.completedCount; restart.disabled = !state.completedCount;
            next.disabled = state.complete;
            stepLabel.textContent = state.complete ? 'ASSEMBLY COMPLETE' : 'STEP ' + (state.completedCount + 1) + ' OF ' + state.totalSteps;
            stepTitle.textContent = state.complete ? 'Your robot is assembled' : step.title;
            instruction.textContent = state.complete ? 'Restart to practise again, or exit to return to your workspace.' :
                (step.workbenchLabel || step.phase ? (step.workbenchLabel || step.phase) + (step.manualPage ? ' · Manual p. ' + step.manualPage : '') + '\n' : '') +
                (step.instruction || 'Drag this part onto the blue preview. It will align and attach when you release nearby.');
            feedback.textContent = '';
            const previousScroll = inventory.scrollTop || 0;
            let currentRow = null;
            inventory.textContent = '';
            const manifest = runtime.physicsModel().manifest;
            const base = manifest.components.find(part => part.id === session.baseComponentId);
            inventory.appendChild(element('div', 'assembly-guide-base', (base ? base.name : 'Base') + ' · Base installed'));
            session.steps().forEach((item, index) => {
                const part = manifest.components.find(value => value.id === item.componentId), installed = session.isInstalled(item.componentId);
                const current = step && item.componentId === step.componentId;
                const row = element('button', 'assembly-guide-part' + (current ? ' is-current' : '') + (installed ? ' is-installed' : ''));
                row.type = 'button'; row.dataset.componentId = item.componentId;
                row.disabled = !current; row.setAttribute('aria-current', current ? 'step' : 'false');
                const img = element('img'); img.alt = ''; img.draggable = false;
                if (images.has(item.componentId)) img.src = images.get(item.componentId);
                const label = element('span'); label.append(element('strong', '', part ? part.name : item.componentId), element('small', '', installed ? 'Installed' : current ? 'Drag to assemble' : 'Step ' + (index + 1)));
                row.append(img, label, element('span', 'assembly-guide-part-state', installed ? '✓' : String(index + 1)));
                row.addEventListener('pointerdown', event => kitPress(event, item.componentId, row));
                row.addEventListener('click', event => { if (event.detail === 0 && current) stageBeside(item.componentId); });
                inventory.appendChild(row);
                if (current) currentRow = row;
            });
            inventory.scrollTop = previousScroll;
            if (currentRow && inventory.clientHeight > 0) {
                const rowBounds=currentRow.getBoundingClientRect(), listBounds=inventory.getBoundingClientRect();
                let top=previousScroll;
                if(rowBounds.bottom>listBounds.bottom-8)top+=rowBounds.bottom-listBounds.bottom+8;
                else if(rowBounds.top<listBounds.top+8)top+=rowBounds.top-listBounds.top-8;
                const reduced=root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if(inventory.scrollTo)inventory.scrollTo({top:Math.max(0,top),behavior:reduced?'auto':'smooth'});
                else inventory.scrollTop=Math.max(0,top);
            }
            focusStep();
        }
        // Reuse practice geometry and image textures for small thumbnails, one
        // per frame. Reflection render targets belong to their WebGL context.
        async function thumbnails(token) {
            let thumbStyle, renderer, released = false;
            const thumbnailMaterials = new Map();
            const job = { dispose() {
                if (released) return; released = true;
                thumbnailMaterials.forEach(material => material.dispose()); thumbnailMaterials.clear();
                if (thumbStyle) thumbStyle.dispose();
                if (renderer) { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); }
                thumbnailJobs.delete(job);
            } };
            thumbnailJobs.add(job);
            try {
                renderer = new T.WebGLRenderer({ antialias: true, alpha: false }); renderer.setSize(144, 104);
                const thumbScene = new T.Scene(); thumbStyle = root.ProductViewportStyle.create(T, renderer, thumbScene);
                const thumbCamera = new T.PerspectiveCamera(36, 144 / 104, .0001, 100);
                for (const step of session.steps()) {
                    await new Promise(resolve => root.requestAnimationFrame(resolve));
                    if (released || token !== run || !active) break;
                    const source = view.targets.get(step.componentId), mesh = view.meshes.get(step.componentId).clone(true);
                    mesh.traverse(object => {
                        if (!object.isMesh) return;
                        function thumbnailMaterial(material) {
                            if (!thumbnailMaterials.has(material)) {
                                const copy = material.clone();
                                if ('envMap' in copy) copy.envMap = null;
                                thumbnailMaterials.set(material, copy);
                            }
                            return thumbnailMaterials.get(material);
                        }
                        object.material = Array.isArray(object.material) ? object.material.map(thumbnailMaterial) : thumbnailMaterial(object.material);
                        thumbStyle.apply(object);
                    });
                    // Include child artwork, and frame the actual split geometry.
                    // Prepared asset sizes still describe the original whole GLB.
                    mesh.visible = true; mesh.matrixAutoUpdate = true;
                    source.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale); mesh.updateMatrixWorld(true);
                    const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld), center = bounds.getCenter(new T.Vector3());
                    mesh.position.sub(center); thumbScene.add(mesh);
                    const radius = Math.max(.002, bounds.getSize(new T.Vector3()).length() * 1.55);
                    thumbCamera.position.set(radius * .7, radius * .55, radius); thumbCamera.lookAt(0, 0, 0);
                    renderer.render(thumbScene, thumbCamera);
                    const image = renderer.domElement.toDataURL('image/png'); images.set(step.componentId, image);
                    Array.from(inventory.querySelectorAll('[data-component-id]')).forEach(row => { if (row.dataset.componentId === step.componentId) row.querySelector('img').src = image; });
                    thumbScene.remove(mesh);
                }
            } catch (_) { /* Part names and the full-size preview remain available. */ }
            finally { job.dispose(); }
        }
        async function start() {
            if (active || loading || options.busy()) return;
            const part = candidate(), manifest = practiceManifest(part); if (!manifest) return;
            storageId = JSON.stringify([options.boardId(), part.id, manifest.id]);
            const pendingSession = root.GuidedAssemblySession.create(manifest, readProgress().sessions[storageId]);
            if (!pendingSession.ready) { options.status(pendingSession.errors[0] || 'Enable a complete assembly guide in Product Editor first.'); return; }
            const token = ++run; loading = true; modal.classList.add('is-guide-loading'); refreshAvailability();
            options.status('Loading assembly guide: ' + manifest.name);
            toggle.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
            let loaded;
            try {
                loaded = await root.ProductRuntime.load(T, manifest, { authoring: true, baseUrl: part.productBaseUrl });
                if (token !== run) { loaded.dispose(); return; }
                runtime = loaded; session = pendingSession;
                view = root.AssemblyGuideView.create(T, { scene: options.scene, runtime, viewportStyle: options.viewportStyle });
                options.suspend(); active = true; loading = false;
                modal.classList.remove('is-guide-loading'); modal.classList.add('is-guided');
                kit.hidden = hint.hidden = false; title.textContent = manifest.name;
                refreshStep(); saveProgress(); refreshAvailability(); thumbnails(token);
                options.status('Drag the highlighted kit part into the blue preview.');
            } catch (error) {
                if (token !== run) return;
                if (loaded && loaded !== runtime) loaded.dispose();
                exit(); options.status('Could not start assembly guide: ' + error.message);
            }
        }
        function exit() {
            setPlaying(false);
            ++run; cancelDrag(); focusRadius = null;
            // Pending animation frames may not run while the window is hidden.
            // Release this run's thumbnail context before disposing borrowed assets.
            Array.from(thumbnailJobs).forEach(job => job.dispose());
            if (view) view.dispose(); if (runtime) runtime.dispose(); view = runtime = session = null;
            if (active) options.resume(); active = loading = false;
            images.clear(); modal.classList.remove('is-guided', 'is-guide-loading'); kit.hidden = hint.hidden = true;
            toggle.innerHTML = '<i class="fas fa-book-open" aria-hidden="true"></i>'; refreshAvailability();
        }
        function ray(event) {
            const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
            camera.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera); return raycaster.ray;
        }
        function inside(event) {
            const rect = canvas.getBoundingClientRect(); return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        }
        function block(event) { event.preventDefault(); event.stopImmediatePropagation(); }
        function targetCenter(id) {
            const mesh = view.targets.get(id); mesh.updateMatrixWorld(true);
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld).getCenter(new T.Vector3());
        }
        function stageBeside(id) {
            if (!active || view.isAnimating() || !session.canSelect(id)) return;
            cancelDrag(); focusStep(); if (!view.stage(id)) return; stagedId = id;
            const right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
            view.move(id, targetCenter(id).addScaledVector(right, Math.max(.03, view.focus().radius * 1.2)));
            notify('Drag the part onto its blue preview. Release nearby to attach.');
        }
        function kitPress(event, id, row) {
            if (event.button !== 0 || !active || view.isAnimating() || !session.canSelect(id)) return;
            block(event); setPlaying(false); cancelDrag(); focusStep();
            if(event.pointerType==='touch')lockKitScroll();
            drag = { kitScrollTop:inventory.scrollTop||0, pointerType:event.pointerType, id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, started: false, moved: false, capture: row };
            try { row.setPointerCapture(event.pointerId); } catch (_) { }
        }
        function beginDrag(event, id, fromKit) {
            setPlaying(false);
            // A quick kit drag previously cancelled the mounting-side camera
            // animation before it had moved, leaving underside holes hidden.
            // Finish the authored view before fixing the screen-space drag plane.
            if (fromKit) {
                orbit.theta = orbit.desiredTheta; orbit.phi = orbit.desiredPhi;
                orbit.target.copy(orbit.desiredTarget);
                if (focusRadius !== null) orbit.radius = focusRadius;
                camera.position.set(orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
                    orbit.target.y + orbit.radius * Math.cos(orbit.phi),
                    orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta));
                camera.lookAt(orbit.target); camera.updateMatrixWorld(true);
            }
            freezeCamera(); if (!view.stage(id)) return false; stagedId = id;
            const center = targetCenter(id), plane = new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()), center);
            const hit = ray(event).intersectPlane(plane, new T.Vector3());
            if (!hit) return false;
            drag.plane = plane; drag.offset = fromKit ? new T.Vector3() : view.center(id).sub(hit); drag.started = true;
            view.move(id, hit.add(drag.offset)); canvas.style.cursor = 'move'; return true;
        }
        canvas.addEventListener('pointerdown', event => {
            if (!active) return;
            if (view.isAnimating()) { block(event); return; }
            if (event.button !== 0 || event.shiftKey || !stagedId) return;
            ray(event); const mesh = view.meshes.get(stagedId); mesh.updateMatrixWorld(true);
            if (!raycaster.intersectObject(mesh, true).length) return;
            block(event);
            drag = { pointerType:event.pointerType, id: stagedId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, started: false, capture: canvas };
            // stage() resets its transform; preserve its visible centre first.
            const oldCenter = view.center(stagedId); view.stage(stagedId); view.move(stagedId, oldCenter);
            freezeCamera();
            drag.plane = new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()), targetCenter(stagedId));
            const hit = ray(event).intersectPlane(drag.plane, new T.Vector3());
            if (!hit) { cancelDrag(); return; }
            drag.offset = oldCenter.sub(hit); drag.started = true;
            try { canvas.setPointerCapture(event.pointerId); } catch (_) { }
        }, true);
        root.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.pointerId || !active) return;
            block(event);
            const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
            if(drag.pointerType==='touch' && drag.capture!==canvas && !drag.started){
                if(!drag.dragIntent && !drag.scrolling && Math.max(Math.abs(dx),Math.abs(dy))>8){
                    if(Math.abs(dy)>Math.abs(dx)*1.2){drag.scrolling=true;unlockKitScroll();}
                    else drag.dragIntent=true;
                }
                if(drag.scrolling){inventory.scrollTop=drag.kitScrollTop-dy;return;}
                if(!drag.dragIntent)return;
            }
            if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
            if (!drag.started && drag.moved && inside(event) && !beginDrag(event, drag.id, true)) return;
            if (!drag.started || !drag.moved) return;
            const hit = ray(event).intersectPlane(drag.plane, new T.Vector3());
            if (hit) view.move(drag.id, hit.add(drag.offset));
            const result = session.testDrop(T, drag.id, view.meshes.get(drag.id), view.targets.get(drag.id));
            feedback.textContent = result.accepted && inside(event) ? 'Release to attach' : 'Move the part onto the blue preview';
            canvas.style.cursor = 'move';
        }, true);
        root.addEventListener('pointerup', event => {
            if (!drag || event.pointerId !== drag.pointerId || !active) return;
            block(event); const finished = drag; drag = null; unlockKitScroll();
            try { finished.capture.releasePointerCapture(event.pointerId); } catch (_) { }
            if (finished.scrolling) return;
            if (!finished.moved) { if (!finished.started) stageBeside(finished.id); return; }
            if (!finished.started || !inside(event)) { cancelDrag(); notify('Part returned to the kit. Drag it into the workspace to try again.'); return; }
            const result = session.testDrop(T, finished.id, view.meshes.get(finished.id), view.targets.get(finished.id));
            if (!result.accepted) { cancelDrag(); notify(result.reason); return; }
            attachPart(finished.id, result.worldPose);
        }, true);
        ['pointercancel', 'lostpointercapture'].forEach(type => root.addEventListener(type, event => {
            if (drag && event.pointerId === drag.pointerId) { block(event); cancelDrag(); }
        }, true));
        root.addEventListener('blur', () => { if (active) cancelDrag(); });
        canvas.addEventListener('wheel', event => { if (drag || active && view.isAnimating()) block(event); else if (active) focusRadius = null; }, { capture: true, passive: false });
        doc.addEventListener('keydown', event => {
            if (event.key === 'Escape' && (active || loading)) { block(event); if (drag || stagedId) cancelDrag(); else exit(); }
        }, true);
        ['click', 'input', 'change'].forEach(type => modal.addEventListener(type, event => {
            if ((active || loading) && event.target.closest('.assembly-inspector, .assembly-mode-panel') && !event.target.closest('[data-guide-control]')) block(event);
        }, true));
        toggle.addEventListener('click', () => { if (active || loading) exit(); else start(); });
        refreshAvailability();
        return { get active() { return active; }, get loading() { return loading; }, get meshes() { return view && view.meshes; },
            refreshAvailability, refreshPublished, start, exit,
            beginCameraGesture(){if(drag)cancelDrag();focusRadius=null;},
            update(dt) {
                if (!active) return;
                view.update(dt);
                if (playing && !view.isAnimating() && !drag && !orbit.dragging) {
                    playDelay -= Math.min(.1, Math.max(0, dt));
                    if (playDelay <= 0) assembleNext();
                }
                if (orbit.dragging) focusRadius = null;
                if (focusRadius !== null) { orbit.radius += (focusRadius - orbit.radius) * (1 - Math.pow(.8, dt * 60)); if (Math.abs(focusRadius - orbit.radius) < .0001) focusRadius = null; }
            },
            cursor(event) {
                if (drag && drag.started) return 'move';
                if (orbit.dragging && orbit.moved) return 'var(--cursor-grabbing, grabbing)';
                if (stagedId && event) { ray(event); const mesh = view.meshes.get(stagedId); if (raycaster.intersectObject(mesh, true).length) return 'move'; }
                return 'var(--cursor-grab, grab)';
            }
        };
    }
    root.AssemblyGuidedMode = { create, practiceManifest, STORAGE_KEY };
    if (typeof module !== 'undefined') module.exports = root.AssemblyGuidedMode;
})(typeof window !== 'undefined' ? window : globalThis);
