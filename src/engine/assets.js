// Loads sprite sheets described by sprites/out/manifest.json.
// This is the only module that knows where art comes from: replace the manifest and
// PNGs (same sprite ids) to swap in different art without touching the engine.
//
// Manifest sprite entry:
//   { sheet, w, h, anchor: [ax, ay], fps, anims: { name: { frames: [[x,y]...], hit?: [[x,y]...] } } }

export async function loadAssets(base) {
  const manifest = await (await fetch(base + 'manifest.json')).json();
  const images = {};
  await Promise.all(
    Object.entries(manifest.sheets).map(
      ([name, file]) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve((images[name] = img));
          img.onerror = () => reject(new Error('Failed to load ' + file));
          img.src = base + file;
        }),
    ),
  );
  // Mirrored copy of every sheet so left-facing sprites draw without transforms.
  const mirrored = {};
  for (const [name, img] of Object.entries(images)) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.translate(img.width, 0);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0);
    mirrored[name] = c;
  }
  const sprites = {};
  for (const [id, s] of Object.entries(manifest.sprites)) {
    // Resolve the sheet images once so drawing never looks them up by name.
    sprites[id] = {
      ...s,
      image: images[s.sheet],
      imageFlipped: mirrored[s.sheet],
      sheetWidth: images[s.sheet].width,
      anchor: s.anchor ?? [s.w / 2, s.h],
      fps: s.fps ?? 1,
    };
  }
  return {
    sprites,
    sprite(id) {
      const s = sprites[id];
      if (!s) throw new Error('Unknown sprite id: ' + id);
      return s;
    },
  };
}
