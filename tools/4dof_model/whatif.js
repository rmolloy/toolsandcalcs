(function(){
  const toggle = document.getElementById("whatif_toggle");
  const resetBtn = document.getElementById("btn_reset_whatif");
  if(!toggle || !resetBtn) return;

  function ensureEnabled(){
    if(!toggle.checked){
      toggle.checked = true;
      document.body.classList.add("whatif-mode");
      resetBtn.disabled = false;
    }
  }

  function resetWhatIf(){
    document.querySelectorAll(".dual-slider__overlay").forEach(slider=>{
      setOverlayValue(slider, slider.getAttribute("data-off-value"));
    });
    toggle.checked = false;
    document.body.classList.remove("whatif-mode");
    resetBtn.disabled = true;
    if(window.render) window.render();
  }

  resetBtn.addEventListener("click", resetWhatIf);
  toggle.addEventListener("change", ()=>{
    if(toggle.checked){
      document.body.classList.add("whatif-mode");
      resetBtn.disabled = false;
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
    if(Math.abs(slider.value - offValue) < 1e-6){
      slider.classList.remove("active");
      const info = document.getElementById(`${slider.dataset.baseId}_whatif_val`);
      if(info) info.textContent = "What-If: off";
    }
  }

  function updateModeStateFromSliders(){
    const active = Array.from(document.querySelectorAll(".dual-slider__overlay"))
      .some(slider => slider.classList.contains("active"));
    if(!active){
      toggle.checked = false;
      document.body.classList.remove("whatif-mode");
      resetBtn.disabled = true;
      if(window.render) window.render();
    }
  }

  const sliders = document.querySelectorAll(".controls-panel input[type=range]");
  sliders.forEach(slider=>{
    if(slider.id === "model_order") return;
    if(slider.dataset.whatifReady) return;
    slider.dataset.whatifReady = "1";
    const wrap = document.createElement("div");
    wrap.className = "dual-slider";
    slider.parentNode.insertBefore(wrap, slider);
    wrap.appendChild(slider);

    const overlay = slider.cloneNode(true);
    overlay.id = `${slider.id}_whatif`;
    overlay.classList.add("dual-slider__overlay");
    const offVal = overlay.min || slider.min || slider.value;
    overlay.value = offVal;
    overlay.setAttribute("data-off-value", offVal);
    overlay.dataset.baseId = slider.id;
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
      const info = document.getElementById(`${slider.id}_whatif_val`);
      if(info){
        info.textContent = `What-If: ${overlay.value}`;
      }
      if(window.render) window.render();
    });
    wrap.appendChild(overlay);

    const info = document.createElement("div");
    info.className = "whatif-val";
    info.id = `${slider.id}_whatif_val`;
    info.textContent = "What-If: off";
    wrap.insertAdjacentElement("afterend", info);
  });
})();
