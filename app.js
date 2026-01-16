const root = document.documentElement;
if (root) {
  root.classList.add("js");
}

const navLinks = Array.from(document.querySelectorAll(".nav-tile"));
const sections = Array.from(
  document.querySelectorAll("section[id], article[id]")
);
const contactForm = document.querySelector(".contact-form");
const projectList = document.querySelector("#projectList");
const softwareList = document.querySelector("#softwareList");
const newsList = document.querySelector("#newsList");
const aboutTitle = document.querySelector("#aboutTitle");
const aboutSummary = document.querySelector("#aboutSummary");
const aboutHighlights = document.querySelector("#aboutHighlights");
const aboutStats = document.querySelector("#aboutStats");
const projectModal = document.querySelector("#projectModal");
const projectModalTitle = document.querySelector("#projectModalTitle");
const projectModalSummary = document.querySelector("#projectModalSummary");
const projectModalMeta = document.querySelector("#projectModalMeta");
const projectModalStack = document.querySelector("#projectModalStack");
const newsModal = document.querySelector("#newsModal");
const newsModalTitle = document.querySelector("#newsModalTitle");
const newsModalMeta = document.querySelector("#newsModalMeta");
const newsModalSummary = document.querySelector("#newsModalSummary");
const newsModalBody = document.querySelector("#newsModalBody");
const contentTargets = Array.from(document.querySelectorAll("[data-content]"));
const hrefTargets = Array.from(document.querySelectorAll("[data-href]"));
const placeholderTargets = Array.from(
  document.querySelectorAll("[data-placeholder]")
);
const languageButtons = Array.from(
  document.querySelectorAll("[data-lang-toggle]")
);
const isStaticPageContent = document.body?.dataset.pages === "static";

const supportedLanguages = ["tr", "en"];
const defaultLanguage = "tr";
const languageStorageKey = "berrymx-language";
const state = {
  projects: [],
  software: [],
  news: [],
  about: null,
  pages: null,
  seo: null,
};
let currentLanguage = "tr";

const uiMessages = {
  tr: {
    sent: "Gönderildi",
    retry: "Tekrar Dene",
    emptyProjects: "Henüz proje yok.",
    emptySoftware: "Henüz yazılım yok.",
    emptyNews: "Henüz haber yok.",
    download: "İndir",
    projectFallback: "Proje",
    softwareFallback: "Yazılım",
    newsFallback: "Haber",
  },
  en: {
    sent: "Sent",
    retry: "Try Again",
    emptyProjects: "No projects yet.",
    emptySoftware: "No software yet.",
    emptyNews: "No news yet.",
    download: "Download",
    projectFallback: "Project",
    softwareFallback: "Software",
    newsFallback: "News",
  },
};

const normalizeLanguage = (value) => {
  if (!value) {
    return defaultLanguage;
  }
  const lang = String(value).toLowerCase().split("-")[0];
  return supportedLanguages.includes(lang) ? lang : defaultLanguage;
};

const getStoredLanguage = () => {
  try {
    return localStorage.getItem(languageStorageKey);
  } catch (error) {
    return null;
  }
};

const setStoredLanguage = (lang) => {
  try {
    localStorage.setItem(languageStorageKey, lang);
  } catch (error) {
    return;
  }
};

const getInitialLanguage = () => {
  const stored = getStoredLanguage();
  if (stored) {
    return normalizeLanguage(stored);
  }
  const docLang = document.documentElement?.lang;
  if (docLang) {
    return normalizeLanguage(docLang);
  }
  const browserLang = navigator?.language || "";
  return normalizeLanguage(browserLang);
};

currentLanguage = getInitialLanguage();

const getLocalizedValue = (value, lang = currentLanguage) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "object") {
    const candidate = value[lang];
    if (typeof candidate === "string" || typeof candidate === "number") {
      return String(candidate);
    }
    const fallback =
      value[defaultLanguage] ??
      value.tr ??
      value.en;
    if (typeof fallback === "string" || typeof fallback === "number") {
      return String(fallback);
    }
  }
  return "";
};

const getLocalizedArray = (value, lang = currentLanguage) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    const candidate = value[lang] ?? value[defaultLanguage] ?? value.tr ?? value.en;
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
};

const getUiMessage = (key) => {
  const messages = uiMessages[currentLanguage] || uiMessages[defaultLanguage];
  return messages[key] || uiMessages[defaultLanguage][key] || "";
};

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

