const adminForms = Array.from(document.querySelectorAll("[data-admin-form]"));
const authForm = document.querySelector("[data-auth-form]");
const seoListBody = document.querySelector("[data-seo-list]");
const seoListStatus = document.querySelector("[data-seo-status]");
const projectsList = document.querySelector("[data-projects-list]");
const projectsStatus = document.querySelector("[data-projects-status]");
const softwareList = document.querySelector("[data-software-list]");
const softwareStatus = document.querySelector("[data-software-status]");
const messagesList = document.querySelector("[data-messages-list]");
const messagesStatus = document.querySelector("[data-messages-status]");
const seoForm = document.querySelector('[data-admin-form][data-resource="seo"]');

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

const sha256 = async (text) => {
  if (!window.crypto || !window.crypto.subtle) {
    return "";
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

const setStatus = (form, message, isError = false) => {
  const status = form.querySelector("[data-status]");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", isError);
};

const setInlineStatus = (node, message, isError = false) => {
  if (!node) {
    return;
  }
  node.textContent = message;
  node.classList.toggle("is-error", isError);
};

const getAuthValues = () => {
  if (!authForm) {
    return null;
  }
  const keyId = authForm.querySelector("input[name=keyId]")?.value.trim() || "";
  const timestamp =
    authForm.querySelector("input[name=timestamp]")?.value.trim() || "";
  const signature =
    authForm.querySelector("input[name=signature]")?.value.trim() || "";
  if (!keyId && !timestamp && !signature) {
    return null;
  }
  return { keyId, timestamp, signature };
};

const applyAuthToForms = (auth) => {
  if (!auth) {
    return;
  }
  adminForms.forEach((form) => {
    const keyIdField = form.querySelector("input[name=keyId]");
    const timestampField = form.querySelector("input[name=timestamp]");
    const signatureField = form.querySelector("input[name=signature]");
    if (keyIdField) {
      keyIdField.value = auth.keyId;
    }
    if (timestampField) {
      timestampField.value = auth.timestamp;
    }
    if (signatureField) {
      signatureField.value = auth.signature;
    }
    updateMessage(form);
  });
};

const parseJson = (value) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const updateMessage = async (form) => {
  const resource = form.dataset.resource;
  const method = (form.dataset.method || "PUT").toUpperCase();
  const payloadField = form.querySelector("textarea[name=payload]");
  const timestampField = form.querySelector("input[name=timestamp]");
  const idField = form.querySelector("input[name=itemId]");
  const messageEl = form.querySelector("[data-message]");
  const hashEl = form.querySelector("[data-hash]");
  if (!resource || !payloadField || !timestampField || !messageEl || !hashEl) {
    return;
  }
  const timestamp = timestampField.value.trim();
  if (!timestamp) {
    hashEl.textContent = "-";
    messageEl.textContent = "Timestamp gerekli.";
    return;
  }
  const itemId = idField ? idField.value.trim() : "";
  if (idField && !itemId) {
    hashEl.textContent = "-";
    messageEl.textContent = "ID gerekli.";
    return;
  }
  let payload = payloadField.value.trim();
  if (method === "DELETE") {
    payload = "";
  }
  const bodyHash = await sha256(payload);
  if (!bodyHash) {
    hashEl.textContent = "-";
    messageEl.textContent = "SHA-256 hesaplanamadi. Sunucuyu localhost uzerinden acin.";
    return;
  }
  hashEl.textContent = bodyHash;
  const path = itemId ? `/api/${resource}/${itemId}` : `/api/${resource}`;
  messageEl.textContent = `${method}\n${path}\n${timestamp}\n${bodyHash}\n`;
};

const loadPayload = async (form) => {
  const resource = form.dataset.resource;
  const payloadField = form.querySelector("textarea[name=payload]");
  if (!payloadField) {
    return;
  }
  setStatus(form, "Yukleniyor...");
  try {
    const response = await fetch(`/api/${resource}`);
    if (!response.ok) {
      throw new Error("Yukleme basarisiz");
    }
    const data = await response.json();
    payloadField.value = JSON.stringify(data, null, 2);
    await updateMessage(form);
    setStatus(form, "Yukleme tamamlandi.");
  } catch (error) {
    setStatus(form, "Yukleme basarisiz.", true);
  }
};

const renderProjectsList = (items) => {
  if (!projectsList) {
    return;
  }
  projectsList.innerHTML = `
    <div class="admin-table-row admin-table-head">
      <span>ID</span>
      <span>Baslik</span>
      <span>Durum</span>
      <span></span>
    </div>
  `;
  (items || []).forEach((item) => {
    if (!item) {
      return;
    }
    const row = document.createElement("div");
    row.className = "admin-table-row";
    const id = document.createElement("span");
    id.textContent = item.id || "-";
    const title = document.createElement("span");
    title.textContent = item.title || "-";
    const status = document.createElement("span");
    status.textContent = item.status || "-";
    const button = document.createElement("button");
    button.className = "btn ghost small";
    button.type = "button";
    button.textContent = "Duzenle";
    row.appendChild(id);
    row.appendChild(title);
    row.appendChild(status);
    row.appendChild(button);
    if (button) {
      button.addEventListener("click", () => {
        const form = document.querySelector(
          '[data-admin-form][data-resource="projects"][data-method="PUT"]'
        );
        if (!form) {
          return;
        }
        const idField = form.querySelector("input[name=itemId]");
        const payloadField = form.querySelector("textarea[name=payload]");
        if (idField) {
          idField.value = item.id || "";
        }
        if (payloadField) {
          const { id, createdAt, updatedAt, ...rest } = item;
          payloadField.value = JSON.stringify(rest, null, 2);
        }
        updateMessage(form);
      });
    }
    projectsList.appendChild(row);
  });
};

const renderSoftwareList = (items) => {
  if (!softwareList) {
    return;
  }
  softwareList.innerHTML = `
    <div class="admin-table-row admin-table-head">
      <span>ID</span>
      <span>Ad</span>
      <span>Durum</span>
      <span></span>
    </div>
  `;
  (items || []).forEach((item) => {
    if (!item) {
      return;
    }
    const row = document.createElement("div");
    row.className = "admin-table-row";
    const id = document.createElement("span");
    id.textContent = item.id || "-";
    const name = document.createElement("span");
    name.textContent = item.name || "-";
    const status = document.createElement("span");
    status.textContent = item.status || "-";
    const button = document.createElement("button");
    button.className = "btn ghost small";
    button.type = "button";
    button.textContent = "Duzenle";
    row.appendChild(id);
    row.appendChild(name);
    row.appendChild(status);
    row.appendChild(button);
    if (button) {
      button.addEventListener("click", () => {
        const form = document.querySelector(
          '[data-admin-form][data-resource="software"][data-method="PUT"]'
        );
        if (!form) {
          return;
        }
        const idField = form.querySelector("input[name=itemId]");
        const payloadField = form.querySelector("textarea[name=payload]");
        if (idField) {
          idField.value = item.id || "";
        }
        if (payloadField) {
          const { id, createdAt, updatedAt, ...rest } = item;
          payloadField.value = JSON.stringify(rest, null, 2);
        }
        updateMessage(form);
      });
    }
    softwareList.appendChild(row);
  });
};

const renderMessagesList = (items) => {
  if (!messagesList) {
    return;
  }
  messagesList.innerHTML = `
    <div class="admin-table-row admin-table-head message">
      <span>Tarih</span>
      <span>Ad</span>
      <span>E-posta</span>
      <span>Mesaj</span>
    </div>
  `;
  (items || []).forEach((item) => {
    if (!item) {
      return;
    }
    const row = document.createElement("div");
    row.className = "admin-table-row message";
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleString("tr-TR")
      : "-";
    const dateSpan = document.createElement("span");
    dateSpan.textContent = date;
    const nameSpan = document.createElement("span");
    nameSpan.textContent = item.name || "-";
    const emailSpan = document.createElement("span");
    emailSpan.textContent = item.email || "-";
    const messageSpan = document.createElement("span");
    messageSpan.textContent = item.message || "-";
    row.appendChild(dateSpan);
    row.appendChild(nameSpan);
    row.appendChild(emailSpan);
    row.appendChild(messageSpan);
    messagesList.appendChild(row);
  });
};

const loadList = async (resource, onSuccess, statusNode) => {
  setInlineStatus(statusNode, "Yukleniyor...");
  try {
    const response = await fetch(`/api/${resource}`);
    if (!response.ok) {
      throw new Error("Yukleme basarisiz");
    }
    const data = await response.json();
    onSuccess(data);
    setInlineStatus(statusNode, "Yukleme tamamlandi.");
  } catch (error) {
    setInlineStatus(statusNode, "Yukleme basarisiz.", true);
  }
};

const buildSeoList = (seoData) => {
  if (!seoListBody) {
    return;
  }
  seoListBody.innerHTML = "";
  const pages = seoData?.pages && typeof seoData.pages === "object" ? seoData.pages : {};
  const entries = Object.entries(pages);
  entries.forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "admin-list-row";
    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.dataset.field = "pageKey";
    keyInput.value = key;
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.dataset.field = "title";
    titleInput.value = value?.title || "";
    const descriptionInput = document.createElement("input");
    descriptionInput.type = "text";
    descriptionInput.dataset.field = "description";
    descriptionInput.value = value?.description || "";
    row.appendChild(keyInput);
    row.appendChild(titleInput);
    row.appendChild(descriptionInput);
    seoListBody.appendChild(row);
  });
  const emptyRow = document.createElement("div");
  emptyRow.className = "admin-list-row";
  const emptyKey = document.createElement("input");
  emptyKey.type = "text";
  emptyKey.dataset.field = "pageKey";
  emptyKey.placeholder = "yeni";
  const emptyTitle = document.createElement("input");
  emptyTitle.type = "text";
  emptyTitle.dataset.field = "title";
  emptyTitle.placeholder = "Baslik";
  const emptyDescription = document.createElement("input");
  emptyDescription.type = "text";
  emptyDescription.dataset.field = "description";
  emptyDescription.placeholder = "Aciklama";
  emptyRow.appendChild(emptyKey);
  emptyRow.appendChild(emptyTitle);
  emptyRow.appendChild(emptyDescription);
  seoListBody.appendChild(emptyRow);
};

