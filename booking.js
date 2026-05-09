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

    const excursionNames = {
        'baignade': 'Excursion baignade – Le long de la côte',
        'parc_bateaux': 'Excursion autour du parc à bateaux',
        'ile_mouettes': 'Excursion de l’Île des Mouettes'
    };

    let currentExcursion = '';

    btnChooseExcursions.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            currentExcursion = e.target.getAttribute('data-excursion');
            document.getElementById('bookingModalTitle').textContent = `Réserver : ${excursionNames[currentExcursion]}`;
            
            step1.style.display = 'block';
            step2.style.display = 'none';
            bookingSuccess.style.display = 'none';
            bookingModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling

            await loadAvailableSlots(currentExcursion);
        });
    });

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
