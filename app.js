const seedData = window.manualSeedData;
const appConfig = window.manualAppConfig || {};
const categoryNames = seedData.categories;
const legacyCategoryMap = seedData.legacyCategoryMap;
const ownerOptions = seedData.owners;
const starterManuals = seedData.manuals;

const storageKey = "company-manuals";
const authStorageKey = "manual-authenticated-until";
const manualList = document.querySelector("#manualList");
const manualDetail = document.querySelector("#manualDetail");
const searchInput = document.querySelector("#searchInput");
const categoryList = document.querySelector("#categoryList");
const resultCount = document.querySelector("#resultCount");
const dialog = document.querySelector("#manualDialog");
const form = document.querySelector("#manualForm");
const openFormButton = document.querySelector("#openFormButton");
const logoutButton = document.querySelector("#logoutButton");
const homeView = document.querySelector("#homeView");
const manualShell = document.querySelector("#manualShell");
const playPage = document.querySelector("#playPage");
const homeLogoutButton = document.querySelector("#homeLogoutButton");
const manualHomeButton = document.querySelector("#manualHomeButton");
const playHomeButton = document.querySelector("#playHomeButton");
const playLogoutButton = document.querySelector("#playLogoutButton");
const openManualPageButton = document.querySelector("#openManualPageButton");
const openPlayPageButton = document.querySelector("#openPlayPageButton");
const pageEyebrow = document.querySelector("#pageEyebrow");
const pageTitle = document.querySelector("#pageTitle");
const manualView = document.querySelector("#manualView");
const restartGameButton = document.querySelector("#restartGameButton");
const gameBoard = document.querySelector("#gameBoard");
const moveCount = document.querySelector("#moveCount");
const gameTime = document.querySelector("#gameTime");
const bestScore = document.querySelector("#bestScore");
const gameMessage = document.querySelector("#gameMessage");
const dialogTitle = document.querySelector("#dialogTitle");
const saveButton = document.querySelector("#saveButton");
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
let currentView = "home";
let gameCards = [];
let flippedCards = [];
let matchedCards = 0;
let gameMoves = 0;
let gameStartedAt = null;
let gameTimerId = null;

const gameStorageKey = "manual-play-best-score";
const gameItems = [
  { label: "회의", code: "A1" },
  { label: "자료", code: "B2" },
  { label: "결재", code: "C3" },
  { label: "정산", code: "D4" },
  { label: "시설", code: "E5" },
  { label: "성과", code: "F6" },
];

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
    status: "정상",
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
  const filteredManuals = manuals.filter((manual) => {
    const inCategory = selectedCategory === "all" || manual.category === selectedCategory;
    const searchable = [manual.title, manual.owner, manual.summary, manual.reference, ...manual.steps]
      .join(" ")
      .toLowerCase();
    return inCategory && searchable.includes(query);
  });

  if (!filteredManuals.some((manual) => manual.id === selectedId)) {
    selectedId = filteredManuals[0]?.id;
  }

  resultCount.textContent = `${filteredManuals.length}개`;
  manualList.innerHTML = filteredManuals.map(renderListItem).join("") || renderEmptyList();
  renderDetail(filteredManuals.find((manual) => manual.id === selectedId));
}