const loadSeoList = async () => {
  setInlineStatus(seoListStatus, "Yukleniyor...");
  let seoData = null;
  const payloadField = seoForm?.querySelector("textarea[name=payload]");
  if (payloadField) {
    seoData = parseJson(payloadField.value.trim());
  }
  if (!seoData) {
    try {
      const response = await fetch("/api/seo");
      if (response.ok) {
        seoData = await response.json();
      }
    } catch (error) {
      seoData = null;
    }
  }
  if (!seoData) {
    setInlineStatus(seoListStatus, "SEO verisi bulunamadi.", true);
    return;
  }
  buildSeoList(seoData);
  setInlineStatus(seoListStatus, "Liste hazir.");
};

const applySeoList = () => {
  if (!seoListBody || !seoForm) {
    return;
  }
  const payloadField = seoForm.querySelector("textarea[name=payload]");
  if (!payloadField) {
    return;
  }
  const current = parseJson(payloadField.value.trim()) || {};
  const pages = {};
  const rows = Array.from(seoListBody.querySelectorAll(".admin-list-row"));
  rows.forEach((row) => {
    const key = row.querySelector("[data-field=pageKey]")?.value.trim();
    if (!key) {
      return;
    }
    const title = row.querySelector("[data-field=title]")?.value.trim();
    const description = row.querySelector("[data-field=description]")?.value.trim();
    const entry = {};
    if (title) {
      entry.title = title;
    }
    if (description) {
      entry.description = description;
    }
    if (Object.keys(entry).length > 0) {
      pages[key] = entry;
    }
  });
  current.pages = pages;
  payloadField.value = JSON.stringify(current, null, 2);
  updateMessage(seoForm);
  setInlineStatus(seoListStatus, "SEO JSON guncellendi.");
};

