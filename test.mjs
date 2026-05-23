import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const errors = [];
const results = [];

/** Full *Most Extreme* episodes — each specimen’s #1 ranking animal must match. */
const EXTREME_EPISODE_VIDEOS = {
  'EXT-01': 'Yz-WKeGEQIA', // Super Sharks — hammerhead
  'EXT-02': 'y5TNO-jSUzo', // Biters — cookiecutter
  'EXT-03': 'y8qlfJ7aaoo', // Venom — box jellyfish (not Poison / dart frog)
  'EXT-04': 'uzOa4q-ilzk', // Dads — seahorse
  'EXT-05': 'rG_HOg8VGP8', // Loud Mouths — pistol shrimp (full episode)
  'EXT-06': 'B2f669rSC54', // Divers — sperm whale
  CURATOR: '9jJmaSgbOz4', // Disguises — mimic octopus
};
const REJECTED_EXTREME_VIDEOS = [
  '5qAetTMgTQA', // titled Venom but is the Poison episode
  'HHFwLE8Wt1E', // pistol-shrimp clip only, not full Loud Mouths
];

async function runSuite(page, label) {
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !/favicon|compute-pressure|Failed to load resource/i.test(text)) {
      errors.push(`[${label}] console: ${text}`);
    }
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.removeItem('depths-stories-opened-v2');
    localStorage.removeItem('depths-visited-v1');
    localStorage.removeItem('mia-ocean-passport-v1');
    localStorage.removeItem('depths-bonus-v1');
    sessionStorage.removeItem('depths-celebrated');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });

  const loaderVisible = await page.locator('#siteLoader').isVisible().catch(() => false);
  results.push([`${label}: loader shows on start`, loaderVisible, loaderVisible]);

  await page.waitForFunction(
    () => !document.getElementById('siteLoader') && !document.body.classList.contains('is-loading'),
    { timeout: 10000 },
  );
  const loaderGone = await page.evaluate(
    () => !document.getElementById('siteLoader') && !document.body.classList.contains('is-loading'),
  );
  results.push([`${label}: loader dismisses after boot`, loaderGone, loaderGone]);

  const noDuplicateGalleries = await page.evaluate(() => {
    const desk = window.matchMedia('(min-width: 960px)').matches;
    if (desk) {
      return !document.getElementById('creatureStrip')
        && !!document.querySelector('#carousel3d')
        && document.querySelectorAll('.side-nav-item').length === 7;
    }
    return !document.getElementById('creatureStripMobile')
      && document.querySelectorAll('.mobile-card').length === 7;
  });
  results.push([`${label}: single gallery layout`, noDuplicateGalleries, noDuplicateGalleries]);

  const noStarsBeforePanel = await page.evaluate(() => {
    const stray = document.querySelectorAll(
      '.mobile-card.done, .pick-row.done, .carousel-item.done, .passport-slot.stamped, #passportSlots .slot-stamp',
    );
    return stray.length === 0;
  });
  results.push([`${label}: no passport stars before view`, noStarsBeforePanel, noStarsBeforePanel]);

  const musicBtn = await page.locator('#musicBtn').count();
  results.push([`${label}: background music toggle`, musicBtn === 1, musicBtn]);

  const musicToggle = await page.evaluate(async () => {
    const btn = document.getElementById('musicBtn');
    if (!btn) return false;
    btn.click();
    await new Promise((r) => setTimeout(r, 200));
    const on = localStorage.getItem('depths-bgm-v1') === '1';
    const pressed = btn.getAttribute('aria-pressed') === 'true';
    btn.click();
    await new Promise((r) => setTimeout(r, 100));
    const off = localStorage.getItem('depths-bgm-v1') !== '1';
    return on && pressed && off;
  });
  results.push([`${label}: music preference toggles`, musicToggle, musicToggle]);

  const visitor = await page.locator('#visitorCount').textContent();
  results.push([`${label}: visitor counter live`, /Visitors?:\s*\d{6}|Visitas:\s*\d{6}/i.test(visitor || ''), visitor]);

  const dockSrc = await page.locator('#dockThumb').getAttribute('src');
  const dockTitle = await page.locator('#dockTitle').textContent();
  results.push([`${label}: dock populated on load`, !!dockSrc && dockSrc.startsWith('http') && !!dockTitle, { dockSrc, dockTitle }]);

  const episodeVideos = await page.evaluate(() => {
    const items = typeof ITEMS !== 'undefined' ? ITEMS : [];
    const bonus = typeof OCTOPUS_BONUS !== 'undefined' ? OCTOPUS_BONUS : null;
    const map = Object.fromEntries(items.map((i) => [i.specimen, i.videoId]));
    if (bonus?.videoId) map.CURATOR = bonus.videoId;
    return map;
  });
  const videosOk = Object.entries(EXTREME_EPISODE_VIDEOS).every(
    ([id, vid]) => episodeVideos[id] === vid,
  );
  const noRejected = !Object.values(episodeVideos).some((vid) => REJECTED_EXTREME_VIDEOS.includes(vid));
  results.push([`${label}: correct Most Extreme episode IDs`, videosOk && noRejected, { expected: EXTREME_EPISODE_VIDEOS, actual: episodeVideos }]);

  const brandOk = await page.evaluate(() => {
    const title = document.getElementById('brandTitle')?.textContent || '';
    const tagline = document.getElementById('siteTagline')?.textContent || '';
    const footer = document.getElementById('siteFooter')?.textContent || '';
    return /Ocean Passport/i.test(title) && tagline.length > 20 && /not affiliated/i.test(footer);
  });
  results.push([`${label}: rebrand and credits visible`, brandOk, brandOk]);

  const passportSlots = await page.locator('.passport-slot').count();
  results.push([`${label}: passport game slots`, passportSlots === 7, passportSlots]);

  page.once('dialog', (dialog) => dialog.accept());

  const curatorLocked = await page.evaluate(() => {
    const slot = document.querySelector('.passport-slot.bonus');
    const img = slot?.querySelector('img');
    const mystery = slot?.querySelector('.bonus-mystery');
    const code = slot?.querySelector('.slot-code')?.textContent;
    return !!slot
      && slot.disabled
      && slot.classList.contains('locked')
      && !!mystery
      && !img
      && code === '?';
  });
  results.push([`${label}: octopus locked until six viewed`, curatorLocked, curatorLocked]);

  await page.evaluate(() => {
    const ids = ['EXT-01', 'EXT-02', 'EXT-03', 'EXT-04', 'EXT-05', 'EXT-06'];
    const at = {};
    ids.forEach((id) => { at[id] = Date.now(); });
    localStorage.setItem('depths-stories-opened-v2', JSON.stringify({ order: ids, at }));
  });
  await page.locator('#resetBtn').click();
  await page.waitForTimeout(400);
  const progressCleared = await page.evaluate(() => {
    const visited = JSON.parse(localStorage.getItem('depths-stories-opened-v2') || '{}').order || [];
    const stamped = document.querySelectorAll('.passport-slot.stamped').length;
    const octLocked = document.querySelector('.passport-slot.bonus')?.disabled;
    return visited.length === 0 && stamped === 0 && octLocked === true;
  });
  results.push([`${label}: reset clears progress`, progressCleared, progressCleared]);

  await page.evaluate(() => {
    localStorage.setItem('mia-ocean-passport-v1', JSON.stringify(['EXT-01', 'EXT-02', 'EXT-03', 'EXT-04', 'EXT-05', 'EXT-06']));
    localStorage.setItem('depths-visited-v1', JSON.stringify({
      order: ['EXT-01', 'EXT-02', 'EXT-03', 'EXT-04', 'EXT-05', 'EXT-06'],
      at: {},
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => !document.getElementById('siteLoader') && !document.body.classList.contains('is-loading'),
    { timeout: 10000 },
  ).catch(() => {});
  const legacyPassportNoStars = await page.evaluate(() => {
    const stamps = document.querySelectorAll('#passportSlots .slot-stamp').length;
    const stamped = document.querySelectorAll('.passport-slot.stamped').length;
    return stamps === 0 && stamped === 0;
  });
  results.push([`${label}: legacy storage does not auto-star`, legacyPassportNoStars, legacyPassportNoStars]);

  const bubbles = await page.locator('.bubble').count();
  results.push([`${label}: ambient bubbles`, bubbles >= 10, bubbles]);

  await page.waitForFunction(() => {
    const v = document.querySelector('#bgVideo');
    return v && (v.readyState >= 2 || v.currentSrc);
  }, { timeout: 12000 }).catch(() => {});
  const bgOk = await page.locator('#bgVideo').evaluate((v) => v.querySelectorAll('source').length >= 1);
  results.push([`${label}: bg video`, bgOk, bgOk]);

  const isDesktop = label === 'desktop';

  if (isDesktop) {
    const y2kAds = await page.evaluate(() => {
      const rails = document.getElementById('sponsorRails');
      const leftRail = document.querySelector('.sponsor-rail--left');
      const ls = leftRail ? getComputedStyle(leftRail) : null;
      const imgs = [...document.querySelectorAll('#sponsorRails .sponsor-tile img')];
      const ui = document.querySelector('.ui-layer');
      const uiPad = ui ? parseFloat(getComputedStyle(ui).paddingLeft) : 0;
      const railStyle = rails ? getComputedStyle(rails) : null;
      const rect = leftRail?.getBoundingClientRect();
      const visible = !!rect && rect.width > 0 && rect.height > 0
        && railStyle?.display !== 'none'
        && railStyle?.visibility !== 'hidden'
        && parseFloat(railStyle?.opacity || '1') > 0
        && parseInt(ls?.zIndex || railStyle?.zIndex || '0', 10) >= 10;
      return {
        ok: visible
          && imgs.length >= 10
          && imgs.every((img) => /\/sponsors\//.test(img.src) && img.alt)
          && uiPad >= 120,
        count: imgs.length,
        uiPad,
        railZ: ls?.zIndex,
        railsZ: railStyle?.zIndex,
      };
    });
    results.push([`${label}: Y2K side sponsor banners`, y2kAds.ok, y2kAds]);

    const itemCount = await page.locator('.carousel-item').count();
    results.push([`${label}: 3d carousel items`, itemCount === 7, itemCount]);

    const numEl = await page.locator('#carouselItems').evaluate((el) => getComputedStyle(el).getPropertyValue('--_num-elements').trim());
    results.push([`${label}: carousel --_num-elements`, numEl === '7', numEl]);

    await page.locator('.carousel-item.is-selected button.polaroid-frame').waitFor({ timeout: 5000 });
    await page.locator('.carousel-item.is-selected button.polaroid-frame').click();
    await page.waitForSelector('body.panel-open', { timeout: 5000 });
    await page.locator('#closeBtn').click();
    await page.waitForTimeout(400);

    const sideNavFocus = await page.evaluate(async () => {
      const btn = document.querySelector('.side-nav-item[data-specimen="EXT-02"]');
      if (!btn) return false;
      btn.click();
      await new Promise((r) => setTimeout(r, 900));
      return !document.body.classList.contains('panel-open')
        && document.querySelector('#dockTitle')?.textContent === 'Cookiecutter Shark'
        && document.getElementById('carousel3d')?.classList.contains('carousel-focusing')
        && document.querySelector('.carousel-item.is-selected')?.dataset.specimen === 'EXT-02';
    });
    results.push([`${label}: side menu focuses carousel`, sideNavFocus, sideNavFocus]);

    const sideNavThenCard = await page.evaluate(async () => {
      const frame = document.querySelector('.carousel-item.is-selected button.polaroid-frame');
      if (!frame) return false;
      frame.click();
      await new Promise((r) => setTimeout(r, 500));
      return document.body.classList.contains('panel-open')
        && document.querySelector('#title')?.textContent === 'Cookiecutter Shark';
    });
    results.push([`${label}: carousel opens after side pick`, sideNavThenCard, sideNavThenCard]);
    if (sideNavThenCard) {
      await page.locator('#closeBtn').click();
      await page.waitForTimeout(250);
    }

    const anyCardClick = await page.evaluate(async () => {
      const frame = document.querySelector('.carousel-item[data-specimen="EXT-03"] button.polaroid-frame');
      if (!frame) return false;
      frame.click();
      await new Promise((r) => setTimeout(r, 600));
      return document.querySelector('#title')?.textContent === 'Box Jellyfish';
    });
    results.push([`${label}: any carousel card opens panel`, anyCardClick, anyCardClick]);
    if (anyCardClick) {
      await page.locator('#closeBtn').click();
      await page.waitForTimeout(250);
    }

    const captionClick = await page.evaluate(async () => {
      const btn = document.querySelector('button.polaroid-frame .frame-caption')?.closest('button.polaroid-frame');
      if (!btn) return false;
      btn.click();
      await new Promise((r) => setTimeout(r, 400));
      return document.body.classList.contains('panel-open');
    });
    results.push([`${label}: polaroid caption click`, captionClick, captionClick]);
    if (captionClick) {
      await page.locator('#closeBtn').click();
      await page.waitForTimeout(200);
    }

    const passportFocus = await page.evaluate(async () => {
      const slot = document.querySelector('.passport-slot[data-specimen="EXT-04"]');
      if (!slot) return false;
      slot.click();
      await new Promise((r) => setTimeout(r, 900));
      if (document.body.classList.contains('panel-open')) return false;
      if (document.querySelector('#dockTitle')?.textContent !== 'Seahorse') return false;
      document.querySelector('.carousel-item.is-selected button.polaroid-frame')?.click();
      await new Promise((r) => setTimeout(r, 500));
      const ok = document.querySelector('#title')?.textContent === 'Seahorse';
      document.querySelector('#closeBtn')?.click();
      await new Promise((r) => setTimeout(r, 250));
      return ok;
    });
    results.push([`${label}: passport focuses then card opens`, passportFocus, passportFocus]);

    await page.evaluate(() => {
      if (document.body.classList.contains('panel-open')) document.getElementById('closeBtn')?.click();
    });
    await page.waitForFunction(() => !document.body.classList.contains('panel-open'), { timeout: 5000 }).catch(() => {});

    await page.locator('.side-nav-item[data-specimen="EXT-01"]').click();
    await page.waitForTimeout(400);

    await page.locator('#openStoryBtn').click();
  } else {
    const noMobileAds = await page.evaluate(() => {
      const rails = document.getElementById('sponsorRails');
      if (!rails) return true;
      return getComputedStyle(rails).display === 'none';
    });
    results.push([`${label}: no side ads on mobile`, noMobileAds, noMobileAds]);

    const cards = await page.locator('.mobile-card').count();
    results.push([`${label}: mobile grid cards`, cards === 7, cards]);

    const lockedBeforeMain = await page.locator('.mobile-card.bonus').evaluate((el) => el.disabled);
    results.push([`${label}: curator locked on mobile at start`, lockedBeforeMain, lockedBeforeMain]);

    const mainCardsClick = await page.evaluate(async () => {
      const specs = [
        ['EXT-01', 'Hammerhead Shark'],
        ['EXT-02', 'Cookiecutter Shark'],
        ['EXT-03', 'Box Jellyfish'],
        ['EXT-04', 'Seahorse'],
        ['EXT-05', 'Pistol Shrimp'],
        ['EXT-06', 'Sperm Whale'],
      ];
      for (const [id, title] of specs) {
        const card = document.querySelector(`.mobile-card[data-specimen="${id}"]`);
        if (!card || card.disabled) return false;
        card.click();
        await new Promise((r) => setTimeout(r, 500));
        if (document.querySelector('#title')?.textContent !== title) return false;
        document.querySelector('#closeBtn')?.click();
        await new Promise((r) => setTimeout(r, 250));
        if (document.body.classList.contains('panel-open')) return false;
      }
      return true;
    });
    results.push([`${label}: all six main mobile stories open`, mainCardsClick, mainCardsClick]);

    const passportOpensPanel = await page.evaluate(async () => {
      const slot = document.querySelector('.passport-slot[data-specimen="EXT-04"]');
      if (!slot) return false;
      slot.click();
      await new Promise((r) => setTimeout(r, 500));
      const ok = document.body.classList.contains('panel-open')
        && document.querySelector('#title')?.textContent === 'Seahorse';
      document.querySelector('#closeBtn')?.click();
      await new Promise((r) => setTimeout(r, 250));
      return ok;
    });
    results.push([`${label}: passport opens story on tap`, passportOpensPanel, passportOpensPanel]);

    const cardOpensPanel = await page.evaluate(async () => {
      const card = document.querySelector('.mobile-card[data-specimen="EXT-01"]');
      if (!card) return false;
      card.click();
      await new Promise((r) => setTimeout(r, 500));
      const ok = document.body.classList.contains('panel-open')
        && document.querySelector('#title')?.textContent === 'Hammerhead Shark';
      document.querySelector('#closeBtn')?.click();
      await new Promise((r) => setTimeout(r, 250));
      return ok;
    });
    results.push([`${label}: mobile card opens story on tap`, cardOpensPanel, cardOpensPanel]);

    const mobileLayout = await page.evaluate(() => {
      const dockHidden = getComputedStyle(document.getElementById('dock')).display === 'none';
      const scroll = !!document.querySelector('.mobile-scroll');
      const progress = !!document.getElementById('progressTextMobile')?.textContent;
      const hint = !!document.getElementById('mobileTapHint')?.textContent;
      const noStickyOpen = !document.getElementById('openStoryBtnMobile');
      const sideAdsHidden = getComputedStyle(document.getElementById('sponsorRails')).display === 'none';
      const mobileAds = document.getElementById('mobileSponsorStrip');
      const mobileAdImgs = [...document.querySelectorAll('#mobileSponsorStrip .sponsor-tile img')];
      const mobileAdsOk = !!mobileAds
        && getComputedStyle(mobileAds).display !== 'none'
        && mobileAdImgs.length >= 6
        && mobileAdImgs.every((img) => /\/sponsors\//.test(img.src) && img.alt);
      const uiPad = parseFloat(getComputedStyle(document.querySelector('.ui-layer')).paddingLeft) < 20;
      const bodyScroll = getComputedStyle(document.body).overflowY !== 'hidden';
      return dockHidden && scroll && progress && hint && noStickyOpen && sideAdsHidden && mobileAdsOk && uiPad && bodyScroll;
    });
    results.push([`${label}: mobile layout chrome`, mobileLayout, mobileLayout]);

    const mainPageScroll = await page.evaluate(async () => {
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      if (docH <= winH + 8) return { ok: true, short: true };
      const before = window.scrollY;
      window.scrollTo(0, Math.min(180, docH - winH));
      await new Promise((r) => setTimeout(r, 80));
      const moved = window.scrollY > before;
      window.scrollTo(0, before);
      return { ok: moved, docH, winH, y: window.scrollY };
    });
    results.push([`${label}: main page scrolls`, mainPageScroll.ok, mainPageScroll]);

    const scrollOverCards = await page.evaluate(async () => {
      const card = document.querySelector('.mobile-card');
      if (!card) return { ok: false, reason: 'no card' };
      const touchAction = getComputedStyle(card).touchAction;
      const r = card.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const before = window.scrollY;
      const target = document.elementFromPoint(x, y);
      const onCard = target === card || card.contains(target);
      window.scrollTo(0, Math.min(200, document.documentElement.scrollHeight));
      await new Promise((res) => setTimeout(res, 50));
      const after = window.scrollY;
      window.scrollTo(0, before);
      return {
        ok: touchAction.includes('pan-y') && onCard && after > before,
        touchAction,
        onCard,
        before,
        after,
      };
    });
    results.push([`${label}: scroll works over cards`, scrollOverCards.ok, scrollOverCards]);

    const unlockedAfterMain = await page.locator('.mobile-card.bonus').evaluate((el) => !el.disabled);
    results.push([`${label}: curator unlocked on mobile after six`, unlockedAfterMain, unlockedAfterMain]);

    await page.locator('.mobile-card').first().click();
  }

  await page.waitForSelector('body.panel-open', { timeout: 5000 });

  const starOnlyPassport = await page.evaluate(() => {
    const passportStar = document.querySelector('.passport-slot.stamped');
    const galleryStars = document.querySelectorAll(
      '.mobile-card.done, .carousel-item.done, .strip-tile',
    );
    const order = JSON.parse(localStorage.getItem('depths-stories-opened-v2') || '{}').order || [];
    return !!passportStar && galleryStars.length === 0 && order.length >= 1;
  });
  results.push([`${label}: passport sole star UI`, starOnlyPassport, starOnlyPassport]);

  const panelOpen = await page.locator('#panel').evaluate((el) => el.classList.contains('open'));
  const title = await page.locator('#title').textContent();
  const heroSrc = await page.locator('#heroImg').getAttribute('src');
  results.push([`${label}: open panel`, panelOpen && title === 'Hammerhead Shark', { panelOpen, title }]);
  results.push([`${label}: panel hero image`, !!heroSrc && heroSrc.includes('Scalloped_Hammerhead'), heroSrc]);

  await page.waitForFunction(() => document.querySelector('#player iframe'), { timeout: 20000 }).catch(() => {});
  const hasIframe = await page.evaluate(() => !!document.querySelector('#player iframe'));
  results.push([`${label}: panel YouTube player`, hasIframe, hasIframe]);

  await page.locator('#muteBtn').click();
  const muteLabel = await page.locator('#muteBtn').textContent();
  results.push([`${label}: mute toggle`, /mute|silenciar|sound|sonido/i.test(muteLabel), muteLabel]);

  await page.locator('#tabFacts').click();
  const factCount = await page.locator('#factsList li').count();
  const sourceCount = await page.locator('#factsSources li').count();
  const overviewParas = await page.locator('#factsOverview p').count();
  results.push([`${label}: facts tab depth`, factCount >= 8 && sourceCount >= 2 && overviewParas >= 1, { factCount, sourceCount, overviewParas }]);

  await page.locator('#tabStory').click();
  const noRawHtmlInCopy = await page.evaluate(() => {
    const bad = /<(em|strong|p|span|br)\b|&lt;|&gt;/i;
    const checks = ['#storyText', '#factsOverview', '#factsList'];
    for (const sel of checks) {
      const el = document.querySelector(sel);
      if (!el || bad.test(el.textContent)) return { ok: false, sel, sample: el?.textContent?.slice(0, 120) };
    }
    const story = document.querySelector('#storyText');
    const storyLen = story?.textContent?.trim().length || 0;
    return {
      ok: true,
      hasEmFacts: !!document.querySelector('#factsOverview em'),
      storyLen,
    };
  });
  results.push([
    `${label}: copy renders HTML (no raw tags in text)`,
    noRawHtmlInCopy.ok && noRawHtmlInCopy.hasEmFacts && noRawHtmlInCopy.storyLen > 80,
    noRawHtmlInCopy,
  ]);

  await page.locator('#tabMakes').click();
  const makesLinks = await page.evaluate(() => {
    const puzzles = document.querySelectorAll('#makesPuzzles a[href^="http"]').length;
    const crochet = document.querySelectorAll('#makesCrochet a[href^="http"]').length;
    const hammer = [...document.querySelectorAll('#makesPuzzles a')].some((a) => /jigsawjungle|hammerhead/i.test(a.href + a.textContent));
    return puzzles >= 1 && crochet >= 1 && hammer;
  });
  results.push([`${label}: makes tab craft links`, makesLinks, makesLinks]);

  if (!isDesktop) {
    const panelBodyScroll = await page.evaluate(() => {
      const el = document.querySelector('.dialog-body');
      if (!el) return false;
      const overflow = getComputedStyle(el).overflowY;
      if (overflow !== 'auto' && overflow !== 'scroll') return false;
      if (el.scrollHeight <= el.clientHeight + 8) return true;
      const before = el.scrollTop;
      el.scrollTop = before + 80;
      return el.scrollTop > before;
    });
    results.push([`${label}: panel body scrollable`, panelBodyScroll, panelBodyScroll]);
  }

  await page.locator('#closeBtn').click();
  await page.waitForTimeout(300);
  results.push([`${label}: close panel`, !(await page.locator('#panel').evaluate((el) => el.classList.contains('open'))), true]);

  if (!isDesktop) {
    const scrollRestored = await page.evaluate(async () => {
      if (document.body.classList.contains('panel-open')) return false;
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      if (docH <= winH + 8) return true;
      window.scrollTo(0, 80);
      await new Promise((r) => setTimeout(r, 80));
      return window.scrollY > 0;
    });
    results.push([`${label}: scroll restored after panel`, scrollRestored, scrollRestored]);
  }

  const stamped = await page.evaluate(() => {
    try {
      const visited = JSON.parse(localStorage.getItem('depths-stories-opened-v2') || '{}').order || [];
      const p = JSON.parse(localStorage.getItem('mia-ocean-passport-v1') || '[]');
      return visited.includes('EXT-01') && Array.isArray(p) && p.includes('EXT-01');
    } catch { return false; }
  });
  results.push([`${label}: viewed saved on panel open`, stamped, stamped]);
  const stampedUi = await page.locator('.passport-slot[data-specimen="EXT-01"]').evaluate((el) => el.classList.contains('stamped'));
  results.push([`${label}: passport star after view`, stampedUi, stampedUi]);

  const noteGone = await page.evaluate(() => {
    const btn = document.getElementById('noteBtn');
    if (!btn) return true;
    const style = getComputedStyle(btn);
    return style.display === 'none' || btn.hidden;
  });
  results.push([`${label}: readme note hidden`, noteGone, noteGone]);
  const sub = await page.locator('#brandSub').textContent();
  results.push([`${label}: no made-for-you tagline`, !/made for you|hecho para ti/i.test(sub || ''), sub]);

  if (isDesktop) {
    await page.evaluate(() => {
      const ids = ['EXT-01', 'EXT-02', 'EXT-03', 'EXT-04', 'EXT-05', 'EXT-06'];
      const at = {};
      ids.forEach((id) => { at[id] = Date.now(); });
      localStorage.setItem('depths-stories-opened-v2', JSON.stringify({ order: ids, at }));
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(400);

    const unlocked = await page.locator('.passport-slot.bonus').evaluate((el) => !el.disabled && !el.classList.contains('locked'));
    results.push([`${label}: octopus unlocked after six`, unlocked, unlocked]);

    await page.locator('.passport-slot.bonus').click();
    await page.waitForTimeout(500);
    await page.locator('.carousel-item.is-selected button.polaroid-frame:not([disabled])').click();
    await page.waitForSelector('body.panel-open', { timeout: 5000 });
    const octopusTitle = await page.locator('#title').textContent();
    const watchVisible = await page.locator('#tabWatch').evaluate((el) => el.style.display !== 'none');
    const octopusSrc = await page.locator('#heroImg').getAttribute('src');
    await page.waitForFunction(() => document.querySelector('#player iframe'), { timeout: 20000 }).catch(() => {});
    const octopusVideo = await page.evaluate(() => document.querySelector('#player iframe')?.src || '');
    results.push([`${label}: octopus disguise episode`, octopusTitle === 'Octopus' && watchVisible && octopusVideo.includes('9jJmaSgbOz4'), { octopusTitle, watchVisible, octopusVideo }]);
    results.push([`${label}: octopus specimen image`, !!octopusSrc && /Octopus2\.jpg|octopus/i.test(octopusSrc), octopusSrc]);
    await page.locator('#closeBtn').click();
    await page.waitForTimeout(200);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await runSuite(desktop, 'desktop');
  await desktop.close();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await runSuite(mobile, 'mobile');
  await mobile.close();

  const deepPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await deepPage.goto(`${BASE}?specimen=EXT-03&open=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await deepPage.waitForFunction(
    () => !document.body.classList.contains('is-loading') && document.body.classList.contains('panel-open'),
    { timeout: 15000 },
  ).catch(() => {});
  const deepLink = await deepPage.evaluate(() => ({
    params: new URLSearchParams(location.search).get('specimen'),
    panelOpen: document.body.classList.contains('panel-open'),
    title: document.querySelector('#title')?.textContent,
    episode: document.querySelector('#episode')?.textContent,
  }));
  results.push([
    'deep link: specimen URL opens panel',
    deepLink.params === 'EXT-03' && deepLink.panelOpen && deepLink.title === 'Box Jellyfish' && /Venom/.test(deepLink.episode || ''),
    deepLink,
  ]);
  await deepPage.close();

  await browser.close();

  let failed = 0;
  for (const [name, ok, detail] of results) {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`, ok ? '' : detail);
    if (!ok) failed++;
  }
  if (errors.length) {
    console.log('\nPage errors:');
    errors.forEach((e) => console.log(e));
    failed++;
  }
  process.exit(failed ? 1 : 0);
}

run();
