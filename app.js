const seedData = window.manualSeedData;
const categoryNames = seedData.categories;
const legacyCategoryMap = seedData.legacyCategoryMap;
const ownerOptions = seedData.owners;
const starterManuals = seedData.manuals;

const storageKey = "company-manuals";
const manualList = document.querySelector("#manualList");
const manualDetail = document.querySelector("#manualDetail");
const searchInput = document.querySelector("#searchInput");
const categoryList = document.querySelector("#categoryList");
const resultCount = document.querySelector("#resultCount");
const dialog = document.querySelector("#manualDialog");
const form = document.querySelector("#manualForm");
const openFormButton = document.querySelector("#openFormButton");
const dialogTitle = document.querySelector("#dialogTitle");
const saveButton = document.querySelector("#saveButton");

let manuals = loadManuals();
let selectedCategory = "all";
let selectedId = manuals[0]?.id;
let editingId = null;

function loadManuals() {
  const savedManuals = localStorage.getItem(storageKey);
  if (savedManuals !== null) {
    const parsedManuals = JSON.parse(savedManuals).map(normalizeManualCategory);
    localStorage.setItem(storageKey, JSON.stringify(parsedManuals));
    return parsedManuals;
  }

  localStorage.setItem(storageKey, JSON.stringify(starterManuals));
  return [...starterManuals];
}

function normalizeManualCategory(manual) {
  return {
    ...manual,
    category: legacyCategoryMap[manual.category] || manual.category,
    owner: ownerOptions.includes(manual.owner) ? manual.owner : "AI/SW교육지원팀",
  };
}

function saveManuals() {
  localStorage.setItem(storageKey, JSON.stringify(manuals));
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
  const warning = manual.status === "업데이트 필요" ? '<span class="tag warning">업데이트 필요</span>' : "";

  return `
    <button class="manual-item${activeClass}" type="button" data-id="${manual.id}">
      <strong>${escapeHtml(manual.title)}</strong>
      <span class="manual-meta">
        <span class="tag">${categoryNames[manual.category]}</span>
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

  manualDetail.innerHTML = `
    <div class="detail-toolbar">
      <div class="detail-kicker">
        <span class="tag">${categoryNames[manual.category]}</span>
        ${warning}
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
      <div class="reference">${escapeHtml(manual.reference || "등록된 참고 위치가 없습니다.")}</div>
    </div>
  `;
}

function openAddDialog() {
  editingId = null;
  dialogTitle.textContent = "새 매뉴얼 추가";
  saveButton.textContent = "저장";
  form.reset();
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

function deleteManual(id) {
  const manual = manuals.find((item) => item.id === id);
  if (!manual) return;

  const ok = confirm(`'${manual.title}' 매뉴얼을 삭제할까요?`);
  if (!ok) return;

  manuals = manuals.filter((item) => item.id !== id);
  saveManuals();
  selectedId = manuals[0]?.id;
  render();
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
  if (button.dataset.action === "edit" && manual) {
    openEditDialog(manual);
  }

  if (button.dataset.action === "delete") {
    deleteManual(button.dataset.id);
  }
});

searchInput.addEventListener("input", render);
openFormButton.addEventListener("click", openAddDialog);

form.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") {
    editingId = null;
    return;
  }

  event.preventDefault();

  if (editingId) {
    manuals = manuals.map((manual) => {
      if (manual.id !== editingId) return manual;
      return buildManualFromForm(editingId);
    });
    selectedId = editingId;
  } else {
    const manual = buildManualFromForm(`manual-${Date.now()}`);
    manuals = [manual, ...manuals];
    selectedId = manual.id;
  }

  saveManuals();
  editingId = null;
  selectedCategory = "all";
  document.querySelectorAll(".category").forEach((item) => item.classList.remove("is-active"));
  document.querySelector('[data-category="all"]').classList.add("is-active");
  dialog.close();
  render();
});

render();
