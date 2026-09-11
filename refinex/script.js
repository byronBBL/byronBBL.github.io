/* RefineX project page. No build step, tracking, or external runtime dependencies. */
(() => {
  'use strict';
  const data = window.REFINEX_RESULTS;
  let currentScale = '750M';
  const settingSelect = document.querySelector('#corpus-setting');
  const chart = document.querySelector('#comparison-chart');
  const insight = document.querySelector('#chart-insight');
  const table = document.querySelector('#results-table');
  const number = value => value.toFixed(1);
  const methodLabel = row => row.method === 'Baseline' ? row.setting : `${row.setting} + ${row.method}`;

  function updateChart() {
    const setting = settingSelect.value;
    const rows = data.scales[currentScale].filter(row => row.setting === setting);
    chart.querySelectorAll('.bar-row').forEach((element, index) => {
      element.querySelector('.bar').style.width = `${rows[index].avg / 50 * 100}%`;
      element.querySelector('strong').textContent = number(rows[index].avg);
    });
    chart.setAttribute('aria-label', `${currentScale} model, ${setting} source corpus: baseline ${number(rows[0].avg)}%, Prox-C ${number(rows[1].avg)}%, RefineX ${number(rows[2].avg)}% average accuracy.`);
    const gain = number(rows[2].avg - rows[0].avg);
    insight.replaceChildren();
    const dot = document.createElement('span');
    dot.className = 'insight-dot';
    dot.setAttribute('aria-hidden', 'true');
    const strong = document.createElement('strong');
    strong.textContent = `+${gain} points`;
    insight.append(dot, strong, document.createTextNode(` over ${setting} without additional refinement, at the same training-token budget.`));
  }

  function updateTable() {
    const rows = data.scales[currentScale];
    table.caption.textContent = `${currentScale} model · 20B training tokens · accuracy (%)`;
    table.tHead.replaceChildren();
    const heading = document.createElement('tr');
    ['Data configuration', ...data.tasks.map(task => task.label), 'Avg'].forEach(label => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      heading.append(th);
    });
    table.tHead.append(heading);
    const body = table.tBodies[0];
    body.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (row.method === 'RefineX') tr.classList.add('ours');
      if (index > 0 && row.setting !== rows[index - 1].setting) tr.classList.add('group-start');
      const label = document.createElement('th');
      label.scope = 'row';
      label.textContent = methodLabel(row);
      tr.append(label);
      const group = rows.filter(item => item.setting === row.setting);
      [...data.tasks.map(task => task.key), 'avg'].forEach(key => {
        const value = key === 'avg' ? row.avg : row.scores[key];
        const best = Math.max(...group.map(item => key === 'avg' ? item.avg : item.scores[key]));
        const cell = document.createElement('td');
        if (value === best) {
          const bold = document.createElement('strong');
          bold.textContent = number(value);
          cell.append(bold);
        } else cell.textContent = number(value);
        tr.append(cell);
      });
      body.append(tr);
    });
  }

  if (data) {
    document.querySelectorAll('[data-scale]').forEach(button => {
      button.addEventListener('click', () => {
        currentScale = button.dataset.scale;
        document.querySelectorAll('[data-scale]').forEach(item => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        updateChart();
        updateTable();
      });
    });
    settingSelect.addEventListener('change', updateChart);
    updateChart();
    updateTable();
  }

  document.querySelector('#highlight-removals').addEventListener('change', event => {
    document.querySelector('#case-comparison').classList.toggle('show-removals', event.target.checked);
  });

  const copyButton = document.querySelector('#copy-citation');
  const copyStatus = document.querySelector('#copy-status');
  const originalCopyLabel = copyButton.innerHTML;
  let copyReset;
  copyButton.addEventListener('click', async () => {
    const citation = document.querySelector('#bibtex').textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(citation);
      else {
        const textarea = document.createElement('textarea');
        textarea.value = citation;
        textarea.setAttribute('readonly', '');
        textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        copyButton.focus();
        if (!copied) throw new Error('Copy is unavailable');
      }
      copyButton.textContent = 'Copied ✓';
      copyStatus.textContent = 'Citation copied to clipboard.';
    } catch {
      copyButton.textContent = 'Select citation';
      copyStatus.textContent = 'Clipboard unavailable. The citation is selected for manual copying.';
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#bibtex'));
      selection.removeAllRanges();
      selection.addRange(range);
    }
    clearTimeout(copyReset);
    copyReset = setTimeout(() => { copyButton.innerHTML = originalCopyLabel; }, 2600);
  });

  const dialog = document.querySelector('#figure-dialog');
  const dialogImage = document.querySelector('#dialog-image');
  const zoomButton = document.querySelector('#zoom-figure');
  let figureTrigger;
  if (typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-zoom]').forEach(link => {
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        figureTrigger = link;
        dialogImage.src = link.dataset.zoom;
        dialogImage.alt = link.querySelector('img').alt;
        dialog.classList.remove('actual-size');
        zoomButton.textContent = 'Zoom in';
        zoomButton.setAttribute('aria-pressed', 'false');
        document.querySelector('#figure-dialog-title').textContent = link.dataset.title;
        document.querySelector('#dialog-pdf').href = link.href;
        dialog.showModal();
        document.body.classList.add('dialog-open');
      });
    });
    document.querySelector('#close-figure').addEventListener('click', () => dialog.close());
    zoomButton.addEventListener('click', () => {
      const actualSize = dialog.classList.toggle('actual-size');
      zoomButton.textContent = actualSize ? 'Fit to view' : 'Zoom in';
      zoomButton.setAttribute('aria-pressed', String(actualSize));
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      if (figureTrigger) figureTrigger.focus({ preventScroll: true });
    });
  }

  if ('IntersectionObserver' in window) {
    const navLinks = [...document.querySelectorAll('.nav-links a')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          const current = link.hash === `#${entry.target.id}`;
          link.classList.toggle('current', current);
          if (current) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
    navLinks.forEach(link => observer.observe(document.querySelector(link.hash)));
  }
})();
