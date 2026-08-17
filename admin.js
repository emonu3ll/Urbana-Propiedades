import { db, storage, auth, collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, setDoc, ref, uploadBytes, getDownloadURL, deleteObject, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

/* =========================================
   LOGIN
   ========================================= */
async function login() {
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error(error);
        showToast('Usuario o contraseña incorrectos', 'error');
    }
}

async function logout() {
    try {
        await signOut(auth);
        location.reload();
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

function confirmLogout() {
    if (hasUnsavedChanges()) {
        openConfirmModal(
            'Tenés datos sin guardar en el borrador. Si cerrás sesión ahora, vas a perderlos. ¿Qué querés hacer?',
            () => { clearDraft(); logout(); }
        );
    } else {
        logout();
    }
}

function showAdminPanel() {
    document.getElementById('loginScreen').classList.add('av2-hidden');
    document.getElementById('adminApp').classList.remove('av2-hidden');
    const user = auth.currentUser;
    document.getElementById('topbarUser').textContent = user ? user.email : '';
    initSidebarNav();
    loadProperties();
    loadFaqs();
    loadContenido();
    loadFooterContacto();
    loadHero();
    checkForDraft();
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('av2-hidden');
    document.getElementById('adminApp').classList.add('av2-hidden');
}

onAuthStateChanged(auth, (user) => {
    if (user) showAdminPanel(); else showLoginScreen();
});

/* =========================================
   NAVEGACIÓN LATERAL
   ========================================= */
const SECTION_TITLES = {
    propiedades: 'Propiedades',
    faq: 'Preguntas frecuentes',
    nosotros: 'Sobre nosotros',
    contacto: 'Contacto y redes',
    portada: 'Portada'
};

let sidebarWired = false;
function initSidebarNav() {
    if (sidebarWired) return;
    sidebarWired = true;
    document.querySelectorAll('.av2-nav-item[data-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-section');
            document.querySelectorAll('.av2-nav-item[data-section]').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.av2-section').forEach(s => s.classList.toggle('av2-hidden', s.id !== 'section-' + key));
            document.getElementById('topbarTitle').textContent = SECTION_TITLES[key] || '';
            document.getElementById('sidebar').classList.remove('open');
        });
    });
    document.getElementById('navToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

/* =========================================
   HELPERS COMPARTIDOS
   ========================================= */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastStack');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `av2-toast ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function formatNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value) value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = value;
    updatePricePreview();
}
function formatNumberString(numStr) {
    if (!numStr) return '';
    return numStr.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function unformatNumber(value) { return value.replace(/\./g, ''); }

function formatOwnerPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.startsWith('0')) value = value.substring(1);
    value = value.substring(0, 9);
    let formatted = '';
    if (value.length > 0) formatted = '+595 ' + value.substring(0, 3);
    if (value.length > 3) formatted += ' ' + value.substring(3, 6);
    if (value.length > 6) formatted += ' ' + value.substring(6, 9);
    input.value = formatted;
}

function togglePriceFields() {
    const category = document.getElementById('prop-category').value;
    document.getElementById('price-venta-fields').classList.toggle('av2-hidden', category === 'alquileres');
    document.getElementById('price-alquiler-fields').classList.toggle('av2-hidden', category !== 'alquileres');
    updatePricePreview();
}
function updatePricePreview() {
    const category = document.getElementById('prop-category').value;
    const preview = document.getElementById('price-preview');
    if (!preview) return;
    if (category === 'alquileres') {
        const alquiler = document.getElementById('prop-price-alquiler').value;
        preview.textContent = alquiler ? `₲ ${alquiler} / mes` : 'Completá el precio mensual';
        preview.style.color = alquiler ? '#4CAF50' : '#999';
    } else {
        const usd = document.getElementById('prop-price-usd').value;
        const gs = document.getElementById('prop-price-gs').value;
        let parts = [];
        if (usd) parts.push(`USD ${usd}`);
        if (gs) parts.push(`₲ ${gs}`);
        preview.textContent = parts.length ? parts.join(' / ') : 'Completá al menos un precio';
        preview.style.color = parts.length ? '#4CAF50' : '#999';
    }
}

