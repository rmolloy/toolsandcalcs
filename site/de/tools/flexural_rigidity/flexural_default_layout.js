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
        name: `Leiste ${1}`,
        segments: [
          {
            label: "Basis",
            shape: "triangle",
            height: 8,
            breadth: 6,
            density: 480,
            modulus: 12
          }
        ]
      },
      {
        name: `Leiste ${2}`,
        segments: [
          {
            label: "Basis",
            shape: "rectangle",
            height: 7,
            breadth: 8,
            density: 480,
            modulus: 12
          },
          {
            label: "Aufsatz",
            shape: "triangle",
            height: 8,
            breadth: 8,
            density: 480,
            modulus: 12
          }
        ]
      },
      {
        name: `Leiste ${3}`,
        segments: [
          {
            label: "Basis",
            shape: "rectangle",
            height: 7,
            breadth: 8,
            density: 480,
            modulus: 12
          },
          {
            label: "Aufsatz",
            shape: "triangle",
            height: 8,
            breadth: 8,
            density: 480,
            modulus: 12
          }
        ]
      },
      {
        name: `Leiste ${4}`,
        segments: [
          {
            label: "Basis",
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
