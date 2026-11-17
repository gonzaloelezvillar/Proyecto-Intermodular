export default async function run(page) {
  // Fuerza locale español si el navegador usa otro
  await page.evaluate(() => { try { Object.defineProperty(navigator, 'language', { get: () => 'es-ES' }); } catch { } });
  // Localizar Node: el toLocaleString sin locale usa el del navegador. Probamos directamente en la página.
  return await page.evaluate(() => {
    const prices = [...document.querySelectorAll('.product-price')].slice(0, 8).map(e => e.textContent.trim());
    const big = [...document.querySelectorAll('.product-price')].map(e => e.textContent.trim()).filter(t => t.startsWith('2') || t.startsWith('1.'));
    return { prices, big };
  });
}
