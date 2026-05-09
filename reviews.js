document.addEventListener('DOMContentLoaded', () => {
    
    // Only run if on reviews page
    if (!document.getElementById('reviewsList')) return;

    const reviewsList = document.getElementById('reviewsList');
    const averageRatingValue = document.getElementById('averageRatingValue');
    const totalReviewsCount = document.getElementById('totalReviewsCount');
    const starRatingSelect = document.getElementById('starRatingSelect');
    const reviewStarsInput = document.getElementById('reviewStars');
    const reviewForm = document.getElementById('reviewForm');
    const reviewSuccessMessage = document.getElementById('reviewSuccessMessage');

    // Star selection logic
    if (starRatingSelect) {
        const stars = starRatingSelect.querySelectorAll('.ph-star');
        let selectedRating = 0;

        stars.forEach(star => {
            star.addEventListener('mouseover', function() {
                const rating = this.getAttribute('data-rating');
                highlightStars(rating);
            });

            star.addEventListener('mouseout', function() {
                highlightStars(selectedRating);
            });

            star.addEventListener('click', function() {
                selectedRating = this.getAttribute('data-rating');
                reviewStarsInput.value = selectedRating;
                highlightStars(selectedRating);
            });
        });

        function highlightStars(rating) {
            stars.forEach(star => {
                const starRating = star.getAttribute('data-rating');
                if (starRating <= rating) {
                    star.style.color = 'var(--gold)';
                } else {
                    star.style.color = '#ccc';
                }
            });
        }
    }

    // Load reviews
    async function loadReviews() {
        try {
            const { data, error } = await supabaseClient
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data.length === 0) {
                reviewsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gray-text);">Aucun avis pour le moment. Soyez le premier !</div>';
                averageRatingValue.textContent = '-';
                totalReviewsCount.textContent = '0 avis';
                return;
            }

            // Calculate average
            const totalStars = data.reduce((sum, review) => sum + review.stars, 0);
            const avg = (totalStars / data.length).toFixed(1);
            averageRatingValue.textContent = avg;
            totalReviewsCount.textContent = `${data.length} avis`;

            // Display reviews
            reviewsList.innerHTML = '';
            data.forEach(review => {
                const dateObj = new Date(review.created_at);
                const dateStr = dateObj.toLocaleDateString('fr-FR');
                
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    starsHtml += `<i class="ph-fill ph-star" style="color: ${i <= review.stars ? 'var(--gold)' : '#eee'};"></i>`;
                }

                const reviewEl = document.createElement('div');
                reviewEl.className = 'review-item';
                reviewEl.innerHTML = `
                    <div class="review-meta">
                        <div style="font-family: var(--font-subtitle); font-weight: bold; color: var(--blue-marine);">
                            ${review.prenom} ${review.nom}
                        </div>
                        <div style="color: var(--gray-text); font-size: 0.9rem;">${dateStr}</div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        ${starsHtml}
                    </div>
                    <p style="font-style: italic;">"${review.comment}"</p>
                `;
                reviewsList.appendChild(reviewEl);
            });

        } catch (err) {
            console.error('Error fetching reviews:', err);
            reviewsList.innerHTML = '<div style="color: #dc3545; text-align: center;">Erreur lors du chargement des avis.</div>';
        }
    }

    loadReviews();

    // Submit review
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!reviewStarsInput.value) {
                alert("Veuillez sélectionner une note avec les étoiles.");
                return;
            }

            const btnSubmit = reviewForm.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Envoi en cours...';

            const prenom = document.getElementById('reviewPrenom').value;
            const nom = document.getElementById('reviewNom').value;
            const telephone = document.getElementById('reviewTelephone').value;
            const stars = parseInt(reviewStarsInput.value);
            const comment = document.getElementById('reviewComment').value;

            try {
                const { error } = await supabaseClient
                    .from('reviews')
                    .insert([{ prenom, nom, telephone, stars, comment }]);

                if (error) throw error;

                reviewForm.reset();
                highlightStars(0);
                reviewStarsInput.value = '';
                reviewSuccessMessage.style.display = 'block';
                setTimeout(() => {
                    reviewSuccessMessage.style.display = 'none';
                }, 5000);
                
                loadReviews(); // Reload list

            } catch (err) {
                console.error('Error submitting review:', err);
                alert('Une erreur est survenue lors de l\'envoi de votre avis. Veuillez réessayer.');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Publier mon avis';
            }
        });
    }
});
