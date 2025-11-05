# 4DOF Acoustic Guitar Model & Delta-Recipe Solver
**© 2025 Rick Molloy**

This repository implements a calibrated **four-degree-of-freedom (4-DOF)** acoustic-guitar model based on **Gore-style modal coupling**.  
It visualizes the interaction of **Air, Top, Back, and Rim modes**, showing coupled responses, parameter sensitivity, and live frequency-response behavior.

---

### 🎸 Current Version
The **What-If Simulator** (shown below) allows direct manipulation of mass, stiffness, damping, and air parameters with real-time frequency-response updates.  
It serves as the **forward-model foundation** for the upcoming **Delta-Recipe Solver**, which will:

1. Fit the 4-DOF model to measured guitar data (FFT or tap-test).  
2. Compute **2–3 practical “delta recipes”** — clear, plain-language recommendations to reach user-defined modal-frequency targets.  
3. Explain each proposed change’s rationale, expected frequency shifts, and trade-offs.

> **Public disclosure date:** 2025-11-05  
> **License:** MIT — attribution required (“© Rick Molloy”).

---

### 🖼 Screenshot  
*(Example UI — baseline vs. What-If delta)*  
![Current Implementation](docs/images/4dof-solver-ui.png)

---

### 🧭 Roadmap
- [x] Forward 4-DOF solver + What-If visualization  
- [ ] Inverse solver: fit existing guitars & compute delta recipes  
- [ ] Plain-language recipe generator & sensitivity cards  
- [ ] Documentation + white paper (v1)

---

### 📜 Attribution & Citation
If you build on or publish results from this repository, please cite:

> Molloy, R. (2025). *4-DOF Delta-Recipe Solver for Acoustic Guitars.*  
> GitHub repository: [https://github.com/your-repo-path](https://github.com/your-repo-path)

---

### 🙏 Acknowledgements
This work builds directly on the research and acoustic-modeling framework pioneered by **Trevor Gore**, whose *Books of Acoustic Guitar Design and Build* (available at [https://goreguitars.com.au/the-book/](https://goreguitars.com.au/the-book/)) established the foundation for modern modal coupling analysis in lutherie.

> **Special thanks** to Trevor for his generosity in making advanced acoustic science accessible to luthiers, and for his ongoing contributions to the craft.

---