function renderListItem(manual) {
  const activeClass = manual.id === selectedId ? " is-selected" : "";

  return `
    <button class="manual-item${activeClass}" type="button" data-id="${manual.id}">
      <strong>${escapeHtml(manual.title)}</strong>
      <span class="manual-meta">
        <span class="tag">${categoryNames[manual.category] || "일반행정"}</span>
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

  const steps = manual.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");

  manualDetail.innerHTML = `
    <div class="detail-toolbar">
      <div class="detail-kicker">
        <span class="tag">${categoryNames[manual.category] || "일반행정"}</span>
        <span class="tag">${escapeHtml(manual.owner)}</span>
        <span class="tag">수정 ${manual.updatedAt}</span>
      </div>
      <div class="detail-actions">
        <button class="secondary-action compact" type="button" data-action="edit" data-id="${manual.id}">수정</button>
        <button class="danger-action compact" type="button" data-action="delete" data-id="${manual.id}">삭제</button>
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
      <div class="reference">${renderReference(manual.reference)}</div>
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
    status: "정상",
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

function showHomeView() {
  currentView = "home";
  homeView.classList.remove("is-hidden");
  manualShell.classList.add("is-hidden");
  playPage.classList.add("is-hidden");
  clearInterval(gameTimerId);
}

function showManualPage(category = selectedCategory) {
  currentView = "manual";
  homeView.classList.add("is-hidden");
  manualShell.classList.remove("is-hidden");
  playPage.classList.add("is-hidden");
  manualView.classList.remove("is-hidden");
  openFormButton.classList.remove("is-hidden");
  pageEyebrow.textContent = "Internal Knowledge Base";
  pageTitle.textContent = "석준수 개인 업무 매뉴얼";
  clearInterval(gameTimerId);
  setActiveCategory(category);
  render();
}

function showPlayPage() {
  currentView = "play";
  homeView.classList.add("is-hidden");
  manualShell.classList.add("is-hidden");
  playPage.classList.remove("is-hidden");
  startGame();
}

function startGame() {
  clearInterval(gameTimerId);
  gameCards = shuffleCards(
    gameItems.flatMap((item) => [
      { ...item, id: `${item.code}-1`, matched: false, flipped: false },
      { ...item, id: `${item.code}-2`, matched: false, flipped: false },
    ]),
  );
  flippedCards = [];
  matchedCards = 0;
  gameMoves = 0;
  gameStartedAt = null;
  gameTimerId = null;
  moveCount.textContent = "0";
  gameTime.textContent = "0초";
  gameMessage.textContent = "준비 완료";
  renderBestScore();
  renderGameBoard();
}

function shuffleCards(cards) {
  return cards
    .map((card) => ({ card, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ card }) => card);
}

function renderGameBoard() {
  gameBoard.innerHTML = gameCards
    .map((card) => {
      const isOpen = card.flipped || card.matched;
      const stateClass = isOpen ? " is-open" : "";
      const matchedClass = card.matched ? " is-matched" : "";
      return `
        <button class="game-card${stateClass}${matchedClass}" type="button" data-card-id="${card.id}" aria-label="${escapeHtml(card.label)} 카드">
          <span class="game-card-front">
            <strong>${escapeHtml(card.label)}</strong>
            <small>${escapeHtml(card.code)}</small>
          </span>
          <span class="game-card-back">?</span>
        </button>
      `;
    })
    .join("");
}

function handleCardClick(cardId) {
  const card = gameCards.find((item) => item.id === cardId);
  if (!card || card.flipped || card.matched || flippedCards.length >= 2) return;

  if (!gameStartedAt) {
    gameStartedAt = Date.now();
    gameTimerId = setInterval(updateGameTime, 250);
  }

  card.flipped = true;
  flippedCards.push(card);
  renderGameBoard();

  if (flippedCards.length < 2) return;

  gameMoves += 1;
  moveCount.textContent = String(gameMoves);
  const [firstCard, secondCard] = flippedCards;

  if (firstCard.code === secondCard.code) {
    firstCard.matched = true;
    secondCard.matched = true;
    matchedCards += 2;
    flippedCards = [];
    gameMessage.textContent = "매칭 성공";
    renderGameBoard();
    if (matchedCards === gameCards.length) {
      finishGame();
    }
    return;
  }

  gameMessage.textContent = "다시 선택";
  setTimeout(() => {
    firstCard.flipped = false;
    secondCard.flipped = false;
    flippedCards = [];
    renderGameBoard();
  }, 720);
}

function updateGameTime() {
  if (!gameStartedAt) return;
  gameTime.textContent = `${Math.floor((Date.now() - gameStartedAt) / 1000)}초`;
}

function finishGame() {
  clearInterval(gameTimerId);
  updateGameTime();
  const seconds = Math.floor((Date.now() - gameStartedAt) / 1000);
  const score = { moves: gameMoves, seconds };
  const best = getBestScore();
  if (!best || score.moves < best.moves || (score.moves === best.moves && score.seconds < best.seconds)) {
    localStorage.setItem(gameStorageKey, JSON.stringify(score));
  }
  gameMessage.textContent = "완료";
  renderBestScore();
}

function getBestScore() {
  try {
    const score = JSON.parse(localStorage.getItem(gameStorageKey) || "null");
    if (score && Number.isFinite(score.moves) && Number.isFinite(score.seconds)) {
      return score;
    }
  } catch (error) {
    console.warn("최고 기록 확인 실패", error);
  }
  return null;
}

function renderBestScore() {
  const score = getBestScore();
  bestScore.textContent = score ? `${score.moves}회 ${score.seconds}초` : "-";
}

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  showManualPage(button.dataset.category);
});

manualList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  selectedId = button.dataset.id;
  render();
});

openManualPageButton.addEventListener("click", () => showManualPage("all"));
openPlayPageButton.addEventListener("click", showPlayPage);
manualHomeButton.addEventListener("click", showHomeView);
playHomeButton.addEventListener("click", showHomeView);
restartGameButton.addEventListener("click", startGame);
gameBoard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-card-id]");
  if (!button) return;

  handleCardClick(button.dataset.cardId);
});

manualDetail.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const manual = manuals.find((item) => item.id === button.dataset.id);
  if (button.dataset.action === "edit" && manual) {
    openEditDialog(manual);
  }

  if (button.dataset.action === "delete") {
    deleteManual(button.dataset.id);
  }
});

searchInput.addEventListener("input", render);
openFormButton.addEventListener("click", openAddDialog);
[logoutButton, homeLogoutButton, playLogoutButton].forEach((button) => {
  button.addEventListener("click", logout);
});

function logout() {
  clearInterval(gameTimerId);
  clearAuthExpiry();
  document.body.classList.add("is-locked");
  homeView.classList.add("is-hidden");
  manualShell.classList.add("is-hidden");
  playPage.classList.add("is-hidden");
  passwordScreen.classList.remove("is-hidden");
  passwordInput.value = "";
  passwordError.textContent = "";
  passwordInput.focus();
}

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

function renderReference(reference) {
  if (!reference) {
    return "등록된 참고 위치가 없습니다.";
  }

  const safeReference = escapeHtml(reference);
  const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
  return safeReference.replace(urlPattern, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
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
    init().then(showHomeView);
    return;
  }
  showHomeView();
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

async function init() {
  manualList.innerHTML = '<div class="detail-empty">매뉴얼을 불러오는 중입니다.</div>';
  manualDetail.innerHTML = '<div class="detail-empty">잠시만 기다려주세요.</div>';
  manuals = await loadManuals();
  selectedId = manuals[0]?.id;
  render();
}

requirePasswordIfNeeded();
