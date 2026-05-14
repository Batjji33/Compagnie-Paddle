// popup.js - Gestion du popup d'accueil
(async function() {
    // Ne s'affiche qu'une seule fois par session
    if (sessionStorage.getItem('popupShown') === 'true') return;

    try {
        // Charger les paramètres du popup
        const { data: settings, error: settingsErr } = await supabaseClient
            .from('popup_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (settingsErr || !settings || !settings.is_active) return;

        const popup = document.getElementById('welcomePopup');
        const offerSection = document.getElementById('popupOfferSection');
        const slotsSection = document.getElementById('popupSlotsSection');
        let hasContent = false;

        // Section Offre du moment
        if (settings.offer_text && settings.offer_text.trim() !== '') {
            document.getElementById('popupOfferText').textContent = settings.offer_text;
            offerSection.style.display = 'block';
            hasContent = true;
        }

        // Section Prochaines excursions
        const maxSlots = settings.max_slots || 5;
        const today = new Date().toISOString().split('T')[0];

        const { data: slots, error: slotsErr } = await supabaseClient
            .from('slots')
            .select('id, excursion_type, date, time')
            .eq('is_booked', false)
            .gte('date', today)
            .order('date', { ascending: true })
            .order('time', { ascending: true })
            .limit(maxSlots);

        if (!slotsErr && slots && slots.length > 0) {
            // Charger les noms des excursions
            const excIds = [...new Set(slots.map(s => s.excursion_type))];
            const { data: excursions } = await supabaseClient
                .from('excursions')
                .select('id, titre')
                .in('id', excIds)
                .neq('is_visible', false);

            const excMap = {};
            if (excursions) excursions.forEach(e => { excMap[e.id] = e.titre; });

            const slotsList = document.getElementById('popupSlotsList');
            slotsList.innerHTML = '';

            slots.forEach(slot => {
                const excName = excMap[slot.excursion_type] || 'Excursion';
                if (!excMap[slot.excursion_type]) return; // skip if excursion is hidden

                const dateObj = new Date(slot.date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                const timeStr = slot.time.substring(0, 5);

                const item = document.createElement('div');
                item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--off-white); border-radius:8px; padding:12px 16px; border-left:3px solid var(--blue-ocean);';
                item.innerHTML = `
                    <div>
                        <strong style="color:var(--blue-marine); font-family:var(--font-subtitle);">${excName}</strong><br>
                        <span style="font-size:0.9rem; color:var(--gray-text);">${dateStr} à ${timeStr}</span>
                    </div>
                    <a href="excursions.html" style="background:var(--blue-ocean); color:white; padding:7px 14px; border-radius:6px; font-size:0.85rem; font-weight:600; text-decoration:none; white-space:nowrap; margin-left:10px;">Réserver</a>
                `;
                slotsList.appendChild(item);
            });

            if (slotsList.children.length > 0) {
                slotsSection.style.display = 'block';
                hasContent = true;
            }
        }

        if (!hasContent) return;

        // Afficher le popup
        popup.style.display = 'flex';
        sessionStorage.setItem('popupShown', 'true');

        // Fermer le popup
        document.getElementById('closePopup').addEventListener('click', () => {
            popup.style.display = 'none';
        });

        // Fermer en cliquant sur l'arrière-plan
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        });

    } catch (err) {
        console.error('Popup error:', err);
    }
})();
