import { db, collection, getDocs, doc, getDoc } from './firebase-config.js';

// =========================================
// FUNCIONES INTELIGENTES PARA PROCESAR URLS
// =========================================

function processYoutubeUrl(url) {
    if (!url) return '';
    url = url.trim();
    
    const iframeMatch = url.match(/src=["'](.*?)["']/);
    if (iframeMatch) url = iframeMatch[1];
    
    if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
       return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    
    if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1].split('&')[0];
       return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    
    if (url.includes('youtube.com/embed/')) {
        return url;
    }
    
    return url;
}

function processMapUrl(url) {
    if (!url) return '';
    url = url.trim();
    
    const iframeMatch = url.match(/src=["'](.*?)["']/);
    if (iframeMatch) url = iframeMatch[1];
    
    if (url.includes('maps.app.goo.gl')) {
        return 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14480.78840488428!2d-55.7308!3d-24.0694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94544a5c5e5e5e5f%3A0x0!2sCuruguaty!5e0!3m2!1ses!2spy!4v1234567890';
    }
    
    if (url.includes('/embed')) return url;
    
    if (url.includes('google.com/maps')) {
        const placeMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (placeMatch) {
            const lat = placeMatch[1];
            const lng = placeMatch[2];
            return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3600!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${lat}, ${lng}!5e0!3m2!1ses!2spy!4v1234567890`;
        }
    }
    
    return url;
}

function processMatterportUrl(url) {
    if (!url) return '';
    url = url.trim();
    
    const iframeMatch = url.match(/src=["'](.*?)["']/);
    if (iframeMatch) url = iframeMatch[1];
    
    if (url.includes('matterport.com')) return url;
    
    return url;
}

// =========================================
// 2. MENÚ HAMBURGUESA
// =========================================
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');
if (menuToggle && navLinks) {
    const menuIcon = menuToggle.querySelector('i');
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);

    function updateIcon() {
        if (menuToggle.classList.contains('active')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times');
        } else {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars');
        }
    }

    function closeMenu() {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        overlay.classList.remove('active');
        updateIcon();
    }

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        overlay.classList.toggle('active');
        updateIcon();
    });

    overlay.addEventListener('click', closeMenu);
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
}

// =========================================
// 3. CARGA DINÁMICA DESDE FIREBASE
// =========================================
async function getPropertiesFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "propiedades"));
        const properties = [];
        querySnapshot.forEach((doc) => properties.push({ id: doc.id, ...doc.data() }));
        return properties;
    } catch (error) {
        console.error("Error leyendo Firebase:", error);
        return [];
    }
}

let currentFilters = {
    tipoCompra: 'compra',
    categoria: 'todos',
    dormitorios: '',
    ordenPrecio: '',
    texto: ''
};

async function renderProperties() {
    const grid = document.getElementById('properties-grid');
    if (!grid) return;
    
    grid.innerHTML = '<p style="text-align: center; width: 100%; padding: 20px;">Cargando propiedades...</p>';
    const properties = await getPropertiesFromFirebase();
    grid.innerHTML = '';

    const filteredProperties = properties.filter(prop => {
        const notSold = (prop.status || 'disponible') !== 'vendido';
        if (!notSold) return false;

        if (currentFilters.tipoCompra === 'alquiler') {
            if (prop.category !== 'alquileres') return false;
        } else {
            if (prop.category === 'alquileres') return false;
            if (currentFilters.categoria !== 'todos' && prop.category !== currentFilters.categoria) return false;
        }

        if (currentFilters.dormitorios !== '') {
            const min = parseInt(currentFilters.dormitorios);
            if (prop.dormitorios === null || prop.dormitorios === undefined || prop.dormitorios < min) return false;
        }

     if (currentFilters.texto) {
            const texto = currentFilters.texto.toLowerCase();
            const coincide = (prop.title || '').toLowerCase().includes(texto) || (prop.address || '').toLowerCase().includes(texto);
            if (!coincide) return false;
        }

        return true;
    });

    if (currentFilters.ordenPrecio === 'asc' || currentFilters.ordenPrecio === 'desc') {
        filteredProperties.sort((a, b) => {
            const precioA = a.priceUSD ?? a.priceGS ?? 0;
            const precioB = b.priceUSD ?? b.priceGS ?? 0;
            return currentFilters.ordenPrecio === 'asc' ? precioA - precioB : precioB - precioA;
        });
    }

    if (filteredProperties.length === 0) {
        grid.innerHTML = `<p style="text-align: center; width: 100%; padding: 40px 20px; color: #666; font-size: 16px;">😕 No hay propiedades que coincidan con tu búsqueda.<br><small style="color:#999;">Probá ajustar los filtros o consultanos por WhatsApp.</small></p>`;
        return;
    }

    filteredProperties.forEach(prop => {
            const featuresArray = Array.isArray(prop.features) ? prop.features : (prop.features ? prop.features.split(',').map(f => f.trim()) : []);
            if (prop.dormitorios !== null && prop.dormitorios !== undefined) {
                const textoDorm = prop.dormitorios === 0 ? 'Monoambiente' : `${prop.dormitorios}${prop.dormitorios === 5 ? '+' : ''} Dormitorio${prop.dormitorios === 1 ? '' : 's'}`;
                featuresArray.unshift(textoDorm);
            }
            const featuresHTML = featuresArray.map(f => `<span>${f}</span>`).join(' • ');
           const card = document.createElement('div');
card.className = 'property-card fade-in-element';
card.setAttribute('data-id', prop.id);
card.setAttribute('data-category', prop.category);
card.setAttribute('data-title', prop.title);
            card.setAttribute('data-price', prop.price);
            card.setAttribute('data-image', prop.image);
            card.setAttribute('data-images', JSON.stringify(prop.images || [prop.image]));
            card.setAttribute('data-description', prop.description);
            card.setAttribute('data-features', JSON.stringify(featuresArray));
            card.setAttribute('data-whatsapp', `https://wa.me/595994272727?text=Hola,%20me%20interesa%20${encodeURIComponent(prop.title)}`);
            card.setAttribute('data-map', prop.map);
            card.setAttribute('data-youtube', prop.youtube ? processYoutubeUrl(prop.youtube) : '');
            card.setAttribute('data-matterport', prop.matterport ? processMatterportUrl(prop.matterport) : '');
            
let badgeHTML = '';
if (prop.status === 'reservado') {
    badgeHTML = `<span class="property-badge badge-reservado">RESERVADO</span>`;
} else if (prop.badge) {
    const badgeTexts = {
        'oferta': 'OFERTA', 'nuevo': 'NUEVO', 'exclusivo': 'EXCLUSIVO',
        'urgente': 'OPORTUNIDAD', 'acceso': 'ACCESO ANTICIPADO', 'popular': 'MÁS VENDIDO'
    };
    badgeHTML = `<span class="property-badge badge-${prop.badge}">${badgeTexts[prop.badge] || prop.badge}</span>`;
}

            let iconsHTML = '';
            if (prop.youtube || prop.matterport) {
                iconsHTML = '<div class="property-icons">';
                if (prop.youtube) iconsHTML += '<span><i class="fas fa-video"></i> Video</span>';
                if (prop.matterport) iconsHTML += '<span><i class="fas fa-cube"></i> 360°</span>';
                iconsHTML += '</div>';
            }

card.innerHTML = `
    ${badgeHTML}
    <div class="property-price">${prop.price}</div>
    <div class="property-image-wrapper">
        <img src="${prop.image}" alt="${prop.title}" loading="lazy">
        <button class="share-btn" type="button" title="Compartir">
            <i class="fas fa-share-alt"></i>
        </button>
    </div>
    <div class="property-info">
                    <h3>${prop.title}</h3>
                    <p>${featuresHTML}</p>
                    ${iconsHTML}
                    <button class="btn-whatsapp modal-trigger">
                        <i class="fas fa-eye"></i> Ver detalles
                    </button>
                </div>
            `;
grid.appendChild(card);
    });

    initScrollAnimations();
}

// =========================================
// 4. FILTRADO
// =========================================
const toggleComprar = document.getElementById('toggle-comprar');
const toggleAlquilar = document.getElementById('toggle-alquilar');
const filterTipoPropiedad = document.getElementById('filter-tipo-propiedad');
const filterDormitorios = document.getElementById('filter-dormitorios');
const filterSearchInput = document.getElementById('filter-search-input');
const filterSearchBtn = document.getElementById('filter-search-btn');
const filterPriceSort = document.getElementById('filter-price-sort');
function aplicarFiltrosYScroll() {
    renderProperties();
    document.getElementById('propiedades').scrollIntoView({ behavior: 'smooth' });
}

if (toggleComprar && toggleAlquilar) {
    toggleComprar.addEventListener('click', () => {
        currentFilters.tipoCompra = 'compra';
        toggleComprar.classList.add('active');
        toggleAlquilar.classList.remove('active');
        filterTipoPropiedad.style.display = '';
        aplicarFiltrosYScroll();
    });
    toggleAlquilar.addEventListener('click', () => {
        currentFilters.tipoCompra = 'alquiler';
        toggleAlquilar.classList.add('active');
        toggleComprar.classList.remove('active');
        filterTipoPropiedad.style.display = 'none';
        aplicarFiltrosYScroll();
    });
}

if (filterTipoPropiedad) {
    filterTipoPropiedad.addEventListener('change', () => {
        currentFilters.categoria = filterTipoPropiedad.value;
        aplicarFiltrosYScroll();
    });
}

if (filterDormitorios) {
    filterDormitorios.addEventListener('change', () => {
        currentFilters.dormitorios = filterDormitorios.value;
        aplicarFiltrosYScroll();
    });
}

if (filterSearchBtn) {
    filterSearchBtn.addEventListener('click', () => {
        currentFilters.texto = filterSearchInput.value.trim();
        aplicarFiltrosYScroll();
    });
}

if (filterSearchInput) {
    filterSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentFilters.texto = filterSearchInput.value.trim();
            aplicarFiltrosYScroll();
        }
    });
}