function convertMapUrl(url) {
    const iframeMatch = url.match(/src=["'](.*?)["']/);
    if (iframeMatch) return iframeMatch[1];
    if (url.includes('/embed')) return url;
    if (url.includes('maps.app.goo.gl')) {
        alert('⚠️ Los enlaces cortos no se pueden mostrar en la página. Se usará el mapa de Curuguaty por defecto.');
        return 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14480.78840488428!2d-55.7308!3d-24.0694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94544a5c5e5e5e5f%3A0x0!2sCuruguaty!5e0!3m2!1ses!2spy!4v1234567890';
    }
    return url;
}

function comprimirImagen(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxAncho = 1600;
                let ancho = img.width, alto = img.height;
                if (ancho > maxAncho) { alto = Math.round((alto * maxAncho) / ancho); ancho = maxAncho; }
                const canvas = document.createElement('canvas');
                canvas.width = ancho; canvas.height = alto;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, ancho, alto);
                canvas.toBlob((blob) => {
                    const archivoComprimido = new File([blob], file.name, { type: 'image/jpeg' });
                    resolve({ file: archivoComprimido, base64: canvas.toDataURL('image/jpeg', 0.8) });
                }, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/* =========================================
   PROPIEDADES
   ========================================= */
let uploadedImages = [];
let allProperties = [];

const dropZoneEl = document.getElementById('dropZone');
if (dropZoneEl) {
    dropZoneEl.addEventListener('dragover', (e) => { e.preventDefault(); dropZoneEl.classList.add('dragover'); });
    dropZoneEl.addEventListener('dragleave', () => dropZoneEl.classList.remove('dragover'));
    dropZoneEl.addEventListener('drop', (e) => { e.preventDefault(); dropZoneEl.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
}

async function handleFiles(files) {
    const imagenes = Array.from(files).filter(f => f.type.startsWith('image/'));
    for (const file of imagenes) {
        const comprimida = await comprimirImagen(file);
        uploadedImages.push(comprimida);
        displayImages();
    }
}
function displayImages() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    preview.innerHTML = uploadedImages.map((img, i) => `
        <div class="av2-photo-thumb">
            <img src="${img.base64}" alt="Imagen ${i + 1}">
            <button class="av2-photo-remove" onclick="removeImage(${i})">×</button>
        </div>`).join('');
}
function removeImage(i) { uploadedImages.splice(i, 1); displayImages(); }

async function loadProperties() {
    try {
        const querySnapshot = await getDocs(collection(db, "propiedades"));
        allProperties = [];
        querySnapshot.forEach(d => allProperties.push({ id: d.id, ...d.data() }));
        renderPropertiesTable();
    } catch (error) {
        console.error(error);
    }
}

function renderPropertiesTable() {
    const tbody = document.getElementById('propertiesTableBody');
    if (!tbody) return;
    const term = (document.getElementById('propertySearch')?.value || '').toLowerCase();
    const list = allProperties.filter(p => (p.title || '').toLowerCase().includes(term));

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="av2-empty">No hay propiedades que coincidan.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(p => `
        <tr>
            <td>
                <div class="av2-row-name">
                    <div class="av2-row-thumb"><img src="${p.image || ''}" alt=""></div>
                    <span>${p.title || '(Sin título)'}</span>
                </div>
            </td>
            <td>${(p.category || '').toUpperCase()}</td>
            <td>${p.price || '—'}</td>
            <td>
                <select class="av2-status-select" onchange="updatePropertyStatus('${p.id}', this.value)">
                    <option value="disponible" ${(p.status || 'disponible') === 'disponible' ? 'selected' : ''}>🟢 Disponible</option>
                    <option value="reservado" ${p.status === 'reservado' ? 'selected' : ''}>🟡 Reservado</option>
                    <option value="vendido" ${p.status === 'vendido' ? 'selected' : ''}>🔴 Vendido</option>
                </select>
            </td>
            <td>
                <div class="av2-row-actions">
                    <button class="av2-icon-btn" title="Editar" onclick="openPropertyDrawer('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="av2-icon-btn danger" title="Eliminar" onclick="deleteProperty('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

async function updatePropertyStatus(id, newStatus) {
    try {
        await updateDoc(doc(db, "propiedades", id), { status: newStatus });
        showToast('Estado actualizado');
        loadProperties();
    } catch (error) {
        showToast('Error al actualizar: ' + error.message, 'error');
    }
}

let editingPropertyId = null;

function openPropertyDrawer(id) {
    editingPropertyId = id;
    document.getElementById('propertyDrawerTitle').textContent = id ? 'Editar propiedad' : 'Nueva propiedad';

    if (id) {
        const p = allProperties.find(x => x.id === id);
        if (!p) return;
        document.getElementById('prop-title').value = p.title || '';
        document.getElementById('prop-category').value = p.category || 'casas';
        document.getElementById('prop-description').value = p.description || '';
        document.getElementById('prop-features').value = Array.isArray(p.features) ? p.features.join(', ') : (p.features || '');
        document.getElementById('prop-map').value = p.map || '';
        document.getElementById('prop-badge').value = p.badge || '';
        document.getElementById('prop-youtube').value = p.youtube || '';
        document.getElementById('prop-matterport').value = p.matterport || '';
        document.getElementById('prop-address').value = p.address || '';
        document.getElementById('prop-status').value = p.status || 'disponible';
        document.getElementById('prop-dormitorios').value = p.dormitorios != null ? p.dormitorios : '';
        document.getElementById('prop-superficie').value = '';
        document.getElementById('prop-owner-name').value = p.ownerName || '';
        document.getElementById('prop-owner-phone').value = p.ownerPhone || '';

        document.getElementById('prop-price-usd').value = '';
        document.getElementById('prop-price-gs').value = '';
        document.getElementById('prop-price-alquiler').value = '';
        const priceText = p.price || '';
        if (p.category === 'alquileres') {
            const match = priceText.match(/₲\s*([\d.]+)/);
            if (match) document.getElementById('prop-price-alquiler').value = match[1];
        } else {
            const usdMatch = priceText.match(/USD\s*([\d.]+)/);
            const gsMatch = priceText.match(/₲\s*([\d.]+)/);
            if (usdMatch) document.getElementById('prop-price-usd').value = usdMatch[1];
            if (gsMatch && !priceText.includes('/ mes')) document.getElementById('prop-price-gs').value = gsMatch[1];
        }

        uploadedImages = [];
        (p.images && p.images.length ? p.images : [p.image]).filter(Boolean).forEach(url => {
            uploadedImages.push({ file: null, base64: url, isExisting: true, existingUrl: url });
        });
        document.getElementById('edit-property-id').value = id;
    } else {
        document.getElementById('prop-title').value = '';
        document.getElementById('prop-category').value = 'casas';
        document.getElementById('prop-description').value = '';
        document.getElementById('prop-features').value = '';
        document.getElementById('prop-map').value = '';
        document.getElementById('prop-badge').value = '';
        document.getElementById('prop-youtube').value = '';
        document.getElementById('prop-matterport').value = '';
        document.getElementById('prop-address').value = '';
        document.getElementById('prop-status').value = 'disponible';
        document.getElementById('prop-dormitorios').value = '';
        document.getElementById('prop-superficie').value = '';
        document.getElementById('prop-owner-name').value = '';
        document.getElementById('prop-owner-phone').value = '';
        document.getElementById('prop-price-usd').value = '';
        document.getElementById('prop-price-gs').value = '';
        document.getElementById('prop-price-alquiler').value = '';
        uploadedImages = [];
        document.getElementById('edit-property-id').value = '';
    }
    displayImages();
    togglePriceFields();
    document.getElementById('propertyDrawerOverlay').classList.add('open');
}

function closePropertyDrawer() {
    document.getElementById('propertyDrawerOverlay').classList.remove('open');
}

async function saveProperty() {
    const btn = document.getElementById('property-save-btn');
    const originalText = btn.innerHTML;
    const badge = document.getElementById('prop-badge').value;
    const youtubeUrl = document.getElementById('prop-youtube').value.trim();
    const matterportUrl = document.getElementById('prop-matterport').value.trim();
    const address = document.getElementById('prop-address').value.trim();
    const status = document.getElementById('prop-status').value;
    const dormitorios = document.getElementById('prop-dormitorios').value;
    const superficie = document.getElementById('prop-superficie').value.trim();
    const ownerName = document.getElementById('prop-owner-name').value.trim();
    const ownerPhone = document.getElementById('prop-owner-phone').value.trim();

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    btn.disabled = true;

    try {
        const editId = document.getElementById('edit-property-id').value;
        const title = document.getElementById('prop-title').value.trim();
        const category = document.getElementById('prop-category').value;
        const description = document.getElementById('prop-description').value.trim();
        const featuresText = document.getElementById('prop-features').value.trim();

        let mapUrl = document.getElementById('prop-map').value.trim();
        if (mapUrl) mapUrl = convertMapUrl(mapUrl);

        let price = '', priceUSD = null, priceGS = null;
        if (category === 'alquileres') {
            const alquilerRaw = unformatNumber(document.getElementById('prop-price-alquiler').value);
            if (alquilerRaw) { price = `₲ ${formatNumberString(alquilerRaw)} / mes`; priceGS = parseInt(alquilerRaw) || null; }
        } else {
            const usdRaw = unformatNumber(document.getElementById('prop-price-usd').value);
            const gsRaw = unformatNumber(document.getElementById('prop-price-gs').value);
            let parts = [];
            if (usdRaw) { parts.push(`USD ${formatNumberString(usdRaw)}`); priceUSD = parseInt(usdRaw) || null; }
            if (gsRaw) { parts.push(`₲ ${formatNumberString(gsRaw)}`); priceGS = parseInt(gsRaw) || null; }
            price = parts.join(' / ');
        }

        if (!title || !price || uploadedImages.length === 0) {
            showToast('Completá al menos: título, precio y una imagen', 'error');
            btn.innerHTML = originalText; btn.disabled = false; return;
        }

        const features = featuresText ? featuresText.split(',').map(f => f.trim()).filter(Boolean) : [];
        if (superficie) features.unshift(`${superficie} m²`);

        const imageUrls = [];
        for (const img of uploadedImages) {
            if (img.file) {
                const storageRef = ref(storage, `propiedades/${Date.now()}_${img.file.name}`);
                const snapshot = await uploadBytes(storageRef, img.file);
                imageUrls.push(await getDownloadURL(snapshot.ref));
            } else if (img.existingUrl) {
                imageUrls.push(img.existingUrl);
            }
        }

        const propertyData = {
            title, price, category, description, features,
            badge: badge || null,
            youtube: youtubeUrl || null,
            matterport: matterportUrl || null,
            image: imageUrls[0],
            images: imageUrls,
            map: mapUrl || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14480.78840488428!2d-55.7308!3d-24.0694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94544a5c5e5e5e5f%3A0x0!2sCuruguaty!5e0!3m2!1ses!2spy!4v1234567890',
            address: address || null,
            status: status || 'disponible',
            dormitorios: dormitorios !== '' ? parseInt(dormitorios) : null,
            priceUSD, priceGS,
            ownerName: ownerName || null,
            ownerPhone: ownerPhone || null,
            date: new Date().toISOString()
        };

        if (editId) {
            await updateDoc(doc(db, "propiedades", editId), propertyData);
        } else {
            await addDoc(collection(db, "propiedades"), propertyData);
        }

        clearDraft();
        showToast(editId ? 'Propiedad actualizada' : 'Propiedad guardada en la nube');
        closePropertyDrawer();
        loadProperties();
    } catch (error) {
        console.error(error);
        showToast('Error al guardar: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteProperty(id) {
    openConfirmModal(
        '¿Estás seguro de eliminar esta propiedad de la nube? Esta acción no se puede deshacer.',
        async () => {
            try {
                const property = allProperties.find(p => p.id === id);
                if (property?.images?.length) {
                    for (const imageUrl of property.images) {
                        try { await deleteObject(ref(storage, imageUrl)); } catch (e) {}
                    }
                }
                await deleteDoc(doc(db, "propiedades", id));
                showToast('Propiedad eliminada');
                loadProperties();
            } catch (error) {
                showToast('Error al eliminar: ' + error.message, 'error');
            }
        },
        'Sí, eliminar'
    );
}

async function exportForMyMaps() {
    try {
        const activeProperties = allProperties.filter(p => (p.status || 'disponible') !== 'vendido');
        if (!activeProperties.length) { showToast('No hay propiedades activas para exportar', 'error'); return; }
        let csv = 'Nombre,Direccion,Precio,Categoria,Estado\n';
        activeProperties.forEach(p => {
            csv += `"${(p.title || '').replace(/"/g, '""')}","${(p.address || 'Curuguaty, Canindeyú, Paraguay').replace(/"/g, '""')}","${(p.price || '').replace(/"/g, '""')}","${p.category || ''}","${p.status || 'disponible'}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `urbana-propiedades-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('CSV descargado');
    } catch (error) {
        showToast('Error al exportar: ' + error.message, 'error');
    }
}

document.getElementById('propertySearch')?.addEventListener('input', renderPropertiesTable);

/* =========================================
   BORRADOR
   ========================================= */
const DRAFT_KEY = 'urbana_property_draft_v2';
const draftFields = ['prop-title', 'prop-badge', 'prop-youtube', 'prop-matterport', 'prop-price-usd', 'prop-price-gs', 'prop-price-alquiler', 'prop-category', 'prop-description', 'prop-features', 'prop-map'];
let draftGuardadoAPropósito = false;

function saveDraft() {
    const draft = {};
    draftFields.forEach(id => { const el = document.getElementById(id); if (el) draft[id] = el.value; });
    if (Object.values(draft).some(v => v && v.trim() !== '')) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}
function saveDraftManual() {
    const title = document.getElementById('prop-title').value.trim();
    if (!title && !document.getElementById('prop-description').value.trim()) {
        showToast('Completá al menos el título para guardar un borrador', 'error');
        return;
    }
    saveDraft();
    draftGuardadoAPropósito = true;
    showToast('Borrador guardado. Podés cerrar el panel tranquilo.');
}
function loadDraftIntoForm(draft) {
    draftFields.forEach(id => { const el = document.getElementById(id); if (el && draft[id]) el.value = draft[id]; });
    togglePriceFields();
}
function clearDraft() { localStorage.removeItem(DRAFT_KEY); }
function hasUnsavedChanges() {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return false;
    try { return Object.values(JSON.parse(saved)).some(v => v && v.trim() !== ''); } catch (e) { return false; }
}
function checkForDraft() {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
        const draft = JSON.parse(saved);
        if (!Object.values(draft).some(v => v && v.trim() !== '')) { clearDraft(); return; }
        openPropertyDrawer(null);
        loadDraftIntoForm(draft);
        draftGuardadoAPropósito = true;
        setTimeout(() => {
            openConfirmModal(
                '📝 Tenés un borrador guardado de la última vez. Ya lo cargamos en el formulario para que sigas donde lo dejaste.',
                () => { /* seguir editando, no hace nada */ },
                'Entendido'
            );
        }, 300);
    } catch (e) { clearDraft(); }
}
document.addEventListener('input', (e) => {
    if (draftFields.includes(e.target.id)) { saveDraft(); draftGuardadoAPropósito = false; }
});

/* =========================================
   PREGUNTAS FRECUENTES
   ========================================= */
let allFaqs = [];
async function loadFaqs() {
    try {
        const querySnapshot = await getDocs(collection(db, "preguntas"));
        allFaqs = [];
        querySnapshot.forEach(d => allFaqs.push({ id: d.id, ...d.data() }));
        renderFaqList();
    } catch (error) { console.error(error); }
}
function renderFaqList() {
    const container = document.getElementById('faqList');
    if (!container) return;
    if (!allFaqs.length) { container.innerHTML = `<div class="av2-empty">No hay preguntas cargadas todavía</div>`; return; }
    container.innerHTML = allFaqs.map(f => `
        <div class="av2-list-card">
            <div class="av2-list-card-body"><h4>${f.question}</h4><p>${f.answer}</p></div>
            <div class="av2-row-actions">
                <button class="av2-icon-btn" onclick="openFaqDrawer('${f.id}')"><i class="fas fa-edit"></i></button>
                <button class="av2-icon-btn danger" onclick="deleteFaq('${f.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
}
let editingFaqId = null;
function openFaqDrawer(id) {
    editingFaqId = id;
    document.getElementById('faqDrawerTitle').textContent = id ? 'Editar pregunta' : 'Nueva pregunta';
    if (id) {
        const f = allFaqs.find(x => x.id === id);
        document.getElementById('faq-question-input').value = f?.question || '';
        document.getElementById('faq-answer-input').value = f?.answer || '';
        document.getElementById('edit-faq-id').value = id;
    } else {
        document.getElementById('faq-question-input').value = '';
        document.getElementById('faq-answer-input').value = '';
        document.getElementById('edit-faq-id').value = '';
    }
    document.getElementById('faqDrawerOverlay').classList.add('open');
}
function closeFaqDrawer() { document.getElementById('faqDrawerOverlay').classList.remove('open'); }
async function saveFaq() {
    const question = document.getElementById('faq-question-input').value.trim();
    const answer = document.getElementById('faq-answer-input').value.trim();
    const editId = document.getElementById('edit-faq-id').value;
    if (!question || !answer) { showToast('Completá la pregunta y la respuesta', 'error'); return; }
    try {
        if (editId) await updateDoc(doc(db, "preguntas", editId), { question, answer });
        else await addDoc(collection(db, "preguntas"), { question, answer, date: new Date().toISOString() });
        showToast(editId ? 'Pregunta actualizada' : 'Pregunta agregada');
        closeFaqDrawer();
        loadFaqs();
    } catch (error) { showToast('Error al guardar: ' + error.message, 'error'); }
}
async function deleteFaq(id) {
    openConfirmModal('¿Eliminar esta pregunta frecuente?', async () => {
        try { await deleteDoc(doc(db, "preguntas", id)); showToast('Pregunta eliminada'); loadFaqs(); }
        catch (error) { showToast('Error al eliminar: ' + error.message, 'error'); }
    }, 'Sí, eliminar');
}

/* =========================================
   SOBRE NOSOTROS
   ========================================= */
let contentImageFile = null;
async function loadContenido() {
    try {
        const docSnap = await getDoc(doc(db, 'contenido', 'sobre-nosotros'));
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        document.getElementById('content-subtitle').value = data.subtitle || '';
        document.getElementById('content-title').value = data.title || '';
        document.getElementById('content-text').value = data.text || '';
        document.getElementById('content-feature1-title').value = data.feature1Title || '';
        document.getElementById('content-feature1-text').value = data.feature1Text || '';
        document.getElementById('content-feature2-title').value = data.feature2Title || '';
        document.getElementById('content-feature2-text').value = data.feature2Text || '';
        document.getElementById('content-feature3-title').value = data.feature3Title || '';
        document.getElementById('content-feature3-text').value = data.feature3Text || '';
        document.getElementById('content-footer-text').value = data.footerText || '';
        if (data.image) {
            const preview = document.getElementById('content-image-preview');
            preview.src = data.image; preview.style.display = 'block';
        }
    } catch (error) { console.error(error); }
}
async function saveContenido() {
    const btn = document.getElementById('content-save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; btn.disabled = true;
    try {
        const preview = document.getElementById('content-image-preview');
        let imageUrl = (preview.style.display === 'block' && preview.src.startsWith('http')) ? preview.src : null;
        if (contentImageFile) {
            try {
                const prev = await getDoc(doc(db, 'contenido', 'sobre-nosotros'));
                if (prev.exists() && prev.data().image) await deleteObject(ref(storage, prev.data().image));
            } catch (e) {}
            const storageRef = ref(storage, `contenido/sobre-nosotros_${Date.now()}.jpg`);
            await uploadBytes(storageRef, contentImageFile);
            imageUrl = await getDownloadURL(storageRef);
        }
        await setDoc(doc(db, 'contenido', 'sobre-nosotros'), {
            subtitle: document.getElementById('content-subtitle').value.trim(),
            title: document.getElementById('content-title').value.trim(),
            text: document.getElementById('content-text').value.trim(),
            feature1Title: document.getElementById('content-feature1-title').value.trim(),
            feature1Text: document.getElementById('content-feature1-text').value.trim(),
            feature2Title: document.getElementById('content-feature2-title').value.trim(),
            feature2Text: document.getElementById('content-feature2-text').value.trim(),
            feature3Title: document.getElementById('content-feature3-title').value.trim(),
            feature3Text: document.getElementById('content-feature3-text').value.trim(),
            footerText: document.getElementById('content-footer-text').value.trim(),
            image: imageUrl
        });
        contentImageFile = null;
        showToast('Personalización guardada');
    } catch (error) { showToast('Error al guardar: ' + error.message, 'error'); }
    finally { btn.innerHTML = originalText; btn.disabled = false; }
}

/* =========================================
   PORTADA (HERO)
   ========================================= */
let heroImageFile = null;
async function loadHero() {
    try {
        const docSnap = await getDoc(doc(db, 'contenido', 'hero'));
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        document.getElementById('hero-title').value = data.title || '';
        if (data.image) {
            const preview = document.getElementById('hero-image-preview');
            preview.src = data.image; preview.style.display = 'block';
        }
    } catch (error) { console.error(error); }
}
async function saveHero() {
    const btn = document.getElementById('hero-save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; btn.disabled = true;
    try {
        const preview = document.getElementById('hero-image-preview');
        let imageUrl = (preview.style.display === 'block' && preview.src.startsWith('http')) ? preview.src : null;
        if (heroImageFile) {
            try {
                const prev = await getDoc(doc(db, 'contenido', 'hero'));
                if (prev.exists() && prev.data().image) await deleteObject(ref(storage, prev.data().image));
            } catch (e) {}
            const storageRef = ref(storage, `contenido/hero_${Date.now()}.jpg`);
            await uploadBytes(storageRef, heroImageFile);
            imageUrl = await getDownloadURL(storageRef);
        }
        await setDoc(doc(db, 'contenido', 'hero'), { title: document.getElementById('hero-title').value.trim(), image: imageUrl });
        heroImageFile = null;
        showToast('Portada guardada');
    } catch (error) { showToast('Error al guardar: ' + error.message, 'error'); }
    finally { btn.innerHTML = originalText; btn.disabled = false; }
}

/* =========================================
   CONTACTO Y REDES
   ========================================= */
const SOCIAL_PLATFORMS = {
    facebook: { label: 'Facebook' }, instagram: { label: 'Instagram' }, tiktok: { label: 'TikTok' },
    youtube: { label: 'YouTube' }, twitter: { label: 'X (Twitter)' }, linkedin: { label: 'LinkedIn' }
};
function renderSocialRow(platform = 'facebook', url = '') {
    const container = document.getElementById('social-rows-container');
    const row = document.createElement('div');
    row.className = 'av2-social-row';
    const options = Object.entries(SOCIAL_PLATFORMS).map(([k, v]) => `<option value="${k}" ${k === platform ? 'selected' : ''}>${v.label}</option>`).join('');
    row.innerHTML = `
        <select class="social-platform-select">${options}</select>
        <input type="url" class="social-url-input" placeholder="https://..." value="${url}">
        <button type="button" class="av2-icon-btn danger" onclick="this.closest('.av2-social-row').remove()"><i class="fas fa-trash"></i></button>`;
    container.appendChild(row);
}
function addSocialRow() { renderSocialRow(); }

async function loadFooterContacto() {
    try {
        const docSnap = await getDoc(doc(db, 'contenido', 'footer-contacto'));
        document.getElementById('social-rows-container').innerHTML = '';
        if (!docSnap.exists()) { renderSocialRow('facebook'); renderSocialRow('instagram'); return; }
        const data = docSnap.data();
        document.getElementById('footer-phone1').value = data.phone1 || '';
        document.getElementById('footer-phone2').value = data.phone2 || '';
        document.getElementById('footer-email').value = data.email || '';
        document.getElementById('footer-address').value = data.address || '';
        if (data.socialLinks?.length) data.socialLinks.forEach(s => renderSocialRow(s.platform, s.url));
        else { renderSocialRow('facebook'); renderSocialRow('instagram'); }
    } catch (error) {
        console.error(error);
        renderSocialRow('facebook'); renderSocialRow('instagram');
    }
}