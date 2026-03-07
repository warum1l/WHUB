// =============================================
// WTweaker Download Handler
// =============================================

function startDownload() {
  const btn          = document.getElementById('downloadBtn');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressLabel= document.getElementById('progressLabel');

  // Disable button & show progress
  btn.disabled = true;
  btn.classList.add('btn--loading');
  progressWrap.classList.add('visible');

  // Animate progress bar (visual only — actual download triggers instantly)
  const stages = [
    { pct: 15,  label: 'Connecting...',        delay: 0   },
    { pct: 40,  label: 'Preparing file...',    delay: 400 },
    { pct: 75,  label: 'Downloading...',       delay: 900 },
    { pct: 95,  label: 'Almost done...',       delay: 1500 },
    { pct: 100, label: 'Done! Check your downloads.', delay: 2000 },
  ];

  stages.forEach(({ pct, label, delay }) => {
    setTimeout(() => {
      progressFill.style.width = pct + '%';
      progressLabel.textContent = label;

      if (pct === 100) {
        setTimeout(() => {
          btn.disabled = false;
          btn.classList.remove('btn--loading');
          btn.innerHTML = '<span class="btn-icon">✓</span><span class="btn-text">Downloaded!</span>';
          btn.classList.add('btn--done');

          // Reset after 4s
          setTimeout(() => {
            btn.innerHTML = '<span class="btn-icon">↓</span><span class="btn-text">Download WTweaker</span>';
            btn.classList.remove('btn--done');
            progressWrap.classList.remove('visible');
            progressFill.style.width = '0%';
          }, 4000);
        }, 500);
      }
    }, delay);
  });

  // Trigger actual download via hidden anchor — URL masked from user
  triggerDownload();
}

function triggerDownload() {
  const a = document.createElement('a');
  a.href = 'https://github.com/warum1l/WTweaker/releases/download/R1.0/WLST.zip';
  a.download = 'WTweaker.zip';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