if (filterPriceSort) {
    filterPriceSort.addEventListener('change', () => {
        currentFilters.ordenPrecio = filterPriceSort.value;
        aplicarFiltrosYScroll();
    });
}

// =========================================
// 4.5. BOTÓN DE COMPARTIR
// =========================================
document.getElementById('properties-grid')?.addEventListener('click', async (e) => {
    const shareBtn = e.target.closest('.share-btn');
    if (!shareBtn) return;
    
    e.stopPropagation(); // Evita que abra el modal de la propiedad
    
    const card = shareBtn.closest('.property-card');
    const title = card.getAttribute('data-title');
    const price = card.getAttribute('data-price');
    const propId = card.getAttribute('data-id');
    const shareText = `${title} - ${price}`;
    
    // Armamos un link directo a esta propiedad específica
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?propiedad=${propId}`;
    
    if (navigator.share) {
        try {
            await navigator.share({ title: title, text: shareText, url: shareUrl });
        } catch (err) {
            // El usuario canceló el share, no hacemos nada
        }
    } else {
        try {
            await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            shareBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
            }, 1500);
        } catch (err) {
            alert('No se pudo copiar el link. Copialo manualmente: ' + shareUrl);
        }
    }
});

// =========================================
// 5. MODAL DE PROPIEDAD CON CARRUSEL Y BOTONES FLOTANTES
// =========================================
const modal = document.getElementById('property-modal');
const modalClose = document.getElementById('modal-close');
const offerBtn = document.getElementById('modal-offer-btn');
const modalImage = document.getElementById('modal-image');
const modalPrice = document.getElementById('modal-price');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalFeatures = document.getElementById('modal-features');
const modalWhatsapp = document.getElementById('modal-whatsapp');
const modalMapIframe = document.getElementById('modal-map-iframe');
const sliderDots = document.getElementById('slider-dots');

let currentImages = [];
let currentSlide = 0;

function updateModalImage() {
    if (currentImages.length === 0) return;
    modalImage.src = currentImages[currentSlide];
    
    sliderDots.innerHTML = '';
    currentImages.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = `slider-dot ${index === currentSlide ? 'active' : ''}`;
        dot.onclick = () => { currentSlide = index; updateModalImage(); };
        sliderDots.appendChild(dot);
    });

    const arrows = document.querySelectorAll('.slider-btn');
    arrows.forEach(arrow => { arrow.style.display = currentImages.length > 1 ? 'flex' : 'none'; });
}

window.changeSlide = function(direction) {
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = currentImages.length - 1;
    if (currentSlide >= currentImages.length) currentSlide = 0;
    updateModalImage();
};

document.querySelector('.properties')?.addEventListener('click', (e) => {
    const card = e.target.closest('.property-card');
    if (!card) return;
    
    e.preventDefault();
    const category = card.getAttribute('data-category');

    const banner = document.getElementById('shared-property-banner');
    if (banner) banner.style.display = 'none';
    
   const imagesAttr = card.getAttribute('data-images');
    currentImages = imagesAttr ? JSON.parse(imagesAttr) : [card.getAttribute('data-image')];
    currentSlide = 0;
    updateModalImage();

// Precarga todas las fotos de esta propiedad en segundo plano
    currentImages.forEach(url => {
        const img = new Image();
        img.src = url;
    });
    
    modalPrice.textContent = card.getAttribute('data-price');
    modalTitle.textContent = card.getAttribute('data-title');
    modalDescription.textContent = card.getAttribute('data-description');
    modalWhatsapp.href = card.getAttribute('data-whatsapp');
    modalMapIframe.src = card.getAttribute('data-map');
    
    const features = JSON.parse(card.getAttribute('data-features'));
    modalFeatures.innerHTML = features.map(feature => `<div class="feature"><i class="fas fa-check-circle"></i><span>${feature}</span></div>`).join('');
    
    // Mostrar/ocultar botones flotantes de Video y 3D Tour
    const mediaButtons = document.getElementById('modal-media-buttons');
    const videoBtn = document.getElementById('modal-video-btn-float');
    const tourBtn = document.getElementById('modal-tour-btn-float');
    
    if (mediaButtons && videoBtn && tourBtn) {
        const youtubeUrl = card.getAttribute('data-youtube');
        const matterportUrl = card.getAttribute('data-matterport');
        let hasMedia = false;
        
        if (youtubeUrl) {
            videoBtn.style.display = 'flex';
            videoBtn.onclick = () => openIntegratedMedia(youtubeUrl, 'video');
            hasMedia = true;
        } else {
            videoBtn.style.display = 'none';
        }
        
        if (matterportUrl) {
            tourBtn.style.display = 'flex';
            tourBtn.onclick = () => openIntegratedMedia(matterportUrl, 'tour');
            hasMedia = true;
        } else {
            tourBtn.style.display = 'none';
        }
        
        mediaButtons.style.display = hasMedia ? 'flex' : 'none';
    }
    
    if (offerBtn) {
        offerBtn.style.display = (category === 'alquileres') ? 'none' : 'flex';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

function closeModal() { 
    modal.classList.remove('active'); 
    document.body.style.overflow = 'auto'; 
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}
document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') {
        if (modal?.classList.contains('active')) closeModal();
        closeIntegratedMedia();
    }
});

if (offerBtn) {
    offerBtn.addEventListener('click', () => {
        document.getElementById('offer-input').value = '';
        document.getElementById('offer-modal').style.display = 'flex';
    });
}

window.closeOfferModal = function() {
    document.getElementById('offer-modal').style.display = 'none';
};

window.submitOffer = function() {
    const offerAmount = document.getElementById('offer-input').value.trim();
    if (offerAmount === '') {
        document.getElementById('offer-input').focus();
        return;
    }
    const message = `Hola Rubén, quiero hacer una oferta de ${offerAmount} por la propiedad: ${modalTitle.textContent}. ¿Podemos conversar?`;
    window.open(`https://wa.me/595994272727?text=${encodeURIComponent(message)}`, '_blank');
    document.getElementById('offer-modal').style.display = 'none';
};

// =========================================
// 6. MODAL INTEGRADO DE VIDEO/TOUR (Estilo Redfin)
// =========================================
window.openIntegratedMedia = function(url, type) {
    const modal = document.getElementById('integrated-media-modal');
    const iframe = document.getElementById('integrated-media-iframe');
    if (modal && iframe) {
        iframe.src = url;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeIntegratedMedia = function() {
    const mediaModal = document.getElementById('integrated-media-modal');
    const iframe = document.getElementById('integrated-media-iframe');
    const propModal = document.getElementById('property-modal');
    
    if (mediaModal) mediaModal.classList.remove('active');
    if (iframe) iframe.src = ''; // Esto detiene el video/tour inmediatamente
    
    // Solo restauramos el scroll si el modal de propiedad TAMBIÉN está cerrado
    if (propModal && !propModal.classList.contains('active')) {
        document.body.style.overflow = 'auto';
    }
};

// =========================================
// ANIMACIONES DE APARICIÓN AL HACER SCROLL
// =========================================
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.fade-in-element').forEach(el => {
        observer.observe(el);
        // Red de seguridad: si el detector de scroll no llega a activarse,
        // mostramos el contenido igual después de 1.5 segundos.
        setTimeout(() => {
            el.classList.add('visible');
        }, 1500);
    });
}

