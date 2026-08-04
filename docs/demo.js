const pagesOwner = location.hostname.endsWith(".github.io")
  ? location.hostname.slice(0, -".github.io".length)
  : "";
const repositoryUrl = pagesOwner
  ? `https://github.com/${pagesOwner}/repolingo-extension`
  : "../";
const readme = document.querySelector(".readme");
const languageSwitch = document.querySelector("#demo-switch");
const bilingual = document.querySelector("#demo-bilingual");
const menu = document.querySelector("#demo-menu");
const panel = document.querySelector("#demo-panel");
let mode = "original";

const requestedTheme = new URLSearchParams(location.search).get("theme");
if (["light", "dark"].includes(requestedTheme)) {
  document.documentElement.dataset.theme = requestedTheme;
}

function setMode(nextMode) {
  mode = nextMode;
  readme.dataset.mode = nextMode;
  languageSwitch.dataset.mode = nextMode;
  bilingual.checked = nextMode === "bilingual";
  languageSwitch.setAttribute(
    "aria-label",
    nextMode === "original" ? "切换到中文译文" : "切换到英文原文",
  );
}

languageSwitch.addEventListener("click", () => {
  setMode(mode === "original" ? "translated" : "original");
});
bilingual.addEventListener("change", () => {
  setMode(bilingual.checked ? "bilingual" : "translated");
});
menu.addEventListener("click", () => {
  const open = panel.hidden;
  panel.hidden = !open;
  menu.setAttribute("aria-expanded", String(open));
});

const initialMode = new URLSearchParams(location.search).get("mode");
if (["original", "translated", "bilingual"].includes(initialMode)) {
  setMode(initialMode);
}

for (const link of document.querySelectorAll("[data-repo-link]")) {
  link.href = repositoryUrl;
}
for (const link of document.querySelectorAll("[data-release-link]")) {
  link.href = `${repositoryUrl}/releases`;
}
