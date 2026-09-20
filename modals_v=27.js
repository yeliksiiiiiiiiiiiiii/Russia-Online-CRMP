(function () {
    function moveModalsToBody() {
        document.querySelectorAll('.site-modal').forEach((modal) => {
            if (modal.id) {
                const duplicates = document.querySelectorAll('.site-modal#' + modal.id);
                if (duplicates.length > 1) {
                    for (let i = 1; i < duplicates.length; i++) {
                        duplicates[i].remove();
                    }
                }
            }
            if (modal.parentElement !== document.body) {
                document.body.appendChild(modal);
            }
        });
    }

    function openSiteModal(modal) {
        if (!modal) return;
        moveModalsToBody();
        modal.classList.add('is-open');
        modal.classList.remove('opacity-0', 'pointer-events-none');
        if (window.lockScroll) window.lockScroll();
        else document.body.classList.add('overflow-hidden');
    }

    function closeSiteModal(modal) {
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.classList.add('opacity-0', 'pointer-events-none');
        if (window.unlockScroll) window.unlockScroll();
        else document.body.classList.remove('overflow-hidden');
    }

    window.moveModalsToBody = moveModalsToBody;
    window.openSiteModal = openSiteModal;
    window.closeSiteModal = closeSiteModal;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
            // Close frontend site modals
            document.querySelectorAll('.site-modal.is-open').forEach((modal) => {
                const closeBtn = modal.querySelector(
                    '#close-modal-btn, #close-post-modal-btn, #close-doc-modal-btn, ' +
                    '#close-bill-modal-btn, .close-modal-btn, [id^="close-"][id$="-modal-btn"]'
                );
                if (closeBtn) closeBtn.click();
                else closeSiteModal(modal);
            });

            // Close admin panel modals
            const adminModals = ['#news-modal', '#member-modal', '#categories-modal', '#bill-modal', '#doc-modal', '#history-modal'];
            adminModals.forEach((sel) => {
                const modal = document.querySelector(sel);
                if (modal && !modal.classList.contains('opacity-0') && !modal.classList.contains('pointer-events-none') && !modal.classList.contains('hidden')) {
                    const closeBtn = modal.querySelector('button[onclick*="close"], button[onclick*="Close"]');
                    if (closeBtn) closeBtn.click();
                    else {
                        modal.classList.add('opacity-0', 'pointer-events-none');
                    }
                }
            });
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', moveModalsToBody);
    } else {
        moveModalsToBody();
    }
})();