// =========================================
// 7. INICIALIZAR
// =========================================
window.addEventListener('DOMContentLoaded', async () => {
    initScrollAnimations(); // Activa las animaciones (como "Sobre Nosotros") sin esperar a Firebase
    await renderProperties();
    renderFaqs();
    loadContenido();
    checkForSharedProperty();
});

async function loadContenido() {
    try {
        const docSnap = await getDoc(doc(db, 'contenido', 'sobre-nosotros'));
        if (!docSnap.exists()) return; // No hay personalización todavía: se queda el contenido actual del sitio

        const data = docSnap.data();
        if (data.subtitle) document.getElementById('about-subtitle').textContent = data.subtitle;
        if (data.title) document.getElementById('about-title').textContent = data.title;
        if (data.text) document.getElementById('about-text').textContent = data.text;
        if (data.feature1Title) document.getElementById('about-feature1-title').textContent = data.feature1Title + ':';
        if (data.feature1Text) document.getElementById('about-feature1-text').textContent = data.feature1Text;
        if (data.feature2Title) document.getElementById('about-feature2-title').textContent = data.feature2Title + ':';
        if (data.feature2Text) document.getElementById('about-feature2-text').textContent = data.feature2Text;
        if (data.feature3Title) document.getElementById('about-feature3-title').textContent = data.feature3Title + ':';
        if (data.feature3Text) document.getElementById('about-feature3-text').textContent = data.feature3Text;
        if (data.image) document.getElementById('about-image').src = data.image;
        if (data.footerText) document.getElementById('footer-description').textContent = data.footerText;
    } catch (error) {
        console.error('Error cargando personalización:', error);
    }
}

