/**
 * ashley_os desktop controller
 * libadwaita-compliant window manager, navigation, and expander rows
 */

(() => {
    'use strict';

    // Top bar clock service
    const Clock = {
        element: document.getElementById('clock'),
        formatter: new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }),

        init() {
            if (!this.element) return;
            this.update();
            setInterval(() => this.update(), 1000);
        },

        update() {
            const formatted = this.formatter.format(new Date()).toLowerCase();
            this.element.textContent = formatted;
        }
    };

    // Navigation and view switching
    const Navigation = {
        meta: {
            profile: { title: 'about ashley', subtitle: 'thinkpad t16 · hardware & platform' },
            projects: { title: 'active repositories', subtitle: 'github & local projects' },
            bugs: { title: 'anomalies & git blame', subtitle: 'commit ledger & issues' }
        },
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('mobile-overlay'),
        headerTitle: document.getElementById('header-title'),
        headerSubtitle: document.getElementById('header-subtitle'),
        navItems: document.querySelectorAll('.nav-item'),
        pages: document.querySelectorAll('.content-page'),

        init() {
            document.addEventListener('click', (event) => {
                const navBtn = event.target.closest('[data-nav-target]');
                if (navBtn) {
                    const targetId = navBtn.getAttribute('data-nav-target');
                    this.showPage(targetId, navBtn);
                }

                if (event.target.closest('[data-action="toggle-sidebar"]')) {
                    this.toggleSidebar();
                }

                // AdwExpanderRow toggle
                const expanderHeader = event.target.closest('.expander-header');
                if (expanderHeader) {
                    const row = expanderHeader.closest('.expander-row');
                    if (row) row.classList.toggle('open');
                }
            });
        },

        showPage(pageId, activeBtn) {
            const targetPage = document.getElementById(pageId);
            if (!targetPage) return;

            this.pages.forEach(page => page.classList.remove('active'));
            this.navItems.forEach(item => item.classList.remove('active'));

            targetPage.classList.add('active');
            if (activeBtn) {
                activeBtn.classList.add('active');
            } else {
                const matchingBtn = document.querySelector(`[data-nav-target="${pageId}"]`);
                if (matchingBtn) matchingBtn.classList.add('active');
            }

            const info = this.meta[pageId];
            if (info) {
                if (this.headerTitle) this.headerTitle.textContent = info.title;
                if (this.headerSubtitle) this.headerSubtitle.textContent = info.subtitle;
            }

            if (window.innerWidth <= 768) {
                this.closeSidebar();
            }
        },

        toggleSidebar() {
            if (!this.sidebar) return;
            this.sidebar.classList.toggle('open');
            if (this.overlay) {
                this.overlay.classList.toggle('active');
            }
        },

        closeSidebar() {
            if (!this.sidebar) return;
            this.sidebar.classList.remove('open');
            if (this.overlay) {
                this.overlay.classList.remove('active');
            }
        }
    };

    // Window controller (drag, bounds, close, unminimize)
    const WindowManager = {
        windowEl: document.getElementById('main-window'),
        header: document.getElementById('drag-handle'),
        reopenPill: document.getElementById('reopen-pill'),
        isDragging: false,
        startX: 0,
        startY: 0,
        xOffset: 0,
        yOffset: 0,

        init() {
            if (!this.windowEl || !this.header) return;

            this.header.addEventListener('pointerdown', (e) => this.onPointerDown(e));
            this.header.addEventListener('pointermove', (e) => this.onPointerMove(e));
            this.header.addEventListener('pointerup', (e) => this.onPointerUp(e));
            this.header.addEventListener('pointercancel', (e) => this.onPointerUp(e));

            document.addEventListener('click', (event) => {
                if (event.target.closest('[data-action="close-window"]')) {
                    this.close();
                }
                if (event.target.closest('[data-action="reopen-window"]')) {
                    this.reopen();
                }
            });

            // Keyboard navigation
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (Navigation.sidebar && Navigation.sidebar.classList.contains('open')) {
                        Navigation.closeSidebar();
                    } else {
                        this.close();
                    }
                }
            });
        },

        onPointerDown(e) {
            if (window.innerWidth <= 768) return;
            if (e.target.closest('button') || e.target.closest('.control') || e.target.closest('.hamburger') || e.target.closest('a')) return;

            this.isDragging = true;
            this.startX = e.clientX - this.xOffset;
            this.startY = e.clientY - this.yOffset;
            document.body.classList.add('dragging');
            this.header.setPointerCapture(e.pointerId);
        },

        onPointerMove(e) {
            if (!this.isDragging) return;

            const currentX = e.clientX - this.startX;
            const currentY = e.clientY - this.startY;

            // Bounding box clamping
            const maxX = Math.max(20, (window.innerWidth - this.windowEl.offsetWidth) / 2 + 100);
            const maxY = Math.max(20, (window.innerHeight - this.windowEl.offsetHeight) / 2 + 80);

            this.xOffset = Math.max(-maxX, Math.min(maxX, currentX));
            this.yOffset = Math.max(-maxY, Math.min(maxY, currentY));

            this.windowEl.style.animation = 'none';
            this.windowEl.style.transform = `translate(${this.xOffset}px, ${this.yOffset}px)`;
        },

        onPointerUp(e) {
            if (!this.isDragging) return;
            this.isDragging = false;
            document.body.classList.remove('dragging');
            if (this.header.hasPointerCapture(e.pointerId)) {
                this.header.releasePointerCapture(e.pointerId);
            }
        },

        close() {
            this.windowEl.classList.add('closed');
            if (this.reopenPill) {
                this.reopenPill.classList.add('visible');
            }
        },

        reopen() {
            this.windowEl.classList.remove('closed');
            if (this.reopenPill) {
                this.reopenPill.classList.remove('visible');
            }
        }
    };

    // Boot
    document.addEventListener('DOMContentLoaded', () => {
        Clock.init();
        Navigation.init();
        WindowManager.init();
    });
})();
