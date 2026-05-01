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
const pickerForm = document.querySelector("#pickerForm");
const pickerView = document.querySelector("#pickerView");
const ladderView = document.querySelector("#ladderView");
const pickerModeButton = document.querySelector("#pickerModeButton");
const ladderModeButton = document.querySelector("#ladderModeButton");
const startLadderButton = document.querySelector("#startLadderButton");
const ladderBoard = document.querySelector("#ladderBoard");
const ladderMessage = document.querySelector("#ladderMessage");
const ladderParticipantCount = document.querySelector("#ladderParticipantCount");
const ladderPickCountInput = document.querySelector("#ladderPickCountInput");
const ladderPickCount = document.querySelector("#ladderPickCount");
const participantInput = document.querySelector("#participantInput");
const pickCountInput = document.querySelector("#pickCountInput");
const startPickerButton = document.querySelector("#startPickerButton");
const resetPickerButton = document.querySelector("#resetPickerButton");
const clearHistoryButton = document.querySelector("#clearHistoryButton");
const drawMachine = document.querySelector("#drawMachine");
const winnerCount = document.querySelector("#winnerCount");
const winnerList = document.querySelector("#winnerList");
const shareResultButton = document.querySelector("#shareResultButton");
const historyList = document.querySelector("#historyList");
const sharedResult = document.querySelector("#sharedResult");
const sharedWinners = document.querySelector("#sharedWinners");
const sharedMeta = document.querySelector("#sharedMeta");
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
let pickerTimerId = null;
let isPicking = false;
let isLadderRunning = false;
let lastPickerResult = null;
let kakaoReady = false;
let pendingSharedResult = null;

const participantStorageKey = "packing-picker-participants";
const pickerHistoryStorageKey = "packing-picker-history";
const defaultParticipants = ["석준수", "김민지", "박현우", "이서연", "정도윤", "최하늘"];

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
  stopPickerAnimation();
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
  stopPickerAnimation();
  setActiveCategory(category);
  render();
}

function showPlayPage() {
  currentView = "play";
  homeView.classList.add("is-hidden");
  manualShell.classList.add("is-hidden");
  playPage.classList.remove("is-hidden");
  initPicker();
  if (pendingSharedResult) {
    renderSharedResult(pendingSharedResult);
  }
}

function initPicker() {
  const savedParticipants = getSavedParticipants();
  participantInput.value = savedParticipants.join("\n");
  pickCountInput.max = String(savedParticipants.length || 1);
  ladderPickCountInput.max = String(savedParticipants.length || 1);
  if (Number(pickCountInput.value) > savedParticipants.length) {
    pickCountInput.value = String(Math.max(1, savedParticipants.length));
  }
  ladderPickCountInput.value = pickCountInput.value;
  renderWinners([]);
  renderPickerHistory();
  updateShareButton();
  sharedResult.classList.add("is-hidden");
  drawMachine.innerHTML = "<span>READY</span>";
  renderLadderPlaceholder();
  gameMessage.textContent = "참여 인원과 뽑을 인원 수를 정해 주세요.";
}

function getParticipants() {
  const names = participantInput.value
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set(names)];
}

function getSavedParticipants() {
  try {
    const saved = JSON.parse(localStorage.getItem(participantStorageKey) || "null");
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map(String).filter(Boolean);
    }
  } catch (error) {
    console.warn("참여 인원 확인 실패", error);
  }
  return defaultParticipants;
}

function saveParticipants(participants) {
  localStorage.setItem(participantStorageKey, JSON.stringify(participants));
}

