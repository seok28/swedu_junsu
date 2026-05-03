      const accessPassword = "8206747";
      const authStorageKey = "seok-page-auth-until";
      const authMinutes = 60;
      const appConfig = window.manualAppConfig || {};
      const boardWidth = 720;
      const boardHeight = 420;
      const topY = 34;
      const bottomY = 364;
      const defaultNames = ["석준수", "김민지", "박현우", "이서연"];
      const defaultResults = ["당첨", "꽝", "커피 사기", "면제"];

      let participants = [...defaultNames];
      let results = [...defaultResults];
      let shuffledResults = [...defaultResults];
      let rungs = generateLadder(participants.length);
      let selectedIndex = null;
      let revealedAll = false;
      let animationKey = 0;

      const participantList = document.querySelector("#participantList");
      const resultList = document.querySelector("#resultList");
      const ladderBoard = document.querySelector("#ladderBoard");
      const buttonBar = document.querySelector("#buttonBar");
      const resultCards = document.querySelector("#resultCards");
      const message = document.querySelector("#message");
      const loginForm = document.querySelector("#loginForm");
      const passwordInput = document.querySelector("#passwordInput");
      const loginError = document.querySelector("#loginError");
      const homeView = document.querySelector("#homeView");
      const manualPage = document.querySelector("#manualPage");
      const ladderPage = document.querySelector("#ladderPage");
      const manualCategoryList = document.querySelector("#manualCategoryList");
      const manualSearch = document.querySelector("#manualSearch");
      const manualList = document.querySelector("#manualList");
      const manualDetail = document.querySelector("#manualDetail");
      const manualCount = document.querySelector("#manualCount");
      const manualData = window.manualSeedData || {
        categories: { all: "전체" },
        owners: ["AI/SW교육지원팀"],
        manuals: [],
      };
      let manuals = [...manualData.manuals];
      let selectedManualCategory = "all";
      let selectedManualId = manuals[0]?.id || null;
      let manualRemoteLoaded = false;
      let editingManualId = null;
      const manualStatus = document.querySelector("#manualStatus");
      const addManualButton = document.querySelector("#addManualButton");
      const manualDialog = document.querySelector("#manualDialog");
      const manualForm = document.querySelector("#manualForm");
      const manualDialogTitle = document.querySelector("#manualDialogTitle");
      const saveManualButton = document.querySelector("#saveManualButton");
      const closeManualDialogButton = document.querySelector("#closeManualDialogButton");

      function showView(view) {
        homeView.classList.toggle("is-hidden", view !== "home");
        manualPage.classList.toggle("is-hidden", view !== "manual");
        ladderPage.classList.toggle("is-hidden", view !== "ladder");
        if (view === "manual") {
          renderManual();
          loadRemoteManuals();
        }
      }

      function getAuthUntil() {
        return Number(localStorage.getItem(authStorageKey) || 0);
      }

      function unlockPage() {
        const expiresAt = Date.now() + authMinutes * 60 * 1000;
        localStorage.setItem(authStorageKey, String(expiresAt));
        document.body.classList.remove("is-locked");
        showView("home");
      }

      function lockPage() {
        localStorage.removeItem(authStorageKey);
        document.body.classList.add("is-locked");
        passwordInput.value = "";
        loginError.textContent = "";
        setTimeout(() => passwordInput.focus(), 0);
      }

      if (getAuthUntil() > Date.now()) {
        document.body.classList.remove("is-locked");
        showView("home");
      } else {
        lockPage();
      }

      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (passwordInput.value === accessPassword) {
          unlockPage();
          return;
        }
        loginError.textContent = "비밀번호가 맞지 않습니다.";
        passwordInput.select();
      });

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
                ${escapeHtml(label)}
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
                    <strong>${escapeHtml(manual.title)}</strong>
                    <span>${escapeHtml(getManualCategoryName(manual.category))} · ${escapeHtml(manual.owner)} · ${escapeHtml(manual.updatedAt)}</span>
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
              <p class="eyebrow">${escapeHtml(getManualCategoryName(manual.category))}</p>
              <h2>${escapeHtml(manual.title)}</h2>
              <p>${escapeHtml(manual.summary)}</p>
            </div>
            <div class="manual-actions">
              <button class="primary" type="button" data-manual-action="edit" data-manual-id="${manual.id}">수정</button>
              <button class="danger" type="button" data-manual-action="delete" data-manual-id="${manual.id}">삭제</button>
            </div>
          </div>
          <div class="meta-row">
            <span class="pill">담당: ${escapeHtml(manual.owner)}</span>
            <span class="pill">수정: ${escapeHtml(manual.updatedAt)}</span>
            <span class="pill">상태: ${escapeHtml(manual.status)}</span>
          </div>
          <ul class="step-list">
            ${(manual.steps || [])
              .map(
                (step, index) => `
                  <li>
                    <span class="step-number">${index + 1}</span>
                    <span>${escapeHtml(step)}</span>
                  </li>
                `,
              )
              .join("")}
          </ul>
          <div class="card">
            <span>참고 위치</span>
            <strong>${escapeHtml(manual.reference || "등록된 참고 위치가 없습니다.")}</strong>
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
          .map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`)
          .join("");
        ownerSelect.innerHTML = (manualData.owners || ["AI/SW교육지원팀"])
          .map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`)
          .join("");
      }

      function openManualForm(manual = null) {
        fillManualSelects();
        editingManualId = manual?.id || null;
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

      function getColumnX(index, count) {
        if (count <= 1) return boardWidth / 2;
        const sidePadding = 70;
        return sidePadding + (index * (boardWidth - sidePadding * 2)) / (count - 1);
      }

      function getRowY(row, rowCount) {
        return topY + ((row + 1) * (bottomY - topY)) / (rowCount + 1);
      }

      function shuffle(items) {
        return [...items]
          .map((item) => ({ item, sort: crypto.getRandomValues(new Uint32Array(1))[0] }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ item }) => item);
      }

      function normalizeResults(source, count) {
        const fallback = ["당첨", "꽝", "꽝", "면제", "커피 사기"];
        return Array.from({ length: count }, (_, index) => source[index] || fallback[index % fallback.length]);
      }

      function generateLadder(count) {
        const rowCount = Math.min(12, Math.max(7, count + 4));
        const nextRungs = [];
        for (let row = 0; row < rowCount; row += 1) {
          const usedCols = new Set();
          const attempts = Math.max(1, Math.floor(count / 2));
          for (let attempt = 0; attempt < attempts; attempt += 1) {
            const col = Math.floor(Math.random() * (count - 1));
            if (usedCols.has(col) || usedCols.has(col - 1) || usedCols.has(col + 1)) continue;
            usedCols.add(col);
            nextRungs.push({ row, col });
          }
        }
        return nextRungs;
      }

      function tracePath(startIndex) {
        const count = participants.length;
        const rowCount = Math.min(12, Math.max(7, count + 4));
        const sorted = [...rungs].sort((a, b) => a.row - b.row);
        let current = startIndex;
        const points = [{ x: getColumnX(current, count), y: topY }];

        sorted.forEach((rung) => {
          if (rung.col !== current && rung.col !== current - 1) return;
          const rungY = getRowY(rung.row, rowCount);
          points.push({ x: getColumnX(current, count), y: rungY });
          current += rung.col === current ? 1 : -1;
          points.push({ x: getColumnX(current, count), y: rungY });
        });

        points.push({ x: getColumnX(current, count), y: bottomY });
        return { participantIndex: startIndex, resultIndex: current, points };
      }

      function buildPath(points) {
        return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
      }

      function resetGame(text = "입력값이 변경되었습니다. 사다리를 다시 실행해 주세요.") {
        selectedIndex = null;
        revealedAll = false;
        message.textContent = text;
      }

      function isValid() {
        if (participants.length < 2) {
          message.textContent = "참가자는 최소 2명 이상이어야 합니다.";
          return false;
        }
        if (participants.some((name) => !name.trim()) || results.some((result) => !result.trim())) {
          message.textContent = "빈 이름이나 빈 결과가 있는지 확인해 주세요.";
          return false;
        }
        return true;
      }

      function renderInputs() {
        participantList.innerHTML = participants
          .map(
            (name, index) => `
              <label class="row">
                <span>${index + 1}</span>
                <input data-participant-index="${index}" value="${escapeHtml(name)}" />
                <button class="danger" type="button" data-remove-index="${index}">삭제</button>
              </label>
            `,
          )
          .join("");

        resultList.innerHTML = results
          .map(
            (result, index) => `
              <label class="row">
                <span>${index + 1}</span>
                <input data-result-index="${index}" value="${escapeHtml(result)}" />
              </label>
            `,
          )
          .join("");
      }

      function renderBoard() {
        const count = participants.length;
        const rowCount = Math.min(12, Math.max(7, count + 4));
        const traces = participants.map((_, index) => tracePath(index));
        const activeTrace = selectedIndex === null ? null : traces[selectedIndex];

        let html = "";
        participants.forEach((name, index) => {
          const x = getColumnX(index, count);
          const visibleResult =
            revealedAll || (activeTrace && activeTrace.resultIndex === index) ? shuffledResults[index] : "?";
          html += `
            <g>
              <text class="name-label" x="${x}" y="24" text-anchor="middle">${escapeHtml(name.trim() || `참가자 ${index + 1}`)}</text>
              <line class="vertical" x1="${x}" y1="${topY}" x2="${x}" y2="${bottomY}"></line>
              <text class="result-label" x="${x}" y="402" text-anchor="middle">${escapeHtml(visibleResult || "?")}</text>
            </g>
          `;
        });

        rungs.forEach((rung) => {
          html += `
            <line class="rung" x1="${getColumnX(rung.col, count)}" y1="${getRowY(rung.row, rowCount)}" x2="${getColumnX(rung.col + 1, count)}" y2="${getRowY(rung.row, rowCount)}"></line>
          `;
        });

        if (revealedAll) {
          traces.forEach((trace) => {
            html += `<path class="all-path" d="${buildPath(trace.points)}"></path>`;
          });
        }

        if (activeTrace) {
          animationKey += 1;
          html += `<path class="active-path" data-key="${animationKey}" d="${buildPath(activeTrace.points)}"></path>`;
        }

        ladderBoard.innerHTML = html;
      }

      function renderButtons() {
        buttonBar.innerHTML =
          participants
            .map(
              (name, index) => `
                <button class="purple" type="button" data-run-index="${index}">${escapeHtml(name.trim() || `참가자 ${index + 1}`)} 실행</button>
              `,
            )
            .join("") + '<button class="primary" type="button" id="showAllButton">전체 결과보기</button>';
      }

      function renderResults() {
        const traces = participants.map((_, index) => tracePath(index));
        const matches = traces.map((trace) => ({
          participant: participants[trace.participantIndex].trim(),
          result: shuffledResults[trace.resultIndex],
        }));
        const visible = revealedAll ? matches : selectedIndex === null ? [] : [matches[selectedIndex]];

        resultCards.innerHTML = visible.length
          ? visible.map((match) => `<article class="card"><span>${escapeHtml(match.participant)}</span><strong>${escapeHtml(match.result)}</strong></article>`).join("")
          : '<p class="empty">아직 표시된 결과가 없습니다.</p>';
      }

      function render() {
        results = normalizeResults(results, participants.length);
        shuffledResults = normalizeResults(shuffledResults, participants.length);
        renderInputs();
        renderBoard();
        renderButtons();
        renderResults();
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }

      document.querySelector("#addParticipantButton").addEventListener("click", () => {
        participants.push(`참가자 ${participants.length + 1}`);
        results = normalizeResults(results, participants.length);
        shuffledResults = [...results];
        rungs = generateLadder(participants.length);
        resetGame();
        render();
      });

      document.querySelector("#shuffleResultButton").addEventListener("click", () => {
        results = shuffle(results);
        shuffledResults = [...results];
        resetGame("결과 순서를 랜덤으로 섞었습니다.");
        render();
      });

      document.querySelector("#remakeButton").addEventListener("click", () => {
        rungs = generateLadder(participants.length);
        resetGame("새 사다리를 만들었습니다.");
        render();
      });

      document.querySelector("#resetButton").addEventListener("click", () => {
        participants = [...defaultNames];
        results = [...defaultResults];
        shuffledResults = [...defaultResults];
        rungs = generateLadder(participants.length);
        resetGame("처음 상태로 돌아왔습니다.");
        render();
      });

      document.querySelector("#logoutButton").addEventListener("click", lockPage);
      document.querySelector("#homeLogoutButton").addEventListener("click", lockPage);
      document.querySelector("#manualLogoutButton").addEventListener("click", lockPage);
      document.querySelector("#openManualButton").addEventListener("click", () => showView("manual"));
      document.querySelector("#openLadderButton").addEventListener("click", () => showView("ladder"));
      document.querySelector("#manualHomeButton").addEventListener("click", () => showView("home"));
      document.querySelector("#ladderHomeButton").addEventListener("click", () => showView("home"));
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
        if (button.dataset.manualAction === "edit") {
          openManualForm(manual);
        }
        if (button.dataset.manualAction === "delete") {
          removeManual(manual.id);
        }
      });

      document.addEventListener("input", (event) => {
        const participantIndex = event.target.dataset.participantIndex;
        const resultIndex = event.target.dataset.resultIndex;
        if (participantIndex !== undefined) participants[Number(participantIndex)] = event.target.value;
        if (resultIndex !== undefined) results[Number(resultIndex)] = event.target.value;
        shuffledResults = normalizeResults(results, participants.length);
        resetGame();
        renderBoard();
        renderButtons();
        renderResults();
      });

      document.addEventListener("click", (event) => {
        const removeIndex = event.target.dataset.removeIndex;
        const runIndex = event.target.dataset.runIndex;

        if (removeIndex !== undefined) {
          if (participants.length <= 2) {
            message.textContent = "참가자는 최소 2명 이상이어야 합니다.";
            return;
          }
          participants.splice(Number(removeIndex), 1);
          results = normalizeResults(results, participants.length);
          shuffledResults = [...results];
          rungs = generateLadder(participants.length);
          resetGame();
          render();
          return;
        }

        if (runIndex !== undefined) {
          if (!isValid()) return;
          selectedIndex = Number(runIndex);
          revealedAll = false;
          shuffledResults = normalizeResults(results, participants.length);
          message.textContent = `${participants[selectedIndex]}님의 경로를 표시합니다.`;
          renderBoard();
          renderResults();
          return;
        }

        if (event.target.id === "showAllButton") {
          if (!isValid()) return;
          selectedIndex = null;
          revealedAll = true;
          shuffledResults = normalizeResults(results, participants.length);
          message.textContent = "전체 결과를 표시했습니다.";
          renderBoard();
          renderResults();
        }
      });

      render();
