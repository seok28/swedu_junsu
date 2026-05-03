(() => {
  const app = window.SeokApp;
  const appConfig = window.manualAppConfig || {};
  const manualData = window.manualSeedData || {
    categories: { all: "전체" },
    owners: ["AI/SW교육지원팀"],
    manuals: [],
  };

  let manuals = [...manualData.manuals];
  let selectedManualCategory = "all";
  let selectedManualId = manuals[0]?.id || null;
  let manualRemoteLoaded = false;

  const manualCategoryList = document.querySelector("#manualCategoryList");
  const manualSearch = document.querySelector("#manualSearch");
  const manualList = document.querySelector("#manualList");
  const manualDetail = document.querySelector("#manualDetail");
  const manualCount = document.querySelector("#manualCount");
  const manualStatus = document.querySelector("#manualStatus");
  const addManualButton = document.querySelector("#addManualButton");
  const manualDialog = document.querySelector("#manualDialog");
  const manualForm = document.querySelector("#manualForm");
  const manualDialogTitle = document.querySelector("#manualDialogTitle");
  const saveManualButton = document.querySelector("#saveManualButton");
  const closeManualDialogButton = document.querySelector("#closeManualDialogButton");

  function getManualCategoryName(category) {
    return manualData.categories[category] || category;
  }

  function getFilteredManuals() {
    const keyword = manualSearch.value.trim().toLowerCase();
    return manuals.filter((manual) => {
      const matchesCategory = selectedManualCategory === "all" || manual.category === selectedManualCategory;
      const searchable = [manual.title, manual.owner, manual.summary, manual.reference, ...(manual.steps || [])]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!keyword || searchable.includes(keyword));
    });
  }

  function renderManualCategories() {
    manualCategoryList.innerHTML = Object.entries(manualData.categories)
      .map(
        ([key, label]) => `
          <button class="category-button ${selectedManualCategory === key ? "is-active" : ""}" type="button" data-manual-category="${key}">
            ${app.escapeHtml(label)}
          </button>
        `,
      )
      .join("");
  }

  function renderManualList() {
    const filtered = getFilteredManuals();
    if (!filtered.some((manual) => manual.id === selectedManualId)) {
      selectedManualId = filtered[0]?.id || null;
    }

    manualCount.textContent = `${filtered.length}개 매뉴얼`;
    manualList.innerHTML = filtered.length
      ? filtered
          .map(
            (manual) => `
              <button class="manual-item ${selectedManualId === manual.id ? "is-active" : ""}" type="button" data-manual-id="${manual.id}">
                <strong>${app.escapeHtml(manual.title)}</strong>
                <span>${app.escapeHtml(getManualCategoryName(manual.category))} · ${app.escapeHtml(manual.owner)} · ${app.escapeHtml(manual.updatedAt)}</span>
              </button>
            `,
          )
          .join("")
      : '<p class="empty">조건에 맞는 매뉴얼이 없습니다.</p>';
  }

  function setManualStatus(text, type = "") {
    manualStatus.textContent = text;
    manualStatus.className = `manual-status ${type ? `is-${type}` : ""}`.trim();
  }

  function renderManualDetail() {
    const manual = manuals.find((item) => item.id === selectedManualId);
    if (!manual) {
      manualDetail.innerHTML = `
        <div class="empty">
          <strong>매뉴얼을 선택해 주세요.</strong>
          <p>왼쪽 목록에서 확인할 업무를 선택하면 상세 절차가 표시됩니다.</p>
        </div>
      `;
      return;
    }

    manualDetail.innerHTML = `
      <div class="manual-detail-head">
        <div class="manual-detail-title">
          <p class="eyebrow">${app.escapeHtml(getManualCategoryName(manual.category))}</p>
          <h2>${app.escapeHtml(manual.title)}</h2>
          <p>${app.escapeHtml(manual.summary)}</p>
        </div>
        <div class="manual-actions">
          <button class="primary" type="button" data-manual-action="edit" data-manual-id="${manual.id}">수정</button>
          <button class="danger" type="button" data-manual-action="delete" data-manual-id="${manual.id}">삭제</button>
        </div>
      </div>
      <div class="meta-row">
        <span class="pill">담당: ${app.escapeHtml(manual.owner)}</span>
        <span class="pill">수정: ${app.escapeHtml(manual.updatedAt)}</span>
        <span class="pill">상태: ${app.escapeHtml(manual.status)}</span>
      </div>
      <ul class="step-list">
        ${(manual.steps || [])
          .map(
            (step, index) => `
              <li>
                <span class="step-number">${index + 1}</span>
                <span>${app.escapeHtml(step)}</span>
              </li>
            `,
          )
          .join("")}
      </ul>
      <div class="card">
        <span>참고 위치</span>
        <strong>${app.escapeHtml(manual.reference || "등록된 참고 위치가 없습니다.")}</strong>
      </div>
    `;
  }

  function renderManual() {
    renderManualCategories();
    renderManualList();
    renderManualDetail();
  }

  function hasRemoteManualApi() {
    return Boolean(appConfig.googleAppsScriptUrl);
  }

  async function requestManualRemote(payload) {
    const response = await fetch(appConfig.googleAppsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        adminKey: appConfig.adminKey || "",
        ...payload,
      }),
    });
    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.error || "구글시트 요청에 실패했습니다.");
    }
    return result;
  }

  async function loadRemoteManuals(force = false) {
    if (!hasRemoteManualApi() || (manualRemoteLoaded && !force)) return;
    setManualStatus("구글시트 매뉴얼을 불러오는 중입니다.", "busy");
    try {
      const result = await requestManualRemote({ action: "list" });
      manuals = Array.isArray(result.manuals) ? result.manuals : [];
      selectedManualId = manuals[0]?.id || null;
      manualRemoteLoaded = true;
      setManualStatus("구글시트 연결됨", "ok");
      renderManual();
    } catch (error) {
      console.warn(error);
      setManualStatus("기본 데이터 표시 중", "warn");
    }
  }

  function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function fillManualSelects() {
    const categorySelect = manualForm.elements.category;
    const ownerSelect = manualForm.elements.owner;
    categorySelect.innerHTML = Object.entries(manualData.categories)
      .filter(([key]) => key !== "all")
      .map(([key, label]) => `<option value="${key}">${app.escapeHtml(label)}</option>`)
      .join("");
    ownerSelect.innerHTML = (manualData.owners || ["AI/SW교육지원팀"])
      .map((owner) => `<option value="${app.escapeHtml(owner)}">${app.escapeHtml(owner)}</option>`)
      .join("");
  }

  function openManualForm(manual = null) {
    fillManualSelects();
    manualDialogTitle.textContent = manual ? "매뉴얼 수정" : "새 매뉴얼";
    manualForm.elements.id.value = manual?.id || `manual-${Date.now()}`;
    manualForm.elements.title.value = manual?.title || "";
    manualForm.elements.category.value = manual?.category || "etc";
    manualForm.elements.owner.value = manual?.owner || "AI/SW교육지원팀";
    manualForm.elements.status.value = manual?.status || "정상";
    manualForm.elements.updatedAt.value = manual?.updatedAt || todayString();
    manualForm.elements.summary.value = manual?.summary || "";
    manualForm.elements.steps.value = Array.isArray(manual?.steps) ? manual.steps.join("\n") : "";
    manualForm.elements.reference.value = manual?.reference || "";
    manualDialog.showModal();
  }

  function buildManualFromForm() {
    return {
      id: manualForm.elements.id.value || `manual-${Date.now()}`,
      title: manualForm.elements.title.value.trim(),
      category: manualForm.elements.category.value,
      owner: manualForm.elements.owner.value,
      status: manualForm.elements.status.value.trim() || "정상",
      updatedAt: manualForm.elements.updatedAt.value || todayString(),
      summary: manualForm.elements.summary.value.trim(),
      steps: manualForm.elements.steps.value
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean),
      reference: manualForm.elements.reference.value.trim(),
    };
  }

  async function saveManual(manual) {
    setManualStatus("매뉴얼을 저장하는 중입니다.", "busy");
    saveManualButton.disabled = true;
    try {
      if (hasRemoteManualApi()) {
        const result = await requestManualRemote({ action: "upsert", manual });
        manuals = Array.isArray(result.manuals) ? result.manuals : manuals;
      } else {
        const index = manuals.findIndex((item) => item.id === manual.id);
        if (index === -1) manuals = [manual, ...manuals];
        else manuals[index] = manual;
      }
      selectedManualId = manual.id;
      manualDialog.close();
      setManualStatus(hasRemoteManualApi() ? "구글시트 저장 완료" : "임시 저장 완료", "ok");
      renderManual();
    } catch (error) {
      console.warn(error);
      setManualStatus(error.message || "저장에 실패했습니다.", "warn");
    } finally {
      saveManualButton.disabled = false;
    }
  }

  async function removeManual(id) {
    if (!confirm("선택한 매뉴얼을 삭제할까요? 구글시트에서도 삭제됩니다.")) return;
    setManualStatus("매뉴얼을 삭제하는 중입니다.", "busy");
    try {
      if (hasRemoteManualApi()) {
        const result = await requestManualRemote({ action: "delete", id });
        manuals = Array.isArray(result.manuals) ? result.manuals : manuals;
      } else {
        manuals = manuals.filter((manual) => manual.id !== id);
      }
      selectedManualId = manuals[0]?.id || null;
      setManualStatus(hasRemoteManualApi() ? "구글시트 삭제 완료" : "임시 데이터 삭제 완료", "ok");
      renderManual();
    } catch (error) {
      console.warn(error);
      setManualStatus(error.message || "삭제에 실패했습니다.", "warn");
    }
  }

  function initManual() {
    manualSearch.addEventListener("input", renderManual);
    manualCategoryList.addEventListener("click", (event) => {
      const category = event.target.dataset.manualCategory;
      if (!category) return;
      selectedManualCategory = category;
      renderManual();
    });
    manualList.addEventListener("click", (event) => {
      const item = event.target.closest("[data-manual-id]");
      if (!item) return;
      selectedManualId = item.dataset.manualId;
      renderManual();
    });
    addManualButton.addEventListener("click", () => openManualForm());
    closeManualDialogButton.addEventListener("click", () => manualDialog.close());
    manualForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const manual = buildManualFromForm();
      if (!manual.title || !manual.summary || !manual.steps.length) {
        setManualStatus("제목, 요약, 핵심 절차를 입력해 주세요.", "warn");
        return;
      }
      saveManual(manual);
    });
    manualDetail.addEventListener("click", (event) => {
      const button = event.target.closest("[data-manual-action]");
      if (!button) return;
      const manual = manuals.find((item) => item.id === button.dataset.manualId);
      if (!manual) return;
      if (button.dataset.manualAction === "edit") openManualForm(manual);
      if (button.dataset.manualAction === "delete") removeManual(manual.id);
    });
  }

  app.manual = {
    init: initManual,
    render: renderManual,
    loadRemote: loadRemoteManuals,
  };
})();