function runPicker(event) {
  event.preventDefault();
  if (isPicking) return;

  const participants = getParticipants();
  const pickCount = Number(pickCountInput.value);

  if (participants.length < 2) {
    gameMessage.textContent = "참여 인원을 2명 이상 입력해 주세요.";
    return;
  }

  if (!Number.isInteger(pickCount) || pickCount < 1 || pickCount > participants.length) {
    gameMessage.textContent = `뽑을 인원 수는 1명부터 ${participants.length}명까지 가능합니다.`;
    return;
  }

  saveParticipants(participants);
  isPicking = true;
  startPickerButton.disabled = true;
  resetPickerButton.disabled = true;
  gameMessage.textContent = "이름을 섞는 중입니다.";
  renderWinners([]);
  animatePicker(participants);

  const winners = shuffleItems(participants).slice(0, pickCount);
  setTimeout(() => {
    stopPickerAnimation();
    isPicking = false;
    startPickerButton.disabled = false;
    resetPickerButton.disabled = false;
    renderWinners(winners);
    lastPickerResult = savePickerHistory(winners, participants.length);
    renderPickerHistory();
    updateShareButton();
    drawMachine.innerHTML = winners.map((name) => `<span>${escapeHtml(name)}</span>`).join("");
    gameMessage.textContent = `${winners.length}명이 선정되었습니다.`;
  }, 1800);
}

function animatePicker(participants) {
  stopPickerAnimation();
  pickerTimerId = setInterval(() => {
    const sample = shuffleItems(participants).slice(0, Math.min(3, participants.length));
    drawMachine.innerHTML = sample.map((name) => `<span>${escapeHtml(name)}</span>`).join("");
  }, 90);
}

function stopPickerAnimation() {
  clearInterval(pickerTimerId);
  pickerTimerId = null;
}

function shuffleItems(items) {
  return items
    .map((item) => ({ item, sort: crypto.getRandomValues(new Uint32Array(1))[0] }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ item }) => item);
}

function renderWinners(winners) {
  winnerCount.textContent = `${winners.length}명`;
  if (winners.length === 0) {
    winnerList.textContent = "아직 선정된 인원이 없습니다.";
    lastPickerResult = null;
    updateShareButton();
    return;
  }

  winnerList.innerHTML = winners
    .map((name, index) => `<span class="winner-chip">${index + 1}. ${escapeHtml(name)}</span>`)
    .join("");
}

function savePickerHistory(winners, totalCount, method = "뽑기") {
  const history = getPickerHistory();
  const now = new Date();
  const entry = {
    winners,
    totalCount,
    method,
    createdAt: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
  localStorage.setItem(pickerHistoryStorageKey, JSON.stringify([entry, ...history].slice(0, 5)));
  return entry;
}

function getPickerHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(pickerHistoryStorageKey) || "[]");
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.warn("뽑기 기록 확인 실패", error);
    return [];
  }
}

function renderPickerHistory() {
  const history = getPickerHistory();
  if (history.length === 0) {
    historyList.textContent = "최근 기록이 없습니다.";
    return;
  }

  historyList.innerHTML = history
    .map((entry) => {
      const winners = Array.isArray(entry.winners) ? entry.winners.join(", ") : "";
      return `
        <div class="history-item">
          <strong>${escapeHtml(winners)}</strong>
          <span>${escapeHtml(entry.createdAt)} · ${escapeHtml(entry.method || "뽑기")} · 전체 ${Number(entry.totalCount) || 0}명</span>
        </div>
      `;
    })
    .join("");
}

function resetPicker() {
  stopPickerAnimation();
  isPicking = false;
  startPickerButton.disabled = false;
  resetPickerButton.disabled = false;
  participantInput.value = defaultParticipants.join("\n");
  pickCountInput.value = "1";
  pickCountInput.max = String(defaultParticipants.length);
  ladderPickCountInput.value = "1";
  ladderPickCountInput.max = String(defaultParticipants.length);
  saveParticipants(defaultParticipants);
  renderWinners([]);
  drawMachine.innerHTML = "<span>READY</span>";
  renderLadderPlaceholder();
  gameMessage.textContent = "기본 참여 인원으로 초기화했습니다.";
}

function setPlayMode(mode) {
  const isLadder = mode === "ladder";
  pickerView.classList.toggle("is-hidden", isLadder);
  ladderView.classList.toggle("is-hidden", !isLadder);
  pickerModeButton.classList.toggle("is-active", !isLadder);
  ladderModeButton.classList.toggle("is-active", isLadder);
  if (isLadder) {
    renderLadderPreview();
  }
}

function renderLadderPlaceholder() {
  ladderBoard.innerHTML = '<div class="ladder-empty">사다리타기 탭에서 시작할 수 있습니다.</div>';
  updateLadderSummary();
  ladderMessage.textContent = "참여 인원과 뽑을 인원 수는 뽑기 탭의 입력값을 사용합니다.";
}

