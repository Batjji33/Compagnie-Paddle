// excursions-banner.js - Charge et affiche le bandeau dynamique sur la page excursions
(async function() {
    const bannerEl = document.getElementById('excursions-banner');
    if (!bannerEl) return;

    try {
        const { data, error } = await supabaseClient
            .from('excursions_banner')
            .select('*')
            .eq('is_visible', true)
            .limit(1)
            .maybeSingle();

        if (error || !data) return;

        const bgColor = data.couleur || '#0A2342';
        // Determine text color based on brightness
        const r = parseInt(bgColor.slice(1, 3), 16);
        const g = parseInt(bgColor.slice(3, 5), 16);
        const b = parseInt(bgColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const textColor = brightness > 128 ? '#0A2342' : '#FFFFFF';
        const subTextColor = brightness > 128 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';

        bannerEl.style.display = 'block';
        bannerEl.style.backgroundColor = bgColor;
        bannerEl.style.padding = '40px 20px';
        bannerEl.style.marginBottom = '0';

        let html = `<div style="max-width:1100px; margin:0 auto; display:flex; flex-wrap:wrap; gap:30px; align-items:center;">`;

        if (data.image_url) {
            html += `
                <div style="flex:1; min-width:250px; max-width:450px;">
                    <img src="${data.image_url}" alt="${data.titre || 'Plan des traversées'}" 
                         style="width:100%; border-radius:10px; box-shadow:0 8px 25px rgba(0,0,0,0.3); object-fit:cover; max-height:300px;">
                </div>
            `;
        }

        html += `<div style="flex:1; min-width:250px;">`;
        if (data.titre) {
            html += `<h2 style="color:${textColor}; font-family:var(--font-title); font-size:1.8rem; margin-bottom:15px; text-align:left;">${data.titre}</h2>`;
        }
        if (data.description) {
            html += `<p style="color:${subTextColor}; line-height:1.7; white-space:pre-wrap; font-size:1rem;">${data.description}</p>`;
        }
        html += `</div></div>`;

        bannerEl.innerHTML = html;

    } catch (err) {
        console.error('Banner error:', err);
    }
})();
