/**
 * श्री शीतला धाम मंदिर — दानदाता प्रबंधन
 * Frontend Logic (Vanilla JavaScript + Fetch API to Cloudflare Worker)
 */

// =============================================================================
// 1. कॉन्फ़िगरेशन एवं ग्लोबल स्टेट (Configuration & Global State)
// =============================================================================

// डिफ़ॉल्ट या सुरक्षित किया गया Cloudflare Worker URL
const CONFIG = {
  getWorkerUrl: function() {
    return localStorage.getItem('MANDIR_WORKER_URL') || 'https://fragrant-hill-2d65.rishii-stu.workers.dev';
  },
  setWorkerUrl: function(url) {
    localStorage.setItem('MANDIR_WORKER_URL', url.trim().replace(/\/+$/, ''));
  },
  getUserName: function() {
    return localStorage.getItem('MANDIR_USER_NAME') || 'व्यवस्थापक';
  },
  setUserName: function(name) {
    localStorage.setItem('MANDIR_USER_NAME', name.trim() || 'व्यवस्थापक');
  }
};

let koshAakde = {
  masik: [],
  varshik: [],
  naveen: [],
  hatayaGaya: [],
  vartamanUser: 'व्यवस्थापक'
};

let vartamanKhand = 'mukhya';          // 'mukhya' | 'bhugtanKhand' | 'pravishti' | 'hataya'
let vartamanUpKhand = 'समस्त';         // 'समस्त' | 'मासिक' | 'वार्षिक' | 'नवीन'
let vartamanHatayaKhand = 'मासिक';     // 'मासिक' | 'वार्षिक' | 'नवीन'
let filterStatusChuna = 'सभी';         // 'सभी' | 'पूर्ण प्राप्त' | 'आंशिक प्राप्त' | 'पूर्ण बकाया' | 'आंशिक बकाया'
let payFilterStatusChuna = 'सभी';      // 'सभी' | 'बकाया' | 'आंशिक बकाया' | 'पूर्ण बकाया'
let paySubCategoryChuna = 'समस्त';     // 'समस्त' | 'मासिक' | 'वार्षिक' | 'नवीन'
let dataLoadedFirstTime = false;
let currentActivePayDonor = null;
let currentActiveDetailDonor = null;

const monthNames = [
  'नवम्बर', 'दिसम्बर', 'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल',
  'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर'
];

// SVG Icons
const ICON_PENCIL = `<svg style="width:14px; height:14px; fill:currentColor; vertical-align:middle;" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const ICON_NAKAD = `<svg style="width:13px; height:13px; fill:currentColor; vertical-align:middle; margin-right:3px;" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;
const ICON_ONLINE = `<svg style="width:13px; height:13px; fill:currentColor; vertical-align:middle; margin-right:3px;" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;
const ICON_RASEED = `<svg style="width:13px; height:13px; fill:currentColor; vertical-align:middle; margin-right:3px;" viewBox="0 0 24 24"><path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2l-1.5 1.5L6 2L4.5 3.5 3 2v20z"/></svg>`;
const ICON_TRASH = `<svg style="width:14px; height:14px; fill:currentColor; vertical-align:middle;" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
const ICON_SAVE = `<svg style="width:14px; height:14px; fill:currentColor; vertical-align:middle;" viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`;

// =============================================================================
// 2. नेटवर्क एवं API क्लाइंट (Network & API Client)
// =============================================================================

function updateServerStatus(isOnline, statusText = '') {
  const badge = document.getElementById('serverStatusBadge');
  const textEl = document.getElementById('serverStatusText');
  if (!badge || !textEl) return;

  if (isOnline) {
    badge.className = 'status-indicator connected';
    textEl.innerText = statusText || 'कनेक्टेड';
  } else {
    badge.className = 'status-indicator error';
    textEl.innerText = statusText || 'ऑफलाइन';
  }
}

async function apiFetch(endpoint, method = 'GET', body = null) {
  const workerUrl = CONFIG.getWorkerUrl();
  if (!workerUrl) {
    updateServerStatus(false, 'URL आवश्यक');
    openSettingsModal();
    throw new Error('कृपया पहले Cloudflare Worker का URL सेटिंग्स में दर्ज करें!');
  }

  const url = `${workerUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errText = await response.text();
      let parsed;
      try { parsed = JSON.parse(errText); } catch(e) {}
      throw new Error(parsed?.error || `HTTP त्रुटि ${response.status}: ${errText}`);
    }

    const json = await response.json();
    if (json.success === false) {
      throw new Error(json.error || 'सर्वर से त्रुटि प्राप्त हुई');
    }
    updateServerStatus(true, 'कनेक्टेड');
    return json;
  } catch (err) {
    updateServerStatus(false, 'त्रुटि');
    console.error('API Error:', err);
    throw err;
  }
}

/**
 * सभी दानदाताओं का डेटा Cloudflare Worker से प्राप्त करना
 */
async function aakdeMangwayein(callback) {
  try {
    const res = await apiFetch('/api/data');
    if (res && res.data) {
      koshAakde = res.data;
      dataLoadedFirstTime = true;
      mukhyaFalakhSajayein();

      if (vartamanKhand === 'bhugtanKhand') renderPaySectionDonorList();
      if (vartamanKhand === 'pravishti') suchiSajayein();
      if (vartamanKhand === 'hataya') hatayiSuchiSajayein();

      if (callback) callback();
    }
  } catch (err) {
    sandeshDikhayein('डेटा लोड करने में त्रुटि: ' + err.message);
  }
}

// =============================================================================
// 3. UI नेविगेशन और टैब प्रबंधन
// =============================================================================

function pannaBadle(panna) {
  vartamanKhand = panna;
  document.getElementById('mukhyaFalakh').style.display = (panna === 'mukhya') ? 'block' : 'none';
  document.getElementById('bhugtanKhand').style.display = (panna === 'bhugtanKhand') ? 'block' : 'none';
  document.getElementById('samastPravishtiyan').style.display = (panna === 'pravishti') ? 'block' : 'none';
  document.getElementById('hatayiGayiPravishtiyan').style.display = (panna === 'hataya') ? 'block' : 'none';

  document.getElementById('picheJayein').style.display = (panna === 'mukhya') ? 'none' : 'inline-flex';

  document.getElementById('suchakMukhya').classList.toggle('sakriya', panna === 'mukhya');
  document.getElementById('suchakBhugtan').classList.toggle('sakriya', panna === 'bhugtanKhand');
  document.getElementById('suchakPravishti').classList.toggle('sakriya', panna === 'pravishti');
  document.getElementById('suchakHataya').classList.toggle('sakriya', panna === 'hataya');

  const titleEl = document.getElementById('mukhyaHeaderTitle');
  if (panna === 'mukhya') {
    titleEl.innerText = 'श्री शीतला धाम मंदिर';
  } else if (panna === 'bhugtanKhand') {
    titleEl.innerText = 'भुगतान प्रविष्टि दर्ज करें';
  } else if (panna === 'pravishti') {
    titleEl.innerText = 'दानदाताओं का लेखा-जोखा';
  } else if (panna === 'hataya') {
    titleEl.innerText = 'हटाया गया विवरण';
  }

  if (!dataLoadedFirstTime) {
    if (panna === 'bhugtanKhand') dikhayeinListSkeleton('paySectionDonorListPatt', 5);
    if (panna === 'pravishti') dikhayeinListSkeleton('pravishtiSuchiPatt', 5);
    if (panna === 'hataya') dikhayeinListSkeleton('hatayiSuchiPatt', 4);
  } else {
    if (panna === 'bhugtanKhand') renderPaySectionDonorList();
    if (panna === 'pravishti') suchiSajayein();
    if (panna === 'hataya') hatayiSuchiSajayein();
  }
}

function pravishtiKhandKholein(prakar) {
  vartamanUpKhand = prakar;
  upKhandBadle(prakar);
  pannaBadle('pravishti');
}

function upKhandBadle(prakar) {
  vartamanUpKhand = prakar;
  document.getElementById('tabBtnSamast').classList.toggle('sakriya', prakar === 'समस्त');
  document.getElementById('tabBtnMasik').classList.toggle('sakriya', prakar === 'मासिक');
  document.getElementById('tabBtnVarshik').classList.toggle('sakriya', prakar === 'वार्षिक');
  document.getElementById('tabBtnNaveen').classList.toggle('sakriya', prakar === 'नवीन');

  suchiSajayein();
}

function hatayaUpKhandBadle(prakar) {
  vartamanHatayaKhand = prakar;
  document.getElementById('hatayiMasikButton').classList.toggle('sakriya', prakar === 'मासिक');
  document.getElementById('hatayiVarshikButton').classList.toggle('sakriya', prakar === 'वार्षिक');
  document.getElementById('hatayiNaveenButton').classList.toggle('sakriya', prakar === 'नवीन');
  hatayiSuchiSajayein();
}

function fabButtonClicked() {
  const initialCat = (vartamanUpKhand === 'समस्त') ? 'मासिक' : vartamanUpKhand;
  prapatraKholein(initialCat);
}

function filterVikalpToggle() {
  const dabba = document.getElementById('chhipeFilterVikalp');
  const btn = document.getElementById('btnFilterToggle');
  if (dabba.style.display === 'block') {
    dabba.style.display = 'none';
    btn.classList.remove('khula');
  } else {
    dabba.style.display = 'block';
    btn.classList.add('khula');
  }
}

