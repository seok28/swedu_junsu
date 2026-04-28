const seedData = window.manualSeedData;
const appConfig = window.manualAppConfig || {};
const categoryNames = seedData.categories;
const legacyCategoryMap = seedData.legacyCategoryMap;
const ownerOptions = seedData.owners;
const starterManuals = seedData.manuals;

const storageKey = "company-manuals";
const authStorageKey = "manual-authenticated-until";
const favoritesStorageKey = "manual-favorites";
const manualList = document.querySelector("#manualList");
const manualDetail = document.querySelector("#manualDetail");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const needsUpdateOnly = document.querySelector("#needsUpdateOnly");
const favoritesOnly = document.querySelector("#favoritesOnly");
const categoryList = document.querySelector("#categoryList");
const resultCount = document.querySelector("#resultCount");
const totalManualCount = document.querySelector("#totalManualCount");
const needsUpdateCount = document.querySelector("#needsUpdateCount");
const latestUpdatedAt = document.querySelector("#latestUpdatedAt");
const dialog = document.querySelector("#manualDialog");
const form = document.querySelector("#manualForm");
const openFormButton = document.querySelector("#openFormButton");
const adminModeButton = document.querySelector("#adminModeButton");
const modeBadge = document.querySelector("#modeBadge");
const logoutButton = document.querySelector("#logoutButton");
const dialogTitle = document.querySelector("#dialogTitle");
const saveButton = document.querySelector("#saveButton");
const adminDialog = document.querySelector("#adminDialog");
const adminForm = document.querySelector("#adminForm");
const adminPasswordInput = document.querySelector("#adminPasswordInput");
const adminPasswordError = document.querySelector("#adminPasswordError");
const passwordScreen = document.querySelector("#passwordScreen");
const passwordForm = document.querySelector("#passwordForm");
const passwordInput = document.querySelector("#passwordInput");
const passwordError = document.querySelector("#passwordError");

let manuals = [];
let selectedCategory = "all";
let selectedId = null;
let editingId = null;
let isSaving = false;
let appStarted = false;
let isManagerMode = false;
let favoriteIds = loadFavoriteIds();

function hasRemoteApi() {
  return Boolean(appConfig.googleAppsScriptUrl);
}

async function loadManuals() {
  if (hasRemoteApi()) {
    try {
      const result = await requestRemote("list");
      return result.manuals.map(normalizeManual);
    } catch (error) {
      console.error(error);
      alert("구글 시트 데이터를 불러오지 못했습니다. 임시로 브라우저 저장 데이터를 표시합니다.");
    }
  }

  return loadLocalManuals();
}

function loadLocalManuals() {
  const savedManuals = localStorage.getItem(storageKey);
  if (savedManuals !== null) {
    const parsedManuals = JSON.parse(savedManuals).map(normalizeManual);
    localStorage.setItem(storageKey, JSON.stringify(parsedManuals));
    return parsedManuals;
  }

  localStorage.setItem(storageKey, JSON.stringify(starterManuals));
  return [...starterManuals];
}

function normalizeManual(manual) {
  const steps = Array.isArray(manual.steps)
    ? manual.steps
    : String(manual.steps || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

  return {
    id: manual.id,
    title: manual.title || "",
    category: legacyCategoryMap[manual.category] || manual.category || "etc",
    owner: ownerOptions.includes(manual.owner) ? manual.owner : "AI/SW교육지원팀",
    updatedAt: manual.updatedAt || new Date().toISOString().slice(0, 10),
    status: manual.status === "업데이트 필요" ? "업데이트 필요" : "정상",
    summary: manual.summary || steps[0] || "",
    steps,
    reference: manual.reference || "",
  };
}

async function saveManual(manual) {
  if (hasRemoteApi()) {
    await requestRemote("upsert", { manual });
    manuals = await loadManuals();
    return;
  }

  const exists = manuals.some((item) => item.id === manual.id);
  manuals = exists ? manuals.map((item) => (item.id === manual.id ? manual : item)) : [manual, ...manuals];
  saveLocalManuals();
}

async function removeManual(id) {
  if (hasRemoteApi()) {
    await requestRemote("delete", { id });
    manuals = await loadManuals();
    return;
  }

  manuals = manuals.filter((item) => item.id !== id);
  saveLocalManuals();
}

function saveLocalManuals() {
  localStorage.setItem(storageKey, JSON.stringify(manuals));
}

async function requestRemote(action, payload = {}) {
  const response = await fetch(appConfig.googleAppsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action,
      adminKey: appConfig.adminKey || "",
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || "Google Sheets API request failed");
  }

  return result;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filteredManuals = sortManuals(manuals.filter((manual) => {
    const inCategory = selectedCategory === "all" || manual.category === selectedCategory;
    const inStatus = !needsUpdateOnly.checked || manual.status === "업데이트 필요";
    const inFavorites = !favoritesOnly.checked || favoriteIds.includes(manual.id);
    const searchable = [manual.title, manual.owner, manual.summary, manual.reference, ...manual.steps]
      .join(" ")
      .toLowerCase();
    return inCategory && inStatus && inFavorites && searchable.includes(query);
  }));

  if (!filteredManuals.some((manual) => manual.id === selectedId)) {
    selectedId = filteredManuals[0]?.id;
  }

  renderSummary();
  resultCount.textContent = `${filteredManuals.length}개`;
  manualList.innerHTML = filteredManuals.map(renderListItem).join("") || renderEmptyList();
  renderDetail(filteredManuals.find((manual) => manual.id === selectedId));
}