const activePage = document.body.dataset.page;
if (activePage && navLinks.length) {
  navLinks.forEach((link) => {
    const isMatch = link.dataset.page === activePage;
    link.classList.toggle("is-active", isMatch);
    if (isMatch) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

if (navLinks.length && sections.length) {
  const linkMap = new Map(
    navLinks
      .map((link) => {
        const target = link.getAttribute("href");
        if (!target || !target.startsWith("#")) {
          return null;
        }
        return [target.replace("#", ""), link];
      })
      .filter(Boolean)
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        const link = linkMap.get(entry.target.id);
        if (!link) {
          return;
        }
        navLinks.forEach((item) => item.classList.remove("is-active"));
        link.classList.add("is-active");
      });
    },
    {
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0.2,
    }
  );

  sections.forEach((section) => observer.observe(section));
}

const updateLanguageButtons = () => {
  if (!languageButtons.length) {
    return;
  }
  languageButtons.forEach((button) => {
    const lang = normalizeLanguage(button.dataset.langToggle);
    const isActive = lang === currentLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
};

const applyLanguage = (lang) => {
  currentLanguage = normalizeLanguage(lang);
  document.documentElement.lang = currentLanguage;
  setStoredLanguage(currentLanguage);
  updateLanguageButtons();
  applyPageContent(state.pages);
  renderProjects(projectList, state.projects);
  renderSoftware(softwareList, state.software);
  renderNews(newsList, state.news);
  applyAboutContent(state.about);
  const resolvedSeo = resolveSeoForPage(state.seo);
  if (resolvedSeo) {
    applySeo(resolvedSeo);
  }
  const newsSeo = getNewsSeoOverride(state.news);
  if (newsSeo) {
    applySeo({ ...(resolvedSeo || {}), ...newsSeo });
  }
};

if (languageButtons.length) {
  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.langToggle;
      if (!lang) {
        return;
      }
      applyLanguage(lang);
    });
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }
    const button = contactForm.querySelector("button[type=\"submit\"]");
    const payload = {
      name: contactForm.querySelector("input[name=\"name\"]")?.value.trim(),
      email: contactForm.querySelector("input[name=\"email\"]")?.value.trim(),
      message: contactForm.querySelector("textarea[name=\"message\"]")?.value.trim(),
    };
    const sendMessage = async () => {
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Request failed");
        }
        contactForm.classList.add("sent");
        if (button) {
          button.textContent = getUiMessage("sent");
        }
        contactForm.reset();
      } catch (error) {
        if (button) {
          button.textContent = getUiMessage("retry");
        }
      }
    };
    sendMessage();
  });
}

if (projectModal) {
  projectModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) {
      return;
    }
    if (
      target.matches("[data-modal-close]") ||
      target.classList.contains("modal-overlay")
    ) {
      closeProjectModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && projectModal.classList.contains("is-open")) {
      closeProjectModal();
    }
  });
}

if (newsModal) {
  newsModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) {
      return;
    }
    if (
      target.matches("[data-modal-close]") ||
      target.classList.contains("modal-overlay")
    ) {
      closeNewsModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && newsModal.classList.contains("is-open")) {
      closeNewsModal();
    }
  });
}

const dataSources = [
  { base: "/api", suffix: "" },
  { base: "/data", suffix: ".json" },
];

const fetchJsonWithFallback = async (resource) => {
  for (const source of dataSources) {
    try {
      const response = await fetch(
        `${source.base}/${resource}${source.suffix}`
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      continue;
    }
  }
  return null;
};

const replaceList = (list, items, formatter) => {
  if (!list || !Array.isArray(items) || items.length === 0) {
    return;
  }
  list.innerHTML = "";
  items.forEach((item) => {
    const entry = formatter(item);
    if (!entry) {
      return;
    }
    const li = document.createElement("li");
    li.textContent = entry;
    list.appendChild(li);
  });
};

const replaceLines = (container, items, formatter) => {
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }
  container.innerHTML = "";
  items.forEach((item) => {
    const entry = formatter(item);
    if (!entry) {
      return;
    }
    const span = document.createElement("span");
    span.textContent = entry;
    container.appendChild(span);
  });
};

const getLimit = (element) => {
  if (!element || !element.dataset.limit) {
    return null;
  }
  const limit = Number(element.dataset.limit);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
};

const limitItems = (items, limit) => {
  if (!Array.isArray(items) || !limit) {
    return items;
  }
  return items.slice(0, limit);
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeUrl = (url) => {
  if (!url) {
    return "";
  }
  const trimmed = String(url).trim();
  if (!trimmed) {
    return "";
  }
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }
  return "";
};

