(function (root) {
    'use strict';

    const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
    const finite = value => Number.isFinite(value) ? value : 0;
    function sensorReflectance(r,g,b) {
        const brightness=.2126*r+.7152*g+.0722*b;
        // Empirical yellow-floor response: real calibrated readings are <50.
        // Visible RGB brightness is not an IR reflectance measurement. Blend
        // toward 40% for saturated yellow; leave neutral/red/green pixels alone.
        if(r>100&&g>100&&r>=g*.85&&g>=r*.65&&b<Math.min(r,g)){
            const saturation=(Math.min(r,g)-b)/Math.min(r,g);
            return brightness*(1-saturation)+102*saturation;
        }
        return brightness;
    }

    // Image rows run from -Z to +Z. Keep this mapping identical to the top face's
    // UVs so line sensors read the artwork directly, including antialiased edges.
    function createSampler(image, options) {
        options = options || {};
        const columns = image.width, rows = image.height, rgba = image.data;
        if (!(columns > 0 && rows > 0 && rgba && rgba.length >= columns * rows * 4)) {
            throw new Error('The field image has no readable pixels.');
        }
        const width = positive(options.width, 2.4), length = positive(options.length, 1.2);
        const centerX = finite(options.centerX), centerZ = finite(options.centerZ);
        const luminance = new Uint8Array(columns * rows);
        for (let pixel = 0, offset = 0; pixel < luminance.length; pixel++, offset += 4) {
            const alpha = rgba[offset + 3] / 255;
            luminance[pixel] = Math.round(sensorReflectance(rgba[offset],rgba[offset+1],rgba[offset+2]) * alpha + 255 * (1 - alpha));
        }
        return createLuminanceSampler({data:luminance,columns,rows,width,length,centerX,centerZ});
    }
    function createLuminanceSampler(snapshot) {
        const {data:luminance,columns,rows,width,length,centerX,centerZ}=snapshot;
        const lineAt=function(x, z) {
            if (!Number.isFinite(x) || !Number.isFinite(z)) return 1;
            const u = (x - centerX) / width + .5, v = (z - centerZ) / length + .5;
            if (u < 0 || u > 1 || v < 0 || v > 1) return 1;
            // Texture coordinates refer to texel centers, not their left edges.
            const px = Math.max(0, Math.min(columns - 1, u * columns - .5));
            const py = Math.max(0, Math.min(rows - 1, v * rows - .5));
            const x0 = Math.floor(px), y0 = Math.floor(py);
            const x1 = Math.min(columns - 1, x0 + 1), y1 = Math.min(rows - 1, y0 + 1);
            const tx = px - x0, ty = py - y0;
            const top = luminance[y0 * columns + x0] * (1 - tx) + luminance[y0 * columns + x1] * tx;
            const bottom = luminance[y1 * columns + x0] * (1 - tx) + luminance[y1 * columns + x1] * tx;
            return (top * (1 - ty) + bottom * ty) / 255;
        };
        lineAt.snapshot=snapshot;
        return lineAt;
    }

    function create(T, options) {
        options = options || {};
        const width = positive(options.width, 2.4), length = positive(options.length, 1.2);
        const centerX = finite(options.centerX), centerZ = finite(options.centerZ);
        const bounds = options.bounds || {width,length,centerX,centerZ};
        const thickness = positive(options.thickness, .005), baseY = finite(options.baseY);
        const topY = baseY + thickness;
        const material = new T.MeshBasicMaterial({color: 0xffffff, toneMapped: false});
        const sides = new T.MeshStandardMaterial({color: 0xffffff, roughness: .95, metalness: 0, envMapIntensity: .15});
        // Box material 2 is the +Y face. Its UV top is -Z, matching lineAt.
        // One closed box supplies the artwork and board thickness, without a
        // second coplanar surface that could flicker while the camera moves.
        const mesh = new T.Mesh(new T.BoxBufferGeometry(bounds.width, thickness, bounds.length),
            [sides, sides, material, sides, sides, sides]);
        mesh.name = 'Robot field';
        mesh.position.set(bounds.centerX, baseY + thickness / 2, bounds.centerZ);
        const rodMaterial=new T.MeshStandardMaterial({color:new T.Color(0xcba477).convertSRGBToLinear(),roughness:.85});
        const rodGeometries=[];
        for(const rod of options.rods||[]){
            const geometry=new T.CylinderBufferGeometry(rod.diameter/2,rod.diameter/2,rod.length,16);
            rodGeometries.push(geometry);
            const bar=new T.Mesh(geometry,rodMaterial);bar.name='5 mm field rod';
            bar.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.sin(rod.yaw||0),0,Math.cos(rod.yaw||0)));
            bar.position.set(rod.x-bounds.centerX,thickness/2+rod.diameter/2,rod.z-bounds.centerZ);
            bar.castShadow=bar.receiveShadow=true;mesh.add(bar);
        }
        const structureResources=[];
        // A small shared contact-shadow texture avoids extra shadow-map passes.
        let contactTexture=null;
        if((options.structures||[]).length){
            const pixels=new Uint8Array(64*64*4);
            for(let y=0;y<64;y++)for(let x=0;x<64;x++){
                const edge=Math.max(Math.abs((x+.5)/32-1),Math.abs((y+.5)/32-1));
                const fade=Math.max(0,Math.min(1,(1-edge)/.25));
                pixels[(y*64+x)*4+3]=Math.round(255*fade*fade*(3-2*fade));
            }
            contactTexture=new T.DataTexture(pixels,64,64,T.RGBAFormat);contactTexture.needsUpdate=true;
            contactTexture.magFilter=contactTexture.minFilter=T.LinearFilter;structureResources.push(contactTexture);
        }
        for(const part of options.structures||[]){
            let geometry;
            if(part.vertices){
                const positions=[];for(const face of part.faces)for(let i=1;i<face.length-1;i++)for(const vertex of [face[0],face[i],face[i+1]])positions.push(...part.vertices[vertex]);
                geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
            }else geometry=new T.BoxBufferGeometry(...part.size);
            // Keep upward faces as white as the floor. Gentle fixed shading
            // on vertical faces and undersides makes the thin PVC readable.
            const normals=geometry.attributes.normal,positions=geometry.attributes.position,colors=[];
            geometry.computeBoundingBox();
            const bottom=geometry.boundingBox.min.y,height=Math.max(.001,geometry.boundingBox.max.y-bottom);
            for(let i=0;i<normals.count;i++){
                const ny=normals.getY(i),level=(positions.getY(i)-bottom)/height;
                const shade=ny>.5?1:ny<-.5?.79:.88+.06*level;
                colors.push(shade,shade,shade);
            }
            geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
            const surface=new T.MeshBasicMaterial({color:part.colorSpace==='srgb'?new T.Color(part.color).convertSRGBToLinear():part.color,toneMapped:false,vertexColors:true});
            const object=new T.Mesh(geometry,surface);object.name=part.name;
            object.position.set(part.x-bounds.centerX,thickness/2+part.y,part.z-bounds.centerZ);object.rotation.y=part.yaw;
            object.castShadow=object.receiveShadow=true;mesh.add(object);structureResources.push(geometry,surface);
            if(!part.hideEdges){
            const edgeGeometry=new T.EdgesGeometry(geometry,25),edgeMaterial=new T.LineBasicMaterial({color:0x788692,transparent:true,opacity:.3,depthWrite:false,toneMapped:false});
            const outline=new T.LineSegments(edgeGeometry,edgeMaterial);outline.name='PVC outline';outline.raycast=()=>{};object.add(outline);structureResources.push(edgeGeometry,edgeMaterial);
            }
            if(part.name.startsWith('Bridge')||part.name==='Tunnel roof'){
                const b=geometry.boundingBox,shadowGeometry=new T.PlaneBufferGeometry(b.max.x-b.min.x+.035,b.max.z-b.min.z+.035);
                const shadowMaterial=new T.MeshBasicMaterial({map:contactTexture,color:0x000000,transparent:true,opacity:part.name==='Tunnel roof'?.1:.08,depthWrite:false,toneMapped:false});
                const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.name='PVC contact shadow';shadow.raycast=()=>{};
                shadow.position.set(part.x-bounds.centerX,thickness/2+.0002,part.z-bounds.centerZ);shadow.rotation.set(-Math.PI/2,0,part.yaw);
                mesh.add(shadow);structureResources.push(shadowGeometry,shadowMaterial);
            }
        }
        mesh.visible = false;
        let sampler = null, texture = null, disposed = false, settled = false, resolveReady;
        const ready = new Promise(resolve => { resolveReady = resolve; });
        const field = {
            mesh, ready, width, length, bounds, baseY, thickness, topY,
            get loaded() { return !!sampler && !disposed; },
            controlSnapshot() { return {image:sampler&&!disposed?sampler.snapshot:null,rods:options.rods||[],floorY:topY}; },
            lineAt(x, z) {
                if(!sampler||disposed)return 1;
                // Raised wooden rods replace the printed guides optically as well as visually.
                // Use the same sRGB luminance convention as the field artwork sampler.
                for(const rod of options.rods||[]){
                    const dx=x-rod.x,dz=z-rod.z,c=Math.cos(rod.yaw||0),s=Math.sin(rod.yaw||0);
                    if(Math.abs(dx*c-dz*s)<=rod.diameter/2&&Math.abs(dx*s+dz*c)<=rod.length/2)
                        return (.2126*203+.7152*164+.0722*119)/255;
                }
                return sampler(x,z);
            },
            dispose() {
                if (disposed) return;
                rodGeometries.forEach(g=>g.dispose());rodMaterial.dispose();
                structureResources.forEach(resource=>resource.dispose());
                disposed = true; sampler = null; mesh.visible = false;
                if (mesh.parent) mesh.parent.remove(mesh);
                mesh.geometry.dispose(); material.dispose(); sides.dispose();
                if (texture) texture.dispose();
                finish(null);
            }
        };
        function finish(value) {
            if (settled) return;
            settled = true; resolveReady(value);
        }
        function failed(error) {
            if (disposed || settled) return;
            mesh.visible = false; sampler = null;
            if (texture) texture.dispose();
            finish(null);
            if (options.onError) options.onError(error instanceof Error ? error : new Error('Unable to load the robot field.'));
        }
        function loaded(loadedTexture) {
            if (disposed) { if (loadedTexture !== texture) loadedTexture.dispose(); return; }
            texture = loadedTexture;
            try {
                const image = options.layout&&root.SimFieldLayout
                    ? root.SimFieldLayout.compose(texture.image,options.layout,()=>root.document.createElement('canvas')) : texture.image;
                const canvas = options.createCanvas ? options.createCanvas() : root.document.createElement('canvas');
                canvas.width = image.naturalWidth || image.width;
                canvas.height = image.naturalHeight || image.height;
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Unable to read the robot field image.');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0);
                // Replace the printed rod guides with bare white field beneath the physical rods.
                for(const rod of options.layout?[]:options.rods||[]){
                    const u=(rod.x-centerX)/width+.5,v=(rod.z-centerZ)/length+.5;
                    const x0=Math.floor((u-.0025)*canvas.width),x1=Math.ceil((u+.0025)*canvas.width);
                    const y0=Math.floor((v-rod.length/length/2)*canvas.height),y1=Math.ceil((v+rod.length/length/2)*canvas.height);
                    context.fillStyle='#ffffff';context.fillRect(x0,y0,x1-x0,y1-y0);
                }
                if(options.layout||(options.rods||[]).length)texture.image=canvas;
                sampler = createSampler(context.getImageData(0, 0, canvas.width, canvas.height),
                    {width, length, centerX, centerZ});
                // Only the compact luminance array survives; no canvas reads in
                // the physics loop, even with multiple analog sensor footprints.
                if(texture.image!==canvas)canvas.width = canvas.height = 0;
                texture.repeat.set(bounds.width/width,bounds.length/length);
                texture.offset.set((bounds.centerX-centerX)/width+.5-bounds.width/width/2,
                    .5-(bounds.centerZ-centerZ)/length-bounds.length/length/2);
                texture.flipY = true;
                if (T.sRGBEncoding !== undefined) texture.encoding = T.sRGBEncoding;
                texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
                texture.magFilter = T.LinearFilter;
                texture.minFilter = T.LinearMipmapLinearFilter;
                texture.generateMipmaps = true;
                texture.anisotropy = positive(options.anisotropy, 4);
                texture.needsUpdate = true;
                material.map = texture; material.needsUpdate = true;
                mesh.visible = true;
            } catch (error) { failed(error); return; }
            finish(field);
            if (options.onLoad) options.onLoad(field);
        }
        try {
            texture = (options.loader || new T.TextureLoader()).load(options.url, loaded, undefined, failed);
        } catch (error) { failed(error); }
        return field;
    }

    root.SimFieldMap = {create, createSampler, createLuminanceSampler};
    if (typeof module !== 'undefined' && module.exports) module.exports = root.SimFieldMap;
})(typeof window !== 'undefined' ? window : globalThis);
