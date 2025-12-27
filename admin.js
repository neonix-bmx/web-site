const adminForms = Array.from(document.querySelectorAll("[data-admin-form]"));

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