const submitPayload = async (form) => {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const resource = form.dataset.resource;
  const method = (form.dataset.method || "PUT").toUpperCase();
  const payloadField = form.querySelector("textarea[name=payload]");
  const keyIdField = form.querySelector("input[name=keyId]");
  const timestampField = form.querySelector("input[name=timestamp]");
  const signatureField = form.querySelector("input[name=signature]");
  const itemIdField = form.querySelector("input[name=itemId]");
  if (
    !resource ||
    !payloadField ||
    !keyIdField ||
    !timestampField ||
    !signatureField
  ) {
    return;
  }
  const itemId = itemIdField ? itemIdField.value.trim() : "";
  if (itemIdField && !itemId) {
    setStatus(form, "ID gerekli.", true);
    return;
  }

  let payload = "";
  if (method !== "DELETE") {
    payload = payloadField.value.trim();
    try {
      JSON.parse(payload);
    } catch (error) {
      setStatus(form, "JSON gecersiz.", true);
      return;
    }
  }

  setStatus(form, "Gonderiliyor...");
  try {
    const headers = {
      "X-SSH-Key-Id": keyIdField.value.trim(),
      "X-SSH-Timestamp": timestampField.value.trim(),
      "X-SSH-Signature": signatureField.value.trim(),
    };
    if (method !== "DELETE") {
      headers["Content-Type"] = "application/json";
    }
    const path = itemId ? `/api/${resource}/${itemId}` : `/api/${resource}`;
    const response = await fetch(path, {
      method,
      headers,
      body: method === "DELETE" ? undefined : payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      setStatus(form, `Hata: ${errorText}`, true);
      return;
    }

    setStatus(form, "Guncelleme tamamlandi.");
  } catch (error) {
    setStatus(form, "Istek gonderilemedi.", true);
  }
};

adminForms.forEach((form) => {
  const payloadField = form.querySelector("textarea[name=payload]");
  const timestampField = form.querySelector("input[name=timestamp]");
  const idField = form.querySelector("input[name=itemId]");
  const loadButton = form.querySelector("[data-action=load]");
  const timestampButton = form.querySelector("[data-action=timestamp]");

  if (payloadField) {
    payloadField.addEventListener("input", () => updateMessage(form));
  }
  if (timestampField) {
    timestampField.addEventListener("input", () => updateMessage(form));
  }
  if (idField) {
    idField.addEventListener("input", () => updateMessage(form));
  }

  if (loadButton) {
    loadButton.addEventListener("click", () => loadPayload(form));
  }
  if (timestampButton) {
    timestampButton.addEventListener("click", () => {
      if (timestampField) {
        timestampField.value = Math.floor(Date.now() / 1000).toString();
        updateMessage(form);
      }
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitPayload(form);
  });
});

if (authForm) {
  const timestampButton = authForm.querySelector("[data-action=timestamp]");
  const applyButton = authForm.querySelector("[data-action=apply-auth]");
  if (timestampButton) {
    timestampButton.addEventListener("click", () => {
      const timestampField = authForm.querySelector("input[name=timestamp]");
      if (timestampField) {
        timestampField.value = Math.floor(Date.now() / 1000).toString();
      }
    });
  }
  if (applyButton) {
    applyButton.addEventListener("click", () => {
      const auth = getAuthValues();
      if (!auth) {
        return;
      }
      applyAuthToForms(auth);
    });
  }
}

document
  .querySelector("[data-action=seo-list-load]")
  ?.addEventListener("click", () => loadSeoList());
document
  .querySelector("[data-action=seo-list-apply]")
  ?.addEventListener("click", () => applySeoList());

document
  .querySelector("[data-action=projects-load]")
  ?.addEventListener("click", () =>
    loadList("projects", renderProjectsList, projectsStatus)
  );
document
  .querySelector("[data-action=software-load]")
  ?.addEventListener("click", () =>
    loadList("software", renderSoftwareList, softwareStatus)
  );
document
  .querySelector("[data-action=messages-load]")
  ?.addEventListener("click", () =>
    loadList("messages", renderMessagesList, messagesStatus)
  );