function setFilterStatus(status) {
  filterStatusChuna = status;
  document.getElementById('filterStatusAll').classList.toggle('sakriya', status === 'सभी');
  document.getElementById('filterStatusPurnaPrapt').classList.toggle('sakriya', status === 'पूर्ण प्राप्त');
  document.getElementById('filterStatusAnshikPrapt').classList.toggle('sakriya', status === 'आंशिक प्राप्त');
  document.getElementById('filterStatusPurnaBakaya').classList.toggle('sakriya', status === 'पूर्ण बकाया');
  document.getElementById('filterStatusAnshikBakaya').classList.toggle('sakriya', status === 'आंशिक बकाया');
  chhantaiLagayein();
}

function setPayFilterStatus(status) {
  payFilterStatusChuna = status;
  document.getElementById('btnPayFilterAll').classList.toggle('sakriya', status === 'सभी');
  document.getElementById('btnPayFilterBakaya').classList.toggle('sakriya', status === 'बकाया');
  document.getElementById('btnPayFilterAnshik').classList.toggle('sakriya', status === 'आंशिक बकाया');
  document.getElementById('btnPayFilterPurnaBakaya').classList.toggle('sakriya', status === 'पूर्ण बकाया');
  renderPaySectionDonorList();
}

function setPaySubCategory(subCat) {
  paySubCategoryChuna = subCat;
  document.getElementById('paySubTabSamast').classList.toggle('sakriya', subCat === 'समस्त');
  document.getElementById('paySubTabMasik').classList.toggle('sakriya', subCat === 'मासिक');
  document.getElementById('paySubTabVarshik').classList.toggle('sakriya', subCat === 'वार्षिक');
  document.getElementById('paySubTabNaveen').classList.toggle('sakriya', subCat === 'नवीन');
  renderPaySectionDonorList();
}

function chuniyeGenMadhyam(madhyam) {
  document.getElementById('chhipaGenMadhyam').value = madhyam;
  document.getElementById('btnPayGenNakad').classList.toggle('sakriya', madhyam === 'नकद');
  document.getElementById('btnPayGenOnline').classList.toggle('sakriya', madhyam === 'ऑनलाइन');
  const raseedBtn = document.getElementById('btnPayGenRaseed');
  if (raseedBtn) raseedBtn.classList.toggle('sakriya', madhyam === 'रसीद');
}

// =============================================================================
// 4. डैशबोर्ड गणना एवं रेंडरिंग (Dashboard Calculations & View)
// =============================================================================

function mukhyaFalakhSajayein() {
  const mMasik = koshAakde.masik || [];
  const mVarshik = koshAakde.varshik || [];
  const mNaveen = koshAakde.naveen || [];

  let nakadTotal = 0, onlineTotal = 0, raseedTotal = 0;

  // 1. मासिक दानदाता गणना
  let masikNiyat = 0, masikPrapt = 0;
  mMasik.forEach(function(i) {
    masikNiyat += (i.niyatRakam || 0);
    masikPrapt += (i.praptRakam || 0);
    (i.mahine || []).forEach(function(m) {
      if (m.medium === 'ऑनलाइन') onlineTotal += (m.amount || 0);
      else nakadTotal += (m.amount || 0);
    });
  });
  const masikBakaya = Math.max(0, masikNiyat - masikPrapt);

  // 2. वार्षिक दानदाता गणना
  let varshikNiyat = 0, varshikPrapt = 0;
  mVarshik.forEach(function(i) {
    varshikNiyat += (i.niyatRakam || 0);
    varshikPrapt += (i.praptRakam || 0);
    (i.bhugtanList || []).forEach(function(k) {
      const rVal = parseInt(k.rakam, 10) || 0;
      if (k.madhyam === 'ऑनलाइन') onlineTotal += rVal;
      else nakadTotal += rVal;
    });
  });
  const varshikBakaya = Math.max(0, varshikNiyat - varshikPrapt);

  // 3. नवीन दानदाता गणना
  let naveenNiyat = 0, naveenPrapt = 0;
  mNaveen.forEach(function(i) {
    naveenNiyat += (i.niyatRakam || 0);
    naveenPrapt += (i.praptRakam || 0);
    (i.bhugtanList || []).forEach(function(k) {
      const rVal = parseInt(k.rakam, 10) || 0;
      if (k.madhyam === 'ऑनलाइन') onlineTotal += rVal;
      else if (k.madhyam === 'रसीद') raseedTotal += rVal;
      else nakadTotal += rVal;
    });
  });
  const naveenBakaya = Math.max(0, naveenNiyat - naveenPrapt);

  // 4. कुल दानदाता सारांश
  const grandNiyat = masikNiyat + varshikNiyat + naveenNiyat;
  const grandPrapt = masikPrapt + varshikPrapt + naveenPrapt;
  const grandBakaya = Math.max(0, grandNiyat - grandPrapt);
  const grandCount = mMasik.length + mVarshik.length + mNaveen.length;

  // UI अद्यतन - मासिक
  document.getElementById('masikCountBadge').innerText = mMasik.length + ' सदस्य';
  document.getElementById('masikPraptDisplay').innerText = '₹' + masikPrapt.toLocaleString('hi-IN');
  document.getElementById('masikSubKosh').innerHTML = 
    `<div class="stat-row"><span>नियत राशि:</span> <strong style="color:#2563eb;">₹${masikNiyat.toLocaleString('hi-IN')}</strong></div>
     <div class="stat-row"><span>बकाया राशि:</span> <strong style="color:#dc2626;">₹${masikBakaya.toLocaleString('hi-IN')}</strong></div>`;

  // UI अद्यतन - वार्षिक
  document.getElementById('varshikCountBadge').innerText = mVarshik.length + ' सदस्य';
  document.getElementById('varshikPraptDisplay').innerText = '₹' + varshikPrapt.toLocaleString('hi-IN');
  document.getElementById('varshikSubKosh').innerHTML = 
    `<div class="stat-row"><span>नियत राशि:</span> <strong style="color:#2563eb;">₹${varshikNiyat.toLocaleString('hi-IN')}</strong></div>
     <div class="stat-row"><span>बकाया राशि:</span> <strong style="color:#dc2626;">₹${varshikBakaya.toLocaleString('hi-IN')}</strong></div>`;

  // UI अद्यतन - नवीन
  document.getElementById('naveenCountBadge').innerText = mNaveen.length + ' सदस्य';
  document.getElementById('naveenPraptDisplay').innerText = '₹' + naveenPrapt.toLocaleString('hi-IN');
  document.getElementById('naveenSubKosh').innerHTML = 
    `<div class="stat-row"><span>नियत राशि:</span> <strong style="color:#2563eb;">₹${naveenNiyat.toLocaleString('hi-IN')}</strong></div>
     <div class="stat-row"><span>बकाया राशि:</span> <strong style="color:#dc2626;">₹${naveenBakaya.toLocaleString('hi-IN')}</strong></div>`;

  // UI अद्यतन - कुल सारांश
  document.getElementById('grandCountBadge').innerText = grandCount + ' कुल सदस्य';
  document.getElementById('grandPraptDisplay').innerText = '₹' + grandPrapt.toLocaleString('hi-IN');
  document.getElementById('grandNiyatVal').innerText = '₹' + grandNiyat.toLocaleString('hi-IN');
  document.getElementById('grandBakayaVal').innerText = '₹' + grandBakaya.toLocaleString('hi-IN');

  document.getElementById('grandNakadVal').innerText = '₹' + nakadTotal.toLocaleString('hi-IN');
  document.getElementById('grandOnlineVal').innerText = '₹' + onlineTotal.toLocaleString('hi-IN');
  document.getElementById('grandRaseedVal').innerText = '₹' + raseedTotal.toLocaleString('hi-IN');
}

function getItemStatus(ikayi) {
  const niyat = ikayi.niyatRakam || 0;
  const prapt = ikayi.praptRakam || 0;
  const bakaya = Math.max(0, niyat - prapt);

  if (prapt >= niyat && niyat > 0) return { title: 'पूर्ण प्राप्त', css: 'status-purna' };
  if (prapt === 0) return { title: 'पूर्ण बकाया', css: 'status-bakaya-purna' };
  if (prapt > 0 && bakaya > 0) return { title: 'आंशिक बकाया', css: 'status-anshik-bakaya' };
  return { title: 'पूर्ण प्राप्त', css: 'status-purna' };
}

function findDonorByKramank(kramank) {
  const allList = [].concat(koshAakde.masik, koshAakde.varshik, koshAakde.naveen);
  return allList.find(item => item.kramank === kramank);
}

// =============================================================================
// 5. भुगतान दर्ज करें सेक्शन (Record Payment Section Logic)
// =============================================================================

