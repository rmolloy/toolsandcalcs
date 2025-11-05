(function(){
  const toggle = document.getElementById("whatif_toggle");
  const resetBtn = document.getElementById("btn_reset_whatif");
  if(!toggle || !resetBtn) return;

  const EPS = 1e-6;

  function ensureEnabled(){
    if(toggle.checked) return;
    toggle.checked = true;
    document.body.classList.add("whatif-mode");
    resetBtn.disabled = false;
    refreshSliders();
  }

  function resetWhatIf(){
    document.querySelectorAll(".dual-slider__overlay").forEach(slider=>{
      setOverlayValue(slider, slider.getAttribute("data-off-value"));
    });
    toggle.checked = false;
    document.body.classList.remove("whatif-mode");
    resetBtn.disabled = true;
    refreshSliders();
    if(window.render) window.render();
  }

  resetBtn.addEventListener("click", resetWhatIf);
  toggle.addEventListener("change", ()=>{
    if(toggle.checked){
      document.body.classList.add("whatif-mode");
      resetBtn.disabled = false;
      refreshSliders();
    } else {
      resetWhatIf();
    }
    if(window.render) window.render();
  });
  if(toggle.checked){
    document.body.classList.add("whatif-mode");
    resetBtn.disabled = false;
  }

  function setOverlayValue(slider, value){
    const offValue = parseFloat(slider.getAttribute("data-off-value"));
    const val = value == null ? offValue : parseFloat(value);
    slider.value = Number.isFinite(val) ? val : offValue;
    const baseId = slider.dataset.baseId;
    if(Math.abs(slider.value - offValue) < EPS){
      slider.classList.remove("active");
      const info = document.getElementById(`${baseId}_whatif_val`);
      if(info) info.textContent = "What-If: off";
      updateSliderVisual(baseId);
      return;
    }
    slider.classList.add("active");
    updateSliderVisual(baseId);
  }

  function updateModeStateFromSliders(){
    const active = Array.from(document.querySelectorAll(".dual-slider__overlay"))
      .some(slider => slider.classList.contains("active"));
    if(!active){
      toggle.checked = false;
      document.body.classList.remove("whatif-mode");
      resetBtn.disabled = true;
      refreshSliders();
      if(window.render) window.render();
    }
  }

  function refreshSliders(){
    document.querySelectorAll(".dual-slider__base").forEach(base=>{
      updateSliderVisual(base.id);
    });
  }

  function updateSliderVisual(baseId){
    const base = document.getElementById(baseId);
    const overlay = document.getElementById(`${baseId}_whatif`);
    const deltaBar = document.getElementById(`${baseId}_whatif_delta`);
    const label = document.getElementById(`${baseId}_whatif_val`);
    if(!base || !overlay || !deltaBar || !label) return;

    const min = parseFloat(base.min ?? overlay.min ?? 0);
    const max = parseFloat(base.max ?? overlay.max ?? 1);
    const baseVal = parseFloat(base.value);
    const offValue = parseFloat(overlay.getAttribute("data-off-value"));
    const whatVal = overlay.classList.contains("active") ? parseFloat(overlay.value) : offValue;
    const inWhatIfMode = toggle.checked && document.body.classList.contains("whatif-mode");
    const isActive = inWhatIfMode && overlay.classList.contains("active") && Math.abs(whatVal - offValue) > EPS;

    if(!isActive){
      overlay.classList.remove("active-thumb");
      const neutral = "#3a4052";
      const gradient = `linear-gradient(to right, ${neutral} 0%, ${neutral} 100%)`;
      base.style.background = gradient;
      overlay.style.background = gradient;
      deltaBar.style.display = "none";
      label.textContent = "What-If: off";
      return;
    }

    overlay.classList.add("active-thumb");
    const color = whatVal >= baseVal ? "var(--orange)" : "var(--green)";
    const basePct = ((baseVal - min)/(max - min))*100;
    const whatPct = ((whatVal - min)/(max - min))*100;
    const start = Math.min(basePct, whatPct);
    const end = Math.max(basePct, whatPct);
    const neutral = "#3a4052";
    const gradient = `linear-gradient(to right, ${neutral} 0%, ${neutral} ${start}%, ${color} ${start}%, ${color} ${end}%, ${neutral} ${end}%, ${neutral} 100%)`;
    base.style.background = overlay.style.background = gradient;

    deltaBar.style.display = "block";
    deltaBar.style.left = `${start}%`;
    deltaBar.style.width = `${Math.max(end - start, 0.001)}%`;
    deltaBar.style.background = color;

    const delta = whatVal - baseVal;
    const formatted = typeof formatSliderValue === "function"
      ? formatSliderValue(baseId, whatVal)
      : whatVal.toFixed(4);
    const step = parseFloat(base.step) || 0.01;
    let precision = 3;
    if(step < 0.00001) precision = 6;
    else if(step < 0.0001) precision = 5;
    else if(step < 0.001) precision = 4;
    else if(step < 0.01) precision = 3;
    else precision = 2;
    const deltaText = `${delta >= 0 ? "+" : ""}${delta.toFixed(precision)}`;
    label.innerHTML = `What-If: ${formatted} <span class="delta">Δ ${deltaText}</span>`;
  }

  const sliders = document.querySelectorAll(".controls-panel input[type=range]");
  sliders.forEach(slider=>{
    if(slider.id === "model_order") return;
    if(slider.dataset.whatifReady) return;
    slider.dataset.whatifReady = "1";
    const wrap = document.createElement("div");
    wrap.className = "dual-slider";
    slider.parentNode.insertBefore(wrap, slider);
    const base = slider;
    base.classList.add("dual-slider__base");
    wrap.appendChild(base);

    const deltaBar = document.createElement("div");
    deltaBar.className = "dual-slider__delta";
    deltaBar.id = `${base.id}_whatif_delta`;
    wrap.appendChild(deltaBar);

    const overlay = slider.cloneNode(true);
    overlay.id = `${base.id}_whatif`;
    overlay.classList.add("dual-slider__overlay");
    const offVal = overlay.min || base.min || base.value;
    overlay.value = offVal;
    overlay.setAttribute("data-off-value", offVal);
    overlay.dataset.baseId = base.id;
    overlay.addEventListener("pointerdown", ()=>ensureEnabled());
    overlay.addEventListener("input", ()=>{
      ensureEnabled();
      const offValue = parseFloat(overlay.getAttribute("data-off-value"));
      const current = parseFloat(overlay.value);
      const epsilon = Math.max(0.000001, (parseFloat(overlay.step) || 0.0001) * 0.5);
      if(Math.abs(current - offValue) <= epsilon){
        setOverlayValue(overlay, offValue);
        updateModeStateFromSliders();
        if(window.render) window.render();
        return;
      }
      overlay.classList.add("active");
      updateSliderVisual(base.id);
      if(window.render) window.render();
    });
    wrap.appendChild(overlay);

    const info = document.createElement("div");
    info.className = "whatif-val";
    info.id = `${base.id}_whatif_val`;
    info.textContent = "What-If: off";
    wrap.insertAdjacentElement("afterend", info);
    base.addEventListener("input", ()=>updateSliderVisual(base.id));
  });

  refreshSliders();
})();
