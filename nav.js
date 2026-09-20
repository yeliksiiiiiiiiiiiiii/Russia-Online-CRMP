(function () {
    if (!document.body.dataset.spa) return;

    const baseUrl = document.body.dataset.baseUrl || '';
    const swapEl = document.getElementById('page-swap');
    if (!swapEl) return;

    const MAX_CACHE_SIZE = 20;
    const CACHE_TTL_MS = 600000; // 10 minutes
    const REVALIDATE_AFTER_MS = 60000; // 1 minute
    const cache = new Map();

    let loading = false;
    const SKIP_PREFIXES = ['/admin', '/login'];
    const ACTIVE = ['text-slate-900'];
    const INACTIVE = ['text-slate-500', 'hover:text-slate-900', 'transition-colors'];

    function normalizePath(pathname) {
        let path = pathname || '/';
        if (baseUrl && path.indexOf(baseUrl) === 0) {
            path = path.slice(baseUrl.length) || '/';
        }
        path = path.replace(/\/+$/, '');
        return path === '' ? '/' : path;
    }

    function shouldNavigate(anchor) {
        if (!anchor || anchor.tagName !== 'A') return false;
        if (location.pathname.indexOf('/admin') !== -1 || location.pathname.indexOf('/login') !== -1) return false;
        if (anchor.hasAttribute('data-no-spa')) return false;
        if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
        if (anchor.origin !== location.origin) return false;
        const path = normalizePath(anchor.pathname);
        if (SKIP_PREFIXES.some((p) => path === p || path.indexOf(p + '/') === 0)) return false;
        if (anchor.pathname.indexOf('/uploads/') !== -1) return false;
        return true;
    }

    function updateNavActive(path) {
        document.querySelectorAll('[data-nav-path]').forEach((el) => {
            const navPath = el.getAttribute('data-nav-path');
            const isActive = navPath === path;
            ACTIVE.forEach((c) => el.classList.toggle(c, isActive));
            INACTIVE.forEach((c) => el.classList.toggle(c, !isActive));
        });
    }

    function runScripts(container) {
        container.querySelectorAll('script').forEach((old) => {
            const script = document.createElement('script');
            Array.from(old.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
            script.textContent = old.textContent;
            old.replaceWith(script);
        });
    }

    function parsePage(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let contentEl = doc.getElementById('page-swap');
        if (!contentEl) {
            contentEl = doc.querySelector('main') || doc.body;
        }
        if (!contentEl) return null;
        
        const mainH1 = doc.querySelector('main h1, h1');
        const h1Text = mainH1 ? mainH1.textContent : '';
        const isClosedOr404 = h1Text.includes('временно закрыт') || h1Text.includes('404') || (doc.title && doc.title.includes('Временно закрыто'));

        return {
            content: contentEl.innerHTML,
            title: doc.querySelector('title') ? doc.querySelector('title').textContent : document.title,
            description: doc.querySelector('meta[name="description"]')
                ? doc.querySelector('meta[name="description"]').getAttribute('content')
                : null,
            noCache: isClosedOr404,
            timestamp: Date.now()
        };
    }

    async function fetchPage(url, signal) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        if (signal) {
            signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        try {
            const res = await fetch(url, {
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'SPA', Accept: 'text/html' },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const html = await res.text();
            const parsed = parsePage(html);
            if (!parsed) throw new Error('Invalid page');
            return parsed;
        } catch (e) {
            clearTimeout(timeoutId);
            throw e;
        }
    }

    function setInCache(url, page) {
        if (!page || page.noCache) {
            cache.delete(url);
            return;
        }
        if (cache.size >= MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        cache.set(url, page);
    }

    function getFromCache(url) {
        const page = cache.get(url);
        if (!page) return null;
        if (Date.now() - page.timestamp > CACHE_TTL_MS) {
            cache.delete(url);
            return null;
        }
        return page;
    }

    function renderPage(page, absolute, push = true) {
        document.querySelectorAll('body > .site-modal').forEach(el => el.remove());
        if (typeof window.unlockScroll === 'function') window.unlockScroll();
        if (typeof closeMobileMenu === 'function') closeMobileMenu();

        swapEl.innerHTML = page.content;
        runScripts(swapEl);
        
        swapEl.querySelectorAll('.img-blur-load').forEach(img => {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
            }
        });

        if (window.moveModalsToBody) window.moveModalsToBody();

        if (page.title) document.title = page.title;
        const meta = document.querySelector('meta[name="description"]');
        if (meta && page.description) meta.setAttribute('content', page.description);

        const path = normalizePath(new URL(absolute).pathname);
        updateNavActive(path);

        if (push) {
            history.pushState({ spa: true, url: absolute }, '', absolute);
        }

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    }

    let activeController = null;
    let navigatingUrl = null;

    async function navigate(url, push = true) {
        const absolute = new URL(url, location.href).href;

        if (loading && navigatingUrl === absolute) {
            return;
        }
        if (activeController) {
            activeController.abort();
            activeController = null;
        }

        const cachedPage = getFromCache(absolute);
        if (cachedPage) {
            loading = false;
            navigatingUrl = null;
            renderPage(cachedPage, absolute, push);

            // Revalidate in background if older than 1 minute
            if (Date.now() - cachedPage.timestamp > REVALIDATE_AFTER_MS) {
                fetchPage(absolute).then(fresh => {
                    if (fresh) setInCache(absolute, fresh);
                }).catch(() => {});
            }
            return;
        }

        loading = true;
        navigatingUrl = absolute;
        document.documentElement.classList.add('is-navigating');

        const controller = new AbortController();
        activeController = controller;

        try {
            const page = await fetchPage(absolute, controller.signal);
            setInCache(absolute, page);
            renderPage(page, absolute, push);
        } catch (e) {
            if (e.name === 'AbortError') return;
            cache.delete(absolute);
            location.href = url;
        } finally {
            if (activeController === controller) {
                loading = false;
                navigatingUrl = null;
                document.documentElement.classList.remove('is-navigating');
                swapEl.classList.remove('is-loading');
                activeController = null;
            }
        }
    }

    const activePrefetchUrls = new Set();

    function prefetch(url) {
        const absolute = new URL(url, location.href).href;
        if (cache.has(absolute) || activePrefetchUrls.has(absolute)) return;
        activePrefetchUrls.add(absolute);

        fetchPage(absolute).then((page) => {
            activePrefetchUrls.delete(absolute);
            if (page) setInCache(absolute, page);
        }).catch(() => {
            activePrefetchUrls.delete(absolute);
        });
    }

    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const anchor = e.target.closest('a[href]');
        if (!shouldNavigate(anchor)) return;
        e.preventDefault();
        navigate(anchor.href, true);
    });

    let hoverTimeout = null;
    let hoveredAnchor = null;

    document.addEventListener('mouseover', (e) => {
        const anchor = e.target.closest('a[href]');
        if (!shouldNavigate(anchor)) {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            hoveredAnchor = null;
            return;
        }
        if (hoveredAnchor === anchor) return;
        hoveredAnchor = anchor;
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            prefetch(anchor.href);
        }, 50);
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
        const anchor = e.target.closest('a[href]');
        if (anchor && anchor === hoveredAnchor) {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            hoveredAnchor = null;
        }
    }, { passive: true });

    document.addEventListener('mousedown', (e) => {
        const anchor = e.target.closest('a[href]');
        if (!shouldNavigate(anchor)) return;
        prefetch(anchor.href);
    }, { passive: true });

    document.addEventListener('touchstart', (e) => {
        const anchor = e.target.closest('a[href]');
        if (!shouldNavigate(anchor)) return;
        prefetch(anchor.href);
    }, { passive: true });

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.spa && e.state.url) {
            navigate(e.state.url, false);
        } else {
            location.reload();
        }
    });

    // Cache initial page
    if (swapEl.innerHTML.trim() !== '') {
        const initialParsed = {
            content: swapEl.innerHTML,
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
            noCache: false,
            timestamp: Date.now()
        };
        setInCache(location.href, initialParsed);
    }

    history.replaceState({ spa: true, url: location.href }, '', location.href);
    updateNavActive(normalizePath(location.pathname));
})();
