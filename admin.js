document.addEventListener('DOMContentLoaded', () => {
    
    // Check Auth
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'index.html';
    });

    // Tabs logic
    const tabs = document.querySelectorAll('.admin-tab');
    const panels = document.querySelectorAll('.admin-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const target = tab.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
            
            // Reload data based on tab
            if (target === 'panel-excursions') loadExcursions();
            if (target === 'panel-slots') loadSlots();
            if (target === 'panel-reservations') loadReservations();
            if (target === 'panel-reviews') loadReviewsAdmin();
        });
    });

    // Excursions logic
    let excursionsMap = {};

    async function loadExcursions() {
        const tbody = document.querySelector('#excursionsTable tbody');
        const slotSelect = document.getElementById('slotExcursion');
        
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chargement...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('excursions')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            excursionsMap = {};
            slotSelect.innerHTML = '';
            
            if (data.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune traversée</td></tr>';
                slotSelect.innerHTML = '<option value="">Aucune traversée disponible</option>';
                return;
            }
            
            if (tbody) tbody.innerHTML = '';
            data.forEach(exc => {
                excursionsMap[exc.id] = exc.titre; // Store for slots table mapping
                
                // Populate select
                const option = document.createElement('option');
                option.value = exc.id;
                option.textContent = exc.titre;
                slotSelect.appendChild(option);
                
                // Populate table
                if (tbody) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><img src="${exc.image_url}" alt="Image" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                        <td>${exc.titre}</td>
                        <td>${exc.tarif}</td>
                        <td><button class="btn-danger" onclick="deleteExcursion('${exc.id}', '${exc.image_url}')">Supprimer</button></td>
                    `;
                    tbody.appendChild(tr);
                }
            });
        } catch (err) {
            console.error('Error loading excursions:', err);
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #dc3545;">Erreur de chargement</td></tr>';
        }
    }

    // Add Excursion
    const addExcursionForm = document.getElementById('addExcursionForm');
    if (addExcursionForm) {
        addExcursionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitExcursion');
            btn.disabled = true;
            btn.textContent = 'Téléchargement...';
            
            const titre = document.getElementById('excTitre').value;
            const description = document.getElementById('excDesc').value;
            const tarif = document.getElementById('excTarif').value;
            const periode = document.getElementById('excPeriode').value;
            const infos = document.getElementById('excInfos').value;
            const fileInput = document.getElementById('excImage');
            
            try {
                let imageUrl = '';
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    
                    const { error: uploadError } = await supabaseClient.storage
                        .from('excursions_images')
                        .upload(fileName, file);
                        
                    if (uploadError) throw uploadError;
                    
                    const { data } = supabaseClient.storage
                        .from('excursions_images')
                        .getPublicUrl(fileName);
                        
                    imageUrl = data.publicUrl;
                }
                
                const { error: insertError } = await supabaseClient.from('excursions').insert([{
                    titre, description, tarif, periode, infos, image_url: imageUrl
                }]);
                
                if (insertError) throw insertError;
                
                addExcursionForm.reset();
                await loadExcursions();
                alert('Traversée ajoutée avec succès !');
                
            } catch (err) {
                console.error('Error adding excursion:', err);
                alert('Erreur lors de l\'ajout de la traversée. Avez-vous créé la table et le bucket Storage ?');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Enregistrer la traversée';
            }
        });
    }

    window.deleteExcursion = async function(id, imageUrl) {
        if (!confirm('Voulez-vous vraiment supprimer cette traversée ? Cela supprimera peut-être les créneaux associés s\'ils ne sont pas protégés.')) return;
        try {
            // Optionnel : supprimer l'image du storage
            if (imageUrl) {
                const fileName = imageUrl.split('/').pop();
                await supabaseClient.storage.from('excursions_images').remove([fileName]);
            }
            
            const { error } = await supabaseClient.from('excursions').delete().eq('id', id);
            if (error) throw error;
            await loadExcursions();
        } catch (err) {
            console.error('Error deleting excursion:', err);
            alert('Erreur lors de la suppression');
        }
    };

    // Load Slots
    async function loadSlots() {
        const tbody = document.querySelector('#slotsTable tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chargement...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('slots')
                .select('*')
                .order('date', { ascending: true })
                .order('time', { ascending: true });
                
            if (error) throw error;
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun créneau</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            data.forEach(slot => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${excursionsMap[slot.excursion_type] || slot.excursion_type}</td>
                    <td>${new Date(slot.date).toLocaleDateString('fr-FR')}</td>
                    <td>${slot.time.substring(0, 5)}</td>
                    <td>${slot.is_booked ? '<span style="color: #dc3545;">Réservé</span>' : '<span style="color: #28a745;">Libre</span>'}</td>
                    <td><button class="btn-danger" onclick="deleteSlot(${slot.id})">Supprimer</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading slots:', err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #dc3545;">Erreur de chargement</td></tr>';
        }
    }

    // Add Slot
    document.getElementById('addSlotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('slotExcursion').value;
        const date = document.getElementById('slotDate').value;
        const time = document.getElementById('slotTime').value;
        
        try {
            const { error } = await supabaseClient
                .from('slots')
                .insert([{ excursion_type: type, date: date, time: time, is_booked: false }]);
                
            if (error) throw error;
            document.getElementById('addSlotForm').reset();
            loadSlots();
        } catch (err) {
            console.error('Error adding slot:', err);
            alert('Erreur lors de l\'ajout du créneau');
        }
    });

    // Delete Slot
    window.deleteSlot = async function(id) {
        if (!confirm('Voulez-vous vraiment supprimer ce créneau ?')) return;
        try {
            const { error } = await supabaseClient.from('slots').delete().eq('id', id);
            if (error) throw error;
            loadSlots();
        } catch (err) {
            console.error('Error deleting slot:', err);
            alert('Erreur lors de la suppression');
        }
    };

    // Load Reservations
    async function loadReservations() {
        const tbody = document.querySelector('#reservationsTable tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chargement...</td></tr>';
        
        try {
            // Need to join slots and reservations
            const { data, error } = await supabaseClient
                .from('reservations')
                .select(`
                    id, prenom, nom, telephone,
                    slots ( id, excursion_type, date, time )
                `)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune réservation</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            data.forEach(res => {
                const tr = document.createElement('tr');
                if (!res.slots) return; // skip if slot is deleted
                tr.innerHTML = `
                    <td>${excursionsMap[res.slots.excursion_type] || res.slots.excursion_type}</td>
                    <td>${new Date(res.slots.date).toLocaleDateString('fr-FR')} - ${res.slots.time.substring(0, 5)}</td>
                    <td>${res.prenom} ${res.nom}</td>
                    <td>${res.telephone}</td>
                    <td><button class="btn-danger" onclick="deleteReservation(${res.id}, ${res.slots.id})">Supprimer</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading reservations:', err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #dc3545;">Erreur de chargement</td></tr>';
        }
    }

    // Delete Reservation
    window.deleteReservation = async function(resId, slotId) {
        if (!confirm('Voulez-vous vraiment supprimer cette réservation ? Le créneau redeviendra disponible.')) return;
        try {
            // Delete reservation
            const { error: err1 } = await supabaseClient.from('reservations').delete().eq('id', resId);
            if (err1) throw err1;
            
            // Mark slot as available
            const { error: err2 } = await supabaseClient.from('slots').update({ is_booked: false }).eq('id', slotId);
            if (err2) throw err2;
            
            loadReservations();
        } catch (err) {
            console.error('Error deleting reservation:', err);
            alert('Erreur lors de la suppression');
        }
    };

    // Load Reviews Admin
    async function loadReviewsAdmin() {
        const tbody = document.querySelector('#reviewsTableAdmin tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chargement...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun avis</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            data.forEach(review => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${review.prenom} ${review.nom}<br><small>${review.telephone}</small></td>
                    <td>${review.stars} / 5</td>
                    <td><div style="max-height: 60px; overflow-y: auto;">${review.comment}</div></td>
                    <td>${new Date(review.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><button class="btn-danger" onclick="deleteReview(${review.id})">Supprimer</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading reviews admin:', err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #dc3545;">Erreur de chargement</td></tr>';
        }
    }

    // Delete Review
    window.deleteReview = async function(id) {
        if (!confirm('Voulez-vous vraiment supprimer cet avis ?')) return;
        try {
            const { error } = await supabaseClient.from('reviews').delete().eq('id', id);
            if (error) throw error;
            loadReviewsAdmin();
        } catch (err) {
            console.error('Error deleting review:', err);
            alert('Erreur lors de la suppression');
        }
    };

    // Initialize
    async function initAdmin() {
        await loadExcursions();
        loadSlots();
    }
    
    initAdmin();
});
