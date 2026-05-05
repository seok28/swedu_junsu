(() => {
  const app = window.SeokApp;
  const baseBoardWidth = 720;
  const columnWidth = 124;
  const boardHeight = 456;
  const labelWidth = 106;
  const topY = 82;
  const bottomY = 352;
  const defaultNames = ["석준수", "김민지", "박현우", "이서연"];
  const defaultResults = ["당첨", "꽝", "커피 사기", "면제"];

  let participants = [...defaultNames];
  let results = [...defaultResults];
  let shuffledResults = [...defaultResults];
  let rungs = generateLadder(participants.length);
  let selectedIndex = null;
  let revealedAll = false;
  let resultReady = false;
  let pathComplete = false;
  let animationDuration = 2.2;
  let resultTimer = null;
  let animationKey = 0;

  const participantList = document.querySelector("#participantList");
  const resultList = document.querySelector("#resultList");
  const ladderBoard = document.querySelector("#ladderBoard");
  const buttonBar = document.querySelector("#buttonBar");
  const resultCards = document.querySelector("#resultCards");
  const message = document.querySelector("#message");
  const speedRange = document.querySelector("#speedRange");
  const speedLabel = document.querySelector("#speedLabel");

  function getBoardWidth(count) {
    return Math.max(baseBoardWidth, count * columnWidth);
  }

  function getColumnX(index, count) {
    const boardWidth = getBoardWidth(count);
    if (count <= 1) return boardWidth / 2;
    const sidePadding = Math.min(86, Math.max(54, boardWidth * 0.08));
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

  function renderChip(content, className, x, y, width = labelWidth, height = 48, dataset = "") {
    return `
      <foreignObject x="${x - width / 2}" y="${y}" width="${width}" height="${height}">
        <button class="${className}" type="button" ${dataset} title="${app.escapeHtml(content)}">
          ${app.escapeHtml(content)}
        </button>
      </foreignObject>
    `;
  }

  function resetGame(text = "입력값이 변경되었습니다. 사다리를 다시 실행해 주세요.") {
    clearTimeout(resultTimer);
    selectedIndex = null;
    revealedAll = false;
    resultReady = false;
    pathComplete = false;
    message.textContent = text;
  }

  function getSelectedMatch() {
    if (selectedIndex === null) return null;
    const trace = tracePath(selectedIndex);
    return {
      participant: participants[trace.participantIndex].trim() || `참가자 ${trace.participantIndex + 1}`,
      result: shuffledResults[trace.resultIndex],
      resultIndex: trace.resultIndex,
    };
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
            <input data-participant-index="${index}" value="${app.escapeHtml(name)}" />
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
            <input data-result-index="${index}" value="${app.escapeHtml(result)}" />
          </label>
        `,
      )
      .join("");
  }

  function renderBoard() {
    const count = participants.length;
    const boardWidth = getBoardWidth(count);
    const rowCount = Math.min(12, Math.max(7, count + 4));
    const traces = participants.map((_, index) => tracePath(index));
    const activeTrace = selectedIndex === null ? null : traces[selectedIndex];
    ladderBoard.setAttribute("viewBox", `0 0 ${boardWidth} ${boardHeight}`);
    ladderBoard.style.minWidth = `${boardWidth}px`;

    let html = "";
    participants.forEach((name, index) => {
      const x = getColumnX(index, count);
      const participantName = name.trim() || `참가자 ${index + 1}`;
      const visibleResult =
        revealedAll || (resultReady && activeTrace && activeTrace.resultIndex === index) ? shuffledResults[index] : "?";
      html += `
        <g>
          ${renderChip(participantName, "ladder-chip ladder-name-chip", x, 12, labelWidth, 48, `data-run-index="${index}"`)}
          <line class="vertical" x1="${x}" y1="${topY}" x2="${x}" y2="${bottomY}"></line>
          ${renderChip(visibleResult || "?", "ladder-chip ladder-result-chip", x, 384, labelWidth, 50)}
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
      html += `<path class="active-path ${pathComplete ? "is-complete" : ""}" data-key="${animationKey}" style="--path-duration: ${animationDuration}s" d="${buildPath(activeTrace.points)}"></path>`;
    }

    ladderBoard.innerHTML = html;
  }

  function renderButtons() {
    buttonBar.innerHTML =
      participants
        .map(
          (name, index) => `
            <button class="purple" type="button" data-run-index="${index}">${app.escapeHtml(name.trim() || `참가자 ${index + 1}`)} 실행</button>
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
    const visible = revealedAll ? matches : selectedIndex === null || !resultReady ? [] : [matches[selectedIndex]];

    resultCards.innerHTML = visible.length
      ? visible.map((match) => `<article class="card"><span>${app.escapeHtml(match.participant)}</span><strong>${app.escapeHtml(match.result)}</strong></article>`).join("")
      : `<p class="empty">${selectedIndex === null ? "아직 표시된 결과가 없습니다." : "사다리를 타는 중입니다. 도착하면 결과가 표시됩니다."}</p>`;
  }

  function revealSelectedResult() {
    const match = getSelectedMatch();
    if (!match) return;
    resultReady = true;
    pathComplete = true;
    message.textContent = `${match.participant}님은 "${match.result}"에 도착했습니다.`;
    renderBoard();
    renderResults();
  }

  function render() {
    results = normalizeResults(results, participants.length);
    shuffledResults = normalizeResults(shuffledResults, participants.length);
    renderInputs();
    renderBoard();
    renderButtons();
    renderResults();
  }

  function initLadder() {
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

    speedRange.addEventListener("input", (event) => {
      animationDuration = Number(event.target.value);
      speedLabel.textContent = `${animationDuration.toFixed(1)}초`;
    });

    document.addEventListener("input", (event) => {
      const participantIndex = event.target.dataset.participantIndex;
      const resultIndex = event.target.dataset.resultIndex;
      if (participantIndex === undefined && resultIndex === undefined) return;
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
        clearTimeout(resultTimer);
        selectedIndex = Number(runIndex);
        revealedAll = false;
        resultReady = false;
        pathComplete = false;
        shuffledResults = normalizeResults(results, participants.length);
        message.textContent = `${participants[selectedIndex]}님의 경로를 따라가는 중입니다.`;
        renderBoard();
        renderResults();
        resultTimer = setTimeout(revealSelectedResult, animationDuration * 1000 + 120);
        return;
      }

      if (event.target.id === "showAllButton") {
        if (!isValid()) return;
        clearTimeout(resultTimer);
        selectedIndex = null;
        revealedAll = true;
        resultReady = true;
        pathComplete = true;
        shuffledResults = normalizeResults(results, participants.length);
        message.textContent = "전체 결과를 표시했습니다.";
        renderBoard();
        renderResults();
      }
    });

    render();
  }

  app.ladder = {
    init: initLadder,
  };
})();
