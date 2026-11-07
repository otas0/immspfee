/**
 * Shared open-menu stack probe (narrow + pages-mobile).
 * @param {import('playwright').Page} page
 */
export async function probeDrawerStack(page) {
  return page.evaluate(() => {
    const side = document.getElementById('sidebar');
    const micro = document.querySelector('#micro3d-host .micro3d-entry, #micro3d-host');
    const menu = document.getElementById('btn-menu');
    const params = document.getElementById('btn-params');
    const formula = document.getElementById('shell-formula');
    const toast = document.getElementById('lab-toast');
    const foot = document.querySelector('.sidebar-foot');
    const sr = side?.getBoundingClientRect();
    const probe = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return null;
      const x = Math.min(r.right - 4, Math.max(r.left + 4, r.left + r.width * 0.5));
      const y = Math.min(r.bottom - 4, Math.max(r.top + 4, r.top + r.height * 0.5));
      const hit = document.elementFromPoint(x, y);
      return {
        x,
        y,
        hitId: hit?.id || '',
        hitClass: hit?.className?.toString?.()?.slice(0, 80) || '',
        inSidebar: !!(hit && side?.contains(hit)),
      };
    };
    const sideZ = Number.parseFloat(getComputedStyle(side || document.body).zIndex) || 0;
    const shellZ = Number.parseFloat(getComputedStyle(document.querySelector('.model-shell') || document.body).zIndex) || 0;
    const toastZ = toast ? Number.parseFloat(getComputedStyle(toast).zIndex) || 0 : 0;
    return {
      open: !!(side?.classList.contains('open') || document.body.classList.contains('drawer-open')),
      sideZ,
      shellZ,
      toastZ,
      menuPos: menu ? getComputedStyle(menu).position : '',
      paramsPos: params ? getComputedStyle(params).position : '',
      activeId: document.activeElement?.id || document.activeElement?.tagName || '',
      sidebarTop: sr?.top || 0,
      toolbarBottom: document.querySelector('.toolbar')?.getBoundingClientRect()?.bottom || 0,
      footSticky: foot ? getComputedStyle(foot).position : '',
      microHit: probe(micro),
      formulaOverSidebar: !!(formula && sr && (() => {
        const fr = formula.getBoundingClientRect();
        return fr.width > 0 && fr.left < sr.right - 8 && fr.right > sr.left + 8
          && fr.top < sr.bottom - 8 && fr.bottom > sr.top + 8
          && (Number.parseFloat(getComputedStyle(formula).zIndex) || 0) >= sideZ;
      })()),
    };
  });
}

/**
 * @param {Awaited<ReturnType<typeof probeDrawerStack>>} stack
 * @param {{ projector?: boolean }} [opts]
 * @returns {string[]}
 */
export function assertDrawerStack(stack, opts = {}) {
  const failures = [];
  if (!stack.open) failures.push('drawer stack: sidebar not open');
  if (!(stack.sideZ > stack.shellZ)) {
    failures.push(`drawer stack z-order sidebar=${stack.sideZ} shell=${stack.shellZ}`);
  }
  if (!opts.projector && (stack.menuPos === 'fixed' || stack.paramsPos === 'fixed')) {
    failures.push(`classic drawer must not position:fixed menu/params (menu=${stack.menuPos} params=${stack.paramsPos})`);
  }
  if (opts.projector && stack.menuPos !== 'fixed') {
    failures.push(`projector overlay menu should be fixed (got ${stack.menuPos})`);
  }
  if (!opts.projector && stack.sidebarTop + 1 < stack.toolbarBottom - 8) {
    failures.push(`drawer overlaps toolbar band top=${stack.sidebarTop} toolbarBottom=${stack.toolbarBottom}`);
  }
  if (stack.microHit && !stack.microHit.inSidebar) {
    failures.push(`micro3d hit missed sidebar: ${JSON.stringify(stack.microHit)}`);
  }
  if (stack.formulaOverSidebar) {
    failures.push('shell-formula paints over open sidebar');
  }
  if (stack.toastZ && !(stack.toastZ > stack.sideZ)) {
    failures.push(`toast z=${stack.toastZ} must beat sidebar z=${stack.sideZ}`);
  }
  return failures;
}
