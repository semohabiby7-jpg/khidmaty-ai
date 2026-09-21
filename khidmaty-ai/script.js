/* ===== Khidmaty AI - Main JavaScript ===== */

// ===== Render Services =====
function renderServices(filter = 'all') {
    const grid = document.getElementById('servicesGrid');
    const filtered = filter === 'all' ? servicesData : servicesData.filter(s => s.category === filter);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد خدمات في هذا التصنيف</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(service => `
        <div class="service-card" onclick="window.open('${service.url}', '_blank')">
            <div class="service-card-icon">${service.icon}</div>
            <h3 class="service-card-title">${service.name}</h3>
            <p class="service-card-desc">${service.desc}</p>
            <div class="service-card-meta">
                <span class="service-badge ${service.online ? 'badge-online' : 'badge-office'}">
                    ${service.online ? '🌐 متاح أونلاين' : '🏛️ حضوري'}
                </span>
            </div>
            <div class="service-card-link">
                زيارة الموقع الرسمي ←
            </div>
        </div>
    `).join('');
    
    document.getElementById('statServices').textContent = servicesData.length;
}

// ===== Category Filter =====
function filterCategory(category, btn) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderServices(category);
}

// ===== Smart Search =====
function searchServices() {
    const input = document.getElementById('searchInput');
    const query = input.value.trim().toLowerCase();
    const clear = document.getElementById('searchClear');
    const suggestions = document.getElementById('searchSuggestions');
    
    if (query.length > 0) {
        clear.classList.add('show');
    } else {
        clear.classList.remove('show');
        suggestions.classList.remove('show');
        return;
    }
    
    // Normalize Arabic - remove diacritics, handle common variations
    const normalize = (str) => str
        .replace(/[\u064B-\u0652]/g, '') // remove tashkeel
        .replace(/أ|إ|آ/g, 'ا')
        .replaceى/g, 'ي')
        .replaceة/g, 'ه')
        .trim().toLowerCase();
    
    const normalizedQuery = normalize(query);
    
    const results = servicesData.filter(service => {
        const name = normalize(service.name);
        const desc = normalize(service.desc);
        const tags = service.tags.map(t => normalize(t));
        
        return name.includes(normalizedQuery) ||
               desc.includes(normalizedQuery) ||
               tags.some(tag => tag.includes(normalizedQuery));
    });
    
    if (results.length === 0) {
        suggestions.innerHTML = '<div class="no-results">لا توجد نتائج مطابقة لـ "' + query + '"</div>';
    } else {
        suggestions.innerHTML = results.map(service => `
            <div class="suggestion-item" onclick="window.open('${service.url}', '_blank'); clearSearch();">
                <div class="suggestion-icon">${service.icon}</div>
                <div class="suggestion-info">
                    <h4>${service.name}</h4>
                    <p>${service.desc}</p>
                </div>
            </div>
        `).join('');
    }
    
    suggestions.classList.add('show');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').classList.remove('show');
    document.getElementById('searchSuggestions').classList.remove('show');
}

// ===== Header Scroll =====
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ===== Mobile Menu =====
function toggleMenu() {
    const links = document.querySelector('.nav-links');
    const actions = document.querySelector('.nav-actions');
    links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    actions.style.display = actions.style.display === 'flex' ? 'none' : 'flex';
    if (links.style.display === 'flex') {
        links.style.flexDirection = 'column';
        links.style.position = 'absolute';
        links.style.top = '72px';
        links.style.right = '0';
        links.style.left = '0';
        links.style.background = 'white';
        links.style.padding = '20px';
        links.style.boxShadow = 'var(--shadow)';
    }
}

// ===== Modals =====
function openLogin() { document.getElementById('loginModal').classList.add('show'); }
function closeLogin() { document.getElementById('loginModal').classList.remove('show'); }
function openSignup() { document.getElementById('signupModal').classList.add('show'); }
function closeSignup() { document.getElementById('signupModal').classList.remove('show'); }
function openProviderSignup() { document.getElementById('providerModal').classList.add('show'); }
function closeProviderSignup() { document.getElementById('providerModal').classList.remove('show'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('show');
        }
    });
});

// ===== Supabase Config =====
const SUPABASE_URL = 'https://puhdastfiswcmbnczvwx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY';
const SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
};

