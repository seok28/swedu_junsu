import { useMemo, useState } from "react";

type Participant = {
  id: string;
  name: string;
};

type LadderRung = {
  row: number;
  col: number;
};

type Point = {
  x: number;
  y: number;
};

type TraceResult = {
  participantIndex: number;
  resultIndex: number;
  points: Point[];
};

const boardWidth = 720;
const boardHeight = 420;
const topY = 34;
const bottomY = 364;
const minParticipants = 2;
const defaultNames = ["석준수", "김민지", "박현우", "이서연"];
const defaultResults = ["당첨", "꽝", "커피 사기", "면제"];

function createParticipant(name: string): Participant {
  return {
    id: crypto.randomUUID(),
    name,
  };
}

function getColumnX(index: number, count: number) {
  if (count <= 1) return boardWidth / 2;
  const sidePadding = 70;
  return sidePadding + (index * (boardWidth - sidePadding * 2)) / (count - 1);
}

function getRowY(row: number, rowCount: number) {
  return topY + ((row + 1) * (bottomY - topY)) / (rowCount + 1);
}

function shuffle<T>(items: T[]) {
  return [...items]
    .map((item) => ({ item, sort: crypto.getRandomValues(new Uint32Array(1))[0] }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function generateLadder(count: number): LadderRung[] {
  const rowCount = Math.min(12, Math.max(7, count + 4));
  const rungs: LadderRung[] = [];

  // 같은 높이에 붙어 있는 가로줄이 생기면 경로가 모호해지므로 인접 컬럼은 피한다.
  for (let row = 0; row < rowCount; row += 1) {
    const usedCols = new Set<number>();
    const attempts = Math.max(1, Math.floor(count / 2));

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const col = Math.floor(Math.random() * (count - 1));
      if (usedCols.has(col) || usedCols.has(col - 1) || usedCols.has(col + 1)) continue;
      usedCols.add(col);
      rungs.push({ row, col });
    }
  }

  return rungs;
}

function tracePath(startIndex: number, count: number, rungs: LadderRung[]): TraceResult {
  const rowCount = Math.min(12, Math.max(7, count + 4));
  const sorted = [...rungs].sort((a, b) => a.row - b.row);
  let current = startIndex;
  let y = topY;
  const points: Point[] = [{ x: getColumnX(current, count), y }];

  // 위에서 아래로 내려오며 현재 줄과 연결된 가로줄이 있으면 좌우로 이동한다.
  sorted.forEach((rung) => {
    if (rung.col !== current && rung.col !== current - 1) return;

    const rungY = getRowY(rung.row, rowCount);
    points.push({ x: getColumnX(current, count), y: rungY });

    if (rung.col === current) {
      current += 1;
    } else {
      current -= 1;
    }

    points.push({ x: getColumnX(current, count), y: rungY });
    y = rungY;
  });

  points.push({ x: getColumnX(current, count), y: bottomY });
  return {
    participantIndex: startIndex,
    resultIndex: current,
    points,
  };
}

function buildPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function normalizeResults(results: string[], count: number) {
  const fallback = ["당첨", "꽝", "꽝", "면제", "커피 사기"];
  return Array.from({ length: count }, (_, index) => results[index] ?? fallback[index % fallback.length]);
}

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>(defaultNames.map(createParticipant));
  const [results, setResults] = useState<string[]>(defaultResults);
  const [rungs, setRungs] = useState<LadderRung[]>(() => generateLadder(defaultNames.length));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [revealedAll, setRevealedAll] = useState(false);
  const [shuffledResultOrder, setShuffledResultOrder] = useState<string[]>(defaultResults);
  const [message, setMessage] = useState("참가자와 결과를 입력한 뒤 사다리를 실행해 주세요.");

  const count = participants.length;
  const rowCount = Math.min(12, Math.max(7, count + 4));
  const cleanNames = participants.map((participant) => participant.name.trim());
  const cleanResults = normalizeResults(results.map((result) => result.trim()), count);

  const traces = useMemo(
    () => participants.map((_, index) => tracePath(index, count, rungs)),
    [participants, count, rungs],
  );

  const hasEmptyName = cleanNames.some((name) => !name);
  const hasEmptyResult = cleanResults.some((result) => !result);
  const canRun = count >= minParticipants && cleanResults.length === count && !hasEmptyName && !hasEmptyResult;

  const finalMatches = traces.map((trace) => ({
    participant: cleanNames[trace.participantIndex],
    result: shuffledResultOrder[trace.resultIndex] ?? cleanResults[trace.resultIndex],
  }));

  function updateParticipantName(id: string, name: string) {
    setParticipants((current) =>
      current.map((participant) => (participant.id === id ? { ...participant, name } : participant)),
    );
    resetGameOnly();
  }

  function addParticipant() {
    const nextCount = participants.length + 1;
    setParticipants((current) => [...current, createParticipant(`참가자 ${nextCount}`)]);
    setResults((current) => normalizeResults(current, nextCount));
    setRungs(generateLadder(nextCount));
    resetGameOnly();
  }

  function removeParticipant(id: string) {
    if (participants.length <= minParticipants) {
      setMessage("참가자는 최소 2명 이상이어야 합니다.");
      return;
    }

    const next = participants.filter((participant) => participant.id !== id);
    setParticipants(next);
    setResults((current) => normalizeResults(current, next.length));
    setRungs(generateLadder(next.length));
    resetGameOnly();
  }

  function updateResult(index: number, value: string) {
    setResults((current) => current.map((result, resultIndex) => (resultIndex === index ? value : result)));
    resetGameOnly();
  }

  function shuffleResults() {
    const shuffled = shuffle(cleanResults);
    setResults(shuffled);
    setShuffledResultOrder(shuffled);
    resetGameOnly("결과 순서를 랜덤으로 섞었습니다.");
  }

  function remakeLadder() {
    setRungs(generateLadder(count));
    resetGameOnly("새 사다리를 만들었습니다.");
  }

  function startOne(index: number) {
    if (!canRun) {
      setMessage("빈 이름이나 빈 결과가 있는지 확인해 주세요.");
      return;
    }

    setSelectedIndex(index);
    setAnimationKey((current) => current + 1);
    setRevealedAll(false);
    setShuffledResultOrder(normalizeResults(results.map((result) => result.trim()), count));
    setMessage(`${cleanNames[index]}님의 경로를 표시합니다.`);
  }

  function showAllResults() {
    if (!canRun) {
      setMessage("참가자 이름과 결과 항목을 모두 입력해 주세요.");
      return;
    }

    setSelectedIndex(null);
    setRevealedAll(true);
    setShuffledResultOrder(normalizeResults(results.map((result) => result.trim()), count));
    setMessage("전체 결과를 표시했습니다.");
  }

  function resetAll() {
    setParticipants(defaultNames.map(createParticipant));
    setResults(defaultResults);
    setShuffledResultOrder(defaultResults);
    setRungs(generateLadder(defaultNames.length));
    setSelectedIndex(null);
    setRevealedAll(false);
    setMessage("처음 상태로 돌아왔습니다.");
  }

  function resetGameOnly(nextMessage = "입력값이 변경되었습니다. 사다리를 다시 실행해 주세요.") {
    setSelectedIndex(null);
    setRevealedAll(false);
    setMessage(nextMessage);
  }

  const activeTrace = selectedIndex === null ? null : traces[selectedIndex];

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Ladder Game</p>
          <h1>사다리 타기 게임</h1>
          <p>참가자와 결과를 입력하고, 한 명씩 경로를 보거나 전체 결과를 바로 확인하세요.</p>
        </div>
        <button className="ghost-button" type="button" onClick={resetAll}>
          다시하기
        </button>
      </section>

      <section className="workspace">
        <div className="input-panel">
          <div className="section-title">
            <h2>참가자</h2>
            <button type="button" onClick={addParticipant}>
              추가
            </button>
          </div>
          <div className="stack">
            {participants.map((participant, index) => (
              <label className="field-row" key={participant.id}>
                <span>{index + 1}</span>
                <input value={participant.name} onChange={(event) => updateParticipantName(participant.id, event.target.value)} />
                <button type="button" onClick={() => removeParticipant(participant.id)}>
                  삭제
                </button>
              </label>
            ))}
          </div>
        </div>

        <div className="input-panel">
          <div className="section-title">
            <h2>결과 항목</h2>
            <button type="button" onClick={shuffleResults}>
              랜덤 섞기
            </button>
          </div>
          <div className="stack">
            {cleanResults.map((result, index) => (
              <label className="field-row" key={`result-${index}`}>
                <span>{index + 1}</span>
                <input value={result} onChange={(event) => updateResult(index, event.target.value)} />
              </label>
            ))}
          </div>
        </div>

        <section className="ladder-panel">
          <div className="section-title">
            <div>
              <h2>사다리</h2>
              <p>{message}</p>
            </div>
            <button type="button" onClick={remakeLadder}>
              사다리 다시 만들기
            </button>
          </div>

          <div className="ladder-scroll">
            <svg className="ladder-svg" viewBox={`0 0 ${boardWidth} ${boardHeight}`} role="img" aria-label="사다리 게임판">
              {participants.map((participant, index) => (
                <g key={participant.id}>
                  <text className="name-label" x={getColumnX(index, count)} y="24" textAnchor="middle">
                    {cleanNames[index] || `참가자 ${index + 1}`}
                  </text>
                  <line className="vertical-line" x1={getColumnX(index, count)} y1={topY} x2={getColumnX(index, count)} y2={bottomY} />
                  <text className="result-label" x={getColumnX(index, count)} y="402" textAnchor="middle">
                    {revealedAll || traces.some((trace) => selectedIndex === trace.participantIndex && trace.resultIndex === index)
                      ? shuffledResultOrder[index]
                      : "?"}
                  </text>
                </g>
              ))}

              {rungs.map((rung) => (
                <line
                  className="rung-line"
                  key={`${rung.row}-${rung.col}`}
                  x1={getColumnX(rung.col, count)}
                  y1={getRowY(rung.row, rowCount)}
                  x2={getColumnX(rung.col + 1, count)}
                  y2={getRowY(rung.row, rowCount)}
                />
              ))}

              {revealedAll &&
                traces.map((trace) => (
                  <path className="all-path" key={`path-${trace.participantIndex}`} d={buildPath(trace.points)} />
                ))}

              {activeTrace && <path className="active-path" key={animationKey} d={buildPath(activeTrace.points)} />}
            </svg>
          </div>

          <div className="button-bar">
            {participants.map((participant, index) => (
              <button className="player-button" type="button" key={participant.id} onClick={() => startOne(index)}>
                {cleanNames[index] || `참가자 ${index + 1}`} 실행
              </button>
            ))}
            <button className="primary-button" type="button" onClick={showAllResults}>
              전체 결과보기
            </button>
          </div>
        </section>
      </section>

      <section className="result-panel">
        <div className="section-title">
          <h2>최종 결과</h2>
          <p>사다리 규칙에 따라 도착한 결과가 표시됩니다.</p>
        </div>
        <div className="result-grid">
          {(revealedAll ? finalMatches : activeTrace ? [finalMatches[activeTrace.participantIndex]] : []).map((match) => (
            <article className="result-card" key={`${match.participant}-${match.result}`}>
              <span>{match.participant}</span>
              <strong>{match.result}</strong>
            </article>
          ))}
          {!revealedAll && !activeTrace && <p className="empty-result">아직 표시된 결과가 없습니다.</p>}
        </div>
      </section>
    </main>
  );
}
