    const productData = window.productData || {};
    const hasVariants = Array.isArray(productData.variants) && productData.variants.length > 0;
    let selectedColor = document.getElementById('selectedColor') ? document.getElementById('selectedColor').value : '';
    let selectedSize = document.getElementById('selectedSize') ? document.getElementById('selectedSize').value : '';

    function findCurrentVariant() {
        return productData.variants.find(v => v.color === selectedColor && v.size === selectedSize);
    }

    function updateGallery(images) {
        const thumbnailGallery = document.getElementById('thumbnailGallery');
        if (!images || images.length === 0) {
            thumbnailGallery.innerHTML = '<p class="text-sm text-red-500">No images available.</p>';
            return;
        }
        const first = images[0];
        document.getElementById('visibleImage').src = first;
    }

    function updateStock(variant) {
        const stockMessage = document.getElementById('stockMessage');
        const addToCartBtn = document.getElementById('addToCartBtn');
        if (!variant) {
            stockMessage.textContent = 'Variant unavailable';
            stockMessage.className = 'mt-3 text-sm text-red-600 font-medium';
            addToCartBtn.disabled = true;
        } else if (variant.stock > 0) {
            stockMessage.textContent = `In Stock: ${variant.stock} units`;
            stockMessage.className = 'mt-3 text-sm text-green-600 font-medium';
            addToCartBtn.disabled = false;
        } else {
            stockMessage.textContent = 'Out of Stock';
            stockMessage.className = 'mt-3 text-sm text-red-600 font-medium';
            addToCartBtn.disabled = true;
        }
    }

    window.selectColor = function(color) {
        selectedColor = color;
        document.getElementById('selectedColor').value = color;
        document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active-color'));
        document.querySelector(`.color-option[data-color="${color}"]`).classList.add('active-color');

        const colorVariants = productData.variants.filter(v => v.color === color);
        document.querySelectorAll('.size-option').forEach(btn => {
            if (colorVariants.some(v => v.size === btn.dataset.size)) {
                btn.classList.remove('hidden');
                btn.classList.remove('disabled-option');
            } else {
                btn.classList.add('hidden');
                btn.classList.add('disabled-option');
                btn.classList.remove('active-size');
            }
        });

        const firstVariant = colorVariants[0];
        if (firstVariant) {
            selectedSize = firstVariant.size;
            document.getElementById('selectedSize').value = selectedSize;
            document.querySelector(`.size-option[data-size="${selectedSize}"]`)?.classList.add('active-size');
            updateGallery(firstVariant.images);
            updateStock(firstVariant);
        } else {
            updateStock(null);
        }
    };

    window.selectSize = function(size) {
        selectedSize = size;
        document.getElementById('selectedSize').value = size;
        document.querySelectorAll('.size-option').forEach(s => s.classList.remove('active-size'));
        document.querySelector(`.size-option[data-size="${size}"]`).classList.add('active-size');
        updateStock(findCurrentVariant());
    };

    window.changeMainImage = function(src) {
        document.getElementById('visibleImage').src = src;
        document.getElementById('mainImage').style.backgroundImage = `url('${src}')`;
    };

    window.zoom = function(e) {
        const mainImage = document.getElementById('mainImage');
        const zoomContainer = document.getElementById('zoomContainer');
        const rect = zoomContainer.getBoundingClientRect();
        mainImage.style.opacity = '1';
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        mainImage.style.backgroundSize = `${rect.width * 2.5}px ${rect.height * 2.5}px`;
        mainImage.style.backgroundPosition = `-${x * rect.width * 1.5}px -${y * rect.height * 1.5}px`;
    };

    window.hideZoom = function() {
        document.getElementById('mainImage').style.opacity = '0';
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!hasVariants) return;

        let quantity = 1;
        const quantityDisplay = document.getElementById('quantityDisplay');
        const incrementBtn = document.getElementById('incrementBtn');
        const decrementBtn = document.getElementById('decrementBtn');

        function updateQuantity(newQty) {
            const variant = findCurrentVariant();
            const maxStock = variant ? variant.stock : 1;
            quantity = Math.max(1, Math.min(newQty, maxStock));
            quantityDisplay.textContent = quantity;
        }

        incrementBtn.addEventListener('click', () => updateQuantity(quantity + 1));
        decrementBtn.addEventListener('click', () => updateQuantity(quantity - 1));
        updateStock(findCurrentVariant());
    });