// =========================================
// 8. ABRIR PROPIEDAD DIRECTO DESDE UN LINK COMPARTIDO
// =========================================
function checkForSharedProperty() {
    const params = new URLSearchParams(window.location.search);
    const propId = params.get('propiedad');
    if (!propId) return;

    const card = document.querySelector(`.property-card[data-id="${propId}"]`);
    if (card) {
        const trigger = card.querySelector('.modal-trigger');
        if (trigger) trigger.click();

        const banner = document.getElementById('shared-property-banner');
        if (banner) banner.style.display = 'block';
    }
}

// =========================================
// 9. FORMULARIO DE CONTACTO (envía por correo)
// =========================================
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre = document.getElementById('contact-name').value.trim();
        const telefono = document.getElementById('contact-phone').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const mensaje = document.getElementById('contact-message').value.trim();

        const asunto = `Consulta de ${nombre} - Urbana Propiedades`;
        let cuerpo = `${mensaje}\n\nMi teléfono: ${telefono}`;
        if (email) cuerpo += `\nMi email: ${email}`;

        const url = `mailto:urbanapropiedades.py@gmail.com?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
        window.location.href = url;

        contactForm.reset();
    });
}

// =========================================
// LIGHTBOX DE IMÁGENES (ZOOM, ARRASTRE Y DESLIZAR)
// =========================================
const lightbox = document.getElementById('image-lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxWrapper = document.getElementById('lightbox-image-wrapper');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxCounter = document.getElementById('lightbox-counter');

let lbScale = 1;
let lbPosX = 0;
let lbPosY = 0;
let lbStartDistance = 0;
let lbStartScale = 1;
let lbDragging = false;
let lbStartX = 0;
let lbStartY = 0;
let lbLastPosX = 0;
let lbLastPosY = 0;
let lbSwipeStartX = 0;
let lbLastTapTime = 0;

function lbApplyTransform() {
    lightboxImage.style.transform = `translate(${lbPosX}px, ${lbPosY}px) scale(${lbScale})`;
}

function lbResetZoom() {
    lbScale = 1;
    lbPosX = 0;
    lbPosY = 0;
    lbApplyTransform();
}

function lbUpdateImage() {
    if (currentImages.length === 0) return;
    lightboxImage.src = currentImages[currentSlide];
    lightboxCounter.textContent = `${currentSlide + 1} / ${currentImages.length}`;
    lbResetZoom();
    const multiples = currentImages.length > 1;
    lightboxPrev.style.display = multiples ? 'flex' : 'none';
    lightboxNext.style.display = multiples ? 'flex' : 'none';
}

function openLightbox() {
    lightbox.classList.add('active');
    lbUpdateImage();
}

function closeLightbox() {
    lightbox.classList.remove('active');
    lbResetZoom();
}

if (modalImage) {
    modalImage.style.cursor = 'zoom-in';
    modalImage.addEventListener('click', openLightbox);
}

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => {
        changeSlide(-1);
        lbUpdateImage();
    });
}

if (lightboxNext) {
    lightboxNext.addEventListener('click', () => {
        changeSlide(1);
        lbUpdateImage();
    });
}

// Zoom con rueda del mouse (desktop)
if (lightboxWrapper) {
    lightboxWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        lbScale = Math.min(4, Math.max(1, lbScale + delta));
        if (lbScale === 1) { lbPosX = 0; lbPosY = 0; }
        lbApplyTransform();
    }, { passive: false });

    // Doble click para zoom (desktop)
    lightboxWrapper.addEventListener('dblclick', () => {
        if (lbScale > 1) {
            lbResetZoom();
        } else {
            lbScale = 2.5;
            lbApplyTransform();
        }
    });

    // Arrastre con mouse cuando hay zoom (desktop)
    lightboxWrapper.addEventListener('mousedown', (e) => {
        if (lbScale <= 1) return;
        lbDragging = true;
        lightboxImage.classList.add('dragging');
        lbStartX = e.clientX - lbPosX;
        lbStartY = e.clientY - lbPosY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!lbDragging) return;
        lbPosX = e.clientX - lbStartX;
        lbPosY = e.clientY - lbStartY;
        lbApplyTransform();
    });

    window.addEventListener('mouseup', () => {
        lbDragging = false;
        lightboxImage.classList.remove('dragging');
    });

    // =========================================
    // TOUCH: pellizcar para zoom, arrastrar, deslizar y doble toque
    // =========================================
    lightboxWrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lbStartDistance = Math.sqrt(dx * dx + dy * dy);
            lbStartScale = lbScale;
        } else if (e.touches.length === 1) {
            lbSwipeStartX = e.touches[0].clientX;
            if (lbScale > 1) {
                lbDragging = true;
                lightboxImage.classList.add('dragging');
                lbLastPosX = e.touches[0].clientX - lbPosX;
                lbLastPosY = e.touches[0].clientY - lbPosY;
            }

            // Detectar doble toque
            const now = Date.now();
            if (now - lbLastTapTime < 300) {
                if (lbScale > 1) {
                    lbResetZoom();
                } else {
                    lbScale = 2.5;
                    lbApplyTransform();
                }
            }
            lbLastTapTime = now;
        }
    }, { passive: true });

    lightboxWrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            lbScale = Math.min(4, Math.max(1, lbStartScale * (distance / lbStartDistance)));
            lightboxImage.classList.add('dragging');
            lbApplyTransform();
        } else if (e.touches.length === 1 && lbDragging && lbScale > 1) {
            e.preventDefault();
            lbPosX = e.touches[0].clientX - lbLastPosX;
            lbPosY = e.touches[0].clientY - lbLastPosY;
            lbApplyTransform();
        }
    }, { passive: false });

    lightboxWrapper.addEventListener('touchend', (e) => {
        lightboxImage.classList.remove('dragging');
        lbDragging = false;

        // Si no hay zoom, detectar deslizamiento para cambiar de foto
        if (lbScale <= 1 && e.changedTouches.length === 1) {
            const diff = e.changedTouches[0].clientX - lbSwipeStartX;
            if (Math.abs(diff) > 60 && currentImages.length > 1) {
                changeSlide(diff > 0 ? -1 : 1);
                lbUpdateImage();
            }
        }

        // Si quedó con zoom menor a 1 por algún motivo, reseteamos
        if (lbScale < 1) lbResetZoom();
    });
}

// Cerrar con la tecla Escape también
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox?.classList.contains('active')) {
        closeLightbox();
    }
});
async function renderFaqs() {
    const faqList = document.getElementById('faq-list');
    if (!faqList) return;

    try {
        const querySnapshot = await getDocs(collection(db, "preguntas"));
        const faqs = [];
        querySnapshot.forEach((doc) => faqs.push({ id: doc.id, ...doc.data() }));

        if (faqs.length === 0) {
            faqList.innerHTML = '';
            document.getElementById('preguntas-frecuentes').style.display = 'none';
            return;
        }

        faqList.innerHTML = faqs.map(faq => `
            <div class="faq-item">
                <button class="faq-question">
                    <span>${faq.question}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="faq-answer">
                    <p>${faq.answer}</p>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.faq-item');
                const yaEstaAbierto = item.classList.contains('active');
                document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
                if (!yaEstaAbierto) item.classList.add('active');
            });
        });
    } catch (error) {
        console.error("Error cargando preguntas frecuentes:", error);
    }
}