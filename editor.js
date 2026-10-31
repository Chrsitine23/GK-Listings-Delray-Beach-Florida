(function () {
  'use strict';

  /* =========================================================
     ANGELICA AQUA VISTA — CLIENT EDITOR
     Works with:
       /edit/YOUR_EDIT_TOKEN
       /g/YOUR_PUBLIC_ID
       ?edit=YOUR_EDIT_TOKEN
       ?guide=YOUR_PUBLIC_ID
     ========================================================= */

  let client = null;
  let guide = null;
  let editorToken = null;
  let publicId = null;

  /* =========================================================
     SUPABASE CONFIG
  ========================================================= */

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

    // /edit/xxxxx
    if (path[0] === 'edit' && path[1]) {
      return {
        mode: 'edit',
        value: decodeURIComponent(path[1])
      };
    }

    // /g/xxxxx
    if (path[0] === 'g' && path[1]) {
      return {
        mode: 'guest',
        value: decodeURIComponent(path[1])
      };
    }

    // ?edit=xxxxx
    // ?guide=xxxxx
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
     APPLY GUIDE DATA TO WEBSITE
  ========================================================= */

  function applyGuide(g) {
    if (!g) return;

    // Property
    setText(
        'property-name',
        g.property_name || 'Welcome Home'
    );

    // Cover
    setText(
        'cover-location-text',
        g.address || 'Your destination'
    );

    // Welcome
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

    // Dashboard
    setText(
        'dashboard-description',
        g.welcome_message ||
        'Everything you need for a comfortable stay.'
    );

    // Wi-Fi
    setText(
        'wifi-name',
        g.wifi_name || ''
    );

    setText(
        'wifi-pass',
        g.wifi_password || ''
    );

    // Host
    setText(
        'host-name',
        g.host_name || ''
    );

    setText(
        'host-phone',
        g.host_phone || ''
    );

    // Check-in
    setText(
        'check-in-time',
        g.check_in || ''
    );

    setText(
        'check-out-time',
        g.check_out || ''
    );

    // Google Maps
    if (g.google_maps_url) {
      document
          .querySelectorAll(
              'a[href*="google.com/maps"], a[data-map-link]'
          )
          .forEach(function (link) {
            link.href = g.google_maps_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          });
    }

    // Update editor fields if editor exists
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
  }

  /* =========================================================
     ERROR MESSAGE
  ========================================================= */

  function showSetupError(message) {
    const existing =
        document.querySelector('.app-setup-error');

    if (existing) {
      existing.remove();
    }

    const box = document.createElement('div');

    box.className = 'app-setup-error';

    box.innerHTML =
        '<strong>Welcome Guide</strong>' +
        '<p>' +
        escapeHtml(message) +
        '</p>' +
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

      const data = result.data;
      const error = result.error;

      if (error) {
        showSetupError(
            'Could not load the guest guide: ' +
            error.message
        );
        return;
      }

      if (!data) {
        showSetupError(
            'This guest guide does not exist or has not been published yet.'
        );
        return;
      }

      guide = data;
      publicId = id;

      applyGuide(data);

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

      const data = result.data;
      const error = result.error;

      if (error) {
        showSetupError(
            'Editor could not be opened: ' +
            error.message
        );
        return;
      }

      guide = Array.isArray(data)
          ? data[0]
          : data;

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

          <h2>
            Welcome Guide
          </h2>
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


      <div class="editor-tabs">

        <button
          class="editor-tab active"
          type="button"
          data-tab="welcome"
        >
          Welcome
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

      </div>


      <div class="editor-body">

        <!-- WELCOME -->

        <section
          class="editor-section active"
          data-section="welcome"
        >

          <label>
            Property name

            <input
              id="e-property_name"
              type="text"
              placeholder="Angelica Aqua Vista"
            >
          </label>


          <label>
            Welcome title

            <input
              id="e-welcome_title"
              type="text"
              placeholder="Welcome!"
            >
          </label>


          <label>
            Welcome message

            <textarea
              id="e-welcome_message"
              rows="5"
              placeholder="Welcome to your stay..."
            ></textarea>
          </label>


          <label>
            Address

            <textarea
              id="e-address"
              rows="3"
              placeholder="Your complete property address"
            ></textarea>
          </label>


          <label>
            Google Maps link

            <input
              id="e-google_maps_url"
              type="url"
              placeholder="https://maps.google.com/..."
            >
          </label>

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

    /* -----------------------------------------
       Fill fields
    ----------------------------------------- */

    updateEditorFields(guide);

    /* -----------------------------------------
       Tabs
    ----------------------------------------- */

    panel
        .querySelectorAll('.editor-tab')
        .forEach(function (button) {

          button.addEventListener(
              'click',
              function () {

                const tab =
                    button.dataset.tab;

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

                const section =
                    panel.querySelector(
                        '[data-section="' +
                        tab +
                        '"]'
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
        .addEventListener(
            'click',
            function () {

              panel.remove();

              document.body.classList.remove(
                  'editor-mode'
              );

            }
        );

    /* -----------------------------------------
       Save
    ----------------------------------------- */

    document
        .getElementById('save-guide')
        .addEventListener(
            'click',
            saveGuide
        );

    /* -----------------------------------------
       Preview
    ----------------------------------------- */

    document
        .getElementById('guest-preview')
        .addEventListener(
            'click',
            function () {

              if (!publicId) {
                setStatus(
                    'Guest guide ID is missing.',
                    false
                );
                return;
              }

              const url =
                  '/g/' +
                  encodeURIComponent(publicId);

              window.open(
                  url,
                  '_blank',
                  'noopener'
              );

            }
        );

    /* -----------------------------------------
       Copy guest link
    ----------------------------------------- */

    document
        .getElementById('copy-link')
        .addEventListener(
            'click',
            copyGuestLink
        );

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
              document.getElementById(
                  'editor-panel'
              )
          ) {

            event.preventDefault();

            saveGuide();
          }

        }
    );
  }

  /* =========================================================
     STATUS MESSAGE
  ========================================================= */

  function setStatus(message, good = true) {

    const element =
        document.getElementById(
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

      const input =
          document.getElementById(
              'e-' + key
          );

      if (!input) {
        values[key] = null;
        return;
      }

      const value =
          input.value.trim();

      values[key] =
          value === ''
              ? null
              : value;

    });

    return values;
  }

  /* =========================================================
     SAVE GUIDE
  ========================================================= */

  async function saveGuide() {

    if (!editorToken) {
      setStatus(
          'Editor token is missing.',
          false
      );
      return;
    }

    const button =
        document.getElementById(
            'save-guide'
        );

    if (!button) return;

    const values =
        collectChanges();

    button.disabled = true;
    button.textContent = 'Saving…';

    setStatus(
        'Saving changes…'
    );

    try {

      const result =
          await client.rpc(
              'update_guide_by_token',
              {
                p_edit_token: editorToken,
                p_changes: values
              }
          );

      const data = result.data;
      const error = result.error;

      if (error) {

        setStatus(
            'Could not save: ' +
            error.message,
            false
        );

        return;
      }

      guide =
          Array.isArray(data)
              ? data[0]
              : data;

      if (guide) {
        applyGuide(guide);
      } else {
        applyGuide(values);
      }

      setStatus(
          'Saved successfully ✓'
      );

    } catch (error) {

      setStatus(
          'Could not save: ' +
          error.message,
          false
      );

    } finally {

      button.disabled = false;
      button.textContent =
          'Save Changes';

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

    const url =
        new URL(
            '/g/' +
            encodeURIComponent(publicId),
            location.origin
        ).href;

    try {

      await navigator.clipboard.writeText(
          url
      );

      setStatus(
          'Guest link copied ✓'
      );

    } catch (error) {

      // Fallback for browsers that block clipboard
      try {

        const temporary =
            document.createElement('input');

        temporary.value = url;

        document.body.appendChild(
            temporary
        );

        temporary.select();

        document.execCommand(
            'copy'
        );

        temporary.remove();

        setStatus(
            'Guest link copied ✓'
        );

      } catch (fallbackError) {

        setStatus(
            'Could not copy the link. Please copy it manually.',
            false
        );

      }

    }
  }

  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function init() {

    const currentRoute =
        route();

    /* -----------------------------------------
       Check Supabase library
    ----------------------------------------- */

    if (
        !window.supabase ||
        typeof window.supabase.createClient !==
        'function'
    ) {

      showSetupError(
          'Supabase JavaScript library is not loaded. Make sure the Supabase CDN script is included before editor.js.'
      );

      return;
    }

    /* -----------------------------------------
       Check configuration
    ----------------------------------------- */

    if (!configReady()) {

      if (
          currentRoute.mode ===
          'edit'
      ) {

        showSetupError(
            'Open supabase-config.js and add your Supabase Project URL and anon key.'
        );

      }

      return;
    }

    /* -----------------------------------------
       Create Supabase client
    ----------------------------------------- */

    client =
        window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );

    /* -----------------------------------------
       Load appropriate page
    ----------------------------------------- */

    if (
        currentRoute.mode ===
        'edit'
    ) {

      await loadEditor(
          currentRoute.value
      );

    } else if (
        currentRoute.mode ===
        'guest' &&
        currentRoute.value
    ) {

      await loadGuest(
          currentRoute.value
      );

    }

  }

  /* =========================================================
     START
  ========================================================= */

  if (
      document.readyState ===
      'loading'
  ) {

    document.addEventListener(
        'DOMContentLoaded',
        init
    );

  } else {

    init();

  }

})();