const formatInlineMarkdown = (text) => {
  const escaped = escapeHtml(text);
  const withCode = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  const withStrong = withCode.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const withEm = withStrong.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const withLinks = withEm.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, label, url) => {
      const safeUrl = sanitizeUrl(url);
      if (!safeUrl) {
        return label;
      }
      return `<a href="${safeUrl}" rel="noopener noreferrer">${label}</a>`;
    }
  );
  return withLinks;
};

const renderMarkdown = (text) => {
  if (!text) {
    return "";
  }
  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  let listBuffer = [];
  let paragraphBuffer = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push(`<p>${formatInlineMarkdown(paragraphBuffer.join(" "))}</p>`);
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length) {
      const items = listBuffer
        .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
        .join("");
      blocks.push(`<ul>${items}</ul>`);
      listBuffer = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    if (/^#{1,3}\s/.test(trimmed)) {
      flushParagraph();
      flushList();
      const level = trimmed.match(/^#{1,3}/)[0].length;
      const content = trimmed.replace(/^#{1,3}\s*/, "");
      blocks.push(`<h${level}>${formatInlineMarkdown(content)}</h${level}>`);
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }
    paragraphBuffer.push(trimmed);
  });

  flushParagraph();
  flushList();
  return blocks.join("");
};

const formatProject = (project) => {
  if (!project) {
    return "";
  }
  const parts = [
    getLocalizedValue(project.title),
    project.year,
    getLocalizedValue(project.status),
    getLocalizedArray(project.stack).join(" / "),
  ].filter(Boolean);
  return parts.join(" - ");
};

const formatProjectMeta = (project) => {
  if (!project) {
    return "";
  }
  const parts = [project.year, getLocalizedValue(project.status)].filter(Boolean);
  return parts.join(" • ");
};

const formatSoftware = (software) => {
  if (!software) {
    return "";
  }
  const parts = [
    getLocalizedValue(software.name),
    getLocalizedValue(software.type),
    getLocalizedValue(software.status),
  ].filter(Boolean);
  return parts.join(" - ");
};

const formatNews = (newsItem) => {
  if (!newsItem) {
    return "";
  }
  const parts = [getLocalizedValue(newsItem.title), newsItem.date].filter(Boolean);
  return parts.join(" - ");
};

const formatHighlight = (highlight) => {
  if (!highlight) {
    return "";
  }
  return getLocalizedValue(highlight).trim();
};

