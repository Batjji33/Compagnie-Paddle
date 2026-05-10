document.addEventListener('DOMContentLoaded', () => {
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModal = document.getElementById('closeBookingModal');
    const btnChooseExcursions = document.querySelectorAll('.btn-choose-excursion');
    const availableSlotsContainer = document.getElementById('availableSlots');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const bookingSuccess = document.getElementById('bookingSuccess');
    const bookingForm = document.getElementById('bookingForm');
    const btnBackToSlots = document.getElementById('btnBackToSlots');
    const selectedSlotText = document.getElementById('selectedSlotText');
    const btnCloseSuccess = document.getElementById('btnCloseSuccess');

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
                .order('created_at', { ascending: true });

            if (error) throw error;

            excursionsGrid.innerHTML = '';
            
            if (data.length === 0) {
                excursionsGrid.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 50px;">Aucune traversée disponible pour le moment.</div>';
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
                        <button class="btn btn-primary btn-choose-excursion" data-excursion="${exc.id}" data-title="${exc.titre}">Choisir mon excursion</button>
                    </div>
                `;
                excursionsGrid.appendChild(card);
            });

            // Re-attach event listeners to new buttons
            document.querySelectorAll('.btn-choose-excursion').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    currentExcursion = e.target.getAttribute('data-excursion');
                    const excTitle = e.target.getAttribute('data-title');
                    document.getElementById('bookingModalTitle').textContent = `Réserver : ${excTitle}`;
                    
                    step1.style.display = 'block';
                    step2.style.display = 'none';
                    bookingSuccess.style.display = 'none';
                    bookingModal.classList.add('active');
                    document.body.style.overflow = 'hidden';

                    await loadAvailableSlots(currentExcursion);
                });
            });

        } catch (err) {
            console.error('Error fetching excursions:', err);
            excursionsGrid.innerHTML = '<div style="color: #dc3545; text-align: center; grid-column: 1 / -1;">Erreur lors du chargement des traversées.</div>';
        }
    }

    closeBookingModal.addEventListener('click', closeModal);
    btnCloseSuccess.addEventListener('click', closeModal);

    function closeModal() {
        bookingModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    btnBackToSlots.addEventListener('click', () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
    });

    async function loadAvailableSlots(excursionType) {
        availableSlotsContainer.innerHTML = '<div style="text-align: center; color: var(--gray-text);">Chargement des créneaux...</div>';
        
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
                availableSlotsContainer.innerHTML = '<div style="text-align: center; color: var(--gray-text); padding: 20px;">Aucun créneau disponible pour cette excursion actuellement.</div>';
                return;
            }

            availableSlotsContainer.innerHTML = '';
            data.forEach(slot => {
                const dateObj = new Date(slot.date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                const timeStr = slot.time.substring(0, 5);

                const slotBtn = document.createElement('button');
                slotBtn.className = 'btn btn-secondary';
                slotBtn.style.textAlign = 'left';
                slotBtn.style.display = 'flex';
                slotBtn.style.justifyContent = 'space-between';
                slotBtn.innerHTML = `<span><i class="ph ph-calendar-blank"></i> ${dateStr}</span> <span><i class="ph ph-clock"></i> ${timeStr}</span>`;
                
                slotBtn.addEventListener('click', () => {
                    document.getElementById('slotId').value = slot.id;
                    document.getElementById('excursionType').value = excursionType;
                    selectedSlotText.textContent = `${dateStr} à ${timeStr}`;
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                });

                availableSlotsContainer.appendChild(slotBtn);
            });

        } catch (err) {
            console.error('Error fetching slots:', err);
            availableSlotsContainer.innerHTML = '<div style="color: #dc3545; text-align: center;">Erreur lors du chargement des créneaux.</div>';
        }
    }

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = bookingForm.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Réservation en cours...';

        const prenom = document.getElementById('prenom').value;
        const nom = document.getElementById('nom').value;
        const telephone = document.getElementById('telephone').value;
        const slotId = document.getElementById('slotId').value;

        try {
            // Create reservation
            const { error: insertError } = await supabaseClient
                .from('reservations')
                .insert([{ slot_id: slotId, prenom, nom, telephone }]);

            if (insertError) throw insertError;

            // Mark slot as booked
            const { error: updateError } = await supabaseClient
                .from('slots')
                .update({ is_booked: true })
                .eq('id', slotId);

            if (updateError) throw updateError;

            step2.style.display = 'none';
            bookingSuccess.style.display = 'block';
            bookingForm.reset();

        } catch (err) {
            console.error('Error booking:', err);
            alert('Une erreur est survenue lors de la réservation. Veuillez réessayer.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Confirmer la réservation';
        }
    });
});
