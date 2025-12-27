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
const contentTargets = Array.from(
  document.querySelectorAll("[data-content]")
);

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

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }
    contactForm.classList.add("sent");
    const button = contactForm.querySelector("button[type=\"submit\"]");
    if (button) {
      button.textContent = "Gonderildi";
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

const formatProject = (project) => {
  if (!project) {
    return "";
  }
  const parts = [
    project.title,
    project.year,
    project.status,
    Array.isArray(project.stack) ? project.stack.join(" / ") : "",
  ].filter(Boolean);
  return parts.join(" - ");
};

const formatSoftware = (software) => {
  if (!software) {
    return "";
  }
  const parts = [software.name, software.type, software.status].filter(Boolean);
  return parts.join(" - ");
};

const formatNews = (newsItem) => {
  if (!newsItem) {
    return "";
  }
  const parts = [newsItem.title, newsItem.date].filter(Boolean);
  return parts.join(" - ");
};

const formatHighlight = (highlight) => {
  if (!highlight) {
    return "";
  }
  return String(highlight).trim();
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
    const value = item.value ? String(item.value).trim() : "";
    const label = item.label ? String(item.label).trim() : "";
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

const applyPageContent = (pages) => {
  if (!pages || typeof pages !== "object" || contentTargets.length === 0) {
    return;
  }
  contentTargets.forEach((node) => {
    const path = node.dataset.content;
    if (!path) {
      return;
    }
    const value = getValueByPath(pages, path);
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === "object") {
      return;
    }
    node.textContent = String(value);
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
  const title = match.metaTitle || match.title || "";
  const description = match.metaDescription || match.summary || "";
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

  const title = seo.title ? String(seo.title).trim() : "";
  if (title) {
    document.title = title;
  }

  const description = seo.description ? String(seo.description).trim() : "";
  if (description) {
    setMetaTag("name", "description", description);
    setMetaTag("property", "og:description", description);
    setMetaTag("name", "twitter:description", description);
  }

  const keywords = seo.keywords ? String(seo.keywords).trim() : "";
  if (keywords) {
    setMetaTag("name", "keywords", keywords);
  }

  const robots = seo.robots ? String(seo.robots).trim() : "";
  if (robots) {
    setMetaTag("name", "robots", robots);
  }

  const themeColor = seo.themeColor ? String(seo.themeColor).trim() : "";
  if (themeColor) {
    setMetaTag("name", "theme-color", themeColor);
  }

  const siteName = seo.siteName ? String(seo.siteName).trim() : "";
  if (siteName) {
    setMetaTag("property", "og:site_name", siteName);
  }

  const ogType = seo.ogType ? String(seo.ogType).trim() : "";
  if (ogType) {
    setMetaTag("property", "og:type", ogType);
  }

  const ogTitle = title || document.title;
  if (ogTitle) {
    setMetaTag("property", "og:title", ogTitle);
    setMetaTag("name", "twitter:title", ogTitle);
  }

  const ogImage = seo.ogImage ? String(seo.ogImage).trim() : "";
  if (ogImage) {
    setMetaTag("property", "og:image", ogImage);
  }

  const ogVideo = seo.ogVideo ? String(seo.ogVideo).trim() : "";
  if (ogVideo) {
    setMetaTag("property", "og:video", ogVideo);
  }
  const ogVideoType = seo.ogVideoType
    ? String(seo.ogVideoType).trim()
    : "";
  if (ogVideoType) {
    setMetaTag("property", "og:video:type", ogVideoType);
  }

  const twitterImage = seo.twitterImage
    ? String(seo.twitterImage).trim()
    : ogImage;
  if (twitterImage) {
    setMetaTag("name", "twitter:image", twitterImage);
  }

  const twitterPlayer = seo.twitterPlayer
    ? String(seo.twitterPlayer).trim()
    : "";
  if (twitterPlayer) {
    setMetaTag("name", "twitter:player", twitterPlayer);
  }

  const twitterCard = seo.twitterCard
    ? String(seo.twitterCard).trim()
    : "";
  const resolvedCard =
    twitterCard || (twitterPlayer ? "player" : ogImage ? "summary_large_image" : "");
  if (resolvedCard) {
    setMetaTag("name", "twitter:card", resolvedCard);
  }

  const canonicalBase = seo.canonicalBase
    ? String(seo.canonicalBase).trim()
    : "";
  const canonical = seo.canonical ? String(seo.canonical).trim() : "";
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
  replaceList(
    projectList,
    limitItems(projects, getLimit(projectList)),
    formatProject
  );
  replaceList(
    softwareList,
    limitItems(software, getLimit(softwareList)),
    formatSoftware
  );
  replaceLines(
    newsList,
    limitItems(news, getLimit(newsList)),
    formatNews
  );
  if (about) {
    if (aboutTitle && about.title) {
      aboutTitle.textContent = String(about.title).trim();
    }
    if (aboutSummary && about.summary) {
      aboutSummary.textContent = String(about.summary).trim();
    }
    replaceList(
      aboutHighlights,
      limitItems(about.highlights, getLimit(aboutHighlights)),
      formatHighlight
    );
    replaceStats(aboutStats, limitItems(about.stats, getLimit(aboutStats)));
  }
  applyPageContent(pages);
  const resolvedSeo = resolveSeoForPage(seo);
  applySeo(resolvedSeo);
  const newsSeo = getNewsSeoOverride(news);
  if (newsSeo) {
    applySeo({ ...resolvedSeo, ...newsSeo });
  }
};

loadContent();
