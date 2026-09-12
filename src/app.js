
function normalizeArabic(text = '') {
 return text
 .replace(/[أإآ]/g, 'ا')
 .replace(/ى/g, 'ي')
 .replace(/ة/g, 'ه')
 .replace(/ؤ/g, 'و')
 .replace(/ئ/g, 'ي')
 .replace(/\s+/g, ' ')
 .trim()
 .toLowerCase();
}

function openModal(id) {
 document.getElementById(id).classList.add('show');
}

function closeModal(id) {
 document.getElementById(id).classList.remove('show');
}

function toggleMobileNav() {
 const nav = document.getElementById('navMobile');
 nav.classList.toggle('show');
}

function handleLogin(e) {
 e.preventDefault();
 alert('تم تسجيل الدخول بنجاح (نسخة تجريبية)');
 closeModal('loginModal');
 return false;
}

function handleRegister(e) {
 e.preventDefault();
 alert('تم إنشاء الحساب بنجاح (نسخة تجريبية)');
 closeModal('registerModal');
 return false;
}

function handleProvider(e) {
 e.preventDefault();
 alert('تم تسجيل مقدم الخدمة بنجاح (نسخة تجريبية)');
 closeModal('providerModal');
 return false;
}

function renderCategories() {
 const filter = document.getElementById('catFilter');
 if (!filter) return;

 const buttons = categories.map(cat => `
 <button class="cat-pill" onclick="filterByCategory('${cat.id}', this)">
 ${cat.icon} ${cat.name}
 </button>
 `).join('');

 filter.innerHTML = `
 <button class="cat-pill active" onclick="filterByCategory('all', this)">الكل</button>
 ${buttons}
 `;
}

function renderServices(list = services) {
 const grid = document.getElementById('servicesGrid');
 if (!grid) return;

 if (!list.length) {
 grid.innerHTML = <div class="empty-state">لا توجد نتائج مطابقة</div>;
 return;
 }

 grid.innerHTML = list.map(service => `
 <div class="service-card" onclick="openServiceDetails(${service.id})">
 <div class="service-icon">${service.icon}</div>
 <h3>${service.name}</h3>
 <p>${service.desc}</p>
 <div class="service-meta">
 <span class="badge ${service.online ? 'badge-online' : 'badge-offline'}">
 ${service.online ? 'متاح أونلاين' : 'حضوري'}
 </span>
 </div>
 </div>
 `).join('');
}

function renderProviders() {
 const grid = document.getElementById('providersGrid');
 if (!grid) return;

 grid.innerHTML = providers.map(provider => `
 <div class="provider-card">
 <div class="provider-top">
 <div class="provider-avatar">👤</div>
 <div>
 <h3>${provider.name}</h3>
 <p>${provider.type} - ${provider.gov}</p>
 </div>
 </div>
 <div class="provider-rating">⭐ ${provider.rating} | ${provider.orders} عملية</div>
 <div class="provider-badge">${provider.badge}</div>
 </div>
 `).join('');
}

function filterByCategory(categoryId, btn) {
 document.querySelectorAll('.cat-pill').forEach(el => el.classList.remove('active'));
 if (btn) btn.classList.add('active');

 if (categoryId === 'all') {
 renderServices(services);
 return;
 }

 const filtered = services.filter(service => service.category === categoryId);
 renderServices(filtered);
}

function mainSearchLive(value) {
 const clearBtn = document.getElementById('searchClear');
 if (clearBtn) {
 if (value.trim()) {
 clearBtn.style.display = 'flex';
 } else {
 clearBtn.style.display = 'none';
 }
 }

 const normalizedQuery = normalizeArabic(value);

 if (!normalizedQuery) {
 renderServices(services);
 return;
 }

 const filtered = services.filter(service => {
 const name = normalizeArabic(service.name);
 const desc = normalizeArabic(service.desc);
 const tags = (service.tags || []).map(normalizeArabic).join(' ');

 return (
 name.includes(normalizedQuery) ||
 desc.includes(normalizedQuery) ||
 tags.includes(normalizedQuery)
 );
 });

 renderServices(filtered);
}

function clearMainSearch() {
 const input = document.getElementById('mainSearch');
 const clearBtn = document.getElementById('searchClear');
 if (input) input.value = '';
 if (clearBtn) clearBtn.style.display = 'none';
 renderServices(services);
}

function heroSearchLive(value) {
 const dropdown = document.getElementById('searchDropdown');
 if (!dropdown) return;

 const normalizedQuery = normalizeArabic(value);

 if (!normalizedQuery || normalizedQuery.length < 2) {
 dropdown.classList.remove('show');
 dropdown.innerHTML = '';
 return;
 }

 const filtered = services.filter(service => {
 const name = normalizeArabic(service.name);
 const desc = normalizeArabic(service.desc);
 const tags = (service.tags || []).map(normalizeArabic).join(' ');

 return (
 name.includes(normalizedQuery) ||
 desc.includes(normalizedQuery) ||
 tags.includes(normalizedQuery)
 );
 });

 if (!filtered.length) {
 dropdown.innerHTML = <div class="dropdown-empty">لا توجد نتائج</div>;
 } else {
 dropdown.innerHTML = filtered.map(service => `
 <div class="dropdown-item" onclick="openServiceDetails(${service.id}); hideHeroDropdown();">
 <span class="dropdown-icon">${service.icon}</span>
 <div>
 <strong>${service.name}</strong>
 <p>${service.desc}</p>
 </div>
 </div>
 `).join('');
 }

 dropdown.classList.add('show');
}

