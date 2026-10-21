(() => {
  "use strict";

  const OWNER = "jbsbackgammon";
  const ROOT_REPO = "jbsbackgammon.github.io";
  const API_BASE = "https://api.github.com";

  const toolList = document.getElementById("tool-list");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async function loadAllPublicRepos() {
    const all = [];

    for (let page = 1; page <= 10; page += 1) {
      const batch = await fetchJson(
        `${API_BASE}/users/${OWNER}/repos?per_page=100&page=${page}&sort=full_name&type=owner`
      );

      all.push(...batch);

      if (batch.length < 100) break;
    }

    return all.filter(repo =>
      repo.name !== ROOT_REPO &&
      !repo.archived &&
      !repo.fork
    );
  }

  function sortRepos(repos) {
    return [...repos].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    );
  }

  async function getPageTitle(repo) {
    if (!repo.has_pages) return null;

    const url = `/${encodeURIComponent(repo.name)}/`;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const title = doc.querySelector("title")?.textContent?.trim();

      return title || null;
    } catch (error) {
      console.warn(`${repo.name} のページタイトルを取得できませんでした。`, error);
      return null;
    }
  }

  function createCard(repo, title) {
    const category = escapeHtml(repo.name.toUpperCase());
    const displayName = escapeHtml(title || repo.name);

    if (repo.has_pages) {
      const url = `/${encodeURIComponent(repo.name)}/`;

      return `
        <a class="tool-card" href="${url}">
          <div>
            <p class="tool-card__category">${category}</p>
            <h3>${displayName}</h3>
          </div>
        </a>
      `;
    }

    return `
      <div class="tool-card tool-card--disabled" aria-disabled="true">
        <div>
          <p class="tool-card__category">${category}</p>
          <h3>${displayName}</h3>
        </div>
        <span class="status">未公開</span>
      </div>
    `;
  }

  async function init() {
    try {
      const repos = await loadAllPublicRepos();
      const sortedRepos = sortRepos(repos);

      if (!sortedRepos.length) {
        toolList.innerHTML = '<p class="loading">表示できるツールがありません。</p>';
        return;
      }

      const titles = await Promise.all(
        sortedRepos.map(repo => getPageTitle(repo))
      );

      toolList.innerHTML = sortedRepos
        .map((repo, index) => createCard(repo, titles[index]))
        .join("");
    } catch (error) {
      console.error(error);
      toolList.innerHTML =
        '<p class="loading">ツール一覧を読み込めませんでした。時間をおいて再読み込みしてください。</p>';
    }
  }

  init();
})();
