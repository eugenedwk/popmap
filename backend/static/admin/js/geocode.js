// Geocoding functionality for Django admin
(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        // Only run on Event add/change pages
        if (!document.querySelector('#id_address')) {
            return;
        }

        // Create geocode button
        const addressField = document.querySelector('#id_address');
        const latField = document.querySelector('#id_latitude');
        const lonField = document.querySelector('#id_longitude');

        if (!addressField || !latField || !lonField) {
            return;
        }

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'geocode-button-container';
        buttonContainer.style.marginTop = '10px';

        // Create geocode button
        const geocodeBtn = document.createElement('button');
        geocodeBtn.type = 'button';
        geocodeBtn.className = 'geocode-button';
        geocodeBtn.textContent = '📍 Geocode Address';
        geocodeBtn.style.cssText = 'padding: 8px 16px; background-color: #417690; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';

        // Create status message
        const statusMsg = document.createElement('span');
        statusMsg.className = 'geocode-status';
        statusMsg.style.cssText = 'margin-left: 10px; font-size: 14px;';

        buttonContainer.appendChild(geocodeBtn);
        buttonContainer.appendChild(statusMsg);

        // Insert button after address field
        addressField.parentElement.appendChild(buttonContainer);

        // Geocode button click handler
        geocodeBtn.addEventListener('click', async function() {
            const address = addressField.value.trim();

            if (!address) {
                statusMsg.textContent = '❌ Please enter an address first';
                statusMsg.style.color = 'red';
                return;
            }

            // Disable button and show loading
            geocodeBtn.disabled = true;
            geocodeBtn.textContent = '⏳ Geocoding...';
            statusMsg.textContent = '';

            try {
                // Use OpenStreetMap Nominatim API (free, no API key required)
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Popmap Event Manager'
                    }
                });

                if (!response.ok) {
                    throw new Error('Geocoding request failed');
                }

                const data = await response.json();

                if (data && data.length > 0) {
                    const result = data[0];
                    latField.value = parseFloat(result.lat).toFixed(6);
                    lonField.value = parseFloat(result.lon).toFixed(6);

                    statusMsg.textContent = `✅ Found: ${result.display_name}`;
                    statusMsg.style.color = 'green';
                } else {
                    statusMsg.textContent = '❌ Address not found. Try being more specific.';
                    statusMsg.style.color = 'red';
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                statusMsg.textContent = '❌ Geocoding failed. Please enter coordinates manually.';
                statusMsg.style.color = 'red';
            } finally {
                // Re-enable button
                geocodeBtn.disabled = false;
                geocodeBtn.textContent = '📍 Geocode Address';
            }
        });

        // Add hover effect
        geocodeBtn.addEventListener('mouseenter', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#2e5266';
            }
        });

        geocodeBtn.addEventListener('mouseleave', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#417690';
            }
        });
    });
})();