function renderPaySectionDonorList() {
  const kosh = document.getElementById('paySectionDonorListPatt');
  if (!kosh) return;

  let moolSoochi = [];
  if (paySubCategoryChuna === 'समस्त') {
    moolSoochi = [].concat(koshAakde.masik, koshAakde.varshik, koshAakde.naveen);
  } else if (paySubCategoryChuna === 'मासिक') {
    moolSoochi = [].concat(koshAakde.masik);
  } else if (paySubCategoryChuna === 'वार्षिक') {
    moolSoochi = [].concat(koshAakde.varshik);
  } else if (paySubCategoryChuna === 'नवीन') {
    moolSoochi = [].concat(koshAakde.naveen);
  }

  const shabd = document.getElementById('paySectionSearchInput').value.trim().toLowerCase();
  const status = payFilterStatusChuna;

  const chhatiHuyi = moolSoochi.filter(function(ikayi) {
    const niyat = ikayi.niyatRakam || 0;
    const prapt = ikayi.praptRakam || 0;
    const bakaya = Math.max(0, niyat - prapt);

    if (status === 'बकाया' && bakaya <= 0) return false;
    if (status === 'आंशिक बकाया' && !(prapt > 0 && bakaya > 0)) return false;
    if (status === 'पूर्ण बकाया' && !(prapt === 0)) return false;

    return true;
  });

  let antimParinam = [];
  if (shabd) {
    antimParinam = chhatiHuyi.filter(function(ikayi) {
      const textCombined = (ikayi.naam + ' ' + (ikayi.pitaNaam || '') + ' ' + (ikayi.vivaran || '')).toLowerCase();
      return textCombined.indexOf(shabd) !== -1;
    });
  } else {
    antimParinam = chhatiHuyi;
  }

  if (antimParinam.length === 0) {
    kosh.innerHTML = '<div style="text-align:center; padding: 30px; color:#94a3b8;">कोई दानदाता प्रविष्टि नहीं मिली।</div>';
    return;
  }

  let rachna = '';
  antimParinam.forEach(function(ikayi) {
    const catClass = ikayi.prakar === 'मासिक' ? 'masik-card' : (ikayi.prakar === 'वार्षिक' ? 'varshik-card' : 'naveen-card');
    const catBadgeClass = ikayi.prakar === 'मासिक' ? 'cat-masik' : (ikayi.prakar === 'वार्षिक' ? 'cat-varshik' : 'cat-naveen');
    const bakayaItem = Math.max(0, ikayi.niyatRakam - ikayi.praptRakam);
    const st = getItemStatus(ikayi);

    rachna += `
      <div class="pravishti-patra ${catClass}" onclick="openPayEntryModalDirect('${ikayi.kramank}')">
        <div class="pravishti-matha">
          <div>
            <span class="category-badge ${catBadgeClass}">${ikayi.prakar}</span>
            <span class="pravishti-naam">${ikayi.naam}</span>
            ${ikayi.pitaNaam ? `<div class="pravishti-pita">पिता: ${ikayi.pitaNaam}</div>` : ''}
          </div>
          <div class="pravishti-rakam-box">
            <div class="pravishti-rakam-prapt">प्राप्त: ₹${ikayi.praptRakam.toLocaleString('hi-IN')}</div>
            <div class="pravishti-rakam-niyat">नियत: ₹${ikayi.niyatRakam.toLocaleString('hi-IN')}</div>
            <div class="pravishti-rakam-bakaya">बकाया: ₹${bakayaItem.toLocaleString('hi-IN')}</div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px dashed #cbd5e1; padding-top:6px;">
          <span class="status-chinh ${st.css}">${st.title}</span>
          <button class="btn-modal-action btn-modal-pay" style="padding:4px 10px; font-size:12px;">
            <span>भुगतान दर्ज करें ›</span>
          </button>
        </div>
      </div>`;
  });

  kosh.innerHTML = rachna;
}

// =============================================================================
// 6. भुगतान प्रविष्टि मोडल (Payment Entry Modal Logic)
// =============================================================================

function openPayEntryModalDirect(kramank) {
  const donor = findDonorByKramank(kramank);
  if (!donor) return;

  currentActivePayDonor = JSON.parse(JSON.stringify(donor)); // गहरा क्लोन
  const bakaya = Math.max(0, donor.niyatRakam - donor.praptRakam);

  document.getElementById('payModalTitle').innerText = 'भुगतान दर्ज करें';
  document.getElementById('payMName').innerText = donor.naam + (donor.pitaNaam ? ` (पिता: ${donor.pitaNaam})` : '');
  document.getElementById('payMCat').innerText = `${donor.prakar} दानदाता`;
  document.getElementById('payMNiyat').innerText = `₹${donor.niyatRakam.toLocaleString('hi-IN')}`;
  document.getElementById('payMPrapt').innerText = `₹${donor.praptRakam.toLocaleString('hi-IN')}`;
  document.getElementById('payMBakaya').innerText = `₹${bakaya.toLocaleString('hi-IN')}`;

  const masikWrapper = document.getElementById('payMasikWrapper');
  const genericWrapper = document.getElementById('payGenericWrapper');

  if (donor.prakar === 'मासिक') {
    masikWrapper.style.display = 'block';
    genericWrapper.style.display = 'none';
    renderMasikMonthEditCards(currentActivePayDonor);
  } else {
    masikWrapper.style.display = 'none';
    genericWrapper.style.display = 'block';

    const raseedBtn = document.getElementById('btnPayGenRaseed');
    if (donor.prakar === 'नवीन') {
      raseedBtn.style.display = 'inline-flex';
    } else {
      raseedBtn.style.display = 'none';
      if (document.getElementById('chhipaGenMadhyam').value === 'रसीद') {
        chuniyeGenMadhyam('नकद');
      }
    }

    const formBlock = document.getElementById('payFormBlock');
    const fullyPaidBanner = document.getElementById('payFullyPaidBanner');
    const pastListWrapper = document.getElementById('payPastListWrapper');
    const formHeading = document.getElementById('payFormBlockHeading');

    const hasPriorPayments = (donor.praptRakam > 0) || (donor.bhugtanList && donor.bhugtanList.length > 0);
    if (hasPriorPayments) {
      if (pastListWrapper) pastListWrapper.style.display = 'block';
      if (formHeading) {
        formHeading.innerText = (bakaya > 0) ? 'नया भुगतान दर्ज करें:' : 'भुगतान दर्ज करें:';
      }
      renderPastBhugtanListContainer(currentActivePayDonor);
    } else {
      if (pastListWrapper) pastListWrapper.style.display = 'none';
      if (formHeading) {
        formHeading.innerText = (bakaya > 0 && bakaya < donor.niyatRakam) ? 'आंशिक भुगतान दर्ज करें:' : 'भुगतान दर्ज करें:';
      }
    }

    if (bakaya <= 0 && donor.niyatRakam > 0) {
      formBlock.style.display = 'none';
      fullyPaidBanner.style.display = 'block';
    } else {
      formBlock.style.display = 'block';
      fullyPaidBanner.style.display = 'none';

      document.getElementById('payGenRakam').value = '';
      document.getElementById('payGenVivaran').value = '';
      chuniyeGenMadhyam('नकद');
    }
  }

  document.getElementById('bhugtanEntryModal').style.display = 'flex';
}

function closePayEntryModal() {
  document.getElementById('bhugtanEntryModal').style.display = 'none';
}

function getMadhyamBadgeHtml(med) {
  if (med === 'ऑनलाइन') {
    return `<span style="font-size:10.5px; background:#dbeafe; color:#1e40af; padding:2px 7px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center;">${ICON_ONLINE} ऑनलाइन</span>`;
  } else if (med === 'रसीद') {
    return `<span style="font-size:10.5px; background:#fef3c7; color:#92400e; padding:2px 7px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center;">${ICON_RASEED} रसीद</span>`;
  } else {
    return `<span style="font-size:10.5px; background:#d1fae5; color:#065f46; padding:2px 7px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center;">${ICON_NAKAD} नकद</span>`;
  }
}

