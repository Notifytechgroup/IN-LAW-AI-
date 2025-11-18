(function () {
    'use strict';

    // Global state management
    const state = {
        currentView: 'chat',
        chatHistory: [],
        recentChats: [],
        uploadedFile: null,
        currentTemplate: null
    };

    // DOM elements - will be populated after DOM loads
    let elements = {};

    // Initialize the application
    function init() {
        // Populate DOM element references AFTER DOMContentLoaded
        elements = {
            navItems: document.querySelectorAll('.nav-item'),
            views: document.querySelectorAll('.view'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            chatMessages: document.getElementById('chatMessages'),
            newChatBtn: document.getElementById('newChatBtn'),
            uploadZone: document.getElementById('uploadZone'),
            fileInput: document.getElementById('fileInput'),
            attachBtn: document.getElementById('attachBtn'),
            chatFileInput: document.getElementById('chatFileInput'), // may be created dynamically
            analyzeBtn: document.getElementById('analyzeBtn'),
            templateCards: document.querySelectorAll('.template-card'),
            categoryHeaders: document.querySelectorAll('.category-header'),
            templateItems: document.querySelectorAll('.template-item'),
            modal: document.getElementById('templateModal'),
            closeModal: document.getElementById('closeModal'),
            caseSearchInput: document.getElementById('caseSearchInput'),
            recentChatsContainer: document.getElementById('recentChats'),
            profileBtn: document.getElementById('profileBtn'),
            profileDropdown: document.getElementById('profileDropdown')
        };

        checkUserSession(); // Check login status first

        // If user is not signed in, ensure the sign-in page is visible on load
        // and open the Sign Up modal immediately so both sign-in and sign-up are presented.
        // (Remove the showSignUpForm() call if you prefer only the sign-in page to show.)
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            const signinPage = document.getElementById('signinPage');
            if (signinPage) signinPage.classList.remove('hidden');
            // Open sign-up modal as requested
            // Use a short timeout to ensure DOM is ready before creating the modal
            setTimeout(() => {
                try { showSignUpForm(); } catch (err) { /* fail silently if function missing */ }
            }, 200);
        }

        setupEventListeners();
        loadRecentChats();
        adjustTextareaHeight();

        // apply theme saved by user (light/dark)
        applyThemeFromStorage();

        // Add dynamic greeting update
        setTimeout(() => {
            updateDynamicGreeting();
        }, 500);

        // Update greeting every minute
        setInterval(updateDynamicGreeting, 60000);
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);

        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) closeSettings.addEventListener('click', closeSettingsModal);

        // Theme toggle inside Settings
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

        // Profile dropdown toggle (replaced implementation)
        const profileBtn = document.getElementById('profileBtn');
        const profileDropdown = document.getElementById('profileDropdown');

        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('open');
                updateProfileDropdown();
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                    profileDropdown.classList.remove('open');
                }
            });
        } else if (profileBtn) {
            // simple click opens profile modal if dropdown not present
            profileBtn.addEventListener('click', openProfileModal);
        }

        // Pricing modal close will be attached when modal is created dynamically

        // Student verification modal
        const closeStudentVerification = document.getElementById('closeStudentVerification');
        if (closeStudentVerification) {
            closeStudentVerification.addEventListener('click', () => {
                const modal = document.getElementById('studentVerificationModal');
                if (modal) modal.classList.remove('active');
            });
        }

        // Close modals when clicking outside
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) closeSettingsModal();
            });
        }

        const pricingModal = document.getElementById('pricingModal');
        if (pricingModal) {
            pricingModal.addEventListener('click', (e) => {
                if (e.target === pricingModal) closePricingModal();
            });
        }

        const studentVerificationModal = document.getElementById('studentVerificationModal');
        if (studentVerificationModal) {
            studentVerificationModal.addEventListener('click', (e) => {
                if (e.target === studentVerificationModal) studentVerificationModal.classList.remove('active');
            });
        }

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');

                // Create overlay if it doesn't exist
                let overlay = document.querySelector('.sidebar-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'sidebar-overlay';
                    const mainContainer = document.querySelector('.main-container') || document.body;
                    mainContainer.appendChild(overlay);
                }

                overlay.classList.toggle('active');

                // Close sidebar when clicking overlay
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            });
        }

        // Navigation
        if (elements.navItems && elements.navItems.length > 0) {
            elements.navItems.forEach(item => {
                item.addEventListener('click', () => {
                    handleNavigation(item);

                    // Close sidebar on mobile after clicking nav item
                    if (window.innerWidth <= 768 && sidebar) {
                        sidebar.classList.remove('active');
                        const overlay = document.querySelector('.sidebar-overlay');
                        if (overlay) overlay.classList.remove('active');
                    }
                });
            });
        }

        // Chat functionality
        if (elements.chatInput) {
            elements.chatInput.addEventListener('input', () => {
                adjustTextareaHeight();
                if (elements.sendBtn) elements.sendBtn.disabled = !elements.chatInput.value.trim();
            });

            elements.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        if (elements.sendBtn) elements.sendBtn.addEventListener('click', sendMessage);
        if (elements.newChatBtn) elements.newChatBtn.addEventListener('click', startNewChat);

        // Suggestion cards - attach after DOM loads
        attachSuggestionCardListeners();

        // File upload
        if (elements.uploadZone && elements.fileInput) {
            elements.uploadZone.addEventListener('click', () => elements.fileInput.click());

            elements.uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                elements.uploadZone.style.borderColor = 'var(--primary-color)';
            });

            elements.uploadZone.addEventListener('dragleave', () => {
                elements.uploadZone.style.borderColor = 'var(--border-color)';
            });

            elements.uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                elements.uploadZone.style.borderColor = 'var(--border-color)';
                const file = e.dataTransfer.files[0];
                handleFileUpload(file);
            });

            elements.fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                handleFileUpload(file);
            });
        }

        // Attach button for chat input: open file picker
        (function setupAttachButton() {
            const attachBtn = document.getElementById('attachBtn');
            if (!attachBtn) return;

            // Ensure hidden input exists (create if missing)
            let chatFileInput = document.getElementById('chatFileInput');
            if (!chatFileInput) {
                chatFileInput = document.createElement('input');
                chatFileInput.type = 'file';
                chatFileInput.id = 'chatFileInput';
                chatFileInput.accept = '.pdf,.doc,.docx,.txt,image/*';
                chatFileInput.style.display = 'none';
                document.body.appendChild(chatFileInput);
            }

            // Open file picker when attach button clicked
            attachBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // reset to allow selecting same file again
                chatFileInput.value = '';
                chatFileInput.click();
            });

            // Handle selected file
            chatFileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) handleChatFileUpload(file);
            });
        })();

        if (elements.analyzeBtn) elements.analyzeBtn.addEventListener('click', analyzeDocument);

        // Templates
        if (elements.templateCards && elements.templateCards.length > 0) {
            elements.templateCards.forEach(card => {
                card.addEventListener('click', () => {
                    const template = card.dataset.template;
                    openTemplateModal(template);
                });
            });
        }

        if (elements.categoryHeaders && elements.categoryHeaders.length > 0) {
            elements.categoryHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const category = header.parentElement;
                    category.classList.toggle('collapsed');
                });
            });
        }

        if (elements.templateItems && elements.templateItems.length > 0) {
            elements.templateItems.forEach(item => {
                item.addEventListener('click', () => {
                    const templateName = item.textContent;
                    openTemplateModal(templateName);
                });
            });
        }

        // Modal
        if (elements.closeModal) elements.closeModal.addEventListener('click', closeTemplateModal);

        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) closeTemplateModal();
            });
        }

        // Case search
        const btnSearch = document.querySelector('.btn-search');
        if (btnSearch) btnSearch.addEventListener('click', performCaseSearch);

        if (elements.caseSearchInput) {
            elements.caseSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') performCaseSearch();
            });
        }
    }

    // Function to attach suggestion card listeners
    function attachSuggestionCardListeners() {
        const suggestionCards = document.querySelectorAll('.suggestion-card');
        suggestionCards.forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (elements.chatInput && elements.sendBtn) {
                    elements.chatInput.value = prompt;
                    elements.sendBtn.disabled = false;
                    sendMessage();
                }
            });
        });
    }

    // Dynamic greeting based on time of day
    function updateDynamicGreeting() {
        const greetingElement = document.getElementById('dynamicGreeting');
        const subtextElement = document.getElementById('greetingSubtext');

        if (!greetingElement) return;

        // Get current hour
        const currentHour = new Date().getHours();

        // Get user name from localStorage
        const userName = localStorage.getItem('userName') || (localStorage.getItem('userEmail') ? localStorage.getItem('userEmail').split('@')[0] : 'there');

        // Capitalize first letter of name
        const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);

        // Determine greeting based on time
        let greeting = '';
        let subtext = '';

        if (currentHour >= 5 && currentHour < 12) {
            greeting = 'Good morning';
            subtext = 'Ready to tackle your legal research?';
        } else if (currentHour >= 12 && currentHour < 17) {
            greeting = 'Good afternoon';
            subtext = "Let's continue your legal work";
        } else if (currentHour >= 17 && currentHour < 22) {
            greeting = 'Good evening';
            subtext = 'Wrapping up your day with legal research?';
        } else {
            greeting = 'Working late';
            subtext = 'Here to help with your legal queries';
        }

        // Update greeting
        greetingElement.innerHTML = `${greeting}, <span class="greeting-name">${capitalizedName}</span>`;

        // Update subtext
        if (subtextElement) subtextElement.textContent = subtext;
    }

    // Navigation handler
    function handleNavigation(item) {
        const viewName = item.dataset.view;

        // Update active nav item
        if (elements.navItems && elements.navItems.length > 0) {
            elements.navItems.forEach(nav => nav.classList.remove('active'));
        }
        item.classList.add('active');

        // Update active view
        if (elements.views && elements.views.length > 0) {
            elements.views.forEach(view => view.classList.remove('active'));
        }

        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) targetView.classList.add('active');

        state.currentView = viewName;
    }

    // Chat functionality
    function sendMessage() {
        if (!elements.chatInput) return;

        const message = elements.chatInput.value.trim();
        if (!message) return;

        // Hide welcome screen if visible
        const welcomeScreen = document.querySelector('.welcome-screen');
        if (welcomeScreen) welcomeScreen.style.display = 'none';

        // Add user message
        addMessage(message, 'user');

        // Clear input
        elements.chatInput.value = '';
        if (elements.sendBtn) elements.sendBtn.disabled = true;
        adjustTextareaHeight();

        // Simulate AI response (in production, this would call your AI backend)
        setTimeout(() => generateAIResponse(message), 1000);

        // Save to chat history
        state.chatHistory.push({ role: 'user', content: message });
        saveToRecentChats(message);
    }

    function addMessage(content, role) {
        if (!elements.chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-balance-scale"></i>';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = content;

        messageContent.appendChild(messageText);

        // Add action buttons for AI messages
        if (role === 'assistant') {
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            actions.innerHTML = `
                <button class="btn-message-action" onclick="copyMessage(this)">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button class="btn-message-action" onclick="regenerateResponse()">
                    <i class="fas fa-redo"></i> Regenerate
                </button>
            `;
            messageContent.appendChild(actions);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        elements.chatMessages.appendChild(messageDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function generateAIResponse(userMessage) {
        // Mock response logic (kept same as original)
        let response = '';
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('contract') && lowerMessage.includes('requirement')) {
            response = `Under Kenyan law, specifically the Law of Contract Act (Cap. 23), a valid contract requires the following essential elements:

1. Offer and Acceptance
2. Consideration
3. Intention to Create Legal Relations
4. Capacity to Contract
5. Legality of Object
6. Certainty of Terms

Would you like more detail?`;
        } else if (lowerMessage.includes('employment')) {
            response = `Regarding employment law in Kenya, the primary legislation is the Employment Act, 2007. Key provisions include employment contracts, notice periods, leave entitlements, and protections against unfair dismissal.`;
        } else if (lowerMessage.includes('generate') || lowerMessage.includes('template')) {
            response = `I can help you generate a legal document. Provide type, parties, key terms, and any clauses you require.`;
        } else if (lowerMessage.includes('plaint') || lowerMessage.includes('filing')) {
            response = `The procedure for filing a plaint in Kenya follows the Civil Procedure Act and Civil Procedure Rules. File at the registry, pay fees, serve the defendant, and comply with procedural rules.`;
        } else {
            response = `Please provide more details about your legal question so I can assist more accurately.`;
        }

        addMessage(response, 'assistant');
        state.chatHistory.push({ role: 'assistant', content: response });
    }

    function startNewChat() {
        if (!elements.chatMessages) return;

        elements.chatMessages.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-icon"><i class="fas fa-balance-scale"></i></div>
                <h1 id="dynamicGreeting">Welcome to Legal AI Assistant</h1>
                <p id="greetingSubtext">Ask questions about Kenyan law, research case laws, or generate legal documents</p>
                <div class="suggestion-cards">
                    <button class="suggestion-card" data-prompt="What are the requirements for a valid contract under Kenyan law?"><i class="fas fa-file-contract"></i><span>Contract Requirements</span></button>
                    <button class="suggestion-card" data-prompt="Find recent cases on employment law in Kenya"><i class="fas fa-briefcase"></i><span>Employment Law Cases</span></button>
                    <button class="suggestion-card" data-prompt="Generate a sale agreement template"><i class="fas fa-file-signature"></i><span>Generate Document</span></button>
                    <button class="suggestion-card" data-prompt="What is the procedure for filing a plaint in Kenya?"><i class="fas fa-gavel"></i><span>Court Procedures</span></button>
                </div>
            </div>
        `;

        attachSuggestionCardListeners();
        setTimeout(updateDynamicGreeting, 100);
        state.chatHistory = [];
    }

    function copyMessage(button) {
        const messageContent = button.closest('.message-content');
        const text = messageContent.querySelector('.message-text').textContent;

        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => (button.innerHTML = originalHTML), 2000);
        });
    }

    function regenerateResponse() {
        if (!elements.chatMessages) return;

        const messages = elements.chatMessages.querySelectorAll('.message');
        if (messages.length >= 2) {
            const lastUserMessage = messages[messages.length - 2].querySelector('.message-text').textContent;
            messages[messages.length - 1].remove();
            setTimeout(() => generateAIResponse(lastUserMessage), 500);
        }
    }

    // File upload functionality
    function handleFileUpload(file) {
        if (!file || !elements.uploadZone || !elements.analyzeBtn) return;

        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid document (PDF, DOC, or DOCX)');
            return;
        }

        if (file.size > maxSize) {
            alert('File size must be less than 10MB');
            return;
        }

        state.uploadedFile = file;

        elements.uploadZone.innerHTML = `
            <i class="fas fa-file-check" style="color: var(--success-color);"></i>
            <h3>File Uploaded Successfully</h3>
            <p>${file.name}</p>
            <p class="upload-formats">${(file.size / 1024).toFixed(2)} KB</p>
        `;

        elements.analyzeBtn.disabled = false;
    }

    // Chat-specific attachment handling (opens from attachBtn)
    function handleChatFileUpload(file) {
        if (!file || !elements.chatMessages) return;

        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
            alert('Unsupported file type. Supported: PDF, DOC, DOCX, TXT, images.');
            return;
        }

        if (file.size > maxSize) {
            alert('File size must be less than 10MB');
            return;
        }

        // Save to state for possible later use
        state.uploadedFile = file;

        // Add a user message showing the attachment
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user message-file';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-user"></i>';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const filePreview = document.createElement('div');
        filePreview.className = 'file-preview';
        filePreview.innerHTML = `
            <div class="file-icon"><i class="fas fa-paperclip"></i></div>
            <div class="file-meta">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${(file.size / 1024).toFixed(2)} KB</div>
            </div>
        `;

        messageContent.appendChild(filePreview);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        elements.chatMessages.appendChild(messageDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        // Optionally simulate assistant acknowledgement
        setTimeout(() => {
            addMessage(`Received the file "${file.name}". What would you like me to do with it?`, 'assistant');
            state.chatHistory.push({ role: 'assistant', content: `Received the file "${file.name}".` });
        }, 700);
    }

    function analyzeDocument() {
        if (!state.uploadedFile || !elements.analyzeBtn) return;

        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.innerHTML = '<span class="loading"></span> Analyzing...';

        const analysisTypeEl = document.querySelector('input[name="analysisType"]:checked');
        const analysisType = analysisTypeEl ? analysisTypeEl.value : 'summary';

        // Simulate analysis (in production, send to backend)
        setTimeout(() => {
            displayAnalysisResults(analysisType);
            elements.analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Document';
            elements.analyzeBtn.disabled = false;
        }, 2000);
    }

    function displayAnalysisResults(analysisType) {
        const resultsDiv = document.getElementById('analysisResults');
        if (!resultsDiv) return;

        let resultsHTML = '<h3>Analysis Results</h3>';

        if (analysisType === 'error') {
            resultsHTML += `
                <div class="result-section">
                    <h4><i class="fas fa-exclamation-circle" style="color: var(--warning-color);"></i> Errors Found (3)</h4>
                    <ul>
                        <li><strong>Line 15:</strong> Grammatical error - "recieve" should be "receive"</li>
                        <li><strong>Line 23:</strong> Legal terminology - "hereby" usage is redundant</li>
                        <li><strong>Line 31:</strong> Missing comma after introductory clause</li>
                    </ul>
                </div>
            `;
        } else if (analysisType === 'compliance') {
            resultsHTML += `
                <div class="result-section">
                    <h4><i class="fas fa-shield-alt"></i> Compliance Status</h4>
                    <p><strong>Overall Compliance:</strong> 85%</p>
                </div>
            `;
        } else {
            resultsHTML += `<div class="result-section"><h4>Contract Review Summary</h4></div>`;
        }

        resultsDiv.innerHTML = resultsHTML;
        resultsDiv.style.display = 'block';
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Template functionality
    function openTemplateModal(template) {
        state.currentTemplate = template;
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!modalTitle || !modalBody || !elements.modal) return;

        modalTitle.textContent = `Generate ${template}`;

        let formHTML = '<form id="templateForm">';
        formHTML += `
            <div class="form-group">
                <label>Document Title</label>
                <input type="text" name="title" required placeholder="Enter document title">
            </div>
        `;

        formHTML += `
            <div class="form-group">
                <label>Additional Details</label>
                <textarea name="details" required rows="4" placeholder="Provide specific details for this document"></textarea>
            </div>
            <button type="submit" class="btn-primary">Generate Document</button>
        </form>
        `;

        modalBody.innerHTML = formHTML;
        const formEl = document.getElementById('templateForm');
        if (formEl) {
            formEl.addEventListener('submit', (e) => {
                e.preventDefault();
                generateDocument(e.target);
            });
        }

        elements.modal.classList.add('active');
    }

    function closeTemplateModal() {
        if (elements.modal) elements.modal.classList.remove('active');
        state.currentTemplate = null;
    }

    function generateDocument(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        alert(`Document generation initiated!\n\nTemplate: ${state.currentTemplate}\n\nDemo mode.`);
        closeTemplateModal();
    }

    // Case search functionality
    function performCaseSearch() {
        if (!elements.caseSearchInput) return;

        const query = elements.caseSearchInput.value.trim();
        if (!query) return;

        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '<div class="search-placeholder"><span class="loading" style="width:40px;height:40px;"></span><p>Searching legal database...</p></div>';

        setTimeout(() => displaySearchResults(query), 1500);
    }

    function displaySearchResults(query) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        const results = [
            { title: 'Sample Case A', court: 'High Court', date: '2021-05-15', type: 'Case Law', excerpt: 'Excerpt for case A...' },
            { title: 'Employment Act, 2007 - Section 45', court: 'Statute', date: '2007', type: 'Legislation', excerpt: 'Excerpt for statute...' }
        ];

        let resultsHTML = '';
        results.forEach(result => {
            resultsHTML += `
                <div class="search-result-item">
                    <div class="result-header">
                        <div>
                            <div class="result-title">${result.title}</div>
                            <div class="result-meta"><span>${result.court}</span> <span>${result.date}</span></div>
                        </div>
                        <span class="result-badge">${result.type}</span>
                    </div>
                    <div class="result-excerpt">${result.excerpt}</div>
                </div>
            `;
        });

        resultsContainer.innerHTML = resultsHTML;
    }

    // Recent chats management
    function saveToRecentChats(message) {
        const preview = message.length > 50 ? message.substring(0, 50) + '...' : message;
        state.recentChats.unshift({ id: Date.now(), preview, timestamp: new Date() });
        state.recentChats = state.recentChats.slice(0, 10);
        updateRecentChatsUI();
    }

    function loadRecentChats() {
        updateRecentChatsUI();
    }

    function updateRecentChatsUI() {
        if (!elements.recentChatsContainer) return;

        if (state.recentChats.length === 0) {
            elements.recentChatsContainer.innerHTML = '<p style="color:var(--text-light);font-size:13px;padding:12px;">No recent consultations</p>';
            return;
        }

        elements.recentChatsContainer.innerHTML = '';
        state.recentChats.forEach(chat => {
            const chatItem = document.createElement('button');
            chatItem.className = 'recent-chat-item';
            chatItem.textContent = chat.preview;
            chatItem.addEventListener('click', () => startNewChat());
            elements.recentChatsContainer.appendChild(chatItem);
        });
    }

    // Utility functions
    function adjustTextareaHeight() {
        if (elements.chatInput) {
            elements.chatInput.style.height = 'auto';
            elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 200) + 'px';
        }
    }

    // Settings functionality
    function openSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.add('active');
            loadUserSettings();
        }
    }

    function closeSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.remove('active');
    }

    function loadUserSettings() {
        const nameInput = document.getElementById('settingsName');
        const emailInput = document.getElementById('settingsEmail');
        const firmInput = document.getElementById('settingsFirm');
        const practiceInput = document.getElementById('settingsPractice');
        const notificationsInput = document.getElementById('settingsNotifications');
        const citationsInput = document.getElementById('settingsCitations');
        const autoSaveInput = document.getElementById('settingsAutoSave');
        const languageInput = document.getElementById('settingsLanguage');
        const dateFormatInput = document.getElementById('settingsDateFormat');

        if (nameInput) nameInput.value = localStorage.getItem('userName') || '';
        if (emailInput) emailInput.value = localStorage.getItem('userEmail') || '';
        if (firmInput) firmInput.value = localStorage.getItem('userFirm') || '';
        if (practiceInput) practiceInput.value = localStorage.getItem('userPractice') || '';
        if (notificationsInput) notificationsInput.checked = localStorage.getItem('notifications') !== 'false';
        if (citationsInput) citationsInput.checked = localStorage.getItem('citations') !== 'false';
        if (autoSaveInput) autoSaveInput.checked = localStorage.getItem('autoSave') !== 'false';
        if (languageInput) languageInput.value = localStorage.getItem('language') || 'en';
        if (dateFormatInput) dateFormatInput.value = localStorage.getItem('dateFormat') || 'dd/mm/yyyy';
    }

    function saveSettings() {
        const nameEl = document.getElementById('settingsName');
        const emailEl = document.getElementById('settingsEmail');
        const firmEl = document.getElementById('settingsFirm');
        const practiceEl = document.getElementById('settingsPractice');
        const notificationsEl = document.getElementById('settingsNotifications');
        const citationsEl = document.getElementById('settingsCitations');
        const autoSaveEl = document.getElementById('settingsAutoSave');
        const languageEl = document.getElementById('settingsLanguage');
        const dateFormatEl = document.getElementById('settingsDateFormat');

        if (nameEl && nameEl.value) localStorage.setItem('userName', nameEl.value);
        if (emailEl) localStorage.setItem('userEmail', emailEl.value || '');
        if (firmEl) localStorage.setItem('userFirm', firmEl.value || '');
        if (practiceEl) localStorage.setItem('userPractice', practiceEl.value || '');
        if (notificationsEl) localStorage.setItem('notifications', notificationsEl.checked);
        if (citationsEl) localStorage.setItem('citations', citationsEl.checked);
        if (autoSaveEl) localStorage.setItem('autoSave', autoSaveEl.checked);
        if (languageEl) localStorage.setItem('language', languageEl.value || 'en');
        if (dateFormatEl) localStorage.setItem('dateFormat', dateFormatEl.value || 'dd/mm/yyyy');

        updateDynamicGreeting();
        alert('Settings saved successfully!');
        closeSettingsModal();
    }

    /* Profile modal: consolidated global implementation (ensures View Profile works reliably) */
    function openProfileModal() {
        // Ensure modal container exists
        let profileModal = document.getElementById('profileModal');
        if (!profileModal) {
            profileModal = document.createElement('div');
            profileModal.id = 'profileModal';
            profileModal.className = 'modal';
            document.body.appendChild(profileModal);
        }

        // Build modal content (recreate each time to ensure fresh listeners)
        profileModal.innerHTML = `
            <div class="modal-backdrop" id="profileBackdrop">
                <div class="modal-inner" role="dialog" aria-modal="true" aria-labelledby="profileTitle">
                    <button id="closeProfileBtn" class="modal-close" aria-label="Close">&times;</button>
                    <div class="modal-content profile-modal-content">
                        <h2 id="profileTitle">Account Profile</h2>

                        <div class="profile-section">
                            <p><strong>Name:</strong> <span id="profileName">-</span></p>
                            <p><strong>Email:</strong> <span id="profileEmail">-</span></p>
                            <p><strong>Current Plan:</strong> <span id="currentPlan">-</span></p>
                        </div>

                        <div class="profile-actions">
                            <button id="upgradePlanBtn" class="btn-primary">Upgrade Plan</button>
                            <button id="changePasswordBtn" class="btn-secondary">Change Password</button>
                            <button id="signOutBtn" class="btn-danger">Sign Out</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Attach listeners
        const closeBtn = document.getElementById('closeProfileBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);

        const backdrop = document.getElementById('profileBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeProfileModal();
            });
        }

        const upgradeBtn = document.getElementById('upgradePlanBtn');
        if (upgradeBtn) upgradeBtn.addEventListener('click', () => {
            closeProfileModal();
            openPricingModal();
        });

        const changePwdBtn = document.getElementById('changePasswordBtn');
        if (changePwdBtn) changePwdBtn.addEventListener('click', changePassword);

        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) signOutBtn.addEventListener('click', logout);

        loadUserProfile();

        profileModal.classList.add('active');

        // ESC to close
        const escHandler = (ev) => { if (ev.key === 'Escape') closeProfileModal(); };
        document.addEventListener('keydown', escHandler);

        // store cleanup for later removal
        profileModal._cleanupEsc = () => document.removeEventListener('keydown', escHandler);
    }

    function closeProfileModal() {
        const profileModal = document.getElementById('profileModal');
        if (!profileModal) return;
        profileModal.classList.remove('active');

        // cleanup ESC listener
        if (typeof profileModal._cleanupEsc === 'function') profileModal._cleanupEsc();

        // clear markup after short delay
        setTimeout(() => {
            const pm = document.getElementById('profileModal');
            if (pm && !pm.classList.contains('active')) pm.innerHTML = '';
        }, 200);
    }

    function loadUserProfile() {
        const name = localStorage.getItem('userName') || 'Lawyer Name';
        const email = localStorage.getItem('userEmail') || 'lawyer@example.com';
        const plan = localStorage.getItem('userPlan') || 'Basic Plan';

        const profileNameEl = document.getElementById('profileName');
        const profileEmailEl = document.getElementById('profileEmail');
        const currentPlanEl = document.getElementById('currentPlan');

        if (profileNameEl) profileNameEl.textContent = name;
        if (profileEmailEl) profileEmailEl.textContent = email;
        if (currentPlanEl) currentPlanEl.textContent = plan;
    }

    function changePassword() {
        const newPassword = prompt('Enter new password:');
        if (newPassword) alert('Password changed successfully!');
    }

    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear user data
            localStorage.clear();
            // Show sign in page if present
            const signinPage = document.getElementById('signinPage');
            if (signinPage) signinPage.classList.remove('hidden');
            closeProfileModal();
        }
    }

    // New: create and open pricing modal dynamically (used by both Signin page and Profile dropdown)
    function createPricingModalIfMissing() {
        let pricingModal = document.getElementById('pricingModal');
        if (pricingModal) return pricingModal;

        pricingModal = document.createElement('div');
        pricingModal.id = 'pricingModal';
        pricingModal.className = 'modal';
        pricingModal.innerHTML = `
            <div class="modal-content pricing-modal-content" role="dialog" aria-modal="true" aria-labelledby="pricingTitle">
                <div class="modal-header">
                    <h3 id="pricingTitle">Pricing Plans</h3>
                    <button class="btn-close" id="closePricingBtn" aria-label="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p>Choose a plan that suits you.</p>
                    <div class="pricing-cards">
                        <div class="pricing-card">
                            <h4>Basic</h4>
                            <p>KES 2,500 / month</p>
                            <p class="small">Essential features for individual practitioners</p>
                            <button class="btn-primary plan-select" data-plan="basic">Select Basic</button>
                        </div>
                        <div class="pricing-card featured">
                            <h4>Pro</h4>
                            <p>KES 5,500 / month</p>
                            <p class="small">Advanced features for firms</p>
                            <button class="btn-primary plan-select" data-plan="pro">Select Pro</button>
                        </div>
                        <div class="pricing-card">
                            <h4>Student</h4>
                            <p>KES 500 / month</p>
                            <p class="small">Discounted plan for verified students</p>
                            <button class="btn-primary plan-select" data-plan="student">Select Student</button>
                        </div>
                    </div>
                    <div style="margin-top:12px;text-align:center;"><button class="btn-secondary" id="contactSales">Contact Sales (Enterprise)</button></div>
                </div>
            </div>
        `;

        document.body.appendChild(pricingModal);

        // attach listeners
        const closeBtn = document.getElementById('closePricingBtn');
        if (closeBtn) closeBtn.addEventListener('click', closePricingModal);

        pricingModal.addEventListener('click', (e) => {
            // close when clicking outside modal content
            if (e.target === pricingModal) closePricingModal();
        });

        const planButtons = pricingModal.querySelectorAll('.plan-select');
        planButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plan = e.currentTarget.dataset.plan;
                selectPlan(plan);
            });
        });

        const contactSales = document.getElementById('contactSales');
        if (contactSales) contactSales.addEventListener('click', () => {
            alert('Our sales team will reach out to discuss Enterprise plans.\n\nEmail: sales@legalai.co.ke');
            closePricingModal();
        });

        return pricingModal;
    }

    function openPricingModal() {
        const pricingModal = createPricingModalIfMissing();
        if (pricingModal) {
            pricingModal.classList.add('active');
            // set focus for accessibility
            const firstBtn = pricingModal.querySelector('.plan-select');
            if (firstBtn) firstBtn.focus();
        }
    }

    function closePricingModal() {
        const pricingModal = document.getElementById('pricingModal');
        if (!pricingModal) return;
        pricingModal.classList.remove('active');
        // remove from DOM after animation (optional)
        setTimeout(() => {
            const pm = document.getElementById('pricingModal');
            if (pm && !pm.classList.contains('active')) pm.remove();
        }, 200);
    }

    function selectPlan(planType) {
        if (planType === 'student') {
            closePricingModal();
            openStudentVerificationModal();
        } else if (planType === 'enterprise') {
            alert('Thank you for your interest in our Enterprise plan!\n\nOur sales team will contact you shortly.\n\nEmail: sales@legalai.co.ke\nPhone: +254 700 000 000');
            closePricingModal();
        } else {
            processPayment(planType);
        }
    }

    // Student verification - ensure modal exists and opens
    function openStudentVerificationModal() {
        let studentModal = document.getElementById('studentVerificationModal');
        if (!studentModal) {
            studentModal = document.createElement('div');
            studentModal.id = 'studentVerificationModal';
            studentModal.className = 'modal';
            studentModal.innerHTML = `
                <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="studentTitle">
                    <div class="modal-header">
                        <h3 id="studentTitle">Student Verification</h3>
                        <button class="btn-close" id="closeStudentVerificationBtn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <p>Provide your student details to verify eligibility for the Student Plan.</p>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="studentEmail" placeholder="student@university.ac.ke">
                        </div>
                        <div class="form-group">
                            <label>Student ID</label>
                            <input type="text" id="studentId" placeholder="Student ID">
                        </div>
                        <div class="form-group">
                            <label>Institution</label>
                            <input type="text" id="institutionName" placeholder="Institution name">
                        </div>
                        <div style="text-align:right;"><button class="btn-primary" id="verifyStudentBtn">Verify & Pay</button></div>
                    </div>
                </div>
            `;
            document.body.appendChild(studentModal);

            document.getElementById('closeStudentVerificationBtn')?.addEventListener('click', () => {
                studentModal.classList.remove('active');
                setTimeout(() => { if (studentModal && !studentModal.classList.contains('active')) studentModal.remove(); }, 200);
            });

            studentModal.addEventListener('click', (e) => {
                if (e.target === studentModal) {
                    studentModal.classList.remove('active');
                    setTimeout(() => { if (studentModal && !studentModal.classList.contains('active')) studentModal.remove(); }, 200);
                }
            });

            document.getElementById('verifyStudentBtn')?.addEventListener('click', () => {
                verifyStudentEmail();
            });
        }

        studentModal.classList.add('active');
    }

    function verifyStudentEmail() {
        const studentEmail = document.getElementById('studentEmail')?.value;
        const studentId = document.getElementById('studentId')?.value;
        const institutionName = document.getElementById('institutionName')?.value;

        if (!studentEmail || !studentId || !institutionName) {
            alert('Please fill in all fields');
            return;
        }

        const eduDomains = ['.ac.ke', '.edu', '.edu.ke'];
        const isEduEmail = eduDomains.some(domain => studentEmail.toLowerCase().includes(domain));

        if (!isEduEmail) {
            alert('Please provide a valid educational institution email address (.ac.ke, .edu, etc.)');
            return;
        }

        alert(`Student verification initiated for ${studentEmail}`);
        const studentModal = document.getElementById('studentVerificationModal');
        if (studentModal) studentModal.classList.remove('active');
        processStudentPayment();
    }

    function processStudentPayment() {
        if (confirm('Proceed to payment for Student Plan? Amount: KES 500/month')) {
            localStorage.setItem('userPlan', 'Student Plan');
            alert('Payment successful! Welcome to Student Plan');
        }
    }

    function processPayment(planType) {
        const planPrices = { basic: 2500, pro: 5500 };
        const planNames = { basic: 'Basic Plan', pro: 'Pro Plan' };
        const amount = planPrices[planType];
        const planName = planNames[planType];

        if (confirm(`Proceed to payment for ${planName}?\n\nAmount: KES ${amount}/month`)) {
            localStorage.setItem('userPlan', planName);
            alert('Payment successful! Welcome to ' + planName);
            closePricingModal();
        }
    }

    // Sign In functionality
    function handleSignIn(event) {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();

        const emailInput = document.getElementById('signinEmail');
        const passwordInput = document.getElementById('signinPassword');
        const rememberMeInput = document.getElementById('rememberMe');

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value;
        const password = passwordInput.value;
        const rememberMe = rememberMeInput ? rememberMeInput.checked : false;

        if (email && password) {
            const userName = email.split('@')[0];
            localStorage.setItem('userName', userName);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('isLoggedIn', 'true');
            if (rememberMe) localStorage.setItem('rememberMe', 'true');

            const signinPage = document.getElementById('signinPage');
            if (signinPage) signinPage.classList.add('hidden');

            setTimeout(updateDynamicGreeting, 500);
            alert('Welcome back! You are now signed in.');
        } else {
            alert('Please enter valid credentials');
        }
    }

    function signInWithGoogle() {
        alert('Google Sign In will be implemented here (demo)');
        localStorage.setItem('userName', 'User');
        localStorage.setItem('userEmail', 'user@gmail.com');
        localStorage.setItem('isLoggedIn', 'true');
        const signinPage = document.getElementById('signinPage');
        if (signinPage) signinPage.classList.add('hidden');
        setTimeout(updateDynamicGreeting, 500);
    }

    // New: Sign Up modal & handler
    function showSignUpForm() {
        let signupModal = document.getElementById('signupModal');
        if (!signupModal) {
            signupModal = document.createElement('div');
            signupModal.id = 'signupModal';
            signupModal.className = 'modal';
            signupModal.innerHTML = `
                <div class="modal-content signup-modal-content" role="dialog" aria-modal="true" aria-labelledby="signupTitle">
                    <div class="modal-header">
                        <h3 id="signupTitle">Create an Account</h3>
                        <button class="btn-close" id="closeSignupBtn" aria-label="Close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <form id="signupForm">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" id="signupName" required placeholder="Your full name">
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="signupEmail" required placeholder="you@example.com">
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="password" id="signupPassword" required placeholder="Password">
                            </div>
                            <div class="form-group">
                                <label>Confirm Password</label>
                                <input type="password" id="signupPasswordConfirm" required placeholder="Confirm Password">
                            </div>
                            <div style="text-align:right;margin-top:8px;">
                                <button type="submit" class="btn-primary">Create Account</button>
                                <button type="button" class="btn-secondary" id="viewPlansFromSignup">View Plans</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(signupModal);

            document.getElementById('closeSignupBtn')?.addEventListener('click', () => {
                signupModal.classList.remove('active');
                setTimeout(() => { if (signupModal && !signupModal.classList.contains('active')) signupModal.remove(); }, 200);
            });

            signupModal.addEventListener('click', (e) => {
                if (e.target === signupModal) {
                    signupModal.classList.remove('active');
                    setTimeout(() => { if (signupModal && !signupModal.classList.contains('active')) signupModal.remove(); }, 200);
                }
            });

            const form = document.getElementById('signupForm');
            if (form) form.addEventListener('submit', handleSignUp);

            document.getElementById('viewPlansFromSignup')?.addEventListener('click', () => {
                openPricingModal();
            });
        }

        signupModal.classList.add('active');
        const firstInput = document.getElementById('signupName');
        if (firstInput) firstInput.focus();
    }

    function handleSignUp(event) {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        const name = document.getElementById('signupName')?.value?.trim();
        const email = document.getElementById('signupEmail')?.value?.trim();
        const password = document.getElementById('signupPassword')?.value;
        const confirm = document.getElementById('signupPasswordConfirm')?.value;

        if (!name || !email || !password) {
            alert('Please fill all required fields.');
            return;
        }
        if (password !== confirm) {
            alert('Passwords do not match.');
            return;
        }

        // Demo: save user to localStorage and mark logged in
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('isLoggedIn', 'true');

        // Close signup modal
        const signupModal = document.getElementById('signupModal');
        if (signupModal) {
            signupModal.classList.remove('active');
            setTimeout(() => { if (signupModal && !signupModal.classList.contains('active')) signupModal.remove(); }, 200);
        }

        // Hide signin page if present
        const signinPage = document.getElementById('signinPage');
        if (signinPage) signinPage.classList.add('hidden');

        setTimeout(updateDynamicGreeting, 300);
        alert('Account created and signed in (demo).');
    }

    // Check if user is already logged in on page load
    function checkUserSession() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const signinPage = document.getElementById('signinPage');

        if (signinPage) {
            if (isLoggedIn === 'true') signinPage.classList.add('hidden');
            else signinPage.classList.remove('hidden');
        }
    }

    // Update profile dropdown with user info
    function updateProfileDropdown() {
        const name = localStorage.getItem('userName') || 'Lawyer';
        const email = localStorage.getItem('userEmail') || 'lawyer@example.com';
        const plan = localStorage.getItem('userPlan') || 'Basic Plan';

        const dropdownName = document.getElementById('dropdownName');
        const dropdownEmail = document.getElementById('dropdownEmail');
        const dropdownPlan = document.getElementById('dropdownPlan');

        if (dropdownName) dropdownName.textContent = name;
        if (dropdownEmail) dropdownEmail.textContent = email;
        if (dropdownPlan) {
            // Keep the icon and update plan text
            dropdownPlan.innerHTML = `<i class="fas fa-crown"></i> ${plan}`;
        }
    }

    // Close profile dropdown
    function closeProfileDropdown() {
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown) {
            profileDropdown.classList.remove('open');
        }
    }

    // Ensure the app initializes once when DOM is ready and surface init errors
    document.addEventListener('DOMContentLoaded', () => {
      try {
        if (window.__INLAW_APP_INITIALIZED__) return;
        window.__INLAW_APP_INITIALIZED__ = true;
        init();
        console.log('Inlaw AI: app initialized');
      } catch (err) {
        console.error('Inlaw AI: init failed', err);
        alert('Initialization error (check console).');
      }
    });

    // Expose functions referenced from inline HTML to global scope
    // (keeps global surface minimal to avoid redeclaration issues if script loads twice)
    window.handleSignIn = handleSignIn;
    window.signInWithGoogle = signInWithGoogle;
    window.showSignUpForm = showSignUpForm;
    window.handleSignUp = handleSignUp;
    window.openPricingModal = openPricingModal;
    window.openSettingsModal = openSettingsModal;
    window.logout = logout;
    window.copyMessage = copyMessage;
    window.regenerateResponse = regenerateResponse;

    // Defensive: bind forms if present when DOM ready (prevents reliance on inline attributes)
    document.addEventListener('DOMContentLoaded', () => {
        const signinForm = document.getElementById('signinForm');
        if (signinForm && !signinForm._bound) {
            signinForm.addEventListener('submit', handleSignIn);
            signinForm._bound = true;
        }
        const signupForm = document.getElementById('signupForm');
        if (signupForm && !signupForm._bound) {
            signupForm.addEventListener('submit', handleSignUp);
            signupForm._bound = true;
        }

        // Attach click handlers inside profile dropdown for upgrade plan if dropdown exists
        const dropdownUpgrade = document.getElementById('dropdownUpgradePlan');
        if (dropdownUpgrade) {
            dropdownUpgrade.addEventListener('click', (e) => {
                e.preventDefault();
                closeProfileDropdown();
                openPricingModal();
            });
        }

        // Attach "view pricing" on signup/signin pages if buttons exist
        const viewPlansButtons = document.querySelectorAll('[data-action="view-plans"]');
        viewPlansButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openPricingModal();
            });
        });
    });

    // Theme helpers: toggles body.dark-mode and persists choice
    function applyThemeFromStorage() {
        const theme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-mode', theme === 'dark');
        updateThemeToggleButton();
    }

    function toggleTheme() {
        const nowDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', nowDark ? 'dark' : 'light');
        updateThemeToggleButton();
    }

    function updateThemeToggleButton() {
        const btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        btn.textContent = document.body.classList.contains('dark-mode') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }

})();