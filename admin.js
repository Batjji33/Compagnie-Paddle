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
            if (target === 'panel-banner') loadBanner();
            if (target === 'panel-popup') loadPopup();
        });
    });

    // =============================================
    // EXCURSIONS - with reordering
    // =============================================
    let excursionsMap = {};
    let allExcursions = [];

    async function loadExcursions() {
        const tbody = document.querySelector('#excursionsTable tbody');
        const slotSelect = document.getElementById('slotExcursion');
        
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chargement...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('excursions')
                .select('*')
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true });
                
            if (error) throw error;
            
            excursionsMap = {};
            slotSelect.innerHTML = '';
            allExcursions = data;
            
            if (data.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucune traversée</td></tr>';
                slotSelect.innerHTML = '<option value="">Aucune traversée disponible</option>';
                return;
            }
            
            if (tbody) tbody.innerHTML = '';
            data.forEach((exc, index) => {
                excursionsMap[exc.id] = exc.titre;
                
                const option = document.createElement('option');
                option.value = exc.id;
                option.textContent = exc.titre;
                slotSelect.appendChild(option);
                
                if (tbody) {
                    const tr = document.createElement('tr');
                    tr.draggable = true;
                    tr.dataset.id = exc.id;
                    tr.style.cursor = 'grab';
                    tr.style.opacity = exc.is_visible === false ? '0.5' : '1';
                    tr.innerHTML = `
                        <td style="text-align:center; color:var(--gray-text); font-size:1.3rem; cursor:grab;" title="Glisser pour réordonner">☰</td>
                        <td><img src="${exc.image_url}" alt="Image" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                        <td>${exc.titre}</td>
                        <td>${exc.tarif}</td>
                        <td>
                            <span style="color: ${exc.is_visible !== false ? '#28a745' : '#dc3545'}; font-weight: bold;">
                                ${exc.is_visible !== false ? 'Visible' : 'Masquée'}
                            </span>
                        </td>
                        <td style="white-space: nowrap;">
                            <button class="btn-secondary" onclick="toggleExcursionVisibility('${exc.id}', ${exc.is_visible !== false})" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px;">
                                ${exc.is_visible !== false ? 'Masquer' : 'Afficher'}
                            </button>
                            <button class="btn-secondary" onclick="editExcursion('${exc.id}')" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px;">Modifier</button>
                            <button class="btn-danger" onclick="deleteExcursion('${exc.id}', '${exc.image_url}')" style="padding: 5px 10px; font-size: 0.8rem;">Supprimer</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            // Setup drag and drop after rendering
            setupDragAndDrop(tbody);

        } catch (err) {
            console.error('Error loading excursions:', err);
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #dc3545;">Erreur de chargement</td></tr>';
        }
    }

    // Drag and drop reordering (Desktop Mouse + Mobile Touch Support)
    function setupDragAndDrop(tbody) {
        let dragSrc = null;

        tbody.querySelectorAll('tr').forEach(row => {
            // --- DESKTOP MOUSE EVENTS ---
            row.addEventListener('dragstart', (e) => {
                dragSrc = row;
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (row !== dragSrc) {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
                    row.classList.add('drag-over');
                }
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragSrc === row) return;
                applyNewOrder(row);
            });

            // --- MOBILE TOUCH EVENTS (using the ☰ drag handle) ---
            const dragHandle = row.querySelector('td:first-child');
            if (dragHandle) {
                dragHandle.addEventListener('touchstart', (e) => {
                    dragSrc = row;
                    row.classList.add('dragging');
                    // Prevent page scroll while dragging
                    e.preventDefault();
                }, { passive: false });

                dragHandle.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (!target) return;
                    
                    const targetRow = target.closest('tr');
                    if (targetRow && targetRow !== dragSrc && targetRow.parentNode === tbody) {
                        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
                        targetRow.classList.add('drag-over');
                    }
                }, { passive: false });

                dragHandle.addEventListener('touchend', (e) => {
                    row.classList.remove('dragging');
                    const targetRow = tbody.querySelector('tr.drag-over');
                    if (targetRow && targetRow !== dragSrc) {
                        targetRow.classList.remove('drag-over');
                        applyNewOrder(targetRow);
                    } else {
                        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
                    }
                });
            }
        });

        async function applyNewOrder(targetRow) {
            // Reorder in DOM
            const rows = [...tbody.querySelectorAll('tr')];
            const srcIdx = rows.indexOf(dragSrc);
            const dstIdx = rows.indexOf(targetRow);

            if (srcIdx < dstIdx) {
                targetRow.after(dragSrc);
            } else {
                targetRow.before(dragSrc);
            }

            // Persist new order to Supabase
            const newRows = [...tbody.querySelectorAll('tr')];
            const updates = newRows.map((r, i) =>
                supabaseClient.from('excursions').update({ sort_order: i + 1 }).eq('id', r.dataset.id)
            );
            try {
                await Promise.all(updates);
                // Sync local array
                await loadExcursions();
            } catch (err) {
                console.error('Error saving order:', err);
                alert('Erreur lors de la sauvegarde de l\'ordre.');
            }
        }
    }

    // Toggle visibility
    window.toggleExcursionVisibility = async function(id, currentStatus) {
        try {
            const { error } = await supabaseClient
                .from('excursions')
                .update({ is_visible: !currentStatus })
                .eq('id', id);
            
            if (error) throw error;
            await loadExcursions();
        } catch (err) {
            console.error('Error toggling visibility:', err);
            alert('Erreur lors du changement de visibilité.');
        }
    };

    // Add / Edit Excursion
    const addExcursionForm = document.getElementById('addExcursionForm');
    if (addExcursionForm) {
        addExcursionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitExcursion');
            btn.disabled = true;
            btn.textContent = 'Enregistrement...';
            
            const id = document.getElementById('excId').value;
            const oldImageUrl = document.getElementById('excOldImageUrl').value;
            const titre = document.getElementById('excTitre').value;
            const description = document.getElementById('excDesc').value;
            const tarif = document.getElementById('excTarif').value;
            const periode = document.getElementById('excPeriode').value;
            const infos = document.getElementById('excInfos').value;
            const fileInput = document.getElementById('excImage');
            
            try {
                let imageUrl = oldImageUrl;
                
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
                    
                    if (id && oldImageUrl) {
                        const oldFileName = oldImageUrl.split('/').pop();
                        supabaseClient.storage.from('excursions_images').remove([oldFileName]).catch(e => console.error(e));
                    }
                }
                
                if (id) {
                    const { error: updateError } = await supabaseClient
                        .from('excursions')
                        .update({ titre, description, tarif, periode, infos, image_url: imageUrl })
                        .eq('id', id);
                    if (updateError) throw updateError;
                    alert('Traversée modifiée avec succès !');
                } else {
                    // Get current max sort_order
                    const maxOrder = allExcursions.length + 1;
                    const { error: insertError } = await supabaseClient
                        .from('excursions')
                        .insert([{ titre, description, tarif, periode, infos, image_url: imageUrl, sort_order: maxOrder }]);
                    if (insertError) throw insertError;
                    alert('Traversée ajoutée avec succès !');
                }
                
                resetExcursionForm();
                await loadExcursions();
                
            } catch (err) {
                console.error('Error adding/updating excursion:', err);
                alert('Erreur lors de l\'enregistrement de la traversée. (Avez-vous configuré RLS sur Supabase ?)');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Enregistrer la traversée';
            }
        });
    }

    window.editExcursion = function(id) {
        const exc = allExcursions.find(e => e.id === id);
        if (!exc) return;
        
        document.getElementById('excId').value = exc.id;
        document.getElementById('excOldImageUrl').value = exc.image_url;
        document.getElementById('excTitre').value = exc.titre;
        document.getElementById('excDesc').value = exc.description;
        document.getElementById('excTarif').value = exc.tarif;
        document.getElementById('excPeriode').value = exc.periode;
        document.getElementById('excInfos').value = exc.infos || '';
        
        document.getElementById('excImage').removeAttribute('required');
        
        const btn = document.getElementById('btnSubmitExcursion');
        btn.textContent = 'Mettre à jour la traversée';
        
        let cancelBtn = document.getElementById('btnCancelEditExcursion');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'btnCancelEditExcursion';
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = 'Annuler la modification';
            cancelBtn.style.marginTop = '10px';
            cancelBtn.onclick = resetExcursionForm;
            document.getElementById('addExcursionForm').appendChild(cancelBtn);
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function resetExcursionForm() {
        const form = document.getElementById('addExcursionForm');
        if (form) {
            form.reset();
            document.getElementById('excId').value = '';
            document.getElementById('excOldImageUrl').value = '';
            document.getElementById('excImage').setAttribute('required', 'required');
            document.getElementById('btnSubmitExcursion').textContent = 'Enregistrer la traversée';
            
            const cancelBtn = document.getElementById('btnCancelEditExcursion');
            if (cancelBtn) cancelBtn.remove();
        }
    }

    window.deleteExcursion = async function(id, imageUrl) {
        if (!confirm('Voulez-vous vraiment supprimer cette traversée ? Cela supprimera peut-être les créneaux associés s\'ils ne sont pas protégés.')) return;
        try {
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

    // =============================================
    // SLOTS
    // =============================================
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

    // =============================================
    // RESERVATIONS
    // =============================================
    async function loadReservations() {
        const tbody = document.querySelector('#reservationsTable tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chargement...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('reservations')
                .select(`id, prenom, nom, telephone, slots ( id, excursion_type, date, time )`)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune réservation</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            data.forEach(res => {
                const tr = document.createElement('tr');
                if (!res.slots) return;
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

    window.deleteReservation = async function(resId, slotId) {
        if (!confirm('Voulez-vous vraiment supprimer cette réservation ? Le créneau redeviendra disponible.')) return;
        try {
            const { error: err1 } = await supabaseClient.from('reservations').delete().eq('id', resId);
            if (err1) throw err1;
            
            const { error: err2 } = await supabaseClient.from('slots').update({ is_booked: false }).eq('id', slotId);
            if (err2) throw err2;
            
            loadReservations();
        } catch (err) {
            console.error('Error deleting reservation:', err);
            alert('Erreur lors de la suppression');
        }
    };

    // =============================================
    // REVIEWS
    // =============================================
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

    // =============================================
    // BANDEAU SORTIES EN MER
    // =============================================
    async function loadBanner() {
        try {
            const { data, error } = await supabaseClient
                .from('excursions_banner')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!data) return;

            document.getElementById('bannerTitle').value = data.titre || '';
            document.getElementById('bannerDesc').value = data.description || '';
            document.getElementById('bannerColor').value = data.couleur || '#0A2342';
            document.getElementById('bannerColorHex').textContent = data.couleur || '#0A2342';

            if (data.image_url) {
                document.getElementById('bannerCurrentImg').style.display = 'block';
                document.getElementById('bannerCurrentImgEl').src = data.image_url;
            }

            const hideBtn = document.getElementById('btnHideBanner');
            hideBtn.textContent = data.is_visible === false ? 'Afficher le bandeau' : 'Masquer le bandeau';

        } catch (err) {
            console.error('Error loading banner:', err);
        }
    }

    document.getElementById('bannerColor').addEventListener('input', function() {
        document.getElementById('bannerColorHex').textContent = this.value;
    });

    document.getElementById('bannerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveBanner');
        btn.disabled = true;
        btn.textContent = 'Enregistrement...';

        const titre = document.getElementById('bannerTitle').value;
        const description = document.getElementById('bannerDesc').value;
        const couleur = document.getElementById('bannerColor').value;
        const fileInput = document.getElementById('bannerImage');

        try {
            // Get existing record
            const { data: existing } = await supabaseClient
                .from('excursions_banner')
                .select('id, image_url')
                .limit(1)
                .maybeSingle();

            let imageUrl = existing?.image_url || '';

            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `banner_${Math.random()}.${fileExt}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from('excursions_images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseClient.storage
                    .from('excursions_images')
                    .getPublicUrl(fileName);

                imageUrl = urlData.publicUrl;

                // Remove old image
                if (existing?.image_url) {
                    const oldFileName = existing.image_url.split('/').pop();
                    supabaseClient.storage.from('excursions_images').remove([oldFileName]).catch(() => {});
                }
            }

            if (existing?.id) {
                const { error } = await supabaseClient
                    .from('excursions_banner')
                    .update({ titre, description, couleur, image_url: imageUrl, is_visible: true })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('excursions_banner')
                    .insert([{ titre, description, couleur, image_url: imageUrl, is_visible: true }]);
                if (error) throw error;
            }

            await loadBanner();
            alert('Bandeau enregistré et activé !');
        } catch (err) {
            console.error('Error saving banner:', err);
            alert('Erreur. Avez-vous créé la table excursions_banner dans Supabase ?');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enregistrer le bandeau';
        }
    });

    document.getElementById('btnHideBanner').addEventListener('click', async () => {
        try {
            const { data: existing } = await supabaseClient
                .from('excursions_banner')
                .select('id, is_visible')
                .limit(1)
                .maybeSingle();

            if (!existing) return;

            const newVisibility = existing.is_visible === false ? true : false;
            const { error } = await supabaseClient
                .from('excursions_banner')
                .update({ is_visible: newVisibility })
                .eq('id', existing.id);

            if (error) throw error;
            await loadBanner();
        } catch (err) {
            console.error('Error toggling banner:', err);
        }
    });

    // =============================================
    // POPUP ACCUEIL
    // =============================================
    async function loadPopup() {
        try {
            const { data, error } = await supabaseClient
                .from('popup_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!data) return;

            document.getElementById('popupActive').checked = data.is_active === true;
            document.getElementById('popupOffer').value = data.offer_text || '';
            document.getElementById('popupMaxSlots').value = data.max_slots || 5;

        } catch (err) {
            console.error('Error loading popup:', err);
        }
    }

    document.getElementById('popupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSavePopup');
        btn.disabled = true;
        btn.textContent = 'Enregistrement...';

        const is_active = document.getElementById('popupActive').checked;
        const offer_text = document.getElementById('popupOffer').value;
        const max_slots = parseInt(document.getElementById('popupMaxSlots').value) || 5;

        try {
            const { data: existing } = await supabaseClient
                .from('popup_settings')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (existing?.id) {
                const { error } = await supabaseClient
                    .from('popup_settings')
                    .update({ is_active, offer_text, max_slots })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('popup_settings')
                    .insert([{ is_active, offer_text, max_slots }]);
                if (error) throw error;
            }

            alert('Popup enregistré !');
        } catch (err) {
            console.error('Error saving popup:', err);
            alert('Erreur. Avez-vous créé la table popup_settings dans Supabase ?');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enregistrer le popup';
        }
    });

    // =============================================
    // INIT
    // =============================================
    async function initAdmin() {
        await loadExcursions();
        loadSlots();
    }
    
    initAdmin();
});