const openProjectModal = (project) => {
  if (!projectModal || !project) {
    return;
  }
  if (projectModalTitle) {
    const title = getLocalizedValue(project.title).trim();
    projectModalTitle.textContent = title || getUiMessage("projectFallback");
  }
  if (projectModalSummary) {
    const summary = getLocalizedValue(project.summary).trim();
    projectModalSummary.innerHTML = summary ? renderMarkdown(summary) : "";
    projectModalSummary.style.display = summary ? "block" : "none";
  }
  if (projectModalMeta) {
    const meta = formatProjectMeta(project);
    projectModalMeta.textContent = meta;
    projectModalMeta.style.display = meta ? "block" : "none";
  }
  if (projectModalStack) {
    projectModalStack.innerHTML = "";
    const stackItems = getLocalizedArray(project.stack);
    stackItems
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = item;
        projectModalStack.appendChild(chip);
      });
  }
  projectModal.classList.add("is-open");
  projectModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const closeProjectModal = () => {
  if (!projectModal) {
    return;
  }
  projectModal.classList.remove("is-open");
  projectModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const openNewsModal = (newsItem) => {
  if (!newsModal || !newsItem) {
    return;
  }
  if (newsModalTitle) {
    const title = getLocalizedValue(newsItem.title).trim();
    newsModalTitle.textContent = title || getUiMessage("newsFallback");
  }
  if (newsModalMeta) {
    newsModalMeta.textContent = newsItem.date ? String(newsItem.date).trim() : "";
    newsModalMeta.style.display = newsModalMeta.textContent ? "block" : "none";
  }
  if (newsModalSummary) {
    const summary = getLocalizedValue(newsItem.summary).trim();
    newsModalSummary.innerHTML = summary ? renderMarkdown(summary) : "";
    newsModalSummary.style.display = summary ? "block" : "none";
  }
  if (newsModalBody) {
    const body = getLocalizedValue(newsItem.content).trim();
    newsModalBody.innerHTML = body ? renderMarkdown(body) : "";
    newsModalBody.style.display = body ? "block" : "none";
  }
  newsModal.classList.add("is-open");
  newsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const closeNewsModal = () => {
  if (!newsModal) {
    return;
  }
  newsModal.classList.remove("is-open");
  newsModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const replaceStats = (container, items) => {
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }
  container.innerHTML = "";
  items.forEach((item) => {
    if (!item) {
      return;
    }
    const value = getLocalizedValue(item.value).trim();
    const label = getLocalizedValue(item.label).trim();
    if (!value && !label) {
      return;
    }
    const wrapper = document.createElement("div");
    if (value) {
      const valueSpan = document.createElement("span");
      valueSpan.className = "stat-num";
      valueSpan.textContent = value;
      wrapper.appendChild(valueSpan);
    }
    if (label) {
      const labelSpan = document.createElement("span");
      labelSpan.className = "stat-label";
      labelSpan.textContent = label;
      wrapper.appendChild(labelSpan);
    }
    container.appendChild(wrapper);
  });
};

const applyAboutContent = (about) => {
  if (!about || isStaticPageContent) {
    return;
  }
  if (aboutTitle) {
    const title = getLocalizedValue(about.title).trim();
    if (title) {
      aboutTitle.textContent = title;
    }
  }
  if (aboutSummary) {
    const summary = getLocalizedValue(about.summary).trim();
    if (summary) {
      aboutSummary.textContent = summary;
    }
  }
  if (aboutHighlights) {
    const highlights = getLocalizedArray(about.highlights);
    replaceList(aboutHighlights, highlights, formatHighlight);
  }
  if (aboutStats) {
    const stats = getLocalizedArray(about.stats);
    replaceStats(aboutStats, stats);
  }
};

const renderProjects = (container, items) => {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = getUiMessage("emptyProjects");
    container.appendChild(empty);
    return;
  }
  const limited = limitItems(items, getLimit(container)) || [];
  limited.forEach((project) => {
    if (!project) {
      return;
    }
    const card = document.createElement("button");
    card.type = "button";
    card.className = "project-card";
    const title = document.createElement("span");
    title.className = "project-title";
    const projectTitle = getLocalizedValue(project.title).trim();
    title.textContent = projectTitle || getUiMessage("projectFallback");
    const meta = document.createElement("span");
    meta.className = "project-meta";
    meta.textContent = formatProjectMeta(project);
    const stack = document.createElement("span");
    stack.className = "project-stack";
    const stackItems = getLocalizedArray(project.stack);
    stack.textContent = stackItems
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(" / ");
    card.appendChild(title);
    if (meta.textContent) {
      card.appendChild(meta);
    }
    if (stack.textContent) {
      card.appendChild(stack);
    }
    card.addEventListener("click", () => openProjectModal(project));
    container.appendChild(card);
  });
};

const renderSoftware = (container, items) => {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = getUiMessage("emptySoftware");
    container.appendChild(empty);
    return;
  }
  const limited = limitItems(items, getLimit(container)) || [];
  limited.forEach((software) => {
    if (!software) {
      return;
    }
    const row = document.createElement("div");
    row.className = "software-item";

    const info = document.createElement("div");
    info.className = "software-info";

    const name = document.createElement("span");
    name.className = "software-name";
    const softwareName = getLocalizedValue(software.name).trim();
    name.textContent = softwareName || getUiMessage("softwareFallback");

    const meta = document.createElement("span");
    meta.className = "software-meta";
    meta.textContent = [getLocalizedValue(software.type), getLocalizedValue(software.status)]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .join(" • ");

    info.appendChild(name);
    if (meta.textContent) {
      info.appendChild(meta);
    }
    const descriptionText = getLocalizedValue(
      software.description || software.summary
    ).trim();
    if (descriptionText) {
      const description = document.createElement("div");
      description.className = "software-desc markdown";
      description.innerHTML = renderMarkdown(descriptionText);
      info.appendChild(description);
    }

    const actions = document.createElement("div");
    actions.className = "software-actions";
    const downloadUrl = software.downloadUrl
      ? String(software.downloadUrl).trim()
      : "";
    if (downloadUrl) {
      const download = document.createElement("a");
      download.className = "btn small";
      download.href = downloadUrl;
      download.textContent = getUiMessage("download");
      download.setAttribute("download", "");
      actions.appendChild(download);
    }

    row.appendChild(info);
    row.appendChild(actions);
    container.appendChild(row);
  });
};

