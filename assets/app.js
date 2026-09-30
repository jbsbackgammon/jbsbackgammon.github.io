(() => {
  "use strict";

  const OWNER = "jbsbackgammon";
  const ROOT_REPO = "jbsbackgammon.github.io";
  const CONFIG_PATH = "tools.json";
  const API_BASE = "https://api.github.com";

  const toolList = document.getElementById("tool-list");
  const editToggle = document.getElementById("edit-toggle");
  const editor = document.getElementById("editor");
  const editorClose = document.getElementById("editor-close");
  const editorBody = document.getElementById("editor-body");
  const saveButton = document.getElementById("save-config");
  const tokenInput = document.getElementById("github-token");
  const editorMessage = document.getElementById("editor-message");

  let config = { version: 1, tools: [] };
  let repos = [];
  let mergedTools = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${body}`);
    }
    return response.json();
  }

  async function loadConfig() {
    const response = await fetch(`./${CONFIG_PATH}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("tools.json の読み込みに失敗しました。");
    return response.json();
  }

  async function loadAllPublicRepos() {
    const all = [];
    for (let page = 1; page <= 5; page += 1) {
      const batch = await fetchJson(
        `${API_BASE}/users/${OWNER}/repos?per_page=100&page=${page}&sort=full_name&type=owner`
      );
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all.filter(repo => repo.name !== ROOT_REPO && !repo.archived && !repo.fork);
  }

  function mergeConfigAndRepos() {
    const repoMap = new Map(repos.map(repo => [repo.name, repo]));
    const configured = new Set();
    const result = [];

    for (const item of config.tools || []) {
      configured.add(item.repo);
      const repo = repoMap.get(item.repo);
      if (repo || item.showWhenMissing) {
        result.push({
          repo: item.repo,
          category: item.category || item.repo.toUpperCase(),
          name: item.name || item.repo,
          showWhenMissing: Boolean(item.showWhenMissing),
          exists: Boolean(repo),
          hasPages: Boolean(repo?.has_pages),
          repoData: repo || null
        });
      }
    }

    const newRepos = repos
      .filter(repo => !configured.has(repo.name))
      .sort((a, b) => a.name.localeCompare(b.name, "en"))
      .map(repo => ({
        repo: repo.name,
        category: repo.name.toUpperCase(),
        name: repo.name,
        showWhenMissing: false,
        exists: true,
        hasPages: Boolean(repo.has_pages),
        repoData: repo
      }));

    mergedTools = [...result, ...newRepos];
  }

  function renderTools() {
    if (!mergedTools.length) {
      toolList.innerHTML = '<p class="loading">表示できるツールがありません。</p>';
      return;
    }

    toolList.innerHTML = mergedTools.map(tool => {
      const category = escapeHtml(tool.category);
      const name = escapeHtml(tool.name);

      if (tool.exists && tool.hasPages) {
        const url = `https://${OWNER}.github.io/${encodeURIComponent(tool.repo)}/`;
        return `
          <a class="tool-card" href="${url}">
            <div><p class="tool-card__category">${category}</p><h3>${name}</h3></div>
            <span class="tool-card__arrow" aria-hidden="true">→</span>
          </a>`;
      }

      return `
        <div class="tool-card tool-card--disabled" aria-disabled="true">
          <div><p class="tool-card__category">${category}</p><h3>${name}</h3></div>
          <span class="status">未公開</span>
        </div>`;
    }).join("");
  }

  function renderEditor() {
    editorBody.innerHTML = mergedTools.map((tool, index) => `
      <tr data-repo="${escapeHtml(tool.repo)}">
        <td class="order-cell">
          <button type="button" class="move-button" data-move="-1" ${index === 0 ? "disabled" : ""} aria-label="上へ">↑</button>
          <button type="button" class="move-button" data-move="1" ${index === mergedTools.length - 1 ? "disabled" : ""} aria-label="下へ">↓</button>
        </td>
        <td><code>${escapeHtml(tool.repo)}</code></td>
        <td><input class="editor-input category-input" type="text" value="${escapeHtml(tool.category)}"></td>
        <td><input class="editor-input name-input" type="text" value="${escapeHtml(tool.name)}"></td>
      </tr>`).join("");

    editorBody.querySelectorAll(".move-button").forEach(button => {
      button.addEventListener("click", () => {
        syncEditorInputsToModel();
        const row = button.closest("tr");
        const repo = row.dataset.repo;
        const current = mergedTools.findIndex(tool => tool.repo === repo);
        const next = current + Number(button.dataset.move);
        if (next < 0 || next >= mergedTools.length) return;
        [mergedTools[current], mergedTools[next]] = [mergedTools[next], mergedTools[current]];
        renderEditor();
        renderTools();
      });
    });

    editorBody.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", () => {
        syncEditorInputsToModel();
        renderTools();
      });
    });
  }

  function syncEditorInputsToModel() {
    editorBody.querySelectorAll("tr").forEach(row => {
      const tool = mergedTools.find(item => item.repo === row.dataset.repo);
      if (!tool) return;
      tool.category = row.querySelector(".category-input").value.trim() || tool.repo.toUpperCase();
      tool.name = row.querySelector(".name-input").value.trim() || tool.repo;
    });
  }

  function configFromModel() {
    return {
      version: 1,
      tools: mergedTools.map(tool => ({
        repo: tool.repo,
        category: tool.category,
        name: tool.name,
        showWhenMissing: Boolean(tool.showWhenMissing)
      }))
    };
  }

  function toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function saveConfigToGitHub() {
    syncEditorInputsToModel();
    const token = tokenInput.value.trim();
    if (!token) {
      editorMessage.textContent = "GitHub Fine-grained PATを入力してください。";
      return;
    }

    saveButton.disabled = true;
    editorMessage.textContent = "GitHubへ保存しています…";

    try {
      const apiUrl = `${API_BASE}/repos/${OWNER}/${ROOT_REPO}/contents/${CONFIG_PATH}`;
      const authHeaders = { Authorization: `Bearer ${token}` };
      let sha = null;

      try {
        const current = await fetchJson(`${apiUrl}?ref=main`, { headers: authHeaders });
        sha = current.sha;
      } catch (error) {
        if (!String(error.message).startsWith("404 ")) throw error;
      }

      const nextConfig = configFromModel();
      const body = {
        message: "Update tool display settings",
        content: toBase64Utf8(JSON.stringify(nextConfig, null, 2) + "\n"),
        branch: "main"
      };
      if (sha) body.sha = sha;

      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${detail}`);
      }

      config = nextConfig;
      tokenInput.value = "";
      editorMessage.textContent = "保存しました。GitHub Actionsによる公開反映後も、この表示順・名称が維持されます。";
    } catch (error) {
      console.error(error);
      editorMessage.textContent = "保存に失敗しました。トークン権限（Contents: Read and write）と対象リポジトリを確認してください。";
    } finally {
      saveButton.disabled = false;
    }
  }

  editToggle.addEventListener("click", () => {
    editor.hidden = false;
    renderEditor();
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  editorClose.addEventListener("click", () => {
    editor.hidden = true;
    editorMessage.textContent = "";
    tokenInput.value = "";
  });

  saveButton.addEventListener("click", saveConfigToGitHub);

  async function init() {
    try {
      const [loadedConfig, loadedRepos] = await Promise.all([loadConfig(), loadAllPublicRepos()]);
      config = loadedConfig;
      repos = loadedRepos;
      mergeConfigAndRepos();
      renderTools();
    } catch (error) {
      console.error(error);
      try {
        config = await loadConfig();
        repos = [];
        mergeConfigAndRepos();
        renderTools();
      } catch {
        toolList.innerHTML = '<p class="loading">ツール一覧を読み込めませんでした。時間をおいて再読み込みしてください。</p>';
      }
    }
  }

  init();
})();