function renderSummary() {
  totalManualCount.textContent = String(manuals.length);
  needsUpdateCount.textContent = String(manuals.filter((manual) => manual.status === "업데이트 필요").length);
  latestUpdatedAt.textContent = manuals
    .map((manual) => manual.updatedAt)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0] || "-";
}

function sortManuals(items) {
  const sortedItems = [...items];

  if (sortSelect.value === "title") {
    return sortedItems.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }

  if (sortSelect.value === "needsUpdate") {
    return sortedItems.sort((a, b) => {
      const statusA = a.status === "업데이트 필요" ? 0 : 1;
      const statusB = b.status === "업데이트 필요" ? 0 : 1;
      if (statusA !== statusB) return statusA - statusB;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  return sortedItems.sort((a, b) => {
    const favoriteA = favoriteIds.includes(a.id) ? 0 : 1;
    const favoriteB = favoriteIds.includes(b.id) ? 0 : 1;
    if (favoriteA !== favoriteB) return favoriteA - favoriteB;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function renderListItem(manual) {
  const activeClass = manual.id === selectedId ? " is-selected" : "";
  const warning = manual.status === "업데이트 필요" ? '<span class="tag warning">업데이트 필요</span>' : "";
  const favorite = favoriteIds.includes(manual.id) ? '<span class="tag favorite">즐겨찾기</span>' : "";

  return `
    <button class="manual-item${activeClass}" type="button" data-id="${manual.id}">
      <strong>${escapeHtml(manual.title)}</strong>
      <span class="manual-meta">
        <span class="tag">${categoryNames[manual.category] || "일반행정"}</span>
        ${favorite}
        ${warning}
        <span>${escapeHtml(manual.owner)}</span>
        <span>${manual.updatedAt}</span>
      </span>
    </button>
  `;
}

function renderEmptyList() {
  return '<div class="detail-empty">검색 결과가 없습니다.</div>';
}

function renderDetail(manual) {
  if (!manual) {
    manualDetail.innerHTML = '<div class="detail-empty">왼쪽 목록에서 매뉴얼을 선택하세요.</div>';
    return;
  }

  const warning = manual.status === "업데이트 필요" ? '<span class="tag warning">업데이트 필요</span>' : "";
  const steps = manual.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  const isFavorite = favoriteIds.includes(manual.id);
  const favoriteLabel = isFavorite ? "즐겨찾기 해제" : "즐겨찾기";
  const detailActions = isManagerMode
    ? `
      <button class="secondary-action compact" type="button" data-action="edit" data-id="${manual.id}">수정</button>
      <button class="danger-action compact" type="button" data-action="delete" data-id="${manual.id}">삭제</button>
    `
    : "";

  manualDetail.innerHTML = `
    <div class="detail-toolbar">
      <div class="detail-kicker">
        <span class="tag">${categoryNames[manual.category] || "일반행정"}</span>
        ${isFavorite ? '<span class="tag favorite">즐겨찾기</span>' : ""}
        ${warning}
        <span class="tag">${escapeHtml(manual.owner)}</span>
        <span class="tag">수정 ${manual.updatedAt}</span>
      </div>
      <div class="detail-actions">
        <button class="secondary-action compact" type="button" data-action="favorite" data-id="${manual.id}">${favoriteLabel}</button>
        ${detailActions}
      </div>
    </div>
    <h2>${escapeHtml(manual.title)}</h2>
    <p class="detail-summary">${escapeHtml(manual.summary)}</p>

    <div class="detail-block">
      <h3>핵심 절차</h3>
      <ol class="steps">${steps}</ol>
    </div>

    <div class="detail-block">
      <h3>참고 위치</h3>
      <div class="reference-list">${renderReference(manual.reference)}</div>
    </div>
  `;
}

function openAddDialog() {
  editingId = null;
  dialogTitle.textContent = "새 매뉴얼 추가";
  saveButton.textContent = "저장";
  form.reset();
  if (selectedCategory !== "all") {
    form.elements.category.value = selectedCategory;
  }
  dialog.showModal();
}

function openEditDialog(manual) {
  editingId = manual.id;
  dialogTitle.textContent = "매뉴얼 수정";
  saveButton.textContent = "수정 저장";
  form.elements.title.value = manual.title;
  form.elements.category.value = manual.category;
  form.elements.owner.value = manual.owner;
  form.elements.status.value = manual.status;
  form.elements.body.value = manual.steps.join("\n");
  form.elements.reference.value = manual.reference || "";
  dialog.showModal();
}

async function deleteManual(id) {
  const manual = manuals.find((item) => item.id === id);
  if (!manual) return;

  const ok = confirm(`'${manual.title}' 매뉴얼을 삭제할까요?`);
  if (!ok) return;

  try {
    await removeManual(id);
    selectedId = manuals.find((item) => selectedCategory === "all" || item.category === selectedCategory)?.id;
    render();
  } catch (error) {
    console.error(error);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

function buildManualFromForm(id) {
  const formData = new FormData(form);
  const title = formData.get("title").trim();
  const body = formData.get("body").trim();
  const steps = body.split("\n").map((line) => line.trim()).filter(Boolean);

  return {
    id,
    title,
    category: formData.get("category"),
    owner: formData.get("owner").trim(),
    updatedAt: new Date().toISOString().slice(0, 10),
    status: formData.get("status"),
    summary: steps[0] || title,
    steps,
    reference: formData.get("reference").trim(),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  selectedCategory = button.dataset.category;
  document.querySelectorAll(".category").forEach((item) => item.classList.remove("is-active"));
  button.classList.add("is-active");
  render();
});

manualList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  selectedId = button.dataset.id;
  render();
});

manualDetail.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const manual = manuals.find((item) => item.id === button.dataset.id);
  if (button.dataset.action === "favorite" && manual) {
    toggleFavorite(manual.id);
    render();
    return;
  }

  if (!isManagerMode) return;

  if (button.dataset.action === "edit" && manual) {
    openEditDialog(manual);
  }

  if (button.dataset.action === "delete") {
    deleteManual(button.dataset.id);
  }
});

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
needsUpdateOnly.addEventListener("change", render);
favoritesOnly.addEventListener("change", render);
openFormButton.addEventListener("click", openAddDialog);
adminModeButton.addEventListener("click", () => {
  if (isManagerMode) {
    setManagerMode(false);
    render();
    return;
  }

  adminPasswordInput.value = "";
  adminPasswordError.textContent = "";
  adminDialog.showModal();
  adminPasswordInput.focus();
});
logoutButton.addEventListener("click", () => {
  setManagerMode(false);
  clearAuthExpiry();
  document.body.classList.add("is-locked");
  passwordScreen.classList.remove("is-hidden");
  passwordInput.value = "";
  passwordError.textContent = "";
  passwordInput.focus();
});

form.addEventListener("submit", async (event) => {
  if (event.submitter?.value === "cancel") {
    editingId = null;
    return;
  }

  event.preventDefault();
  if (isSaving) return;

  isSaving = true;
  saveButton.disabled = true;
  saveButton.textContent = "저장 중";

  try {
    const manual = buildManualFromForm(editingId || `manual-${Date.now()}`);
    await saveManual(manual);
    selectedId = manual.id;
    editingId = null;
    setActiveCategory(selectedCategory);
    dialog.close();
    render();
  } catch (error) {
    console.error(error);
    alert("저장 중 오류가 발생했습니다.");
  } finally {
    isSaving = false;
    saveButton.disabled = false;
    saveButton.textContent = editingId ? "수정 저장" : "저장";
  }
});

function setActiveCategory(category) {
  selectedCategory = category;
  document.querySelectorAll(".category").forEach((item) => item.classList.remove("is-active"));
  document.querySelector(`[data-category="${category}"]`)?.classList.add("is-active");
}

function setManagerMode(enabled) {
  isManagerMode = enabled;
  openFormButton.classList.toggle("is-hidden", !enabled);
  adminModeButton.textContent = enabled ? "조회 모드" : "관리 모드";
  modeBadge.textContent = enabled ? "관리 모드" : "조회 모드";
  modeBadge.classList.toggle("is-admin", enabled);
}

function renderReference(reference) {
  if (!reference) {
    return "등록된 참고 위치가 없습니다.";
  }

  const items = String(reference)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return "등록된 참고 위치가 없습니다.";
  }

  return `<ul>${items.map((item) => `<li>${renderReferenceItem(item)}</li>`).join("")}</ul>`;
}

function renderReferenceItem(referenceItem) {
  const safeReference = escapeHtml(referenceItem);
  const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
  return safeReference.replace(urlPattern, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

function loadFavoriteIds() {
  try {
    const savedFavorites = JSON.parse(localStorage.getItem(favoritesStorageKey) || "[]");
    return Array.isArray(savedFavorites) ? savedFavorites : [];
  } catch (error) {
    console.warn("즐겨찾기 로드 실패", error);
    return [];
  }
}

function saveFavoriteIds() {
  localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds));
}

function toggleFavorite(id) {
  favoriteIds = favoriteIds.includes(id)
    ? favoriteIds.filter((favoriteId) => favoriteId !== id)
    : [id, ...favoriteIds];
  saveFavoriteIds();
}

function unlockApp(shouldRemember = true) {
  const ttlMinutes = Number(appConfig.authTtlMinutes || 60);
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  if (shouldRemember) {
    saveAuthExpiry(expiresAt);
  }
  document.body.classList.remove("is-locked");
  passwordScreen.classList.add("is-hidden");
  if (!appStarted) {
    appStarted = true;
    init();
  }
}

function requirePasswordIfNeeded() {
  const password = appConfig.accessPassword || "";
  if (!password) {
    unlockApp(false);
    return;
  }

  const authenticatedUntil = getAuthExpiry();
  if (authenticatedUntil > Date.now()) {
    unlockApp(false);
    return;
  }

  clearAuthExpiry();
  passwordScreen.classList.remove("is-hidden");
  passwordInput.focus();
}

function saveAuthExpiry(expiresAt) {
  const value = String(expiresAt);
  try {
    localStorage.setItem(authStorageKey, value);
  } catch (error) {
    console.warn("localStorage 인증 저장 실패", error);
  }

  try {
    sessionStorage.setItem(authStorageKey, value);
  } catch (error) {
    console.warn("sessionStorage 인증 저장 실패", error);
  }
}

function getAuthExpiry() {
  const values = [];

  try {
    values.push(Number(localStorage.getItem(authStorageKey) || 0));
  } catch (error) {
    console.warn("localStorage 인증 확인 실패", error);
  }

  try {
    values.push(Number(sessionStorage.getItem(authStorageKey) || 0));
  } catch (error) {
    console.warn("sessionStorage 인증 확인 실패", error);
  }

  return Math.max(0, ...values.filter(Number.isFinite));
}

function clearAuthExpiry() {
  try {
    localStorage.removeItem(authStorageKey);
  } catch (error) {
    console.warn("localStorage 인증 삭제 실패", error);
  }

  try {
    sessionStorage.removeItem(authStorageKey);
  } catch (error) {
    console.warn("sessionStorage 인증 삭제 실패", error);
  }
}

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (passwordInput.value === appConfig.accessPassword) {
    passwordError.textContent = "";
    unlockApp();
    return;
  }

  passwordError.textContent = "비밀번호가 올바르지 않습니다.";
  passwordInput.select();
});

function confirmAdminMode() {
  if (adminPasswordInput.value === appConfig.managerPassword) {
    adminPasswordError.textContent = "";
    adminDialog.close();
    setManagerMode(true);
    render();
    return;
  }

  adminPasswordError.textContent = "관리 비밀번호가 올바르지 않습니다.";
  adminPasswordInput.select();
}

adminForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  confirmAdminMode();
});

adminPasswordInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  confirmAdminMode();
});

async function init() {
  manualList.innerHTML = '<div class="detail-empty">매뉴얼을 불러오는 중입니다.</div>';
  manualDetail.innerHTML = '<div class="detail-empty">잠시만 기다려주세요.</div>';
  setManagerMode(false);
  manuals = await loadManuals();
  selectedId = manuals[0]?.id;
  render();
}

requirePasswordIfNeeded();