function renderMasikMonthEditCards(donor) {
  const container = document.getElementById('payMasikMonthsContainer');
  let html = '';
  let firstUnpaidFound = false;

  monthNames.forEach(function(mName, idx) {
    const mObj = (donor.mahine && donor.mahine[idx]) ? donor.mahine[idx] : { amount: 0, medium: 'नकद' };
    const amt = mObj.amount || 0;
    const med = mObj.medium || 'नकद';
    const valDisplay = amt > 0 ? `₹${amt.toLocaleString('hi-IN')} (${med})` : `<span style="color:#94a3b8; font-weight:700;">NIL</span>`;

    let isFirstUnpaid = false;
    if (amt === 0 && !firstUnpaidFound) {
      firstUnpaidFound = true;
      isFirstUnpaid = true;
    }

    const btnTooltip = amt > 0 ? 'संपादित करें' : 'दर्ज करें';
    const editBoxDisplay = isFirstUnpaid ? 'block' : 'none';
    const boxBorderColor = isFirstUnpaid ? '#059669' : '#3b82f6';

    html += `
      <div class="masik-month-card" id="mCard_${idx}">
        <div>
          <span class="masik-month-title">${mName}:</span>
          <span class="masik-month-val" id="mDisp_${idx}">${valDisplay}</span>
        </div>
        <button type="button" class="btn-edit-month" onclick="toggleInlineMonthEdit(${idx})" title="${btnTooltip}" style="display:inline-flex; align-items:center; justify-content:center; padding:4px 8px;">
          ${ICON_PENCIL}
        </button>
      </div>
      <div id="mEditBox_${idx}" style="display:${editBoxDisplay}; background:#ffffff; border:1.5px solid ${boxBorderColor}; border-radius:10px; padding:10px; margin-bottom:8px;">
        <div style="font-size:11px; font-weight:700; color:${boxBorderColor}; margin-bottom:6px;">
          ${isFirstUnpaid ? mName + ' का भुगतान दर्ज करें:' : mName + ' का विवरण संपादन:'}
        </div>
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <input type="number" id="mInp_amt_${idx}" value="${amt > 0 ? amt : ''}" placeholder="₹ राशि" style="width:100px; padding:6px 8px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:13px;">
          <button type="button" id="mMed_nakad_${idx}" class="medium-toggle-btn ${med === 'नकद' || !med ? 'online-active' : ''}" onclick="setMonthMedChoice(${idx}, 'नकद')" style="padding:4px 8px; font-size:11.5px; display:inline-flex; align-items:center; gap:2px;">
            ${ICON_NAKAD} नकद
          </button>
          <button type="button" id="mMed_online_${idx}" class="medium-toggle-btn ${med === 'ऑनलाइन' ? 'online-active' : ''}" onclick="setMonthMedChoice(${idx}, 'ऑनलाइन')" style="padding:4px 8px; font-size:11.5px; display:inline-flex; align-items:center; gap:2px;">
            ${ICON_ONLINE} ऑनलाइन
          </button>
          <input type="hidden" id="mInp_med_${idx}" value="${med}">
          <button type="button" class="btn-modal-action btn-modal-pay" style="padding:6px 12px; font-size:12px; display:inline-flex; align-items:center; gap:4px; margin-left:auto;" onclick="saveSingleMonthPayment(${idx})">
            ${ICON_SAVE} <span>सहेजें</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function toggleInlineMonthEdit(idx) {
  const box = document.getElementById('mEditBox_' + idx);
  if (!box) return;
  box.style.display = (box.style.display === 'block') ? 'none' : 'block';
}

function setMonthMedChoice(idx, med) {
  document.getElementById('mInp_med_' + idx).value = med;
  const btnN = document.getElementById('mMed_nakad_' + idx);
  const btnO = document.getElementById('mMed_online_' + idx);
  if (btnN) btnN.classList.toggle('online-active', med === 'नकद');
  if (btnO) btnO.classList.toggle('online-active', med === 'ऑनलाइन');
}

async function saveSingleMonthPayment(idx) {
  const amtVal = parseInt(document.getElementById('mInp_amt_' + idx).value, 10) || 0;
  const medVal = document.getElementById('mInp_med_' + idx).value || 'नकद';

  if (!currentActivePayDonor.mahine) currentActivePayDonor.mahine = [];
  currentActivePayDonor.mahine[idx] = { amount: amtVal, medium: medVal };

  sandeshDikhayein(`माह ${monthNames[idx]} का भुगतान अद्यतन हो रहा है...`);

  try {
    await apiFetch('/api/action', 'POST', {
      action: 'update',
      data: currentActivePayDonor,
      user: CONFIG.getUserName()
    });

    sandeshDikhayein(`${monthNames[idx]} का भुगतान सफलतापूर्वक अद्यतन हो गया`);
    await aakdeMangwayein();
    const updated = findDonorByKramank(currentActivePayDonor.kramank);
    if (updated) openPayEntryModalDirect(updated.kramank);
  } catch (err) {
    sandeshDikhayein('त्रुटि: ' + err.message);
  }
}

function convertToInputDateFormat(dtStr) {
  if (!dtStr) return '';
  const parts = dtStr.split('-');
  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  return dtStr;
}

function renderPastBhugtanListContainer(donor) {
  const container = document.getElementById('payPastListContainer');
  const bList = donor.bhugtanList || [];

  if (bList.length === 0) {
    container.innerHTML = '<div style="color:#94a3b8; text-align:center;">कोई पूर्व दर्ज भुगतान नहीं है।</div>';
    return;
  }

  let html = '';
  bList.forEach(function(b, idx) {
    const medBadge = getMadhyamBadgeHtml(b.madhyam || 'नकद');
    const dateVal = convertToInputDateFormat(b.tarikh || '');

    html += `
      <div style="border-bottom:1px dashed #cbd5e1; padding:6px 0;" id="pastRow_${idx}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12.5px; color:#1e293b;">
            <strong>भुगतान #${idx + 1}</strong>
            ${b.tarikh ? `<span style="color:#64748b; font-size:11.5px;"> (${b.tarikh})</span>` : ''}
            ${b.vivaran ? `<div style="font-size:11px; color:#475569;">${b.vivaran}</div>` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <strong style="color:#059669; font-size:13.5px;">₹${(b.rakam || 0).toLocaleString('hi-IN')}</strong>
            ${medBadge}
            <button type="button" class="btn-edit-month" onclick="toggleInlinePastEdit(${idx})" title="प्रविष्टि बदलें" style="padding:4px 7px; display:inline-flex; align-items:center;">
              ${ICON_PENCIL}
            </button>
          </div>
        </div>

        <!-- Inline Edit Box -->
        <div id="pastEditBox_${idx}" style="display:none; background:#ffffff; border:1.5px solid #8b5cf6; border-radius:10px; padding:10px; margin-top:8px;">
          <div style="font-size:11.5px; font-weight:700; color:#6d28d9; margin-bottom:6px;">भुगतान #${idx + 1} विवरण संपादन:</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; gap:8px; align-items:center;">
              <div style="flex:1;">
                <label style="font-size:10.5px; font-weight:700; color:#475569;">धनराशि (₹):</label>
                <input type="number" id="pastInp_amt_${idx}" value="${b.rakam || 0}" min="1" style="width:100%; padding:5px 8px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12.5px;">
              </div>
              <div style="flex:1;">
                <label style="font-size:10.5px; font-weight:700; color:#475569;">तारीख:</label>
                <input type="date" id="pastInp_tarikh_${idx}" value="${dateVal}" style="width:100%; padding:5px 8px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12px;">
              </div>
            </div>

            <div>
              <label style="font-size:10.5px; font-weight:700; color:#475569;">भुगतान माध्यम:</label>
              <div style="display:flex; gap:6px; margin-top:3px;">
                <button type="button" id="pastMed_nakad_${idx}" class="medium-toggle-btn ${b.madhyam === 'नकद' || !b.madhyam ? 'online-active' : ''}" onclick="setPastMedState(${idx}, 'नकद')" style="padding:4px 8px; font-size:11.5px; display:inline-flex; align-items:center;">
                  ${ICON_NAKAD} नकद
                </button>
                <button type="button" id="pastMed_online_${idx}" class="medium-toggle-btn ${b.madhyam === 'ऑनलाइन' ? 'online-active' : ''}" onclick="setPastMedState(${idx}, 'ऑनलाइन')" style="padding:4px 8px; font-size:11.5px; display:inline-flex; align-items:center;">
                  ${ICON_ONLINE} ऑनलाइन
                </button>
                ${donor.prakar === 'नवीन' ? `
                  <button type="button" id="pastMed_raseed_${idx}" class="medium-toggle-btn ${b.madhyam === 'रसीद' ? 'online-active' : ''}" onclick="setPastMedState(${idx}, 'रसीद')" style="padding:4px 8px; font-size:11.5px; display:inline-flex; align-items:center;">
                    ${ICON_RASEED} रसीद
                  </button>
                ` : ''}
              </div>
              <input type="hidden" id="pastInp_med_${idx}" value="${b.madhyam || 'नकद'}">
            </div>

            <div>
              <label style="font-size:10.5px; font-weight:700; color:#475569;">विवरण / टिप्पणी:</label>
              <input type="text" id="pastInp_vivaran_${idx}" value="${b.vivaran || ''}" placeholder="विवरण दर्ज करें" style="width:100%; padding:5px 8px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12.5px;">
            </div>

            <div style="display:flex; justify-content:space-between; margin-top:4px;">
              <button type="button" class="btn-modal-action btn-modal-delete" style="padding:5px 10px; font-size:11.5px; display:inline-flex; align-items:center; gap:4px;" onclick="deleteSinglePastPayment(${idx})">
                ${ICON_TRASH} <span>हटाएं</span>
              </button>
              <button type="button" class="btn-modal-action btn-modal-pay" style="padding:5px 12px; font-size:11.5px; display:inline-flex; align-items:center; gap:4px;" onclick="saveSinglePastPayment(${idx})">
                ${ICON_SAVE} <span>अद्यतन करें</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function toggleInlinePastEdit(idx) {
  const box = document.getElementById('pastEditBox_' + idx);
  if (box) {
    box.style.display = (box.style.display === 'block') ? 'none' : 'block';
  }
}

function setPastMedState(idx, med) {
  document.getElementById('pastInp_med_' + idx).value = med;
  const btnN = document.getElementById('pastMed_nakad_' + idx);
  const btnO = document.getElementById('pastMed_online_' + idx);
  const btnR = document.getElementById('pastMed_raseed_' + idx);

  if (btnN) btnN.classList.toggle('online-active', med === 'नकद');
  if (btnO) btnO.classList.toggle('online-active', med === 'ऑनलाइन');
  if (btnR) btnR.classList.toggle('online-active', med === 'रसीद');
}

async function saveSinglePastPayment(idx) {
  if (!currentActivePayDonor || !currentActivePayDonor.bhugtanList) return;

  const rVal = parseInt(document.getElementById('pastInp_amt_' + idx).value, 10) || 0;
  if (rVal <= 0) {
    sandeshDikhayein('कृपया वैध भुगतान धनराशि दर्ज करें!');
    return;
  }

  const tRaw = document.getElementById('pastInp_tarikh_' + idx).value;
  const tFormatted = tRaw ? (tRaw.split('-')[2] + '-' + tRaw.split('-')[1] + '-' + tRaw.split('-')[0]) : '';
  const mVal = document.getElementById('pastInp_med_' + idx).value || 'नकद';
  const vVal = document.getElementById('pastInp_vivaran_' + idx).value.trim() || 'भुगतान अद्यतन';

  currentActivePayDonor.bhugtanList[idx] = {
    tarikh: tFormatted,
    rakam: rVal,
    madhyam: mVal,
    vivaran: vVal
  };

  let sum = 0;
  currentActivePayDonor.bhugtanList.forEach(k => { sum += (parseInt(k.rakam, 10) || 0); });
  currentActivePayDonor.praptRakam = sum;

  sandeshDikhayein('पूर्व भुगतान प्रविष्टि अद्यतन की जा रही है...');

  try {
    await apiFetch('/api/action', 'POST', {
      action: 'update',
      data: currentActivePayDonor,
      user: CONFIG.getUserName()
    });

    sandeshDikhayein('भुगतान प्रविष्टि अद्यतन हो गई');
    await aakdeMangwayein();
    const updated = findDonorByKramank(currentActivePayDonor.kramank);
    if (updated) openPayEntryModalDirect(updated.kramank);
  } catch (err) {
    sandeshDikhayein('त्रुटि: ' + err.message);
  }
}

async function deleteSinglePastPayment(idx) {
  if (!currentActivePayDonor || !currentActivePayDonor.bhugtanList) return;

  currentActivePayDonor.bhugtanList.splice(idx, 1);

  let sum = 0;
  currentActivePayDonor.bhugtanList.forEach(k => { sum += (parseInt(k.rakam, 10) || 0); });
  currentActivePayDonor.praptRakam = sum;

  sandeshDikhayein('भुगतान प्रविष्टि हटाई जा रही है...');

  try {
    await apiFetch('/api/action', 'POST', {
      action: 'update',
      data: currentActivePayDonor,
      user: CONFIG.getUserName()
    });

    sandeshDikhayein('भुगतान प्रविष्टि हटा दी गई');
    await aakdeMangwayein();
    const updated = findDonorByKramank(currentActivePayDonor.kramank);
    if (updated) openPayEntryModalDirect(updated.kramank);
  } catch (err) {
    sandeshDikhayein('त्रुटि: ' + err.message);
  }
}

async function saveGenericPayment() {
  if (!currentActivePayDonor) return;

  const rakamVal = parseInt(document.getElementById('payGenRakam').value, 10) || 0;
  if (rakamVal <= 0) {
    sandeshDikhayein('कृपया वैध भुगतान धनराशि दर्ज करें!');
    return;
  }

  const tarikhRaw = document.getElementById('payGenTarikh').value;
  const tarikhFormatted = tarikhRaw ? (tarikhRaw.split('-')[2] + '-' + tarikhRaw.split('-')[1] + '-' + tarikhRaw.split('-')[0]) : '';
  const madhyamVal = document.getElementById('chhipaGenMadhyam').value;

  const niyatVal = currentActivePayDonor.niyatRakam || 0;
  const currentPrapt = currentActivePayDonor.praptRakam || 0;
  const bakayaBefore = Math.max(0, niyatVal - currentPrapt);

  let vivaranVal = document.getElementById('payGenVivaran').value.trim();
  if (!vivaranVal) {
    vivaranVal = (rakamVal >= bakayaBefore && bakayaBefore > 0) ? 'पूर्ण भुगतान' : 'आंशिक भुगतान';
  }

  if (!currentActivePayDonor.bhugtanList) currentActivePayDonor.bhugtanList = [];
  currentActivePayDonor.bhugtanList.push({
    tarikh: tarikhFormatted,
    rakam: rakamVal,
    madhyam: madhyamVal,
    vivaran: vivaranVal
  });

  sandeshDikhayein('भुगतान जमा किया जा रहा है...');

  try {
    await apiFetch('/api/action', 'POST', {
      action: 'update',
      data: currentActivePayDonor,
      user: CONFIG.getUserName()
    });

    sandeshDikhayein('भुगतान प्रविष्टि सफलता पूर्वक जमा हो गई');
    await aakdeMangwayein();
    const updated = findDonorByKramank(currentActivePayDonor.kramank);
    if (updated) openPayEntryModalDirect(updated.kramank);
  } catch (err) {
    sandeshDikhayein('त्रुटि: ' + err.message);
  }
}

// =============================================================================
// 7. दानदाता डायरेक्टरी लॉजिक (Donor Directory Logic)
// =============================================================================

function suchiSajayein() {
  const kosh = document.getElementById('pravishtiSuchiPatt');
  if (!kosh) return;

  let moolSoochi = [];
  if (vartamanUpKhand === 'समस्त') {
    moolSoochi = [].concat(koshAakde.masik, koshAakde.varshik, koshAakde.naveen);
  } else if (vartamanUpKhand === 'मासिक') {
    moolSoochi = [].concat(koshAakde.masik);
  } else if (vartamanUpKhand === 'वार्षिक') {
    moolSoochi = [].concat(koshAakde.varshik);
  } else if (vartamanUpKhand === 'नवीन') {
    moolSoochi = [].concat(koshAakde.naveen);
  }

  const shabd = document.getElementById('khojShabd').value.trim().toLowerCase();
  const status = filterStatusChuna;
  const niyatFilterRakam = parseInt(document.getElementById('khojNiyatRakam').value, 10);

  const chhatiHuyi = moolSoochi.filter(function(ikayi) {
    const niyat = ikayi.niyatRakam || 0;
    const prapt = ikayi.praptRakam || 0;
    const bakaya = Math.max(0, niyat - prapt);

    if (status === 'पूर्ण प्राप्त' && !(prapt >= niyat && niyat > 0)) return false;
    if (status === 'आंशिक प्राप्त' && !(prapt > 0 && prapt < niyat)) return false;
    if (status === 'पूर्ण बकाया' && !(prapt === 0)) return false;
    if (status === 'आंशिक बकाया' && !(bakaya > 0 && prapt > 0)) return false;

    if (!isNaN(niyatFilterRakam) && niyatFilterRakam > 0 && niyat !== niyatFilterRakam) return false;

    return true;
  });

  let antimParinam = [];
  if (shabd) {
    antimParinam = chhatiHuyi.filter(function(ikayi) {
      const textCombined = (ikayi.naam + ' ' + (ikayi.pitaNaam || '') + ' ' + (ikayi.vivaran || '')).toLowerCase();
      return textCombined.indexOf(shabd) !== -1;
    });
  } else {
    antimParinam = chhatiHuyi;
  }

  if (antimParinam.length === 0) {
    kosh.innerHTML = '<div style="text-align:center; padding: 30px; color:#94a3b8;">कोई प्रविष्टि नहीं मिली।</div>';
    return;
  }

  let rachna = '';
  antimParinam.forEach(function(ikayi) {
    const catClass = ikayi.prakar === 'मासिक' ? 'masik-card' : (ikayi.prakar === 'वार्षिक' ? 'varshik-card' : 'naveen-card');
    const catBadgeClass = ikayi.prakar === 'मासिक' ? 'cat-masik' : (ikayi.prakar === 'वार्षिक' ? 'cat-varshik' : 'cat-naveen');
    const bakayaItem = Math.max(0, ikayi.niyatRakam - ikayi.praptRakam);
    const st = getItemStatus(ikayi);

    rachna += `
      <div class="pravishti-patra ${catClass}" id="card-${ikayi.kramank}" onclick="openDetailModal('${ikayi.kramank}', '${ikayi.prakar}')">
        <div class="pravishti-matha">
          <div>
            <span class="category-badge ${catBadgeClass}">${ikayi.prakar}</span>
            <span class="pravishti-naam">${ikayi.naam}</span>
            ${ikayi.pitaNaam ? `<div class="pravishti-pita">पिता: ${ikayi.pitaNaam}</div>` : ''}
          </div>
          <div class="pravishti-rakam-box">
            <div class="pravishti-rakam-prapt">प्राप्त: ₹${ikayi.praptRakam.toLocaleString('hi-IN')}</div>
            <div class="pravishti-rakam-niyat">नियत: ₹${ikayi.niyatRakam.toLocaleString('hi-IN')}</div>
            <div class="pravishti-rakam-bakaya">बकाया: ₹${bakayaItem.toLocaleString('hi-IN')}</div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px dashed #f1f5f9; padding-top:6px;">
          <div class="pravishti-vivaran">${ikayi.vivaran || 'कोई विवरण नहीं'}</div>
          <span class="status-chinh ${st.css}">${st.title}</span>
        </div>
      </div>`;
  });

  kosh.innerHTML = rachna;
}

function chhantaiLagayein() {
  suchiSajayein();
}

function khojHatao() {
  document.getElementById('khojShabd').value = '';
  document.getElementById('khojNiyatRakam').value = '';
  setFilterStatus('सभी');
}

// =============================================================================
// 8. हटाया गया सेक्शन (Trash / Removed Records)
// =============================================================================

function hatayiSuchiSajayein() {
  const kosh = document.getElementById('hatayiSuchiPatt');
  if (!kosh) return;

  const suchi = (koshAakde.hatayaGaya || []).filter(h => h.prakar === vartamanHatayaKhand);

  if (suchi.length === 0) {
    kosh.innerHTML = '<div style="text-align:center; padding: 30px; color:#94a3b8;">कोई हटाई गई प्रविष्टि नहीं है।</div>';
    return;
  }

  let rachna = '';
  suchi.forEach(function(ikayi) {
    rachna += `
      <div class="pravishti-patra" style="padding: 10px 12px;">
        <div class="pravishti-matha">
          <div>
            <span class="pravishti-naam" style="color:#64748b;">${ikayi.naam}</span>
            ${ikayi.pitaNaam ? `<div class="pravishti-pita">पिता: ${ikayi.pitaNaam}</div>` : ''}
          </div>
          <div class="pravishti-rakam-box">
            <div class="pravishti-rakam-prapt" style="color:#64748b;">₹${ikayi.praptRakam.toLocaleString('hi-IN')}</div>
          </div>
        </div>
        <div class="pravishti-suchna" style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
          <span>हटाने वाला: ${ikayi.hataneWala ? ikayi.hataneWala.split('(')[0].trim() : 'लागू नहीं'}</span>
          <button class="btn-punah-lao-modern" onclick="event.stopPropagation(); punahPraptKarein('${ikayi.kramank}')">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            <span>पुनः लाएं</span>
          </button>
        </div>
      </div>`;
  });

  kosh.innerHTML = rachna;
}

// =============================================================================
// 9. विस्तृत विवरण एवं क्रियान्वयन मोडल (Donor Details Modal)
// =============================================================================

function openDetailModal(kramank, prakar) {
  const donor = findDonorByKramank(kramank);
  if (!donor) return;
  currentActiveDetailDonor = donor;

  const bakayaItem = Math.max(0, donor.niyatRakam - donor.praptRakam);
  const st = getItemStatus(donor);

  document.getElementById('detailPrakarTitle').innerText = `${prakar} दानदाता विवरण`;
  document.getElementById('detailBadge').innerText = st.title;
  document.getElementById('detailBadge').className = `status-chinh ${st.css}`;

  document.getElementById('detailNaam').innerText = donor.naam;
  document.getElementById('detailPita').innerText = donor.pitaNaam || '-';
  document.getElementById('detailNiyat').innerText = `₹${donor.niyatRakam.toLocaleString('hi-IN')}`;
  document.getElementById('detailPrapt').innerText = `₹${donor.praptRakam.toLocaleString('hi-IN')}`;
  document.getElementById('detailBakaya').innerText = `₹${bakayaItem.toLocaleString('hi-IN')}`;
  document.getElementById('detailVivaran').innerText = donor.vivaran || '-';
  document.getElementById('detailKarta').innerText = (donor.karta ? donor.karta.split('(')[0].trim() : 'लागू नहीं');

  const masikBlock = document.getElementById('detailMasikBreakdown');
  const kishteBlock = document.getElementById('detailKishteBreakdown');
  const monthGrid = document.getElementById('detailMonthsGrid');
  const kishteGrid = document.getElementById('detailKishteGrid');

  if (prakar === 'मासिक' && donor.mahine) {
    masikBlock.style.display = 'block';
    kishteBlock.style.display = 'none';
    let mHtml = '';
    monthNames.forEach(function(mName, idx) {
      const mObj = donor.mahine[idx] || { amount: 0, medium: 'नकद' };
      const amt = mObj.amount || 0;
      const med = mObj.medium || 'नकद';
      mHtml += `<div>${mName}: <strong>₹${amt}</strong> <span style="font-size:10px; color:#64748b;">(${med})</span></div>`;
    });
    monthGrid.innerHTML = mHtml;
  } else {
    masikBlock.style.display = 'none';
    kishteBlock.style.display = 'block';
    const bList = donor.bhugtanList || [];
    if (bList.length === 0) {
      kishteGrid.innerHTML = '<div style="color:#64748b;">कोई भुगतान प्रविष्टि दर्ज नहीं है।</div>';
    } else {
      let kHtml = '';
      bList.forEach(function(b, idx) {
        kHtml += `
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; border-bottom:1px solid #e2e8f0; padding-bottom:3px;">
            <span>भुगतान #${idx + 1}${b.tarikh ? ' (' + b.tarikh + ')' : ''}</span>
            <span><strong>₹${(b.rakam || 0).toLocaleString('hi-IN')}</strong> <span style="font-size:10.5px; background:#e2e8f0; padding:1px 5px; border-radius:4px;">${b.madhyam || 'नकद'}</span></span>
          </div>`;
      });
      kishteGrid.innerHTML = kHtml;
    }
  }

  document.getElementById('btnDetailPay').onclick = function() {
    closeDetailModal();
    openPayEntryModalDirect(donor.kramank);
  };

  document.getElementById('btnDetailEdit').onclick = function() {
    closeDetailModal();
    prapatraKholein(prakar, donor);
  };

  document.getElementById('btnDetailDelete').onclick = function() {
    closeDetailModal();
    hataoPravishti(donor.kramank, prakar);
  };

  document.getElementById('vivaranDetailModal').style.display = 'flex';
}

function closeDetailModal() {
  document.getElementById('vivaranDetailModal').style.display = 'none';
}

// =============================================================================
// 10. श्रेणी परिवर्तन / ट्रांसफर मोडल (Category Move)
// =============================================================================

function openMoveCategoryModal() {
  if (!currentActiveDetailDonor) return;
  document.getElementById('moveDonorName').innerText = currentActiveDetailDonor.naam + (currentActiveDetailDonor.pitaNaam ? ` (पिता: ${currentActiveDetailDonor.pitaNaam})` : '');
  document.getElementById('moveDonorCurrentInfo').innerText = `वर्तमान श्रेणी: ${currentActiveDetailDonor.prakar} दानदाता`;

  const sel = document.getElementById('selectTargetCategory');
  if (currentActiveDetailDonor.prakar === 'मासिक') sel.value = 'वार्षिक';
  else if (currentActiveDetailDonor.prakar === 'वार्षिक') sel.value = 'नवीन';
  else sel.value = 'मासिक';

  document.getElementById('shreniBadleModal').style.display = 'flex';
}

function closeMoveCategoryModal() {
  document.getElementById('shreniBadleModal').style.display = 'none';
}

async function confirmMoveCategory() {
  if (!currentActiveDetailDonor) return;

  const targetCategory = document.getElementById('selectTargetCategory').value;
  if (targetCategory === currentActiveDetailDonor.prakar) {
    sandeshDikhayein(`दानदाता पहले से इसी ${targetCategory} श्रेणी में उपलब्ध है।`);
    return;
  }

  const donorName = currentActiveDetailDonor.naam;
  const puranaKramank = currentActiveDetailDonor.kramank;

  closeMoveCategoryModal();
  closeDetailModal();

  sandeshDikhayein(`${donorName} को ${targetCategory} श्रेणी में स्थानांतरित किया जा रहा है...`);

  try {
    const res = await apiFetch('/api/action', 'POST', {
      action: 'moveCategory',
      kramank: puranaKramank,
      nayaPrakar: targetCategory,
      user: CONFIG.getUserName()
    });

    sandeshDikhayein(res.sandesh || `${donorName} की श्रेणी सफलतापूर्वक बदल दी गई है।`);
    await aakdeMangwayein();
  } catch (err) {
    sandeshDikhayein('त्रुटि: ' + err.message);
  }
}

// =============================================================================
// 11. प्रपत्र संपादन / नया दानदाता जोड़ना (Add / Edit Donor Form)
// =============================================================================

function prapatraKholein(prakar, puraniIkayi) {
  document.getElementById('prapatraPrakar').value = prakar;

  if (puraniIkayi) {
    document.getElementById('prapatraSheershak').innerText = 'नियत राशि व विवरण सम्पादित करें';
    document.getElementById('chhipaKramank').value = puraniIkayi.kramank;
    document.getElementById('prapatraNaam').value = puraniIkayi.naam;
    document.getElementById('prapatraPitaNaam').value = puraniIkayi.pitaNaam || '';
    document.getElementById('prapatraNiyatRakam').value = puraniIkayi.niyatRakam;
    document.getElementById('prapatraVivaran').value = puraniIkayi.vivaran || '';
  } else {
    document.getElementById('prapatraSheershak').innerText = `नया ${prakar} दानदाता दर्ज करें`;
    document.getElementById('chhipaKramank').value = '';
    document.getElementById('prapatraNaam').value = '';
    document.getElementById('prapatraPitaNaam').value = '';
    document.getElementById('prapatraNiyatRakam').value = '';
    document.getElementById('prapatraVivaran').value = '';
  }

  document.getElementById('prapatraParda').style.display = 'flex';
}

function prapatraBandKarein() {
  document.getElementById('prapatraParda').style.display = 'none';
}

async function prapatraSurakshitKarein() {
  const kramank = document.getElementById('chhipaKramank').value;
  const prakar = document.getElementById('prapatraPrakar').value;
  const naam = document.getElementById('prapatraNaam').value.trim();
  const pitaNaam = document.getElementById('prapatraPitaNaam').value.trim();
  const niyatRakam = parseInt(document.getElementById('prapatraNiyatRakam').value, 10) || 0;
  const vivaran = document.getElementById('prapatraVivaran').value.trim();

  if (!naam) {
    sandeshDikhayein('कृपया दानदाता का नाम दर्ज करें!');
    return;
  }

  const existingDonor = kramank ? findDonorByKramank(kramank) : null;
  const payload = {
    kramank: kramank,
    prakar: prakar,
    naam: naam,
    pitaNaam: pitaNaam,
    niyatRakam: niyatRakam,
    vivaran: vivaran,
    mahine: existingDonor ? existingDonor.mahine : null,
    bhugtanList: existingDonor ? existingDonor.bhugtanList : []
  };

  if (kramank) {
    pushtiPardaKholein('क्या आप दानदाता के विवरण व नियत राशि में किए गए बदलाव सुरक्षित करना चाहते हैं?', async function() {
      prapatraBandKarein();
      sandeshDikhayein('प्रविष्टि सुरक्षित की जा रही है...');

      try {
        await apiFetch('/api/action', 'POST', {
          action: 'update',
          data: payload,
          user: CONFIG.getUserName()
        });

        sandeshDikhayein('दानदाता अद्यतन हो गया');
        await aakdeMangwayein();
      } catch (err) {
        sandeshDikhayein('त्रुटि: ' + err.message);
      }
    });
  } else {
    prapatraBandKarein();
    sandeshDikhayein('दानदाता प्रविष्टि जोड़ी जा रही है...');

    try {
      await apiFetch('/api/action', 'POST', {
        action: 'create',
        data: payload,
        user: CONFIG.getUserName()
      });

      sandeshDikhayein('नया दानदाता सफलतापूर्वक दर्ज हो गया');
      await aakdeMangwayein();
    } catch (err) {
      sandeshDikhayein('त्रुटि: ' + err.message);
    }
  }
}

function hataoPravishti(kramank, prakar) {
  const sandesh = `श्रेणी: ${prakar} दानदाता<br><br><strong>क्या आप वाकई इस दानदाता प्रविष्टि को हटाना चाहते हैं?</strong>`;

  pushtiPardaKholein(sandesh, async function() {
    sandeshDikhayein('प्रविष्टि हटाई जा रही है...');

    try {
      await apiFetch('/api/action', 'POST', {
        action: 'delete',
        kramank: kramank,
        prakar: prakar,
        user: CONFIG.getUserName()
      });

      sandeshDikhayein('दानदाता प्रविष्टि सफलतापूर्वक हटा दी गई');
      await aakdeMangwayein();
    } catch (err) {
      sandeshDikhayein('त्रुटि: ' + err.message);
    }
  });
}

async function punahPraptKarein(kramank) {
  sandeshDikhayein('प्रविष्टि पुनः स्थापित की जा रही है...');

  try {
    await apiFetch('/api/action', 'POST', {
      action: 'restore',
      kramank: kramank,
      user: CONFIG.getUserName()
    });

    sandeshDikhayein('दानदाता प्रविष्टि पुनः स्थापित हो गई');
    await aakdeMangwayein();
  } catch (err) {
    sandeshDikhayein('त्रुटि: ' + err.message);
  }
}

// =============================================================================
// 12. दानदाता विवरण पत्रिका (Print / PDF Statement)
// =============================================================================

function vivaranPatrikaDownload() {
  sandeshDikhayein('विवरण पत्रिका तैयार की जा रही है...');

  const d = new Date();
  const vartamanTarikh = ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear();

  let grandNiyat = 0, grandPrapt = 0;
  let nakadPrapt = 0, onlinePrapt = 0, raseedPrapt = 0;

  function renderCategoryRows(list, catTitle, badgeBg, badgeColor) {
    if (!list || list.length === 0) return '';
    let catNiyat = 0, catPrapt = 0;
    let rowsHtml = '';

    list.forEach(function(item, idx) {
      catNiyat += (item.niyatRakam || 0);
      catPrapt += (item.praptRakam || 0);
      grandNiyat += (item.niyatRakam || 0);
      grandPrapt += (item.praptRakam || 0);

      if (item.prakar === 'मासिक') {
        (item.mahine || []).forEach(function(m) {
          if (m.medium === 'ऑनलाइन') onlinePrapt += (m.amount || 0);
          else nakadPrapt += (m.amount || 0);
        });
      } else {
        (item.bhugtanList || []).forEach(function(k) {
          const rVal = parseInt(k.rakam, 10) || 0;
          if (k.madhyam === 'ऑनलाइन') onlinePrapt += rVal;
          else if (k.madhyam === 'रसीद') raseedPrapt += rVal;
          else nakadPrapt += rVal;
        });
      }

      const bakayaItem = Math.max(0, item.niyatRakam - item.praptRakam);
      const rowBg = (idx % 2 === 0) ? '#ffffff' : '#fcfdfd';

      rowsHtml += `
        <tr>
          <td bgcolor="${rowBg}" style="border:1px solid #e2e8f0; padding:7px 10px; font-size:11.5px; color:#1e293b; font-weight:bold;">${item.kramank}</td>
          <td bgcolor="${rowBg}" style="border:1px solid #e2e8f0; padding:7px 10px; font-size:11.5px; color:#0f172a;">
            <strong>${item.naam}</strong><br>
            <span style="font-size:10px; color:#64748b;">पिता: ${item.pitaNaam || '-'}</span>
          </td>
          <td bgcolor="${rowBg}" style="border:1px solid #e2e8f0; padding:7px 10px; font-size:11.5px; color:#334155; text-align:right;">₹${item.niyatRakam.toLocaleString('hi-IN')}</td>
          <td bgcolor="${rowBg}" style="border:1px solid #e2e8f0; padding:7px 10px; font-size:11.5px; color:#047857; font-weight:bold; text-align:right;">₹${item.praptRakam.toLocaleString('hi-IN')}</td>
          <td bgcolor="${rowBg}" style="border:1px solid #e2e8f0; padding:7px 10px; font-size:11.5px; color:${bakayaItem > 0 ? '#dc2626' : '#64748b'}; font-weight:bold; text-align:right;">₹${bakayaItem.toLocaleString('hi-IN')}</td>
        </tr>`;
    });

    const catBakaya = Math.max(0, catNiyat - catPrapt);

    return `
      <div style="margin-bottom:18px; page-break-inside:avoid;">
        <div style="background:${badgeBg}; color:${badgeColor}; padding:6px 12px; font-size:12px; font-weight:bold; border:1px solid #cbd5e1; border-bottom:none; display:flex; justify-content:space-between;">
          <span>${catTitle} (कुल सदस्य: ${list.length})</span>
          <span>नियत: ₹${catNiyat.toLocaleString('hi-IN')} | प्राप्त: ₹${catPrapt.toLocaleString('hi-IN')} | बकाया: ₹${catBakaya.toLocaleString('hi-IN')}</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1;">
          <thead>
            <tr bgcolor="#f8fafc">
              <th width="15%" style="border:1px solid #cbd5e1; padding:6px 10px; text-align:left; font-size:11px; color:#475569;">क्रमांक</th>
              <th width="35%" style="border:1px solid #cbd5e1; padding:6px 10px; text-align:left; font-size:11px; color:#475569;">दानदाता नाम</th>
              <th width="16%" style="border:1px solid #cbd5e1; padding:6px 10px; text-align:right; font-size:11px; color:#475569;">नियत राशि</th>
              <th width="17%" style="border:1px solid #cbd5e1; padding:6px 10px; text-align:right; font-size:11px; color:#475569;">प्राप्त राशि</th>
              <th width="17%" style="border:1px solid #cbd5e1; padding:6px 10px; text-align:right; font-size:11px; color:#475569;">बकाया राशि</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>`;
  }

  const masikHtml = renderCategoryRows(koshAakde.masik, 'मासिक दानदाता सूची', '#ecfdf5', '#065f46');
  const varshikHtml = renderCategoryRows(koshAakde.varshik, 'वार्षिक दानदाता सूची', '#eff6ff', '#1e40af');
  const naveenHtml = renderCategoryRows(koshAakde.naveen, 'नवीन दानदाता सूची', '#fef3c7', '#92400e');

  const grandBakaya = Math.max(0, grandNiyat - grandPrapt);

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="utf-8">
      <title>श्री शीतला धाम मंदिर — दानदाता विवरण पत्रिका</title>
      <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        body { font-family: 'Mukta', sans-serif; color: #0f172a; margin: 0; padding: 15px; }
        .top-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
        .temple-name { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .report-title { font-size: 14px; color: #475569; font-weight: 700; }
        .no-print-bar { background: #0f172a; color:#fff; padding:10px; text-align:center; margin-bottom:15px; border-radius:8px; }
        .no-print-bar button { background:#10b981; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px; margin-left:10px; }
        @media print { .no-print-bar { display:none !important; } }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <span>यह प्रिंट पूर्वावलोकन (Print Preview) है। PDF में सहेजने के लिए प्रिंट बटन पर क्लिक करें:</span>
        <button onclick="window.print()">प्रिंट करें / PDF में सहेजें</button>
      </div>

      <div class="top-box">
        <div class="temple-name">श्री शीतला धाम मंदिर</div>
        <div class="report-title">दानदाता विवरण पत्रिका (लेखा-जोखा) — दिनांक: ${vartamanTarikh}</div>
      </div>

      ${masikHtml}
      ${varshikHtml}
      ${naveenHtml}

      <div style="margin-top:22px; border:1px solid #cbd5e1; page-break-inside:avoid;">
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <th colspan="3" bgcolor="#0f172a" style="padding:9px 12px; text-align:left; font-size:12.5px; font-weight:bold; color:#ffffff;">
              दानदाता विवरण सारांश (GRAND SUMMARY)
            </th>
          </tr>
          <tr>
            <td width="34%" bgcolor="#ecfdf5" style="border:1px solid #cbd5e1; padding:10px 12px; font-weight:bold; color:#065f46; font-size:12.5px;">कुल प्राप्त धनराशि: ₹${grandPrapt.toLocaleString('hi-IN')}</td>
            <td width="33%" bgcolor="#eff6ff" style="border:1px solid #cbd5e1; padding:10px 12px; font-weight:bold; color:#1e40af; font-size:12.5px;">कुल नियत धनराशि: ₹${grandNiyat.toLocaleString('hi-IN')}</td>
            <td width="33%" bgcolor="#fef2f2" style="border:1px solid #cbd5e1; padding:10px 12px; font-weight:bold; color:#b91c1c; font-size:12.5px;">कुल बकाया धनराशि: ₹${grandBakaya.toLocaleString('hi-IN')}</td>
          </tr>
          <tr>
            <td bgcolor="#f8fafc" style="border:1px solid #cbd5e1; padding:10px 12px; font-size:12px; color:#475569;">नकद प्राप्त: <strong>₹${nakadPrapt.toLocaleString('hi-IN')}</strong></td>
            <td bgcolor="#f8fafc" style="border:1px solid #cbd5e1; padding:10px 12px; font-size:12px; color:#475569;">ऑनलाइन प्राप्त: <strong>₹${onlinePrapt.toLocaleString('hi-IN')}</strong></td>
            <td bgcolor="#f8fafc" style="border:1px solid #cbd5e1; padding:10px 12px; font-size:12px; color:#475569;">रसीद द्वारा प्राप्त: <strong>₹${raseedPrapt.toLocaleString('hi-IN')}</strong></td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  // प्रिंट विंडो खोलें
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(reportHtml);
    printWin.document.close();
  } else {
    // यदि पॉपअप ब्लॉक हो, तो उसी पेज में डाउनलोड या प्रिंट विकल्प दें
    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `श्री_शीतला_धाम_दानदाता_विवरण_${vartamanTarikh}.html`;
    a.click();
    sandeshDikhayein('विवरण पत्रिका HTML फ़ाइल के रूप में डाउनलोड हो गई!');
  }
}

// =============================================================================
// 13. हिंग्लिश से हिंदी ऑटो ट्रांसलिट्रेशन (Google Input Tools API)
// =============================================================================

function transliterateWord(word, callback) {
  if (!word || !word.trim()) { callback(word); return; }
  const cbName = 'google_cb_' + Math.floor(Math.random() * 10000000);
  window[cbName] = function(res) {
    try {
      if (res && res[0] === 'SUCCESS' && res[1] && res[1][0] && res[1][0][1] && res[1][0][1][0]) {
        callback(res[1][0][1][0]);
      } else { callback(word); }
    } catch(e) { callback(word); }
    delete window[cbName];
    if (script.parentNode) script.parentNode.removeChild(script);
  };

  const script = document.createElement('script');
  script.src = 'https://inputtools.google.com/request?text=' + encodeURIComponent(word.trim()) + '&itc=hi-t-i0-und&num=1&cp=0&cs=1&cb=' + cbName;
  script.onerror = function() {
    callback(word);
    delete window[cbName];
    if (script.parentNode) script.parentNode.removeChild(script);
  };
  document.body.appendChild(script);
}

function setupHinglishAutoHindi(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let isConverting = false;

  function checkAndTransliterate() {
    if (isConverting) return;
    const cursorPos = el.selectionStart;
    const textBeforeCursor = el.value.substring(0, cursorPos);
    const textAfterCursor = el.value.substring(cursorPos);

    const match = textBeforeCursor.match(/([a-zA-Z]+)(\s+)$/);
    if (match) {
      const word = match[1];
      const spaces = match[2];
      isConverting = true;

      transliterateWord(word, function(converted) {
        const prefix = textBeforeCursor.substring(0, textBeforeCursor.length - (word.length + spaces.length));
        const newTextBefore = prefix + converted + spaces;
        el.value = newTextBefore + textAfterCursor;

        const newPos = newTextBefore.length;
        el.setSelectionRange(newPos, newPos);
        isConverting = false;

        if (elementId === 'khojShabd') chhantaiLagayein();
        if (elementId === 'paySectionSearchInput') renderPaySectionDonorList();
      });
    }
  }

  el.addEventListener('input', checkAndTransliterate);
  el.addEventListener('keyup', function(e) {
    if (e.key === ' ' || e.keyCode === 32) checkAndTransliterate();
  });
}

// =============================================================================
// 14. संवाद, पॉपअप एवं सेटिंग्स हैंडलर (Modals & Dialogs)
// =============================================================================

function handleBackdropClick(e, overlayId) {
  if (e.target && e.target.id === overlayId) {
    document.getElementById(overlayId).style.display = 'none';
  }
}

function pushtiPardaKholein(sandeshHtml, karyakram) {
  document.getElementById('pushtiSandesh').innerHTML = sandeshHtml;
  const button = document.getElementById('pushtiAageBado');
  button.onclick = function() {
    pushtiBandKarein();
    if (karyakram) karyakram();
  };
  document.getElementById('pushtiParda').style.display = 'flex';
}

function pushtiBandKarein() {
  document.getElementById('pushtiParda').style.display = 'none';
}

function sandeshDikhayein(sandesh) {
  const patti = document.getElementById('suchnaPatti');
  if (!patti) return;
  patti.innerText = sandesh;
  patti.style.display = 'block';
  setTimeout(() => { patti.style.display = 'none'; }, 3200);
}

function openSettingsModal() {
  document.getElementById('settingsWorkerUrl').value = CONFIG.getWorkerUrl();
  document.getElementById('settingsUserName').value = CONFIG.getUserName();
  document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
  const url = document.getElementById('settingsWorkerUrl').value.trim();
  const name = document.getElementById('settingsUserName').value.trim();

  if (!url) {
    sandeshDikhayein('कृपया Cloudflare Worker URL दर्ज करें!');
    return;
  }

  CONFIG.setWorkerUrl(url);
  CONFIG.setUserName(name || 'व्यवस्थापक');

  closeSettingsModal();
  sandeshDikhayein('सेटिंग्स सुरक्षित हो गईं। डेटा लोड हो रहा है...');
  aakdeMangwayein();
}

// =============================================================================
// 15. स्केलेटन लोडिंग एनीमेशन (Skeleton Shimmer Loaders)
// =============================================================================

function dikhayeinListSkeleton(koshId, sankhya) {
  const kosh = document.getElementById(koshId);
  if (!kosh) return;
  let html = '';
  for (let i = 0; i < (sankhya || 4); i++) {
    html += `
      <div class="pravishti-patra" style="border-left-color: #cbd5e1; padding: 12px 14px;">
        <div class="pravishti-matha">
          <span class="skeleton-box" style="width: 120px; height: 18px;"></span>
          <span class="skeleton-box" style="width: 70px; height: 16px;"></span>
        </div>
        <div style="margin: 6px 0;">
          <span class="skeleton-box" style="width: 60%; height: 13px;"></span>
        </div>
        <span class="skeleton-box" style="width: 100px; height: 10px;"></span>
      </div>`;
  }
  kosh.innerHTML = html;
}

function dikhayeinDashboardSkeleton() {
  document.getElementById('masikPraptDisplay').innerHTML = '<span class="skeleton-box" style="width: 75px; height: 24px;"></span>';
  document.getElementById('varshikPraptDisplay').innerHTML = '<span class="skeleton-box" style="width: 75px; height: 24px;"></span>';
  document.getElementById('naveenPraptDisplay').innerHTML = '<span class="skeleton-box" style="width: 75px; height: 24px;"></span>';
  document.getElementById('grandPraptDisplay').innerHTML = '<span class="skeleton-box" style="width: 130px; height: 30px;"></span>';
}

// =============================================================================
// 16. इनिशियलाइजेशन (Page Initialization)
// =============================================================================

window.onload = function() {
  setupHinglishAutoHindi('prapatraNaam');
  setupHinglishAutoHindi('prapatraPitaNaam');
  setupHinglishAutoHindi('prapatraVivaran');
  setupHinglishAutoHindi('khojShabd');
  setupHinglishAutoHindi('paySectionSearchInput');

  const aj = new Date();
  const ajStr = aj.getFullYear() + '-' + ('0' + (aj.getMonth() + 1)).slice(-2) + '-' + ('0' + aj.getDate()).slice(-2);
  const payDateInput = document.getElementById('payGenTarikh');
  if (payDateInput) payDateInput.value = ajStr;

  dikhayeinDashboardSkeleton();
  dikhayeinListSkeleton('pravishtiSuchiPatt', 5);
  dikhayeinListSkeleton('paySectionDonorListPatt', 5);
  dikhayeinListSkeleton('hatayiSuchiPatt', 4);

  // यदि वर्कर URL पहले से सेट नहीं है, तो सेटिंग्स मोडल खोलें
  if (!CONFIG.getWorkerUrl()) {
    updateServerStatus(false, 'सेटअप आवश्यक');
    setTimeout(openSettingsModal, 400);
  } else {
    aakdeMangwayein();
  }
};