// ===== Form Handlers =====
async function handleLogin(e) {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input');
    const phone = inputs[0].value.trim();
    const password = inputs[1].value;
    if (!phone || !password) { alert('اكتب رقم الموبايل وكلمة المرور'); return false; }
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&password=eq.${encodeURIComponent(password)}&select=*`, { headers: SB_HEADERS });
        const data = await res.json();
        if (data && data.length > 0) {
            const user = data[0];
            localStorage.setItem('khidmaty_user', JSON.stringify({ id: user.id, name: user.name, phone: user.phone, role: user.role }));
            closeLogin();
            alert(`أهلاً بيك يا ${user.name || 'فندم'} 🎉`);
            updateUIAfterLogin(user);
        } else {
            alert('رقم الموبايل أو كلمة المرور غلط');
        }
    } catch (err) {
        alert('حصل خطأ، حاول تاني');
    }
    return false;
}

async function handleSignup(e) {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input, select');
    const name = inputs[0].value.trim();
    const phone = inputs[1].value.trim();
    const gov = inputs[2].value;
    const password = inputs[3].value;
    const confirm = inputs[4].value;
    if (!name || !phone || !password) { alert('املأ كل البيانات المطلوبة'); return false; }
    if (password !== confirm) { alert('كلمتا المرور مش متطابقين'); return false; }
    const role = document.querySelector('.role-btn.active')?.textContent?.includes('مقدم') ? 'provider' : 'citizen';
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: SB_HEADERS,
            body: JSON.stringify({ phone, password, name, gov, role })
        });
        const data = await res.json();
        if (data && !data.code) {
            localStorage.setItem('khidmaty_user', JSON.stringify({ id: data.id, name, phone, role }));
            closeSignup();
            alert(`تم إنشاء حسابك بنجاح! مرحباً بك يا ${name} 🎉`);
            updateUIAfterLogin({ name, role });
        } else {
            alert(data.message?.includes('duplicate') ? 'رقم الموبايل ده مسجل قبل كده' : 'حصل خطأ، حاول تاني');
        }
    } catch (err) {
        alert('حصل خطأ في الاتصال، حاول تاني');
    }
    return false;
}

// Alias for handleRegister (HTML uses handleRegister)
const handleRegister = handleSignup;

async function handleProviderSignup(e) {
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input, select');
    const name = inputs[0].value.trim();
    const type = inputs[1].value;
    const gov = inputs[2].value;
    const phone = inputs[3].value.trim();
    if (!name || !type || !gov || !phone) { alert('املأ كل البيانات المطلوبة'); return false; }
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/providers`, {
            method: 'POST',
            headers: SB_HEADERS,
            body: JSON.stringify({ name, type, gov, phone, rating: 0, orders: 0, verified: false, badge: 'New' })
        });
        const data = await res.json();
        if (data && !data.code) {
            closeProviderSignup();
            alert(`تم تسجيلك كمقدم خدمة يا ${name}! هنتواصل معاك للتوثيق ✅`);
        } else {
            alert('حصل خطأ، حاول تاني');
        }
    } catch (err) {
        alert('حصل خطأ في الاتصال، حاول تاني');
    }
    return false;
}

// ===== UI Update After Login =====
function updateUIAfterLogin(user) {
    const loginBtn = document.querySelector('.header-actions .btn-ghost');
    const signupBtn = document.querySelector('.header-actions .btn-gold');
    if (loginBtn) loginBtn.textContent = `مرحبا، ${user.name || user.phone}`;
    if (signupBtn) signupBtn.textContent = 'خروج';
    if (signupBtn) signupBtn.onclick = function() { localStorage.removeItem('khidmaty_user'); location.reload(); };
}

// Check if user is logged in on page load
(function() {
    const saved = localStorage.getItem('khidmaty_user');
    if (saved) {
        try { updateUIAfterLogin(JSON.parse(saved)); } catch(e) {}
    }
})();

// ===== Hero Actions =====
function askAI() {
    document.getElementById('chatInput').focus();
    toggleChat();
    document.getElementById('chatInput').focus();
}

function needHelp() {
    document.getElementById('chatBox').classList.add('show');
    const messages = document.getElementById('chatMessages');
    messages.innerHTML = `
        <div class="chat-msg bot">
            ولا يهمك ❤️ أنا هنا عشان أساعدك!<br><br>
            قولّي:<br>
            1️⃣ المصلحة اللي محتاجها إيه؟<br>
            2️⃣ في محافظة إيه؟<br>
            3️⃣ محتاجها إمتى؟<br><br>
            وأنا هحدد الخدمة، وأرشحلك مقدم خدمة مناسب في منطقتك.
        </div>
    `;
}

