import { db, storage, auth, collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, setDoc, ref, uploadBytes, getDownloadURL, deleteObject, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

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

function showAdminPanel() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadProperties();
    loadFaqs();
    loadContenido();
    loadFooterContacto();
    loadHero();
    checkForDraft();
    showWelcomeMessage();
}

function showWelcomeMessage() {
    const el = document.getElementById('welcome-message');
    if (!el) return;

    const hour = new Date().getHours();
    let saludo = 'Buenas noches';
    if (hour >= 5 && hour < 12) saludo = 'Buenos días';
    else if (hour >= 12 && hour < 19) saludo = 'Buenas tardes';

    const user = auth.currentUser;
    const uid = user ? user.uid : '';

  const nombresPorUid = {
    '8w9RcNMOV0MMPOAhKiL2G7e4sjG3': 'Rubén',
    'WodDTBpLxfPqJ7tDeRrKr0BCNky1': 'Manuel'
};

    const nombre = nombresPorUid[uid] || 'Bienvenido';

    el.textContent = `${saludo}, ${nombre} 👋 ¿Qué vamos a hacer hoy?`;
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

function comprimirImagen(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxAncho = 1600; // Suficiente calidad para verse bien en el sitio
                let ancho = img.width;
                let alto = img.height;

                if (ancho > maxAncho) {
                    alto = Math.round((alto * maxAncho) / ancho);
                    ancho = maxAncho;
                }

                const canvas = document.createElement('canvas');
                canvas.width = ancho;
                canvas.height = alto;
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

async function handleFiles(files) {
    const imagenes = Array.from(files).filter(file => file.type.startsWith('image/'));

    for (const file of imagenes) {
        const comprimida = await comprimirImagen(file);
        uploadedImages.push(comprimida);
        displayImages();
    }
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
    const iframeMatch = url.match(/src=["'](.*?)["']/);
    if (iframeMatch) {
        return iframeMatch[1];
    }

    if (url.includes('/embed')) {
        return url;
    }

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
    const address = document.getElementById('prop-address').value.trim();
    const status = document.getElementById('prop-status').value;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    btn.disabled = true;

    try {
        const editId = document.getElementById('edit-property-id').value;
        const title = document.getElementById('prop-title').value.trim();
        const category = document.getElementById('prop-category').value;
        const description = document.getElementById('prop-description').value.trim();
        const featuresText = document.getElementById('prop-features').value.trim();
       const superficie = document.getElementById('prop-superficie').value.trim();
        const ownerName = document.getElementById('prop-owner-name').value.trim();
        const ownerPhone = document.getElementById('prop-owner-phone').value.trim();
        const dormitorios = document.getElementById('prop-dormitorios').value;

        let mapUrl = document.getElementById('prop-map').value.trim();
        if (mapUrl) {
            mapUrl = convertMapUrl(mapUrl);
        }

       let price = '';
        let priceUSD = null;
        let priceGS = null;

        if (category === 'alquileres') {
            const alquilerRaw = unformatNumber(document.getElementById('prop-price-alquiler').value);
            if (alquilerRaw) {
                price = `₲ ${formatNumberString(alquilerRaw)} / mes`;
                priceGS = parseInt(alquilerRaw) || null;
            }
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

        const features = featuresText ? featuresText.split(',').map(f => f.trim()).filter(f => f) : [];
        if (superficie) {
            features.unshift(`${superficie} m²`);
        }

        const imageUrls = [];

        for (const img of uploadedImages) {
            if (img.file) {
                const storageRef = ref(storage, `propiedades/${Date.now()}_${img.file.name}`);
                const snapshot = await uploadBytes(storageRef, img.file);
                const url = await getDownloadURL(snapshot.ref);
                imageUrls.push(url);
            } else if (img.existingUrl) {
                imageUrls.push(img.existingUrl);
            }
        }

      const propertyData = {
            title,
            price,
            category,
            description,
            features,
         ownerName: ownerName || null,
            ownerPhone: ownerPhone || null,
            dormitorios: dormitorios !== '' ? parseInt(dormitorios) : null,
            priceUSD: priceUSD,
            priceGS: priceGS,
            badge: badge || null,
            youtube: youtubeUrl || null,
            matterport: matterportUrl || null,
            image: imageUrls[0],
            images: imageUrls,
            map: mapUrl || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14480.78840488428!2d-55.7308!3d-24.0694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94544a5c5e5e5e5f%3A0x0!2sCuruguaty!5e0!3m2!1ses!2spy!4v1234567890',
            address: address || null,
            status: status || 'disponible',
            date: new Date().toISOString()
        };

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
       document.getElementById('prop-dormitorios').value = '';
        document.getElementById('prop-owner-name').value = '';
        document.getElementById('prop-owner-phone').value = '';
        document.getElementById('prop-superficie').value = '';
        document.getElementById('prop-features').value = '';
        document.getElementById('prop-map').value = '';
        document.getElementById('prop-badge').value = '';
        document.getElementById('prop-youtube').value = '';
        document.getElementById('prop-matterport').value = '';
        document.getElementById('prop-address').value = '';
        document.getElementById('prop-status').value = 'disponible';
        uploadedImages = [];
        displayImages();
        document.getElementById('edit-property-id').value = '';
        document.querySelector('.btn-save').innerHTML = '<i class="fas fa-save"></i> Guardar Propiedad';
        document.getElementById('price-preview').textContent = 'Completá los campos de arriba';
        document.getElementById('price-preview').style.color = '#999';

        clearDraft();
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

        const statusLabels = {
            disponible: '🟢 Disponible',
            reservado: '🟡 Reservado',
            vendido: '🔴 Vendido'
        };

        container.innerHTML = properties.map(prop => `
            <div class="property-item">
                <img src="${prop.image}" alt="${prop.title}">
               <div class="property-item-info">
                    <h3>${prop.title}</h3>
                    <p class="price">${prop.price}</p>
                    <p style="color: #666; font-size: 14px;">${prop.category.toUpperCase()}</p>
                    ${prop.ownerName || prop.ownerPhone ? `
                        <p style="background: #fff3e0; color: #E65100; font-size: 12px; padding: 6px 10px; border-radius: 8px; margin-top: 6px; display: inline-block;">
                            🔒 ${prop.ownerName || 'Sin nombre'}${prop.ownerPhone ? ' · ' + prop.ownerPhone : ''}
                        </p>
                    ` : ''}
                   <select onchange="updatePropertyStatus('${prop.id}', this.value)" style="margin-top: 8px; padding: 6px 10px; border-radius: 10px; border: 1px solid #ccc; font-size: 13px;">
                        <option value="disponible" ${(prop.status || 'disponible') === 'disponible' ? 'selected' : ''}>${statusLabels.disponible}</option>
                        <option value="reservado" ${prop.status === 'reservado' ? 'selected' : ''}>${statusLabels.reservado}</option>
                        <option value="vendido" ${prop.status === 'vendido' ? 'selected' : ''}>${statusLabels.vendido}</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editProperty('${prop.id}')" style="background: #2196F3; color: white; padding: 8px 15px; border: none; border-radius: 10px; cursor: pointer;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="deleteProperty('${prop.id}')" style="background: #f44336; color: white; padding: 8px 15px; border: none; border-radius: 10px; cursor: pointer;">
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

async function updatePropertyStatus(id, newStatus) {
    try {
        await updateDoc(doc(db, "propiedades", id), { status: newStatus });
        showToast('Estado actualizado correctamente', 'success');
    } catch (error) {
        showToast('Error al actualizar estado: ' + error.message, 'error');
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
       document.getElementById('prop-address').value = property.address || '';
        document.getElementById('prop-status').value = property.status || 'disponible';
       document.getElementById('prop-dormitorios').value = property.dormitorios != null ? property.dormitorios : '';
        document.getElementById('prop-owner-name').value = property.ownerName || '';
        document.getElementById('prop-owner-phone').value = property.ownerPhone || '';

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
    openConfirmModal(
        '¿Estás seguro de eliminar esta propiedad de la nube? Esta acción no se puede deshacer.',
        async () => {
            try {
                const propertiesRef = collection(db, "propiedades");
                const querySnapshot = await getDocs(propertiesRef);
                let property = null;
                querySnapshot.forEach((docSnap) => {
                    if (docSnap.id === id) property = docSnap.data();
                });

                if (property && property.images && property.images.length > 0) {
                    for (const imageUrl of property.images) {
                        try {
                            const imageRef = ref(storage, imageUrl);
                            await deleteObject(imageRef);
                        } catch (imgError) {
                            console.warn('No se pudo borrar una imagen (puede que ya no exista):', imgError.message);
                        }
                    }
                }

                await deleteDoc(doc(db, "propiedades", id));
                showToast('Propiedad y sus fotos eliminadas correctamente', 'success');
                loadProperties();
            } catch (error) {
                showToast('Error al eliminar: ' + error.message, 'error');
            }
        },
        'Sí, eliminar'
    );
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
   document.getElementById('prop-owner-name').value = '';
    document.getElementById('prop-owner-phone').value = '';
    document.getElementById('prop-superficie').value = '';
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
    if (draftGuardadoAPropósito) {
        // Ya está guardado a propósito como borrador: se puede salir sin advertencia ni borrar nada
        window.location.href = url;
    } else if (hasUnsavedChanges()) {
        openConfirmModal(
            'Si salís ahora, vas a perder los datos que escribiste en el formulario. ¿Qué querés hacer?',
            () => { clearDraft(); window.location.href = url; }
        );
    } else {
        window.location.href = url;
    }
}

function confirmLogout() {
    if (draftGuardadoAPropósito) {
        // Ya está guardado a propósito como borrador: se puede cerrar sesión sin advertencia ni borrar nada
        logout();
    } else if (hasUnsavedChanges()) {
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
                      'prop-category', 'prop-description', 'prop-features', 'prop-map', 'prop-superficie'];
let draftGuardadoAPropósito = false;

function saveDraft() {
    const draft = {};
    draftFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) draft[id] = el.value;
    });
    const hasContent = Object.values(draft).some(v => v && v.trim() !== '');
    if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
}

function saveDraftManual() {
    const title = document.getElementById('prop-title').value.trim();
    const hasData = title || document.getElementById('prop-description').value.trim();

    if (!hasData) {
        showToast('Completá al menos el título para guardar un borrador', 'error');
        return;
    }

    saveDraft();
    draftGuardadoAPropósito = true;
    showToast('Borrador guardado. Ya podés salir tranquilo, lo vas a ver de nuevo la próxima vez que entres.', 'success');
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

        // Cargamos el borrador directo en el formulario
        loadDraftIntoForm(draft);
        draftGuardadoAPropósito = true;

        // Y avisamos con el modal propio del sitio, dando la opción de empezar de cero
        setTimeout(() => {
            openConfirmModal(
                '📝 Cargamos los datos que dejaste guardados la última vez. Ya podés seguir editando desde donde lo dejaste. Si preferís, también podés empezar de nuevo.',
                () => { doCancelEdit(); draftGuardadoAPropósito = false; },
                'Empezar de nuevo'
            );
        }, 400);
    } catch (e) {
        clearDraft();
    }
}

document.addEventListener('input', (e) => {
    if (draftFields.includes(e.target.id)) {
        saveDraft();
        draftGuardadoAPropósito = false; // Si sigue escribiendo después de guardar, vuelve a considerarse "sin guardar"
    }
});

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
// EXPORTAR PARA GOOGLE MY MAPS
// =========================================
async function exportForMyMaps() {
    try {
        const querySnapshot = await getDocs(collection(db, "propiedades"));
        const properties = [];
        querySnapshot.forEach((doc) => properties.push({ id: doc.id, ...doc.data() }));

        const activeProperties = properties.filter(p => (p.status || 'disponible') !== 'vendido');

        if (activeProperties.length === 0) {
            showToast('No hay propiedades activas para exportar', 'error');
            return;
        }

        let csv = 'Nombre,Direccion,Precio,Categoria,Estado\n';
        activeProperties.forEach(p => {
            const nombre = (p.title || '').replace(/"/g, '""');
            const direccion = (p.address || 'Curuguaty, Canindeyú, Paraguay').replace(/"/g, '""');
            const precio = (p.price || '').replace(/"/g, '""');
            const categoria = p.category || '';
            const estado = p.status || 'disponible';
            csv += `"${nombre}","${direccion}","${precio}","${categoria}","${estado}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `urbana-propiedades-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        showToast('CSV descargado. Importalo en My Maps.', 'success');
    } catch (error) {
        showToast('Error al exportar: ' + error.message, 'error');
    }
}

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

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// =========================================
// PREGUNTAS FRECUENTES (FAQ)
// =========================================
async function loadFaqs() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    try {
        const querySnapshot = await getDocs(collection(db, "preguntas"));
        const faqs = [];
        querySnapshot.forEach((doc) => faqs.push({ id: doc.id, ...doc.data() }));

        if (faqs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay preguntas cargadas todavía</p>';
            return;
        }

        container.innerHTML = faqs.map(faq => `
            <div class="property-item">
                <div class="property-item-info">
                    <h3>${faq.question}</h3>
                    <p style="color: #666; font-size: 14px;">${faq.answer}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editFaq('${faq.id}')" style="background: #2196F3; color: white; padding: 8px 15px; border: none; border-radius: 10px; cursor: pointer;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="deleteFaq('${faq.id}')" style="background: #f44336; color: white; padding: 8px 15px; border: none; border-radius: 10px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error cargando preguntas:", error);
        container.innerHTML = '<p style="color: red;">Error al cargar preguntas frecuentes</p>';
    }
}

async function saveFaq() {
    const question = document.getElementById('faq-question-input').value.trim();
    const answer = document.getElementById('faq-answer-input').value.trim();
    const editId = document.getElementById('edit-faq-id').value;

    if (!question || !answer) {
        showToast('Completá la pregunta y la respuesta', 'error');
        return;
    }

    try {
        if (editId) {
            await updateDoc(doc(db, "preguntas", editId), { question, answer });
            showToast('Pregunta actualizada correctamente', 'success');
        } else {
            await addDoc(collection(db, "preguntas"), { question, answer, date: new Date().toISOString() });
            showToast('Pregunta agregada correctamente', 'success');
        }
        doCancelFaqEdit();
        loadFaqs();
    } catch (error) {
        showToast('Error al guardar: ' + error.message, 'error');
    }
}

async function editFaq(id) {
    try {
        const querySnapshot = await getDocs(collection(db, "preguntas"));
        let faq = null;
        querySnapshot.forEach((doc) => { if (doc.id === id) faq = doc.data(); });
        if (!faq) return;

        document.getElementById('faq-question-input').value = faq.question;
        document.getElementById('faq-answer-input').value = faq.answer;
        document.getElementById('edit-faq-id').value = id;
        document.querySelector('.properties-list:has(#faq-container)')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showToast('Error al cargar la pregunta: ' + error.message, 'error');
    }
}

async function deleteFaq(id) {
    openConfirmModal(
        '¿Estás seguro de eliminar esta pregunta frecuente?',
        async () => {
            try {
                await deleteDoc(doc(db, "preguntas", id));
                showToast('Pregunta eliminada correctamente', 'success');
                loadFaqs();
            } catch (error) {
                showToast('Error al eliminar: ' + error.message, 'error');
            }
        },
        'Sí, eliminar'
    );
}

function doCancelFaqEdit() {
    document.getElementById('faq-question-input').value = '';
    document.getElementById('faq-answer-input').value = '';
    document.getElementById('edit-faq-id').value = '';
}

function cancelFaqEdit() {
    doCancelFaqEdit();
    showToast('Edición cancelada', 'success');
}

// =========================================
// PERSONALIZACIÓN DEL SITIO ("SOBRE NOSOTROS" Y FOOTER)
// =========================================
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
            preview.src = data.image;
            preview.style.display = 'block';
        }
    } catch (error) {
        console.error('Error cargando personalización:', error);
    }
}

let contentImageFile = null;

async function saveContenido() {
    const btn = document.getElementById('content-save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const preview = document.getElementById('content-image-preview');
        let imageUrl = (preview.style.display === 'block' && preview.src.startsWith('http')) ? preview.src : null;

        if (contentImageFile) {
            // Borramos la imagen anterior de "Sobre Nosotros", si había una guardada
            try {
                const docSnapAnterior = await getDoc(doc(db, 'contenido', 'sobre-nosotros'));
                if (docSnapAnterior.exists() && docSnapAnterior.data().image) {
                    const refAnterior = ref(storage, docSnapAnterior.data().image);
                    await deleteObject(refAnterior);
                }
            } catch (errBorrado) {
                console.warn('No se pudo borrar la imagen anterior (puede que ya no exista):', errBorrado.message);
            }

            const storageRef = ref(storage, `contenido/sobre-nosotros_${Date.now()}.jpg`);
            await uploadBytes(storageRef, contentImageFile);
            imageUrl = await getDownloadURL(storageRef);
        }

        const data = {
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
        };

        await setDoc(doc(db, 'contenido', 'sobre-nosotros'), data);
        contentImageFile = null;
        showToast('Personalización guardada. Ya se ve reflejada en el sitio.', 'success');
    } catch (error) {
        showToast('Error al guardar: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// =========================================
// RECORTE DE IMAGEN (ESTILO WHATSAPP)
// =========================================
let cropImg = null;
let cropNaturalW = 0, cropNaturalH = 0;
let cropRect = { left: 10, top: 10, right: 90, bottom: 90 }; // en porcentaje
let cropDragMode = null; // 'move', 'tl', 'tr', 'bl', 'br'
let cropDragStartPointer = { x: 0, y: 0 };
let cropDragStartRect = null;
const CROP_MIN_SIZE = 10; // % mínimo de ancho/alto del recorte

let cropTarget = 'about'; // 'about' o 'hero'

function handleContentImageSelect(files, target = 'about') {
    const file = files[0];
    if (!file) return;
    cropTarget = target;
    const reader = new FileReader();
    reader.onload = (e) => {
        cropImg = document.getElementById('crop-image');
        document.getElementById('crop-modal').style.display = 'flex';
        cropImg.onload = () => {
            cropNaturalW = cropImg.naturalWidth;
            cropNaturalH = cropImg.naturalHeight;
            const container = document.getElementById('crop-container');
            container.style.aspectRatio = `${cropNaturalW} / ${cropNaturalH}`;
            cropRect = { left: 10, top: 10, right: 90, bottom: 90 };
            renderCropRect();
        };
        cropImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderCropRect() {
    const rectEl = document.getElementById('crop-rect');
    rectEl.style.left = cropRect.left + '%';
    rectEl.style.top = cropRect.top + '%';
    rectEl.style.width = (cropRect.right - cropRect.left) + '%';
    rectEl.style.height = (cropRect.bottom - cropRect.top) + '%';
}

function getCropPointerPct(e) {
    const container = document.getElementById('crop-container');
    const bounds = container.getBoundingClientRect();
    const p = e.touches && e.touches[0] ? e.touches[0] : e;
    const x = ((p.clientX - bounds.left) / bounds.width) * 100;
    const y = ((p.clientY - bounds.top) / bounds.height) * 100;
    return { x, y };
}

const cropRectEl = document.getElementById('crop-rect');
if (cropRectEl) {
    cropRectEl.querySelectorAll('.crop-handle').forEach(handle => {
        const startHandleDrag = (e) => {
            e.stopPropagation();
            cropDragMode = handle.getAttribute('data-corner');
            cropDragStartPointer = getCropPointerPct(e);
            cropDragStartRect = { ...cropRect };
        };
        handle.addEventListener('mousedown', startHandleDrag);
        handle.addEventListener('touchstart', startHandleDrag, { passive: true });
    });

    const startMoveDrag = (e) => {
        if (e.target.classList.contains('crop-handle')) return;
        cropDragMode = 'move';
        cropDragStartPointer = getCropPointerPct(e);
        cropDragStartRect = { ...cropRect };
    };
    cropRectEl.addEventListener('mousedown', startMoveDrag);
    cropRectEl.addEventListener('touchstart', startMoveDrag, { passive: true });

    const onDragMove = (e) => {
        if (!cropDragMode) return;
        if (e.cancelable) e.preventDefault();
        const p = getCropPointerPct(e);
        const dx = p.x - cropDragStartPointer.x;
        const dy = p.y - cropDragStartPointer.y;
        const r = cropDragStartRect;

        if (cropDragMode === 'move') {
            const w = r.right - r.left, h = r.bottom - r.top;
            let left = Math.min(100 - w, Math.max(0, r.left + dx));
            let top = Math.min(100 - h, Math.max(0, r.top + dy));
            cropRect = { left, top, right: left + w, bottom: top + h };
        } else {
            let { left, top, right, bottom } = r;
            if (cropDragMode.includes('l')) left = Math.min(right - CROP_MIN_SIZE, Math.max(0, r.left + dx));
            if (cropDragMode.includes('r')) right = Math.max(left + CROP_MIN_SIZE, Math.min(100, r.right + dx));
            if (cropDragMode.includes('t')) top = Math.min(bottom - CROP_MIN_SIZE, Math.max(0, r.top + dy));
            if (cropDragMode.includes('b')) bottom = Math.max(top + CROP_MIN_SIZE, Math.min(100, r.bottom + dy));
            cropRect = { left, top, right, bottom };
        }
        renderCropRect();
    };

    const onDragEnd = () => { cropDragMode = null; };

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);
}

function confirmCrop() {
    const sx = (cropRect.left / 100) * cropNaturalW;
    const sy = (cropRect.top / 100) * cropNaturalH;
    const sWidth = ((cropRect.right - cropRect.left) / 100) * cropNaturalW;
    const sHeight = ((cropRect.bottom - cropRect.top) / 100) * cropNaturalH;

    const outWidth = 1400;
    const outHeight = Math.round(1400 * (sHeight / sWidth));

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cropImg, sx, sy, sWidth, sHeight, 0, 0, outWidth, outHeight);

    canvas.toBlob((blob) => {
        if (cropTarget === 'hero') {
            heroImageFile = new File([blob], 'hero.jpg', { type: 'image/jpeg' });
            const preview = document.getElementById('hero-image-preview');
            preview.src = URL.createObjectURL(blob);
            preview.style.display = 'block';
            document.getElementById('hero-image-input').value = '';
        } else {
            contentImageFile = new File([blob], 'sobre-nosotros.jpg', { type: 'image/jpeg' });
            const preview = document.getElementById('content-image-preview');
            preview.src = URL.createObjectURL(blob);
            preview.style.display = 'block';
            document.getElementById('content-image-input').value = '';
        }
        document.getElementById('crop-modal').style.display = 'none';
    }, 'image/jpeg', 0.85);
}

function cancelCrop() {
    document.getElementById('crop-modal').style.display = 'none';
    document.getElementById('content-image-input').value = '';
}
// =========================================
// CONTACTO Y REDES SOCIALES DEL FOOTER
// =========================================
const SOCIAL_PLATFORMS = {
    facebook: { label: 'Facebook', icon: 'fab fa-facebook-f' },
    instagram: { label: 'Instagram', icon: 'fab fa-instagram' },
    tiktok: { label: 'TikTok', icon: 'fab fa-tiktok' },
    youtube: { label: 'YouTube', icon: 'fab fa-youtube' },
    twitter: { label: 'X (Twitter)', icon: 'fab fa-twitter' },
    linkedin: { label: 'LinkedIn', icon: 'fab fa-linkedin-in' }
};

function renderSocialRow(platform = 'facebook', url = '') {
    const container = document.getElementById('social-rows-container');
    const row = document.createElement('div');
    row.className = 'social-row';
    row.style.cssText = 'display:flex; gap:8px; margin-bottom:10px; align-items:center;';

    const options = Object.entries(SOCIAL_PLATFORMS).map(([key, val]) =>
        `<option value="${key}" ${key === platform ? 'selected' : ''}>${val.label}</option>`
    ).join('');

   row.innerHTML = `
        <select class="social-platform-select" style="padding:12px; border:2px solid #e0e0e0; border-radius:8px; font-size:14px; width:140px; flex-shrink:0;">${options}</select>
        <input type="url" class="social-url-input" placeholder="https://..." value="${url}" style="flex:1; min-width:0; padding:12px; border:2px solid #e0e0e0; border-radius:8px; font-size:14px;">
        <button type="button" onclick="this.closest('.social-row').remove()" style="background:#f44336; color:white; border:none; border-radius:8px; width:42px; height:42px; cursor:pointer; flex-shrink:0;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(row);
}

function addSocialRow() {
    renderSocialRow();
}

async function loadFooterContacto() {
    try {
        const docSnap = await getDoc(doc(db, 'contenido', 'footer-contacto'));
        document.getElementById('social-rows-container').innerHTML = '';

        if (!docSnap.exists()) {
            renderSocialRow('facebook');
            renderSocialRow('instagram');
            return;
        }

        const data = docSnap.data();
        document.getElementById('footer-phone1').value = data.phone1 || '';
        document.getElementById('footer-phone2').value = data.phone2 || '';
        document.getElementById('footer-email').value = data.email || '';
        document.getElementById('footer-address').value = data.address || '';

        if (data.socialLinks && data.socialLinks.length > 0) {
            data.socialLinks.forEach(s => renderSocialRow(s.platform, s.url));
        } else {
            renderSocialRow('facebook');
            renderSocialRow('instagram');
        }
    } catch (error) {
        console.error('Error cargando contacto del footer:', error);
        renderSocialRow('facebook');
        renderSocialRow('instagram');
    }
}

async function saveFooterContacto() {
    const btn = document.getElementById('footer-save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const socialLinks = [];
        document.querySelectorAll('.social-row').forEach(row => {
            const platform = row.querySelector('.social-platform-select').value;
            const url = row.querySelector('.social-url-input').value.trim();
            if (url) socialLinks.push({ platform, url });
        });

        const data = {
            phone1: document.getElementById('footer-phone1').value.trim(),
            phone2: document.getElementById('footer-phone2').value.trim(),
            email: document.getElementById('footer-email').value.trim(),
            address: document.getElementById('footer-address').value.trim(),
            socialLinks
        };

        await setDoc(doc(db, 'contenido', 'footer-contacto'), data);
        showToast('Contacto y redes guardados. Ya se ve reflejado en el sitio.', 'success');
    } catch (error) {
        showToast('Error al guardar: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// =========================================
// PERSONALIZACIÓN DE LA PORTADA (HERO)
// =========================================
let heroImageFile = null;

async function loadHero() {
    try {
        const docSnap = await getDoc(doc(db, 'contenido', 'hero'));
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        document.getElementById('hero-title').value = data.title || '';
        if (data.image) {
            const preview = document.getElementById('hero-image-preview');
            preview.src = data.image;
            preview.style.display = 'block';
        }
    } catch (error) {
        console.error('Error cargando portada:', error);
    }
}

async function saveHero() {
    const btn = document.getElementById('hero-save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const preview = document.getElementById('hero-image-preview');
        let imageUrl = (preview.style.display === 'block' && preview.src.startsWith('http')) ? preview.src : null;

        if (heroImageFile) {
            // Borramos la imagen anterior de la Portada, si había una guardada
            try {
                const docSnapAnterior = await getDoc(doc(db, 'contenido', 'hero'));
                if (docSnapAnterior.exists() && docSnapAnterior.data().image) {
                    const refAnterior = ref(storage, docSnapAnterior.data().image);
                    await deleteObject(refAnterior);
                }
            } catch (errBorrado) {
                console.warn('No se pudo borrar la imagen anterior (puede que ya no exista):', errBorrado.message);
            }

            const storageRef = ref(storage, `contenido/hero_${Date.now()}.jpg`);
            await uploadBytes(storageRef, heroImageFile);
            imageUrl = await getDownloadURL(storageRef);
        }

        const data = {
            title: document.getElementById('hero-title').value.trim(),
            image: imageUrl
        };

        await setDoc(doc(db, 'contenido', 'hero'), data);
        heroImageFile = null;
        showToast('Portada guardada. Ya se ve reflejada en el sitio.', 'success');
    } catch (error) {
        showToast('Error al guardar: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

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
window.formatOwnerPhone = formatOwnerPhone;
window.updatePricePreview = updatePricePreview;
window.displayImages = displayImages;
window.loadProperties = loadProperties;
window.cancelEdit = cancelEdit;
window.confirmNavigation = confirmNavigation;
window.confirmLogout = confirmLogout;
window.closeConfirmModal = closeConfirmModal;
window.showToast = showToast;
window.updatePropertyStatus = updatePropertyStatus;
window.exportForMyMaps = exportForMyMaps;
window.updatePropertyStatus = updatePropertyStatus;
window.exportForMyMaps = exportForMyMaps;
window.showWelcomeMessage = showWelcomeMessage;
window.saveDraftManual = saveDraftManual;
window.loadFaqs = loadFaqs;
window.saveFaq = saveFaq;
window.editFaq = editFaq;
window.deleteFaq = deleteFaq;
window.cancelFaqEdit = cancelFaqEdit;
window.saveContenido = saveContenido;
window.handleContentImageSelect = handleContentImageSelect;
window.confirmCrop = confirmCrop;
window.cancelCrop = cancelCrop;
window.saveFooterContacto = saveFooterContacto;
window.addSocialRow = addSocialRow;
window.saveHero = saveHero;