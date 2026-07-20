import { db, storage, auth, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, ref, uploadBytes, getDownloadURL, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

// =========================================
// SISTEMA DE LOGIN
// =========================================
async function login() {
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const btn = document.querySelector('.btn-login') || event?.target;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error(error);
        alert('❌ Usuario o contraseña incorrectos');
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

function showAdminPanel() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadProperties();
    checkForDraft();
}

function showLoginScreen() {
    document.getElementById('admin-login').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

// Firebase avisa automáticamente si hay sesión activa o no
onAuthStateChanged(auth, (user) => {
    if (user) {
        showAdminPanel();
    } else {
        showLoginScreen();
    }
});

// =========================================
// MANEJO DE ARCHIVOS
// =========================================
let uploadedImages = [];
const dropZone = document.getElementById('drop-zone');

if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
}

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => { uploadedImages.push({ file: file, base64: e.target.result }); displayImages(); };
            reader.readAsDataURL(file);
        }
    });
}

function displayImages() {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    preview.innerHTML = uploadedImages.map((img, index) => `
        <div style="position: relative;">
            <img src="${img.base64}" alt="Imagen ${index + 1}">
            <button onclick="removeImage(${index})" style="position: absolute; top: 5px; right: 5px; background: #f44336; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 12px;">×</button>
        </div>
    `).join('');
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    displayImages();
}

// =========================================
// FORMATEO DE NÚMEROS Y VISTA PREVIA
// =========================================
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

function togglePriceFields() {
    const category = document.getElementById('prop-category').value;
    document.getElementById('price-venta-fields').style.display = category === 'alquileres' ? 'none' : 'block';
    document.getElementById('price-alquiler-fields').style.display = category === 'alquileres' ? 'block' : 'none';
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
        preview.textContent = parts.length > 0 ? parts.join(' / ') : 'Completá al menos un precio';
        preview.style.color = parts.length > 0 ? '#4CAF50' : '#999';
    }
}