function renderLadderPreview() {
  const participants = getParticipants();
  updateLadderSummary();
  if (participants.length < 2) {
    ladderBoard.innerHTML = '<div class="ladder-empty">참여 인원을 2명 이상 입력해 주세요.</div>';
    return;
  }

  ladderBoard.innerHTML = buildLadderBoard(participants, []);
  ladderMessage.textContent = "사다리 시작을 누르면 결과가 배정됩니다.";
}

function runLadder() {
  if (isLadderRunning) return;

  const participants = getParticipants();
  const pickCount = Number(pickCountInput.value);
  updateLadderSummary();

  if (participants.length < 2) {
    ladderMessage.textContent = "참여 인원을 2명 이상 입력해 주세요.";
    return;
  }

  if (!Number.isInteger(pickCount) || pickCount < 1 || pickCount > participants.length) {
    ladderMessage.textContent = `뽑을 인원 수는 1명부터 ${participants.length}명까지 가능합니다.`;
    return;
  }

  saveParticipants(participants);
  isLadderRunning = true;
  startLadderButton.disabled = true;
  renderWinners([]);
  ladderMessage.textContent = "사다리를 타는 중입니다.";

  const winners = shuffleItems(participants).slice(0, pickCount);
  const ladderResults = participants.map((name) => ({
    name,
    selected: winners.includes(name),
  }));
  ladderBoard.innerHTML = buildLadderBoard(participants, ladderResults, true);

  setTimeout(() => {
    isLadderRunning = false;
    startLadderButton.disabled = false;
    renderWinners(winners);
    lastPickerResult = savePickerHistory(winners, participants.length, "사다리타기");
    renderPickerHistory();
    updateShareButton();
    ladderBoard.innerHTML = buildLadderBoard(participants, ladderResults, false);
    drawMachine.innerHTML = winners.map((name) => `<span>${escapeHtml(name)}</span>`).join("");
    ladderMessage.textContent = `${winners.length}명이 선정되었습니다.`;
  }, 1200);
}

function updateLadderSummary() {
  const participants = getParticipants();
  const pickCount = Number(pickCountInput.value) || 1;
  ladderParticipantCount.textContent = `${participants.length}명`;
  ladderPickCountInput.max = String(Math.max(1, participants.length));
  ladderPickCountInput.value = String(Math.min(Math.max(pickCount, 1), Math.max(participants.length, 1)));
  ladderPickCount.textContent = `${Math.min(Math.max(pickCount, 1), Math.max(participants.length, 1))}명`;
}

