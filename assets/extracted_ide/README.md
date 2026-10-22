# microBlock IDE (Offline version)

Offline version of microBlock IDE

## Using

```bash
# Clone project
git clone --recurse-submodules https://github.com/microBlock-IDE/microBlock-IDE-offline.git

# Install electron-rebuild
npm install --save-dev electron-rebuild

# Install the dependencies 
npm install

# Run program
npm start
```

## Product authoring

Run the internal Product Editor from the source checkout:

```powershell
npm run product-editor
```

Create Board, Component or Robot products, assemble imported STEP/GLB parts, place surface textures, and configure joints, motors, servos, sensors and board connections. **Starter robot** creates a small working example with two wheel motors, a servo and eight line sensors.

**Save Source** stores editable products in `product-packages-src/`. **Publish to IDE** saves and copies products into `microBlock-IDE/products/`, where Assembly Equipment can use them. The editor, editable sources and exported archives are excluded from `npm run dist`; published runtime products are included.

See [Product Editor workflow and package format](tools/board-package-editor/README.md) for setup, publishing, legacy `.ptboard` compatibility and current simulation limits. The existing `npm run board-editor` command remains an alias.

## Windows auto update release

The installed NSIS build checks updates from:

```text
https://pt-robotics.com/files/roboblocks/
```

1. Increase `version` in `package.json`.
2. Build the Windows release with `npm run dist:win`.
3. Upload these generated files from `dist` to the update URL:

```text
latest.yml
roboBlocks-IDE-<version>.exe
roboBlocks-IDE-<version>.exe.blockmap
```

Keep the filenames unchanged because `latest.yml` references them directly. The first NSIS release must be installed manually by users of the previous MSI build; later releases can update from inside the application.

