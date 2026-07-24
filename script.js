import { db, collection, getDocs } from './firebase-config.js';

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

async function renderProperties(filter = 'todos') {
    const grid = document.getElementById('properties-grid');
    if (!grid) return;
    
    grid.innerHTML = '<p style="text-align: center; width: 100%; padding: 20px;">Cargando propiedades...</p>';
    const properties = await getPropertiesFromFirebase();
    grid.innerHTML = '';
    
   const filteredProperties = properties.filter(prop => {
    const matchesFilter = filter === 'todos' || prop.category === filter;
    const notSold = (prop.status || 'disponible') !== 'vendido';
    return matchesFilter && notSold;
});

    if (filteredProperties.length === 0) {
        const categoryNames = {
            todos: 'propiedades',
            casas: 'casas',
            terrenos: 'terrenos',
            campos: 'campos',
            locales: 'locales',
            alquileres: 'alquileres'
        };
        const nombreCategoria = categoryNames[filter] || 'propiedades';
        grid.innerHTML = `<p style="text-align: center; width: 100%; padding: 40px 20px; color: #666; font-size: 16px;">😕 No hay ${nombreCategoria} disponibles en este momento.<br><small style="color:#999;">Volvé a intentar más tarde o consultanos por WhatsApp.</small></p>`;
        return;
    }

    filteredProperties.forEach(prop => {
            const featuresArray = Array.isArray(prop.features) ? prop.features : (prop.features ? prop.features.split(',').map(f => f.trim()) : []);
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
                        <i class="fab fa-whatsapp"></i> Ver detalles
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
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderProperties(e.target.getAttribute('data-filter'));
        document.getElementById('propiedades').scrollIntoView({ behavior: 'smooth' });
    }
});

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
    const trigger = e.target.closest('.modal-trigger');
    if (!trigger) return;
    
    e.preventDefault();
    const card = trigger.closest('.property-card');
    const category = card.getAttribute('data-category');

    const banner = document.getElementById('shared-property-banner');
    if (banner) banner.style.display = 'none';
    
    const imagesAttr = card.getAttribute('data-images');
    currentImages = imagesAttr ? JSON.parse(imagesAttr) : [card.getAttribute('data-image')];
    currentSlide = 0;
    updateModalImage();
    
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

    document.querySelectorAll('.fade-in-element').forEach(el => observer.observe(el));
}

// =========================================
// 7. INICIALIZAR
// =========================================
window.addEventListener('DOMContentLoaded', async () => {
    await renderProperties('todos');
    checkForSharedProperty();
});

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