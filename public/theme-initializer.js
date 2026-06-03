(function () {
  var root = document.documentElement;
  var theme = localStorage.getItem("theme");
  var accent = localStorage.getItem("accentColor");
  var backgroundImage = localStorage.getItem("backgroundImageEnabled");

  if (theme && ["latte", "mocha"].includes(theme)) {
    root.setAttribute("data-theme", theme);
  }

  if (accent && ["red", "dusk", "sage", "ochre", "sand"].includes(accent)) {
    root.setAttribute("data-accent", accent);
  }

  root.setAttribute("data-bg-image", backgroundImage === "false" ? "disabled" : "enabled");
})();