// ===== Chat Widget =====
function toggleChat() {
    const box = document.getElementById('chatBox');
    box.classList.toggle('show');
}

// ===== Cloudflare Worker (AI) =====
const AI_WORKER_URL = 'https://khidmaty-agent.semohabiby7.workers.dev/chat';
// Keep chat history for context
let chatHistory = [];

function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    const messages = document.getElementById('chatMessages');
    messages.innerHTML += `<div class="chat-msg user">${message}</div>`;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
    
    // Show typing indicator
    messages.innerHTML += `<div class="chat-msg bot" id="typingIndicator">⏳ لحظة، بفكر...</div>`;
    messages.scrollTop = messages.scrollHeight;
    
    // Build services context from data.js
    const servicesContext = (typeof servicesData !== 'undefined' && servicesData)
        ? servicesData.map(s => `- ${s.name}: ${s.desc} (${s.url})`).join('\n')
        : '';
    
    // Call Cloudflare worker (real AI)
    fetch(AI_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: chatHistory, services: servicesContext })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('typingIndicator')?.remove();
        const reply = data.response || data.reply || 'معلش، حصل خطأ. جرّب تاني 🤔';
        messages.innerHTML += `<div class="chat-msg bot">${reply}</div>`;
        messages.scrollTop = messages.scrollHeight;
        // Save to history
        chatHistory.push({ role: 'user', text: message });
        chatHistory.push({ role: 'model', text: reply });
    })
    .catch(err => {
        document.getElementById('typingIndicator')?.remove();
        // Fallback to local keyword response if worker fails
        const fallback = getAIResponse(message);
        messages.innerHTML += `<div class="chat-msg bot">${fallback}</div>`;
        messages.scrollTop = messages.scrollHeight;
    });
}

function getAIResponse(message) {
    const msg = message.toLowerCase();
    const normalize = (str) => str
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/أ|إ|آ/g, 'ا')
        .replaceى/g, 'ي')
        .replaceة/g, 'ه')
        .trim().toLowerCase();
    
    const nMsg = normalize(msg);
    
    // Traffic
    if (nMsg.includes('مرور') || nMsg.includes('رخص') || nMsg.includes('مخالف') || nMsg.includes('سياره') || nMsg.includes('قياده')) {
        return `🚗 مصلحة المرور بتقدم:<br>• تجديد رخصة المركبة<br>• بدل فاقد/تالف<br>• الاستعلام عن المخالفات<br><br>الموقع الرسمي: traffic.moi.gov.eg<br><br>محتاج حد يخلصهالك؟ اضغط "محتاج حد يخلصهالي" وهنرشحلك مقدم خدمة 👤`;
    }
    // Taxes
    if (nMsg.includes('ضري') || nMsg.includes('فاتوره') || nMsg.includes('ضريبه')) {
        return `📊 مصلحة الضرائب بتقدم:<br>• التسجيل الضريبي<br>• الإقرارات الضريبية<br>• الفاتورة الإلكترونية<br><br>الموقع الرسمي: eta.gov.eg<br>بوابة الخدمات: eservice.incometax.gov.eg`;
    }
    // Insurance
    if (nMsg.includes('تامين') || nMsg.includes('معاش') || nMsg.includes('اشتراك')) {
        return `👴 الهيئة القومية للتأمين الاجتماعي:<br>• الاستعلام عن الرقم التأميني<br>• مدد الاشتراك<br>• بيانات المعاش<br><br>الموقع الرسمي: nosi.gov.eg`;
    }
    // Civil Registry
    if (nMsg.includes('رقم قوم') || nMsg.includes('بطاقه') || nMsg.includes('ميلاد') || nMsg.includes('وفاه') || nMsg.includes('زواج') || nMsg.includes('طلاق')) {
        return `🆔 قطاع الأحوال المدنية بقدم:<br>• بطاقة الرقم القومي<br>• شهادات الميلاد والوفاة<br>• قسائم الزواج والطلاق<br><br>الموقع: psm.gov.eg<br>أو عبر بوابة مصر الرقمية: digital.gov.eg`;
    }
    // Passports
    if (nMsg.includes('جواز') || nMsg.includes('سفر') || nMsg.includes('هجره')) {
        return `✈️ الإدارة العامة للجوازات والهجرة:<br>• استخراج جواز السفر<br>• تجديد الجواز<br>• شهادة التحركات<br><br>الموقع: emoves.moi.gov.eg`;
    }
    // Companies
    if (nMsg.includes('شرك') || nMsg.includes('استثمار') || nMsg.includes('سجل')) {
        return `🏢 الهيئة العامة للاستثمار (GAFI):<br>• تأسيس الشركات<br>• السجل التجاري<br>• البطاقة الضريبية<br><br>الموقع: gafi.gov.eg`;
    }
    
    return `ولا يهمك ❤️ قولّي تخصيص أكتر، المصلحة اللي محتاجها إيه؟<br><br>مثلاً:<br>• "عايز أجدد رخصة العربية"<br>• "عايز أعمل بطاقة ضريبية"<br>• "عايز أطلع معاش"`;
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    renderServices();
    
    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        const container = document.querySelector('.search-container');
        if (container && !container.contains(e.target)) {
            document.getElementById('searchSuggestions').classList.remove('show');
        }
    });
});

