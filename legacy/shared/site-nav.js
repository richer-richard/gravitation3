/**
 * Gravitation³ Site Navigation
 * - Mobile menu toggle (supports left/right nav lists)
 * - Active link highlighting
 * - Accessibility: aria-expanded, ESC/resize/outside-click close
 */

(() => {
    const ACTIVE_CLASS = 'active';

    const normalizePath = (pathname) => {
        if (!pathname) return '';
        return pathname.replace(/\\/g, '/').replace(/\/+$/, '');
    };

    const markActiveLinks = (navEl) => {
        const current = new URL(window.location.href);
        const currentPath = normalizePath(current.pathname);

        navEl.querySelectorAll('.nav-link').forEach((item) => {
            item.classList.remove(ACTIVE_CLASS);
        });

        navEl.querySelectorAll('.nav-link a[href]').forEach((anchor) => {
            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            try {
                const target = new URL(href, current);
                if (normalizePath(target.pathname) === currentPath) {
                    anchor.closest('.nav-link')?.classList.add(ACTIVE_CLASS);
                }
            } catch {
                // Ignore invalid URLs
            }
        });
    };

    const initNav = (navEl) => {
        const toggle = navEl.querySelector('.mobile-menu-toggle');
        const lists = Array.from(navEl.querySelectorAll('.nav-links'));
        if (!toggle || lists.length === 0) {
            markActiveLinks(navEl);
            return;
        }

        if (!toggle.hasAttribute('aria-expanded')) toggle.setAttribute('aria-expanded', 'false');
        if (!toggle.hasAttribute('aria-label')) toggle.setAttribute('aria-label', 'Toggle navigation menu');

        const closeMenu = () => {
            toggle.setAttribute('aria-expanded', 'false');
            lists.forEach((list) => list.classList.remove(ACTIVE_CLASS));
        };

        const toggleMenu = () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', (!isExpanded).toString());
            lists.forEach((list) => list.classList.toggle(ACTIVE_CLASS));
        };

        toggle.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleMenu();
        });

        navEl.querySelectorAll('a[href]').forEach((anchor) => {
            anchor.addEventListener('click', () => closeMenu());
        });

        document.addEventListener('click', (event) => {
            if (!navEl.contains(event.target)) closeMenu();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenu();
        });

        window.addEventListener(
            'resize',
            () => {
                if (window.innerWidth > 768) closeMenu();
            },
            { passive: true }
        );

        markActiveLinks(navEl);
    };

    const initAll = () => {
        document.querySelectorAll('.nav-ribbon').forEach(initNav);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();