// =========================================
// CONVERTIR LINK DE MAPS AUTOMÁTICAMENTE (VERSIÓN BLINDADA)
// =========================================
function convertMapUrl(url) {
    // 1. Si por error pegó TODO el código <iframe src="...">, el sistema extrae solo el link automáticamente
    const iframeMatch = url.match(/src=["'](.*?)["']/);
    if (iframeMatch) {
        return iframeMatch[1]; // Devuelve solo lo que está entre las comillas
    }
    
    // 2. Si ya es un enlace embed correcto, lo dejamos así
    if (url.includes('/embed')) {
        return url;
    }
    
    // 3. Si es un enlace corto (goo.gl), le avisamos y ponemos el mapa de Curuguaty por defecto
    if (url.includes('maps.app.goo.gl')) {
        alert('⚠️ Los enlaces cortos no se pueden mostrar en la página. Se usará el mapa de Curuguaty por defecto.\n\n💡 Tip: En Google Maps, usá la opción "Insertar un mapa" y copiá el enlace.');
        return 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14480.78840488428!2d-55.7308!3d-24.0694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94544a5c5e5e5e5f%3A0x0!2sCuruguaty!5e0!3m2!1ses!2spy!4v1234567890';
    }
    
    return url;
}

// =========================================
// GUARDAR PROPIEDAD (FIREBASE)
// =========================================
async function saveProperty() {
    const btn = document.querySelector('.btn-save');
    const originalText = btn.innerHTML;
    const badge = document.getElementById('prop-badge').value;
const youtubeUrl = document.getElementById('prop-youtube').value.trim();
const matterportUrl = document.getElementById('prop-matterport').value.trim();
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    btn.disabled = true;

    try {
        const editId = document.getElementById('edit-property-id').value;
        const title = document.getElementById('prop-title').value.trim();
        const category = document.getElementById('prop-category').value;
        const description = document.getElementById('prop-description').value.trim();
        const featuresText = document.getElementById('prop-features').value.trim();
        
        // 👇 AQUÍ ESTÁ EL ARREGLO DEL MAPA 👇
        let mapUrl = document.getElementById('prop-map').value.trim();
        if (mapUrl) {
            mapUrl = convertMapUrl(mapUrl);
        }
        
        let price = '';
        if (category === 'alquileres') {
            const alquilerRaw = unformatNumber(document.getElementById('prop-price-alquiler').value);
            if (alquilerRaw) price = `₲ ${formatNumberString(alquilerRaw)} / mes`;
        } else {
            const usdRaw = unformatNumber(document.getElementById('prop-price-usd').value);
            const gsRaw = unformatNumber(document.getElementById('prop-price-gs').value);
            let parts = [];
            if (usdRaw) parts.push(`USD ${formatNumberString(usdRaw)}`);
            if (gsRaw) parts.push(`₲ ${formatNumberString(gsRaw)}`);
            price = parts.join(' / ');
        }
        
if (!title || !price || uploadedImages.length === 0) {
    showToast('Completá al menos: título, precio y una imagen', 'error');
    btn.innerHTML = originalText; btn.disabled = false; return;
}
        
        const features = featuresText ? featuresText.split(',').map(f => f.trim()).filter(f => f) : [];
        
        // 1. Manejar TODAS las imágenes (Carrusel)
        const imageUrls = [];
        
        for (const img of uploadedImages) {
            if (img.file) {
                // Es una imagen nueva, la subimos a Firebase
                const storageRef = ref(storage, `propiedades/${Date.now()}_${img.file.name}`);
                const snapshot = await uploadBytes(storageRef, img.file);
                const url = await getDownloadURL(snapshot.ref);
                imageUrls.push(url);
            } else if (img.existingUrl) {
                // Es una imagen que ya existía, la mantenemos
                imageUrls.push(img.existingUrl);
            }
        }

        const propertyData = {
            title, 
            price, 
            category, 
            description, 
            features,
            badge: badge || null,
            youtube: youtubeUrl || null,
            matterport: matterportUrl || null,
            image: imageUrls[0],   // ✅ CORREGIDO: Ahora sí coincide con el nombre del array
            images: imageUrls,
            map: mapUrl || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14480.78840488428!2d-55.7308!3d-24.0694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94544a5c5e5e5e5f%3A0x0!2sCuruguaty!5e0!3m2!1ses!2spy!4v1234567890',
            date: new Date().toISOString()
        };

        // 2. Guardar en Firestore
        if (editId) {
            await updateDoc(doc(db, "propiedades", editId), propertyData);
        } else {
            await addDoc(collection(db, "propiedades"), propertyData);
        }
        
        // Limpiar formulario
        document.getElementById('prop-title').value = '';
        document.getElementById('prop-price-usd').value = '';
        document.getElementById('prop-price-gs').value = '';
        document.getElementById('prop-price-alquiler').value = '';
        document.getElementById('prop-description').value = '';
        document.getElementById('prop-features').value = '';
        document.getElementById('prop-map').value = '';
        document.getElementById('prop-badge').value = '';
document.getElementById('prop-youtube').value = '';
document.getElementById('prop-matterport').value = '';
        uploadedImages = [];
        displayImages();
        document.getElementById('edit-property-id').value = '';
        document.querySelector('.btn-save').innerHTML = '<i class="fas fa-save"></i> Guardar Propiedad';
        document.getElementById('price-preview').textContent = 'Completá los campos de arriba';
        document.getElementById('price-preview').style.color = '#999';
        
clearDraft(); // Ya se guardó de verdad, borramos el borrador temporal
showToast(editId ? 'Propiedad actualizada correctamente' : 'Propiedad guardada en la nube', 'success');
loadProperties();
} catch (error) {
    console.error(error);
    showToast('Error al guardar: ' + error.message, 'error');
} finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// =========================================
// CARGAR Y MOSTRAR PROPIEDADES
// =========================================
async function loadProperties() {
    const container = document.getElementById('properties-container');
    if (!container) return;
    
    try {
        const querySnapshot = await getDocs(collection(db, "propiedades"));
        const properties = [];
        querySnapshot.forEach((doc) => {
            properties.push({ id: doc.id, ...doc.data() });
        });
        
        if (properties.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay propiedades publicadas</p>';
            return;
        }
        
        container.innerHTML = properties.map(prop => `
            <div class="property-item">
                <img src="${prop.image}" alt="${prop.title}">
                <div class="property-item-info">
                    <h3>${prop.title}</h3>
                    <p class="price">${prop.price}</p>
                    <p style="color: #666; font-size: 14px;">${prop.category.toUpperCase()}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editProperty('${prop.id}')" style="background: #2196F3; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="deleteProperty('${prop.id}')" style="background: #f44336; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error cargando propiedades:", error);
        container.innerHTML = '<p style="color: red;">Error al cargar datos de Firebase</p>';
    }
}

// =========================================
// EDITAR Y ELIMINAR
// =========================================
async function editProperty(id) {
    try {
        const propertiesRef = collection(db, "propiedades");
        const querySnapshot = await getDocs(propertiesRef);
        let property = null;
        
        querySnapshot.forEach((doc) => {
            if (doc.id === id) {
                property = { id: doc.id, ...doc.data() };
            }
        });
        
if (!property) {
    showToast('Propiedad no encontrada', 'error');
    return;
}
        
document.getElementById('prop-title').value = property.title;
document.getElementById('prop-category').value = property.category;
document.getElementById('prop-description').value = property.description || '';
document.getElementById('prop-features').value = property.features ? property.features.join(', ') : '';
document.getElementById('prop-map').value = property.map || '';
document.getElementById('prop-badge').value = property.badge || '';
document.getElementById('prop-youtube').value = property.youtube || '';
document.getElementById('prop-matterport').value = property.matterport || '';
        
        document.getElementById('prop-price-usd').value = '';
        document.getElementById('prop-price-gs').value = '';
        document.getElementById('prop-price-alquiler').value = '';
        
        const priceText = property.price;
        if (property.category === 'alquileres') {
            const match = priceText.match(/₲\s*([\d\.]+)/);
            if (match) document.getElementById('prop-price-alquiler').value = match[1];
        } else {
            const usdMatch = priceText.match(/USD\s*([\d\.]+)/);
            const gsMatch = priceText.match(/₲\s*([\d\.]+)/);
            if (usdMatch) document.getElementById('prop-price-usd').value = usdMatch[1];
            if (gsMatch && !priceText.includes('/ mes')) document.getElementById('prop-price-gs').value = gsMatch[1];
        }
        
uploadedImages = [];
if (property.images && property.images.length > 0) {
    property.images.forEach(url => {
        uploadedImages.push({
            file: null,
            base64: url,
            isExisting: true,
            existingUrl: url
        });
    });
} else if (property.image) {
    // Por si alguna propiedad vieja solo tiene "image" y no "images"
    uploadedImages.push({
        file: null,
        base64: property.image,
        isExisting: true,
        existingUrl: property.image
    });
}
displayImages();
        togglePriceFields();
        document.getElementById('edit-property-id').value = id;
        document.querySelector('.btn-save').innerHTML = '<i class="fas fa-sync"></i> Actualizar Propiedad';
        document.querySelector('.upload-section').scrollIntoView({ behavior: 'smooth' });
        
       showToast('Datos cargados. La foto actual se mantiene. Si subís una nueva, reemplazará a la anterior.', 'success');
        
} catch (error) {
    console.error("Error al cargar propiedad:", error);
    showToast('Error al cargar la propiedad: ' + error.message, 'error');
}
}

async function deleteProperty(id) {
    if (confirm('¿Estás seguro de eliminar esta propiedad de la nube?')) {
        try {
            await deleteDoc(doc(db, "propiedades", id));
            loadProperties();
} catch (error) {
    showToast('Error al eliminar: ' + error.message, 'error');
}
    }
}

function cancelEdit() {
    const title = document.getElementById('prop-title').value.trim();
    const hasData = title || uploadedImages.length > 0;
    
    if (hasData) {
        openConfirmModal(
            '¿Seguro que querés cancelar? Se perderán los cambios no guardados.',
            () => { doCancelEdit(); },
            'Sí, cancelar'
        );
    } else {
        doCancelEdit();
    }
}

function doCancelEdit() {
    document.getElementById('prop-title').value = '';
    document.getElementById('prop-price-usd').value = '';
    document.getElementById('prop-price-gs').value = '';
    document.getElementById('prop-price-alquiler').value = '';
    document.getElementById('prop-description').value = '';
    document.getElementById('prop-features').value = '';
    document.getElementById('prop-map').value = '';
    document.getElementById('edit-property-id').value = '';
    
    uploadedImages = [];
    displayImages();
    clearDraft();
    
    document.querySelector('.btn-save').innerHTML = '<i class="fas fa-save"></i> Guardar Propiedad';
    document.getElementById('price-preview').textContent = 'Completá los campos de arriba';
    document.getElementById('price-preview').style.color = '#999';
    
    showToast('Edición cancelada. El formulario está limpio.', 'success');
}

// =========================================
// MODAL DE CONFIRMACIÓN PERSONALIZADO
// =========================================
function hasUnsavedChanges() {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return false;
    try {
        const draft = JSON.parse(saved);
        return Object.values(draft).some(v => v && v.trim() !== '');
    } catch (e) {
        return false;
    }
}

function openConfirmModal(message, onConfirm, actionText = 'Salir igual') {
    const modal = document.getElementById('confirm-modal');
    const text = document.getElementById('confirm-modal-text');
    const actionBtn = document.getElementById('confirm-modal-action-btn');
    
    text.textContent = message;
    actionBtn.textContent = actionText;
    modal.style.display = 'flex';
    
    // Reemplazamos el botón para limpiar listeners anteriores
    const newBtn = actionBtn.cloneNode(true);
    actionBtn.parentNode.replaceChild(newBtn, actionBtn);
    newBtn.id = 'confirm-modal-action-btn';
    newBtn.addEventListener('click', () => {
        closeConfirmModal();
        onConfirm();
    });
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

function confirmNavigation(url) {
    if (hasUnsavedChanges()) {
        openConfirmModal(
            'Si salís ahora, vas a perder los datos que escribiste en el formulario. ¿Qué querés hacer?',
            () => { clearDraft(); window.location.href = url; }
        );
    } else {
        window.location.href = url;
    }
}

function confirmLogout() {
    if (hasUnsavedChanges()) {
        openConfirmModal(
            'Tenés datos sin guardar. Si cerrás sesión ahora, vas a perderlos. ¿Qué querés hacer?',
            () => { clearDraft(); logout(); }
        );
    } else {
        logout();
    }
}

// =========================================
// SISTEMA DE BORRADOR AUTOMÁTICO
// =========================================
const DRAFT_KEY = 'urbana_property_draft';
const draftFields = ['prop-title', 'prop-badge', 'prop-youtube', 'prop-matterport', 
                      'prop-price-usd', 'prop-price-gs', 'prop-price-alquiler', 
                      'prop-category', 'prop-description', 'prop-features', 'prop-map'];

function saveDraft() {
    const draft = {};
    draftFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) draft[id] = el.value;
    });
    // Solo guardamos si hay algo escrito (evita guardar formularios vacíos)
    const hasContent = Object.values(draft).some(v => v && v.trim() !== '');
    if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
}

function loadDraftIntoForm(draft) {
    draftFields.forEach(id => {
        const el = document.getElementById(id);
        if (el && draft[id]) el.value = draft[id];
    });
    togglePriceFields();
    updatePricePreview();
}

function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}

function checkForDraft() {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    
    try {
        const draft = JSON.parse(saved);
        const hasContent = Object.values(draft).some(v => v && v.trim() !== '');
        if (!hasContent) { clearDraft(); return; }
        
        const continuar = confirm('📝 Tenés datos sin guardar de la última vez que estabas cargando una propiedad.\n\n¿Querés continuar editando donde lo dejaste?\n\n(Aceptar = Continuar editando | Cancelar = Empezar de nuevo)');
        
        if (continuar) {
            loadDraftIntoForm(draft);
        } else {
            clearDraft();
        }
    } catch (e) {
        clearDraft();
    }
}

// Guardar automáticamente cada vez que Rubén escribe algo
document.addEventListener('input', (e) => {
    if (draftFields.includes(e.target.id)) {
        saveDraft();
    }
});

// Avisar antes de salir si hay datos sin guardar
window.addEventListener('beforeunload', (e) => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
        try {
            const draft = JSON.parse(saved);
            const hasContent = Object.values(draft).some(v => v && v.trim() !== '');
            if (hasContent) {
                e.preventDefault();
                e.returnValue = '';
            }
        } catch (err) {}
    }
});

// =========================================
// HACER FUNCIONES GLOBALES (UNA SOLA VEZ, AL FINAL DE TODO)
// =========================================
window.login = login;
window.logout = logout;
window.saveProperty = saveProperty;
window.editProperty = editProperty;
window.deleteProperty = deleteProperty;
window.handleFiles = handleFiles;
window.removeImage = removeImage;
window.togglePriceFields = togglePriceFields;
window.formatNumber = formatNumber;
window.updatePricePreview = updatePricePreview;
window.displayImages = displayImages;
window.loadProperties = loadProperties;
window.cancelEdit = cancelEdit;
window.confirmNavigation = confirmNavigation;
window.confirmLogout = confirmLogout;
window.closeConfirmModal = closeConfirmModal;

// =========================================
// NOTIFICACIONES TIPO TOAST
// =========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
        success: { bg: '#4CAF50', icon: '✅' },
        error: { bg: '#f44336', icon: '❌' },
        info: { bg: '#2196F3', icon: 'ℹ️' }
    };
    const style = colors[type] || colors.success;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${style.bg};
        color: white;
        padding: 16px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        font-size: 14px;
        max-width: 350px;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
    `;
    toast.innerHTML = `<span style="font-size:18px;">${style.icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    // Animación de salida y remoción
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

window.showToast = showToast;