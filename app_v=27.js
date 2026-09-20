let scrollPosition = 0;
window.lockScroll = function() {
    if (document.body.style.position === 'fixed') return;
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
};

window.unlockScroll = function() {
    if (document.body.style.position !== 'fixed') return;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, scrollPosition);
};

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.img-blur-load').forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
        }
    });
    
    document.body.classList.add('loaded');
    document.documentElement.classList.remove('no-transitions');
});



function parseBBCodeJS(text) {
    if (!text) return '';
    let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    let html = normalized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
    html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");
    html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>");
    html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, "<del>$1</del>");
    
    html = html.replace(/\[blur\]([\s\S]*?)\[\/blur\]/gi, '<span class="blurred-text select-none cursor-pointer" onclick="this.classList.toggle(\'select-none\'); this.classList.toggle(\'cursor-pointer\'); this.style.filter = this.style.filter === \'none\' ? \'\' : \'none\'" style="filter: blur(5px); transition: filter 0.2s;">$1</span>');
    html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<code class="bg-slate-100 text-red-650 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');
    html = html.replace(/\[hr\]/gi, '<hr class="border-slate-200 my-4">');
    html = html.replace(/\[bg=([^\]]+)\]([\s\S]*?)\[\/bg\]/gi, '<span style="background-color: $1;">$2</span>');
    html = html.replace(/\[hidethanks\]([\s\S]*?)\[\/hidethanks\]/gi, '<div class="bg-slate-50 border border-blue-200/80 rounded-2xl p-4 my-4 flex items-center gap-3 text-slate-800"><span class="material-symbols-outlined text-blue-600">lock</span><div><span class="font-bold block">Скрытый контент</span><span class="text-xs text-slate-500">Доступно только участникам организации.</span></div></div>');
    
    html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<details class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-4"><summary class="font-bold cursor-pointer select-none text-slate-800">Спойлер</summary><div class="mt-3 text-slate-600">$1</div></details>');
    html = html.replace(/\[spoiler=([^\]]+)\]([\s\S]*?)\[\/spoiler\]/gi, '<details class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-4"><summary class="font-bold cursor-pointer select-none text-slate-800">$1</summary><div class="mt-3 text-slate-600">$2</div></details>');
    
    html = html.replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi, "<h2 class=\"text-xl md:text-2xl font-bold text-slate-900 mb-4 mt-8 tracking-tight\">$1</h2>");
    html = html.replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, "<h3 class=\"text-lg md:text-xl font-bold text-slate-900 mb-3 mt-6 tracking-tight\">$1</h3>");
    html = html.replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, "<h4 class=\"text-base md:text-lg font-bold text-slate-900 mb-2 mt-4 tracking-tight\">$1</h4>");

    html = html.replace(/\[size=([0-9a-z%]+)\]([\s\S]*?)\[\/size\]/gi, (match, size, content) => {
        let sizeVal = size;
        if (/^\d+$/.test(size)) {
            const sizes = { 1: '11px', 2: '13px', 3: '15px', 4: '18px', 5: '24px', 6: '32px', 7: '48px' };
            sizeVal = sizes[size] || '16px';
        }
        return `<span style="font-size: ${sizeVal};">${content}</span>`;
    });

    html = html.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color: $1;">$2</span>');
    html = html.replace(/\[align=(left|center|right|justify)\]([\s\S]*?)\[\/align\]/gi, '<div style="text-align: $1;">$2</div>');

    html = html.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (match, url, content) => {
        let href = url;
        if (!/^https?:\/\//i.test(href)) href = 'http://' + href;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${content}</a>`;
    });
    html = html.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (match, url) => {
        let href = url;
        if (!/^https?:\/\//i.test(href)) href = 'http://' + href;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${url}</a>`;
    });

    html = html.replace(/\[img\s*([^\]]*)\]([\s\S]*?)\[\/img\]/gi, (match, attrsStr, url) => {
        const cleanUrl = url.trim();
        let width = '';
        let height = '';
        let align = '';
        
        if (attrsStr) {
            const widthMatch = attrsStr.match(/width=["'\s]?([0-9a-zA-Z%]+)["'\s]?/i);
            if (widthMatch) {
                width = widthMatch[1];
                if (/^\d+$/.test(width)) width += 'px';
            }
            
            const heightMatch = attrsStr.match(/height=["'\s]?([0-9a-zA-Z%]+)["'\s]?/i);
            if (heightMatch) {
                height = heightMatch[1];
                if (/^\d+$/.test(height)) height += 'px';
            }
            
            const alignMatch = attrsStr.match(/align=["'\s]?([a-zA-Z]+)["'\s]?/i);
            if (alignMatch) {
                align = alignMatch[1].toLowerCase();
            }
        }
        
        let style = 'max-height:500px; object-fit:contain;';
        if (width) style += ` width: ${width};`;
        if (height) style += ` height: ${height};`;
        
        let className = 'max-w-full rounded-2xl my-4';
        if (align === 'left') {
            className += ' float-left mr-4 mb-4';
        } else if (align === 'right') {
            className += ' float-right ml-4 mb-4';
        } else if (align === 'center') {
            className += ' mx-auto block';
        }
        
        return `<img src="${cleanUrl}" class="${className}" style="${style}">`;
    });

    html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote class="border-l-4 border-slate-350 bg-slate-50 pl-4 py-2 pr-2 my-4 rounded-r-xl italic text-slate-650">$1</blockquote>');
    html = html.replace(/\[quote=([^\]]+)\]([\s\S]*?)\[\/quote\]/gi, '<blockquote class="border-l-4 border-slate-350 bg-slate-50 pl-4 py-2 pr-2 my-4 rounded-r-xl text-slate-650"><span class="block text-xs font-bold text-slate-400 not-italic mb-1">$1 написал(а):</span><span class="italic">$2</span></blockquote>');

    html = html.replace(/\[media\]([\s\S]*?)\[\/media\]/gi, (match, url) => {
        const cleanUrl = url.trim();
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const m = cleanUrl.match(regExp);
        if (m && m[2].length === 11) {
            const ytCode = m[2];
            return `<div class="shrink-0 w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-xl my-6 max-w-2xl"><iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/${ytCode}?rel=0&modestbranding=1&playsinline=1" title="YouTube video player" frameborder="0" allowfullscreen></iframe></div>`;
        }
        return '';
    });

    html = html.replace(/\[table\]([\s\S]*?)\[\/table\]/gi, '<table class="w-full border-collapse border border-slate-200 my-4 text-sm">$1</table>');
    html = html.replace(/\[tr\]([\s\S]*?)\[\/tr\]/gi, '<tr class="border-b border-slate-200">$1</tr>');
    html = html.replace(/\[td\]([\s\S]*?)\[\/td\]/gi, '<td class="p-3 border-r border-slate-200">$1</td>');

    html = html.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, '<ul class="list-disc pl-6 my-4">$1</ul>');
    html = html.replace(/\[list=1\]([\s\S]*?)\[\/list\]/gi, '<ol class="list-decimal pl-6 my-4">$1</ol>');
    html = html.replace(/<(ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, inner) => {
        const items = inner.split('[*]');
        items.shift();
        let listContent = '';
        items.forEach(item => {
            let cleanedItem = item.replace(/(?:\r?\n|<br\s*\/?>)*$/gi, '');
            listContent += `<li class="mb-1">${cleanedItem.trim()}</li>`;
        });
        return `<${tag}${attrs}>${listContent}</${tag}>`;
    });

    html = html.replace(/\n/g, "<br>");
    // Strip Discord custom emojis from site text
    html = html.replace(/&lt;a?:[a-zA-Z0-9_]{2,32}:[0-9]{17,21}&gt;/gi, '');
    html = html.replace(/<a?:[a-zA-Z0-9_]{2,32}:[0-9]{17,21}>/gi, '');

    return html;
}

function parseDiscordEmojisJS(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    let clean = div.innerHTML;

    clean = clean.replace(/&lt;a?:[a-zA-Z0-9_]{2,32}:[0-9]{17,21}&gt;/gi, '');
    clean = clean.replace(/<a?:[a-zA-Z0-9_]{2,32}:[0-9]{17,21}>/gi, '');

    return clean.replace(/\s{2,}/g, ' ').trim();
}

window.parseBBCodeJS = parseBBCodeJS;
window.parseDiscordEmojisJS = parseDiscordEmojisJS;