function buildLadderBoard(participants, results, isRunning = false) {
  const resultMap = new Map(results.map((result) => [result.name, result.selected]));
  const rungs = participants.map((_, index) => {
    if (index === participants.length - 1) return "";
    return `<span class="ladder-rung rung-${(index % 3) + 1}"></span>`;
  });

  return `
    <div class="ladder-grid${isRunning ? " is-running" : ""}" style="--ladder-count: ${participants.length}">
      ${isRunning ? '<div class="ladder-running-badge">진행 중</div>' : ""}
      ${participants
        .map((name, index) => {
          const hasResult = resultMap.has(name);
          const selected = resultMap.get(name);
          const resultText = hasResult ? (selected ? "당첨" : "통과") : "?";
          return `
            <div class="ladder-line ${selected ? "is-selected" : ""}">
              <strong>${escapeHtml(name)}</strong>
              <span class="ladder-path"></span>
              ${rungs[index] || ""}
              <em>${resultText}</em>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function initKakaoShare() {
  const key = appConfig.kakaoJavascriptKey || "";
  if (!key || !window.Kakao) return;

  try {
    if (!Kakao.isInitialized()) {
      Kakao.init(key);
    }
    kakaoReady = true;
  } catch (error) {
    console.warn("카카오 SDK 초기화 실패", error);
    kakaoReady = false;
  }
}

function updateShareButton() {
  shareResultButton.disabled = !lastPickerResult;
  shareResultButton.textContent = "카카오톡 공유";
  shareResultButton.title = kakaoReady ? "카카오톡으로 결과를 공유합니다." : "카카오 설정 전에는 결과가 복사됩니다.";
}

async function sharePickerResult() {
  if (!lastPickerResult) {
    gameMessage.textContent = "먼저 뽑기를 진행해 주세요.";
    return;
  }

  const message = buildShareMessage(lastPickerResult);
  if (kakaoReady && window.Kakao?.Share) {
    try {
      const shareUrl = buildShareUrl(lastPickerResult);
      Kakao.Share.sendDefault({
        objectType: "text",
        text: message,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
        buttonTitle: "결과 확인",
      });
      return;
    } catch (error) {
      console.warn("카카오톡 공유 실패", error);
    }
  }

  await copyShareMessage(message);
}

function buildShareMessage(result) {
  const winners = Array.isArray(result.winners) ? result.winners.join(", ") : "";
  return [
    "📦 포장 도우미 선정 완료",
    "",
    `✅ ${winners}`,
    "",
    `전체 참여: ${Number(result.totalCount) || 0}명`,
    `선정 시간: ${result.createdAt}`,
  ].join("\n");
}

function buildShareUrl(result) {
  const baseUrl = appConfig.kakaoShareUrl || location.href.split("?")[0];
  const url = new URL(baseUrl);
  url.searchParams.set("view", "play");
  url.searchParams.set("winners", (Array.isArray(result.winners) ? result.winners : []).join(","));
  url.searchParams.set("total", String(Number(result.totalCount) || 0));
  url.searchParams.set("time", result.createdAt || "");
  return url.toString();
}

function getSharedResultFromUrl() {
  const params = new URLSearchParams(location.search);
  if (params.get("view") !== "play" || !params.get("winners")) {
    return null;
  }

  return {
    winners: params
      .get("winners")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
    totalCount: Number(params.get("total") || 0),
    createdAt: params.get("time") || "",
  };
}

function renderSharedResult(result) {
  if (!result?.winners?.length) return;

  sharedWinners.textContent = result.winners.join(", ");
  sharedMeta.textContent = `전체 ${Number(result.totalCount) || 0}명 · ${result.createdAt}`;
  sharedResult.classList.remove("is-hidden");
  renderWinners(result.winners);
  drawMachine.innerHTML = result.winners.map((name) => `<span>${escapeHtml(name)}</span>`).join("");
  gameMessage.textContent = "공유된 결과를 표시하고 있습니다.";
}

async function copyShareMessage(message) {
  try {
    await navigator.clipboard.writeText(message);
    gameMessage.textContent = "카카오 설정 전이라 결과를 복사했습니다.";
  } catch (error) {
    console.warn("결과 복사 실패", error);
    gameMessage.textContent = "공유 준비에 실패했습니다. 카카오 키 설정을 확인해 주세요.";
  }
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
pickerModeButton.addEventListener("click", () => setPlayMode("picker"));
ladderModeButton.addEventListener("click", () => setPlayMode("ladder"));
pickerForm.addEventListener("submit", runPicker);
startLadderButton.addEventListener("click", runLadder);
resetPickerButton.addEventListener("click", resetPicker);
shareResultButton.addEventListener("click", sharePickerResult);
clearHistoryButton.addEventListener("click", () => {
  localStorage.removeItem(pickerHistoryStorageKey);
  renderPickerHistory();
});
participantInput.addEventListener("input", () => {
  const participants = getParticipants();
  pickCountInput.max = String(Math.max(1, participants.length));
  ladderPickCountInput.max = String(Math.max(1, participants.length));
  updateLadderSummary();
  renderLadderPreview();
});
pickCountInput.addEventListener("input", () => {
  ladderPickCountInput.value = pickCountInput.value;
  updateLadderSummary();
  renderLadderPreview();
});
ladderPickCountInput.addEventListener("input", () => {
  pickCountInput.value = ladderPickCountInput.value;
  updateLadderSummary();
  renderLadderPreview();
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
  stopPickerAnimation();
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
    init().then(showInitialView);
    return;
  }
  showInitialView();
}

function showInitialView() {
  if (pendingSharedResult) {
    showPlayPage();
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

initKakaoShare();
pendingSharedResult = getSharedResultFromUrl();
requirePasswordIfNeeded();
