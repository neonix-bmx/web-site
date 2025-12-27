const navLinks = Array.from(document.querySelectorAll(".nav-tile"));
const sections = Array.from(
  document.querySelectorAll("section[id], article[id]")
);
const contactForm = document.querySelector(".contact-form");
const projectList = document.querySelector("#projectList");
const softwareList = document.querySelector("#softwareList");
const newsList = document.querySelector("#newsList");

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

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

const limitItems = (items, limit) => {
  if (!Array.isArray(items)) {
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

const loadContent = async () => {
  if (!projectList && !softwareList && !newsList) {
    return;
  }
  const [projects, software, news] = await Promise.all([
    fetchJsonWithFallback("projects"),
    fetchJsonWithFallback("software"),
    fetchJsonWithFallback("news"),
  ]);
  replaceList(projectList, limitItems(projects, 3), formatProject);
  replaceList(softwareList, limitItems(software, 3), formatSoftware);
  replaceLines(newsList, limitItems(news, 3), formatNews);
};

loadContent();
