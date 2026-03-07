import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  console.log("Navigating to http://127.0.0.1:8787/index.html...");
  await page.goto('http://127.0.0.1:8787/index.html');

  const getActiveSlide = async () => page.evaluate(() => {
    return document.querySelector('.slide:not([hidden])')?.textContent?.trim();
  });

  console.log("\n--- TEST: Slides advancing ---");
  await new Promise(r => setTimeout(r, 500));
  let slide1 = await getActiveSlide();
  console.log("Initial Slide:", slide1);

  console.log("Waiting 2.1 seconds for Slide 2...");
  await new Promise(r => setTimeout(r, 2100));
  let slide2 = await getActiveSlide();
  console.log("Next Slide:", slide2);

  console.log("\n--- TEST: Screensaver Pause ---");
  console.log("Waiting 3.5 seconds for screensaver to kick in (Slide timer should pause)...");
  await new Promise(r => setTimeout(r, 3500));

  const isScreensaverActive = await page.evaluate(() => {
    return document.querySelector('.screensaver-wrapper')?.classList.contains('is-active');
  });
  console.log("Is Screensaver Active?", isScreensaverActive);

  let slideDuringScreensaver = await getActiveSlide();
  console.log("Slide during screensaver:", slideDuringScreensaver);

  console.log("Waiting 2.5 MORE seconds while screensaver is active...");
  await new Promise(r => setTimeout(r, 2500));
  let slideAfterWait = await getActiveSlide();
  console.log("Slide after wait (should NOT advance):", slideAfterWait);

  console.log("\n--- TEST: Screensaver Resume ---");
  console.log("Firing mousemove to dismiss screensaver...");
  await page.mouse.move(100, 100);

  // Wait for the screensaver to clear its fade out (0.5s) and slideshow to finish its remaining timer
  console.log("Waiting 3 seconds for slide to resume...");
  await new Promise(r => setTimeout(r, 3000));

  let slideFinal = await getActiveSlide();
  console.log("Final Slide (Should have advanced!):", slideFinal);

  await browser.close();
}

test().catch(console.error);