function hideHeroDropdown() {
 const dropdown = document.getElementById('searchDropdown');
 if (dropdown) {
 dropdown.classList.remove('show');
 dropdown.innerHTML = '';
 }
}

function heroSubmit() {
 const input = document.getElementById('heroSearch');
 if (!input) return;

 const query = input.value.trim();
 if (!query) return;

 document.getElementById('services').scrollIntoView({ behavior: 'smooth' });
 const mainSearch = document.getElementById('mainSearch');
 if (mainSearch) {
 mainSearch.value = query;
 mainSearchLive(query);
 }
 hideHeroDropdown();
}

function quickAsk(text) {
 const input = document.getElementById('heroSearch');
 if (!input) return;
 input.value = text;
 heroSubmit();
}

function goToAI() {
 document.getElementById('ask-ai').scrollIntoView({ behavior: 'smooth' });
}

function needHelp() {
 document.getElementById('providers').scrollIntoView({ behavior: 'smooth' });
}

function getServiceByMessage(message) {
 const q = normalizeArabic(message);
 return services.find(service => {
 const name = normalizeArabic(service.name);
 const desc = normalizeArabic(service.desc);
 const tags = (service.tags || []).map(normalizeArabic).join(' ');
 return (
 q.includes(name) ||
 name.includes(q) ||
 desc.includes(q) ||
 tags.includes(q)
 );
 });
}

function aiSend() {
 const input = document.getElementById('aiInput');
 const chat = document.getElementById('aiChat');
 if (!input || !chat) return;

 const message = input.value.trim();
 if (!message) return;

 chat.innerHTML += `
 <div class="ai-msg user">
 <div class="ai-bubble">${message}</div>
 </div>
 `;

 const matchedService = getServiceByMessage(message);

 let reply = ولا يهمك ❤️ فهمت طلبك، وهنبدأ نوصلك لأقرب خدمة مناسبة.;

 if (matchedService) {
 reply = `
 تمام 👌<br>
 الخدمة الأقرب لطلبك هي: <strong>${matchedService.name}</strong><br><br>
 📄 المستندات: ${matchedService.documents.join(' - ')}<br>
 🪜 الخطوات: ${matchedService.steps[0]} → ${matchedService.steps[1]}...<br>
 💰 الرسوم: ${matchedService.fees}<br>
 ⏱️ المدة: ${matchedService.duration}<br>
 🔗 <a href="${matchedService.link}" target="_blank">الرابط الرسمي</a><br><br>
 لو حابب، أقدر أرشحلك كمان مقدم خدمة يساعدك فيها 👤
 `;
 }

 setTimeout(() => {
 chat.innerHTML += `
 <div class="ai-msg bot">
 <span class="ai-avatar">🤖</span>
 <div class="ai-bubble">${reply}</div>
 </div>
 `;
 chat.scrollTop = chat.scrollHeight;
 }, 400);

 input.value = '';
}

function openServiceDetails(id) {
 const service = services.find(s => s.id === id);
 if (!service) return;

 const content = document.getElementById('serviceContent');
 if (!content) return;

 content.innerHTML = `
 <div class="service-detail">
 <div class="detail-hero">
 <div class="detail-icon">${service.icon}</div>
 <div>
 <h2>${service.name}</h2>
 <p>${service.desc}</p>
 </div>
 </div>

 <div class="detail-grid">
 <div class="detail-box"><strong>الجهة:</strong><span>${service.source}</span></div>
 <div class="detail-box"><strong>الرسوم:</strong><span>${service.fees}</span></div>
 <div class="detail-box"><strong>المدة:</strong><span>${service.duration}</span></div>
 <div class="detail-box"><strong>التنفيذ:</strong><span>${service.online ? 'أونلاين' : 'حضوري'}</span></div>
 </div>

 <h3>من يستطيع الحصول عليها؟</h3>
 <p>${service.eligibility}</p>

 <h3>المستندات المطلوبة</h3>
 <ul>
 ${service.documents.map(doc => <li>${doc}</li>).join('')}
 </ul>

 <h3>الخطوات</h3>
 <ol>
 ${service.steps.map(step => <li>${step}</li>).join('')}
 </ol>

 <div class="detail-actions">
 <a class="btn-gold" href="${service.link}" target="_blank">زيارة الموقع الرسمي</a>
 <button class="btn-ghost" onclick="closeModal('serviceModal');goToAI();">اسأل AI عنها</button>
 <button class="btn-primary" onclick="closeModal('serviceModal');needHelp();">محتاج حد يخلصهالي</button>
 </div>

 <div class="detail-footer">
 <small>المصدر: ${service.source} | آخر تحديث: ${service.updated}</small>
 </div>
 </div>
 `;

 openModal('serviceModal');
}

document.addEventListener('click', function (e) {
 const dropdown = document.getElementById('searchDropdown');
 const heroWrap = document.querySelector('.hero-search-wrap');
 if (dropdown && heroWrap && !heroWrap.contains(e.target)) {
 hideHeroDropdown();
 }
});

window.addEventListener('scroll', function () {
 const header = document.getElementById('header');
 if (!header) return;
 if (window.scrollY > 20) header.classList.add('scrolled');
 else header.classList.remove('scrolled');
});

document.addEventListener('DOMContentLoaded', function () {
 renderCategories();
 renderServices();
 renderProviders();
});