const renderNews = (container, items) => {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = getUiMessage("emptyNews");
    container.appendChild(empty);
    return;
  }
  const limited = limitItems(items, getLimit(container)) || [];
  limited.forEach((newsItem) => {
    if (!newsItem) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "news-item";
    const title = document.createElement("span");
    title.className = "news-title";
    const titleText = getLocalizedValue(newsItem.title).trim();
    title.textContent = titleText || getUiMessage("newsFallback");
    const meta = document.createElement("span");
    meta.className = "news-meta";
    meta.textContent = newsItem.date ? String(newsItem.date).trim() : "";
    button.appendChild(title);
    if (meta.textContent) {
      button.appendChild(meta);
    }
    button.addEventListener("click", () => openNewsModal(newsItem));
    container.appendChild(button);
  });
};

const getValueByPath = (source, path) => {
  if (!source || !path) {
    return undefined;
  }
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return acc[key];
    }
    return undefined;
  }, source);
};

const getPagesRoot = (pages) => {
  if (!pages || typeof pages !== "object") {
    return pages;
  }
  const candidate = pages[currentLanguage];
  if (candidate && typeof candidate === "object") {
    return candidate;
  }
  const fallback = pages[defaultLanguage];
  if (fallback && typeof fallback === "object") {
    return fallback;
  }
  return pages;
};

const applyPageContent = (pages) => {
  if (
    isStaticPageContent ||
    !pages ||
    typeof pages !== "object" ||
    contentTargets.length === 0
  ) {
    return;
  }
  const pagesRoot = getPagesRoot(pages);
  contentTargets.forEach((node) => {
    const path = node.dataset.content;
    if (!path) {
      return;
    }
    const value =
      getValueByPath(pagesRoot, path) ?? getValueByPath(pages, path);
    if (value === undefined || value === null) {
      return;
    }
    const localized = getLocalizedValue(value);
    if (!localized || Array.isArray(localized)) {
      return;
    }
    node.textContent = localized;
  });
  hrefTargets.forEach((node) => {
    const path = node.dataset.href;
    if (!path) {
      return;
    }
    const value =
      getValueByPath(pagesRoot, path) ?? getValueByPath(pages, path);
    const href = getLocalizedValue(value);
    if (!href || Array.isArray(href)) {
      return;
    }
    node.setAttribute("href", href);
  });
  placeholderTargets.forEach((node) => {
    const path = node.dataset.placeholder;
    if (!path) {
      return;
    }
    const value =
      getValueByPath(pagesRoot, path) ?? getValueByPath(pages, path);
    const placeholder = getLocalizedValue(value);
    if (!placeholder || Array.isArray(placeholder)) {
      return;
    }
    node.setAttribute("placeholder", placeholder);
  });
};

const setMetaTag = (attribute, key, content) => {
  if (!content) {
    return;
  }
  const selector = `meta[${attribute}="${key}"]`;
  let meta = document.querySelector(selector);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
};

const setLinkTag = (rel, href) => {
  if (!href) {
    return "";
  }
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
  return href;
};

const resolveSeoForPage = (seo) => {
  if (!seo || typeof seo !== "object") {
    return seo;
  }
  const pageKey = document.body ? document.body.dataset.page : "";
  if (!pageKey || !seo.pages || typeof seo.pages !== "object") {
    return seo;
  }
  const pageSeo = seo.pages[pageKey];
  if (!pageSeo || typeof pageSeo !== "object") {
    return seo;
  }
  const { pages, ...baseSeo } = seo;
  return { ...baseSeo, ...pageSeo };
};

const getNewsSeoOverride = (newsItems) => {
  if (!Array.isArray(newsItems)) {
    return null;
  }
  const pageKey = document.body ? document.body.dataset.page : "";
  if (pageKey !== "news" || typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) {
    return null;
  }
  const match = newsItems.find((item) => item && item.slug === slug);
  if (!match) {
    return null;
  }
  const title =
    getLocalizedValue(match.metaTitle).trim() ||
    getLocalizedValue(match.title).trim();
  const description =
    getLocalizedValue(match.metaDescription).trim() ||
    getLocalizedValue(match.summary).trim();
  return {
    title: title ? String(title).trim() : "",
    description: description ? String(description).trim() : "",
    ogImage: match.ogImage ? String(match.ogImage).trim() : "",
    ogVideo: match.ogVideo ? String(match.ogVideo).trim() : "",
    ogVideoType: match.ogVideoType ? String(match.ogVideoType).trim() : "",
    canonical: match.canonical ? String(match.canonical).trim() : "",
    ogType: "article",
  };
};

