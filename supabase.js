const SUPABASE_URL = 'https://efrokivuarllodsgvjxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcm9raXZ1YXJsbG9kc2d2anhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMjU5MjMsImV4cCI6MjA5MzkwMTkyM30.WGhbSqpVB2WNNqeLOS3EdjfzFvYmamD7lcAzYqIyoA8';

// Initialize Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

