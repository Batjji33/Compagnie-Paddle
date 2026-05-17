document.addEventListener('DOMContentLoaded', () => {
    const inlineBookingSection = document.getElementById('inline-booking-section');
    const inlineTitle = document.getElementById('inline-booking-title');
    const inlineSlotsContainer = document.getElementById('inline-slots');
    const inlineStep2 = document.getElementById('inline-step2');
    const inlineSelectedSlotText = document.getElementById('inline-selected-slot-text');
    const inlineBookingForm = document.getElementById('inlineBookingForm');
    const inlineSuccess = document.getElementById('inline-success');
    const btnInlineBack = document.getElementById('btnInlineBack');
    const btnInlineCloseSuccess = document.getElementById('btnInlineCloseSuccess');

    let excursionNames = {};
    let currentExcursion = '';
    const excursionsGrid = document.getElementById('dynamic-excursions-grid');

    if (excursionsGrid) {
        loadExcursionsFrontend();
    }

    async function loadExcursionsFrontend() {
        try {
            const { data, error } = await supabaseClient
                .from('excursions')
                .select('*')
                .neq('is_visible', false)
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true });

            if (error) throw error;

            excursionsGrid.innerHTML = '';
            
            if (data.length === 0) {
                excursionsGrid.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 50px;"><p>Aucune traversée disponible pour le moment.</p></div>';
                return;
            }

            data.forEach(exc => {
                excursionNames[exc.id] = exc.titre;
                
                const card = document.createElement('div');
                card.className = 'excursion-card';
                card.innerHTML = `
                    <img src="${exc.image_url}" alt="${exc.titre}" class="excursion-img">
                    <div class="excursion-content">
                        <span class="excursion-badge">${exc.periode}</span>
                        <h3>${exc.titre}</h3>
                        <div class="price">${exc.tarif}</div>
                        <p>${exc.description}</p>
                        <div class="excursion-info" style="text-align: left; display: flex; gap: 10px; align-items: flex-start;">
                            <i class="ph ph-info" style="margin-top: 3px; color: var(--blue-marine); font-size: 1.1rem;"></i>
                            <p style="font-size: 0.85rem; color: var(--blue-marine); margin-bottom: 0; white-space: pre-wrap; line-height: 1.5;">${exc.infos}</p>
                        </div>
                        <button class="btn btn-primary btn-choose-excursion" data-excursion="${exc.id}" data-title="${exc.titre}">
                            <i class="ph ph-calendar-check"></i> Voir les créneaux
                        </button>
                    </div>
                `;
                excursionsGrid.appendChild(card);
            });

            // Attach listeners to the new buttons
            document.querySelectorAll('.btn-choose-excursion').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const target = e.target.closest('.btn-choose-excursion');
                    currentExcursion = target.getAttribute('data-excursion');
                    const excTitle = target.getAttribute('data-title');

                    inlineTitle.textContent = `Créneaux disponibles – ${excTitle}`;
                    inlineBookingSection.style.display = 'block';
                    inlineStep2.style.display = 'none';
                    inlineSuccess.style.display = 'none';
                    inlineSlotsContainer.style.display = 'grid';

                    inlineSlotsContainer.innerHTML = '<div style="text-align:center; color:var(--gray-text); padding:20px;">Chargement des créneaux...</div>';

                    // Smooth scroll to the booking section
                    setTimeout(() => {
                        inlineBookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);

                    await loadInlineSlots(currentExcursion);
                });
            });

        } catch (err) {
            console.error('Error fetching excursions:', err);
            excursionsGrid.innerHTML = '<div style="color: #dc3545; text-align: center; grid-column: 1 / -1;">Erreur lors du chargement des traversées.</div>';
        }
    }

    async function loadInlineSlots(excursionType) {
        try {
            const { data, error } = await supabaseClient
                .from('slots')
                .select('*')
                .eq('excursion_type', excursionType)
                .eq('is_booked', false)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            if (error) throw error;

            if (data.length === 0) {
                inlineSlotsContainer.innerHTML = '<div style="text-align: center; color: var(--gray-text); padding: 30px; grid-column: 1/-1;"><i class="ph ph-calendar-x" style="font-size:2rem; display:block; margin-bottom:10px;"></i>Aucun créneau disponible pour cette excursion actuellement.</div>';
                return;
            }

            inlineSlotsContainer.innerHTML = '';
            data.forEach(slot => {
                const dateObj = new Date(slot.date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                const timeStr = slot.time.substring(0, 5);

                const slotCard = document.createElement('button');
                slotCard.className = 'slot-card';
                slotCard.innerHTML = `
                    <i class="ph ph-calendar-blank" style="font-size: 1.5rem; color: var(--blue-ocean); margin-bottom: 8px;"></i>
                    <span class="slot-date">${dateStr}</span>
                    <span class="slot-time"><i class="ph ph-clock"></i> ${timeStr}</span>
                    <span class="slot-cta">Réserver ce créneau →</span>
                `;

                slotCard.addEventListener('click', () => {
                    document.getElementById('inlineSlotId').value = slot.id;
                    document.getElementById('inlineExcursionType').value = excursionType;
                    inlineSelectedSlotText.textContent = `${dateStr} à ${timeStr}`;
                    inlineSlotsContainer.style.display = 'none';
                    inlineStep2.style.display = 'block';
                    inlineStep2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });

                inlineSlotsContainer.appendChild(slotCard);
            });

        } catch (err) {
            console.error('Error fetching slots:', err);
            inlineSlotsContainer.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">Erreur lors du chargement des créneaux.</div>';
        }
    }

    if (btnInlineBack) {
        btnInlineBack.addEventListener('click', () => {
            inlineStep2.style.display = 'none';
            inlineSlotsContainer.style.display = 'grid';
            inlineSlotsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (btnInlineCloseSuccess) {
        btnInlineCloseSuccess.addEventListener('click', () => {
            inlineBookingSection.style.display = 'none';
            excursionsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (inlineBookingForm) {
        inlineBookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = inlineBookingForm.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Réservation en cours...';

            const prenom = document.getElementById('inlinePrenom').value;
            const nom = document.getElementById('inlineNom').value;
            const telephone = document.getElementById('inlineTelephone').value;
            const slotId = document.getElementById('inlineSlotId').value;

            try {
                const { error: insertError } = await supabaseClient
                    .from('reservations')
                    .insert([{ slot_id: slotId, prenom, nom, telephone }]);
                if (insertError) throw insertError;

                const { error: updateError } = await supabaseClient
                    .from('slots')
                    .update({ is_booked: true })
                    .eq('id', slotId);
                if (updateError) throw updateError;

                inlineStep2.style.display = 'none';
                inlineSuccess.style.display = 'block';
                inlineBookingForm.reset();
                inlineSuccess.scrollIntoView({ behavior: 'smooth', block: 'start' });

            } catch (err) {
                console.error('Error booking:', err);
                alert('Une erreur est survenue lors de la réservation. Veuillez réessayer.');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Confirmer la réservation';
            }
        });
    }
});