const applySeo = (seo) => {
  if (!seo || typeof seo !== "object") {
    return;
  }

  const title = getLocalizedValue(seo.title).trim();
  if (title) {
    document.title = title;
  }

  const description = getLocalizedValue(seo.description).trim();
  if (description) {
    setMetaTag("name", "description", description);
    setMetaTag("property", "og:description", description);
    setMetaTag("name", "twitter:description", description);
  }

  let keywords = "";
  if (Array.isArray(seo.keywords)) {
    keywords = seo.keywords
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join(", ");
  } else {
    keywords = getLocalizedValue(seo.keywords).trim();
  }
  if (keywords) {
    setMetaTag("name", "keywords", keywords);
  }

  const robots = getLocalizedValue(seo.robots).trim();
  if (robots) {
    setMetaTag("name", "robots", robots);
  }

  const themeColor = getLocalizedValue(seo.themeColor).trim();
  if (themeColor) {
    setMetaTag("name", "theme-color", themeColor);
  }

  const siteName = getLocalizedValue(seo.siteName).trim();
  if (siteName) {
    setMetaTag("property", "og:site_name", siteName);
  }

  const ogType = getLocalizedValue(seo.ogType).trim();
  if (ogType) {
    setMetaTag("property", "og:type", ogType);
  }

  const ogTitle = title || document.title;
  if (ogTitle) {
    setMetaTag("property", "og:title", ogTitle);
    setMetaTag("name", "twitter:title", ogTitle);
  }

  const ogImage = getLocalizedValue(seo.ogImage).trim();
  if (ogImage) {
    setMetaTag("property", "og:image", ogImage);
  }

  const ogVideo = getLocalizedValue(seo.ogVideo).trim();
  if (ogVideo) {
    setMetaTag("property", "og:video", ogVideo);
  }
  const ogVideoType = getLocalizedValue(seo.ogVideoType).trim();
  if (ogVideoType) {
    setMetaTag("property", "og:video:type", ogVideoType);
  }

  const twitterImage = getLocalizedValue(seo.twitterImage).trim() || ogImage;
  if (twitterImage) {
    setMetaTag("name", "twitter:image", twitterImage);
  }

  const twitterPlayer = getLocalizedValue(seo.twitterPlayer).trim();
  if (twitterPlayer) {
    setMetaTag("name", "twitter:player", twitterPlayer);
  }

  const twitterCard = getLocalizedValue(seo.twitterCard).trim();
  const resolvedCard =
    twitterCard || (twitterPlayer ? "player" : ogImage ? "summary_large_image" : "");
  if (resolvedCard) {
    setMetaTag("name", "twitter:card", resolvedCard);
  }

  const canonicalBase = getLocalizedValue(seo.canonicalBase).trim();
  const canonical = getLocalizedValue(seo.canonical).trim();
  let canonicalHref = "";
  if (canonicalBase && typeof window !== "undefined") {
    const protocol = window.location ? window.location.protocol : "";
    if (protocol === "http:" || protocol === "https:") {
      const base = canonicalBase.replace(/\/$/, "");
      const path = window.location ? window.location.pathname : "/";
      canonicalHref = setLinkTag("canonical", `${base}${path || "/"}`);
    }
  }
  if (!canonicalHref && canonical) {
    canonicalHref = setLinkTag("canonical", canonical);
  }
  if (canonicalHref) {
    setMetaTag("property", "og:url", canonicalHref);
  }
};

const loadContent = async () => {
  const [projects, software, news, about, seo, pages] = await Promise.all([
    fetchJsonWithFallback("projects"),
    fetchJsonWithFallback("software"),
    fetchJsonWithFallback("news"),
    fetchJsonWithFallback("about"),
    fetchJsonWithFallback("seo"),
    fetchJsonWithFallback("pages"),
  ]);
  state.projects = Array.isArray(projects) ? projects : [];
  state.software = Array.isArray(software) ? software : [];
  state.news = Array.isArray(news) ? news : [];
  state.about = about && typeof about === "object" ? about : null;
  state.pages = pages && typeof pages === "object" ? pages : null;
  state.seo = seo && typeof seo === "object" ? seo : null;
  applyLanguage(currentLanguage);
  if (document.body) {
    document.body.classList.add("content-ready");
  }
};

loadContent();
