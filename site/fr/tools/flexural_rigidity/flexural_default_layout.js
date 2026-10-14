(function publishFlexuralDefaultLayout() {
  window.FlexuralDefaultLayout = {
    version: 1,
    top: {
      span: 280,
      thickness: 2.8,
      modulus: 12
    },
    braces: [
      {
        name: `Barre ${1}`,
        segments: [
          {
            label: "Base",
            shape: "triangle",
            height: 8,
            breadth: 6,
            density: 480,
            modulus: 12
          }
        ]
      },
      {
        name: `Barre ${2}`,
        segments: [
          {
            label: "Base",
            shape: "rectangle",
            height: 7,
            breadth: 8,
            density: 480,
            modulus: 12
          },
          {
            label: "Chapeau",
            shape: "triangle",
            height: 8,
            breadth: 8,
            density: 480,
            modulus: 12
          }
        ]
      },
      {
        name: `Barre ${3}`,
        segments: [
          {
            label: "Base",
            shape: "rectangle",
            height: 7,
            breadth: 8,
            density: 480,
            modulus: 12
          },
          {
            label: "Chapeau",
            shape: "triangle",
            height: 8,
            breadth: 8,
            density: 480,
            modulus: 12
          }
        ]
      },
      {
        name: `Barre ${4}`,
        segments: [
          {
            label: "Base",
            shape: "triangle",
            height: 8,
            breadth: 6,
            density: 480,
            modulus: 12
          }
        ]
      }
    ]
  };
})();