// ===== Select Role (citizen/provider) =====
function selectRole(role) {
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// ===== Quick Search from Hero =====
function quickSearch(term) {
    document.getElementById('heroSearch').value = term;
    document.getElementById('services').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = term;
            searchServices();
        }
    }, 500);
}

// ===== Hero Search to AI =====
function searchFromHero() {
    const val = document.getElementById('heroSearch').value.trim();
    if (!val) {
        alert('اكتب طلبك الأول! 😊');
        return;
    }
    document.getElementById('services').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = val;
            searchServices();
        }
    }, 500);
}

// ===== Provider Signup Modal =====
function openProviderSignup() { document.getElementById('providerModal').classList.add('show'); }
function closeProviderSignup() { document.getElementById('providerModal').classList.remove('show'); }

// ===== Sample Providers =====
const providersData = [
    { name: 'مكتب الأهرام للخدمات', type: 'مخلص معاملات', gov: 'القاهرة', rating: 4.8, orders: 156, verified: true, badge: 'Top Provider' },
    { name: 'أ. محمد عبد الله', type: 'محاسب', gov: 'الجيزة', rating: 4.7, orders: 89, verified: true, badge: 'Recommended' },
    { name: 'مكتب النيل للاستشارات', type: 'محامي', gov: 'الإسكندرية', rating: 4.9, orders: 203, verified: true, badge: 'Top Provider' },
    { name: 'أ. سارة أحمد', type: 'متخصص تأمينات', gov: 'القاهرة', rating: 4.6, orders: 67, verified: true, badge: 'Verified' },
    { name: 'مكتب المستقبل', type: 'تأسيس شركات', gov: 'الجيزة', rating: 4.5, orders: 112, verified: true, badge: 'Recommended' },
    { name: 'أ. خالد مصطفى', type: 'متخصص مرور', gov: 'الشرقية', rating: 4.4, orders: 45, verified: true, badge: 'Verified' }
];

function renderProviders() {
    const grid = document.getElementById('providersGrid');
    if (!grid) return;
    grid.innerHTML = providersData.map(p => {
        const badgeClass = p.badge === 'Top Provider' ? 'badge-recommended' : 'badge-verified';
        const stars = '★'.repeat(Math.floor(p.rating)) + '☆'.repeat(5 - Math.floor(p.rating));
        return `
            <div class="service-card" style="cursor:pointer" onclick="alert('سيتم تفعيل صفحة مقدم الخدمة قريباً')">
                <div class="service-card-icon">🧑‍💼</div>
                <h3 class="service-card-title">${p.name}</h3>
                <p class="service-card-desc">${p.type} - ${p.gov}</p>
                <div class="service-card-meta">
                    <span class="service-badge badge-online">${stars} ${p.rating}</span>
                    <span class="service-badge badge-office">${p.orders} طلب</span>
                    <span class="service-badge ${badgeClass}">${p.badge}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Init on page load =====
document.addEventListener('DOMContentLoaded', () => {
    renderServices();
    renderProviders();
    
    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        const container = document.querySelector('.search-container');
        if (container && !container.contains(e.target)) {
            document.getElementById('searchSuggestions').classList.remove('show');
        }
    });
});
