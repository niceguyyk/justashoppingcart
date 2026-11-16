const button = document.getElementById("add");
const page = document.getElementById("page");
const hint = document.getElementById("hint");
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  try {
    const url = new URL(tab?.url || "");
    if (!/^https?:$/.test(url.protocol)) throw new Error("This page cannot be added. Open a product page first.");
    if (url.username || url.password) throw new Error("This page cannot be added.");
    page.textContent = tab.title || url.hostname;
    page.title = url.href;
    button.disabled = false;
    button.addEventListener("click", () => {
      const target = new URL("https://jashc.vyrontechnologies.com/");
      target.hash = new URLSearchParams({ add: url.href }).toString();
      chrome.tabs.create({ url: target.href });
      window.close();
    });
  } catch (error) {
    page.textContent = "No product page selected";
    hint.textContent = error.message;
  }
});
