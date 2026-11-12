
(function () {
  'use strict';

  let client = null;
  let guide = null;
  let editorToken = null;
  let publicId = null;

  function configReady() {
    return (
        window.SUPABASE_URL &&
        !window.SUPABASE_URL.includes('PASTE_') &&
        window.SUPABASE_ANON_KEY &&
        !window.SUPABASE_ANON_KEY.includes('PASTE_')
    );
  }
  /* =========================================================
     ROUTING
  ========================================================= */
  function route() {
    const path = location.pathname
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter(Boolean);

    if (path[0] === 'edit' && path[1]) {
      return {
        mode: 'edit',
        value: decodeURIComponent(path[1])
      };
    }

    if (path[0] === 'g' && path[1]) {
      return {
        mode: 'guest',
        value: decodeURIComponent(path[1])
      };
    }

    const params = new URLSearchParams(location.search);

    if (params.get('edit')) {
      return {
        mode: 'edit',
        value: params.get('edit')
      };
    }

    if (params.get('guide')) {
      return {
        mode: 'guest',
        value: params.get('guide')
      };
    }

    return {
      mode: 'guest',
      value: null
    };
  }

  /* =========================================================
     SECURITY / HTML ESCAPE
  ========================================================= */

  function escapeHtml(value) {
    return String(value ?? '').replace(
        /[&<>'"]/g,
        function (char) {
          return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
          }[char];
        }
    );
  }

  /* =========================================================
     DOM HELPERS
  ========================================================= */

  function setText(id, value) {
    const element = document.getElementById(id);

    if (
        element &&
        value !== null &&
        value !== undefined
    ) {
      element.textContent = value;
    }
  }

  function setValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.value = value || '';
    }
  }

  /* =========================================================
     OPENING SCREEN SETTINGS
  ========================================================= */

  function getOpeningSettings(g) {
    const data = g?.guide_data || {};
    const opening = data.opening || {};

    return {
      location: opening.location || g?.address || 'Your destination',
      button_text: opening.button_text || 'Explore Your Stay',
      cover_photo: opening.cover_photo || ''
    };
  }

  /* =========================================================
     ACKNOWLEDGMENT SETTINGS
  ========================================================= */

  const DEFAULT_ACKNOWLEDGMENTS = [
    'Guest(s) acknowledge that the use of the pool and gym facilities involves inherent risks, including but not limited to injury or death, and voluntarily assume all such risks.',
    'Compliance with Rules: Guest(s) agree to abide by all posted rules and regulations for pool and gym use provided by the Host or property management.',
    'Supervision: If children will be using the facilities, Guest(s) agree to provide adequate supervision and accept full responsibility for their safety.',
    'Release of Liability: Guest(s) release the Host, property owner, and property management from any liability for injury, illness, or death resulting from the use of the pool and gym facilities.',
    'Indemnification: Guest(s) agree to indemnify and hold the Host harmless from any claims or expenses arising from their use of the facilities.',
    'Emergency Procedures: Guest(s) agree to follow all posted emergency procedures and instructions provided by the Host or property management. By booking the property, Guest(s) acknowledge having read and understood this Release and agree to its terms.'
  ];

  function getAcknowledgmentSettings(g) {
    const saved = g?.guide_data?.acknowledgment || {};

    return {
      enabled: saved.enabled !== false,
      title: saved.title || 'Acknowledgment of Risks',
      introduction: saved.introduction ||
          'By continuing, you acknowledge and agree to the following:',
      agreements: Array.isArray(saved.agreements)
          ? saved.agreements
          : [...DEFAULT_ACKNOWLEDGMENTS],
      checkbox_text: saved.checkbox_text ||
          'I have read, understood, and agree to all the statements above.',
      button_text: saved.button_text || 'I Agree & Continue'
    };
  }

  function applyAcknowledgmentSettings(g) {
    if (!g) return;

    const settings = getAcknowledgmentSettings(g);

    window.currentGuideAcknowledgment = settings;

    setText('risk-modal-title', settings.title);
    setText('risk-modal-intro', settings.introduction);
    setText('risk-checkbox-label', settings.checkbox_text);
    setText('risk-continue-button', settings.button_text);

    const list = document.getElementById('risk-agreements-list');

    if (list) {
      list.replaceChildren();

      settings.agreements.forEach(function (statement) {
        const item = document.createElement('li');
        item.textContent = statement;
        list.appendChild(item);
      });
    }
  }

  /* Read the current acknowledgment editor inputs. */

  function collectAcknowledgmentSettings() {
    const previous = getAcknowledgmentSettings(guide);

    const enabledInput = document.getElementById('e-ack-enabled');
    const titleInput = document.getElementById('e-ack-title');
    const introInput = document.getElementById('e-ack-introduction');
    const checkboxInput = document.getElementById('e-ack-checkbox-text');
    const buttonInput = document.getElementById('e-ack-button-text');

    const agreementContainer = document.getElementById('e-ack-agreements');

    const agreements = agreementContainer
        ? Array.from(
            agreementContainer.querySelectorAll('.e-ack-agreement')
        ).map(function (input) {
          return input.value.trim();
        }).filter(Boolean)
        : previous.agreements;

    return {
      enabled: enabledInput ? enabledInput.checked : previous.enabled,
      title: titleInput ? titleInput.value.trim() : previous.title,
      introduction: introInput ? introInput.value.trim() : previous.introduction,
      agreements: agreements,
      checkbox_text: checkboxInput
          ? checkboxInput.value.trim()
          : previous.checkbox_text,
      button_text: buttonInput
          ? buttonInput.value.trim()
          : previous.button_text
    };
  }

  /* Render the editable agreement statements. */

  function renderAcknowledgmentEditor(settingsOverride) {
    const container = document.getElementById('e-ack-agreements');

    if (!container) return;

    const settings = settingsOverride || getAcknowledgmentSettings(guide);
    container.replaceChildren();

    settings.agreements.forEach(function (statement, index) {
      const row = document.createElement('div');

      row.style.cssText =
          'border:1px solid #ddd;' +
          'border-radius:10px;' +
          'padding:10px;' +
          'margin-bottom:10px;' +
          'background:#fff;';

      const heading = document.createElement('div');
      heading.textContent = 'Agreement ' + (index + 1);
      heading.style.cssText =
          'font-size:12px;font-weight:700;margin-bottom:8px;color:#52645b;';

      const textarea = document.createElement('textarea');
      textarea.className = 'e-ack-agreement';
      textarea.rows = 4;
      textarea.value = statement;
      textarea.maxLength = 2000;
      textarea.style.width = '100%';
      textarea.style.boxSizing = 'border-box';

      const controls = document.createElement('div');
      controls.style.cssText =
          'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';

      [
        { label: 'Move up', action: 'up', disabled: index === 0 },
        { label: 'Move down', action: 'down', disabled: index === settings.agreements.length - 1 },
        { label: 'Delete', action: 'delete', disabled: false }
      ].forEach(function (control) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = control.label;
        button.dataset.ackAction = control.action;
        button.dataset.ackIndex = index;
        button.disabled = control.disabled;
        button.style.cssText =
            'padding:7px 10px;border:1px solid #ddd;border-radius:7px;' +
            'background:#f7f7f7;cursor:pointer;font-size:12px;';
        controls.appendChild(button);
      });

      row.appendChild(heading);
      row.appendChild(textarea);
      row.appendChild(controls);
      container.appendChild(row);
    });
  }

  /* Preview the modal using unsaved editor values. */

  function previewAcknowledgment() {
    const modal = document.getElementById('risk-modal');

    if (!modal) {
      setStatus('The acknowledgment modal was not found in index.html.', false);
      return;
    }

    const previewSettings = collectAcknowledgmentSettings();

    const previewGuide = {
      ...guide,
      guide_data: {
        ...(guide?.guide_data || {}),
        acknowledgment: previewSettings
      }
    };

    applyAcknowledgmentSettings(previewGuide);

    const checkbox = document.getElementById('risk-agreement-checkbox');
    if (checkbox) checkbox.checked = false;

    modal.style.display = 'flex';

    setStatus('Previewing your acknowledgment. These changes are not saved yet.');
  }

  function applyOpeningSettings(g) {
    if (!g) return;

    const opening = getOpeningSettings(g);

    setText(
        'cover-location-text',
        opening.location
    );

    setText(
        'cover-button-text',
        opening.button_text
    );

    const cover = document.querySelector(
        '#cover .cover-image'
    );

    if (cover) {
      if (opening.cover_photo) {
        const safeUrl = opening.cover_photo.replace(
            /["\\\n\r]/g,
            '\\$&'
        );

        cover.style.backgroundImage =
            'linear-gradient(' +
            '180deg,' +
            'rgba(41, 77, 85, 0.03) 10%,' +
            'rgba(41, 77, 85, 0.12) 40%,' +
            'rgba(41, 77, 85, 0.72) 100%' +
            '), url("' + safeUrl + '")';

        cover.style.backgroundPosition = 'center';
        cover.style.backgroundSize = 'cover';
        cover.style.backgroundRepeat = 'no-repeat';

      } else {
        // Restore the original CSS background.
        cover.style.backgroundImage = '';
        cover.style.backgroundPosition = '';
        cover.style.backgroundSize = '';
        cover.style.backgroundRepeat = '';
      }
    }
  }

  function renderGuestDashboardCustomButtons(buttons) {
    const container = document.getElementById(
        'dashboard-custom-buttons'
    );

    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(buttons)) return;

    buttons.forEach(function (item) {
      if (item.visible === false || !item.name) return;

      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'dash-item';

      const icon = document.createElement('span');
      icon.className = 'dash-icon';

      const iconElement = document.createElement('i');
      iconElement.setAttribute(
          'data-lucide',
          item.icon || 'sparkles'
      );

      icon.appendChild(iconElement);

      const text = document.createElement('span');
      text.className = 'dash-text';

      const name = document.createElement('strong');
      name.textContent = item.name;

      const subtitle = document.createElement('small');
      subtitle.textContent = item.subtitle || '';

      text.appendChild(name);
      text.appendChild(subtitle);

      button.appendChild(icon);
      button.appendChild(text);

      button.addEventListener('click', function () {
        if (item.destination_type === 'external_link') {
          if (item.external_url) {
            window.open(
                item.external_url,
                '_blank',
                'noopener,noreferrer'
            );
          }
          return;
        }

        if (item.destination_type === 'existing_page') {
          if (item.destination_page) {
            showPage(item.destination_page);
          }
          return;
        }

        // Custom Information Page will be connected
        // in a later step.
      });

      container.appendChild(button);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /* =========================================================
     APPLY GUIDE DATA TO WEBSITE
  ========================================================= */



  function applyGuide(g) {
    if (!g) return;

    // PROPERTY NAME
    setText(
        'property-name',
        g.property_name || 'Welcome Home'
    );

    // DASHBOARD SETTINGS
    const dashboard = g.guide_data?.dashboard || {};

    renderGuestDashboardCustomButtons(
        dashboard.custom_buttons || []
    );

    renderDashboardCustomButtons(
        dashboard.custom_buttons || []
    );

    setText(
        'dashboard-eyebrow',
        dashboard.eyebrow || 'YOUR STAY • YOUR GUIDE'
    );

    setText(
        'dashboard-heading',
        dashboard.heading || 'Settle in.'
    );

    setText(
        'dashboard-highlight',
        dashboard.highlight || 'Enjoy more.'
    );

    setText(
        'dashboard-description',
        dashboard.subtitle ||
        'Everything you need for a comfortable stay.'
    );

    // EXISTING SETTINGS
    applyOpeningSettings(g);
    applyAcknowledgmentSettings(g);

    // WELCOME PAGE
    setText(
        'welcome-title',
        g.welcome_title || 'Welcome! 👋'
    );

    setText(
        'welcome-message',
        g.welcome_message || 'Welcome to your stay.'
    );

    setText(
        'welcome-property',
        g.property_name || 'Your Property'
    );

    setText(
        'welcome-address',
        g.address || ''
    );

    // WIFI AND CONTACT
    setText('wifi-name', g.wifi_name || '');
    setText('wifi-pass', g.wifi_password || '');
    setText('host-name', g.host_name || '');
    setText('host-phone', g.host_phone || '');
    setText('check-in-time', g.check_in || '');
    setText('check-out-time', g.check_out || '');

    // GOOGLE MAPS
    if (g.google_maps_url) {
      document.querySelectorAll(
          'a[href*="google.com/maps"], a[data-map-link]'
      ).forEach(function (link) {
        link.href = g.google_maps_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
    }

    updateEditorFields(g);
  }



  /* =========================================================
     UPDATE EDITOR INPUTS
  ========================================================= */


  function updateEditorFields(g) {
    if (!g) return;

    const fields = [
      'property_name',
      'welcome_title',
      'welcome_message',
      'address',
      'google_maps_url',
      'check_in',
      'check_out',
      'wifi_name',
      'wifi_password',
      'host_name',
      'host_phone'
    ];

    fields.forEach(function (key) {
      setValue('e-' + key, g[key]);
    });

    // DASHBOARD SETTINGS
    const dashboard = g.guide_data?.dashboard || {};

    renderDashboardCustomButtons(
        dashboard.custom_buttons || []
    );

    setValue(
        'e-dashboard-eyebrow',
        dashboard.eyebrow || 'YOUR STAY • YOUR GUIDE'
    );

    setValue(
        'e-dashboard-heading',
        dashboard.heading || 'Settle in.'
    );

    setValue(
        'e-dashboard-highlight',
        dashboard.highlight || 'Enjoy more.'
    );

    setValue(
        'e-dashboard-subtitle',
        dashboard.subtitle || ''
    );

    // OPENING SETTINGS
    const opening = getOpeningSettings(g);

    setValue('e-opening_location', opening.location);
    setValue('e-opening_button_text', opening.button_text);

    // ACKNOWLEDGMENT SETTINGS
    const acknowledgment = getAcknowledgmentSettings(g);

    const enabledInput = document.getElementById('e-ack-enabled');

    if (enabledInput) {
      enabledInput.checked = acknowledgment.enabled;
    }

    setValue('e-ack-title', acknowledgment.title);
    setValue('e-ack-introduction', acknowledgment.introduction);
    setValue('e-ack-checkbox-text', acknowledgment.checkbox_text);
    setValue('e-ack-button-text', acknowledgment.button_text);

    renderOpeningCoverPreview();
    renderAcknowledgmentEditor();
  }


  /* =========================================================
     ERROR MESSAGE
  ========================================================= */

  function showSetupError(message) {
    const existing = document.querySelector(
        '.app-setup-error'
    );

    if (existing) {
      existing.remove();
    }

    const box = document.createElement('div');

    box.className = 'app-setup-error';

    box.innerHTML =
        '<strong>Welcome Guide</strong>' +
        '<p>' + escapeHtml(message) + '</p>' +
        '<button ' +
        'onclick="this.parentElement.remove()" ' +
        'style="' +
        'margin-top:12px;' +
        'padding:9px 14px;' +
        'border:0;' +
        'border-radius:8px;' +
        'background:#31483d;' +
        'color:white;' +
        'cursor:pointer;' +
        '">' +
        'Close' +
        '</button>';

    document.body.appendChild(box);
  }

  /* =========================================================
     LOAD GUEST GUIDE
  ========================================================= */

  async function loadGuest(id) {
    if (!id) return;

    if (!client) {
      showSetupError(
          'Supabase is not configured yet.'
      );
      return;
    }

    try {
      const result = await client
          .from('guides')
          .select('*')
          .eq('public_id', id)
          .eq('published', true)
          .maybeSingle();

      if (result.error) {
        showSetupError(
            'Could not load the guest guide: ' +
            result.error.message
        );
        return;
      }

      if (!result.data) {
        showSetupError(
            'This guest guide does not exist or has not been published yet.'
        );
        return;
      }

      guide = result.data;
      publicId = id;

      applyGuide(guide);

    } catch (error) {
      showSetupError(
          'Something went wrong while loading the guide: ' +
          error.message
      );
    }
  }

  /* =========================================================
     LOAD EDITOR
  ========================================================= */

  async function loadEditor(token) {
    if (!token) {
      showSetupError(
          'No editor token was provided.'
      );
      return;
    }

    if (!client) {
      showSetupError(
          'Supabase is not configured yet.'
      );
      return;
    }

    try {
      const result = await client.rpc(
          'get_guide_for_editor',
          {
            p_edit_token: token
          }
      );

      if (result.error) {
        showSetupError(
            'Editor could not be opened: ' +
            result.error.message
        );
        return;
      }

      guide = Array.isArray(result.data)
          ? result.data[0]
          : result.data;

      if (!guide) {
        showSetupError(
            'This editing link is invalid or expired.'
        );
        return;
      }

      editorToken = token;
      publicId = guide.public_id;

      applyGuide(guide);
      createEditor();

    } catch (error) {
      showSetupError(
          'Something went wrong while opening the editor: ' +
          error.message
      );
    }
  }

  function getDashboardCustomButtonsFromEditor() {
    const container = document.getElementById(
        'e-dashboard-custom-buttons'
    );

    if (!container) return [];

    return Array.from(
        container.querySelectorAll('.dashboard-custom-card')
    ).map(function (card) {

      const pageSection = Array.from(
          document.querySelectorAll('[data-custom-page-section]')
      ).find(function (section) {
        return section.dataset.section ===
            'custom-' + card.dataset.pageId;
      });

      const previousPageContent = card.pageContent || {};

      const pageContent = {
        ...previousPageContent,

        title: pageSection
            ? pageSection.querySelector('[data-page-field="title"]')?.value.trim() || ''
            : previousPageContent.title || '',

        description: pageSection
            ? pageSection.querySelector('[data-page-field="description"]')?.value.trim() || ''
            : previousPageContent.description || ''
      };

      return {
        id: card.dataset.buttonId,
        page_id: card.dataset.pageId,

        name: card.querySelector('[data-field="name"]')?.value.trim() || '',

        subtitle: card.querySelector('[data-field="subtitle"]')?.value.trim() || '',

        icon: card.querySelector('[data-field="icon"]')?.value.trim() || 'sparkles',

        visible: card.querySelector('[data-field="visible"]')?.checked ?? true,

        page_content: pageContent
      };
    });
  }


  function renderDashboardCustomButtons(buttons) {
    const container = document.getElementById(
        'e-dashboard-custom-buttons'
    );

    if (!container) return;

    container.innerHTML = '';

    if (!buttons || buttons.length === 0) {
      container.textContent = 'No custom buttons added yet.';
      return;
    }

    buttons.forEach(function (item, index) {
      const card = document.createElement('div');

      card.className = 'dashboard-custom-card';
      card.dataset.buttonId = item.id || crypto.randomUUID();

      const pageId =
          item.page_id || item.id || crypto.randomUUID();

      card.dataset.pageId = pageId;

      if (!item.page_id) {
        item.page_id = pageId;
      }

      card.pageContent = item.page_content || {
        title: '',
        description: '',
        photos: [],
        information_fields: [],
        buttons: []
      };

      card.style.cssText = `
      border:1px solid #deded8;
      border-radius:12px;
      padding:14px;
      margin:12px 0;
      background:#fff;
    `;

      card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <strong>Custom Button ${index + 1}</strong>

        <div style="display:flex;gap:6px;">
          <button type="button" data-action="up">↑</button>
          <button type="button" data-action="down">↓</button>
          <button type="button" data-action="delete">Delete</button>
        </div>
      </div>

      <label>
        Button Name
        <input data-field="name" type="text" maxlength="60"
          placeholder="SPA" value="">
      </label>

      <label>
        Subtitle
        <input data-field="subtitle" type="text" maxlength="100"
          placeholder="Relax and recharge" value="">
      </label>

      <label>
        Icon Name (Lucide)
        <input data-field="icon" type="text"
          placeholder="sparkles" value="">
      </label>

      <label style="display:flex;align-items:center;gap:8px;">
        <input data-field="visible" type="checkbox" checked>
        Show this button on the guest dashboard
      </label>
    `;

      card.querySelector('[data-field="name"]').value = item.name || '';

      card.querySelector('[data-field="name"]').addEventListener('input', function () {
        const pageId = card.dataset.pageId;

        const tab = document.querySelector(
            '[data-tab="custom-' + pageId + '"]'
        );

        const pageSection = document.querySelector(
            '[data-section="custom-' + pageId + '"]'
        );

        if (tab) {
          tab.textContent = this.value.trim() || 'New Page';
        }

        if (pageSection) {
          const heading = pageSection.querySelector('h3');

          if (heading) {
            heading.textContent = this.value.trim() || 'New Page';
          }
        }
      });

      card.querySelector('[data-field="subtitle"]').value = item.subtitle || '';
      card.querySelector('[data-field="icon"]').value = item.icon || 'sparkles';

      card.querySelector('[data-field="destination_type"]').value =
          item.destination_type || 'custom_info';

      card.querySelector('[data-field="destination_page"]').value =
          item.destination_page || '';

      card.querySelector('[data-field="external_url"]').value =
          item.external_url || '';

      card.querySelector('[data-field="visible"]').checked =
          item.visible !== false;

      container.appendChild(card);
    });

    renderCustomPageTabs(buttons);
  }

  function renderCustomPageTabs(buttons) {
    const tabBar = document.querySelector('.editor-tabs');
    const editorBody = document.querySelector('.editor-body');

    if (!tabBar || !editorBody) return;

    // Remove previously generated custom tabs
    tabBar.querySelectorAll('[data-custom-page-tab]').forEach(function (tab) {
      tab.remove();
    });

    // Remove previously generated custom sections
    editorBody.querySelectorAll('[data-custom-page-section]').forEach(function (section) {
      section.remove();
    });

    (buttons || []).forEach(function (item) {
      const pageId = item.page_id || item.id;
      const tabId = 'custom-' + pageId;

      // Create editor tab
      const tab = document.createElement('button');

      tab.type = 'button';
      tab.className = 'editor-tab';
      tab.dataset.tab = tabId;
      tab.dataset.customPageTab = 'true';
      tab.textContent = item.name || 'New Page';

      tab.addEventListener('click', function () {
        const tabId = tab.dataset.tab;

        tabBar.querySelectorAll('.editor-tab').forEach(function (btn) {
          btn.classList.remove('active');
        });

        editorBody.querySelectorAll('.editor-section').forEach(function (section) {
          section.classList.remove('active');
        });

        tab.classList.add('active');

        const targetSection = editorBody.querySelector(
            '[data-section="' + tabId + '"]'
        );

        if (targetSection) {
          targetSection.classList.add('active');
        }
      });

      tabBar.appendChild(tab);

      // Create matching editor section
      const section = document.createElement('div');

      section.className = 'editor-section';
      section.dataset.section = tabId;
      section.dataset.customPageSection = 'true';

      const pageContent = item.page_content || {};

      section.innerHTML = `
  <h3>Custom Information Page</h3>

  <label>
    Page Title
    <input
      type="text"
      data-page-field="title"
      placeholder="Example: Swimming Pool"
    >
  </label>

  <label>
    Description / Information
    <textarea
      data-page-field="description"
      rows="6"
      placeholder="Add helpful information for your guests..."
    ></textarea>
  </label>
`;

      section.querySelector('[data-page-field="title"]').value =
          pageContent.title || item.name || '';

      section.querySelector('[data-page-field="description"]').value =
          pageContent.description || '';

      editorBody.appendChild(section);
    });
  }

  /* =========================================================
     CREATE EDITOR PANEL
  ========================================================= */

  function createEditor() {
    if (document.getElementById('editor-panel')) {
      return;
    }

    document.body.classList.add('editor-mode');

    const panel = document.createElement('aside');

    panel.id = 'editor-panel';

    panel.innerHTML = `
      <div class="editor-topbar">

        <div>
          <span class="editor-kicker">
            CLIENT EDITOR
          </span>

          <h2>Welcome Guide</h2>
        </div>

        <button
          id="close-editor"
          class="editor-close"
          type="button"
          title="Close editor"
          aria-label="Close editor"
        >
          ×
        </button>

      </div>

      <div
        class="editor-status"
        id="editor-status"
      >
        Editing your guide
      </div>

      <div
        id="publish-status"
        style="
          margin:10px 0;
          padding:12px;
          border-radius:8px;
          background:#f1f3f1;
          color:#31483d;
          font-size:13px;
          font-weight:600;
        "
      >
        Checking publication status...
      </div>

      <div class="editor-tabs">

        <button
          class="editor-tab active"
          type="button"
          data-tab="opening"
        >
          Opening
        </button>
        
        <button
          class="editor-tab"
          type="button"
          data-tab="acknowledgment"
        >
          Acknowledgment
        </button>

        <button
          class="editor-tab"
          type="button"
          data-tab="welcome"
        >
          Dashboard
        </button>

        <button
          class="editor-tab"
          type="button"
          data-tab="stay"
        >
          Stay Details
        </button>

        <button
          class="editor-tab"
          type="button"
          data-tab="contact"
        >
          Contact
        </button>

        <button
          class="editor-tab"
          type="button"
          data-tab="photos"
        >
          Photos
        </button>

      </div>

      <div class="editor-body">

        <!-- OPENING -->

        <section
          class="editor-section active"
          data-section="opening"
        >

          <h3>Opening Screen</h3>

          <p>
            Customize the first screen your guests see when they open your guide.
          </p>

          <label>
            Cover photo

            <input
              id="e-opening-cover-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            >
          </label>

          <p>
            JPG, PNG, or WEBP. Maximum 5 MB.
            This photo is separate from your property gallery.
          </p>

          <div
            id="opening-cover-preview"
            style="
              width:100%;
              height:160px;
              border-radius:12px;
              overflow:hidden;
              background:#f1f3f1;
              display:flex;
              align-items:center;
              justify-content:center;
              margin:12px 0 18px;
              color:#64736b;
              font-size:13px;
            "
          >
            No custom cover photo uploaded.
          </div>

          <label>
            Opening location

            <input
              id="e-opening_location"
              type="text"
              placeholder="Your property address or location"
            >
          </label>

          <label>
            Opening button text

            <input
              id="e-opening_button_text"
              type="text"
              maxlength="40"
              placeholder="Explore Your Stay"
            >
          </label>

          <p>
            Example: Explore Your Stay, Enter Your Stay, or Let's Get Started.
          </p>

        </section>
                
        <!-- DASHBOARD -->
        
        <section
          class="editor-section"
          data-section="welcome"
        >
          <h3>Dashboard Settings</h3>
        
          <p>
            Customize the welcome text and the buttons guests see on your dashboard.
          </p>
        
          <label>
            Property Display Name
        
            <input
              id="e-property_name"
              type="text"
              placeholder="Your Property Name"
            >
          </label>
        
          <label>
            Dashboard Eyebrow
        
            <input
              id="e-dashboard-eyebrow"
              type="text"
              maxlength="80"
              placeholder="YOUR STAY • YOUR GUIDE"
            >
          </label>
        
          <label>
            Main Heading
        
            <input
              id="e-dashboard-heading"
              type="text"
              maxlength="80"
              placeholder="Settle in."
            >
          </label>
        
          <label>
            Heading Highlight
        
            <input
              id="e-dashboard-highlight"
              type="text"
              maxlength="80"
              placeholder="Enjoy more."
            >
          </label>
        
          <label>
            Welcome Subtitle
        
            <textarea
              id="e-dashboard-subtitle"
              rows="3"
              maxlength="300"
              placeholder="Everything you need for a comfortable stay."
            ></textarea>
          </label>
        
          <hr>
        
          <h3>Custom Guide Buttons</h3>
        
          <p>
            Add extra sections to your guest dashboard, such as SPA,
            Gym, Basketball Court, or other property facilities.
          </p>
        
          <div id="e-dashboard-custom-buttons">
            No custom buttons added yet.
          </div>
        
          <button
            id="e-dashboard-add-button"
            type="button"
            class="secondary-action"
          >
            + Add Custom Button
          </button>
        
          <p>
            You can customize each button's name, subtitle, icon,
            destination, visibility, and order.
          </p>
        
          <p class="ack-editor-note">
            Remember to click Save Changes after editing your dashboard.
          </p>
        </section>


        <!-- STAY -->

        <section
          class="editor-section"
          data-section="stay"
        >

          <label>
            Check-in

            <input
              id="e-check_in"
              type="text"
              placeholder="2:00 PM"
            >
          </label>

          <label>
            Check-out

            <input
              id="e-check_out"
              type="text"
              placeholder="11:00 AM"
            >
          </label>

          <label>
            Wi-Fi name

            <input
              id="e-wifi_name"
              type="text"
              placeholder="Wi-Fi network name"
            >
          </label>

          <label>
            Wi-Fi password

            <input
              id="e-wifi_password"
              type="text"
              placeholder="Wi-Fi password"
            >
          </label>

        </section>

        <!-- CONTACT -->

        <section
          class="editor-section"
          data-section="contact"
        >

          <label>
            Host name

            <input
              id="e-host_name"
              type="text"
              placeholder="Host name"
            >
          </label>

          <label>
            Host phone

            <input
              id="e-host_phone"
              type="text"
              placeholder="+63..."
            >
          </label>

        </section>

        <!-- PHOTOS -->

        <section
          class="editor-section"
          data-section="photos"
        >

          <label>
            Upload property photos

            <input
              id="e-photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
            >
          </label>

          <p>
            JPG, PNG, or WEBP. Maximum 5 MB per photo, up to 20 photos.
          </p>

          <div id="editor-photo-list">
            No photos uploaded yet.
          </div>

        </section>
      
      <!-- ACKNOWLEDGMENT -->
     
      <section class="editor-section" data-section="acknowledgment">
        <h3>Acknowledgment of Risks</h3>
      
        <p>
          Customize the acknowledgment modal guests see before entering
          the guide. One required checkbox will cover all agreement statements.
        </p>
      
        <div class="ack-editor-setting">
          <label class="ack-toggle">
            <input id="e-ack-enabled" type="checkbox">
            <span>Enable acknowledgment modal</span>
          </label>
        </div>
      
        <div class="ack-editor-setting">
          <label for="e-ack-title">Modal title</label>
          <input
            id="e-ack-title"
            type="text"
            maxlength="100"
            placeholder="Acknowledgment of Risks"
          >
        </div>
      
        <div class="ack-editor-setting">
          <label for="e-ack-introduction">Introduction</label>
          <textarea
            id="e-ack-introduction"
            rows="3"
            maxlength="500"
            placeholder="By continuing, you acknowledge and agree to the following:"
          ></textarea>
        </div>
      
        <div class="ack-editor-setting">
          <strong>Agreement statements</strong>
          <p>Add, edit, delete, or rearrange the statements guests must review.</p>
      
          <div id="e-ack-agreements"></div>
      
          <button
            id="e-ack-add-agreement"
            type="button"
            class="secondary-action"
          >
            + Add Agreement
          </button>
        </div>
      
        <div class="ack-editor-setting">
          <label for="e-ack-checkbox-text">Required checkbox wording</label>
          <textarea
            id="e-ack-checkbox-text"
            rows="3"
            maxlength="300"
            placeholder="I have read, understood, and agree to all the statements above."
          ></textarea>
        </div>
      
        <div class="ack-editor-setting">
          <label for="e-ack-button-text">Continue button text</label>
          <input
            id="e-ack-button-text"
            type="text"
            maxlength="50"
            placeholder="I Agree & Continue"
          >
        </div>
      
        <div class="ack-editor-setting">
          <button
            id="e-ack-preview"
            type="button"
            class="secondary-action"
          >
            Preview Acknowledgment
          </button>
        </div>
      
        <p class="ack-editor-note">
          Remember to click Save Changes to store your acknowledgment settings.
        </p>
      </section>
      
      </div>

      <div class="editor-actions">

        <button
          id="save-guide"
          class="save-guide"
          type="button"
        >
          Save Changes
        </button>

        <button
          id="publish-guide"
          class="save-guide"
          type="button"
        >
          Publish Guide
        </button>

        <button
          id="unpublish-guide"
          class="secondary-action"
          type="button"
        >
          Unpublish Guide
        </button>

        <button
          id="guest-preview"
          class="secondary-action"
          type="button"
        >
          Preview Guest Guide
        </button>

        <button
          id="copy-link"
          class="secondary-action"
          type="button"
        >
          Copy Guest Link
        </button>

      </div>
    `;

    document.body.appendChild(panel);


    // INITIALIZE CUSTOM DASHBOARD BUTTONS
    renderDashboardCustomButtons(
        guide?.guide_data?.dashboard?.custom_buttons || []
    );

    // ADD CUSTOM BUTTON
    document.getElementById('e-dashboard-add-button')
        .addEventListener('click', function () {
          const buttons = getDashboardCustomButtonsFromEditor();

          const newButtonId = crypto.randomUUID();

          buttons.push({
            id: newButtonId,
            page_id: newButtonId,

            name: '',
            subtitle: '',
            icon: 'sparkles',
            visible: true,

            page_content: {
              title: '',
              description: '',
              photos: [],
              information_fields: [],
              buttons: []
            }
          });

          renderDashboardCustomButtons(buttons);
        });

    // DELETE, MOVE UP, MOVE DOWN
    document.getElementById('e-dashboard-custom-buttons')
        .addEventListener('click', function (event) {
          const button = event.target.closest('[data-action]');

          if (!button) return;

          const card = button.closest('.dashboard-custom-card');

          if (!card) return;

          const buttons = getDashboardCustomButtonsFromEditor();

          const index = buttons.findIndex(function (item) {
            return item.id === card.dataset.buttonId;
          });

          if (index < 0) return;

          const action = button.dataset.action;

          if (action === 'delete') {
            buttons.splice(index, 1);
          }

          if (action === 'up' && index > 0) {
            const item = buttons.splice(index, 1)[0];
            buttons.splice(index - 1, 0, item);
          }

          if (action === 'down' && index < buttons.length - 1) {
            const item = buttons.splice(index, 1)[0];
            buttons.splice(index + 1, 0, item);
          }

          renderDashboardCustomButtons(buttons);
        });

    updateEditorFields(guide);
    renderOpeningCoverPreview();
    renderEditorPhotos();
    renderAcknowledgmentEditor();
    updatePublishControls();

    /* -----------------------------------------
       Tabs
    ----------------------------------------- */

    panel
        .querySelectorAll('.editor-tab')
        .forEach(function (button) {

          button.addEventListener(
              'click',
              function () {

                const tab = button.dataset.tab;

                if (tab.startsWith('custom-')) {
                  const customSection = panel.querySelector(
                      '[data-section="' + tab + '"]'
                  );

                  if (customSection) {
                    // Custom page section will be activated below.
                  }
                }

                panel
                    .querySelectorAll('.editor-tab')
                    .forEach(function (btn) {
                      btn.classList.remove('active');
                    });

                panel
                    .querySelectorAll('.editor-section')
                    .forEach(function (section) {
                      section.classList.remove('active');
                    });

                button.classList.add('active');

                const section = panel.querySelector(
                    '[data-section="' + tab + '"]'
                );

                if (section) {
                  section.classList.add('active');
                }

              }
          );

        });

    /* -----------------------------------------
       Close editor
    ----------------------------------------- */

    document
        .getElementById('close-editor')
        .addEventListener('click', function () {

          panel.remove();

          document.body.classList.remove(
              'editor-mode'
          );

        });

    /* -----------------------------------------
       Save
    ----------------------------------------- */

    document
        .getElementById('save-guide')
        .addEventListener('click', saveGuide);

    /* -----------------------------------------
       Publish
    ----------------------------------------- */

    document
        .getElementById('publish-guide')
        .addEventListener('click', publishGuide);

    /* -----------------------------------------
       Unpublish
    ----------------------------------------- */

    document
        .getElementById('unpublish-guide')
        .addEventListener('click', unpublishGuide);

    /* -----------------------------------------
       Preview
    ----------------------------------------- */

    document
        .getElementById('guest-preview')
        .addEventListener('click', function () {

          if (!publicId) {
            setStatus(
                'Guest guide ID is missing.',
                false
            );
            return;
          }

          if (guide?.published !== true) {
            setStatus(
                'Publish your guide before opening the guest link.',
                false
            );
            return;
          }

          const url =
              '/g/' + encodeURIComponent(publicId);

          window.open(
              url,
              '_blank',
              'noopener'
          );

        });

    /* -----------------------------------------
       Copy guest link
    ----------------------------------------- */

    document
        .getElementById('copy-link')
        .addEventListener('click', copyGuestLink);

    /* -----------------------------------------
       Gallery photo upload
    ----------------------------------------- */

    document
        .getElementById('e-photo-upload')
        .addEventListener('change', uploadGuidePhotos);

    /* -----------------------------------------
       Opening cover upload
    ----------------------------------------- */

    document
        .getElementById('e-opening-cover-upload')
        .addEventListener('change', uploadOpeningCover);


    /* -----------------------------------------
       Acknowledgment agreement controls
    ----------------------------------------- */

    document
        .getElementById('e-ack-add-agreement')
        .addEventListener('click', function () {
          const settings = collectAcknowledgmentSettings();

          settings.agreements.push('New agreement statement.');

          const titleInput = document.getElementById('e-ack-title');
          const introInput = document.getElementById('e-ack-introduction');
          const checkboxInput = document.getElementById('e-ack-checkbox-text');
          const buttonInput = document.getElementById('e-ack-button-text');

          // Keep the current editor values while adding a statement.
          if (titleInput) titleInput.value = settings.title;
          if (introInput) introInput.value = settings.introduction;
          if (checkboxInput) checkboxInput.value = settings.checkbox_text;
          if (buttonInput) buttonInput.value = settings.button_text;

          renderAcknowledgmentEditor(settings);
        });

    document
        .getElementById('e-ack-agreements')
        .addEventListener('click', function (event) {
          const button = event.target.closest('[data-ack-action]');

          if (!button) return;

          const settings = collectAcknowledgmentSettings();
          const index = Number(button.dataset.ackIndex);
          const action = button.dataset.ackAction;

          if (!Number.isInteger(index) || index < 0 || index >= settings.agreements.length) {
            return;
          }

          if (action === 'delete') {
            settings.agreements.splice(index, 1);
          }

          if (action === 'up' && index > 0) {
            const item = settings.agreements.splice(index, 1)[0];
            settings.agreements.splice(index - 1, 0, item);
          }

          if (action === 'down' && index < settings.agreements.length - 1) {
            const item = settings.agreements.splice(index, 1)[0];
            settings.agreements.splice(index + 1, 0, item);
          }

          // Preserve other acknowledgment fields.
          const titleInput = document.getElementById('e-ack-title');
          const introInput = document.getElementById('e-ack-introduction');
          const checkboxInput = document.getElementById('e-ack-checkbox-text');
          const buttonInput = document.getElementById('e-ack-button-text');

          if (titleInput) titleInput.value = settings.title;
          if (introInput) introInput.value = settings.introduction;
          if (checkboxInput) checkboxInput.value = settings.checkbox_text;
          if (buttonInput) buttonInput.value = settings.button_text;

          renderAcknowledgmentEditor(settings);
        });

    document
        .getElementById('e-ack-preview')
        .addEventListener('click', previewAcknowledgment);


    /* -----------------------------------------
       Keyboard shortcut
       Ctrl + S
    ----------------------------------------- */

    document.addEventListener(
        'keydown',
        function editorKeyboardShortcut(event) {

          if (
              event.ctrlKey &&
              event.key.toLowerCase() === 's' &&
              document.getElementById('editor-panel')
          ) {
            event.preventDefault();
            saveGuide();
          }

        }
    );
  }

  /* =========================================================
     OPENING COVER PHOTO PREVIEW
  ========================================================= */

  function renderOpeningCoverPreview() {
    const container = document.getElementById(
        'opening-cover-preview'
    );

    if (!container) return;

    const opening = getOpeningSettings(guide);

    container.replaceChildren();

    if (!opening.cover_photo) {
      container.textContent =
          'No custom cover photo uploaded.';
      return;
    }

    const image = document.createElement('img');

    image.src = opening.cover_photo;
    image.alt = 'Opening cover photo preview';

    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = 'cover';

    container.appendChild(image);
  }

  /* =========================================================
     UPLOAD OPENING COVER PHOTO
  ========================================================= */

  async function uploadOpeningCover(event) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    if (!editorToken || !publicId) {
      setStatus(
          'Editor information is missing.',
          false
      );
      input.value = '';
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      setStatus(
          'Only JPG, PNG, and WEBP photos are allowed.',
          false
      );
      input.value = '';
      return;
    }

    if (
        file.size === 0 ||
        file.size > 5 * 1024 * 1024
    ) {
      setStatus(
          'Cover photo must be between 1 byte and 5 MB.',
          false
      );
      input.value = '';
      return;
    }

    input.disabled = true;

    try {
      setStatus('Uploading opening cover photo...');

      const formData = new FormData();

      formData.append('edit_token', editorToken);
      formData.append('file', file);
      formData.append('upload_type', 'cover');

      const baseUrl = window.SUPABASE_URL.replace(
          /\/+$/,
          ''
      );

      const response = await fetch(
          baseUrl + '/functions/v1/upload-guide-photo',
          {
            method: 'POST',
            headers: {
              apikey: window.SUPABASE_ANON_KEY
            },
            body: formData
          }
      );

      let result;

      try {
        result = await response.json();
      } catch (error) {
        throw new Error(
            'Invalid response from photo upload server.'
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
            result.error || 'Cover photo upload failed.'
        );
      }

      if (!result.photo_url) {
        throw new Error(
            'The upload server did not return a photo URL.'
        );
      }

      if (!guide.guide_data || typeof guide.guide_data !== 'object') {
        guide.guide_data = {};
      }

      if (
          !guide.guide_data.opening ||
          typeof guide.guide_data.opening !== 'object'
      ) {
        guide.guide_data.opening = {};
      }

      guide.guide_data.opening.cover_photo =
          result.photo_url;

      // Update the opening screen immediately.
      applyOpeningSettings(guide);

      // Update the editor preview.
      renderOpeningCoverPreview();

      setStatus(
          'Cover photo uploaded. Click Save Changes to keep it.'
      );

    } catch (error) {
      setStatus(
          'Cover photo upload error: ' + error.message,
          false
      );

    } finally {
      input.disabled = false;
      input.value = '';
    }
  }

  /* =========================================================
     PUBLISH STATUS / BUTTONS
  ========================================================= */

  function updatePublishControls() {
    const status = document.getElementById(
        'publish-status'
    );

    const publishButton = document.getElementById(
        'publish-guide'
    );

    const unpublishButton = document.getElementById(
        'unpublish-guide'
    );

    if (!status || !publishButton || !unpublishButton) {
      return;
    }

    const isPublished = guide?.published === true;

    if (isPublished) {
      status.textContent =
          'Published — your guest guide is live.';

      status.style.background = '#e7f3e9';
      status.style.color = '#25643a';

      publishButton.hidden = true;
      unpublishButton.hidden = false;

    } else {
      status.textContent =
          'Draft — your guide is not visible to guests yet.';

      status.style.background = '#f1f3f1';
      status.style.color = '#31483d';

      publishButton.hidden = false;
      unpublishButton.hidden = true;
    }
  }

  /* =========================================================
     PUBLISH GUIDE
  ========================================================= */

  async function publishGuide() {
    if (!editorToken || !publicId) {
      setStatus(
          'Editor information is missing.',
          false
      );
      return;
    }

    if (guide?.published === true) {
      setStatus('This guide is already published.');
      return;
    }

    const confirmed = window.confirm(
        'Publish this guide? Guests with the guest link will be able to view it.'
    );

    if (!confirmed) return;

    const publishButton = document.getElementById(
        'publish-guide'
    );

    const unpublishButton = document.getElementById(
        'unpublish-guide'
    );

    if (publishButton) publishButton.disabled = true;
    if (unpublishButton) unpublishButton.disabled = true;

    try {
      setStatus('Saving your changes before publishing...');

      const saved = await saveGuide();

      if (!saved) {
        setStatus(
            'Publishing stopped because your changes could not be saved. Please try again.',
            false
        );
        return;
      }

      setStatus('Publishing your guide...');

      const result = await client.rpc(
          'publish_guide_by_token',
          {
            p_edit_token: editorToken,
            p_published: true
          }
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      const updatedGuide = Array.isArray(result.data)
          ? result.data[0]
          : result.data;

      if (!updatedGuide) {
        throw new Error(
            'The guide could not be published. Please check your editing link.'
        );
      }

      guide = updatedGuide;
      publicId = guide.public_id;

      applyGuide(guide);
      updatePublishControls();

      setStatus(
          'Your guide is now published successfully!'
      );

    } catch (error) {
      setStatus(
          'Could not publish: ' + error.message,
          false
      );

    } finally {
      if (publishButton) publishButton.disabled = false;
      if (unpublishButton) unpublishButton.disabled = false;
    }
  }

  /* =========================================================
     UNPUBLISH GUIDE
  ========================================================= */

  async function unpublishGuide() {
    if (!editorToken || !publicId) {
      setStatus(
          'Editor information is missing.',
          false
      );
      return;
    }

    if (guide?.published !== true) {
      setStatus('This guide is already unpublished.');
      return;
    }

    const confirmed = window.confirm(
        'Unpublish this guide? Guests will no longer be able to view it using the guest link.'
    );

    if (!confirmed) return;

    const publishButton = document.getElementById(
        'publish-guide'
    );

    const unpublishButton = document.getElementById(
        'unpublish-guide'
    );

    if (publishButton) publishButton.disabled = true;
    if (unpublishButton) unpublishButton.disabled = true;

    try {
      setStatus('Unpublishing your guide...');

      const result = await client.rpc(
          'publish_guide_by_token',
          {
            p_edit_token: editorToken,
            p_published: false
          }
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      const updatedGuide = Array.isArray(result.data)
          ? result.data[0]
          : result.data;

      if (!updatedGuide) {
        throw new Error(
            'The guide could not be unpublished. Please check your editing link.'
        );
      }

      guide = updatedGuide;
      publicId = guide.public_id;

      applyGuide(guide);
      updatePublishControls();

      setStatus(
          'Your guide has been unpublished. Guests can no longer view it.'
      );

    } catch (error) {
      setStatus(
          'Could not unpublish: ' + error.message,
          false
      );

    } finally {
      if (publishButton) publishButton.disabled = false;
      if (unpublishButton) unpublishButton.disabled = false;
    }
  }

  /* =========================================================
     RENDER UPLOADED PHOTOS
  ========================================================= */

  function renderEditorPhotos() {
    const container = document.getElementById(
        'editor-photo-list'
    );

    if (!container) return;

    const photos = Array.isArray(guide?.image_urls)
        ? guide.image_urls
        : [];

    container.replaceChildren();

    if (photos.length === 0) {
      container.textContent = 'No photos uploaded yet.';
      return;
    }

    const gallery = document.createElement('div');

    gallery.style.display = 'grid';
    gallery.style.gridTemplateColumns =
        'repeat(2, minmax(0, 1fr))';
    gallery.style.gap = '10px';

    photos.forEach(function (url, index) {
      const image = document.createElement('img');

      image.src = url;
      image.alt = 'Property photo ' + (index + 1);
      image.loading = 'lazy';

      image.style.width = '100%';
      image.style.height = '120px';
      image.style.objectFit = 'cover';
      image.style.borderRadius = '10px';

      gallery.appendChild(image);
    });

    container.appendChild(gallery);
  }

  /* =========================================================
     UPLOAD PROPERTY PHOTOS
  ========================================================= */

  async function uploadGuidePhotos(event) {
    const input = event.target;
    const files = Array.from(input.files || []);

    if (!files.length) return;

    if (!editorToken || !publicId) {
      setStatus(
          'Editor information is missing.',
          false
      );
      input.value = '';
      return;
    }

    const existingPhotos = Array.isArray(guide?.image_urls)
        ? guide.image_urls
        : [];

    const remaining = 20 - existingPhotos.length;

    if (remaining <= 0) {
      setStatus(
          'Maximum of 20 photos reached.',
          false
      );
      input.value = '';
      return;
    }

    if (files.length > remaining) {
      setStatus(
          'You can only upload ' + remaining +
          ' more photo(s). Maximum is 20.',
          false
      );
      input.value = '';
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setStatus(
            'Only JPG, PNG, and WEBP photos are allowed.',
            false
        );
        input.value = '';
        return;
      }

      if (
          file.size > 5 * 1024 * 1024 ||
          file.size === 0
      ) {
        setStatus(
            'Each photo must be between 1 byte and 5 MB.',
            false
        );
        input.value = '';
        return;
      }
    }

    input.disabled = true;

    const baseUrl = window.SUPABASE_URL.replace(/\/+$/, '');

    let uploadedCount = 0;

    try {
      for (const file of files) {
        setStatus(
            'Uploading photo ' +
            (uploadedCount + 1) +
            ' of ' + files.length + '…'
        );

        const formData = new FormData();

        formData.append('edit_token', editorToken);
        formData.append('file', file);

        // Existing behavior defaults to gallery.
        formData.append('upload_type', 'gallery');

        const response = await fetch(
            baseUrl + '/functions/v1/upload-guide-photo',
            {
              method: 'POST',
              headers: {
                apikey: window.SUPABASE_ANON_KEY
              },
              body: formData
            }
        );

        let result;

        try {
          result = await response.json();
        } catch (error) {
          throw new Error(
              'Invalid response from photo upload server.'
          );
        }

        if (!response.ok || !result.success) {
          throw new Error(
              result.error || 'Photo upload failed.'
          );
        }

        if (result.photo_url) {
          if (!Array.isArray(guide.image_urls)) {
            guide.image_urls = [];
          }

          guide.image_urls.push(result.photo_url);

          uploadedCount++;

          renderEditorPhotos();
        }
      }

      setStatus(
          uploadedCount +
          (uploadedCount === 1
              ? ' photo uploaded successfully ✓'
              : ' photos uploaded successfully ✓')
      );

    } catch (error) {
      setStatus(
          'Upload error: ' + error.message,
          false
      );

    } finally {
      input.disabled = false;
      input.value = '';
    }
  }

  /* =========================================================
     STATUS MESSAGE
  ========================================================= */

  function setStatus(message, good = true) {
    const element = document.getElementById(
        'editor-status'
    );

    if (!element) return;

    element.textContent = message;

    element.classList.toggle(
        'error',
        !good
    );
  }

  /* =========================================================
     COLLECT FORM DATA
  ========================================================= */


  function collectChanges() {
    const fields = [
      'property_name',
      'welcome_title',
      'welcome_message',
      'address',
      'google_maps_url',
      'check_in',
      'check_out',
      'wifi_name',
      'wifi_password',
      'host_name',
      'host_phone'
    ];

    const values = {};

    fields.forEach(function (key) {
      const input = document.getElementById('e-' + key);

      // Do not overwrite existing data when a field
      // is not present in the current editor.
      if (!input) return;

      const value = input.value.trim();

      values[key] = value === '' ? null : value;
    });

    // PRESERVE EXISTING GUIDE DATA
    const previousGuideData = guide?.guide_data || {};
    const previousOpening = previousGuideData.opening || {};
    const previousAcknowledgment = previousGuideData.acknowledgment || {};
    const previousDashboard = previousGuideData.dashboard || {};

    // DASHBOARD SETTINGS

    const dashboard = {
      ...previousDashboard,

      eyebrow:
          document.getElementById('e-dashboard-eyebrow')?.value.trim()
          || 'YOUR STAY • YOUR GUIDE',

      heading:
          document.getElementById('e-dashboard-heading')?.value.trim()
          || 'Settle in.',

      highlight:
          document.getElementById('e-dashboard-highlight')?.value.trim()
          || 'Enjoy more.',

      subtitle:
          document.getElementById('e-dashboard-subtitle')?.value.trim()
          || '',

      custom_buttons: getDashboardCustomButtonsFromEditor()
    };

    console.log(
        'CUSTOM BUTTONS BEING SAVED:',
        dashboard.custom_buttons
    );


    // OPENING SETTINGS
    const locationInput = document.getElementById('e-opening_location');
    const buttonInput = document.getElementById('e-opening_button_text');

    values.guide_data = {
      ...previousGuideData,

      dashboard: dashboard,

      opening: {
        ...previousOpening,

        location: locationInput
            ? locationInput.value.trim()
            : previousOpening.location || '',

        button_text: buttonInput
            ? buttonInput.value.trim()
            : previousOpening.button_text || 'Explore Your Stay',

        cover_photo: previousOpening.cover_photo || ''
      },

      acknowledgment: {
        ...previousAcknowledgment,
        ...collectAcknowledgmentSettings()
      }
    };

    return values;
  }


  /* =========================================================
     SAVE GUIDE
     Returns true when successful, false when unsuccessful.
  ========================================================= */

  async function saveGuide() {
    if (!editorToken) {
      setStatus(
          'Editor token is missing.',
          false
      );
      return false;
    }

    const button = document.getElementById(
        'save-guide'
    );

    if (!button) {
      setStatus(
          'Save button could not be found.',
          false
      );
      return false;
    }

    const values = collectChanges();

    button.disabled = true;
    button.textContent = 'Saving…';

    setStatus('Saving changes…');

    try {
      const result = await client.rpc(
          'update_guide_by_token',
          {
            p_edit_token: editorToken,
            p_changes: values
          }
      );

      if (result.error) {
        setStatus(
            'Could not save: ' + result.error.message,
            false
        );
        return false;
      }

      const updatedGuide = Array.isArray(result.data)
          ? result.data[0]
          : result.data;

      if (!updatedGuide) {
        setStatus(
            'The server did not return the updated guide. Please try again.',
            false
        );
        return false;
      }

      guide = updatedGuide;

      applyGuide(guide);
      renderOpeningCoverPreview();
      renderEditorPhotos();
      updatePublishControls();

      setStatus('Saved successfully ✓');

      return true;

    } catch (error) {
      setStatus(
          'Could not save: ' + error.message,
          false
      );

      return false;

    } finally {
      button.disabled = false;
      button.textContent = 'Save Changes';
    }
  }

  /* =========================================================
     COPY GUEST LINK
  ========================================================= */

  async function copyGuestLink() {
    if (!publicId) {
      setStatus(
          'Guest guide ID is missing.',
          false
      );
      return;
    }

    if (guide?.published !== true) {
      setStatus(
          'Publish your guide before sharing the guest link.',
          false
      );
      return;
    }

    const url = new URL(
        '/g/' + encodeURIComponent(publicId),
        location.origin
    ).href;

    try {
      await navigator.clipboard.writeText(url);

      setStatus('Guest link copied ✓');

    } catch (error) {
      try {
        const temporary = document.createElement('input');

        temporary.value = url;

        document.body.appendChild(temporary);

        temporary.select();

        const copied = document.execCommand('copy');

        temporary.remove();

        if (!copied) {
          throw new Error('Copy command failed.');
        }

        setStatus('Guest link copied ✓');

      } catch (fallbackError) {
        setStatus(
            'Could not copy the link. Please copy it manually: ' + url,
            false
        );
      }
    }
  }

  /* =========================================================
     QUICK TOUR LIGHTBOX
  ========================================================= */

  let tourPhotos = [];
  let currentTourPhoto = 0;

  /* OPEN LIGHTBOX */

  function openTourLightbox(index) {
    tourPhotos = Array.from(
        document.querySelectorAll(
            '.tour-masonry .tour-photo img'
        )
    );

    currentTourPhoto = index;

    if (
        currentTourPhoto < 0 ||
        currentTourPhoto >= tourPhotos.length
    ) {
      return;
    }

    const lightbox = document.getElementById(
        'tour-lightbox'
    );

    if (!lightbox) return;

    updateTourLightbox();

    lightbox.classList.add('active');

    lightbox.setAttribute('aria-hidden', 'false');

    document.body.style.overflow = 'hidden';
  }

  /* UPDATE IMAGE */

  function updateTourLightbox() {
    const image = document.getElementById(
        'lightbox-image'
    );

    const current = document.getElementById(
        'lightbox-current'
    );

    const total = document.getElementById(
        'lightbox-total'
    );

    const selectedPhoto = tourPhotos[currentTourPhoto];

    if (!selectedPhoto || !image) return;

    image.src = selectedPhoto.src;
    image.alt = selectedPhoto.alt;

    if (current) {
      current.textContent = currentTourPhoto + 1;
    }

    if (total) {
      total.textContent = tourPhotos.length;
    }
  }

  /* NEXT / PREVIOUS PHOTO */

  function changeTourPhoto(direction) {
    if (tourPhotos.length === 0) {
      return;
    }

    currentTourPhoto += direction;

    if (currentTourPhoto >= tourPhotos.length) {
      currentTourPhoto = 0;
    }

    if (currentTourPhoto < 0) {
      currentTourPhoto = tourPhotos.length - 1;
    }

    updateTourLightbox();
  }

  /* CLOSE LIGHTBOX */

  function closeTourLightbox() {
    const lightbox = document.getElementById(
        'tour-lightbox'
    );

    if (!lightbox) return;

    lightbox.classList.remove('active');

    lightbox.setAttribute('aria-hidden', 'true');

    document.body.style.overflow = '';
  }

  /* CLICK PHOTO TO OPEN */

  document.addEventListener('click', function (event) {
    const clickedImage = event.target.closest(
        '.tour-masonry .tour-photo img'
    );

    if (!clickedImage) {
      return;
    }

    tourPhotos = Array.from(
        document.querySelectorAll(
            '.tour-masonry .tour-photo img'
        )
    );

    const photoIndex = tourPhotos.indexOf(
        clickedImage
    );

    openTourLightbox(photoIndex);
  });

  /* CLICK OUTSIDE IMAGE TO CLOSE */

  const tourLightbox = document.getElementById(
      'tour-lightbox'
  );

  if (tourLightbox) {
    tourLightbox.addEventListener('click', function (event) {
      if (event.target === this) {
        closeTourLightbox();
      }
    });
  }

  /* KEYBOARD CONTROLS */

  document.addEventListener('keydown', function (event) {
    const lightbox = document.getElementById(
        'tour-lightbox'
    );

    if (!lightbox || !lightbox.classList.contains('active')) {
      return;
    }

    if (event.key === 'Escape') {
      closeTourLightbox();
    }

    if (event.key === 'ArrowRight') {
      changeTourPhoto(1);
    }

    if (event.key === 'ArrowLeft') {
      changeTourPhoto(-1);
    }
  });

  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function init() {
    const currentRoute = route();

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== 'function'
    ) {
      showSetupError(
          'Supabase JavaScript library is not loaded. Make sure the Supabase CDN script is included before editor.js.'
      );
      return;
    }

    if (!configReady()) {
      if (currentRoute.mode === 'edit') {
        showSetupError(
            'Open supabase-config.js and add your Supabase Project URL and publishable key.'
        );
      }
      return;
    }

    client = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
    );

    if (currentRoute.mode === 'edit') {
      await loadEditor(currentRoute.value);

    } else if (
        currentRoute.mode === 'guest' &&
        currentRoute.value
    ) {
      await loadGuest(currentRoute.value);
    }
  }

  /* =========================================================
     START
  ========================================================= */

  if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        init
    );
  } else {
    init();
  }

})();
