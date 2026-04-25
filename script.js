const STORAGE_THEME_KEY = 'manual-portal-theme';

const searchInput = document.getElementById('searchInput');
const manualItems = [...document.querySelectorAll('.manual-item')];
const deptFilters = [...document.querySelectorAll('#deptFilters .chip')];
const manualCount = document.getElementById('manualCount');
const themeToggle = document.getElementById('themeToggle');
const printBtn = document.getElementById('printBtn');
const alertBtn = document.getElementById('alertBtn');

let selectedDept = 'all';

function applySavedTheme() {
  const saved = localStorage.getItem(STORAGE_THEME_KEY);

  if (saved === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️ 라이트모드';
  }
}

function updateManualList() {
  const keyword = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  manualItems.forEach((item) => {
    const title = item.querySelector('h3').textContent.toLowerCase();
    const tags = item.dataset.keywords.toLowerCase();
    const dept = item.dataset.dept;

    const matchesKeyword = !keyword || title.includes(keyword) || tags.includes(keyword);
    const matchesDept = selectedDept === 'all' || selectedDept === dept;
    const shouldShow = matchesKeyword && matchesDept;

    item.classList.toggle('hidden', !shouldShow);

    if (shouldShow) {
      visibleCount += 1;
    }
  });

  manualCount.textContent = `표시 중: ${visibleCount}건`;
}

searchInput.addEventListener('input', updateManualList);

deptFilters.forEach((button) => {
  button.addEventListener('click', () => {
    deptFilters.forEach((chip) => chip.classList.remove('active'));
    button.classList.add('active');
    selectedDept = button.dataset.dept;
    updateManualList();
  });
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');

  localStorage.setItem(STORAGE_THEME_KEY, isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀️ 라이트모드' : '🌙 다크모드';
});

printBtn.addEventListener('click', () => {
  window.print();
});

alertBtn.addEventListener('click', () => {
  alert('알림 예시: 이번 주 매뉴얼 검토 대상 3건이 있습니다.');
});

applySavedTheme();
updateManualList();
