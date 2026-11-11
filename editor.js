
(function () {
  'use strict';

  /* =========================================================
     ANGELICA AQUA VISTA — CLIENT EDITOR
     Routes:
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

  /* =========================================================
     APPLY GUIDE DATA TO WEBSITE
  ========================================================= */

  function applyGuide(g) {
    if (!g) return;

    setText(
        'property-name',
        g.property_name || 'Welcome Home'
    );

    applyOpeningSettings(g);

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

    setText(
        'dashboard-description',
        g.welcome_message ||
        'Everything you need for a comfortable stay.'
    );

    setText('wifi-name', g.wifi_name || '');
    setText('wifi-pass', g.wifi_password || '');
    setText('host-name', g.host_name || '');
    setText('host-phone', g.host_phone || '');
    setText('check-in-time', g.check_in || '');
    setText('check-out-time', g.check_out || '');

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

    const opening = getOpeningSettings(g);

    setValue('e-opening_location', opening.location);
    setValue('e-opening_button_text', opening.button_text);

    renderOpeningCoverPreview();
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

        <!-- WELCOME -->

        <section
          class="editor-section"
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

    updateEditorFields(guide);
    renderOpeningCoverPreview();
    renderEditorPhotos();
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
      const input = document.getElementById(
          'e-' + key
      );

      if (!input) {
        values[key] = null;
        return;
      }

      const value = input.value.trim();

      values[key] = value === ''
          ? null
          : value;
    });

    const locationInput = document.getElementById(
        'e-opening_location'
    );

    const buttonInput = document.getElementById(
        'e-opening_button_text'
    );

    const previousOpening = guide?.guide_data?.opening || {};

    values.guide_data = {
      opening: {
        ...previousOpening,

        location: locationInput
            ? locationInput.value.trim()
            : previousOpening.location || '',

        button_text: buttonInput
            ? buttonInput.value.trim()
            : previousOpening.button_text || 'Explore Your Stay',

        cover_photo: previousOpening.cover_photo || ''
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
