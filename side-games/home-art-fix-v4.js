(() => {
  const PARTS = Array.from({ length: 12 }, (_, i) => `./side-games/assets/premium-home/home-final-v4-${String(i).padStart(2, "0")}.b64?v=20260916-home-art-v4`);
  const apply = async () => {
    const image = document.querySelector("#bootHome .nx-home-map image");
    if (!image) return false;
    try {
      const chunks = await Promise.all(PARTS.map(async url => { const r = await fetch(url, { cache: "force-cache" }); if (!r.ok) throw new Error(`home art ${r.status}`); return (await r.text()).trim(); }));
      const binary = atob(chunks.join(""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
      image.setAttribute("href", objectUrl);
      image.addEventListener("load", () => setTimeout(() => URL.revokeObjectURL(objectUrl), 1000), { once: true });
      return true;
    } catch (error) { console.error("NEON XI home art load failed", error); return false; }
  };
  let tries = 0;
  const timer = setInterval(async () => { if (await apply() || ++tries > 120) clearInterval(timer); }, 50);
})();
