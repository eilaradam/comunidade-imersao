/* ── Conexão com o Supabase (projeto PRÓPRIO da comunidade, separado do Manager Club) ── */
(function () {
    'use strict';

    const SUPABASE_URL = 'https://ykypgdzihgxibeplvrjj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlreXBnZHppaGd4aWJlcGx2cmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTUwNzUsImV4cCI6MjA5OTYzMTA3NX0.5-C_7pD8Lsvk5IuM18u852zpMLqwG9jncTiANdnmC14';

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { storageKey: 'sb-comunidade-imersao' }
    });

    /** Escapa texto antes de jogar no HTML. Uma definição só, para o site inteiro. */
    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Só deixa passar http(s). Campo de link é preenchido pela aluna. */
    function urlSegura(url) {
        if (!url) return '';
        try {
            const u = new URL(String(url).trim());
            return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
        } catch (e) {
            return '';
        }
    }

    function iniciais(nome) {
        if (!nome) return '?';
        return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    }

    /** "há 5 min", "há 2 h", "12 de julho" */
    function quando(iso) {
        const d = new Date(iso);
        const min = Math.floor((Date.now() - d.getTime()) / 60000);
        if (min < 1) return 'agora';
        if (min < 60) return `há ${min} min`;
        if (min < 1440) return `há ${Math.floor(min / 60)} h`;
        if (min < 2880) return 'ontem';
        return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    }

    window.C = { sb, SUPABASE_URL, SUPABASE_ANON_KEY, esc, urlSegura, iniciais, quando };
})();
