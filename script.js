// Supabase Configuration
const SUPABASE_URL = 'https://bphjoksxwofhvtfianbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGpva3N4d29maHZ0ZmlhbmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU3OTQsImV4cCI6MjA4ODc4MTc5NH0.iLhIVef0Me7W70IYlA52DVf9aIlYinDIKjYPVYK48pQ'; 

// Use a different variable name to avoid conflict with the global 'supabase' object
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const messageEl = document.getElementById('message');
    const resultsContainer = document.getElementById('results-list');
    const buttons = document.querySelectorAll('button');

    // Function to save action and form data to Supabase
    const saveToSupabase = async (action, details, formData) => {
        try {
            const { data, error } = await supabaseClient
                .from('training_logs')
                .insert([
                    { 
                        action: action, 
                        button_text: details, 
                        form_data: formData 
                    }
                ]);

            if (error) throw error;
            if (messageEl) messageEl.textContent = `Success: Saved to Cloud!`;
        } catch (error) {
            console.error('Error saving to Supabase:', error.message);
            if (messageEl) messageEl.textContent = `Error: ${error.message}`;
        }
    };

    // Helper to get all data from a form
    const getFormData = (button) => {
        const form = button.closest('form');
        if (!form) return null;

        const data = {};
        const elements = form.querySelectorAll('input, select, textarea');
        
        elements.forEach(el => {
            if (el.type === 'checkbox') {
                if (!data[el.name]) data[el.name] = [];
                if (el.checked) data[el.name].push(el.value);
            } else if (el.type === 'radio') {
                if (el.checked) data[el.name] = el.value;
            } else {
                data[el.name || el.id] = el.value;
            }
        });
        return data;
    };

    // Handle button clicks
    buttons.forEach(button => {
        button.addEventListener('click', async (e) => {
            if (button.id === 'clear-history') return;
            
            e.preventDefault();
            const action = button.dataset.action || 'submitted';
            const details = button.innerText;
            const formData = getFormData(button);
            
            if (messageEl) messageEl.textContent = `Saving...`;
            await saveToSupabase(action, details, formData);
        });
    });

    // Display results if on Page 4
    if (resultsContainer) {
        const fetchResults = async () => {
            try {
                const { data, error } = await supabaseClient
                    .from('training_logs')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                resultsContainer.innerHTML = ''; // Clear loading message

                if (!data || data.length === 0) {
                    resultsContainer.innerHTML = '<li>No data found in cloud. Go interact with the forms!</li>';
                } else {
                    data.forEach(item => {
                        const li = document.createElement('li');
                        li.style.borderBottom = "1px solid #ccc";
                        li.style.padding = "10px 0";
                        
                        const timestamp = new Date(item.created_at).toLocaleString();
                        
                        let dataHtml = '<ul>';
                        for (const [key, value] of Object.entries(item.form_data || {})) {
                            dataHtml += `<li><strong>${key}:</strong> ${Array.isArray(value) ? value.join(', ') : value}</li>`;
                        }
                        dataHtml += '</ul>';

                        li.innerHTML = `
                            <div><strong>[${timestamp}] Action:</strong> ${item.action} (via "${item.button_text}")</div>
                            <div><strong>Submitted Data:</strong>${dataHtml}</div>
                        `;
                        resultsContainer.appendChild(li);
                    });
                }
            } catch (error) {
                resultsContainer.innerHTML = `<li style="color:red">Error loading results: ${error.message}</li>`;
            }
        };

        fetchResults();

        // Handle Clear History (Deletes all rows - Note: Requires DELETE policy in Supabase)
        const clearBtn = document.getElementById('clear-history');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                const confirmClear = confirm("Are you sure you want to clear all cloud logs?");
                if (confirmClear) {
                    const { error } = await supabaseClient.from('training_logs').delete().neq('id', 0);
                    if (error) alert("Error clearing history: " + error.message);
                    else location.reload();
                }
            });
        }
    }
});
